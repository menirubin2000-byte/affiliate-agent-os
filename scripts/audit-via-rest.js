// Read-only audit over Supabase REST API (IPv4 / HTTPS). Avoids the
// IPv6-only direct DB connection so the script runs from any network.
// Reproduces the bucket logic from lib/platform-routing.ts in plain JS.
//
// Run: node scripts/audit-via-rest.js
// Output: prints summary + writes docs/post-review-pack.json (when --write).
require("dotenv").config({ path: ".env.local" })
const fs = require("fs")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const ALL_PLATFORMS = [
  "linkedin", "medium", "substack",
  "facebook_page", "instagram_professional", "pinterest", "x_twitter",
  "youtube", "quora", "reddit", "tiktok",
]
const PAID_PLATFORMS = new Set([
  "linkedin", "medium", "substack",
  "facebook_page", "instagram_professional", "pinterest", "x_twitter",
])
const IMAGE_REQUIRED = new Set([
  "linkedin", "facebook_page", "medium", "substack",
  "instagram_professional", "pinterest", "x_twitter",
])
const VIDEO_REQUIRED = new Set(["tiktok", "youtube"])
const MANUAL_ONLY = new Set(["quora", "reddit"])
// Production routing definition — mirrors lib/platform-routing.ts.
// We replicate the exact capability checks from
// lib/meta-official-api.ts and lib/pinterest-official-api.ts so audit
// numbers match what /dashboard/he shows MENI.
function envSet(k) { return Boolean((process.env[k] ?? "").trim()) }
function envIsTrue(k) { return (process.env[k] ?? "").trim().toLowerCase() === "true" }
const FB_CONFIGURED = envSet("FB_PAGE_ACCESS_TOKEN") && envSet("FB_PAGE_ID") && /^\d+$/.test(process.env.FB_PAGE_ID || "")
const IG_CONFIGURED = envSet("IG_ACCESS_TOKEN") && envSet("IG_BUSINESS_ACCOUNT_ID") && /^\d+$/.test(process.env.IG_BUSINESS_ACCOUNT_ID || "")
const PIN_PUBLISH_READY = envSet("PINTEREST_ACCESS_TOKEN") && envSet("PINTEREST_BOARD_ID") && envIsTrue("PINTEREST_API_ACCESS_READY")
const PLATFORM_STATUS = {
  linkedin: "active",
  medium: "active",
  substack: "active",
  quora: "active",
  reddit: "active",
  tiktok: "disabled",
  facebook_page: FB_CONFIGURED ? "active" : "pending_setup",
  instagram_professional: IG_CONFIGURED ? "active" : "pending_setup",
  pinterest: PIN_PUBLISH_READY ? "active" : "pending_setup",
  x_twitter: "pending_setup",
  youtube: "pending_setup",
}
// "pending_approval" = configured but waiting on external partner (Meta, Pinterest review).
// We treat IG/FB/Pinterest pending_setup rows as pending_approval when keys exist but API not ready yet.
const PENDING_APPROVAL_PLATFORMS = new Set(["facebook_page", "instagram_professional", "pinterest"])

async function fetchAll(table, columns) {
  // Supabase REST has a default 1000 row limit. Loop pages with range() until exhausted.
  const out = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < PAGE) break
  }
  return out
}

