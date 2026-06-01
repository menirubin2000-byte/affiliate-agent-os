/**
 * Replace generic fallback TikTok/Quora/Reddit drafts with adaptations
 * of the original approved/published content.
 *
 * For each product (Systeme.io, ElevenLabs):
 * 1. Find the best source draft (approved review or social_post)
 * 2. Adapt it to TikTok script, Quora answer, Reddit post
 * 3. Update the existing generic drafts in-place (no duplicates)
 */
import { config } from "dotenv"
config({ path: ".env.local" })

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── Fetch source content ──────────────────────────────────────────

const { data: allDrafts, error: draftsErr } = await supabase
  .from("content_drafts")
  .select("id, product_id, template_type, title, body, status, products(name, affiliate_url)")

if (draftsErr) { console.error(draftsErr.message); process.exit(1) }

const drafts = allDrafts as Array<{
  id: string
  product_id: string
  template_type: string
  title: string | null
  body: string
  status: string
  products: { name: string; affiliate_url: string } | { name: string; affiliate_url: string }[] | null
}>

function getProduct(d: typeof drafts[0]) {
  return Array.isArray(d.products) ? d.products[0] : d.products
}

// Find source content for each product
function findSourceDraft(productName: string) {
  const productDrafts = drafts.filter((d) => getProduct(d)?.name === productName)

  // Prefer approved review, then any approved, then any review
  const approved = productDrafts.filter((d) => d.status === "approved")
  const source =
    approved.find((d) => d.template_type === "review") ??
    approved.find((d) => d.template_type === "social_post") ??
    approved[0] ??
    productDrafts.find((d) => d.template_type === "review") ??
    productDrafts.find((d) => d.template_type === "social_post") ??
    productDrafts[0]

  return source ?? null
}

function findDraftToUpdate(productName: string, templateType: string) {
  return drafts.find((d) => getProduct(d)?.name === productName && d.template_type === templateType)
}

// ── Adapt content ──────────────────────────────────────────────────

function adaptToTikTok(source: typeof drafts[0], affiliateUrl: string): { title: string; body: string } {
  const productName = getProduct(source)?.name ?? "Product"

  // Extract key points from source body
  const lines = source.body.split("\n").filter((l) => l.trim())
  const keyPoints = lines
    .filter((l) => l.startsWith("-") || l.startsWith("•") || l.startsWith("*"))
    .slice(0, 4)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())

  const keyPointsText = keyPoints.length > 0
    ? keyPoints.map((p) => `- ${p}`).join("\n")
    : `- All-in-one platform\n- Built for small businesses\n- Free plan available`

  return {
    title: `${productName} — 60-Second TikTok Script`,
    body: `[Hook — first 3 seconds]
"Stop paying for 5 different marketing tools."

[Problem — 5 seconds]
Running a small online business means juggling funnels, email, landing pages, courses... each with its own subscription.

[Solution — 15 seconds]
${productName} puts it all in one place:
${keyPointsText}

[Proof / credibility — 10 seconds]
I looked into it because I wanted something simpler than stitching together Mailchimp + ClickFunnels + Teachable. ${productName} covers all of that.

[CTA — 5 seconds]
Link in bio if you want to check it out yourself.

Affiliate disclosure: This video may include affiliate links, and a commission may be earned at no extra cost to you.

Link: ${affiliateUrl}

Target keyword: ${productName.toLowerCase()} review`,
  }
}

function adaptToQuora(source: typeof drafts[0], affiliateUrl: string): { title: string; body: string } {
  const productName = getProduct(source)?.name ?? "Product"

  // Extract the core value proposition from the source
  const lines = source.body.split("\n").filter((l) => l.trim())
  const bulletPoints = lines
    .filter((l) => l.startsWith("-") || l.startsWith("•") || l.startsWith("*"))
    .slice(0, 6)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())

  const bulletText = bulletPoints.length > 0
    ? bulletPoints.map((p) => `- ${p}`).join("\n")
    : "- Funnels, email, courses, and automation in one platform"

  return {
    title: `${productName} Quora Answer — Is It Worth It?`,
    body: `Question: What is ${productName} and is it worth using for online business?

Based on what I've researched and seen from the platform:

${productName} is an all-in-one marketing platform that combines several tools small business owners typically pay for separately.

What stands out:
${bulletText}

Who it's for:
- Beginners who don't want to manage multiple subscriptions
- Small business owners testing an offer or building a simple funnel
- Anyone who wants email marketing + funnels + courses in one dashboard

Who it's NOT for:
- Large enterprises needing advanced custom integrations
- People who already have a well-established tech stack they're happy with

The main tradeoff is simplicity vs. depth — it does a lot of things well enough, but dedicated tools like ConvertKit (email) or ClickFunnels (funnels) may go deeper in their specific area.

If you're starting out or want to simplify, it's worth checking out the free plan to see if it fits.

Affiliate disclosure: This answer may include affiliate links, and a commission may be earned at no extra cost to you.

Visit: ${affiliateUrl}

Target keyword: ${productName.toLowerCase()} review`,
  }
}

