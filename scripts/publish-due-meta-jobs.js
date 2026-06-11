require("dotenv").config({ path: ".env.local" })

const { createClient } = require("@supabase/supabase-js")

const { publishPhotoPost } = require("./publish-to-facebook")
const { publishImage } = require("./publish-to-instagram")
const { requireDirectPublishOverride } = require("./safety-guard")

const GRAPH_VERSION = "v23.0"
const LIMIT = Math.max(1, Number.parseInt(process.argv[2] || "5", 10) || 5)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

function related(value) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function pickImageUrl(finalCopy, product) {
  return (
    finalCopy.media_asset_url?.trim() ||
    finalCopy.image_url?.trim() ||
    finalCopy.image_asset_path?.trim() ||
    (finalCopy.language === "he" ? product?.image_url_he?.trim() || product?.image_url?.trim() : product?.image_url?.trim()) ||
    product?.image_url_he?.trim() ||
    null
  )
}

async function fetchFacebookPermalink(postId) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${postId}`)
  url.searchParams.set("fields", "permalink_url")
  url.searchParams.set("access_token", process.env.FB_PAGE_ACCESS_TOKEN)
  const response = await fetch(url, { cache: "no-store" })
  const payload = await response.json()
  return payload?.permalink_url?.trim() || null
}

async function loadDueJobs(limit) {
  const { data, error } = await supabase
    .from("publish_jobs")
    .select("id, final_copy_id, product_id, platform, status, approval_id, scheduled_at, final_copies(*), products(*)")
    .in("platform", ["facebook_page", "instagram_professional"])
    .eq("status", "pending_operator_confirmation")
    .order("scheduled_at", { ascending: true })
    .limit(limit * 10)

  if (error) throw new Error(`Unable to load publish jobs: ${error.message}`)

  return (data ?? [])
    .filter((row) => !row.scheduled_at || Date.parse(row.scheduled_at) <= Date.now())
    .slice(0, limit)
}

async function markPublished(job, liveUrl, mediaAssetUrl) {
  const finalCopy = related(job.final_copies)
  const recordPayload = {
    product_id: job.product_id,
    source_content_id: finalCopy.source_content_id,
    platform_adaptation_id: finalCopy.platform_adaptation_id,
    platform: job.platform,
    live_url: liveUrl,
    verification_status: "verified",
    verified_at: new Date().toISOString(),
    final_copy_id: job.final_copy_id,
    campaign_approval_id: job.approval_id,
    media_asset_url: mediaAssetUrl,
    media_status: mediaAssetUrl ? "ready" : "missing_image",
    needs_media_repair: !mediaAssetUrl,
  }

  const { data: publishedRecord, error: publishedError } = await supabase
    .from("published_records")
    .upsert(recordPayload, { onConflict: "platform,live_url" })
    .select("id")
    .single()

  if (publishedError) throw new Error(`Unable to record published post: ${publishedError.message}`)

  const verifiedAt = new Date().toISOString()
  const { error: jobError } = await supabase
    .from("publish_jobs")
    .update({
      status: "verified",
      live_url: liveUrl,
      verified_at: verifiedAt,
      blocking_reason: null,
      updated_at: verifiedAt,
    })
    .eq("id", job.id)

  if (jobError) throw new Error(`Unable to verify publish job: ${jobError.message}`)

  const { error: copyError } = await supabase
    .from("final_copies")
    .update({
      status: "published_verified",
      updated_at: verifiedAt,
    })
    .eq("id", job.final_copy_id)

  if (copyError) throw new Error(`Unable to update final copy: ${copyError.message}`)

  const { error: queueError } = await supabase
    .from("scheduled_publish_queue")
    .update({
      status: "published",
      published_record_id: publishedRecord.id,
      last_error: null,
    })
    .eq("final_copy_id", job.final_copy_id)

  if (queueError) throw new Error(`Unable to update scheduled queue: ${queueError.message}`)
}

async function markFailed(jobId, reason) {
  await supabase
    .from("publish_jobs")
    .update({
      status: "needs_system_fix",
      blocking_reason: reason,
    })
    .eq("id", jobId)
}

async function publishOne(job) {
  const finalCopy = related(job.final_copies)
  const product = related(job.products)
  const imageUrl = pickImageUrl(finalCopy, product)

  if (!finalCopy || finalCopy.status !== "operator_approved" || finalCopy.validation_status !== "valid") {
    throw new Error("final_copy_not_approved_and_valid")
  }
  if (!imageUrl || !imageUrl.startsWith("https://")) {
    throw new Error("public_https_image_required")
  }

  let liveUrl = null
  if (job.platform === "facebook_page") {
    const result = await publishPhotoPost({ imageUrl, caption: finalCopy.body })
    liveUrl = (await fetchFacebookPermalink(result.id)) || `https://www.facebook.com/${result.id}`
  } else if (job.platform === "instagram_professional") {
    const result = await publishImage({ imageUrl, caption: finalCopy.body })
    liveUrl = result.permalink || null
  } else {
    throw new Error(`unsupported_platform:${job.platform}`)
  }

  if (!liveUrl || !liveUrl.startsWith("https://")) {
    throw new Error("live_url_missing_after_publish")
  }

  await markPublished(job, liveUrl, imageUrl)
  return liveUrl
}

async function main() {
  requireDirectPublishOverride("scripts/publish-due-meta-jobs.js")

  const jobs = await loadDueJobs(LIMIT)
  const results = []

  for (const job of jobs) {
    const product = related(job.products)?.name ?? null
    try {
      const liveUrl = await publishOne(job)
      results.push({ jobId: job.id, product, platform: job.platform, ok: true, liveUrl })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await markFailed(job.id, message)
      results.push({ jobId: job.id, product, platform: job.platform, ok: false, error: message })
    }
  }

  console.log(JSON.stringify({
    requestedLimit: LIMIT,
    dueLoaded: jobs.length,
    ok: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