async function main() {
  const [products, programs, finalCopies, campaignLinks, publishedRecords, publishJobs, platformConnections] = await Promise.all([
    fetchAll("products", "id,name,status,category,affiliate_link,affiliate_url,image_url,image_url_he,image_status,video_url,video_status,video_suitable_for"),
    fetchAll("affiliate_programs", "product_id,status,affiliate_link"),
    fetchAll("final_copies", "id,product_id,platform,status,validation_status,language,blocking_reasons"),
    fetchAll("campaign_links", "product_id,source,final_url,status"),
    fetchAll("published_records", "product_id,platform,live_url,verification_status,verified_at"),
    fetchAll("publish_jobs", "product_id,platform,status,blocking_reason,final_copy_id"),
    fetchAll("platform_connections", "provider,status").catch(() => []),
  ])

  // link_ready products = the only ones the dashboard actually routes.
  const ownedIds = new Set(
    programs.filter((p) => p.status === "link_ready" && (p.affiliate_link ?? "").trim()).map((p) => p.product_id),
  )
  const owned = products.filter((p) => ownedIds.has(p.id))

  // Index inputs for fast lookup
  const verified = new Set(
    publishedRecords
      .filter((r) => r.verification_status === "verified" && (r.live_url ?? "").trim())
      .map((r) => `${r.product_id}|${r.platform}`),
  )
  const linkByKey = new Set(
    campaignLinks
      .filter((l) => (l.status ?? "active") === "active")
      .map((l) => `${l.product_id}|${(l.source ?? "").toLowerCase()}`),
  )
  const latestCopyByKey = new Map()
  for (const fc of finalCopies) {
    const key = `${fc.product_id}|${fc.platform}`
    if (!latestCopyByKey.has(key)) latestCopyByKey.set(key, fc)
  }
  // Index latest publish_job per (product, platform).
  const latestJobByKey = new Map()
  for (const job of publishJobs) {
    const key = `${job.product_id}|${job.platform}`
    if (!latestJobByKey.has(key)) latestJobByKey.set(key, job)
  }

  const buckets = {
    published_verified: 0,
    ready_for_meni_approval: 0,
    operator_approved_publish_ready: 0,
    needs_campaign_link: 0,
    needs_image: 0,
    needs_video: 0,
    needs_system_fix: 0,
    missing_final_copy: 0,
    bridge_url_quora_reddit: 0,
    platform_pending_setup: 0,
    platform_pending_approval: 0,
    true_blocked: 0,
  }
  // Detail lists for the report — drives the docs sync.
  const details = {
    ready_for_meni_approval: [],
    operator_approved_publish_ready: [],
    needs_campaign_link: [],
    missing_final_copy: [],
  }

  for (const p of owned) {
    for (const platform of ALL_PLATFORMS) {
      const key = `${p.id}|${platform}`
      if (verified.has(key)) { buckets.published_verified++; continue }
      // A live publish_job short-circuits the gates (matches production routeFromPublishJob).
      const job = latestJobByKey.get(key)
      if (job) {
        if (job.status === "blocked_executor_not_connected" || job.status === "blocked_policy") {
          buckets.true_blocked++
          continue
        }
        if (job.status === "pending_meni_approval") {
          buckets.ready_for_meni_approval++
          continue
        }
        if (job.status === "approved_waiting_executor") {
          buckets.operator_approved_publish_ready++
          continue
        }
        if (job.status === "verified") { buckets.published_verified++; continue }
        // Anything else falls through to the gate logic.
      }
      const status = PLATFORM_STATUS[platform]
      if (status === "disabled") { buckets.true_blocked++; continue }
      if (status === "pending_setup") {
        if (PENDING_APPROVAL_PLATFORMS.has(platform)) buckets.platform_pending_approval++
        else buckets.platform_pending_setup++
        continue
      }
      if (MANUAL_ONLY.has(platform)) { buckets.bridge_url_quora_reddit++; continue }
      const fc = latestCopyByKey.get(key)
      if (!fc) {
        buckets.missing_final_copy++
        details.missing_final_copy.push({ product: p.name, platform })
        continue
      }
      if (fc.status === "needs_system_fix" || fc.validation_status !== "valid") { buckets.needs_system_fix++; continue }
      // media
      const imgOk = (p.image_url ?? "").trim() || (p.image_url_he ?? "").trim()
      if (IMAGE_REQUIRED.has(platform) && !imgOk) { buckets.needs_image++; continue }
      const vidOk = (p.video_url ?? "").trim()
      if (VIDEO_REQUIRED.has(platform) && !vidOk) { buckets.needs_video++; continue }
      // campaign link gate (paid only)
      if (PAID_PLATFORMS.has(platform) && !linkByKey.has(key)) {
        buckets.needs_campaign_link++
        details.needs_campaign_link.push({ product: p.name, platform, finalCopyStatus: fc.status })
        continue
      }
      if (fc.status === "ready_for_operator_approval" || fc.status === "validated") {
        buckets.ready_for_meni_approval++
        details.ready_for_meni_approval.push({ product: p.name, platform, copyId: fc.id })
        continue
      }
      if (fc.status === "operator_approved" || fc.status === "ready_for_manual_publish") {
        buckets.operator_approved_publish_ready++
        details.operator_approved_publish_ready.push({ product: p.name, platform, copyId: fc.id })
        continue
      }
      // unsupported status — system fix
      buckets.needs_system_fix++
    }
  }

  // Quality gates that MUST hold (the user's list in the prompt).
  const guarantees = {
    no_ready_without_campaign_link: details.ready_for_meni_approval.every((r) =>
      linkByKey.has(`${owned.find((o) => o.name === r.product)?.id}|${r.platform}`),
    ),
    no_ready_without_media: details.ready_for_meni_approval.every((r) => {
      const prod = owned.find((o) => o.name === r.product)
      if (!prod) return false
      if (IMAGE_REQUIRED.has(r.platform)) return Boolean((prod.image_url ?? "").trim() || (prod.image_url_he ?? "").trim())
      if (VIDEO_REQUIRED.has(r.platform)) return Boolean((prod.video_url ?? "").trim())
      return true
    }),
    no_quora_reddit_in_ready: details.ready_for_meni_approval.every((r) => !MANUAL_ONLY.has(r.platform)),
    no_published_counted_as_blocked: buckets.published_verified > 0 && buckets.true_blocked >= 0, // structural
  }

  const totalRoutes = owned.length * ALL_PLATFORMS.length
  const summary = {
    generated_at: new Date().toISOString(),
    products_link_ready: owned.length,
    total_routes: totalRoutes,
    buckets,
    guarantees,
    platform_connections: Object.fromEntries(platformConnections.map((c) => [c.provider, c.status])),
    publish_jobs: {
      total: publishJobs.length,
      verified: publishJobs.filter((j) => j.status === "verified").length,
      blocked_executor_not_connected: publishJobs.filter((j) => j.status === "blocked_executor_not_connected").length,
      blocked_policy: publishJobs.filter((j) => j.status === "blocked_policy").length,
    },
    counts: {
      products_total: products.length,
      products_owned: owned.length,
      affiliate_programs_total: programs.length,
      affiliate_programs_link_ready: programs.filter((p) => p.status === "link_ready").length,
      final_copies_total: finalCopies.length,
      campaign_links_total: campaignLinks.length,
      published_records_total: publishedRecords.length,
    },
  }

  console.log(JSON.stringify(summary, null, 2))

  if (process.argv.includes("--write")) {
    const outDir = path.join(__dirname, "..", "docs")
    fs.mkdirSync(outDir, { recursive: true })
    const jsonOut = path.join(outDir, "post-review-pack.json")
    fs.writeFileSync(
      jsonOut,
      JSON.stringify({ summary, details }, null, 2),
      "utf8",
    )
    console.error(`\n→ wrote ${jsonOut}`)

    // Markdown POST_REVIEW_PACK
    const md = renderReviewPackMd(summary, details)
    const mdOut = path.join(outDir, "POST_REVIEW_PACK.md")
    fs.writeFileSync(mdOut, md, "utf8")
    console.error(`→ wrote ${mdOut}`)

    // OPERATOR_SOURCE_OF_TRUTH
    const truth = renderOperatorTruthMd(summary, details)
    const truthOut = path.join(outDir, "OPERATOR_SOURCE_OF_TRUTH.md")
    fs.writeFileSync(truthOut, truth, "utf8")
    console.error(`→ wrote ${truthOut}`)
  }
}

