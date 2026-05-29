import assert from "node:assert/strict"
import test from "node:test"

import { buildPerformanceInsights } from "../lib/performance-insights"
import type { CampaignLink } from "../types/campaign-link"
import type { PerformanceMetric } from "../types/performance"

function makeCampaignLink(overrides: Partial<CampaignLink> = {}): CampaignLink {
  return {
    id: "cl-1",
    productId: "p-1",
    productName: "Test Product",
    name: "Test Link",
    channel: "email",
    campaignName: "spring",
    source: "newsletter",
    medium: "email",
    term: null,
    content: null,
    baseUrl: "https://example.com",
    finalUrl: "https://example.com?utm_source=newsletter",
    notes: null,
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

function makeRecord(overrides: Partial<PerformanceMetric> = {}): PerformanceMetric {
  return {
    id: "r-1",
    productId: "p-1",
    productName: "Test Product",
    productSlug: "test-product",
    draftId: null,
    draftTitle: null,
    draftTemplateType: null,
    campaignLinkId: "cl-1",
    channel: "email",
    campaignName: "spring",
    clicks: 15,
    conversions: 0,
    revenue: 0,
    notes: null,
    recordedAt: "2026-03-01T00:00:00Z",
    createdAt: "2026-03-01T00:00:00Z",
    ...overrides,
  }
}

const baseParams = {
  productSummaries: [],
  channelSummaries: [],
  approvedDrafts: [],
  performanceByProductId: new Map(),
  performanceByDraftId: new Map(),
  latestDraftByProductId: new Map(),
}

test("creates campaign_link_no_performance insight for active link without records", () => {
  const link = makeCampaignLink()
  const insights = buildPerformanceInsights({
    ...baseParams,
    campaignLinks: [link],
    performanceByCampaignLinkId: new Map(),
  })

  const found = insights.find((i) => i.type === "campaign_link_no_performance")
  assert.ok(found)
  assert.ok(found.title.includes("Test Link"))
})

test("creates campaign_link_clicks_no_conversions insight for 10+ clicks without conversions", () => {
  const link = makeCampaignLink()
  const record = makeRecord({ clicks: 15, conversions: 0 })
  const insights = buildPerformanceInsights({
    ...baseParams,
    campaignLinks: [link],
    performanceByCampaignLinkId: new Map([["cl-1", [record]]]),
  })

  const found = insights.find((i) => i.type === "campaign_link_clicks_no_conversions")
  assert.ok(found)
  assert.ok(found.title.includes("15 clicks"))
})

test("creates campaign_link_high_performance insight for high-performing link", () => {
  const link = makeCampaignLink()
  const record = makeRecord({ clicks: 25, conversions: 5, revenue: 100 })
  const insights = buildPerformanceInsights({
    ...baseParams,
    campaignLinks: [link],
    performanceByCampaignLinkId: new Map([["cl-1", [record]]]),
  })

  const found = insights.find((i) => i.type === "campaign_link_high_performance")
  assert.ok(found)
  assert.ok(found.title.includes("performing well"))
})

test("skips archived campaign links in insights", () => {
  const link = makeCampaignLink({ status: "archived" })
  const insights = buildPerformanceInsights({
    ...baseParams,
    campaignLinks: [link],
    performanceByCampaignLinkId: new Map(),
  })

  const campaignInsights = insights.filter((i) =>
    i.type.startsWith("campaign_link_"),
  )
  assert.equal(campaignInsights.length, 0)
})

test("no campaign link insights when campaignLinks param is omitted", () => {
  const insights = buildPerformanceInsights(baseParams)

  const campaignInsights = insights.filter((i) =>
    i.type.startsWith("campaign_link_"),
  )
  assert.equal(campaignInsights.length, 0)
})
