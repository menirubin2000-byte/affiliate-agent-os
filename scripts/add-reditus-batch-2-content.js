// Content pipeline for the 4 new Reditus products (Joiin, UptimeRobot,
// Geo Targetly, Pricefy). Same idempotent pattern as add-reditus-batch.js
// but limited to LinkedIn / Medium / Substack — the 3 platforms operators
// actually publish to without policy blocks.
//
// For each (product, platform):
//   1. ensure source_content exists for the product
//   2. ensure platform_adaptation exists
//   3. ensure final_copy exists with status='ready_for_operator_approval'
//      and validation_status='valid'
//   4. write content/review-queue/<slug>/<platform>.md|metadata.json
//
// Idempotent: if a final_copy already exists for (product, platform) it is
// SKIPPED, not overwritten.
//
// Does NOT create publish_jobs, published_records, campaign_links. Does NOT
// approve anything. Does NOT touch existing products' content.

require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")
const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

const PRODUCTS = [
  {
    name: "Joiin",
    category: "Multi-entity Financial Reporting",
    description:
      "Multi-entity financial consolidation and reporting platform for accountants and finance teams managing multiple QuickBooks and Xero entities.",
    link: "https://joiin.co/?red=rubinq&utm_source=rubinq&utm_medium=revshare&utm_affiliate_network=reditus",
    network: "Reditus",
    audience: "accountants, fractional CFOs, finance teams managing groups of entities",
    angle:
      "consolidate multi-entity QuickBooks and Xero accounts into one report without manual spreadsheets",
    use_cases: [
      "Multi-entity profit and loss consolidation",
      "Cross-currency financial reports",
      "Client reporting packs for accountants",
      "Group cash flow and budget comparison",
      "Drill-down across entities in one view",
    ],
  },
  {
    name: "UptimeRobot",
    category: "Uptime Monitoring",
    description:
      "Website and API uptime monitoring with public status pages and instant alerts via email, SMS, Slack, and webhooks.",
    link: "https://uptimerobot.com/?red=rubinq",
    network: "Reditus",
    audience: "SaaS founders, devops teams, agencies running multiple client sites",
    angle:
      "uptime monitoring you can actually trust with a free tier that already covers a real production site",
    use_cases: [
      "HTTP and HTTPS endpoint monitoring",
      "Public status pages for customers",
      "Multi-channel incident alerts",
      "SSL certificate expiry warnings",
      "Heartbeat and cron monitoring",
    ],
  },
  {
    name: "Geo Targetly",
    category: "Geolocation Personalization",
    description:
      "No-code geolocation personalization platform for redirects, popups, content, and language based on visitor country, region, or city.",
    link: "https://geotargetly.com/?red=rubinq",
    network: "Reditus",
    audience: "growth teams, e-commerce operators, multi-region SaaS",
    angle: "geo-personalize a site or landing page without touching the codebase",
    use_cases: [
      "Country-specific landing page redirects",
      "Localized popups and offers",
      "Region-specific pricing display",
      "Automatic language switching",
      "Geo-conditional content blocks",
    ],
  },
  {
    name: "Pricefy",
    category: "E-commerce Pricing",
    description:
      "E-commerce competitor price tracking and dynamic pricing for Shopify, WooCommerce, Magento and other storefronts.",
    link: "https://www.pricefy.io/?red=rubinq",
    network: "Reditus",
    audience: "e-commerce store owners, pricing managers, Shopify merchants",
    angle:
      "stop checking competitor prices manually — get a daily dashboard and dynamic repricing rules",
    use_cases: [
      "Daily competitor price monitoring",
      "Repricing rules per product",
      "Price history charts",
      "Margin protection alerts",
      "Multi-channel price sync",
    ],
  },
]

const PLATFORMS = ["linkedin", "medium", "substack"]

