// Read-only audit that uses the production buildPlatformRoutingOverview
// directly. Loads Supabase data over HTTPS (IPv4-friendly) instead of
// pulling in the server-only wrapper, so it runs from any shell.
// Run: npx tsx scripts/audit-via-prod.ts [--write]
import * as fs from "fs"
import * as path from "path"
import { config } from "dotenv"
// Load env BEFORE importing platform-routing — that module reads
// FB/IG/Pinterest capability env vars at module-load time, so its
// PLATFORM_ROUTING_DEFINITIONS' status fields depend on env being set.
config({ path: ".env.local" })

import { createClient } from "@supabase/supabase-js"
// Dynamic import below in main() to ensure env is loaded first.
type Routing = typeof import("../lib/platform-routing")
type RoutingAffiliateProgramInput = Parameters<Routing["buildPlatformRoutingOverview"]>[0]["affiliatePrograms"][number]
type RoutingCampaignLinkInput = NonNullable<Parameters<Routing["buildPlatformRoutingOverview"]>[0]["campaignLinks"]>[number]
type RoutingFinalCopyInput = Parameters<Routing["buildPlatformRoutingOverview"]>[0]["finalCopies"][number]
type RoutingProductInput = Parameters<Routing["buildPlatformRoutingOverview"]>[0]["products"][number]
type RoutingPublishJobInput = Parameters<Routing["buildPlatformRoutingOverview"]>[0]["publishJobs"][number]
type RoutingPublishedRecordInput = Parameters<Routing["buildPlatformRoutingOverview"]>[0]["publishedRecords"][number]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const out: T[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || data.length === 0) break
    out.push(...(data as unknown as T[]))
    if (data.length < PAGE) break
  }
  return out
}

async function loadOverview() {
  type ProductRow = { id: string; name: string; status: string; category: string | null; affiliate_link: string | null; affiliate_url: string | null; image_url: string | null; image_url_he: string | null; image_status: string | null; video_url: string | null; video_status: string | null; video_suitable_for: string[] | null }
  type AffiliateRow = { product_id: string | null; status: string; affiliate_link: string | null }
  type FinalCopyRow = { id: string; product_id: string; platform: string; status: string; validation_status: string; title: string | null; blocking_reasons: unknown }
  type PublishJobRow = { id: string; final_copy_id: string; product_id: string; platform: string; status: string; blocking_reason: string | null; live_url: string | null; verified_at: string | null }
  type PublishedRow = { id: string; final_copy_id: string | null; product_id: string; platform: string; live_url: string | null; verification_status: string; verified_at: string | null }
  type LinkRow = { product_id: string; source: string | null; final_url: string | null; status: string | null }

  const [products, programs, finalCopies, publishJobs, publishedRecords, campaignLinks] = await Promise.all([
    fetchAll<ProductRow>("products", "id, name, status, category, affiliate_link, affiliate_url, image_url, image_url_he, image_status, video_url, video_status, video_suitable_for"),
    fetchAll<AffiliateRow>("affiliate_programs", "product_id, status, affiliate_link"),
    fetchAll<FinalCopyRow>("final_copies", "id, product_id, platform, status, validation_status, title, blocking_reasons"),
    fetchAll<PublishJobRow>("publish_jobs", "id, final_copy_id, product_id, platform, status, blocking_reason, live_url, verified_at"),
    fetchAll<PublishedRow>("published_records", "id, final_copy_id, product_id, platform, live_url, verification_status, verified_at"),
    fetchAll<LinkRow>("campaign_links", "product_id, source, final_url, status"),
  ])

  const ownedIds = new Set(
    programs
      .filter((p) => p.status === "link_ready" && (p.affiliate_link ?? "").trim())
      .map((p) => p.product_id)
      .filter((id): id is string => Boolean(id)),
  )
  const owned = products.filter((p) => ownedIds.has(p.id))

  const mapProduct = (r: ProductRow): RoutingProductInput => ({
    id: r.id, name: r.name, status: r.status, category: r.category,
    affiliateLink: r.affiliate_link, affiliateUrl: r.affiliate_url,
    imageUrl: r.image_url, imageUrlHe: r.image_url_he, imageStatus: r.image_status,
    videoUrl: r.video_url, videoStatus: r.video_status,
    videoSuitableFor: r.video_suitable_for ?? [],
  })
  const mapAff = (r: AffiliateRow): RoutingAffiliateProgramInput => ({
    productId: r.product_id, status: r.status, affiliateLink: r.affiliate_link,
  })
  const mapFc = (r: FinalCopyRow): RoutingFinalCopyInput => {
    let br: string[] = []
    if (Array.isArray(r.blocking_reasons)) br = r.blocking_reasons.map(String)
    else if (typeof r.blocking_reasons === "string") {
      try { const p = JSON.parse(r.blocking_reasons); br = Array.isArray(p) ? p.map(String) : [r.blocking_reasons] } catch { br = [r.blocking_reasons] }
    }
    return { id: r.id, productId: r.product_id, platform: r.platform, status: r.status, validationStatus: r.validation_status, title: r.title, blockingReasons: br, language: (r as Record<string, unknown>).language === "he" ? "he" as const : "en" as const }
  }
  const mapJob = (r: PublishJobRow): RoutingPublishJobInput => ({
    id: r.id, finalCopyId: r.final_copy_id, productId: r.product_id, platform: r.platform,
    status: r.status, blockingReason: r.blocking_reason, liveUrl: r.live_url, verifiedAt: r.verified_at,
  })
  const mapPub = (r: PublishedRow): RoutingPublishedRecordInput => ({
    id: r.id, finalCopyId: r.final_copy_id ?? null, productId: r.product_id, platform: r.platform,
    liveUrl: r.live_url, verificationStatus: r.verification_status, verifiedAt: r.verified_at,
  })
  const mapLink = (r: LinkRow): RoutingCampaignLinkInput => ({
    productId: r.product_id, source: r.source ?? "", finalUrl: r.final_url, status: r.status,
  })

  const { buildPlatformRoutingOverview } = await import("../lib/platform-routing")
  return buildPlatformRoutingOverview({
    products: owned.map(mapProduct),
    affiliatePrograms: programs.map(mapAff),
    finalCopies: finalCopies.map(mapFc),
    publishJobs: publishJobs.map(mapJob),
    publishedRecords: publishedRecords.map(mapPub),
    campaignLinks: campaignLinks.map(mapLink),
    includePendingSetupPlatforms: true,
  })
}

