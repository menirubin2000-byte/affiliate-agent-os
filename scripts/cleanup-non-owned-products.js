// Archive products that aren't really MENI's.
//
// Criterion (the only one):
//   product is REAL iff there exists at least one row in affiliate_programs
//   where product_id=this.product AND status='link_ready' AND
//   coalesce(affiliate_link,'')<>''.
//
// Everything else gets products.status='archived' with a stamp in
// notes. No DELETE — final_copies, published_records,
// campaign_links, performance_metrics all keep their FKs.

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

const DRY_RUN = process.argv.includes("--dry")
const STAMP = `archived_by_cleanup_${new Date().toISOString().slice(0, 10)}: no link_ready affiliate_program`

async function main() {
  await c.connect()

  const products = (await c.query(`
    SELECT
      p.id, p.name, p.slug, p.status,
      EXISTS (
        SELECT 1 FROM affiliate_programs ap
        WHERE ap.product_id = p.id
          AND ap.status = 'link_ready'
          AND coalesce(ap.affiliate_link, '') <> ''
      ) AS is_real
    FROM products p
    ORDER BY p.name
  `)).rows

  const real = products.filter((p) => p.is_real)
  const notReal = products.filter((p) => !p.is_real)
  const alreadyArchived = notReal.filter((p) => p.status === "archived")
  const toArchive = notReal.filter((p) => p.status !== "archived")

  console.log(`Total products: ${products.length}`)
  console.log(`  Real (link_ready):                   ${real.length}`)
  console.log(`  Not real, already archived:          ${alreadyArchived.length}`)
  console.log(`  Not real, will be archived now:      ${toArchive.length}`)
  if (DRY_RUN) {
    console.log("\n[DRY RUN] No writes.")
  }

  console.log("\n=== REAL products (keeping active) ===")
  for (const p of real) console.log(`  ${p.status.padEnd(10)} ${p.name}`)

  console.log("\n=== Products to ARCHIVE ===")
  for (const p of toArchive) console.log(`  was=${p.status.padEnd(10)} ${p.name}`)

  if (DRY_RUN || toArchive.length === 0) {
    await c.end()
    return
  }

  // products.status check constraint only allows 'active' | 'inactive'.
  // We mark non-real products inactive (if not already) and stamp notes.
  let flipped = 0
  let stamped = 0
  for (const p of notReal) {
    const needsFlip = p.status === "active"
    const r = await c.query(
      `UPDATE products
       SET ${needsFlip ? "status = 'inactive', " : ""}
           notes = CASE
             WHEN coalesce(notes, '') LIKE '%archived_by_cleanup%' THEN notes
             ELSE coalesce(notes || E'\\n', '') || $1
           END
       WHERE id = $2
       RETURNING id, (notes LIKE '%archived_by_cleanup%') AS is_stamped`,
      [STAMP, p.id],
    )
    if (needsFlip) flipped++
    if (r.rows[0]?.is_stamped) stamped++
  }
  console.log(`\nFlipped active→inactive: ${flipped}`)
  console.log(`Stamped notes:           ${stamped}`)

  // Re-check counts.
  const after = (await c.query(`
    SELECT status, count(*)::int n FROM products GROUP BY status ORDER BY status
  `)).rows
  console.log("\n=== products.status histogram after cleanup ===")
  for (const r of after) console.log(`  ${r.status}: ${r.n}`)

  await c.end()
}

main().catch(async (e) => {
  console.error(e)
  try { await c.end() } catch {}
  process.exit(1)
})
