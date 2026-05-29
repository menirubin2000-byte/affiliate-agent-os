import assert from "node:assert/strict"
import test from "node:test"

import {
  escapeCsvField,
  toCsvRow,
  toCsv,
  buildReportSummary,
  buildProductReport,
  buildCampaignReport,
  buildDraftReport,
  buildTaskReport,
  productReportToCsv,
  campaignReportToCsv,
  draftReportToCsv,
  taskReportToCsv,
} from "../lib/csv-export"
import type { CampaignLink } from "../types/campaign-link"
import type { Draft, QualityChecks } from "../types/draft"
import type { ImprovementTask } from "../types/improvement-task"
import type { PerformanceMetric } from "../types/performance"
import type { ProductPerformanceSignal } from "../types/performance-insight"
import type { Product } from "../types/product"

// ── CSV escaping tests ──

test("escapeCsvField returns plain fields unchanged", () => {
  assert.equal(escapeCsvField("hello"), "hello")
  assert.equal(escapeCsvField("123"), "123")
})

test("escapeCsvField wraps fields with commas in quotes", () => {
  assert.equal(escapeCsvField("hello, world"), '"hello, world"')
})

test("escapeCsvField escapes double quotes", () => {
  assert.equal(escapeCsvField('say "hi"'), '"say ""hi"""')
})

test("escapeCsvField wraps fields with newlines in quotes", () => {
  assert.equal(escapeCsvField("line1\nline2"), '"line1\nline2"')
})

test("escapeCsvField handles combined special characters", () => {
  assert.equal(escapeCsvField('a,b\n"c"'), '"a,b\n""c"""')
})

test("toCsvRow joins fields with commas", () => {
  assert.equal(toCsvRow(["a", "b", "c"]), "a,b,c")
})

test("toCsvRow escapes fields as needed", () => {
  assert.equal(toCsvRow(["hello", "world, ok", "test"]), 'hello,"world, ok",test')
})

test("toCsv produces header and data rows", () => {
  const csv = toCsv(["Name", "Value"], [["a", "1"], ["b", "2"]])
  const lines = csv.split("\n")
  assert.equal(lines.length, 3)
  assert.equal(lines[0], "Name,Value")
  assert.equal(lines[1], "a,1")
  assert.equal(lines[2], "b,2")
})

test("toCsv with empty rows returns only header", () => {
  const csv = toCsv(["Name"], [])
  assert.equal(csv, "Name")
})

// ── Report summary tests ──

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p-1",
    name: "Test Product",
    slug: "test-product",
    brand: null,
    category: "Electronics",
    affiliateUrl: "https://example.com/test",
    price: null,
    commissionRate: null,
    notes: null,
    targetKeyword: "best test",
    secondaryKeywords: [],
    searchIntent: null,
    contentAngle: null,
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

const qualityChecksAllPass: QualityChecks = {
  has_disclosure: true,
  has_clear_cta: true,
  has_target_keyword: true,
  has_meta_title: true,
  has_meta_description: true,
  avoids_fake_claims: true,
  has_required_structure: true,
}

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: "d-1",
    productId: "p-1",
    productName: "Test Product",
    productSlug: "test-product",
    contentType: "review",
    templateType: "review",
    title: "Test Draft",
    body: "body",
    metaTitle: "meta",
    metaDescription: "desc",
    targetKeyword: "test",
    qualityChecks: qualityChecksAllPass,
    status: "approved",
    aiModel: null,
    approvalNotes: null,
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
    ...overrides,
  }
}

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

function makePerformanceMetric(overrides: Partial<PerformanceMetric> = {}): PerformanceMetric {
  return {
    id: "m-1",
    productId: "p-1",
    productName: "Test Product",
    productSlug: "test-product",
    draftId: null,
    draftTitle: null,
    draftTemplateType: null,
    campaignLinkId: "cl-1",
    channel: "email",
    campaignName: "spring",
    clicks: 100,
    conversions: 10,
    revenue: 50.00,
    notes: null,
    recordedAt: "2026-03-01T00:00:00Z",
    createdAt: "2026-03-01T00:00:00Z",
    ...overrides,
  }
}

