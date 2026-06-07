// What's been published. Reads published_records over Supabase REST.
require("dotenv").config({ path: ".env.local" })
const { createClient } = require("@supabase/supabase-js")
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function fetchAll(table, columns) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

;(async () => {
  const [records, products] = await Promise.all([
    fetchAll("published_records", "product_id, platform, live_url, verification_status, verified_at, created_at"),
    fetchAll("products", "id, name"),
  ])
  const nameOf = Object.fromEntries(products.map((p) => [p.id, p.name]))
  const byPlatform = {}
  for (const r of records) {
    if (!byPlatform[r.platform]) byPlatform[r.platform] = []
    byPlatform[r.platform].push({
      product: nameOf[r.product_id] ?? r.product_id,
      url: r.live_url,
      verified: r.verification_status === "verified",
      when: r.verified_at ?? r.created_at,
    })
  }
  const order = ["linkedin", "medium", "substack", "facebook_page", "instagram_professional", "pinterest"]
  console.log(`TOTAL published_records: ${records.length}\n`)
  for (const platform of order) {
    const rows = byPlatform[platform]
    if (!rows) continue
    console.log(`=== ${platform} (${rows.length}) ===`)
    for (const r of rows) {
      const date = r.when ? r.when.slice(0, 10) : "—"
      const v = r.verified ? "✓" : "✗"
      console.log(`  ${v}  ${date}  ${r.product.padEnd(15)} ${r.url ?? "<no url>"}`)
    }
    console.log()
  }
  for (const platform of Object.keys(byPlatform)) {
    if (order.includes(platform)) continue
    const rows = byPlatform[platform]
    console.log(`=== ${platform} (${rows.length}) ===`)
    for (const r of rows) console.log(`  ${r.product}: ${r.url}`)
    console.log()
  }
})().catch((e) => { console.error(e); process.exit(1) })
