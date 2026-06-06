// Block iCompass from the publish queue.
//
// MENI's research finding (2026-06-06):
//   icompass.io vendor site has an expired SSL cert (April 2026). The
//   affiliate link technically resolves but real users hit a browser security
//   warning and bounce. Not safe to drive traffic to until the vendor fixes
//   their HTTPS. This is NOT a network rejection (we still HAVE the link) —
//   it's a vendor trust issue we self-block on.
//
// Actions:
//   1. affiliate_programs.status     'link_ready' -> 'closed'
//      affiliate_programs.notes      stamp with the reason
//   2. final_copies (all platforms)  -> status='needs_system_fix',
//      validation_status='fix_requested',
//      blocking_reasons += 'blocked_vendor_site_ssl_invalid'
//   3. products.notes                stamp with the reason + date
//
// Reversible: when the vendor fixes HTTPS, flip status back to 'link_ready'
// and re-validate the final_copies.

require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")

const REASON = "blocked_vendor_site_ssl_invalid"
const HUMAN_REASON =
  "[2026-06-06] iCompass closed by operator: icompass.io SSL cert expired 2026-04-22. " +
  "Reopen after vendor fixes HTTPS. See research notes."

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

  const product = (await c.query(
    "SELECT id, name, notes FROM products WHERE name = $1",
    ["iCompass"],
  )).rows[0]
  if (!product) throw new Error("Product 'iCompass' not found")
  console.log(`iCompass product_id: ${product.id}`)

  // 1. Close the affiliate program.
  const programs = (await c.query(
    `UPDATE affiliate_programs
     SET status = 'closed',
         notes = CASE
           WHEN coalesce(notes, '') LIKE '%blocked_vendor_site_ssl_invalid%' THEN notes
           ELSE coalesce(notes || E'\\n', '') || $1
         END,
         updated_at = now()
     WHERE product_id = $2 AND status = 'link_ready'
     RETURNING id, program_name, affiliate_link`,
    [HUMAN_REASON, product.id],
  )).rows
  console.log(`Closed ${programs.length} affiliate_program(s)`)
  for (const p of programs) console.log(`  ${p.id} ${p.program_name} ${p.affiliate_link}`)

  // 2. Mark every final_copy for this product as needs_system_fix with the
  //    explicit blocking_reason.
  const fcRes = await c.query(
    `UPDATE final_copies
     SET status = 'needs_system_fix',
         validation_status = 'fix_requested',
         blocking_reasons = (
           SELECT array_agg(DISTINCT x)
           FROM unnest(coalesce(blocking_reasons, '{}') || ARRAY[$1::text]) AS x
         ),
         updated_at = now()
     WHERE product_id = $2
       AND status IN ('ready_for_operator_approval', 'validated', 'draft_internal', 'operator_approved', 'ready_for_manual_publish')
     RETURNING id, platform, language, status`,
    [REASON, product.id],
  )
  console.log(`Updated ${fcRes.rows.length} final_copies -> needs_system_fix`)
  for (const f of fcRes.rows) {
    console.log(`  ${f.platform.padEnd(10)} ${f.language} ${f.status}`)
  }

  // 3. Stamp the product notes with the audit line (only once).
  await c.query(
    `UPDATE products
     SET notes = CASE
       WHEN coalesce(notes, '') LIKE '%blocked_vendor_site_ssl_invalid%' THEN notes
       ELSE coalesce(notes || E'\\n', '') || $1
     END,
     updated_at = now()
     WHERE id = $2`,
    [HUMAN_REASON, product.id],
  )

  // Final histogram.
  const hist = await c.query(
    `SELECT status, count(*)::int n FROM final_copies
     WHERE product_id = $1 GROUP BY status ORDER BY status`,
    [product.id],
  )
  console.log("\niCompass final_copies status:")
  for (const r of hist.rows) console.log(`  ${r.status}: ${r.n}`)

  await c.end()
}
main().catch(async (e) => { console.error(e); try { await c.end() } catch {}; process.exit(1) })
