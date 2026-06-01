import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const templates = ["tiktok_script", "quora_answer", "reddit_post"]

const { data, error } = await supabase
  .from("content_drafts")
  .update({ status: "approved" })
  .in("template_type", templates)
  .eq("status", "draft")
  .select("id, template_type, title, products(name)")

if (error) { console.error(error.message); process.exit(1) }

type DraftRow = {
  id: string
  template_type: string
  title: string | null
  products?: { name?: string } | { name?: string }[] | null
}
for (const d of (data as DraftRow[] | null) ?? []) {
  const name = Array.isArray(d.products) ? d.products[0]?.name : d.products?.name
  console.log(`APPROVED: ${name} / ${d.template_type}`)
}
console.log(`\nTotal approved: ${data?.length ?? 0}`)
