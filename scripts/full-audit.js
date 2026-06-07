// Full system audit. Read-only. Tells the truth about every counter the
// operator dashboard shows. Run: node scripts/full-audit.js
require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")

const IMAGE_REQUIRED = new Set([
  "linkedin", "facebook_page", "medium", "substack",
  "instagram_professional", "pinterest", "x_twitter",
])
const VIDEO_REQUIRED = new Set(["tiktok", "youtube"])
const MANUAL_ONLY = new Set(["quora", "reddit"])
const ALL_PLATFORMS = [
  "linkedin", "medium", "substack",
  "facebook_page", "instagram_professional", "pinterest", "x_twitter",
  "youtube", "quora", "reddit", "tiktok",
]

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432, database: "postgres", user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

function section(title) {
  console.log(`\n=== ${title} ===`)
}

async function main() {
  await c.connect()

  // 1. Products
  section("1. products")
  const prods = (await c.query("SELECT count(*)::int n, status FROM products GROUP BY status ORDER BY status")).rows
  for (const r of prods) console.log(`  ${r.status}: ${r.n}`)
  const linkReady = (await c.query(`
    SELECT count(DISTINCT p.id)::int n
    FROM products p
    WHERE EXISTS (
      SELECT 1 FROM affiliate_programs ap
      WHERE ap.product_id = p.id AND ap.status='link_ready' AND coalesce(ap.affiliate_link,'')<>''
    )`)).rows[0].n
  console.log(`  link_ready (real "owned"): ${linkReady}`)

  // 2. affiliate_programs
  section("2. affiliate_programs by status")
  const aps = (await c.query("SELECT status, count(*)::int n FROM affiliate_programs GROUP BY status ORDER BY status")).rows
  for (const r of aps) console.log(`  ${r.status}: ${r.n}`)

  // 3. final_copies
  section("3. final_copies - totals")
  console.log(`  total: ${(await c.query("SELECT count(*)::int n FROM final_copies")).rows[0].n}`)
  section("3a. by platform")
  for (const r of (await c.query("SELECT platform, count(*)::int n FROM final_copies GROUP BY platform ORDER BY platform")).rows) {
    console.log(`  ${r.platform}: ${r.n}`)
  }
  section("3b. by status")
  for (const r of (await c.query("SELECT status, count(*)::int n FROM final_copies GROUP BY status ORDER BY status")).rows) {
    console.log(`  ${r.status}: ${r.n}`)
  }
  section("3c. by validation_status")
  for (const r of (await c.query("SELECT validation_status, count(*)::int n FROM final_copies GROUP BY validation_status ORDER BY validation_status")).rows) {
    console.log(`  ${r.validation_status}: ${r.n}`)
  }
  section("3d. by language")
  for (const r of (await c.query("SELECT language, count(*)::int n FROM final_copies GROUP BY language ORDER BY language")).rows) {
    console.log(`  ${r.language}: ${r.n}`)
  }

  // 4. campaign_links
  section("4. campaign_links")
  console.log(`  total: ${(await c.query("SELECT count(*)::int n FROM campaign_links")).rows[0].n}`)
  for (const r of (await c.query("SELECT source, count(*)::int n FROM campaign_links GROUP BY source ORDER BY source")).rows) {
    console.log(`  source=${r.source}: ${r.n}`)
  }
  const fcWithLink = (await c.query(`
    SELECT count(DISTINCT fc.id)::int n FROM final_copies fc
    JOIN campaign_links cl ON cl.product_id = fc.product_id AND cl.source = fc.platform
  `)).rows[0].n
  const fcTotal = (await c.query("SELECT count(*)::int n FROM final_copies")).rows[0].n
  console.log(`  final_copies WITH matching campaign_link: ${fcWithLink} / ${fcTotal}`)

  // 5. media coverage
  section("5. media coverage (per product)")
  const media = (await c.query(`
    SELECT
      count(*)::int total,
      count(*) FILTER (WHERE coalesce(image_url,'')<>'')::int with_image,
      count(*) FILTER (WHERE coalesce(image_url_he,'')<>'')::int with_image_he,
      count(*) FILTER (WHERE coalesce(video_url,'')<>'')::int with_video,
      count(*) FILTER (WHERE image_status='ready')::int image_status_ready,
      count(*) FILTER (WHERE video_status='ready')::int video_status_ready
    FROM products
    WHERE EXISTS (SELECT 1 FROM affiliate_programs ap WHERE ap.product_id=products.id AND ap.status='link_ready' AND coalesce(ap.affiliate_link,'')<>'')
  `)).rows[0]
  console.log(`  link_ready products: ${media.total}`)
  console.log(`    with image_url:       ${media.with_image}`)
  console.log(`    with image_url_he:    ${media.with_image_he}`)
  console.log(`    with video_url:       ${media.with_video}`)
  console.log(`    image_status=ready:   ${media.image_status_ready}`)
  console.log(`    video_status=ready:   ${media.video_status_ready}`)

  // 6. per (product, platform) - which final_copies pass each gate
  section("6. final_copies READY gate breakdown")
  const gateRows = (await c.query(`
    SELECT
      fc.id, fc.platform, fc.status, fc.validation_status, fc.language,
      coalesce(p.image_url,'')      AS image_url,
      coalesce(p.image_url_he,'')   AS image_url_he,
      coalesce(p.video_url,'')      AS video_url,
      p.image_status, p.video_status,
      (SELECT 1 FROM campaign_links cl WHERE cl.product_id = fc.product_id AND cl.source = fc.platform LIMIT 1) AS has_link,
      (SELECT 1 FROM published_records pr WHERE pr.product_id = fc.product_id AND pr.platform = fc.platform AND pr.verification_status='verified' AND coalesce(pr.live_url,'')<>'' LIMIT 1) AS published
    FROM final_copies fc
    JOIN products p ON p.id = fc.product_id
  `)).rows

  let realReady = 0, missingImage = 0, missingVideo = 0, missingLink = 0,
      invalidValidation = 0, alreadyPublished = 0, manualOnly = 0,
      operatorApproved = 0, needsFix = 0
  const blockReasons = new Map()

  for (const r of gateRows) {
    const reasons = []
    if (r.status === "published_verified" || r.published) { alreadyPublished++; continue }
    if (r.status === "operator_approved" || r.status === "ready_for_manual_publish") operatorApproved++
    if (r.status === "needs_system_fix") needsFix++
    if (MANUAL_ONLY.has(r.platform)) { manualOnly++; continue }

    if (r.validation_status !== "valid") { reasons.push("validation_not_valid"); invalidValidation++ }
    if (!r.has_link) { reasons.push("missing_campaign_link"); missingLink++ }

    if (IMAGE_REQUIRED.has(r.platform)) {
      const hasImg = (r.language === "he" ? r.image_url_he : r.image_url) || r.image_url
      if (!hasImg) { reasons.push("missing_image"); missingImage++ }
    }
    if (VIDEO_REQUIRED.has(r.platform)) {
      if (!r.video_url) { reasons.push("missing_video"); missingVideo++ }
    }

    if (reasons.length === 0 && r.status === "ready_for_operator_approval") realReady++
    for (const reason of reasons) blockReasons.set(reason, (blockReasons.get(reason) ?? 0) + 1)
  }
  console.log(`  truly READY for MENI approval:     ${realReady}`)
  console.log(`  operator_approved (queued/ready):  ${operatorApproved}`)
  console.log(`  needs_system_fix:                  ${needsFix}`)
  console.log(`  manual_only (quora/reddit):        ${manualOnly}`)
  console.log(`  already published:                 ${alreadyPublished}`)
  console.log(`  blocking reasons across all rows:`)
  for (const [r, n] of [...blockReasons.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${r}: ${n}`)
  }

  // 7. published_records
  section("7. published_records")
  console.log(`  total: ${(await c.query("SELECT count(*)::int n FROM published_records")).rows[0].n}`)
  for (const r of (await c.query("SELECT platform, count(*)::int n FROM published_records WHERE verification_status='verified' AND coalesce(live_url,'')<>'' GROUP BY platform ORDER BY platform")).rows) {
    console.log(`  verified ${r.platform}: ${r.n}`)
  }
  const orphans = (await c.query("SELECT count(*)::int n FROM published_records WHERE verification_status!='verified' OR coalesce(live_url,'')=''")).rows[0].n
  console.log(`  NOT verified or no URL: ${orphans}`)

  // 8. performance_metrics
  section("8. performance_metrics")
  console.log(`  total: ${(await c.query("SELECT count(*)::int n FROM performance_metrics")).rows[0].n}`)

  // 9. platform_connections
  section("9. platform_connections")
  for (const r of (await c.query("SELECT provider, status FROM platform_connections ORDER BY provider")).rows) {
    console.log(`  ${r.provider}: ${r.status}`)
  }

  // 10. publish_jobs
  section("10. publish_jobs")
  console.log(`  total: ${(await c.query("SELECT count(*)::int n FROM publish_jobs")).rows[0].n}`)
  for (const r of (await c.query("SELECT status, count(*)::int n FROM publish_jobs GROUP BY status ORDER BY status")).rows) {
    console.log(`  ${r.status}: ${r.n}`)
  }

  // 11. approval_items
  section("11. approval_items")
  console.log(`  total: ${(await c.query("SELECT count(*)::int n FROM approval_items")).rows[0].n}`)

  // 12. browser_jobs
  section("12. browser_jobs")
  console.log(`  total: ${(await c.query("SELECT count(*)::int n FROM browser_jobs")).rows[0].n}`)

  // 13. WHERE does the 249 blocked come from? Simulate routing:
  // For each product (link_ready) × platform (11) → route → bucket
  section("13. ROUTING SIMULATION (per product × platform) - explains dashboard 'blocked'")
  const products = (await c.query(`
    SELECT p.id, p.name
    FROM products p
    WHERE EXISTS (SELECT 1 FROM affiliate_programs ap WHERE ap.product_id=p.id AND ap.status='link_ready' AND coalesce(ap.affiliate_link,'')<>'')
  `)).rows
  const buckets = {
    published_verified: 0, ready_for_executor: 0, pending_meni_approval: 0,
    executor_blocked: 0, policy_blocked: 0, requires_auth: 0, running: 0,
    waiting_url_verification: 0, needs_system_fix: 0, missing_final_copy: 0,
    missing_affiliate_link: 0, platform_pending_setup: 0, platform_disabled: 0,
  }
  for (const p of products) {
    for (const platform of ALL_PLATFORMS) {
      // simplified routing: look at the most recent final_copy + published_record
      const pub = (await c.query(`SELECT 1 FROM published_records WHERE product_id=$1 AND platform=$2 AND verification_status='verified' AND coalesce(live_url,'')<>'' LIMIT 1`, [p.id, platform])).rows[0]
      if (pub) { buckets.published_verified++; continue }
      const fc = (await c.query(`SELECT status, validation_status FROM final_copies WHERE product_id=$1 AND platform=$2 ORDER BY updated_at DESC LIMIT 1`, [p.id, platform])).rows[0]
      // Platform status from routing definitions (simplified)
      if (platform === "tiktok") { buckets.platform_disabled++; continue }
      const pending = !["medium", "substack"].includes(platform)  // active=medium,substack only currently
      if (pending) {
        if (fc?.status === "operator_approved" || fc?.status === "ready_for_manual_publish") {
          buckets.ready_for_executor++; continue
        }
        buckets.platform_pending_setup++; continue
      }
      if (!fc) { buckets.missing_final_copy++; continue }
      if (fc.status === "needs_system_fix" || fc.validation_status !== "valid") { buckets.needs_system_fix++; continue }
      if (fc.status === "ready_for_operator_approval" || fc.status === "validated") { buckets.pending_meni_approval++; continue }
      if (fc.status === "operator_approved" || fc.status === "ready_for_manual_publish") { buckets.ready_for_executor++; continue }
      buckets.needs_system_fix++
    }
  }
  for (const [k, v] of Object.entries(buckets)) console.log(`  ${k}: ${v}`)
  console.log(`  TOTAL routes: ${products.length} products × ${ALL_PLATFORMS.length} platforms = ${products.length * ALL_PLATFORMS.length}`)
  const blockedCount = buckets.executor_blocked + buckets.policy_blocked + buckets.needs_system_fix +
    buckets.missing_affiliate_link + buckets.platform_pending_setup + buckets.platform_disabled + buckets.missing_final_copy
  console.log(`  → dashboard "blocked" counter would be: ${blockedCount}`)

  await c.end()
}
main().catch((e) => { console.error(e); process.exit(1) })
