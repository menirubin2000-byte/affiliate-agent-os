// One-shot: apply migration 024_traffic_engine_rankings to live Supabase.
require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")
const fs = require("fs")
const path = require("path")

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
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "migrations", "024_traffic_engine_rankings.sql"),
    "utf8",
  )
  await c.query(sql)
  const probe = await c.query("SELECT count(*)::int n FROM traffic_engine_rankings")
  console.log(`migration applied. traffic_engine_rankings rows: ${probe.rows[0].n}`)
  await c.end()
}
main().catch(async (e) => { console.error(e); try { await c.end() } catch {} ; process.exit(1) })
