import assert from "node:assert/strict"
import test from "node:test"

import {
  buildFilterHref,
  getRecommendedViews,
  isJsonSafeFilters,
  isValidViewType,
  VALID_VIEW_TYPES,
  VIEW_TYPE_LABELS,
} from "../lib/saved-views"

// ── Recommended views tests ──

test("getRecommendedViews returns a non-empty array", () => {
  const views = getRecommendedViews()
  assert.ok(views.length > 0)
})

test("each recommended view has required fields", () => {
  const views = getRecommendedViews()
  for (const view of views) {
    assert.ok(view.name, `name is required`)
    assert.ok(view.viewType, `viewType is required`)
    assert.ok(typeof view.filters === "object", `filters must be an object`)
    assert.ok(view.description, `description is required`)
    assert.ok(typeof view.href === "string", `href must be a string`)
  }
})

test("recommended views have valid view types", () => {
  const views = getRecommendedViews()
  for (const view of views) {
    assert.ok(
      VALID_VIEW_TYPES.includes(view.viewType),
      `${view.viewType} should be a valid view type`,
    )
  }
})

test("recommended views include expected presets", () => {
  const views = getRecommendedViews()
  const names = views.map((v) => v.name)
  assert.ok(names.includes("Products needing drafts"))
  assert.ok(names.includes("Approved drafts needing performance"))
  assert.ok(names.includes("Critical improvement tasks"))
  assert.ok(names.includes("Campaign links with no performance"))
  assert.ok(names.includes("Performance with no conversions"))
  assert.ok(names.includes("Reports overview"))
})

test("recommended view hrefs are computed from filters", () => {
  const views = getRecommendedViews()
  const criticalTasks = views.find((v) => v.name === "Critical improvement tasks")
  assert.ok(criticalTasks)
  assert.ok(criticalTasks.href.includes("/dashboard/improvements"))
  assert.ok(criticalTasks.href.includes("priority=critical"))
  assert.ok(criticalTasks.href.includes("status=open"))
})

// ── Filter query string tests ──

test("buildFilterHref returns base route when no filters", () => {
  const href = buildFilterHref("products", {})
  assert.equal(href, "/dashboard/products")
})

test("buildFilterHref appends query params from filters", () => {
  const href = buildFilterHref("drafts", { status: "approved", template: "review" })
  assert.ok(href.startsWith("/dashboard/drafts?"))
  assert.ok(href.includes("status=approved"))
  assert.ok(href.includes("template=review"))
})

test("buildFilterHref skips empty filter values", () => {
  const href = buildFilterHref("performance", { missing_conversions: "1", channel: "" })
  assert.ok(href.includes("missing_conversions=1"))
  assert.ok(!href.includes("channel="))
})

test("buildFilterHref maps each view type to correct route", () => {
  assert.ok(buildFilterHref("products", {}).startsWith("/dashboard/products"))
  assert.ok(buildFilterHref("drafts", {}).startsWith("/dashboard/drafts"))
  assert.ok(buildFilterHref("performance", {}).startsWith("/dashboard/performance"))
  assert.ok(buildFilterHref("campaign_links", {}).startsWith("/dashboard/campaign-links"))
  assert.ok(buildFilterHref("improvements", {}).startsWith("/dashboard/improvements"))
  assert.ok(buildFilterHref("reports", {}).startsWith("/dashboard/reports"))
})

// ── JSON-safe filter validation tests ──

test("isJsonSafeFilters accepts valid string key-value objects", () => {
  assert.equal(isJsonSafeFilters({}), true)
  assert.equal(isJsonSafeFilters({ status: "active" }), true)
  assert.equal(isJsonSafeFilters({ a: "1", b: "2" }), true)
})

test("isJsonSafeFilters rejects non-objects", () => {
  assert.equal(isJsonSafeFilters(null), false)
  assert.equal(isJsonSafeFilters("string"), false)
  assert.equal(isJsonSafeFilters(42), false)
  assert.equal(isJsonSafeFilters(undefined), false)
})

test("isJsonSafeFilters rejects arrays", () => {
  assert.equal(isJsonSafeFilters([]), false)
  assert.equal(isJsonSafeFilters(["a", "b"]), false)
})

test("isJsonSafeFilters rejects objects with non-string values", () => {
  assert.equal(isJsonSafeFilters({ a: 1 }), false)
  assert.equal(isJsonSafeFilters({ a: true }), false)
  assert.equal(isJsonSafeFilters({ a: null }), false)
  assert.equal(isJsonSafeFilters({ a: { nested: "value" } }), false)
})

// ── View type validation tests ──

test("isValidViewType accepts all valid types", () => {
  for (const vt of VALID_VIEW_TYPES) {
    assert.equal(isValidViewType(vt), true, `${vt} should be valid`)
  }
})

test("isValidViewType rejects invalid strings", () => {
  assert.equal(isValidViewType(""), false)
  assert.equal(isValidViewType("unknown"), false)
  assert.equal(isValidViewType("PRODUCTS"), false)
})

// ── Labels test ──

test("VIEW_TYPE_LABELS has entries for all valid types", () => {
  for (const vt of VALID_VIEW_TYPES) {
    assert.ok(VIEW_TYPE_LABELS[vt], `label for ${vt} should exist`)
  }
})
