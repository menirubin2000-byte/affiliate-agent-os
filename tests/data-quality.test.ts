import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDataQualityIssues,
  checkCampaignLinks,
  checkPerformance,
  checkProducts,
  summarizeDataQuality,
} from "../lib/data-quality"
import type { CampaignLink } from "../types/campaign-link"
import type { Draft, QualityChecks } from "../types/draft"
import type { ImprovementTask } from "../types/improvement-task"
import type { PerformanceMetric } from "../types/performance"
import type { Product } from "../types/product"
import type { SavedView } from "../types/saved-view"

const now = new Date("2026-05-29T12:00:00.000Z")

const passingChecks: QualityChecks = {
  has_disclosure: true,
  has_clear_cta: true,
  has_target_keyword: true,
  has_meta_title: true,
  has_meta_description: true,
  avoids_fake_claims: true,
  has_required_structure: true,
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    name: "Demo Product",
    slug: "demo-product",
    brand: "Demo Brand",
    category: "Software",
    affiliateUrl: "https://example.com/affiliate",
    price: 49,
    commissionRate: 20,
    notes: null,
    targetKeyword: "demo product review",
    secondaryKeywords: [],
    searchIntent: "commercial",
    contentAngle: "Operator-focused review",
    status: "active",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: "draft-1",
    productId: "product-1",
    productName: "Demo Product",
    productSlug: "demo-product",
    contentType: "review",
    templateType: "review",
    title: "Demo Product Review",
    body: "Affiliate disclosure: this is a structured draft with a clear CTA to https://example.com/affiliate.",
    metaTitle: "Demo Product Review",
    metaDescription: "A review of Demo Product for operators.",
    targetKeyword: "demo product review",
    qualityChecks: passingChecks,
    status: "draft",
    aiModel: "manual-claude-code",
    approvalNotes: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeCampaignLink(overrides: Partial<CampaignLink> = {}): CampaignLink {
  return {
    id: "campaign-link-1",
    productId: "product-1",
    productName: "Demo Product",
    name: "Demo Campaign",
    channel: "newsletter",
    campaignName: "spring-launch",
    source: "newsletter",
    medium: "email",
    term: null,
    content: null,
    baseUrl: "https://example.com/affiliate",
    finalUrl: "https://example.com/affiliate?utm_source=newsletter",
    notes: null,
    status: "active",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeMetric(overrides: Partial<PerformanceMetric> = {}): PerformanceMetric {
  return {
    id: "metric-1",
    productId: "product-1",
    productName: "Demo Product",
    productSlug: "demo-product",
    draftId: null,
    draftTitle: null,
    draftTemplateType: null,
    campaignLinkId: "campaign-link-1",
    channel: "newsletter",
    campaignName: "spring-launch",
    clicks: 20,
    conversions: 2,
    revenue: 100,
    notes: null,
    recordedAt: "2026-05-02T00:00:00.000Z",
    createdAt: "2026-05-02T00:00:00.000Z",
    ...overrides,
  }
}

const emptyInput = {
  products: [] as Product[],
  drafts: [] as Draft[],
  versionCounts: new Map<string, number>(),
  campaignLinks: [] as CampaignLink[],
  performanceMetrics: [] as PerformanceMetric[],
  improvementTasks: [] as ImprovementTask[],
  savedViews: [] as SavedView[],
  now,
}

test("product missing SEO issue is informational", () => {
  const issues = checkProducts({
    products: [makeProduct({ targetKeyword: null })],
    drafts: [makeDraft()],
    campaignLinks: [makeCampaignLink()],
  })

  assert.equal(
    issues.some((issue) => issue.area === "products" && issue.severity === "info" && issue.title.includes("missing target keyword")),
    true,
  )
})

test("invalid affiliate URL issue is detected", () => {
  const issues = checkProducts({
    products: [makeProduct({ affiliateUrl: "not-a-url" })],
    drafts: [makeDraft()],
    campaignLinks: [makeCampaignLink()],
  })

  assert.equal(
    issues.some((issue) => issue.area === "products" && issue.severity === "warning" && issue.title.includes("invalid affiliate URL")),
    true,
  )
})

test("performance clicks/conversions contradiction is critical", () => {
  const issues = checkPerformance({
    performanceMetrics: [makeMetric({ clicks: 2, conversions: 3 })],
    productIds: new Set(["product-1"]),
    now,
  })

  assert.equal(
    issues.some((issue) => issue.area === "performance" && issue.severity === "critical" && issue.title.includes("clicks are lower")),
    true,
  )
})

test("future recorded_at detection is a warning", () => {
  const issues = checkPerformance({
    performanceMetrics: [makeMetric({ recordedAt: "2026-06-01T00:00:00.000Z" })],
    productIds: new Set(["product-1"]),
    now,
  })

  assert.equal(
    issues.some((issue) => issue.area === "performance" && issue.severity === "warning" && issue.title.includes("future recorded date")),
    true,
  )
})

test("campaign link missing UTM source is a warning", () => {
  const issues = checkCampaignLinks({
    campaignLinks: [makeCampaignLink({ source: null })],
    performanceMetrics: [makeMetric()],
    now,
  })

  assert.equal(
    issues.some((issue) => issue.area === "campaign_links" && issue.severity === "warning" && issue.title.includes("missing UTM source")),
    true,
  )
})

test("data quality issues sort by severity first", () => {
  const issues = buildDataQualityIssues({
    ...emptyInput,
    products: [
      makeProduct({
        id: "product-1",
        name: "Product One",
        slug: "duplicate-slug",
        affiliateUrl: "",
        targetKeyword: null,
      }),
      makeProduct({
        id: "product-2",
        name: "Product Two",
        slug: "duplicate-slug",
      }),
    ],
  })

  assert.equal(issues[0]?.severity, "critical")
  assert.equal(issues.some((issue) => issue.title.includes("Duplicate product slug")), true)
})

test("data quality summary counts severities and areas", () => {
  const issues = buildDataQualityIssues({
    ...emptyInput,
    products: [makeProduct({ affiliateUrl: "", targetKeyword: null })],
    performanceMetrics: [makeMetric({ clicks: 1, conversions: 2 })],
  })
  const summary = summarizeDataQuality(issues)

  assert.equal(summary.total, issues.length)
  assert.equal(summary.critical >= 2, true)
  assert.equal(summary.byArea.products > 0, true)
  assert.equal(summary.byArea.performance > 0, true)
})