function makeTask(overrides: Partial<ImprovementTask> = {}): ImprovementTask {
  return {
    id: "t-1",
    productId: "p-1",
    productName: "Test Product",
    contentDraftId: null,
    draftTitle: null,
    sourceType: "manual",
    priority: "medium",
    status: "open",
    title: "Fix something",
    description: "Fix the thing",
    suggestedAction: "Go fix it",
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    ...overrides,
  }
}

test("buildReportSummary counts products correctly", () => {
  const products = [
    makeProduct({ id: "p-1", status: "active" }),
    makeProduct({ id: "p-2", status: "inactive" }),
    makeProduct({ id: "p-3", status: "active" }),
  ]

  const summary = buildReportSummary({
    products,
    drafts: [],
    campaignLinks: [],
    performanceMetrics: [],
    improvementTasks: [],
  })

  assert.equal(summary.totalProducts, 3)
  assert.equal(summary.activeProducts, 2)
})

test("buildReportSummary counts drafts correctly", () => {
  const drafts = [
    makeDraft({ id: "d-1", status: "approved" }),
    makeDraft({ id: "d-2", status: "draft" }),
    makeDraft({ id: "d-3", status: "approved" }),
  ]

  const summary = buildReportSummary({
    products: [],
    drafts,
    campaignLinks: [],
    performanceMetrics: [],
    improvementTasks: [],
  })

  assert.equal(summary.totalDrafts, 3)
  assert.equal(summary.approvedDrafts, 2)
})

test("buildReportSummary aggregates performance metrics", () => {
  const metrics = [
    makePerformanceMetric({ clicks: 100, conversions: 10, revenue: 50 }),
    makePerformanceMetric({ id: "m-2", clicks: 200, conversions: null, revenue: null }),
  ]

  const summary = buildReportSummary({
    products: [],
    drafts: [],
    campaignLinks: [],
    performanceMetrics: metrics,
    improvementTasks: [],
  })

  assert.equal(summary.totalClicks, 300)
  assert.equal(summary.totalConversions, 10)
  assert.equal(summary.totalRevenue, 50)
})

test("buildReportSummary counts campaign links correctly", () => {
  const links = [
    makeCampaignLink({ id: "cl-1", status: "active" }),
    makeCampaignLink({ id: "cl-2", status: "archived" }),
  ]

  const summary = buildReportSummary({
    products: [],
    drafts: [],
    campaignLinks: links,
    performanceMetrics: [],
    improvementTasks: [],
  })

  assert.equal(summary.totalCampaignLinks, 2)
  assert.equal(summary.activeCampaignLinks, 1)
})

test("buildReportSummary counts open and critical tasks", () => {
  const tasks = [
    makeTask({ id: "t-1", status: "open", priority: "critical" }),
    makeTask({ id: "t-2", status: "in_progress", priority: "high" }),
    makeTask({ id: "t-3", status: "done", priority: "critical" }),
    makeTask({ id: "t-4", status: "open", priority: "low" }),
  ]

  const summary = buildReportSummary({
    products: [],
    drafts: [],
    campaignLinks: [],
    performanceMetrics: [],
    improvementTasks: tasks,
  })

  assert.equal(summary.openTasks, 3) // open + in_progress
  assert.equal(summary.criticalTasks, 1) // only open/in_progress critical
})

// ── Product report derivation tests ──

