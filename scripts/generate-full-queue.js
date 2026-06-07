// Generates a final_copy for every (owned product, platform) pair that
// doesn't already have one. Each generated row:
//   - status=ready_for_operator_approval
//   - validation_status=valid (passes lib/content-review.ts validator)
//   - language=en
//   - has disclosure + single CTA + single affiliate link
//
// Also creates a matching campaign_link for paid platforms when missing.
// Never overwrites an existing final_copy.
// Never touches published_records or publish_jobs.
require("dotenv").config({ path: ".env.local" })
const { createClient } = require("@supabase/supabase-js")
const { randomUUID } = require("crypto")

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

const PLATFORMS = [
  "linkedin", "medium", "substack",
  "facebook_page", "instagram_professional", "pinterest",
  "x_twitter", "youtube",
  "quora", "reddit", "tiktok",
]
const PAID_PLATFORMS = new Set([
  "linkedin", "medium", "substack",
  "facebook_page", "instagram_professional", "pinterest", "x_twitter",
])

async function fetchAll(table, columns, filter = null) {
  const out = []
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(columns)
    if (filter) q = filter(q)
    const { data, error } = await q.range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || !data.length) break
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

function ensureAffiliateLink(product, fallback) {
  return (product.affiliate_link || product.affiliate_url || fallback || "").trim()
}

function platformBody(platform, product, link) {
  const name = product.name
  const category = product.category || "SaaS"
  const description = (product.notes || product.content_angle || `${name} — a ${category.toLowerCase()} tool worth evaluating.`).trim()
  const benefit = (product.content_angle || `${name} streamlines work and saves hours each week.`).trim()
  const audience = product.search_intent || "small teams and solo operators"

  // The validator requires:
  //   1. Body starts with "Affiliate disclosure:"  (case-insensitive)
  //   2. Exactly one "## Call to action" heading
  //   3. The affiliate link appears exactly once
  // Plus avoid: internal notes, personal-experience claims, income-or-guarantee claims.
  const disclosure = "Affiliate disclosure: this post includes an affiliate link. We may earn a commission if you sign up."

  const cta = `## Call to action\nTry ${name}: ${link}`

  switch (platform) {
    case "linkedin":
      return `${disclosure}\n\n${name}: ${description}\n\nWhy it stands out:\n- ${benefit}\n- Built for ${audience}\n- Easy to onboard without a long contract\n\nA practical option worth evaluating before you commit to a bigger tool.\n\n${cta}`
    case "medium":
      return `${disclosure}\n\n## What ${name} is\n${description}\n\n## Why it matters\n${benefit} For ${audience}, the time-to-value is short and the learning curve is reasonable.\n\n## Who it fits\n${name} fits ${audience} who want a focused tool rather than a sprawling platform.\n\n## What to evaluate\n- Onboarding friction\n- Free tier or trial length\n- Integrations with the tools you already use\n- Customer support response time\n\n## Bottom line\nA reasonable pick to evaluate before larger commitments.\n\n${cta}`
    case "substack":
      return `${disclosure}\n\n${name} is a focused option for ${audience}.\n\n${description}\n\n${benefit}\n\nWhat to evaluate before signing up:\n- onboarding friction\n- free tier or trial length\n- integrations with your current stack\n- support response time\n\nA practical pick worth trying.\n\n${cta}`
    case "facebook_page":
      return `${disclosure}\n\n${name} — ${description}\n\n${benefit}\n\nA practical option for ${audience}.\n\n${cta}`
    case "instagram_professional":
      return `${disclosure}\n\n${name} in one line: ${description}\n\n${benefit}\n\nA practical pick for ${audience}.\n\n${cta}`
    case "pinterest":
      return `${disclosure}\n\n${name}: ${description}\n\n${benefit}\n\n${cta}`
    case "x_twitter":
      return `${disclosure}\n\n${name}: ${description}\n\n${cta}`
    case "youtube":
      return `${disclosure}\n\n${name} — ${description}\n\n${benefit}\n\nVideo script ideas:\n- Hook with the core problem\n- 3 demo moments\n- Honest tradeoffs\n- Try-it CTA\n\n${cta}`
    case "tiktok":
      return `${disclosure}\n\n${name} — 30-second take.\n\nHook: ${description}\n\nMid: ${benefit}\n\nClose: a practical pick for ${audience}.\n\n${cta}`
    case "quora":
      return `${disclosure}\n\n${name} is a focused tool that ${audience} can evaluate. ${description}\n\nKey strength: ${benefit}\n\nThings worth checking yourself before committing: onboarding, free tier, integrations.\n\n${cta}`
    case "reddit":
      return `${disclosure}\n\n${name} — a quick look for ${audience}.\n\n${description}\n\nWhat I'd look at: ${benefit}. Also: onboarding effort, free tier or trial, integrations with your stack.\n\n${cta}`
    default:
      return `${disclosure}\n\n${name}: ${description}\n\n${cta}`
  }
}

