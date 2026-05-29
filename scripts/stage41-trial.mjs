#!/usr/bin/env node
/**
 * Stage 41: Full operator trial via Supabase REST API.
 * Creates product, draft, version, approves, campaign link, performance, task.
 * Verifies all tables. Does not print secrets.
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
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(data)}`)
  return Array.isArray(data) ? data[0] : data
}

async function count(table) {
  const r = await fetch(URL + "/rest/v1/" + table + "?select=id&limit=1", {
    headers: { ...headers, Prefer: "count=exact" },
  })
  const range = r.headers.get("content-range") || "0"
  return range.includes("/") ? range.split("/")[1] : "?"
}

async function run() {
  // ── Step 1: Create product ──
  console.log("=== STEP 1: Create Product ===")
  const product = await api("POST", "products", {
    name: "Stage 41 Test Product",
    slug: "stage-41-test-product-v2",
    brand: "Stage Test Brand",
    category: "Test Category",
    affiliate_url: "https://example.com/stage-41-affiliate",
    target_keyword: "stage 41 affiliate test",
    search_intent: "commercial",
    content_angle: "practical test product review",
    notes: "Created during Stage 41 deployed operator trial",
    status: "active",
  })
  console.log("  Product ID: " + product.id)
  console.log("  Name: " + product.name)
  console.log("  Slug: " + product.slug)

  // ── Step 2: Create draft ──
  console.log("\n=== STEP 2: Create Draft ===")
  const draftBody = [
    "**Affiliate Disclosure:** This review contains affiliate links. If you purchase through these links, we may earn a commission at no additional cost to you.",
    "",
    "## Stage 41 Test Product Review",
    "",
    "The Stage 41 Test Product from Stage Test Brand is a practical product designed for affiliate workflow testing. This review covers our hands-on experience.",
    "",
    "### Overview",
    "",
    "This product serves as a verification item for the Affiliate Agent OS staging environment. It demonstrates the full content workflow from creation through approval.",
    "",
    "### Pros",
    "",
    "- Clean integration with the staging workflow",
    "- Verifies end-to-end draft creation and approval",
    "- Supports campaign link tracking and performance metrics",
    "",
    "### Cons",
    "",
    "- This is a test product, not a real consumer item",
    "- No actual purchase or shipping experience to report",
    "",
    "### Conclusion",
    "",
    "The Stage 41 Test Product validates the complete Affiliate Agent OS workflow.",
    "",
    "[Check the Stage 41 Test Product here](https://example.com/stage-41-affiliate)",
  ].join("\n")

  const draft = await api("POST", "content_drafts", {
    product_id: product.id,
    content_type: "review",
    template_type: "review",
    title: "Stage 41 Test Product Review",
    body: draftBody,
    meta_title: "Stage 41 Test Product Review",
    meta_description: "A staging review draft for validating Affiliate Agent OS.",
    target_keyword: "stage 41 affiliate test",
    status: "draft",
    quality_checks: {
      has_disclosure: true,
      has_cta: true,
      has_product_name: true,
      has_pros_cons: true,
      no_fake_claims: true,
      min_length_met: true,
    },
  })
  console.log("  Draft ID: " + draft.id)
  console.log("  Title: " + draft.title)
  console.log("  Status: " + draft.status)

  // ── Step 3: Create draft version ──
  console.log("\n=== STEP 3: Create Draft Version ===")
  const version = await api("POST", "draft_versions", {
    content_draft_id: draft.id,
    version_number: 1,
    title: draft.title,
    body: draftBody,
    meta_title: "Stage 41 Test Product Review",
    meta_description: "A staging review draft for validating Affiliate Agent OS.",
    target_keyword: "stage 41 affiliate test",
    quality_checks: draft.quality_checks,
    change_source: "manual",
    change_notes: "Initial version from Stage 41 trial",
  })
  console.log("  Version ID: " + version.id)
  console.log("  Version #: " + version.version_number)

  // ── Step 4: Approve draft ──
  console.log("\n=== STEP 4: Approve Draft ===")
  const approved = await api("PATCH", "content_drafts?id=eq." + draft.id, {
    status: "approved",
  })
  console.log("  Draft status: " + approved.status)

  // ── Step 5: Create campaign link ──
  console.log("\n=== STEP 5: Create Campaign Link ===")
  const link = await api("POST", "campaign_links", {
    product_id: product.id,
    name: "Stage 41 Test Campaign",
    channel: "test",
    campaign_name: "stage_41_trial",
    source: "affiliate_agent_os",
    medium: "staging",
    content: "review",
    base_url: "https://example.com/stage-41-affiliate",
    final_url:
      "https://example.com/stage-41-affiliate?utm_source=affiliate_agent_os&utm_medium=staging&utm_campaign=stage_41_trial&utm_content=review",
    status: "active",
  })
  console.log("  Link ID: " + link.id)
  console.log("  Name: " + link.name)
  console.log("  Final URL: " + link.final_url)

  // ── Step 6: Add performance record ──
  console.log("\n=== STEP 6: Add Performance Record ===")
  const perf = await api("POST", "performance_metrics", {
    product_id: product.id,
    campaign_link_id: link.id,
    channel: "test",
    campaign_name: "stage_41_trial",
    clicks: 25,
    conversions: 2,
    revenue: 15.0,
    notes: "Stage 41 staging performance record",
    recorded_at: new Date().toISOString(),
  })
  console.log("  Perf ID: " + perf.id)
  console.log("  Clicks: " + perf.clicks)
  console.log("  Conversions: " + perf.conversions)
  console.log("  Revenue: " + perf.revenue)

  // ── Step 7: Create improvement task ──
  console.log("\n=== STEP 7: Create Improvement Task ===")
  const task = await api("POST", "improvement_tasks", {
    product_id: product.id,
    content_draft_id: draft.id,
    source_type: "manual",
    priority: "medium",
    status: "open",
    title: "Add more detailed comparison section",
    description:
      "Stage 41 test: The review draft could benefit from a comparison with competing products.",
    suggested_action: "Edit draft to add comparison section",
  })
  console.log("  Task ID: " + task.id)
  console.log("  Title: " + task.title)
  console.log("  Status: " + task.status)

  // ── Step 8: Final verification ──
  console.log("\n=== FINAL TABLE COUNTS ===")
  const tables = [
    "products",
    "content_drafts",
    "draft_versions",
    "publishing_jobs",
    "performance_metrics",
    "improvement_tasks",
    "campaign_links",
    "saved_views",
  ]
  for (const t of tables) {
    const c = await count(t)
    console.log("  " + t + ": " + c + " rows")
  }

  console.log("\n=== STAGE 41 TRIAL COMPLETE ===")
}

run().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
