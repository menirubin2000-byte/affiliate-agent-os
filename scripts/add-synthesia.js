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

const LINK = "https://www.synthesia.io/?via=meni"

const POSTS = {
  medium: {
    title: "Synthesia Review: AI Video Generation for Creators and Small Teams in 2026",
    body: `*Affiliate disclosure: This article includes an affiliate link. If you sign up through the link, I may earn a commission at no extra cost to you.*

## What Synthesia Is

Synthesia is an AI video generation platform that turns written scripts into professional video presentations with realistic AI avatars and voiceovers. It removes the need for cameras, studios, actors, or video editing software.

## Key Features

- 230+ AI avatars across multiple ethnicities and styles
- 140+ languages and accents for voiceover
- Custom avatar creation (premium tiers)
- Template library for common video formats
- Built-in editor for slides, transitions, and music
- Team collaboration features
- API access for higher-tier plans

## Who It Is For

Solo content creators, marketing teams, internal training departments, course creators, and small businesses that need to produce video at scale without a production crew. Great for product reviews, explainer videos, internal training, and short marketing clips.

## Who It Is Not For

Teams that need very specific actor performance, cinematic productions, or emotional storytelling. AI avatars are excellent for talking-head content but cannot replace human nuance for narrative work.

## Pros

- Turns a script into video in minutes
- Multiple languages from one script
- No camera, lighting, or editing skills required
- Consistent on-brand video output
- Scales cheaply once you know the workflow

## Cons

- Monthly subscription required for serious use
- AI avatars still feel slightly synthetic on close inspection
- Custom avatars cost extra and require enterprise tier
- Output style is constrained — not for cinematic work

## Pricing

Personal plans start with a small free tier (limited minutes per month). Paid Starter and Creator plans add more minutes, avatars, and features. Enterprise plans include custom avatars and API access.

## Practical Take

If you publish video content regularly and want to skip the production headache, Synthesia is one of the strongest AI video tools available in 2026. The avatars and voices have improved dramatically and the editor is approachable enough for non-video-experts.

[Try Synthesia here](${LINK})`,
  },
  linkedin: {
    title: "Synthesia Review: Turn Scripts into Professional Video Without a Crew",
    body: `*Affiliate disclosure: This post includes an affiliate link.*

Need to produce video at scale without hiring a production crew?

Synthesia turns written scripts into professional video presentations with AI avatars and natural voiceovers.

Why it works for solo creators and small teams:
- 230+ AI avatars to match your audience
- 140+ languages from a single script
- No camera, lighting, or editing skills needed
- Built-in editor for slides, transitions, and music
- Team collaboration on higher plans

Best for: Product reviews, explainer videos, internal training, multilingual marketing.

Not ideal for: Cinematic storytelling or work that needs deep human performance.

There is a free starter tier to test the platform before paying.

Try Synthesia: ${LINK}`,
  },
  substack: {
    title: "Synthesia Review: A Practical Look at AI Video for Solo Creators",
    body: `*Affiliate disclosure: This article includes an affiliate link.*

## Why Synthesia

If you publish video content but cannot justify a camera setup, lighting, and editing pipeline, Synthesia is one of the cleanest paths to professional-looking video in 2026. You write a script, pick an AI avatar and voice, and the platform generates the finished video.

## What Stands Out

- **Speed** — script in, video out in minutes
- **Multilingual reach** — 140+ languages from the same script
- **Avatar library** — 230+ presenters across styles and ethnicities
- **Templates** — for explainers, social cuts, product reviews
- **Built-in editor** — slides, captions, transitions, soundtrack

## Where It Falls Short

- Subscription cost on top of any other tools you use
- AI avatars still read slightly synthetic on close inspection
- Custom avatars are gated behind higher tiers
- Output is constrained to talking-head and slide formats

## Who Should Try It

Solo content creators, course teachers, internal training teams, marketing teams running multilingual campaigns, and reviewers who want to add video to written content without a full production stack.

## Bottom Line

Synthesia is worth testing on the free tier if you produce video regularly or want to add video to a written publishing pipeline.

[Try Synthesia here](${LINK})`,
  },
  quora: {
    title: "What is the best AI video tool to turn text into a presentation in 2026?",
    body: `Disclosure: I write about digital tools and earn affiliate commissions on some longer articles I link to from my profile. This Quora answer does not include a direct affiliate link.

For turning written scripts into professional video without a camera or editing pipeline, Synthesia is one of the strongest AI video tools to evaluate in 2026.

What works well:
1. Hundreds of AI avatars across different styles and ethnicities
2. Over 140 languages and accents from the same script
3. No camera, lighting, or editing skills required
4. Built-in editor for slides, transitions, captions, and music
5. Templates for explainers, social cuts, and product reviews
6. Free starter tier to test before paying

Tradeoffs to know:
- Subscription cost on top of other tools
- AI avatars can feel slightly synthetic on close inspection
- Custom avatars require higher-tier plans
- Output is best for talking-head and slide formats, not cinematic work

Best fit for solo creators, marketing teams, training departments, and course creators who want to add video to a written content pipeline.

If you want to evaluate it, search for Synthesia on Google — the free tier lets you produce a few short videos before committing.`,
  },
  reddit: {
    title: "Evaluated Synthesia for AI video generation — what worked and what did not",
    body: `Disclosure: my long-form reviews include affiliate links, but this Reddit post does not. I link the official site only.

Spent real time testing Synthesia for a content pipeline that needs to ship video without a camera setup. Sharing what I found.

**What works:**
- Script in, video out in minutes — genuinely fast
- 230+ AI avatars across styles and ethnicities
- 140+ languages from the same script (huge for multilingual campaigns)
- Built-in editor handles slides, captions, transitions, soundtrack
- Free starter tier lets you test before committing

**What does not work:**
- Subscription required once you ship more than a few videos a month
- AI avatars still read slightly synthetic on close inspection
- Custom avatars are gated behind higher tiers
- Output style is constrained — not for cinematic storytelling

**Best fit:** Solo creators, marketing teams, internal training, course creators, multilingual outreach. Anyone producing talking-head or explainer video at scale.

**Not for:** Cinematic narrative, work that needs deep human performance, very specific actor styling.

Official site: https://www.synthesia.io`,
  },
}

