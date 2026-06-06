// Read-only: list the products that are REALLY ours (link_ready with a real link)
// plus everything MENI needs to decide what to push next.
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
  const rows = (await c.query(`
    SELECT
      p.name,
      coalesce(ap.network, '—') AS network,
      coalesce(p.commission_rate::text, '—') AS commission,
      ap.affiliate_link,
      (SELECT count(*)::int FROM final_copies fc WHERE fc.product_id = p.id AND fc.status='ready_for_operator_approval') AS waiting,
      (SELECT count(*)::int FROM final_copies fc WHERE fc.product_id = p.id AND fc.status='operator_approved') AS approved,
      (SELECT count(*)::int FROM published_records pr WHERE pr.product_id = p.id AND pr.verification_status='verified' AND coalesce(pr.live_url,'')<>'') AS published
    FROM products p
    JOIN affiliate_programs ap ON ap.product_id = p.id
    WHERE ap.status = 'link_ready' AND coalesce(ap.affiliate_link,'') <> ''
    ORDER BY p.name
  `)).rows
  console.log(`# active products: ${rows.length}\n`)
  console.log("name              | network        | comm  | waiting | approved | published | link")
  console.log("------------------|----------------|-------|---------|----------|-----------|---------------------------------------------")
  for (const r of rows) {
    const link = (r.affiliate_link || "").length > 45 ? r.affiliate_link.slice(0, 42) + "..." : (r.affiliate_link || "")
    console.log(
      `${r.name.padEnd(17)} | ${String(r.network).padEnd(14)} | ${String(r.commission).padEnd(5)} | ${String(r.waiting).padStart(7)} | ${String(r.approved).padStart(8)} | ${String(r.published).padStart(9)} | ${link}`,
    )
  }
  await c.end()
}
main().catch(async (e) => { console.error(e); try { await c.end() } catch {}; process.exit(1) })