test("buildProductReport aggregates per-product data", () => {
  const products = [makeProduct({ id: "p-1", name: "Product A" })]
  const drafts = [
    makeDraft({ id: "d-1", productId: "p-1", status: "approved" }),
    makeDraft({ id: "d-2", productId: "p-1", status: "draft" }),
  ]
  const links = [makeCampaignLink({ id: "cl-1", productId: "p-1" })]
  const metrics = [
    makePerformanceMetric({ productId: "p-1", clicks: 50, conversions: 5, revenue: 25 }),
    makePerformanceMetric({ id: "m-2", productId: "p-1", clicks: 30, conversions: 3, revenue: 15 }),
  ]
  const tasks = [makeTask({ productId: "p-1", status: "open" })]
  const signals = new Map<string, ProductPerformanceSignal>([
    ["p-1", { productId: "p-1", signal: "converting", label: "Converting", clicks: 80, conversions: 8, revenue: 40, records: 2, latestRecordAge: 5 }],
  ])

  const rows = buildProductReport({ products, drafts, campaignLinks: links, performanceMetrics: metrics, improvementTasks: tasks, signals })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].productName, "Product A")
  assert.equal(rows[0].draftCount, 2)
  assert.equal(rows[0].approvedDraftCount, 1)
  assert.equal(rows[0].campaignLinkCount, 1)
  assert.equal(rows[0].clicks, 80)
  assert.equal(rows[0].conversions, 8)
  assert.equal(rows[0].revenue, 40)
  assert.equal(rows[0].conversionRate, "10.0%")
  assert.equal(rows[0].openTasks, 1)
  assert.equal(rows[0].performanceSignal, "Converting")
})

test("buildProductReport handles product with no data", () => {
  const products = [makeProduct({ id: "p-2", name: "Empty Product" })]
  const signals = new Map<string, ProductPerformanceSignal>()

  const rows = buildProductReport({
    products,
    drafts: [],
    campaignLinks: [],
    performanceMetrics: [],
    improvementTasks: [],
    signals,
  })

  assert.equal(rows.length, 1)
  assert.equal(rows[0].clicks, 0)
  assert.equal(rows[0].conversionRate, "")
  assert.equal(rows[0].performanceSignal, "No data")
})

// ── Campaign report derivation tests ──

test("buildCampaignReport aggregates per-link data", () => {
  const links = [makeCampaignLink({ id: "cl-1" })]
  const metrics = [
    makePerformanceMetric({ campaignLinkId: "cl-1", clicks: 60, conversions: 6, revenue: 30, recordedAt: "2026-05-15T00:00:00Z" }),
    makePerformanceMetric({ id: "m-2", campaignLinkId: "cl-1", clicks: 40, conversions: 4, revenue: 20, recordedAt: "2026-05-20T00:00:00Z" }),
  ]

  const rows = buildCampaignReport({ campaignLinks: links, performanceMetrics: metrics })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].clicks, 100)
  assert.equal(rows[0].conversions, 10)
  assert.equal(rows[0].revenue, 50)
  assert.equal(rows[0].conversionRate, "10.0%")
  assert.equal(rows[0].lastRecordedDate, "2026-05-20")
})

test("buildCampaignReport handles link with no performance", () => {
  const links = [makeCampaignLink({ id: "cl-2" })]
  const rows = buildCampaignReport({ campaignLinks: links, performanceMetrics: [] })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].clicks, 0)
  assert.equal(rows[0].lastRecordedDate, null)
  assert.equal(rows[0].conversionRate, "")
})

// ── Draft report derivation tests ──

test("buildDraftReport calculates quality score", () => {
  const partialChecks: QualityChecks = {
    has_disclosure: true,
    has_clear_cta: true,
    has_target_keyword: false,
    has_meta_title: true,
    has_meta_description: false,
    avoids_fake_claims: true,
    has_required_structure: true,
  }
  const drafts = [makeDraft({ id: "d-1", qualityChecks: partialChecks })]
  const versionCounts = new Map([["d-1", 3]])
  const perfCounts = new Map([["d-1", 2]])

  const rows = buildDraftReport({ drafts, versionCounts, performanceRecordCounts: perfCounts })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].qualityScore, "5/7")
  assert.equal(rows[0].versionCount, 3)
  assert.equal(rows[0].performanceRecords, 2)
})

