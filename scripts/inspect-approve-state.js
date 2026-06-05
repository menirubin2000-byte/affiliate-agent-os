// Audit-only: breakdown of what's behind "waiting MENI approval"
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

  const fcByStatus = (await c.query(`
    SELECT status, count(*)::int n FROM final_copies GROUP BY status ORDER BY status
  `)).rows
  console.log("== final_copies by status ==")
  for (const r of fcByStatus) console.log(`  ${r.status}: ${r.n}`)

  const waiting = (await c.query(`
    SELECT fc.id, fc.platform, fc.status, fc.validation_status, p.name AS product,
      EXISTS(
        SELECT 1 FROM affiliate_programs ap
        WHERE ap.product_id = fc.product_id
          AND ap.status='link_ready'
          AND coalesce(ap.affiliate_link,'')<>''
      ) AS link_ready,
      EXISTS(
        SELECT 1 FROM published_records pr
        WHERE pr.product_id = fc.product_id
          AND pr.platform = fc.platform
          AND pr.verification_status='verified'
          AND coalesce(pr.live_url,'')<>''
      ) AS already_published,
      coalesce(array_length(fc.blocking_reasons, 1), 0) AS blocking_count
    FROM final_copies fc
    JOIN products p ON p.id = fc.product_id
    WHERE fc.status IN ('ready_for_operator_approval','validated')
    ORDER BY p.name, fc.platform
  `)).rows
  console.log(`\n== ready_for_operator_approval / validated rows: ${waiting.length} ==`)
  let realReady = 0, alreadyPub = 0, noLink = 0, needsFix = 0
  for (const r of waiting) {
    let bucket
    if (r.already_published) { bucket = "ALREADY_PUB"; alreadyPub++ }
    else if (!r.link_ready) { bucket = "NO_LINK_READY"; noLink++ }
    else if (r.blocking_count > 0) { bucket = `BLOCKED(${r.blocking_count})`; needsFix++ }
    else if (r.validation_status !== 'valid') { bucket = `INVAL(${r.validation_status})`; needsFix++ }
    else { bucket = "READY"; realReady++ }
    console.log(`  ${bucket.padEnd(18)} ${String(r.platform).padEnd(24)} ${r.product}`)
  }
  console.log(`\n  → realReady=${realReady}  alreadyPub=${alreadyPub}  noLinkReady=${noLink}  needsFix=${needsFix}`)

  const legacyDrafts = (await c.query(`
    SELECT count(*)::int n FROM content_drafts WHERE status='draft'
  `)).rows[0].n
  console.log(`\nlegacy content_drafts.status='draft': ${legacyDrafts}`)

  await c.end()
}
main().catch(e => { console.error(e); process.exit(1) })
