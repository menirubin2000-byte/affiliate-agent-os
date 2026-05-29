import assert from "node:assert/strict"
import test from "node:test"

import { buildProductWorkspaceSummary } from "../lib/db"
import type { Draft } from "../types/draft"
import type { PerformanceMetric } from "../types/performance"
import type { ImprovementTask } from "../types/improvement-task"

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
    status: "draft",
    aiModel: "manual",
    approvalNotes: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  }
}

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
    clicks: 10,
    conversions: 2,
    revenue: 50,
    notes: null,
    recordedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeTask(overrides?: Partial<ImprovementTask>): ImprovementTask {
  return {
    id: "task-1",
    productId: "product-1",
    productName: "Test Product",
    contentDraftId: null,
    draftTitle: null,
    sourceType: "manual",
    priority: "medium",
    status: "open",
    title: "Test task",
    description: null,
    suggestedAction: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  }
}

test("buildProductWorkspaceSummary returns zeros for empty data", () => {
  const summary = buildProductWorkspaceSummary({
    drafts: [],
    records: [],
    tasks: [],
  })
  assert.equal(summary.draftCount, 0)
  assert.equal(summary.approvedDraftCount, 0)
  assert.equal(summary.pendingDraftCount, 0)
  assert.equal(summary.totalClicks, 0)
  assert.equal(summary.totalConversions, 0)
  assert.equal(summary.totalRevenue, 0)
  assert.equal(summary.performanceRecordCount, 0)
  assert.equal(summary.openTaskCount, 0)
  assert.equal(summary.criticalTaskCount, 0)
})

test("buildProductWorkspaceSummary counts drafts correctly", () => {
  const summary = buildProductWorkspaceSummary({
    drafts: [
      makeDraft({ id: "d1", status: "draft" }),
      makeDraft({ id: "d2", status: "approved" }),
      makeDraft({ id: "d3", status: "approved" }),
      makeDraft({ id: "d4", status: "rejected" }),
    ],
    records: [],
    tasks: [],
  })
  assert.equal(summary.draftCount, 4)
  assert.equal(summary.approvedDraftCount, 2)
  assert.equal(summary.pendingDraftCount, 1)
})

test("buildProductWorkspaceSummary aggregates performance", () => {
  const summary = buildProductWorkspaceSummary({
    drafts: [],
    records: [
      makeMetric({ id: "m1", clicks: 10, conversions: 2, revenue: 50 }),
      makeMetric({ id: "m2", clicks: 20, conversions: 5, revenue: 100 }),
    ],
    tasks: [],
  })
  assert.equal(summary.totalClicks, 30)
  assert.equal(summary.totalConversions, 7)
  assert.equal(summary.totalRevenue, 150)
  assert.equal(summary.performanceRecordCount, 2)
})

test("buildProductWorkspaceSummary counts tasks correctly", () => {
  const summary = buildProductWorkspaceSummary({
    drafts: [],
    records: [],
    tasks: [
      makeTask({ id: "t1", status: "open", priority: "critical" }),
      makeTask({ id: "t2", status: "in_progress", priority: "high" }),
      makeTask({ id: "t3", status: "done", priority: "critical" }),
      makeTask({ id: "t4", status: "dismissed", priority: "medium" }),
    ],
  })
  assert.equal(summary.openTaskCount, 2)
  assert.equal(summary.criticalTaskCount, 1)
})

test("buildProductWorkspaceSummary handles null conversions and revenue", () => {
  const summary = buildProductWorkspaceSummary({
    drafts: [],
    records: [
      makeMetric({ id: "m1", clicks: 5, conversions: null, revenue: null }),
      makeMetric({ id: "m2", clicks: 3, conversions: 1, revenue: 25 }),
    ],
    tasks: [],
  })
  assert.equal(summary.totalClicks, 8)
  assert.equal(summary.totalConversions, 1)
  assert.equal(summary.totalRevenue, 25)
})