function buildPost(p, platform) {
  if (platform === "linkedin") {
    return {
      title: `${p.name} - ${p.category} that actually fits ${p.audience.split(",")[0]}`,
      body: `*Affiliate disclosure: this post contains an affiliate link.*

I've been looking at ${p.name} for ${p.category.toLowerCase()}.

The thing that stood out: ${p.angle}.

Where it fits:
${p.use_cases
  .slice(0, 4)
  .map((u) => `- ${u}`)
  .join("\n")}

Best for: ${p.audience}.

Honest tradeoffs:
- Monthly subscription for real use
- Specialized tool — fit depends on your existing stack
- Some features gated on higher tiers

Worth evaluating against what you already run.

Try ${p.name}: ${p.link}`,
    }
  }
  if (platform === "medium") {
    return {
      title: `${p.name} Review: ${p.category} for ${p.audience.split(",")[0]} in 2026`,
      body: `*Affiliate disclosure: This article includes an affiliate link.*

## Why ${p.name}

${p.description}

The angle that makes it interesting: ${p.angle}.

## Use Cases

${p.use_cases.map((u) => `- ${u}`).join("\n")}

## Who It Fits

${p.audience}.

## Honest Tradeoffs

- Monthly subscription required for serious use
- Specialized tool — fit depends on the existing stack
- Some advanced features live on higher tiers

## Bottom Line

If you are already doing the work ${p.name} is built for, evaluate it against your current stack. The starter tier is usually enough to test before paying.

[Try ${p.name} here](${p.link})`,
    }
  }
  if (platform === "substack") {
    return {
      title: `${p.name}: A Practical ${p.category} Look`,
      body: `*Affiliate disclosure: This post includes an affiliate link.*

## Why ${p.name}

${p.description}

Why I looked at it: ${p.angle}.

## Use Cases

${p.use_cases.map((u) => `- ${u}`).join("\n")}

## Who It Fits

${p.audience}.

## Honest Tradeoffs

- Monthly subscription for serious use
- Specialized tool — fit depends on existing stack
- Advanced features on higher tiers

## Bottom Line

If you already do the work ${p.name} is built for, worth evaluating against your current setup. Start on the lowest tier before committing.

[Try ${p.name} here](${p.link})`,
    }
  }
  throw new Error(`Unknown platform ${platform}`)
}

function shortHash(s) {
  return crypto.createHash("sha256").update(s).digest("hex").substring(0, 16)
}

async function getProductAndProgram(name) {
  const p = await c.query("SELECT id FROM products WHERE name = $1 LIMIT 1", [name])
  if (!p.rows.length) throw new Error(`Product not found: ${name}`)
  const productId = p.rows[0].id
  const ap = await c.query(
    `SELECT id, affiliate_link FROM affiliate_programs
     WHERE product_id = $1 AND status = 'link_ready' AND coalesce(affiliate_link,'') <> ''
     ORDER BY updated_at DESC LIMIT 1`,
    [productId],
  )
  if (!ap.rows.length) throw new Error(`No link_ready affiliate_program for ${name}`)
  return { productId, affiliateProgramId: ap.rows[0].id, affiliateLink: ap.rows[0].affiliate_link }
}

async function ensureSourceContent(productId, p) {
  const r = await c.query("SELECT id FROM source_contents WHERE product_id = $1 LIMIT 1", [productId])
  if (r.rows.length) return { id: r.rows[0].id, created: false }
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")
  const ins = await c.query(
    `INSERT INTO source_contents
       (product_id, campaign_name, angle, title, body, target_keyword, content_hash, status)
     VALUES ($1, $2, 'review', $3, $4, $5, $6, 'active')
     RETURNING id`,
    [
      productId,
      `${slug}_review`,
      `${p.name} Review`,
      p.description,
      `${p.name.toLowerCase()} review`,
      `${slug}_src_1`,
    ],
  )
  return { id: ins.rows[0].id, created: true }
}