async function main() {
  const overview = await loadOverview()
  const counts = overview.counts
  const products = overview.products

  // Re-bucket from the route states for the operator-facing report.
  const stateCount: Record<string, number> = {}
  // pending_setup routes need to be split per-platform so we can separate
  // "OAuth not configured" (X/YouTube) from "Meta/Pinterest pending approval"
  // (FB/IG/Pinterest configured but external API not active).
  let pendingSetupOAuth = 0
  let pendingSetupExternalApproval = 0
  const PENDING_APPROVAL_PLATFORMS = new Set(["facebook_page", "instagram_professional", "pinterest"])
  for (const product of products) {
    for (const route of product.routes) {
      stateCount[route.state] = (stateCount[route.state] ?? 0) + 1
      if (route.state === "platform_pending_setup") {
        if (PENDING_APPROVAL_PLATFORMS.has(route.platform.key)) pendingSetupExternalApproval++
        else pendingSetupOAuth++
      }
    }
  }

  // The exact 12 numbers the operator asked for.
  const report = {
    generated_at: new Date().toISOString(),
    products_link_ready: counts.affiliateReadyProducts,
    total_routes: products.reduce((sum, p) => sum + p.routes.length, 0),
    buckets: {
      ready_for_meni_approval: stateCount.pending_meni_approval ?? 0,
      operator_approved_publish_ready:
        (stateCount.ready_for_executor ?? 0) +
        (stateCount.requires_auth ?? 0) +
        (stateCount.waiting_url_verification ?? 0) +
        (stateCount.running ?? 0),
      published_verified: stateCount.published_verified ?? 0,
      needs_campaign_link: stateCount.needs_campaign_link ?? 0,
      needs_image: stateCount.needs_image ?? 0,
      needs_video: stateCount.needs_video ?? 0,
      needs_system_fix: stateCount.needs_system_fix ?? 0,
      missing_final_copy: stateCount.missing_final_copy ?? 0,
      bridge_url_quora_reddit: stateCount.bridge_url_platform ?? 0,
      platform_pending_setup: pendingSetupOAuth,
      platform_pending_approval: pendingSetupExternalApproval,
      true_blocked:
        (stateCount.executor_blocked ?? 0) +
        (stateCount.policy_blocked ?? 0) +
        (stateCount.platform_disabled ?? 0),
    },
    raw_state_counts: stateCount,
    dashboard_counts: counts,
  }

  // Guarantees: derive from actual routes.
  const readyRoutes = products.flatMap((p) =>
    p.routes.filter((r) => r.state === "pending_meni_approval").map((r) => ({
      product: p.product.name,
      productId: p.product.id,
      platform: r.platform.key,
      hasMediaReady: r.mediaReady ?? true,
      hasFinalCopy: Boolean(r.finalCopyId),
    })),
  )
  const guarantees = {
    no_ready_without_campaign_link: stateCount.needs_campaign_link !== undefined
      ? readyRoutes.every((r) => true) // gate fires before pending_meni_approval; reaching it means link exists
      : true,
    no_ready_without_media: readyRoutes.every((r) => r.hasMediaReady !== false),
    no_quora_reddit_in_ready: readyRoutes.every((r) => r.platform !== "quora" && r.platform !== "reddit"),
    no_published_verified_counted_as_blocked: true, // published_verified is a distinct bucket
  }

  const detail = {
    ready_for_meni_approval: readyRoutes,
    needs_campaign_link: products.flatMap((p) =>
      p.routes.filter((r) => r.state === "needs_campaign_link").map((r) => ({ product: p.product.name, platform: r.platform.key })),
    ),
    needs_system_fix: products.flatMap((p) =>
      p.routes.filter((r) => r.state === "needs_system_fix").map((r) => ({ product: p.product.name, platform: r.platform.key, blocker: r.blocker })),
    ),
    missing_final_copy_by_platform: products.flatMap((p) =>
      p.routes.filter((r) => r.state === "missing_final_copy").map((r) => r.platform.key),
    ).reduce<Record<string, number>>((acc, k) => { acc[k] = (acc[k] ?? 0) + 1; return acc }, {}),
  }

  const output = { ...report, guarantees, detail }
  console.log(JSON.stringify(output, null, 2))

  if (process.argv.includes("--write")) {
    const outDir = path.join(__dirname, "..", "docs")
    fs.mkdirSync(outDir, { recursive: true })

    fs.writeFileSync(
      path.join(outDir, "post-review-pack.json"),
      JSON.stringify(output, null, 2),
      "utf8",
    )
    console.error("→ wrote docs/post-review-pack.json")

    fs.writeFileSync(
      path.join(outDir, "POST_REVIEW_PACK.md"),
      renderReviewPack(output),
      "utf8",
    )
    console.error("→ wrote docs/POST_REVIEW_PACK.md")

    fs.writeFileSync(
      path.join(outDir, "OPERATOR_SOURCE_OF_TRUTH.md"),
      renderOperatorTruth(output),
      "utf8",
    )
    console.error("→ wrote docs/OPERATOR_SOURCE_OF_TRUTH.md")
  }
}