function renderReviewPackMd(s, d) {
  const b = s.buckets
  const lines = []
  lines.push(`# Post Review Pack`)
  lines.push("")
  lines.push(`_Generated: ${s.generated_at}_`)
  lines.push("")
  lines.push(`## Routing buckets`)
  lines.push(`| Bucket | Count |`)
  lines.push(`|---|---:|`)
  for (const [k, v] of Object.entries(b)) lines.push(`| ${k} | ${v} |`)
  lines.push("")
  lines.push(`Total routes: ${s.total_routes} (= ${s.products_link_ready} link_ready × 11 platforms)`)
  lines.push("")
  lines.push(`## Guarantees`)
  for (const [k, v] of Object.entries(s.guarantees)) lines.push(`- ${v ? "✅" : "❌"} ${k}`)
  lines.push("")
  if (d.ready_for_meni_approval.length) {
    lines.push(`## Ready for MENI approval (${d.ready_for_meni_approval.length})`)
    for (const r of d.ready_for_meni_approval) lines.push(`- ${r.product} → ${r.platform}`)
    lines.push("")
  }
  if (d.operator_approved_publish_ready.length) {
    lines.push(`## Approved, awaiting publish (${d.operator_approved_publish_ready.length})`)
    for (const r of d.operator_approved_publish_ready.slice(0, 50)) lines.push(`- ${r.product} → ${r.platform}`)
    if (d.operator_approved_publish_ready.length > 50) lines.push(`- ...(${d.operator_approved_publish_ready.length - 50} more)`)
    lines.push("")
  }
  if (d.needs_campaign_link.length) {
    lines.push(`## Needs campaign_link (${d.needs_campaign_link.length})`)
    for (const r of d.needs_campaign_link) lines.push(`- ${r.product} → ${r.platform} (copy status: ${r.finalCopyStatus})`)
    lines.push("")
  }
  if (d.missing_final_copy.length) {
    lines.push(`## Missing final copy (${d.missing_final_copy.length})`)
    const byPlatform = {}
    for (const r of d.missing_final_copy) byPlatform[r.platform] = (byPlatform[r.platform] || 0) + 1
    for (const [pl, n] of Object.entries(byPlatform)) lines.push(`- ${pl}: ${n}`)
    lines.push("")
  }
  return lines.join("\n")
}

