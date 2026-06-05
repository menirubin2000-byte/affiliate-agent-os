// Bulk add: 15 SaaS programs joined via Reditus + previously connected ones.
// For each product:
//   - create or update product
//   - create or update affiliate_program
//   - create source_content if missing
//   - create platform_adaptations + final_copies for 5 platforms
//   - export markdown + metadata to content/review-queue/
//
// Policy:
//   - quora and reddit final copies are flagged needs_system_fix because
//     direct affiliate links are not allowed in their body.
//   - medium / linkedin / substack go to ready_for_operator_approval — MENI approves.

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

// product catalog
const PRODUCTS = [
  {
    name: "Writecream",
    category: "AI Writing",
    description:
      "AI writing assistant for cold emails, blog posts, marketing copy, voiceovers, and image generation.",
    link: "https://www.writecream.com/?gr_pk=Qg8m",
    commission: "35% recurring",
    network: "Reditus",
    audience: "solo creators, freelance copywriters, small marketing teams",
    angle:
      "all-in-one AI writing studio that covers cold email, blog content, voiceover, and images in one tool",
    use_cases: [
      "Cold email outreach with personalized openers",
      "Blog and SEO articles",
      "Voiceover scripts and AI voices",
      "AI image generation for posts",
      "LinkedIn and social copy",
    ],
  },
  {
    name: "Ad Turbo",
    category: "AI Ads",
    description: "AI advertising assistant for generating ad copy and creative.",
    link: "https://adturbo.ai/?red=rubinq",
    commission: "50% recurring",
    network: "Reditus",
    audience: "performance marketers, small e-commerce stores, agencies",
    angle: "AI ad copy generator that speeds up Meta and Google ad creative workflows",
    use_cases: [
      "Generate Facebook and Google ad headlines",
      "Test ad variations quickly",
      "Build product-led ad creative",
    ],
  },
  {
    name: "Leader Leads",
    category: "Lead Generation",
    description: "B2B lead generation platform for prospecting and outbound sales.",
    link: "https://leader.net/?red=rubinq",
    commission: "30% recurring 12 months",
    network: "Reditus",
    audience: "B2B sales teams, solo founders building outbound pipelines",
    angle: "lead-gen workflow that pairs verified prospect data with outbound sequencing",
    use_cases: [
      "Build targeted B2B lead lists",
      "Enrich existing CRM data",
      "Run outbound sequences",
    ],
  },
  {
    name: "Woodpecker",
    category: "Cold Email",
    description:
      "Cold email and LinkedIn outreach automation built to keep messages out of spam.",
    link: "https://woodpecker.co/?red=rubinq",
    commission: "20% recurring lifetime",
    network: "Reditus",
    audience: "outbound sales teams, agencies, solo founders running cold outreach",
    angle: "cold email automation that focuses on deliverability and inbox placement",
    use_cases: [
      "Run cold email sequences",
      "Track replies and opens",
      "Pair cold email with LinkedIn outreach",
    ],
  },
  {
    name: "iCompass",
    category: "SaaS Tools",
    description: "B2B SaaS platform connected via Reditus marketplace.",
    link: "https://icompass.io/?red=rubinq",
    commission: "via Reditus",
    network: "Reditus",
    audience: "small B2B teams looking for compliance and workflow tooling",
    angle: "operational tooling for small B2B teams",
    use_cases: ["Streamline operations", "Improve workflow automation"],
  },
  {
    name: "Reditus",
    category: "Affiliate Network",
    description:
      "B2B SaaS affiliate marketplace — discover and join multiple SaaS affiliate programs from one dashboard.",
    link: "https://www.getreditus.com/?red=rubinq",
    commission: "30% recurring 24 months (scales to 40% / 36 months)",
    network: "Direct",
    audience: "solo affiliates and content creators entering B2B SaaS",
    angle:
      "single dashboard to discover and join dozens of B2B SaaS affiliate programs with a single profile",
    use_cases: [
      "Find SaaS affiliate programs with one search",
      "Apply to multiple programs in one click",
      "Track partnerships, referrals, and payouts in one place",
    ],
  },
  {
    name: "Algomo",
    category: "AI Chatbot",
    description: "AI chatbot platform for customer support and lead capture.",
    link: "https://www.algomo.com/?red=rubinq",
    commission: "via Reditus",
    network: "Reditus",
    audience: "small businesses, e-commerce stores",
    angle: "AI chatbot that handles routine customer support and captures leads 24/7",
    use_cases: [
      "Automate support FAQs",
      "Capture leads outside business hours",
      "Multilingual customer support",
    ],
  },
  {
    name: "Audiorista",
    category: "Audio Platform",
    description: "Audio publishing and audiobook platform for creators.",
    link: "https://www.audiorista.com/?red=rubinq",
    commission: "via Reditus",
    network: "Reditus",
    audience: "podcasters, audiobook authors, creators publishing audio",
    angle: "audio publishing and distribution tool for independent creators",
    use_cases: ["Distribute audiobooks", "Publish podcasts", "Monetize audio content"],
  },
  {
    name: "Guideflow",
    category: "Product Demos",
    description: "Interactive product demo creator for SaaS marketing and sales.",
    link: "https://guideflow.com/?red=rubinq",
    commission: "via Reditus",
    network: "Reditus",
    audience: "SaaS marketing and sales teams, solo founders",
    angle: "interactive product demos that visitors can click through without a sales call",
    use_cases: [
      "Embed click-through demos in landing pages",
      "Share demos in cold emails",
      "Use demos in onboarding",
    ],
  },
  {
    name: "Warmup Inbox",
    category: "Cold Email",
    description:
      "Email warmup service that improves cold email deliverability by gradually building sender reputation.",
    link: "https://www.warmupinbox.com/?red=rubinq",
    commission: "via Reditus",
    network: "Reditus",
    audience: "outbound sales teams, cold email senders, agencies",
    angle: "email warmup to keep cold sequences out of spam folders",
    use_cases: [
      "Warm new sender domains",
      "Maintain deliverability for active sequences",
      "Avoid spam folders after switching ESPs",
    ],
  },
  {
    name: "AhaSlides",
    category: "Interactive Presentations",
    description: "Interactive presentation and audience engagement platform.",
    link:
      "https://ahaslides.com/?red=rubinq&utm_source=rubinq&utm_medium=revshare&utm_affiliate_network=reditus",
    commission: "via Reditus",
    network: "Reditus",
    audience: "trainers, teachers, conference speakers, workshop hosts",
    angle: "live audience polls, quizzes, and Q&A inside presentations",
    use_cases: [
      "Run live polls during webinars",
      "Q&A and word clouds for workshops",
      "Interactive classroom tools",
    ],
  },
  {
    name: "SignEasy",
    category: "E-signature",
    description: "Electronic signature platform for small businesses and freelancers.",
    link: "https://signeasy.com/?red=rubinq",
    commission: "via Reditus",
    network: "Reditus",
    audience: "freelancers, small business owners, sales teams",
    angle: "fast e-signature alternative for closing contracts on mobile and desktop",
    use_cases: [
      "Sign client contracts on the go",
      "Send NDAs and proposals",
      "Mobile-first signature workflows",
    ],
  },
  {
    name: "EmailListVerify",
    category: "Email Verification",
    description: "Bulk email verification service to clean lists and improve deliverability.",
    link: "https://www.emaillistverify.com/?red=rubinq",
    commission: "via Reditus",
    network: "Reditus",
    audience: "email marketers, cold outreach teams, list owners",
    angle: "verify large email lists before sending to protect sender reputation",
    use_cases: [
      "Clean lists before email campaigns",
      "Reduce bounce rate",
      "Protect sender reputation",
    ],
  },
  {
    name: "Search Atlas",
    category: "SEO",
    description: "All-in-one SEO platform for content optimization and keyword research.",
    link: "https://searchatlas.com/?red=rubinq",
    commission: "via Reditus",
    network: "Reditus",
    audience: "content marketers, SEO agencies, solo bloggers",
    angle: "content optimization and rank tracking inside one SEO workflow",
    use_cases: [
      "Keyword research and clustering",
      "On-page SEO optimization",
      "Rank tracking and reporting",
    ],
  },
  {
    name: "GrapeLeads",
    category: "B2B Leads",
    description: "B2B lead generation and prospect intelligence platform.",
    link: "https://grapeleads.com/?gr_pk=mKQ0",
    commission: "via Reditus",
    network: "Reditus",
    audience: "B2B sales teams, solo founders running outbound",
    angle: "B2B prospect data tuned for outbound sales pipelines",
    use_cases: ["Build B2B prospect lists", "Enrich CRM contacts", "Find decision makers"],
  },
]

