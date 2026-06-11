// Full system audit. Lists every anomaly the operator should care about.
// Pure read-only. Exits with code 0 even if anomalies found.
require("dotenv").config({ path: ".env.local" })
const { createClient } = require("@supabase/supabase-js")
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function fetchAll(table, columns) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || !data.length) break
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

const PAID = new Set(["linkedin", "medium", "substack", "facebook_page", "instagram_professional", "pinterest", "x_twitter"])
const ALL_PLATFORMS = ["linkedin", "medium", "substack", "facebook_page", "instagram_professional", "pinterest", "x_twitter", "youtube", "quora", "reddit", "tiktok"]
const MANUAL_ONLY = new Set(["quora", "reddit"])

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

function shouldExpectOwnedRoute(platform) {
  return PLATFORM_STATUS[platform] === "active" && !MANUAL_ONLY.has(platform)
}

;(async () => {
  console.log("=== Loading full DB state ===\n")
  const [products, programs, finalCopies, campaignLinks, publishedRecords, publishJobs, adaptations, sourceContents, connections] = await Promise.all([
    fetchAll("products", "id, name, status, affiliate_link, affiliate_url, image_url, image_url_he, video_url, image_status, video_status"),
    fetchAll("affiliate_programs", "product_id, status, affiliate_link"),
    fetchAll("final_copies", "id, product_id, platform, status, validation_status, language, title, body, blocking_reasons"),
    fetchAll("campaign_links", "id, product_id, source, channel, final_url, status"),
    fetchAll("published_records", "id, product_id, platform, live_url, verification_status, verified_at, final_copy_id"),
    fetchAll("publish_jobs", "id, product_id, platform, status, executor_type, blocking_reason, final_copy_id"),
    fetchAll("platform_adaptations", "id, product_id, platform, source_content_id"),
    fetchAll("source_contents", "id, product_id, status"),
    fetchAll("platform_connections", "provider, status").catch(() => []),
  ])

  const ownedIds = new Set(programs.filter((p) => p.status === "link_ready" && (p.affiliate_link ?? "").trim()).map((p) => p.product_id))
  const owned = products.filter((p) => ownedIds.has(p.id))
  const productById = Object.fromEntries(products.map((p) => [p.id, p]))

  const anomalies = []
  const note = (severity, area, msg, details) => anomalies.push({ severity, area, msg, details })

  // 1. Products without affiliate_link
  const noLink = owned.filter((p) => !(p.affiliate_link ?? "").trim() && !(p.affiliate_url ?? "").trim())
  if (noLink.length) note("HIGH", "products", `${noLink.length} owned products missing affiliate_link`, noLink.map((p) => p.name))

  // 2. Products without image
  const noImage = owned.filter((p) => !(p.image_url ?? "").trim() && !(p.image_url_he ?? "").trim())
  if (noImage.length) note("HIGH", "products", `${noImage.length} owned products missing image`, noImage.map((p) => p.name))

  // 3. final_copies invalid
  const invalidFc = finalCopies.filter((f) => f.validation_status !== "valid" && ownedIds.has(f.product_id))
  if (invalidFc.length) note("MEDIUM", "final_copies", `${invalidFc.length} owned-product final_copies have validation_status != valid`, invalidFc.slice(0, 10).map((f) => ({ product: productById[f.product_id]?.name, platform: f.platform, status: f.status, val: f.validation_status, reasons: f.blocking_reasons })))

  // 4. final_copies needs_system_fix
  const fixCopies = finalCopies.filter((f) => f.status === "needs_system_fix" && ownedIds.has(f.product_id))
  if (fixCopies.length) note("MEDIUM", "final_copies", `${fixCopies.length} owned-product final_copies in needs_system_fix`, fixCopies.slice(0, 10).map((f) => ({ product: productById[f.product_id]?.name, platform: f.platform, reasons: f.blocking_reasons })))

  // 5. Duplicate (product, platform) in final_copies — shouldn't exist
  const fcKeyCount = {}
  for (const f of finalCopies) {
    const key = `${f.product_id}|${f.platform}`
    fcKeyCount[key] = (fcKeyCount[key] ?? 0) + 1
  }
  const dups = Object.entries(fcKeyCount).filter(([, n]) => n > 1)
  if (dups.length) note("MEDIUM", "final_copies", `${dups.length} (product, platform) pairs have duplicate final_copies`, dups.slice(0, 10).map(([k, n]) => `${productById[k.split("|")[0]]?.name} | ${k.split("|")[1]} x${n}`))

  // 6. publish_jobs with stale browser_helper executor
  const staleJobs = publishJobs.filter((j) => j.executor_type === "browser_helper" && j.status === "blocked_executor_not_connected")
  if (staleJobs.length) note("HIGH", "publish_jobs", `${staleJobs.length} publish_jobs marked blocked_executor_not_connected for browser_helper (dead code path)`, "see jobs needing cleanup")

  // 7. publish_jobs without a matching final_copy
  const fcIdSet = new Set(finalCopies.map((f) => f.id))
  const orphanJobs = publishJobs.filter((j) => j.final_copy_id && !fcIdSet.has(j.final_copy_id))
  if (orphanJobs.length) note("HIGH", "publish_jobs", `${orphanJobs.length} publish_jobs reference a missing final_copy`, orphanJobs.slice(0, 10).map((j) => ({ id: j.id, platform: j.platform })))

  // 8. published_records without verified URL
  const badPub = publishedRecords.filter((r) => r.verification_status !== "verified" || !(r.live_url ?? "").trim())
  if (badPub.length) note("HIGH", "published_records", `${badPub.length} published_records missing verified URL`, badPub.slice(0, 10))

  // 9. campaign_links for paid platforms but missing final_url
  const badLinks = campaignLinks.filter((l) => PAID.has(l.source ?? "") && !(l.final_url ?? "").trim())
  if (badLinks.length) note("MEDIUM", "campaign_links", `${badLinks.length} campaign_links on paid platforms with missing final_url`, badLinks.slice(0, 10))

  // 10. owned product without source_content
  const productsWithSourceContent = new Set(sourceContents.map((s) => s.product_id))
  const noSourceContent = owned.filter((p) => !productsWithSourceContent.has(p.id))
  if (noSourceContent.length) note("MEDIUM", "source_contents", `${noSourceContent.length} owned products without source_content`, noSourceContent.map((p) => p.name))

  // 11. owned (product, platform) without platform_adaptation on active routed platforms
  const adaptationKey = new Set(adaptations.map((a) => `${a.product_id}|${a.platform}`))
  const missingAdapt = []
  for (const p of owned) {
    for (const pl of ALL_PLATFORMS) {
      if (!shouldExpectOwnedRoute(pl)) continue
      if (!adaptationKey.has(`${p.id}|${pl}`)) missingAdapt.push(`${p.name}|${pl}`)
    }
  }
  if (missingAdapt.length) note("LOW", "platform_adaptations", `${missingAdapt.length} (owned product, platform) pairs without platform_adaptation`, missingAdapt.slice(0, 10))

  // 12. Quora/Reddit final_copies contain raw affiliate link in body (policy violation)
  const quoraRedditPolicyViolation = []
  for (const f of finalCopies) {
    if (!ownedIds.has(f.product_id)) continue
    if (f.platform !== "quora" && f.platform !== "reddit") continue
    const product = productById[f.product_id]
    const link = (product?.affiliate_link ?? product?.affiliate_url ?? "").trim()
    if (link && f.body?.includes(link)) {
      quoraRedditPolicyViolation.push({ product: product.name, platform: f.platform })
    }
  }
  if (quoraRedditPolicyViolation.length) note("MEDIUM", "final_copies", `${quoraRedditPolicyViolation.length} Quora/Reddit final_copies contain raw affiliate link (policy violation if auto-published)`, quoraRedditPolicyViolation.slice(0, 10))

  // 13. final_copies on owned product where an active routed platform is missing
  const fcKey = new Set(finalCopies.map((f) => `${f.product_id}|${f.platform}`))
  const missingFc = []
  for (const p of owned) {
    for (const pl of ALL_PLATFORMS) {
      if (!shouldExpectOwnedRoute(pl)) continue
      if (!fcKey.has(`${p.id}|${pl}`)) missingFc.push(`${p.name}|${pl}`)
    }
  }
  if (missingFc.length) note("HIGH", "final_copies", `${missingFc.length} owned (product, platform) pairs without final_copy`, missingFc.slice(0, 10))

  // 14. platform_connections status not "connected" for FB/IG/Pinterest
  const expected = ["facebook_page", "instagram_professional", "pinterest"]
  for (const ex of expected) {
    const row = connections.find((c) => c.provider === ex)
    if (!row || row.status !== "connected") {
      note("LOW", "platform_connections", `${ex}: status is ${row?.status ?? "unregistered"}`)
    }
  }

  // 15. test/old products that should be cleaned
  const testProducts = products.filter((p) => /test|staging|demo/i.test(p.name))
  if (testProducts.length) note("LOW", "products", `${testProducts.length} products look like test/staging`, testProducts.map((p) => p.name))

  // ===== Report =====
  console.log(`Owned products: ${owned.length}`)
  console.log(`Total products: ${products.length}`)
  console.log(`Total final_copies: ${finalCopies.length}`)
  console.log(`Total publish_jobs: ${publishJobs.length}`)
  console.log(`Total published_records: ${publishedRecords.length}`)
  console.log(`Total campaign_links: ${campaignLinks.length}`)
  console.log()

  const bySeverity = { HIGH: [], MEDIUM: [], LOW: [] }
  for (const a of anomalies) bySeverity[a.severity].push(a)

  for (const sev of ["HIGH", "MEDIUM", "LOW"]) {
    if (!bySeverity[sev].length) continue
    console.log(`\n=== ${sev} (${bySeverity[sev].length}) ===`)
    for (const a of bySeverity[sev]) {
      console.log(`\n[${a.area}] ${a.msg}`)
      if (a.details) {
        if (Array.isArray(a.details)) for (const d of a.details) console.log(`  - ${typeof d === "string" ? d : JSON.stringify(d)}`)
        else console.log(`  ${typeof a.details === "string" ? a.details : JSON.stringify(a.details, null, 2)}`)
      }
    }
  }

  if (!anomalies.length) console.log("\n✓ NO ANOMALIES — system clean.")
  else console.log(`\nTOTAL ANOMALIES: ${anomalies.length}`)
})().catch((e) => { console.error(e); process.exit(1) })
