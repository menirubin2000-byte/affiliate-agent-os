import { createHash } from "node:crypto"

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

function normalizeMediumInlineCta(body) {
  const normalized = String(body ?? "").replace(/\r\n/g, "\n")
  return normalized.replace(
    /## Call to Action\n\n([^\n]+)\n\n(https?:\/\/\S+)/gi,
    (_match, lead, url) => `## Call to Action\n\n${lead.trim()} ${url.trim()}`,
  )
}

function shortHash(value) {
  return createHash("sha256").update(value).digest("hex").substring(0, 16)
}

const { data, error } = await supabase
  .from("final_copies")
  .select("id, title, body, content_hash")
  .eq("platform", "medium")

if (error) throw new Error(error.message)

let updated = 0

for (const row of data ?? []) {
  const fixedBody = normalizeMediumInlineCta(row.body)
  if (fixedBody === row.body) continue

  const { error: updateError } = await supabase
    .from("final_copies")
    .update({
      body: fixedBody,
      content_hash: shortHash(fixedBody),
    })
    .eq("id", row.id)

  if (updateError) throw new Error(`Failed updating ${row.id}: ${updateError.message}`)
  updated += 1
  console.log(`updated ${row.id} ${row.title}`)
}

console.log(`done. updated ${updated} medium final_copies`)