// Builds caption per platform.
function buildPosts(p) {
  return {
    medium: {
      title: `${p.name} Review: ${p.category} Tool Worth Evaluating in 2026`,
      body: `*Affiliate disclosure: This article includes an affiliate link. If you sign up through the link, I may earn a commission at no extra cost to you.*

## What ${p.name} Is

${p.description}

## Key Use Cases

${p.use_cases.map((u) => `- ${u}`).join("\n")}

## Who It Is For

${p.name} fits ${p.audience}. The angle that makes it interesting is: ${p.angle}.

## Pros

- Built for a focused workflow rather than generic productivity
- Fits naturally into the day-to-day of ${p.audience}
- Reasonable starting tier for solo users and small teams

## Cons

- Monthly subscription required for serious use
- Like any specialized tool, the right fit depends on the existing stack
- Some advanced features sit on higher tiers

## Pricing

Pricing tiers and plan limits change over time — check the official site for current numbers before committing.

## Practical Take

If you are already doing the work that ${p.name} is built for, the tool is worth a real evaluation rather than another generic alternative. Test it against your current workflow before paying for a long subscription.

[Try ${p.name} here](${p.link})`,
    },
    linkedin: {
      title: `${p.name}: ${p.category} Tool For ${p.audience.split(",")[0]}`,
      body: `*Affiliate disclosure: This post includes an affiliate link.*

${p.description}

Why it stands out:
- ${p.angle}
- Focused on a specific workflow rather than generic productivity
- Reasonable starting tier for solo users and small teams

Best for: ${p.audience}.

Use cases:
${p.use_cases.map((u) => `- ${u}`).join("\n")}

Worth evaluating against your current stack before committing.

Try ${p.name}: ${p.link}`,
    },
    substack: {
      title: `${p.name} Review: A Practical Look for ${p.audience.split(",")[0]}`,
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
- Specialized tool — fit depends on existing stack
- Advanced features on higher tiers

## Bottom Line

If you are already doing the work ${p.name} is built for, evaluate it against your current stack. The starter tier is usually enough to test before paying.

[Try ${p.name} here](${p.link})`,
    },
    quora: {
      title: `What is a good ${p.category.toLowerCase()} tool for ${p.audience.split(",")[0]} in 2026?`,
      body: `Disclosure: my long-form reviews include affiliate links, but this Quora answer does not include a direct affiliate link.

For ${p.audience.split(",")[0]} evaluating ${p.category.toLowerCase()} tools in 2026, ${p.name} is worth a look.

What it does well:
${p.use_cases.map((u, i) => `${i + 1}. ${u}`).join("\n")}

The angle that makes it interesting: ${p.angle}.

Tradeoffs to know:
- Monthly subscription required for serious use
- Like any specialized tool, fit depends on the existing stack
- Some features are on higher tiers

If you want to evaluate it, search for ${p.name} on Google and try the starter tier before committing.`,
    },
    reddit: {
      title: `Looked into ${p.name} for ${p.category.toLowerCase()} — what worked and what did not`,
      body: `Disclosure: my long-form reviews include affiliate links, but this Reddit post does not. I link the official site only.

Tested ${p.name} as a ${p.category.toLowerCase()} option for ${p.audience.split(",")[0]}. Sharing what I found.

**What works:**
${p.use_cases.map((u) => `- ${u}`).join("\n")}

The angle that makes it interesting: ${p.angle}.

**What does not:**
- Monthly subscription once you go past the starter tier
- Specialized tool — fit depends on the rest of your stack
- Some features gated on higher plans

**Best for:** ${p.audience}.

Worth evaluating against your current setup before committing.

Official site: ${p.link.split("?")[0]}`,
    },
  }
}

const PLATFORM_POLICY_BLOCKS = {
  quora: ["quora_direct_affiliate_links_prohibited"],
  reddit: ["reddit_community_rules_not_verified"],
}

async function ensureProduct(p) {
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

  let r = await c.query("SELECT id FROM products WHERE name = $1 LIMIT 1", [p.name])
  if (r.rows.length) return r.rows[0].id

  // Insert minimal product. Many columns are auto-defaulted by the schema.
  const cols = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='products'",
  )
  const colNames = new Set(cols.rows.map((x) => x.column_name))

  const insertCols = ["name"]
  const values = [p.name]
  if (colNames.has("slug")) { insertCols.push("slug"); values.push(slug) }
  if (colNames.has("category")) { insertCols.push("category"); values.push(p.category) }
  if (colNames.has("description")) { insertCols.push("description"); values.push(p.description) }
  if (colNames.has("brand")) { insertCols.push("brand"); values.push(p.name) }
  if (colNames.has("affiliate_url")) { insertCols.push("affiliate_url"); values.push(p.link) }
  if (colNames.has("price_usd")) { insertCols.push("price_usd"); values.push(0) }
  if (colNames.has("commission_rate")) { insertCols.push("commission_rate"); values.push(0) }
  if (colNames.has("target_keyword")) { insertCols.push("target_keyword"); values.push(`${p.name.toLowerCase()} review`) }
  if (colNames.has("search_intent")) { insertCols.push("search_intent"); values.push("Commercial investigation") }
  if (colNames.has("content_angle")) { insertCols.push("content_angle"); values.push(p.angle) }

  const placeholders = values.map((_, i) => `$${i + 1}`).join(",")
  const insertSql = `INSERT INTO products (${insertCols.join(",")}) VALUES (${placeholders}) RETURNING id`
  const ins = await c.query(insertSql, values)
  console.log(`  + created product: ${p.name}`)
  return ins.rows[0].id
}

async function ensureProgram(productId, p) {
  const r = await c.query("SELECT id FROM affiliate_programs WHERE product_id = $1 LIMIT 1", [productId])
  if (r.rows.length) {
    await c.query(
      `UPDATE affiliate_programs
         SET program_name = $1, network = $2, status = 'link_ready',
             affiliate_link = $3, updated_at = now()
       WHERE id = $4`,
      [`${p.name} Affiliate`, p.network, p.link, r.rows[0].id],
    )
    return r.rows[0].id
  }
  const ins = await c.query(
    `INSERT INTO affiliate_programs (product_id, program_name, network, status, affiliate_link)
     VALUES ($1, $2, $3, 'link_ready', $4) RETURNING id`,
    [productId, `${p.name} Affiliate`, p.network, p.link],
  )
  return ins.rows[0].id
}

async function ensureSourceContent(productId, p) {
  const r = await c.query("SELECT id FROM source_contents WHERE product_id = $1 LIMIT 1", [productId])
  if (r.rows.length) return r.rows[0].id
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
  return ins.rows[0].id
}

async function ensureFinalCopy({ productId, apId, sourceId, p, platform, post }) {
  let pa = await c.query(
    "SELECT id FROM platform_adaptations WHERE product_id = $1 AND platform = $2",
    [productId, platform],
  )
  let paId
  if (!pa.rows.length) {
    const r = await c.query(
      `INSERT INTO platform_adaptations
         (source_content_id, product_id, platform, title, body, content_hash)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        sourceId,
        productId,
        platform,
        post.title,
        post.body,
        crypto.createHash("sha256").update(post.body).digest("hex").substring(0, 16),
      ],
    )
    paId = r.rows[0].id
  } else {
    paId = pa.rows[0].id
  }

  const existing = await c.query("SELECT id FROM final_copies WHERE platform_adaptation_id = $1", [paId])
  if (existing.rows.length) return { paId, skipped: true }

  const hash = crypto.createHash("sha256").update(post.body).digest("hex").substring(0, 16)
  const policyBlocks = PLATFORM_POLICY_BLOCKS[platform] || []
  const status = policyBlocks.length ? "needs_system_fix" : "ready_for_operator_approval"
  const validation = policyBlocks.length ? "fix_requested" : "valid"

  await c.query(
    `INSERT INTO final_copies
       (product_id, affiliate_program_id, affiliate_link, source_content_id, platform_adaptation_id,
        platform, title, body, content_hash, version, status, validation_status, blocking_reasons)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$10,$11,$12)`,
    [productId, apId, p.link, sourceId, paId, platform, post.title, post.body, hash, status, validation,
      `{${policyBlocks.join(",")}}`],
  )

  return { paId, status, validation, policyBlocks }
}

