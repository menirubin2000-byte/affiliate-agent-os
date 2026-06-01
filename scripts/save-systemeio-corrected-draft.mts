import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const AFFILIATE_URL = "https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365"

const TITLE = "Systeme.io: All-in-One Marketing Platform for Solo Operators and Small Businesses"

const BODY = `Affiliate disclosure: This post contains an affiliate link. If you sign up or buy through it, I may earn a commission at no extra cost to you.

Systeme.io is an all-in-one marketing platform for people who want to build funnels, landing pages, email campaigns, automations, websites, online courses, and digital product sales from one place.

The main reason to consider Systeme.io is simplicity. Instead of connecting a separate funnel builder, email tool, course platform, website builder, and automation tool, Systeme.io puts the core pieces inside one account.

This can be useful for solo operators, creators, coaches, consultants, affiliate marketers, and small businesses that want to launch faster without managing a complicated tech stack.

You can build landing pages, capture leads, send email sequences, create sales funnels, host online courses, manage digital products, and automate follow-up without jumping between five different tools.

It is especially useful if you are early in your business and want something practical, affordable, and simple enough to manage without a technical team.

Systeme.io will not replace strategy, consistency, or a real offer. But it can remove a lot of the technical friction that stops people from launching.

If your current setup feels too scattered or expensive, Systeme.io is worth checking out.

Affiliate link:
${AFFILIATE_URL}`

// Find Systeme.io product
const { data: product } = await supabase
  .from("products")
  .select("id")
  .eq("slug", "systemeio")
  .maybeSingle()

const productId = product?.id ?? null
if (!productId) {
  // try alternate slug
  const { data: alt } = await supabase
    .from("products")
    .select("id, slug, name")
    .ilike("name", "Systeme.io")
    .maybeSingle()
  if (!alt) {
    console.error("Systeme.io product not found")
    process.exit(1)
  }
  console.log(`Found Systeme.io via name: ${alt.id} (slug: ${alt.slug})`)
}

const finalProductId = productId ?? (await supabase
  .from("products")
  .select("id")
  .ilike("name", "Systeme.io")
  .single()).data!.id

// Insert as NEW draft, status=draft, content_type=review
const { data: created, error } = await supabase
  .from("content_drafts")
  .insert({
    product_id: finalProductId,
    content_type: "review",
    template_type: "review",
    title: TITLE,
    body: BODY,
    meta_title: TITLE.slice(0, 60),
    meta_description: "Systeme.io — all-in-one marketing platform for solo operators, creators, and small businesses. Funnels, email, courses, automations.".slice(0, 155),
    target_keyword: "systeme.io review",
    quality_checks: {
      has_disclosure: true,
      has_clear_cta: true,
      has_target_keyword: true,
      has_meta_title: true,
      has_meta_description: true,
      avoids_fake_claims: true,
      has_required_structure: true,
    },
    status: "draft",
    ai_model: "operator-corrected",
    approval_notes: "Operator-corrected draft — ready for human approval. Status: draft (NOT published). Use only for manual publishing workflow.",
  })
  .select("id")
  .single()

if (error) {
  console.error("Failed to save draft:", error.message)
  process.exit(1)
}

console.log(`CREATED corrected Systeme.io draft (${created.id})`)
console.log(`  Title: ${TITLE}`)
console.log(`  Body: ${BODY.length} chars`)
console.log(`  Affiliate link: ${AFFILIATE_URL}`)
console.log(`  Status: draft (NOT published, NO metrics, ready for human approval)`)
console.log(`  Approval URL: http://localhost:3000/dashboard/he/approve`)