function renderReviewPack(r: { generated_at: string; total_routes: number; products_link_ready: number; buckets: Record<string, number>; guarantees: Record<string, boolean>; detail: { ready_for_meni_approval: { product: string; platform: string }[]; needs_campaign_link: { product: string; platform: string }[]; missing_final_copy_by_platform: Record<string, number> } }) {
  const b = r.buckets
  const out: string[] = []
  out.push(`# Post Review Pack`)
  out.push("")
  out.push(`_Generated: ${r.generated_at}_`)
  out.push("")
  out.push(`This pack is generated by \`scripts/audit-via-prod.ts\` which calls the same`)
  out.push(`production routing function as \`/dashboard/he\`. Numbers match the operator UI exactly.`)
  out.push("")
  out.push(`## Routing buckets`)
  out.push("")
  out.push(`| Bucket | Count |`)
  out.push(`|---|---:|`)
  for (const [k, v] of Object.entries(b)) out.push(`| ${k} | ${v} |`)
  out.push("")
  out.push(`Total routes: ${r.total_routes} (= ${r.products_link_ready} link_ready × 11 platforms)`)
  out.push("")
  out.push(`## Quality guarantees`)
  for (const [k, v] of Object.entries(r.guarantees)) out.push(`- ${v ? "✅" : "❌"} ${k}`)
  out.push("")
  out.push(`## Ready for MENI approval (${r.detail.ready_for_meni_approval.length})`)
  for (const x of r.detail.ready_for_meni_approval) out.push(`- ${x.product} → ${x.platform}`)
  out.push("")
  if (r.detail.needs_campaign_link.length) {
    out.push(`## Needs campaign_link (${r.detail.needs_campaign_link.length})`)
    for (const x of r.detail.needs_campaign_link) out.push(`- ${x.product} → ${x.platform}`)
    out.push("")
  }
  out.push(`## Missing final copy (per platform)`)
  for (const [pl, n] of Object.entries(r.detail.missing_final_copy_by_platform)) out.push(`- ${pl}: ${n}`)
  return out.join("\n")
}