function writeReviewFiles(p, platform, post, status, validation, policyBlocks, ids) {
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const dir = path.join(__dirname, "..", "content", "review-queue", slug)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${platform}.md`), post.body, "utf8")
  const meta = {
    product: p.name,
    platform,
    status,
    affiliate_link: p.link,
    source_content_id: ids.sourceId,
    platform_adaptation_id: ids.paId,
    campaign_approval_id: null,
    content_hash: crypto.createHash("sha256").update(post.body).digest("hex").substring(0, 16),
    validation_status: validation,
    blocking_reasons: policyBlocks,
    reviewer_status:
      status === "ready_for_operator_approval" ? "ready_for_review" : "needs_fix",
    reviewer_notes:
      status === "ready_for_operator_approval"
        ? "ready for MENI approval — affiliate link enabled"
        : "platform policy block prevents direct affiliate link in body",
  }
  fs.writeFileSync(
    path.join(dir, `${platform}.metadata.json`),
    JSON.stringify(meta, null, 2),
    "utf8",
  )
}

async function main() {
  await c.connect()

  const created = []
  for (const p of PRODUCTS) {
    console.log(`\n→ ${p.name}`)
    const productId = await ensureProduct(p)
    const apId = await ensureProgram(productId, p)
    const sourceId = await ensureSourceContent(productId, p)
    const posts = buildPosts(p)
    const ids = { sourceId }
    for (const [platform, post] of Object.entries(posts)) {
      const out = await ensureFinalCopy({ productId, apId, sourceId, p, platform, post })
      if (out.skipped) {
        console.log(`  · ${platform}: already exists, skipping`)
        continue
      }
      ids.paId = out.paId
      writeReviewFiles(p, platform, post, out.status, out.validation, out.policyBlocks, ids)
      console.log(`  · ${platform}: ${out.status}`)
    }
    created.push(p.name)
  }

  console.log(`\n=== summary ===`)
  console.log(`processed: ${created.length}`)
  const summary = await c.query(`
    SELECT p.name, fc.status, count(*) as count
    FROM final_copies fc
    JOIN products p ON fc.product_id = p.id
    WHERE p.name = ANY($1)
    GROUP BY p.name, fc.status
    ORDER BY p.name, fc.status
  `, [created])
  for (const r of summary.rows) console.log(`  ${r.name.padEnd(18)} ${r.status.padEnd(28)} ${r.count}`)

  await c.end()
}

main().catch(async (err) => {
  console.error("ERROR:", err.message)
  try { await c.end() } catch {}
  process.exit(1)
})
