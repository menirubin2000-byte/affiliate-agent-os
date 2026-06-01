import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const { data: product } = await supabase
  .from("products").select("id").ilike("name", "ElevenLabs").single()

const { data: drafts } = await supabase
  .from("content_drafts")
  .select("id, status, title, template_type, created_at")
  .eq("product_id", product!.id)
  .order("created_at", { ascending: false })

console.log(`\nTotal ElevenLabs rows in DB: ${drafts?.length ?? 0}`)
for (const d of (drafts as { id: string; status: string; title: string; template_type: string; created_at: string }[]) ?? []) {
  console.log(`  [${d.status}] [${d.template_type}] ${d.id}`)
  console.log(`    "${d.title}"`)
}
