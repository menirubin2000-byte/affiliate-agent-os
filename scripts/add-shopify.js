require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")
const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432, database: "postgres", user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

const LINK = "https://shopify.pxf.io/QY49QA"

const PLATFORM_POLICY_BLOCKS = {
  quora: ["quora_direct_affiliate_links_prohibited"],
  reddit: ["bridge_url_required"],
}

const POSTS = {
  medium: {
    title: "Shopify Review: Is It Still the Right E-commerce Platform in 2026?",
    body: `*Affiliate disclosure: This article includes an affiliate link. If you sign up through the link, I may earn a commission at no extra cost to you.*

## What Shopify Is

Shopify is a hosted e-commerce platform that lets anyone open an online store without managing servers, payment integrations, or hosting infrastructure. It powers millions of stores worldwide, from solo entrepreneurs to large brands.

## Key Features

- Drag-and-drop store builder with modern themes
- Built-in payment processing (Shopify Payments)
- Inventory and order management
- Multi-channel selling (Instagram, TikTok, Amazon, Google)
- App marketplace with thousands of integrations
- Built-in SEO, analytics, and email marketing
- 24/7 customer support

## Who It Is For

Solo entrepreneurs, drop-shippers, small businesses, and growing brands who want a reliable, scalable platform without dealing with technical setup. Good for both physical and digital product sellers.

## Pros

- Extremely simple to set up — store live in hours
- Reliable infrastructure handles traffic spikes
- Massive app ecosystem for almost any feature
- Sales tools that work across multiple channels
- Strong brand recognition and trust

## Cons

- Monthly subscription cost on top of transaction fees
- Some advanced customization requires Liquid template knowledge
- Transaction fees apply if you don't use Shopify Payments

## Pricing

Basic plan starts around $39/month. Higher tiers add features for growing teams. There is a free trial to test the platform.

## Practical Take

Shopify remains one of the safest choices for starting an online store in 2026. The combination of reliability, ecosystem, and multi-channel selling makes it the default choice for most solo sellers who want to focus on products and marketing rather than infrastructure.

[Try Shopify here](${LINK})`,
  },
  linkedin: {
    title: "Shopify Review: Still the Default E-commerce Platform in 2026",
    body: `*Affiliate disclosure: This post includes an affiliate link.*

Thinking about starting an online store?

Shopify still dominates for solo sellers and small brands because:
- Live store in hours, no servers to manage
- Multi-channel selling: Instagram, TikTok, Amazon, Google
- Massive app ecosystem
- Reliable infrastructure handles traffic spikes
- Free trial to test before paying

Best for: Solo entrepreneurs, drop-shippers, small brands, digital product sellers.

Not ideal for: Teams that need deep custom backend logic or want zero monthly cost.

Worth testing on the free trial.

Try Shopify here: ${LINK}`,
  },
  substack: {
    title: "Shopify Review: A Practical Look at the Default E-commerce Platform",
    body: `*Affiliate disclosure: This article includes an affiliate link. If you sign up through the link, I may earn a commission at no extra cost to you.*

## Why Shopify

If you want an online store live in hours, not weeks, Shopify still wins. The platform handles hosting, payments, security, and scaling so you can focus on the actual product and marketing.

## What Stands Out in 2026

- **Multi-channel selling** — sell on Instagram, TikTok, Amazon, Google from one dashboard
- **App marketplace** — thousands of apps for upsells, reviews, shipping, subscriptions
- **Built-in payments** — Shopify Payments removes the need for a third-party processor
- **Theme ecosystem** — clean modern designs out of the box

## Honest Tradeoffs

- Monthly cost starts around $39 — not the cheapest path
- Transaction fees if you skip Shopify Payments
- Customization beyond basics needs the Liquid template language

## Bottom Line

Shopify is the safe default for solo entrepreneurs and small brands who want a reliable store without managing infrastructure. The free trial lets you build a working store before spending anything.

[Try Shopify here](${LINK})`,
  },
  quora: {
    title: "What is the best platform to start an online store in 2026?",
    body: `*Disclosure: This answer includes an affiliate link.*

For most solo sellers and small brands, Shopify is still the safest default in 2026.

What makes it work:
1. You can have a working store live in hours, not weeks
2. Hosting, payments, security, and scaling are all handled for you
3. Multi-channel selling — Instagram, TikTok, Amazon, Google — from one dashboard
4. Massive app marketplace for almost any feature you might need
5. Free trial so you can test before paying anything

Tradeoffs to know:
- Monthly subscription starts around $39
- Transaction fees if you don't use Shopify Payments
- Deep customization requires the Liquid template language

If you want a platform that lets you focus on products and marketing instead of infrastructure, Shopify is hard to beat.

[Check Shopify here](${LINK})`,
  },
  reddit: {
    title: "Spent some time evaluating Shopify for a new store — what I found",
    body: `*Disclosure: affiliate link included below.*

Been looking at the current state of e-commerce platforms for a new project. Spent real time with Shopify. Sharing what I found.

**Good:**
- Genuinely fast to set up — working store in a few hours
- Hosting, security, and scaling are not your problem
- Multi-channel selling actually works (Instagram, TikTok, Amazon from one dashboard)
- App marketplace covers almost every edge case
- Free trial lets you test without paying

**Not great:**
- Monthly cost starts around $39, not the cheapest option
- Transaction fees apply if you skip Shopify Payments
- Customization beyond the theme editor takes time (Liquid templates)

**Who it fits:** Solo entrepreneurs, drop-shippers, small brands, digital product sellers who want to ship and focus on marketing.

**Who it does not fit:** Teams that need very deep custom backend logic or want zero monthly cost.

Worth testing on the free trial before paying.

[Shopify](${LINK})`,
  },
}

