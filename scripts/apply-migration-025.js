// One-shot: apply migration 025_performance_metrics_source to live Supabase.
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
    path.join(__dirname, "..", "supabase", "migrations", "025_performance_metrics_source.sql"),
    "utf8",
  )
  await c.query(sql)
  const probe = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='performance_metrics' AND column_name='source'",
  )
  console.log(
    probe.rows.length > 0 ? "migration applied. source column present." : "migration applied but column not detected",
  )
  await c.end()
}
main().catch(async (e) => { console.error(e); try { await c.end() } catch {}; process.exit(1) })
