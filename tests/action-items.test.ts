import assert from "node:assert/strict"
import test from "node:test"

import {
  buildOperatorActionItems,
  normalizePriority,
  summarizeActionItems,
} from "../lib/action-items"
import type { CampaignLink } from "../types/campaign-link"
import type { DataQualityIssue } from "../types/data-quality"
import type { Draft, QualityChecks } from "../types/draft"
import type { ImprovementTask } from "../types/improvement-task"
import type { PerformanceMetric } from "../types/performance"
import type { PerformanceInsight } from "../types/performance-insight"
import type { Product } from "../types/product"
import type { Recommendation } from "../types/recommendation"

const qualityChecks: QualityChecks = {
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
    brand: null,
    category: "Software",
    affiliateUrl: "https://example.com",
    price: null,
    commissionRate: null,
    notes: null,
    targetKeyword: "demo product",
    secondaryKeywords: [],
    searchIntent: null,
    contentAngle: null,
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
    title: "Demo Draft",
    body: "Draft body",
    metaTitle: "Demo Draft",
    metaDescription: "Demo draft description.",
    targetKeyword: "demo product",
    qualityChecks,
    status: "draft",
    aiModel: "manual",
    approvalNotes: null,
    createdAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
    ...overrides,
  }
}

function makeCampaignLink(overrides: Partial<CampaignLink> = {}): CampaignLink {
  return {
    id: "link-1",
    productId: "product-1",
    productName: "Demo Product",
    name: "Newsletter Link",
    channel: "newsletter",
    campaignName: "launch",
    source: "newsletter",
    medium: "email",
    term: null,
    content: null,
    baseUrl: "https://example.com",
    finalUrl: "https://example.com?utm_source=newsletter",
    notes: null,
    status: "active",
    createdAt: "2026-05-03T00:00:00.000Z",
    updatedAt: "2026-05-03T00:00:00.000Z",
    ...overrides,
  }
}

const baseInput = {
  dataQualityIssues: [] as DataQualityIssue[],
  improvementTasks: [] as ImprovementTask[],
  recommendations: [] as Recommendation[],
  performanceInsights: [] as PerformanceInsight[],
  drafts: [] as Draft[],
  products: [] as Product[],
  campaignLinks: [] as CampaignLink[],
  performanceMetrics: [] as PerformanceMetric[],
}

test("normalizes severities and priorities", () => {
  assert.equal(normalizePriority("critical"), "critical")
  assert.equal(normalizePriority("warning"), "high")
  assert.equal(normalizePriority("medium"), "medium")
  assert.equal(normalizePriority("low"), "low")
  assert.equal(normalizePriority("info"), "info")
})

test("aggregates action items from multiple sources", () => {
  const items = buildOperatorActionItems({
    ...baseInput,
    dataQualityIssues: [
      {
        id: "dq-1",
        area: "products",
        severity: "critical",
        title: "Product missing URL",
        description: "Affiliate URL is missing.",
        relatedEntityType: "product",
        relatedEntityId: "product-1",
        actionLabel: "Open product",
        actionHref: "/dashboard/products/product-1",
      },
    ],
    improvementTasks: [
      {
        id: "task-1",
        productId: "product-1",
        productName: "Demo Product",
        contentDraftId: null,
        draftTitle: null,
        sourceType: "manual",
        priority: "high",
        status: "open",
        title: "Fix CTA",
        description: "CTA is weak.",
        suggestedAction: "Open task",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
      },
    ],
    performanceInsights: [
      {
        id: "insight-1",
        type: "channel_no_conversions",
        severity: "warning",
        title: "Newsletter has clicks but no conversions",
        description: "Traffic is not converting.",
        relatedEntityType: "channel",
        relatedEntityKey: "newsletter",
        actionLabel: "View channel",
        actionHref: "/dashboard/performance?channel=newsletter",
      },
    ],
    drafts: [makeDraft()],
    products: [makeProduct({ id: "product-2", name: "Needs Draft", slug: "needs-draft" })],
    campaignLinks: [makeCampaignLink()],
  })

  assert.equal(items.some((item) => item.source === "data_quality"), true)
  assert.equal(items.some((item) => item.source === "improvement_task"), true)
  assert.equal(items.some((item) => item.source === "performance_insight"), true)
  assert.equal(items.some((item) => item.source === "draft"), true)
  assert.equal(items.some((item) => item.source === "product"), true)
  assert.equal(items.some((item) => item.source === "campaign_link"), true)
})

test("sorts critical and high priority actions first, then older items", () => {
  const items = buildOperatorActionItems({
    ...baseInput,
    improvementTasks: [
      {
        id: "task-new",
        productId: null,
        productName: null,
        contentDraftId: null,
        draftTitle: null,
        sourceType: "manual",
        priority: "high",
        status: "open",
        title: "New high task",
        description: null,
        suggestedAction: null,
        createdAt: "2026-05-10T00:00:00.000Z",
        updatedAt: "2026-05-10T00:00:00.000Z",
      },
      {
        id: "task-old",
        productId: null,
        productName: null,
        contentDraftId: null,
        draftTitle: null,
        sourceType: "manual",
        priority: "high",
        status: "open",
        title: "Old high task",
        description: null,
        suggestedAction: null,
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
      },
    ],
    dataQualityIssues: [
      {
        id: "critical",
        area: "performance",
        severity: "critical",
        title: "Critical issue",
        description: "Critical issue.",
        relatedEntityType: "performance",
        relatedEntityId: "metric-1",
        actionLabel: "Open performance",
        actionHref: "/dashboard/performance",
      },
    ],
  })

  assert.equal(items[0]?.priority, "critical")
  assert.equal(items[1]?.title, "Old high task")
  assert.equal(items[2]?.title, "New high task")
})

test("prevents obvious duplicate action items", () => {
  const items = buildOperatorActionItems({
    ...baseInput,
    dataQualityIssues: [
      {
        id: "dq-1",
        area: "products",
        severity: "warning",
        title: "Demo Product needs review",
        description: "Data quality copy.",
        relatedEntityType: "product",
        relatedEntityId: "product-1",
        actionLabel: "Open product",
        actionHref: "/dashboard/products/product-1",
      },
    ],
    recommendations: [
      {
        id: "rec-1",
        type: "product_no_drafts",
        severity: "warning",
        title: "Demo Product needs review",
        description: "Recommendation copy.",
        relatedEntityType: "product",
        relatedEntityKey: "product-1",
        actionLabel: "Open product",
        actionHref: "/dashboard/products/product-1",
      },
    ],
  })

  assert.equal(items.length, 1)
})

test("summarizes action item counts by priority and source", () => {
  const items = buildOperatorActionItems({
    ...baseInput,
    dataQualityIssues: [
      {
        id: "dq-1",
        area: "products",
        severity: "critical",
        title: "Critical data issue",
        description: "Critical.",
        relatedEntityType: "product",
        relatedEntityId: "product-1",
        actionLabel: "Open product",
        actionHref: "/dashboard/products/product-1",
      },
    ],
    drafts: [makeDraft()],
    campaignLinks: [makeCampaignLink()],
  })
  const summary = summarizeActionItems(items)

  assert.equal(summary.total, items.length)
  assert.equal(summary.critical, 1)
  assert.equal(summary.high, 1)
  assert.equal(summary.bySource.data_quality, 1)
  assert.equal(summary.bySource.draft, 1)
  assert.equal(summary.bySource.campaign_link, 1)
})
