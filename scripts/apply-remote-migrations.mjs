#!/usr/bin/env node
/**
 * Apply missing migrations (006–010) to the remote Supabase database.
 *
 * Usage:
 *   node scripts/apply-remote-migrations.mjs <DB_PASSWORD>
 *
 * The password is the Supabase database password found in:
 *   Supabase Dashboard → Settings → Database → Connection string
 *
 * This script:
 * - Reads migration SQL files from supabase/migrations/
 * - Connects directly to the Supabase PostgreSQL instance
 * - Runs migrations 006–010 in order
 * - Re-runs grants (005) to cover new tables
 * - Does NOT delete any data
 * - Does NOT print the password
 */

import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_REF = "gbkwydsodondarccqyet"

const password = process.argv[2]
if (!password) {
  console.error("❌  Usage: node scripts/apply-remote-migrations.mjs <DB_PASSWORD>")
  console.error("")
  console.error("   Find your database password in:")
  console.error("   Supabase Dashboard → Settings → Database → Connection string")
  process.exit(1)
}

const migrationsDir = join(__dirname, "..", "supabase", "migrations")

const MIGRATIONS = [
  "006_draft_versions.sql",
  "007_improvement_tasks.sql",
  "008_campaign_links.sql",
  "009_performance_campaign_link.sql",
  "010_saved_views.sql",
  "005_service_role_api_grants.sql", // re-run grants to cover new tables
]

async function main() {
  console.log("🔌  Connecting to Supabase PostgreSQL...")

  const client = new pg.Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log("✅  Connected.\n")

    for (const file of MIGRATIONS) {
      const filePath = join(migrationsDir, file)
      const sql = readFileSync(filePath, "utf8")
      console.log(`▶  Running ${file} ...`)
      try {
        await client.query(sql)
        console.log(`   ✅  ${file} done.`)
      } catch (err) {
        console.error(`   ❌  ${file} FAILED: ${err.message}`)
        // Continue with remaining migrations (IF NOT EXISTS makes most idempotent)
      }
    }

    // Verify tables exist
    console.log("\n🔍  Verifying tables...")
    const { rows } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('draft_versions', 'improvement_tasks', 'campaign_links', 'saved_views')
      ORDER BY table_name
    `)
    const found = rows.map((r) => r.table_name)
    const expected = ["campaign_links", "draft_versions", "improvement_tasks", "saved_views"]

    console.log(`   Found: ${found.join(", ")}`)

    // Check campaign_link_id column on performance_metrics
    const { rows: cols } = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'performance_metrics'
        AND column_name = 'campaign_link_id'
    `)
    const hasCampaignLinkId = cols.length > 0
    console.log(`   performance_metrics.campaign_link_id: ${hasCampaignLinkId ? "✅" : "❌"}`)

    const allGood = expected.every((t) => found.includes(t)) && hasCampaignLinkId
    if (allGood) {
      console.log("\n🎉  All migrations applied successfully!")
    } else {
      const missing = expected.filter((t) => !found.includes(t))
      if (missing.length) console.error(`\n❌  Missing tables: ${missing.join(", ")}`)
      if (!hasCampaignLinkId) console.error("❌  Missing column: performance_metrics.campaign_link_id")
    }
  } finally {
    await client.end()
    console.log("\n🔌  Disconnected.")
  }
}

main().catch((err) => {
  console.error("💥  Fatal error:", err.message)
  process.exit(1)
})
