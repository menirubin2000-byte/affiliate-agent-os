#!/usr/bin/env node
/**
 * Stage 43: Automated product research intake.
 * Imports researched products, creates campaign links for active ones.
 * Does NOT create fake affiliate links.
 */

import { readFileSync } from "node:fs"

const env = {}
readFileSync(".env.local", "utf8").split("\n").forEach((line) => {
  const idx = line.indexOf("=")
  if (idx > 0) env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim()
})

const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const headers = {
  apikey: KEY,
  Authorization: "Bearer " + KEY,
  "Content-Type": "application/json",
  Prefer: "return=representation",
}

async function api(method, path, body) {
  const r = await fetch(URL + "/rest/v1/" + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json()
  if (!r.ok) {
    if (r.status === 409 || (data.code === "23505")) {
      return { _skipped: true, reason: "duplicate", detail: data.message || data.details }
    }
    throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(data)}`)
  }
  return Array.isArray(data) ? data[0] : data
}

// ── Product candidates from research ──
const products = [
  {
    name: "Jasper AI",
    slug: "jasper-ai",
    brand: "Jasper",
    category: "AI Writing Tools",
    affiliate_url: "https://www.jasper.ai",
    price: 39,
    commission_rate: 30,
    target_keyword: "jasper ai review",
    secondary_keywords: "{jasper ai pricing,ai writing tool,ai content generator,jasper affiliate}",
    search_intent: "commercial",
    content_angle: "Honest review for content creators evaluating AI writing assistants",
    notes: "Affiliate program open via Impact. 25-30% recurring 12 months. $39-59/mo plans. 45-day cookie. Business plans not commissionable. Normal product URL — needs affiliate signup at jasper.ai/partners",
    status: "inactive",
    _affiliate_status: "needs_affiliate_signup",
  },
  {
    name: "Semrush",
    slug: "semrush",
    brand: "Semrush",
    category: "SEO Tools",
    affiliate_url: "https://www.semrush.com",
    price: 139.95,
    commission_rate: 0,
    target_keyword: "semrush review",
    secondary_keywords: "{semrush pricing,seo tool review,semrush vs ahrefs,keyword research tool}",
    search_intent: "commercial",
    content_angle: "Comprehensive SEO platform review for marketers and content creators",
    notes: "Affiliate program open via Impact.com. $200 CPA per sale + $10 per trial activation. 120-day cookie. Normal product URL — needs affiliate signup at semrush.com/lp/affiliate-program",
    status: "inactive",
    _affiliate_status: "needs_affiliate_signup",
  },
  {
    name: "Writesonic",
    slug: "writesonic",
    brand: "Writesonic",
    category: "AI Writing Tools",
    affiliate_url: "https://writesonic.com",
    price: 16,
    commission_rate: 30,
    target_keyword: "writesonic review",
    secondary_keywords: "{writesonic pricing,ai writing tool,writesonic vs jasper,ai copywriter}",
    search_intent: "commercial",
    content_angle: "Budget-friendly AI writing tool review for solopreneurs and freelancers",
    notes: "Affiliate program open. 30% lifetime recurring commission. $16-499/mo plans. 90-day cookie. Normal product URL — needs affiliate signup at writesonic.com/affiliate",
    status: "inactive",
    _affiliate_status: "needs_affiliate_signup",
  },
  {
    name: "ClickUp",
    slug: "clickup",
    brand: "ClickUp",
    category: "Project Management",
    affiliate_url: "https://clickup.com",
    price: 0,
    commission_rate: 0,
    target_keyword: "clickup review",
    secondary_keywords: "{clickup pricing,project management tool,clickup vs asana,clickup vs notion,task management}",
    search_intent: "commercial",
    content_angle: "Project management platform review for teams and freelancers",
    notes: "Affiliate program open via Impact/PartnerStack. $20-25 per free signup (Tier 1 countries). Up to 25% recurring at higher tiers. Free plan available. 30-day cookie. Normal product URL — needs affiliate signup at clickup.com/partners/affiliates",
    status: "inactive",
    _affiliate_status: "needs_affiliate_signup",
  },
  {
    name: "Systeme.io",
    slug: "systeme-io",
    brand: "Systeme.io",
    category: "Marketing Platform",
    affiliate_url: "https://systeme.io",
    price: 0,
    commission_rate: 60,
    target_keyword: "systeme.io review",
    secondary_keywords: "{systeme io pricing,marketing platform,sales funnel builder,systeme io affiliate,email marketing tool}",
    search_intent: "commercial",
    content_angle: "All-in-one marketing platform review for small business owners and creators",
    notes: "Affiliate program open to everyone, no approval needed. 60% lifetime recurring commission. Free plan available, paid from $27/mo. Lifetime attribution. Normal product URL — affiliate signup is free at systeme.io/affiliate-program",
    status: "inactive",
    _affiliate_status: "needs_affiliate_signup",
  },
  {
    name: "Webflow",
    slug: "webflow",
    brand: "Webflow",
    category: "Web Design",
    affiliate_url: "https://webflow.com",
    price: 18,
    commission_rate: 50,
    target_keyword: "webflow review",
    secondary_keywords: "{webflow pricing,web design tool,webflow vs wordpress,no-code website builder,webflow templates}",
    search_intent: "commercial",
    content_angle: "No-code web design platform review for designers and small businesses",
    notes: "Affiliate program open. 50% commission first 12 months. Site plans from $18/mo. 90-day cookie. Normal product URL — needs affiliate signup at webflow.com/solutions/affiliates",
    status: "inactive",
    _affiliate_status: "needs_affiliate_signup",
  },
  {
    name: "ElevenLabs",
    slug: "elevenlabs",
    brand: "ElevenLabs",
    category: "AI Voice Tools",
    affiliate_url: "https://elevenlabs.io",
    price: 5,
    commission_rate: 22,
    target_keyword: "elevenlabs review",
    secondary_keywords: "{elevenlabs pricing,ai voice generator,text to speech ai,elevenlabs vs murf,ai voiceover}",
    search_intent: "commercial",
    content_angle: "AI voice synthesis platform review for creators and developers",
    notes: "Affiliate program open via PartnerStack. 22% recurring 12 months. Plans from $5/mo. 90-day cookie. Normal product URL — needs affiliate signup at elevenlabs.io/affiliates",
    status: "inactive",
    _affiliate_status: "needs_affiliate_signup",
  },
  {
    name: "Notion",
    slug: "notion",
    brand: "Notion",
    category: "Productivity",
    affiliate_url: "https://www.notion.com",
    price: 10,
    commission_rate: 50,
    target_keyword: "notion review",
    secondary_keywords: "{notion pricing,productivity tool,notion vs clickup,workspace app,note taking app}",
    search_intent: "commercial",
    content_angle: "All-in-one workspace review for teams and individuals",
    notes: "Affiliate program CLOSED to new applications as of 2026. 50% commission first 12 months when available. 180-day cookie. Normal product URL — cannot sign up currently. Monitor for reopening.",
    status: "inactive",
    _affiliate_status: "program_closed",
  },
  {
    name: "Canva",
    slug: "canva",
    brand: "Canva",
    category: "Design Tools",
    affiliate_url: "https://www.canva.com",
    price: 12.95,
    commission_rate: 15,
    target_keyword: "canva pro review",
    secondary_keywords: "{canva pricing,graphic design tool,canva vs figma,canva templates,online design}",
    search_intent: "commercial",
    content_angle: "Accessible design tool review for non-designers and small businesses",
    notes: "Canvassador affiliate program CLOSED to new applications as of 2026. 15% annual / 80% first 2 months when available. 30-day cookie. Normal product URL — cannot sign up currently. Monitor for reopening.",
    status: "inactive",
    _affiliate_status: "program_closed",
  },
  {
    name: "Monday.com",
    slug: "monday-com",
    brand: "Monday.com",
    category: "Project Management",
    affiliate_url: "https://monday.com",
    price: 9,
    commission_rate: 100,
    target_keyword: "monday.com review",
    secondary_keywords: "{monday pricing,project management,monday vs clickup,team management tool,work os}",
    search_intent: "commercial",
    content_angle: "Visual project management platform review for growing teams",
    notes: "Affiliate program open. Up to 100% of first payment. Plans from $9/seat/mo. Normal product URL — needs affiliate signup via Impact at monday.com/partnership/affiliate",
    status: "inactive",
    _affiliate_status: "needs_affiliate_signup",
  },
]

async function run() {
  // ── Check existing slugs to avoid duplicates ──
  console.log("=== Checking existing products ===")
  const existingRes = await fetch(URL + "/rest/v1/products?select=slug", {
    headers: { apikey: KEY, Authorization: "Bearer " + KEY },
  })
  const existing = await existingRes.json()
  const existingSlugs = new Set(existing.map((p) => p.slug))
  console.log("  Existing slugs: " + [...existingSlugs].join(", "))

  const imported = []
  const skipped = []
  const needsSignup = []
  const programClosed = []

  for (const p of products) {
    const affiliateStatus = p._affiliate_status
    delete p._affiliate_status

    if (existingSlugs.has(p.slug)) {
      skipped.push({ name: p.name, reason: "slug already exists" })
      console.log("\n  SKIP: " + p.name + " (slug exists)")
      continue
    }

    console.log("\n  IMPORT: " + p.name)
    try {
      const result = await api("POST", "products", p)
      if (result._skipped) {
        skipped.push({ name: p.name, reason: result.reason })
        console.log("    Skipped: " + result.reason)
      } else {
        imported.push({ id: result.id, name: result.name, slug: result.slug, status: result.status, affiliateStatus })
        console.log("    OK: " + result.id + " status=" + result.status)

        if (affiliateStatus === "needs_affiliate_signup") {
          needsSignup.push(p.name)
        } else if (affiliateStatus === "program_closed") {
          programClosed.push(p.name)
        }
      }
    } catch (err) {
      skipped.push({ name: p.name, reason: err.message })
      console.log("    ERROR: " + err.message)
    }
  }

  // ── Summary ──
  console.log("\n\n========================================")
  console.log("STAGE 43 INTAKE SUMMARY")
  console.log("========================================")
  console.log("Products imported: " + imported.length)
  console.log("Products skipped: " + skipped.length)
  if (skipped.length > 0) {
    for (const s of skipped) console.log("  - " + s.name + ": " + s.reason)
  }
  console.log("\nAffiliate signup needed (" + needsSignup.length + "):")
  for (const n of needsSignup) console.log("  - " + n)
  console.log("\nAffiliate program closed (" + programClosed.length + "):")
  for (const n of programClosed) console.log("  - " + n)
  console.log("\nAll imported products are status=inactive (no real affiliate links yet)")
  console.log("No campaign links created (products need real affiliate URLs first)")
  console.log("No drafts created (operator review needed before content creation)")

  // ── Final counts ──
  console.log("\n=== FINAL TABLE COUNTS ===")
  const tables = ["products", "content_drafts", "draft_versions", "performance_metrics", "improvement_tasks", "campaign_links", "saved_views"]
  for (const t of tables) {
    const r = await fetch(URL + "/rest/v1/" + t + "?select=id&limit=1", {
      headers: { ...headers, Prefer: "count=exact" },
    })
    const range = r.headers.get("content-range") || "0"
    const total = range.includes("/") ? range.split("/")[1] : "?"
    console.log("  " + t + ": " + total + " rows")
  }

  console.log("\n=== NEXT OPERATOR ACTIONS ===")
  console.log("1. Sign up for affiliate programs (see notes on each product)")
  console.log("2. Replace product affiliate_url with real affiliate links")
  console.log("3. Change product status to 'active' once affiliate link is set")
  console.log("4. Create campaign links for active products")
  console.log("5. Create review drafts using Claude Code prompts")
  console.log("6. Do NOT fabricate reviews, ratings, or claims")
}

run().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