async function ensurePlatformAdaptation(productId, sourceContentId, platform, post) {
  const existing = await c.query(
    "SELECT id FROM platform_adaptations WHERE product_id = $1 AND platform = $2",
    [productId, platform],
  )
  if (existing.rows.length) return { id: existing.rows[0].id, created: false }
  const r = await c.query(
    `INSERT INTO platform_adaptations
       (source_content_id, product_id, platform, title, body, content_hash)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [sourceContentId, productId, platform, post.title, post.body, shortHash(post.body)],
  )
  return { id: r.rows[0].id, created: true }
}

async function ensureFinalCopy({
  productId,
  affiliateProgramId,
  affiliateLink,
  sourceContentId,
  platformAdaptationId,
  platform,
  post,
}) {
  const existing = await c.query(
    "SELECT id, status, validation_status FROM final_copies WHERE platform_adaptation_id = $1 LIMIT 1",
    [platformAdaptationId],
  )
  if (existing.rows.length) {
    return { id: existing.rows[0].id, status: existing.rows[0].status, created: false }
  }
  const hash = shortHash(post.body)
  const ins = await c.query(
    `INSERT INTO final_copies
       (product_id, affiliate_program_id, affiliate_link, source_content_id, platform_adaptation_id,
        platform, title, body, content_hash, version, status, validation_status, blocking_reasons)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,'ready_for_operator_approval','valid','{}')
     RETURNING id`,
    [
      productId,
      affiliateProgramId,
      affiliateLink,
      sourceContentId,
      platformAdaptationId,
      platform,
      post.title,
      post.body,
      hash,
    ],
  )
  return { id: ins.rows[0].id, status: "ready_for_operator_approval", created: true }
}

function writeReviewFiles(p, platform, post, ids) {
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const dir = path.join(__dirname, "..", "content", "review-queue", slug)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${platform}.md`), post.body, "utf8")
  fs.writeFileSync(
    path.join(dir, `${platform}.metadata.json`),
    JSON.stringify(
      {
        product: p.name,
        platform,
        status: "ready_for_operator_approval",
        affiliate_link: p.link,
        source_content_id: ids.sourceContentId,
        platform_adaptation_id: ids.platformAdaptationId,
        final_copy_id: ids.finalCopyId,
        validation_status: "valid",
        blocking_reasons: [],
        reviewer_status: "ready_for_review",
        reviewer_notes: "ready for MENI approval — affiliate link enabled",
        content_hash: shortHash(post.body),
      },
      null,
      2,
    ),
    "utf8",
  )
}

async function main() {
  await c.connect()
  console.log(`Generating content for ${PRODUCTS.length} products × ${PLATFORMS.length} platforms`)

  let createdSourceContents = 0
  let createdAdaptations = 0
  let createdFinalCopies = 0
  let skippedFinalCopies = 0

  for (const p of PRODUCTS) {
    console.log(`\n→ ${p.name}`)
    const { productId, affiliateProgramId, affiliateLink } = await getProductAndProgram(p.name)
    const source = await ensureSourceContent(productId, p)
    if (source.created) createdSourceContents++
    console.log(`  source_content: ${source.id} ${source.created ? "(new)" : "(existing)"}`)
    for (const platform of PLATFORMS) {
      const post = buildPost(p, platform)
      const adaptation = await ensurePlatformAdaptation(productId, source.id, platform, post)
      if (adaptation.created) createdAdaptations++
      const finalCopy = await ensureFinalCopy({
        productId,
        affiliateProgramId,
        affiliateLink,
        sourceContentId: source.id,
        platformAdaptationId: adaptation.id,
        platform,
        post,
      })
      if (finalCopy.created) {
        createdFinalCopies++
        console.log(`  · ${platform.padEnd(8)} final_copy=${finalCopy.id} (new)`)
        writeReviewFiles(p, platform, post, {
          sourceContentId: source.id,
          platformAdaptationId: adaptation.id,
          finalCopyId: finalCopy.id,
        })
      } else {
        skippedFinalCopies++
        console.log(`  · ${platform.padEnd(8)} final_copy=${finalCopy.id} (already exists, status=${finalCopy.status})`)
      }
    }
  }

  console.log("\n=== summary ===")
  console.log(`source_contents created:    ${createdSourceContents}`)
  console.log(`platform_adaptations created: ${createdAdaptations}`)
  console.log(`final_copies created:       ${createdFinalCopies}`)
  console.log(`final_copies skipped (dup): ${skippedFinalCopies}`)

  const rep = await c.query(
    `SELECT p.name, fc.platform, fc.status
     FROM final_copies fc
     JOIN products p ON p.id = fc.product_id
     WHERE p.name IN ('Joiin','UptimeRobot','Geo Targetly','Pricefy')
     ORDER BY p.name, fc.platform`,
  )
  console.log("\n=== current final_copies for the 4 new products ===")
  for (const r of rep.rows) console.log(`  ${r.name.padEnd(14)} ${r.platform.padEnd(10)} ${r.status}`)

  await c.end()
}

main().catch(async (e) => {
  console.error("FATAL:", e)
  try { await c.end() } catch {}
  process.exit(1)
})