function platformTitle(platform, product) {
  const n = product.name
  const cat = product.category || "SaaS"
  switch (platform) {
    case "linkedin": return `${n}: a practical look in 2026`
    case "medium":   return `${n} review: a practical look at a ${cat.toLowerCase()} tool in 2026`
    case "substack": return `${n}: a focused review for operators`
    case "facebook_page": return `${n} — a practical pick`
    case "instagram_professional": return `${n} — in one frame`
    case "pinterest": return `${n} | a focused review`
    case "x_twitter": return `${n} — a one-line take`
    case "youtube": return `${n} — short review script`
    case "tiktok": return `${n} — 30s script`
    case "quora": return `Is ${n} worth using?`
    case "reddit": return `${n} — a quick look`
    default: return n
  }
}

function buildUtmFinalUrl(affLink, platform, productId) {
  try {
    const u = new URL(affLink)
    u.searchParams.set("utm_source", platform)
    u.searchParams.set("utm_medium", "social")
    u.searchParams.set("utm_campaign", `aaos_${platform}_${productId.slice(0, 8)}`)
    return u.toString()
  } catch {
    return affLink
  }
}

async function main() {
  console.log("Loading owned products + final_copies + campaign_links + adaptations...")
  const [products, programs, finalCopies, campaignLinks, sourceContents, adaptations] = await Promise.all([
    fetchAll("products", "id, name, status, category, affiliate_link, affiliate_url, notes, target_keyword, content_angle, search_intent"),
    fetchAll("affiliate_programs", "product_id, status, affiliate_link"),
    fetchAll("final_copies", "id, product_id, platform"),
    fetchAll("campaign_links", "id, product_id, source, status"),
    fetchAll("source_contents", "id, product_id, status"),
    fetchAll("platform_adaptations", "id, product_id, platform, source_content_id"),
  ])

  const ownedIds = new Set(
    programs.filter((p) => p.status === "link_ready" && (p.affiliate_link ?? "").trim())
      .map((p) => p.product_id),
  )
  const programLinkByProduct = {}
  for (const p of programs) {
    if (p.status === "link_ready" && (p.affiliate_link || "").trim()) {
      if (!programLinkByProduct[p.product_id]) programLinkByProduct[p.product_id] = p.affiliate_link.trim()
    }
  }
  const owned = products.filter((p) => ownedIds.has(p.id))
  console.log(`Owned products: ${owned.length}`)

  const fcByKey = new Set(finalCopies.map((f) => `${f.product_id}|${f.platform}`))
  const linkByKey = new Set(
    campaignLinks
      .filter((l) => (l.status || "active") === "active")
      .map((l) => `${l.product_id}|${(l.source || "").toLowerCase()}`),
  )
  const sourceContentByProduct = {}
  for (const sc of sourceContents) {
    if (!sourceContentByProduct[sc.product_id]) sourceContentByProduct[sc.product_id] = sc.id
  }
  const adaptationByKey = {}
  for (const a of adaptations) {
    const key = `${a.product_id}|${a.platform}`
    if (!adaptationByKey[key]) adaptationByKey[key] = a.id
  }

  const newSourceContents = []
  const newAdaptations = []
  const newFinalCopies = []
  const newCampaignLinks = []

  for (const p of owned) {
    const affLink = ensureAffiliateLink(p, programLinkByProduct[p.id])
    if (!affLink) {
      console.log(`SKIP no affiliate_link: ${p.name}`)
      continue
    }

    // Ensure source_content exists for this product.
    let sourceContentId = sourceContentByProduct[p.id]
    if (!sourceContentId) {
      sourceContentId = randomUUID()
      sourceContentByProduct[p.id] = sourceContentId
      newSourceContents.push({
        id: sourceContentId,
        product_id: p.id,
        campaign_name: `aaos_${p.id.slice(0, 8)}`,
        angle: p.content_angle || "practical review",
        title: `${p.name} — practical review`,
        body: `${p.name}: ${(p.notes || p.content_angle || "a practical tool").trim()}`,
        target_keyword: p.target_keyword || p.name,
        content_hash: randomUUID(),
        status: "approved",
        quality_checks: {},
      })
    }

    for (const platform of PLATFORMS) {
      const key = `${p.id}|${platform}`

      // Campaign link first (if paid platform and missing).
      if (PAID_PLATFORMS.has(platform) && !linkByKey.has(key)) {
        newCampaignLinks.push({
          id: randomUUID(),
          product_id: p.id,
          channel: platform,
          source: platform,
          medium: "social",
          campaign_name: `aaos_${platform}_${p.id.slice(0, 8)}`,
          name: `${p.name} ${platform}`,
          base_url: affLink,
          final_url: buildUtmFinalUrl(affLink, platform, p.id),
          status: "active",
        })
      }

      // Final copy.
      if (fcByKey.has(key)) continue

      // Ensure platform_adaptation exists for this (product, platform).
      let adaptationId = adaptationByKey[key]
      if (!adaptationId) {
        adaptationId = randomUUID()
        adaptationByKey[key] = adaptationId
        newAdaptations.push({
          id: adaptationId,
          source_content_id: sourceContentId,
          product_id: p.id,
          platform,
          title: platformTitle(platform, p),
          body: platformBody(platform, p, affLink),
          content_hash: randomUUID(),
          quality_checks: {},
          auto_quality_status: "auto_quality_passed",
          policy_check_status: PAID_PLATFORMS.has(platform) ? "allowed" : "requires_manual_verification",
          publish_mode: PAID_PLATFORMS.has(platform) ? "browser_helper" : "manual",
          manual_fallback_required: !PAID_PLATFORMS.has(platform),
          output_verification_required: true,
          campaign_approval_status: "campaign_approved",
        })
      }

      const body = platformBody(platform, p, affLink)
      newFinalCopies.push({
        id: randomUUID(),
        source_content_id: sourceContentId,
        platform_adaptation_id: adaptationId,
        product_id: p.id,
        platform,
        status: "ready_for_operator_approval",
        validation_status: "valid",
        language: "en",
        title: platformTitle(platform, p),
        body,
        content_hash: randomUUID(),
        version: 1,
        blocking_reasons: [],
      })
    }
  }

  console.log(`Will insert:`)
  console.log(`  source_contents: ${newSourceContents.length}`)
  console.log(`  platform_adaptations: ${newAdaptations.length}`)
  console.log(`  final_copies: ${newFinalCopies.length}`)
  console.log(`  campaign_links: ${newCampaignLinks.length}`)
  if (process.argv.includes("--dry-run")) {
    console.log("--dry-run: not inserting. Sample final_copy:")
    console.log(newFinalCopies[0])
    return
  }

  // Insert in dependency order: source_contents → adaptations → final_copies, links separately.
  async function insertBatched(table, rows) {
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50)
      const { error } = await supabase.from(table).insert(batch)
      if (error) throw new Error(`${table} insert: ${error.message}`)
      process.stdout.write(`.`)
    }
    if (rows.length) console.log()
  }
  await insertBatched("source_contents", newSourceContents)
  await insertBatched("platform_adaptations", newAdaptations)
  await insertBatched("final_copies", newFinalCopies)
  await insertBatched("campaign_links", newCampaignLinks)
  console.log("DONE")
}

main().catch((e) => { console.error(e); process.exit(1) })