const PLATFORM_POLICY_BLOCKS = {
  quora: ["quora_direct_affiliate_links_prohibited"],
  reddit: ["bridge_url_required"],
}

async function main() {
  await c.connect()

  const p = await c.query(`SELECT id FROM products WHERE name = 'Synthesia' LIMIT 1`)
  if (!p.rows.length) {
    console.error("Synthesia not found in DB. Add it first via the dashboard or another script.")
    process.exit(1)
  }
  const productId = p.rows[0].id

  const existingAp = await c.query(`SELECT id FROM affiliate_programs WHERE product_id = $1 LIMIT 1`, [productId])
  let apId
  if (existingAp.rows.length) {
    await c.query(
      `UPDATE affiliate_programs
         SET program_name = 'Synthesia Personal Plan',
             affiliate_link = $1,
             network = 'Direct',
             status = 'link_ready',
             updated_at = now()
       WHERE id = $2`,
      [LINK, existingAp.rows[0].id],
    )
    apId = existingAp.rows[0].id
    console.log("Updated affiliate_program")
  } else {
    const r = await c.query(
      `INSERT INTO affiliate_programs (product_id, program_name, network, status, affiliate_link)
       VALUES ($1, 'Synthesia Personal Plan', 'Direct', 'link_ready', $2)
       RETURNING id`,
      [productId, LINK],
    )
    apId = r.rows[0].id
    console.log("Created affiliate_program")
  }

  let sc = await c.query(`SELECT id FROM source_contents WHERE product_id = $1 LIMIT 1`, [productId])
  let sourceId
  if (!sc.rows.length) {
    const r = await c.query(
      `INSERT INTO source_contents
         (product_id, campaign_name, angle, title, body, target_keyword, content_hash, status)
       VALUES ($1, 'synthesia_review', 'review', 'Synthesia Review', 'AI video generation review',
               'synthesia review', 'synthesia_src_1', 'active')
       RETURNING id`,
      [productId],
    )
    sourceId = r.rows[0].id
    console.log("Created source_content")
  } else {
    sourceId = sc.rows[0].id
  }

  const reviewDir = path.join(__dirname, "..", "content", "review-queue", "synthesia")
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
    const policyBlocks = PLATFORM_POLICY_BLOCKS[platform] || []
    const status = policyBlocks.length ? "needs_system_fix" : "ready_for_operator_approval"
    const validation = policyBlocks.length ? "fix_requested" : "valid"

    await c.query(
      `INSERT INTO final_copies
         (product_id, affiliate_program_id, affiliate_link, source_content_id, platform_adaptation_id,
          platform, title, body, content_hash, version, status, validation_status, blocking_reasons)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$10,$11,$12)`,
      [
        productId, apId, LINK, sourceId, paId, platform, post.title, post.body, hash,
        status, validation, `{${policyBlocks.join(",")}}`,
      ],
    )
    fs.writeFileSync(path.join(reviewDir, `${platform}.md`), post.body, "utf8")

    const meta = {
      product: "Synthesia",
      platform,
      status,
      affiliate_link: LINK,
      source_content_id: sourceId,
      platform_adaptation_id: paId,
      campaign_approval_id: null,
      content_hash: hash,
      validation_status: validation,
      blocking_reasons: policyBlocks,
      reviewer_status: status === "ready_for_operator_approval" ? "ready_for_review" : "needs_fix",
      reviewer_notes: status === "ready_for_operator_approval"
        ? "ready for MENI approval — affiliate link enabled"
        : "platform policy block prevents direct affiliate link in body",
    }
    fs.writeFileSync(path.join(reviewDir, `${platform}.metadata.json`), JSON.stringify(meta, null, 2), "utf8")

    console.log(`CREATED: ${platform} (${post.body.length} chars) — status ${status}`)
  }

  const summary = await c.query(`
    SELECT p.name, fc.platform, fc.status
    FROM final_copies fc
    JOIN products p ON fc.product_id = p.id
    WHERE p.name = 'Synthesia'
    ORDER BY fc.platform
  `)
  console.log(`\n=== Synthesia final copies ===`)
  summary.rows.forEach((r) => console.log(`  ${r.platform.padEnd(10)} | ${r.status}`))

  await c.end()
}
main().catch(async (err) => {
  console.error("ERROR:", err.message)
  try { await c.end() } catch {}
  process.exit(1)
})
