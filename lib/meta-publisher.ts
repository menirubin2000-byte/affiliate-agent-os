import "server-only"

import { isValidPublishedPostUrl } from "@/lib/browser-control"
import {
  facebookGraphPostIdToLiveUrl,
  getFacebookPageOfficialApiCapability,
  getInstagramOfficialApiCapability,
} from "@/lib/meta-official-api"
import { assertPublishJobScheduleIsDue, updatePublishJobFromExecutor } from "@/lib/publish-jobs-db"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"

type MetaPublishJobRow = {
  id: string
  final_copy_id: string
  product_id: string
  platform: string
  status: string
  approval_id: string | null
  scheduled_at: string | null
  final_copies:
    | {
        title: string
        body: string
        status: string
        validation_status: string
        language: string | null
        image_url: string | null
        media_asset_url: string | null
        image_asset_path: string | null
      }
    | Array<{
        title: string
        body: string
        status: string
        validation_status: string
        language: string | null
        image_url: string | null
        media_asset_url: string | null
        image_asset_path: string | null
      }>
    | null
  products:
    | {
        image_url: string | null
        image_url_he: string | null
      }
    | Array<{
        image_url: string | null
        image_url_he: string | null
      }>
    | null
}

const GRAPH_VERSION = "v23.0"

function related<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function requiredEnv(name: string) {
  const result = process.env[name]?.trim()
  if (!result) throw new Error(`Meta official API is missing ${name}.`)
  return result
}

async function setJobState(jobId: string, status: "needs_system_fix" | "waiting_media", blockingReason: string) {
  const supabase = getServiceRoleSupabase()
  await supabase
    .from("publish_jobs")
    .update({
      status,
      blocking_reason: blockingReason,
    })
    .eq("id", jobId)
}

async function setFailedState(jobId: string, blockingReason: string) {
  await setJobState(jobId, "needs_system_fix", blockingReason)
}

async function setWaitingMedia(jobId: string, blockingReason = "image_required_for_ready") {
  await setJobState(jobId, "waiting_media", blockingReason)
}

async function loadMetaJob(jobId: string) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.")
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("publish_jobs")
    .select(
      "id, final_copy_id, product_id, platform, status, approval_id, scheduled_at, final_copies(title, body, status, validation_status, language, image_url, media_asset_url, image_asset_path), products(image_url, image_url_he)",
    )
    .eq("id", jobId)
    .single()

  if (error || !data) throw new Error("Meta publish job was not found.")
  const job = data as MetaPublishJobRow
  const finalCopy = related(job.final_copies)
  if (!finalCopy || finalCopy.status !== "operator_approved" || finalCopy.validation_status !== "valid") {
    throw new Error("Meta final copy is not approved and valid.")
  }
  if (job.status !== "pending_operator_confirmation") {
    throw new Error("Meta job requires MENI final confirmation.")
  }
  assertPublishJobScheduleIsDue(job)
  return { job, finalCopy, product: related(job.products) }
}

async function markRunning(jobId: string, executorType: string) {
  const supabase = getServiceRoleSupabase()
  const { error } = await supabase
    .from("publish_jobs")
    .update({
      status: "running",
      executor_type: executorType,
      blocking_reason: "operator_final_confirmation_granted",
      final_confirmed_at: new Date().toISOString(),
      live_url: null,
      verified_at: null,
    })
    .eq("id", jobId)
    .eq("status", "pending_operator_confirmation")

  if (error) throw new Error(`Unable to start Meta publish job: ${error.message}`)
}

export async function publishFacebookPageJobViaOfficialApi(jobId: string) {
  const capability = getFacebookPageOfficialApiCapability()
  if (!capability.configured) throw new Error("Facebook Page official API is not configured.")

  const { job, finalCopy, product } = await loadMetaJob(jobId)
  if (job.platform !== "facebook_page") throw new Error("Publish job is not a Facebook Page job.")
  const imageUrl = pickImageUrl(finalCopy, product)
  if (!imageUrl?.startsWith("https://")) {
    await setWaitingMedia(job.id)
    throw new Error("Facebook Page publishing requires a public HTTPS image asset.")
  }

  await markRunning(job.id, "meta_pages_api")

  try {
    const pageId = requiredEnv("FB_PAGE_ID")
    const token = requiredEnv("FB_PAGE_ACCESS_TOKEN")
    const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/photos`)
    const body = new URLSearchParams()
    body.set("url", imageUrl)
    body.set("caption", finalCopy.body)
    body.set("access_token", token)

    const response = await fetch(url, { method: "POST", body, cache: "no-store" })
    const payload = (await response.json()) as { id?: string; error?: unknown }
    if (!response.ok || !payload.id) {
      await setFailedState(job.id, `facebook_pages_api_http_${response.status}`)
      throw new Error(`Facebook Pages API rejected the publish request (${response.status}).`)
    }

    const permalinkUrl = await fetchFacebookPermalink(payload.id, token)
    const liveUrl = permalinkUrl ?? facebookGraphPostIdToLiveUrl(payload.id)
    if (!liveUrl || !isValidPublishedPostUrl(liveUrl, "facebook_page")) {
      await setFailedState(job.id, "facebook_pages_api_permalink_missing")
      throw new Error("Facebook Pages API did not return a verifiable post URL.")
    }

    return updatePublishJobFromExecutor({
      jobId: job.id,
      status: "verified",
      postUrl: liveUrl,
      message: `Verified from Facebook Pages API response ${payload.id}.`,
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Facebook Pages API rejected")) throw error
    await setFailedState(job.id, "facebook_pages_api_publish_failed")
    throw error
  }
}

export async function publishMetaJobViaOfficialApi(jobId: string) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.")
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("publish_jobs")
    .select("platform")
    .eq("id", jobId)
    .single()

  if (error || !data) throw new Error("Meta publish job was not found.")
  const platform = (data as { platform: string }).platform

  if (platform === "facebook_page") {
    return publishFacebookPageJobViaOfficialApi(jobId)
  }
  if (platform === "instagram_professional") {
    return publishInstagramJobViaOfficialApi(jobId)
  }

  throw new Error("Publish job is not a Meta official API job.")
}

async function fetchFacebookPermalink(postId: string, token: string) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${postId}`)
  url.searchParams.set("fields", "permalink_url")
  url.searchParams.set("access_token", token)
  const response = await fetch(url, { cache: "no-store" })
  const payload = (await response.json()) as { permalink_url?: string }
  return payload.permalink_url?.trim() || null
}

