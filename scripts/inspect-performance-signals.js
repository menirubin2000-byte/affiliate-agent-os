// Audit-only: what real AAOS-owned signals exist for the Traffic Engine.
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

  console.log("=== campaign_links ===")
  const cl = await c.query("SELECT count(*)::int n FROM campaign_links")
  console.log("total rows:", cl.rows[0].n)
  const cols = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='campaign_links' ORDER BY ordinal_position",
  )
  console.log("campaign_links cols:", cols.rows.map((r) => r.column_name).join(","))
  const sample = await c.query("SELECT * FROM campaign_links LIMIT 3")
  for (const r of sample.rows) console.log(" ", r)

  console.log("\n=== performance_metrics ===")
  const pm = await c.query("SELECT count(*)::int n FROM performance_metrics")
  console.log("total rows:", pm.rows[0].n)
  const psample = await c.query(
    "SELECT product_id, channel, clicks, conversions, revenue, recorded_at FROM performance_metrics ORDER BY recorded_at DESC LIMIT 8",
  )
  for (const r of psample.rows) console.log(" ", r)

  console.log("\n=== per-product totals (from performance_metrics) ===")
  const agg = await c.query(
    `SELECT p.name,
            sum(m.clicks)::int AS total_clicks,
            sum(m.conversions)::int AS total_conv,
            sum(m.revenue)::numeric AS total_rev
     FROM performance_metrics m
     JOIN products p ON p.id = m.product_id
     GROUP BY p.name
     ORDER BY total_rev DESC NULLS LAST, total_clicks DESC NULLS LAST
     LIMIT 20`,
  )
  for (const r of agg.rows) console.log(" ", r)

  console.log("\n=== per-product campaign_link coverage ===")
  const cov = await c.query(
    `SELECT p.name, count(cl.id)::int AS link_count
     FROM products p
     LEFT JOIN campaign_links cl ON cl.product_id = p.id
     WHERE EXISTS (
       SELECT 1 FROM final_copies fc
       WHERE fc.product_id = p.id AND fc.status='ready_for_operator_approval'
     )
     GROUP BY p.name
     ORDER BY link_count DESC, p.name`,
  )
  for (const r of cov.rows) console.log(" ", r)

  await c.end()
}
main().catch((e) => { console.error(e); process.exit(1) })
