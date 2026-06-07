// One-off: probe Supabase pooler regions to discover which one hosts the tenant.
require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")
const hosts = [
  "aws-0-eu-central-1.pooler.supabase.com",
  "aws-0-us-east-1.pooler.supabase.com",
  "aws-0-us-west-1.pooler.supabase.com",
  "aws-0-ap-southeast-1.pooler.supabase.com",
  "aws-0-eu-west-1.pooler.supabase.com",
  "aws-0-sa-east-1.pooler.supabase.com",
  "aws-0-ap-northeast-1.pooler.supabase.com",
  "aws-0-ap-south-1.pooler.supabase.com",
]
;(async () => {
  for (const host of hosts) {
    const c = new Client({
      host, port: 5432, database: "postgres",
      user: "postgres.gbkwydsodondarccqyet",
      password: process.env.SUPABASE_DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    })
    try {
      await c.connect()
      console.log("OK", host)
      await c.end()
      return
    } catch (e) {
      console.log("FAIL", host, String(e.message || e).slice(0, 90))
      try { await c.end() } catch {}
    }
  }
})()
