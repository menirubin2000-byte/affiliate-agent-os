import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Find ALL ElevenLabs drafts (any template_type, any title containing elevenlabs)
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

const allDrafts = drafts as Row[] | null
const elevenLabsDrafts = allDrafts?.filter((d) => {
  const prod = Array.isArray(d.products) ? d.products[0] : d.products
  return prod?.name === "ElevenLabs"
}) ?? []

console.log(`Found ${elevenLabsDrafts.length} ElevenLabs drafts:`)
for (const d of elevenLabsDrafts) {
  const hasIsAaAI = d.body.toLowerCase().includes("is a ai")
  const hasDoubleTitle = d.title?.toLowerCase().includes("elevenlabs elevenlabs")
  const isCut = d.body.endsWith("...") || d.body.endsWith("…") || d.body.endsWith("offi") || d.body.length < 500
  console.log(`  - ${d.id} [${d.template_type}] status=${d.status}`)
  console.log(`    title: "${d.title}"`)
  console.log(`    body length: ${d.body.length}, has "is a AI": ${hasIsAaAI}, has double title: ${hasDoubleTitle}, cut: ${isCut}`)
}
