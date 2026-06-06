// Record the 4 LinkedIn posts published manually via Chrome MCP today (2026-06-06).
// Updates publish_jobs to 'verified' + writes published_records rows.
require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")

const PUBLISHES = [
  { product: "Joiin",         urn: "urn:li:activity:7469034155419377664", note: "old body (pre-validator-fix); v1" },
  { product: "Pricefy",       urn: "urn:li:activity:7469035475572363264", note: "old body (pre-validator-fix); accidental v1 - consider deleting" },
  { product: "Pricefy",       urn: "urn:li:activity:7469109804729487360", note: "clean body with UTM (post-validator-fix); v2" },
  { product: "Geo Targetly",  urn: "urn:li:activity:7469115763040120832", note: "clean body with UTM" },
]

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432, database: "postgres", user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await c.connect()
  for (const p of PUBLISHES) {
    const liveUrl = `https://www.linkedin.com/feed/update/${p.urn}/`
    const product = (await c.query("SELECT id FROM products WHERE name = $1", [p.product])).rows[0]
    if (!product) { console.warn(`! product ${p.product} not found`); continue }

    const exists = await c.query("SELECT id FROM published_records WHERE live_url = $1", [liveUrl])
    if (exists.rows.length) { console.log(`· ${p.product} LI: already in DB`); continue }

    // Pull source_content + platform_adaptation for FK
    const sc = (await c.query("SELECT id FROM source_contents WHERE product_id = $1 ORDER BY updated_at DESC LIMIT 1", [product.id])).rows[0]
    const pa = (await c.query("SELECT id FROM platform_adaptations WHERE product_id = $1 AND platform = 'linkedin' ORDER BY updated_at DESC LIMIT 1", [product.id])).rows[0]
    if (!sc || !pa) { console.warn(`! ${p.product}: missing source_content or platform_adaptation`); continue }

    // Find the final_copy + publish_job
    const fc = (await c.query(`SELECT id FROM final_copies WHERE product_id = $1 AND platform = 'linkedin' AND language = 'en' AND status IN ('operator_approved','published_verified') ORDER BY updated_at DESC LIMIT 1`, [product.id])).rows[0]

    const ins = await c.query(
      `INSERT INTO published_records (product_id, source_content_id, platform_adaptation_id, final_copy_id, platform, live_url, verification_status, verified_at)
       VALUES ($1, $2, $3, $4, 'linkedin', $5, 'verified', now()) RETURNING id`,
      [product.id, sc.id, pa.id, fc?.id ?? null, liveUrl],
    )
    console.log(`✓ ${p.product} LI -> published_records ${ins.rows[0].id} | ${p.note}`)

    // If this final_copy still maps 1:1 to a publish_job, mark it verified + set live_url
    if (fc) {
      await c.query(
        `UPDATE publish_jobs SET status = 'verified', live_url = $1, verified_at = now(), updated_at = now()
         WHERE final_copy_id = $2 AND status IN ('approved_waiting_executor','pending_meni_approval','blocked_executor_not_connected')`,
        [liveUrl, fc.id],
      )
      await c.query(
        `UPDATE final_copies SET status = 'published_verified', updated_at = now() WHERE id = $1`,
        [fc.id],
      )
      console.log(`  · final_copy + publish_job synced to verified`)
    }
  }
  await c.end()
}
main().catch(e => { console.error(e); process.exit(1) })