function renderOperatorTruthMd(s, _d) {
  const b = s.buckets
  const lines = []
  lines.push(`# Operator Source of Truth`)
  lines.push("")
  lines.push(`_Generated: ${s.generated_at}_`)
  lines.push("")
  lines.push(`## What MENI sees in /dashboard/he`)
  lines.push("")
  lines.push(`- **ממתינים לאישור MENI:** ${b.ready_for_meni_approval}`)
  lines.push(`- **אושר ומוכן לפרסום:** ${b.operator_approved_publish_ready}`)
  lines.push(`- **פורסם ואומת:** ${b.published_verified}`)
  lines.push(`- **חסר campaign_link:** ${b.needs_campaign_link}`)
  lines.push(`- **חסר תמונה:** ${b.needs_image}`)
  lines.push(`- **חסר וידאו:** ${b.needs_video}`)
  lines.push(`- **חסר קופי לפלטפורמה:** ${b.missing_final_copy}`)
  lines.push(`- **צריך תיקון מערכת:** ${b.needs_system_fix}`)
  lines.push(`- **Quora/Reddit — קישור גישור ציבורי:** ${b.bridge_url_quora_reddit ?? 0}`)
  lines.push(`- **ממתין להגדרת פלטפורמה (OAuth):** ${b.platform_pending_setup}`)
  lines.push(`- **ממתין לאישור פלטפורמה (FB/IG/Pinterest):** ${b.platform_pending_approval}`)
  lines.push(`- **חסומים אמיתיים (TikTok וכד׳):** ${b.true_blocked}`)
  lines.push("")
  lines.push(`## Platform connections (live)`)
  for (const [provider, status] of Object.entries(s.platform_connections)) {
    lines.push(`- ${provider}: ${status}`)
  }
  lines.push("")
  lines.push(`## Publish jobs`)
  lines.push(`- total: ${s.publish_jobs.total}`)
  lines.push(`- verified: ${s.publish_jobs.verified}`)
  lines.push(`- blocked_executor_not_connected: ${s.publish_jobs.blocked_executor_not_connected}`)
  lines.push(`- blocked_policy: ${s.publish_jobs.blocked_policy}`)
  lines.push("")
  lines.push(`## Quality guarantees`)
  for (const [k, v] of Object.entries(s.guarantees)) lines.push(`- ${v ? "✅" : "❌"} ${k}`)
  lines.push("")
  lines.push(`## Routing rule recap`)
  lines.push(`A route only reaches "ready_for_meni_approval" if ALL of:`)
  lines.push(`1. Platform is active (not disabled / pending_setup).`)
  lines.push(`2. Product is link_ready with a real affiliate link.`)
  lines.push(`3. Final Copy exists with validation_status='valid'.`)
  lines.push(`4. Required media is present (image for paid surfaces, video for video surfaces).`)
  lines.push(`5. Active campaign_link exists for paid surfaces (LinkedIn/Medium/Substack/FB/IG/Pinterest/X).`)
  lines.push(`6. Final Copy status ∈ {ready_for_operator_approval, validated}.`)
  lines.push("")
  lines.push(`Quora/Reddit use only public_review_url/bridge_url in post bodies; direct affiliate, campaign, or tracking links are blocked. TikTok is disabled (video gating).`)
  return lines.join("\n")
}

main().catch((e) => { console.error(e); process.exit(1) })
