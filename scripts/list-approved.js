require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432, database: "postgres", user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await c.connect()
  const r = await c.query(`
    SELECT p.name as product, fc.platform, fc.title, fc.status, length(fc.body) as len,
           fc.id, fc.affiliate_link
    FROM final_copies fc
    JOIN products p ON fc.product_id = p.id
    WHERE fc.status = 'operator_approved'
    ORDER BY p.name, fc.platform
  `)
  console.log(`=== ${r.rows.length} approved posts ===`)
  for (const x of r.rows) {
    console.log(`${x.product.padEnd(12)} | ${x.platform.padEnd(9)} | ${String(x.len).padStart(5)} chars | ${x.title.substring(0, 60)}`)
  }
  await c.end()
}
main().catch((err) => { console.error("ERROR:", err.message); process.exit(1) })
