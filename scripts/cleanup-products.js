// Cleanup: keep only products with at least one affiliate_program in
// status link_ready / submitted / awaiting_human_approval.
// Deletes cascading rows in proper dependency order.
require("dotenv").config({ path: ".env.local" })
const { createClient } = require("@supabase/supabase-js")
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const DRY = process.argv.includes("--dry-run")

;(async () => {
  const KEEP_STATUSES = new Set(["link_ready", "submitted", "awaiting_human_approval"])
  const { data: products } = await supabase.from("products").select("id, name")
  const { data: programs } = await supabase.from("affiliate_programs").select("product_id, status")

  const keepIds = new Set()
  for (const pr of programs) if (KEEP_STATUSES.has(pr.status)) keepIds.add(pr.product_id)
  const toDelete = products.filter((p) => !keepIds.has(p.id))
  const ids = toDelete.map((p) => p.id)

  console.log(`Keep: ${products.length - toDelete.length}`)
  console.log(`Delete: ${toDelete.length}`)
  if (DRY) {
    console.log("--dry-run — no changes")
    return
  }

  // Dependency order: child rows first.
  console.log("\nDeleting cascading data...")
  const tables = [
    "final_copies",
    "platform_adaptations",
    "source_contents",
    "publish_jobs",
    "campaign_links",
    "published_records",
    "affiliate_programs",
  ]
  for (const t of tables) {
    const { error, count } = await supabase
      .from(t)
      .delete({ count: "exact" })
      .in("product_id", ids)
    if (error) {
      console.error(`  ${t}: ERROR ${error.message}`)
      continue
    }
    console.log(`  ${t}: deleted ${count ?? "?"} rows`)
  }

  // Finally, products themselves.
  const { error: pErr, count: pCount } = await supabase
    .from("products")
    .delete({ count: "exact" })
    .in("id", ids)
  if (pErr) {
    console.error(`  products: ERROR ${pErr.message}`)
    return
  }
  console.log(`  products: deleted ${pCount ?? "?"} rows`)
  console.log("\nDONE")
})().catch((e) => { console.error(e); process.exit(1) })