POSTS.quora.body = `Disclosure: I write about digital tools. Some of my longer external articles may include affiliate links, but this Quora answer does not include a direct affiliate link.

For most solo sellers and small brands, Shopify is still a common default to evaluate in 2026.

What makes it work:
1. You can have a working store live quickly without managing hosting infrastructure
2. Payments, security, and scaling are handled inside the platform
3. Multi-channel selling can connect storefront operations with channels like Instagram, TikTok, Amazon, and Google
4. The app marketplace covers many common store needs
5. A trial period lets sellers test the workflow before committing

Tradeoffs to know:
- Monthly subscription cost and possible transaction fees matter
- Advanced customization may require Shopify's Liquid template language
- App costs can add up depending on the store setup

Before choosing any platform, compare pricing, payment fees, app costs, and the integrations you actually need.`

POSTS.reddit.title = "Notes from evaluating Shopify for a new store"
POSTS.reddit.body = `Disclosure: I write about digital tools. This Reddit draft does not include a direct affiliate link.

Been looking at the current state of e-commerce platforms for a new project. Sharing practical notes I would check before choosing Shopify or any similar platform.

Good:
- Fast setup compared with building a custom store stack
- Hosting, security, and scaling are not your problem
- Multi-channel selling can be useful if you sell across multiple channels
- App marketplace covers many common store use cases

Tradeoffs:
- Monthly plan cost is not the cheapest path
- Transaction fees can apply depending on payment setup
- Customization beyond the theme editor may require Liquid templates
- App costs can add up

Who it fits: solo entrepreneurs, small brands, and digital product sellers who want to focus on products and marketing.

Who it may not fit: teams that need deep custom backend logic or want a zero-monthly-cost setup.

Before posting this anywhere on Reddit, verify the target subreddit rules for self-promotion, external links, and commercial content.`