export async function publishInstagramJobViaOfficialApi(jobId: string) {
  const capability = getInstagramOfficialApiCapability()
  if (!capability.configured) throw new Error("Instagram official API is not configured.")

  const { job, finalCopy, product } = await loadMetaJob(jobId)
  if (job.platform !== "instagram_professional") throw new Error("Publish job is not an Instagram job.")

  const imageUrl = pickImageUrl(finalCopy, product)
  if (!imageUrl?.startsWith("https://")) {
    await setWaitingMedia(job.id, "instagram_media_asset_required")
    throw new Error("Instagram publishing requires a public HTTPS image asset.")
  }
  if (finalCopy.body.length > 2200) {
    await setFailedState(job.id, "instagram_caption_too_long")
    throw new Error("Instagram caption is longer than 2200 characters.")
  }

  await markRunning(job.id, "instagram_graph_api")

  try {
    const igUserId = requiredEnv("IG_BUSINESS_ACCOUNT_ID")
    const token = requiredEnv("IG_ACCESS_TOKEN")
    const containerId = await createInstagramMediaContainer({
      igUserId,
      token,
      imageUrl,
      caption: finalCopy.body,
    })
    const mediaId = await publishInstagramContainer({ igUserId, token, containerId })
    const liveUrl = await fetchInstagramPermalink(mediaId, token)
    if (!liveUrl || !isValidPublishedPostUrl(liveUrl, "instagram_professional")) {
      await setFailedState(job.id, "instagram_permalink_missing")
      throw new Error("Instagram API did not return a verifiable permalink.")
    }

    return updatePublishJobFromExecutor({
      jobId: job.id,
      status: "verified",
      postUrl: liveUrl,
      message: `Verified from Instagram Graph API response ${mediaId}.`,
    })
  } catch (error) {
    await setFailedState(job.id, "instagram_graph_api_publish_failed")
    throw error
  }
}

function pickImageUrl(
  finalCopy: { language: string | null; image_url?: string | null; media_asset_url?: string | null; image_asset_path?: string | null },
  product: { image_url: string | null; image_url_he: string | null } | null,
) {
  return (
    finalCopy.media_asset_url?.trim() ||
    finalCopy.image_url?.trim() ||
    finalCopy.image_asset_path?.trim() ||
    (finalCopy.language === "he" ? product?.image_url_he?.trim() || product?.image_url?.trim() : product?.image_url?.trim()) ||
    product?.image_url_he?.trim() ||
    null
  )
}

async function createInstagramMediaContainer(input: {
  igUserId: string
  token: string
  imageUrl: string
  caption: string
}) {
  const url = new URL(`https://graph.instagram.com/${GRAPH_VERSION}/${input.igUserId}/media`)
  url.searchParams.set("image_url", input.imageUrl)
  url.searchParams.set("caption", input.caption)
  url.searchParams.set("access_token", input.token)
  const response = await fetch(url, { method: "POST", cache: "no-store" })
  const payload = (await response.json()) as { id?: string }
  if (!response.ok || !payload.id) {
    throw new Error(`Instagram media container create failed (${response.status}).`)
  }
  return payload.id
}

async function publishInstagramContainer(input: { igUserId: string; token: string; containerId: string }) {
  const url = new URL(`https://graph.instagram.com/${GRAPH_VERSION}/${input.igUserId}/media_publish`)
  url.searchParams.set("creation_id", input.containerId)
  url.searchParams.set("access_token", input.token)
  const response = await fetch(url, { method: "POST", cache: "no-store" })
  const payload = (await response.json()) as { id?: string }
  if (!response.ok || !payload.id) {
    throw new Error(`Instagram media publish failed (${response.status}).`)
  }
  return payload.id
}

async function fetchInstagramPermalink(mediaId: string, token: string) {
  const url = new URL(`https://graph.instagram.com/${GRAPH_VERSION}/${mediaId}`)
  url.searchParams.set("fields", "permalink")
  url.searchParams.set("access_token", token)
  const response = await fetch(url, { cache: "no-store" })
  const payload = (await response.json()) as { permalink?: string }
  return payload.permalink?.trim() || null
}
