/**
 * Generate missing TikTok/Quora/Reddit drafts for all products with active affiliate links.
 * Idempotent — skips products that already have drafts for a given template type.
 * Run: npx tsx scripts/generate-missing-drafts.mts
 */

import { config } from "dotenv"
config({ path: ".env.local" })

// Dynamic imports to pick up env after dotenv
const { generateDraftForProduct, getContentTypeForTemplate } = await import("../lib/ai.js")
const { buildQualityChecks } = await import("../lib/quality.js")

// Direct Supabase client since we're outside Next.js
const { createClient } = await import("@supabase/supabase-js")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

type TemplateType = "tiktok_script" | "quora_answer" | "reddit_post"

const MISSING_PLATFORMS: Array<{ platform: string; templateType: TemplateType }> = [
  { platform: "TikTok", templateType: "tiktok_script" },
  { platform: "Quora", templateType: "quora_answer" },
  { platform: "Reddit", templateType: "reddit_post" },
]

// Fetch products
const { data: products, error: productsError } = await supabase
  .from("products")
  .select("id, name, slug, brand, category, affiliate_link, affiliate_url, price, commission_rate, notes, target_keyword, secondary_keywords, search_intent, content_angle, status, created_at, updated_at")
  .neq("affiliate_url", "")

if (productsError) {
  console.error("Failed to fetch products:", productsError.message)
  process.exit(1)
}

// Only products with REAL active affiliate links (not placeholders)
const REAL_AFFILIATE_DOMAINS = [
  "systeme.io",
  "try.elevenlabs.io",
]

const activeProducts = (products ?? []).filter((p: { affiliate_url: string; name: string }) => {
  const url = p.affiliate_url.trim()
  return REAL_AFFILIATE_DOMAINS.some((domain) => url.includes(domain))
})

console.log(`Found ${activeProducts.length} products with active affiliate links`)

// Fetch existing drafts
const { data: existingDrafts, error: draftsError } = await supabase
  .from("content_drafts")
  .select("id, product_id, template_type")

if (draftsError) {
  console.error("Failed to fetch drafts:", draftsError.message)
  process.exit(1)
}

const draftSet = new Set(
  (existingDrafts ?? []).map((d: { product_id: string; template_type: string }) =>
    `${d.product_id}::${d.template_type}`
  )
)

let created = 0
let skipped = 0

for (const row of activeProducts) {
  const product = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brand,
    category: row.category,
    affiliateLink: row.affiliate_link ?? row.affiliate_url,
    affiliateUrl: row.affiliate_url,
    price: row.price ? Number(row.price) : null,
    commissionRate: row.commission_rate ? Number(row.commission_rate) : null,
    notes: row.notes,
    targetKeyword: row.target_keyword,
    secondaryKeywords: row.secondary_keywords ?? [],
    searchIntent: row.search_intent,
    contentAngle: row.content_angle,
    status: row.status as "active" | "inactive",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

  for (const { platform, templateType } of MISSING_PLATFORMS) {
    const key = `${product.id}::${templateType}`
    if (draftSet.has(key)) {
      console.log(`  SKIP ${product.name} / ${platform} — already exists`)
      skipped++
      continue
    }

    const generation = await generateDraftForProduct(product, templateType)
    const qualityChecks = buildQualityChecks({
      draft: generation.draft,
      affiliateUrl: product.affiliateUrl,
      targetKeyword: generation.draft.targetKeyword ?? product.targetKeyword,
      templateType,
    })

    const { error: insertError } = await supabase
      .from("content_drafts")
      .insert({
        product_id: product.id,
        content_type: getContentTypeForTemplate(templateType),
        template_type: templateType,
        title: generation.draft.title?.trim() || null,
        body: generation.draft.body.trim(),
        meta_title: generation.draft.metaTitle?.trim() || null,
        meta_description: generation.draft.metaDescription?.trim() || null,
        target_keyword: generation.draft.targetKeyword?.trim() || null,
        quality_checks: qualityChecks,
        status: "draft",
        ai_model: generation.aiModel,
      })

    if (insertError) {
      console.error(`  FAIL ${product.name} / ${platform}: ${insertError.message}`)
    } else {
      console.log(`  CREATED ${product.name} / ${platform} — status: draft, model: ${generation.aiModel}`)
      created++
    }
  }
}

console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`)
