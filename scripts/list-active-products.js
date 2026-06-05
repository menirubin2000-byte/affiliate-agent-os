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
    SELECT p.name, ap.network, ap.status, ap.affiliate_link
    FROM affiliate_programs ap
    JOIN products p ON ap.product_id = p.id
    WHERE ap.affiliate_link IS NOT NULL AND ap.affiliate_link != ''
    ORDER BY p.name
  `)
  console.log(`=== ${r.rows.length} active products with affiliate links ===\n`)
  r.rows.forEach((x) => {
    console.log(`${x.name.padEnd(15)} | ${(x.network || "—").padEnd(15)} | ${x.status.padEnd(20)} | ${x.affiliate_link}`)
  })
  await c.end()
}
main().catch((err) => { console.error("ERROR:", err.message); process.exit(1) })
