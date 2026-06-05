// Audit-only: per-product signals used by Traffic Engine scoring
require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await c.connect()

  // Per-product signals for products that have at least one ready_for_operator_approval final_copy
  const rows = (await c.query(`
    SELECT
      p.id,
      p.name,
      p.commission_rate,
      p.status AS product_status,
      (
        SELECT count(*)::int FROM affiliate_programs ap
        WHERE ap.product_id = p.id AND ap.status = 'link_ready' AND coalesce(ap.affiliate_link,'') <> ''
      ) AS link_ready_count,
      (
        SELECT coalesce(ap.network, '') FROM affiliate_programs ap
        WHERE ap.product_id = p.id AND ap.status = 'link_ready' AND coalesce(ap.affiliate_link,'') <> ''
        ORDER BY ap.updated_at DESC LIMIT 1
      ) AS top_network,
      (
        SELECT coalesce(ap.affiliate_link, '') FROM affiliate_programs ap
        WHERE ap.product_id = p.id AND ap.status = 'link_ready' AND coalesce(ap.affiliate_link,'') <> ''
        ORDER BY ap.updated_at DESC LIMIT 1
      ) AS top_link,
      (
        SELECT count(*)::int FROM published_records pr
        WHERE pr.product_id = p.id AND pr.verification_status='verified' AND coalesce(pr.live_url,'')<>''
      ) AS published_verified,
      (
        SELECT count(*)::int FROM campaign_links cl
        WHERE cl.product_id = p.id
      ) AS campaign_links_count,
      (
        SELECT count(*)::int FROM final_copies fc
        WHERE fc.product_id = p.id AND fc.status='ready_for_operator_approval'
      ) AS waiting_final_copies
    FROM products p
    WHERE EXISTS (
      SELECT 1 FROM final_copies fc
      WHERE fc.product_id = p.id AND fc.status IN ('ready_for_operator_approval','validated')
    )
    ORDER BY p.name
  `)).rows
  console.log("== products with ready_for_operator_approval final_copies ==")
  console.log("commission% | link_ready | network        | published | campaign_links | waiting | product")
  for (const r of rows) {
    console.log(
      `${String(r.commission_rate ?? "-").padStart(11)} | ${String(r.link_ready_count).padStart(10)} | ${String(r.top_network || "-").padEnd(14)} | ${String(r.published_verified).padStart(9)} | ${String(r.campaign_links_count).padStart(14)} | ${String(r.waiting_final_copies).padStart(7)} | ${r.name}`,
    )
  }

  // Also platform reach
  const plat = (await c.query(`
    SELECT fc.platform, count(*)::int waiting
    FROM final_copies fc
    WHERE fc.status='ready_for_operator_approval'
    GROUP BY fc.platform ORDER BY fc.platform
  `)).rows
  console.log("\n== waiting by platform ==")
  for (const r of plat) console.log(`  ${r.platform}: ${r.waiting}`)

  await c.end()
}
main().catch(e => { console.error(e); process.exit(1) })