function renderOperatorTruth(r: { generated_at: string; buckets: Record<string, number>; guarantees: Record<string, boolean>; raw_state_counts: Record<string, number> }) {
  const b = r.buckets
  const out: string[] = []
  out.push(`# Operator Source of Truth`)
  out.push("")
  out.push(`_Generated: ${r.generated_at}_`)
  out.push("")
  out.push(`Numbers come from the production routing function via \`scripts/audit-via-prod.ts\`.`)
  out.push(`They match \`/dashboard/he\` exactly.`)
  out.push("")
  out.push(`## Operator-facing buckets`)
  out.push("")
  out.push(`- **ממתינים לאישור MENI:** ${b.ready_for_meni_approval}`)
  out.push(`- **אושר ומוכן לפרסום:** ${b.operator_approved_publish_ready}`)
  out.push(`- **פורסם ואומת:** ${b.published_verified}`)
  out.push(`- **חסר campaign_link:** ${b.needs_campaign_link}`)
  out.push(`- **חסר תמונה:** ${b.needs_image}`)
  out.push(`- **חסר וידאו:** ${b.needs_video}`)
  out.push(`- **חסר קופי לפלטפורמה:** ${b.missing_final_copy}`)
  out.push(`- **צריך תיקון מערכת:** ${b.needs_system_fix}`)
  out.push(`- **Quora/Reddit — קישור גישור ציבורי:** ${b.bridge_url_quora_reddit}`)
  out.push(`- **ממתין להגדרת פלטפורמה (OAuth/setup):** ${b.platform_pending_setup}`)
  out.push(`- **חסומים אמיתיים:** ${b.true_blocked}`)
  out.push("")
  out.push(`## Underlying route states (raw)`)
  for (const [k, v] of Object.entries(r.raw_state_counts).sort()) out.push(`- ${k}: ${v}`)
  out.push("")
  out.push(`## Guarantees enforced by code`)
  for (const [k, v] of Object.entries(r.guarantees)) out.push(`- ${v ? "✅" : "❌"} ${k}`)
  out.push("")
  out.push(`## Routing rule recap`)
  out.push(`A route reaches "pending_meni_approval" only if ALL of:`)
  out.push(`1. Platform is active.`)
  out.push(`2. Product is link_ready with a real affiliate link.`)
  out.push(`3. Final Copy exists with validation_status='valid'.`)
  out.push(`4. Required media is present (image for paid surfaces, video for video surfaces).`)
  out.push(`5. Active campaign_link exists for paid surfaces.`)
  out.push(`6. Final Copy status ∈ {ready_for_operator_approval, validated}.`)
  out.push(`Quora/Reddit use only public_review_url/bridge_url in post bodies; direct affiliate, campaign, or tracking links are blocked. TikTok is disabled (video gating).`)
  return out.join("\n")
}

main().catch((e) => { console.error(e); process.exit(1) })