test("buildDraftReport defaults to zero for missing counts", () => {
  const drafts = [makeDraft({ id: "d-1" })]
  const rows = buildDraftReport({ drafts, versionCounts: new Map(), performanceRecordCounts: new Map() })
  assert.equal(rows[0].versionCount, 0)
  assert.equal(rows[0].performanceRecords, 0)
})

// ── Task report derivation tests ──

test("buildTaskReport maps task fields correctly", () => {
  const tasks = [makeTask({ title: "Fix issue", priority: "high", status: "in_progress", suggestedAction: "Update code" })]
  const rows = buildTaskReport({ tasks })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].title, "Fix issue")
  assert.equal(rows[0].priority, "high")
  assert.equal(rows[0].status, "in_progress")
  assert.equal(rows[0].suggestedAction, "Update code")
})

// ── CSV generation tests ──

test("productReportToCsv generates valid CSV string", () => {
  const rows = [{
    productName: "Test Product",
    category: "Electronics",
    targetKeyword: "best test",
    draftCount: 2,
    approvedDraftCount: 1,
    campaignLinkCount: 1,
    clicks: 100,
    conversions: 10,
    revenue: 50,
    conversionRate: "10.0%",
    openTasks: 1,
    performanceSignal: "Converting",
  }]

  const csv = productReportToCsv(rows)
  const lines = csv.split("\n")
  assert.equal(lines.length, 2)
  assert.ok(lines[0].includes("Product"))
  assert.ok(lines[1].includes("Test Product"))
  assert.ok(lines[1].includes("50.00"))
})

test("campaignReportToCsv generates valid CSV string", () => {
  const rows = [{
    linkName: "Test Link",
    productName: "Test Product",
    channel: "email",
    campaignName: "spring",
    clicks: 100,
    conversions: 10,
    revenue: 50,
    conversionRate: "10.0%",
    status: "active",
    lastRecordedDate: "2026-05-20",
  }]

  const csv = campaignReportToCsv(rows)
  const lines = csv.split("\n")
  assert.equal(lines.length, 2)
  assert.ok(lines[0].includes("Campaign Link"))
  assert.ok(lines[1].includes("Test Link"))
})

test("draftReportToCsv generates valid CSV string", () => {
  const rows = [{
    title: "Test Draft",
    productName: "Test Product",
    templateType: "review",
    status: "approved",
    qualityScore: "7/7",
    versionCount: 2,
    performanceRecords: 1,
    createdAt: "2026-02-01",
  }]

  const csv = draftReportToCsv(rows)
  const lines = csv.split("\n")
  assert.equal(lines.length, 2)
  assert.ok(lines[0].includes("Title"))
  assert.ok(lines[1].includes("Test Draft"))
})

test("taskReportToCsv generates valid CSV string", () => {
  const rows = [{
    title: "Fix something",
    productName: "Test Product",
    draftTitle: null,
    sourceType: "manual",
    priority: "high",
    status: "open",
    suggestedAction: "Go fix it",
    createdAt: "2026-04-01",
  }]

  const csv = taskReportToCsv(rows)
  const lines = csv.split("\n")
  assert.equal(lines.length, 2)
  assert.ok(lines[0].includes("Title"))
  assert.ok(lines[1].includes("Fix something"))
})

test("CSV export handles fields with commas correctly", () => {
  const rows = [{
    productName: "Product A, Deluxe",
    category: null,
    targetKeyword: null,
    draftCount: 0,
    approvedDraftCount: 0,
    campaignLinkCount: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    conversionRate: "",
    openTasks: 0,
    performanceSignal: "No data",
  }]

  const csv = productReportToCsv(rows)
  assert.ok(csv.includes('"Product A, Deluxe"'))
})

test("CSV export handles fields with quotes correctly", () => {
  const rows = [{
    title: 'Fix "that" bug',
    productName: null,
    draftTitle: null,
    sourceType: "manual",
    priority: "low",
    status: "open",
    suggestedAction: null,
    createdAt: "2026-01-01",
  }]

  const csv = taskReportToCsv(rows)
  assert.ok(csv.includes('"Fix ""that"" bug"'))
})
