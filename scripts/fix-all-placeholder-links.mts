import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const SYSTEMEIO_URL = "https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365"
const ELEVENLABS_URL = "https://try.elevenlabs.io/bcwxftu128a9"
const WILLO_URL = "https://www.willo.ai/?ref=meni"

const PLACEHOLDER_PATTERNS = [
  /\[INSERT REAL [A-Z\s\.]+ AFFILIATE LINK HERE\]/g,
  /\[INSERT AFFILIATE LINK HERE\]/g,
  /\[INSERT REAL AFFILIATE LINK\]/g,
  /\[YOUR AFFILIATE LINK\]/g,
  /\[AFFILIATE LINK\]/g,
]

const { data } = await supabase
  .from("content_drafts")
  .select("id, template_type, title, body, products(name)")

type Row = {
  id: string
  template_type: string
  title: string | null
  body: string
  products?: { name?: string } | { name?: string }[] | null
}

const drafts = (data as Row[] | null) ?? []

let fixed = 0

for (const d of drafts) {
  const prod = Array.isArray(d.products) ? d.products[0] : d.products
  const productName = prod?.name ?? ""

  // pick the right affiliate URL for this product
  let url = ""
  if (productName === "Systeme.io") url = SYSTEMEIO_URL
  else if (productName === "ElevenLabs") url = ELEVENLABS_URL
  else if (productName === "Willo") url = WILLO_URL
  else continue

  // check if body contains any placeholder
  const hasPlaceholder = PLACEHOLDER_PATTERNS.some((p) => p.test(d.body))
  if (!hasPlaceholder) continue

  // replace all placeholders with the real URL
  let newBody = d.body
  for (const pattern of PLACEHOLDER_PATTERNS) {
    newBody = newBody.replace(pattern, url)
  }

  const { error } = await supabase
    .from("content_drafts")
    .update({ body: newBody })
    .eq("id", d.id)

  if (error) {
    console.error(`FAIL ${d.id}: ${error.message}`)
  } else {
    console.log(`FIXED [${d.template_type}] ${productName} (${d.id})`)
    console.log(`  Title: ${d.title}`)
    fixed++
  }
}

console.log(`\nDone. Fixed ${fixed} drafts with placeholder links.`)
