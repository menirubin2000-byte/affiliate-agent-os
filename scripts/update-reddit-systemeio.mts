import { config } from "dotenv"
config({ path: ".env.local" })

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Find the Systeme.io reddit_post draft
const { data: drafts, error } = await supabase
  .from("content_drafts")
  .select("id, product_id, template_type, title, products(name)")
  .eq("template_type", "reddit_post")

if (error) { console.error(error.message); process.exit(1) }

type DraftRow = {
  id: string
  product_id: string
  template_type: string
  title: string | null
  products?: { name?: string } | { name?: string }[] | null
}
const draft = (drafts as DraftRow[] | null)?.find((d) => {
  const prod = Array.isArray(d.products) ? d.products[0] : d.products
  return prod?.name === "Systeme.io"
})

if (!draft) { console.error("Systeme.io reddit_post draft not found"); process.exit(1) }

const newTitle = "Has anyone used Systeme.io for funnels, email marketing, and online courses?"

const newBody = `I'm comparing simple all-in-one marketing platforms for small online businesses, and Systeme.io came up as one option.

From what I understand, it combines:
- sales funnels
- landing pages
- email marketing
- automations
- online courses
- digital product sales

The main reason I'm checking it is because using too many separate tools can become messy fast, especially when you just want to test an offer or build a simple funnel.

I'm mainly looking for real user feedback:

- Is the funnel builder easy to use?
- How is the email marketing side?
- Is it good enough for selling courses or digital products?
- Any limits or problems after using it for a while?
- Would you recommend it for beginners?

Affiliate disclosure:
This link may be an affiliate link. I may earn a commission at no extra cost to you.

Link:
https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365

Target keyword: systeme.io review`

const { error: updateError } = await supabase
  .from("content_drafts")
  .update({
    title: newTitle,
    body: newBody,
    target_keyword: "systeme.io review",
    meta_title: "Systeme.io Review — Funnels, Email, Courses All-in-One",
    meta_description: "Real user feedback on Systeme.io for funnels, email marketing, and online courses. Is it good for beginners?",
    quality_checks: {
      has_disclosure: true,
      has_clear_cta: true,
      has_target_keyword: true,
      has_meta_title: true,
      has_meta_description: true,
      avoids_fake_claims: true,
      has_required_structure: true,
    },
  })
  .eq("id", draft.id)

if (updateError) {
  console.error("Update failed:", updateError.message)
  process.exit(1)
}

console.log(`UPDATED Systeme.io Reddit draft (${draft.id})`)
console.log(`Title: ${newTitle}`)
console.log(`Body length: ${newBody.length} chars`)
console.log(`Status: draft (waiting for approval)`)
