import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const { data: drafts } = await supabase
  .from("content_drafts")
  .select("id, template_type, title, body, status, products(name)")

type Row = {
  id: string
  template_type: string
  title: string | null
  body: string
  status: string
  products?: { name?: string } | { name?: string }[] | null
}

const sDrafts = (drafts as Row[] | null)?.filter((d) => {
  const prod = Array.isArray(d.products) ? d.products[0] : d.products
  return prod?.name === "Systeme.io"
}) ?? []

console.log(`Found ${sDrafts.length} Systeme.io drafts:`)
for (const d of sDrafts) {
  const hasFallback = d.body.toLowerCase().includes("should be checked") ||
                      d.body.toLowerCase().includes("described here in cautious terms")
  const hasDoubleTitle = d.title?.toLowerCase().match(/systeme\.io\s+systeme\.io/i)
  console.log(`  - ${d.id} [${d.template_type}] status=${d.status}`)
  console.log(`    title: "${d.title}"`)
  console.log(`    body: ${d.body.length} chars  | fallback: ${hasFallback}  | double title: ${Boolean(hasDoubleTitle)}`)
}
