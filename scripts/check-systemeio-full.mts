import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const { data } = await supabase
  .from("content_drafts")
  .select("id, template_type, title, body, status")
  .in("id", ["3282aef9-290d-4275-a7f1-67bfccff323b", "82454a78-3050-46c9-9b5c-a3d94efd1fd5"])

for (const d of (data as { id: string; template_type: string; title: string; body: string; status: string }[]) ?? []) {
  console.log(`\n=== ${d.template_type} (${d.id}) status=${d.status} ===`)
  console.log(`Title: ${d.title}`)
  console.log(`Body length: ${d.body.length} chars`)
  console.log(`Last 80 chars: "...${d.body.slice(-80)}"`)
  console.log(`Has affiliate link: ${d.body.includes("systeme.io/?sa=")}`)
}