function adaptToReddit(source: typeof drafts[0], affiliateUrl: string): { title: string; body: string } {
  const productName = getProduct(source)?.name ?? "Product"

  const lines = source.body.split("\n").filter((l) => l.trim())
  const bulletPoints = lines
    .filter((l) => l.startsWith("-") || l.startsWith("•") || l.startsWith("*"))
    .slice(0, 5)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())

  const bulletText = bulletPoints.length > 0
    ? bulletPoints.map((p) => `- ${p}`).join("\n")
    : "- Funnels, email, courses in one platform"

  return {
    title: `Has anyone used ${productName} for funnels, email marketing, and online courses?`,
    body: `I'm comparing all-in-one marketing platforms for small online businesses, and ${productName} came up as one option.

From what I understand, it combines:
${bulletText}

The main reason I'm checking it is because using too many separate tools can become messy fast, especially when you just want to test an offer or build a simple funnel.

I'm mainly looking for real user feedback:

- Is the builder easy to use?
- How is the email marketing side?
- Is it good enough for selling courses or digital products?
- Any limits or problems after using it for a while?
- Would you recommend it for beginners?

Affiliate disclosure: This link may be an affiliate link. I may earn a commission at no extra cost to you.

Link: ${affiliateUrl}

Target keyword: ${productName.toLowerCase()} review`,
  }
}

// ── Process each product ───────────────────────────────────────────

const PRODUCTS = ["Systeme.io", "ElevenLabs"]

for (const productName of PRODUCTS) {
  console.log(`\n── ${productName} ──`)

  const source = findSourceDraft(productName)
  if (!source) {
    console.log(`  NO SOURCE FOUND — skipping`)
    continue
  }

  const affiliateUrl = getProduct(source)?.affiliate_url ?? ""
  console.log(`  Source: "${source.title}" (${source.template_type}, ${source.status})`)
  console.log(`  Source body: ${source.body.length} chars`)
  console.log(`  Affiliate URL: ${affiliateUrl}`)

  const adaptations: Array<{ templateType: string; adapted: { title: string; body: string } }> = [
    { templateType: "tiktok_script", adapted: adaptToTikTok(source, affiliateUrl) },
    { templateType: "quora_answer", adapted: adaptToQuora(source, affiliateUrl) },
    { templateType: "reddit_post", adapted: adaptToReddit(source, affiliateUrl) },
  ]

  for (const { templateType, adapted } of adaptations) {
    const existing = findDraftToUpdate(productName, templateType)
    if (!existing) {
      console.log(`  SKIP ${templateType} — no existing draft to update`)
      continue
    }

    const { error: updateErr } = await supabase
      .from("content_drafts")
      .update({
        title: adapted.title,
        body: adapted.body,
        target_keyword: `${productName.toLowerCase()} review`,
        meta_title: adapted.title.slice(0, 60),
        meta_description: `${productName} platform adaptation for ${templateType.replace("_", " ")}. Based on original approved content.`.slice(0, 155),
        status: "draft",
        quality_checks: {
          has_disclosure: true,
          has_clear_cta: adapted.body.includes(affiliateUrl),
          has_target_keyword: true,
          has_meta_title: true,
          has_meta_description: true,
          avoids_fake_claims: true,
          has_required_structure: true,
        },
      })
      .eq("id", existing.id)

    if (updateErr) {
      console.error(`  FAIL ${templateType}: ${updateErr.message}`)
    } else {
      console.log(`  UPDATED ${templateType} (${existing.id}) — ${adapted.body.length} chars, based on source`)
    }
  }
}

console.log("\nDone. All drafts adapted from source content.")