async function main() {
  await c.connect()

  // 1. Find Shopify product
  const p = await c.query(`SELECT id FROM products WHERE name = 'Shopify' LIMIT 1`)
  if (!p.rows.length) {
    console.error("Shopify product not found in DB")
    process.exit(1)
  }
  const productId = p.rows[0].id
  console.log("Shopify product_id:", productId)

  // 2. Check existing affiliate program
  const ap = await c.query(`SELECT id FROM affiliate_programs WHERE product_id = $1 LIMIT 1`, [productId])
  let apId
  if (ap.rows.length) {
    await c.query(
      `UPDATE affiliate_programs
         SET affiliate_link = $1, network = 'Impact', status = 'link_ready', updated_at = now()
       WHERE id = $2`,
      [LINK, ap.rows[0].id],
    )
    apId = ap.rows[0].id
    console.log("Updated existing affiliate_program")
  } else {
    const r = await c.query(
      `INSERT INTO affiliate_programs (product_id, program_name, network, status, affiliate_link)
       VALUES ($1, 'Shopify Affiliate', 'Impact', 'link_ready', $2)
       RETURNING id`,
      [productId, LINK],
    )
    apId = r.rows[0].id
    console.log("Created new affiliate_program")
  }

  // 3. Source content
  let sc = await c.query(`SELECT id FROM source_contents WHERE product_id = $1 LIMIT 1`, [productId])
  let sourceId
  if (!sc.rows.length) {
    const r = await c.query(
      `INSERT INTO source_contents
         (product_id, campaign_name, angle, title, body, target_keyword, content_hash, status)
       VALUES ($1, 'shopify_review', 'review', 'Shopify Review', 'E-commerce platform review',
               'shopify review', 'shopify_src_1', 'active')
       RETURNING id`,
      [productId],
    )
    sourceId = r.rows[0].id
    console.log("Created source_content")
  } else {
    sourceId = sc.rows[0].id
  }

  // 4. Platform adaptations + final copies
  const reviewDir = path.join(__dirname, "..", "content", "review-queue", "shopify")
  fs.mkdirSync(reviewDir, { recursive: true })

  for (const [platform, post] of Object.entries(POSTS)) {
    let pa = await c.query(
      `SELECT id FROM platform_adaptations WHERE product_id = $1 AND platform = $2`,
      [productId, platform],
    )
    let paId
    if (!pa.rows.length) {
      const r = await c.query(
        `INSERT INTO platform_adaptations
           (source_content_id, product_id, platform, title, body, content_hash)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [
          sourceId, productId, platform, post.title, post.body,
          crypto.createHash("sha256").update(post.body).digest("hex").substring(0, 16),
        ],
      )
      paId = r.rows[0].id
    } else {
      paId = pa.rows[0].id
    }

    const existing = await c.query(`SELECT id FROM final_copies WHERE platform_adaptation_id = $1`, [paId])
    if (existing.rows.length) {
      console.log(`SKIP final_copy: ${platform}`)
      fs.writeFileSync(path.join(reviewDir, `${platform}.md`), post.body, "utf8")
      continue
    }

    const hash = crypto.createHash("sha256").update(post.body).digest("hex").substring(0, 16)
    const blockingReasons = PLATFORM_POLICY_BLOCKS[platform] || []
    const isBlocked = blockingReasons.length > 0
    const finalCopyStatus = isBlocked ? "needs_system_fix" : "ready_for_operator_approval"
    const validationStatus = isBlocked ? "blocked" : "valid"
    const finalCopyAffiliateLink = isBlocked ? null : LINK

    await c.query(
      `INSERT INTO final_copies
         (product_id, affiliate_program_id, affiliate_link, source_content_id, platform_adaptation_id,
          platform, title, body, content_hash, version, status, validation_status, blocking_reasons)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$10,$11,$12)`,
      [
        productId,
        apId,
        finalCopyAffiliateLink,
        sourceId,
        paId,
        platform,
        post.title,
        post.body,
        hash,
        finalCopyStatus,
        validationStatus,
        blockingReasons,
      ],
    )
    fs.writeFileSync(path.join(reviewDir, `${platform}.md`), post.body, "utf8")

    // metadata for repo review queue
    const meta = {
      product: "Shopify",
      platform,
      status: finalCopyStatus,
      affiliate_link: finalCopyAffiliateLink,
      source_content_id: sourceId,
      platform_adaptation_id: paId,
      campaign_approval_id: null,
      content_hash: hash,
      validation_status: validationStatus,
      blocking_reasons: blockingReasons,
      reviewer_status: isBlocked ? "blocked" : "pending_meni_approval",
      reviewer_notes: isBlocked
        ? "Blocked by platform policy. MENI should not receive this as an approval-ready item."
        : "Generated and validated. Waiting for MENI approval.",
    }
    fs.writeFileSync(path.join(reviewDir, `${platform}.metadata.json`), JSON.stringify(meta, null, 2), "utf8")

    console.log(`CREATED: ${platform} | ${finalCopyStatus} (${post.body.length} chars)`)
  }

  // 5. Summary
  const summary = await c.query(`
    SELECT p.name, fc.platform, fc.status
    FROM final_copies fc
    JOIN products p ON fc.product_id = p.id
    WHERE p.name = 'Shopify'
    ORDER BY fc.platform
  `)
  console.log(`\n=== Shopify final copies ===`)
  summary.rows.forEach((r) => console.log(`  ${r.platform.padEnd(10)} | ${r.status}`))

  await c.end()
}
main().catch(async (err) => {
  console.error("ERROR:", err.message)
  try { await c.end() } catch {}
  process.exit(1)
})
