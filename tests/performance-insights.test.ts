import assert from "node:assert/strict"
import test from "node:test"

import {
  buildProductPerformanceSignal,
  buildPerformanceInsights,
  summarizeInsights,
} from "../lib/performance-insights"
import type { PerformanceMetric } from "../types/performance"
import type { Draft } from "../types/draft"

function makeMetric(overrides?: Partial<PerformanceMetric>): PerformanceMetric {
  return {
    id: "metric-1",
    productId: "product-1",
    productName: "Test Product",
    productSlug: "test-product",
    draftId: null,
    draftTitle: null,
    draftTemplateType: null,
    channel: "blog",
    campaignName: null,
    clicks: 5,
    conversions: 0,
    revenue: 0,
    notes: null,
    recordedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeDraft(overrides?: Partial<Draft>): Draft {
  return {
    id: "draft-1",
    productId: "product-1",
    productName: "Test Product",
    productSlug: "test-product",
    contentType: "review",
    templateType: "review",
    title: "Test Review",
    body: "Body text.",
    metaTitle: "Meta",
    metaDescription: "Description",
    targetKeyword: "keyword",
    qualityChecks: {
      has_disclosure: true,
      has_clear_cta: true,
      has_target_keyword: true,
      has_meta_title: true,
      has_meta_description: true,
      avoids_fake_claims: true,
      has_required_structure: true,
    },
    status: "approved",
    aiModel: "manual",
    approvalNotes: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  }
}

test("buildProductPerformanceSignal returns no_data for empty records", () => {
  const result = buildProductPerformanceSignal({
    productId: "p1",
    records: [],
  })
  assert.equal(result.signal, "no_data")
  assert.equal(result.clicks, 0)
  assert.equal(result.records, 0)
})

test("buildProductPerformanceSignal returns converting when conversions exist", () => {
  const result = buildProductPerformanceSignal({
    productId: "p1",
    records: [
      makeMetric({ clicks: 20, conversions: 5, revenue: 100 }),
    ],
  })
  assert.equal(result.signal, "converting")
  assert.equal(result.clicks, 20)
  assert.equal(result.conversions, 5)
  assert.equal(result.revenue, 100)
})

test("buildProductPerformanceSignal returns getting_clicks for low click count without conversions", () => {
  const result = buildProductPerformanceSignal({
    productId: "p1",
    records: [makeMetric({ clicks: 5, conversions: 0 })],
  })
  assert.equal(result.signal, "getting_clicks")
})

test("buildProductPerformanceSignal returns no_conversions for high clicks without conversions", () => {
  const result = buildProductPerformanceSignal({
    productId: "p1",
    records: [makeMetric({ clicks: 15, conversions: 0 })],
  })
  assert.equal(result.signal, "no_conversions")
})

test("buildProductPerformanceSignal returns needs_refresh for stale records", () => {
  const staleDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
  const result = buildProductPerformanceSignal({
    productId: "p1",
    records: [makeMetric({ clicks: 20, conversions: 5, recordedAt: staleDate })],
  })
  assert.equal(result.signal, "needs_refresh")
})

test("buildPerformanceInsights creates clicks_no_conversions insight", () => {
  const insights = buildPerformanceInsights({
    productSummaries: [
      { productId: "p1", productName: "Product A", productSlug: "product-a", records: 3, clicks: 15, conversions: 0, revenue: 0 },
    ],
    channelSummaries: [],
    approvedDrafts: [],
    performanceByProductId: new Map(),
    performanceByDraftId: new Map(),
    latestDraftByProductId: new Map(),
  })
  const insight = insights.find((i) => i.type === "product_clicks_no_conversions")
  assert.ok(insight)
  assert.equal(insight.severity, "warning")
  assert.ok(insight.title.includes("Product A"))
})

test("buildPerformanceInsights creates approved_draft_no_performance insight", () => {
  const insights = buildPerformanceInsights({
    productSummaries: [],
    channelSummaries: [],
    approvedDrafts: [makeDraft({ id: "d1" })],
    performanceByProductId: new Map(),
    performanceByDraftId: new Map(),
    latestDraftByProductId: new Map(),
  })
  const insight = insights.find((i) => i.type === "approved_draft_no_performance")
  assert.ok(insight)
  assert.equal(insight.severity, "info")
})

test("buildPerformanceInsights sorts by severity (warnings before info)", () => {
  const insights = buildPerformanceInsights({
    productSummaries: [
      { productId: "p1", productName: "Product A", productSlug: "product-a", records: 3, clicks: 15, conversions: 0, revenue: 0 },
    ],
    channelSummaries: [],
    approvedDrafts: [makeDraft({ id: "d1" })],
    performanceByProductId: new Map(),
    performanceByDraftId: new Map(),
    latestDraftByProductId: new Map(),
  })
  assert.ok(insights.length >= 2)
  const warningIdx = insights.findIndex((i) => i.severity === "warning")
  const infoIdx = insights.findIndex((i) => i.severity === "info")
  assert.ok(warningIdx < infoIdx)
})

test("summarizeInsights counts correctly", () => {
  const insights = buildPerformanceInsights({
    productSummaries: [
      { productId: "p1", productName: "Product A", productSlug: "product-a", records: 3, clicks: 15, conversions: 0, revenue: 0 },
    ],
    channelSummaries: [
      { channel: "blog", records: 5, clicks: 12, conversions: 0, revenue: 0 },
    ],
    approvedDrafts: [makeDraft({ id: "d1" })],
    performanceByProductId: new Map(),
    performanceByDraftId: new Map(),
    latestDraftByProductId: new Map(),
  })
  const summary = summarizeInsights(insights)
  assert.equal(summary.total, insights.length)
  assert.equal(summary.warning + summary.info + summary.critical, summary.total)
})

test("buildPerformanceInsights creates channel_no_conversions insight", () => {
  const insights = buildPerformanceInsights({
    productSummaries: [],
    channelSummaries: [
      { channel: "email", records: 4, clicks: 20, conversions: 0, revenue: 0 },
    ],
    approvedDrafts: [],
    performanceByProductId: new Map(),
    performanceByDraftId: new Map(),
    latestDraftByProductId: new Map(),
  })
  const insight = insights.find((i) => i.type === "channel_no_conversions")
  assert.ok(insight)
  assert.equal(insight.severity, "warning")
  assert.ok(insight.title.includes("email"))
})

test("buildPerformanceInsights creates high_performance insight", () => {
  const insights = buildPerformanceInsights({
    productSummaries: [
      { productId: "p1", productName: "Top Product", productSlug: "top-product", records: 5, clicks: 30, conversions: 5, revenue: 200 },
    ],
    channelSummaries: [],
    approvedDrafts: [],
    performanceByProductId: new Map(),
    performanceByDraftId: new Map(),
    latestDraftByProductId: new Map(),
  })
  const insight = insights.find((i) => i.type === "product_high_performance")
  assert.ok(insight)
  assert.equal(insight.severity, "info")
  assert.ok(insight.title.includes("Top Product"))
})

test("buildPerformanceInsights returns empty for no data", () => {
  const insights = buildPerformanceInsights({
    productSummaries: [],
    channelSummaries: [],
    approvedDrafts: [],
    performanceByProductId: new Map(),
    performanceByDraftId: new Map(),
    latestDraftByProductId: new Map(),
  })
  assert.equal(insights.length, 0)
  const summary = summarizeInsights(insights)
  assert.equal(summary.total, 0)
})
