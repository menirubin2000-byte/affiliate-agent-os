import assert from "node:assert/strict"
import test from "node:test"

import { parsePerformanceCsv } from "../lib/performance-import-parser"
import type { PerformanceImportContext } from "../lib/performance-import-parser"
import type { CampaignLink } from "../types/campaign-link"
import type { Product } from "../types/product"

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p-1",
    name: "Test Product",
    slug: "test-product",
    brand: null,
    category: null,
    affiliateUrl: "https://example.com/test",
    price: null,
    commissionRate: null,
    notes: null,
    targetKeyword: null,
    secondaryKeywords: [],
    searchIntent: null,
    contentAngle: null,
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
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

const baseContext: PerformanceImportContext = {
  products: [
    makeProduct({ id: "p-1", name: "Test Product", slug: "test-product" }),
    makeProduct({ id: "p-2", name: "Other Product", slug: "other-product" }),
  ],
  campaignLinks: [
    makeCampaignLink({ id: "cl-1", productId: "p-1", channel: "email", campaignName: "spring" }),
  ],
}

test("parses valid CSV with product_slug", () => {
  const csv = `product_slug,channel,clicks,conversions,revenue,date,notes
test-product,email,120,8,45.00,2026-05-01,First blast
other-product,social,85,3,18.50,2026-05-15,Organic post`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.totalRows, 2)
  assert.equal(result.validRows.length, 2)
  assert.equal(result.errors.length, 0)

  assert.equal(result.validRows[0].productId, "p-1")
  assert.equal(result.validRows[0].productName, "Test Product")
  assert.equal(result.validRows[0].channel, "email")
  assert.equal(result.validRows[0].clicks, 120)
  assert.equal(result.validRows[0].conversions, 8)
  assert.equal(result.validRows[0].revenue, 45.00)
  assert.ok(result.validRows[0].recordedAt)
  assert.equal(result.validRows[0].notes, "First blast")

  assert.equal(result.validRows[1].productId, "p-2")
  assert.equal(result.validRows[1].channel, "social")
})

test("parses valid TSV", () => {
  const tsv = "product_slug\tchannel\tclicks\ntest-product\temail\t50"

  const result = parsePerformanceCsv(tsv, baseContext)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].clicks, 50)
  assert.equal(result.validRows[0].channel, "email")
})

test("resolves product by product_id", () => {
  const csv = `product_id,channel,clicks
p-2,social,30`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].productId, "p-2")
  assert.equal(result.validRows[0].productName, "Other Product")
})

test("reports error for missing product slug", () => {
  const csv = `product_slug,channel,clicks
nonexistent-product,email,10`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 0)
  assert.equal(result.errors.length, 1)
  assert.equal(result.errors[0].field, "product_slug")
  assert.ok(result.errors[0].message.includes("not found"))
})

test("reports error for missing product_id", () => {
  const csv = `product_id,channel,clicks
nonexistent-id,email,10`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 0)
  assert.equal(result.errors.length, 1)
  assert.equal(result.errors[0].field, "product_id")
})

test("resolves product and channel from campaign_link_id", () => {
  const csv = `campaign_link_id,clicks
cl-1,75`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].productId, "p-1")
  assert.equal(result.validRows[0].channel, "email")
  assert.equal(result.validRows[0].campaignName, "spring")
  assert.equal(result.validRows[0].campaignLinkId, "cl-1")
})

test("reports error for invalid campaign_link_id", () => {
  const csv = `campaign_link_id,clicks
bad-link-id,75`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 0)
  // Expect campaign_link_id error and channel error (since link can't provide channel)
  assert.ok(result.errors.length >= 1)
  assert.ok(result.errors.some((e) => e.field === "campaign_link_id"))
  assert.ok(result.errors[0].message.includes("not found"))
})

test("explicit CSV fields override campaign link inherited fields", () => {
  const csv = `campaign_link_id,channel,campaign_name,clicks
cl-1,social,override-campaign,40`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].channel, "social")
  assert.equal(result.validRows[0].campaignName, "override-campaign")
})

test("reports error for missing clicks", () => {
  const csv = `product_slug,channel,clicks
test-product,email,`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 0)
  assert.ok(result.errors.some((e) => e.field === "clicks"))
})

test("reports error for negative clicks", () => {
  const csv = `product_slug,channel,clicks
test-product,email,-5`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 0)
  assert.ok(result.errors.some((e) => e.field === "clicks"))
})

test("reports error for non-integer clicks", () => {
  const csv = `product_slug,channel,clicks
test-product,email,12.5`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 0)
  assert.ok(result.errors.some((e) => e.field === "clicks"))
})

test("reports error for invalid conversions", () => {
  const csv = `product_slug,channel,clicks,conversions
test-product,email,10,abc`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 0)
  assert.ok(result.errors.some((e) => e.field === "conversions"))
})

test("reports error for negative revenue", () => {
  const csv = `product_slug,channel,clicks,revenue
test-product,email,10,-50.00`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 0)
  assert.ok(result.errors.some((e) => e.field === "revenue"))
})

test("reports error for invalid date", () => {
  const csv = `product_slug,channel,clicks,date
test-product,email,10,not-a-date`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 0)
  assert.ok(result.errors.some((e) => e.field === "recorded_at"))
})

test("allows optional fields to be empty", () => {
  const csv = `product_slug,channel,clicks,conversions,revenue,date,notes
test-product,email,10,,,,`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].conversions, null)
  assert.equal(result.validRows[0].revenue, null)
  assert.equal(result.validRows[0].recordedAt, null)
  assert.equal(result.validRows[0].notes, null)
})

test("skips empty rows", () => {
  const csv = `product_slug,channel,clicks
test-product,email,10

other-product,social,20
`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.totalRows, 2)
  assert.equal(result.validRows.length, 2)
})

test("reports error when no product identifier is provided", () => {
  const csv = `channel,clicks
email,10`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 0)
  assert.ok(result.errors.some((e) => e.field === "product_slug"))
})

test("reports error when channel is missing and no campaign link", () => {
  const csv = `product_slug,clicks
test-product,10`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 0)
  assert.ok(result.errors.some((e) => e.field === "channel"))
})

test("handles Windows-style line endings", () => {
  const csv = "product_slug,channel,clicks\r\ntest-product,email,10\r\n"

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].clicks, 10)
})

test("handles quoted CSV fields", () => {
  const csv = `product_slug,channel,clicks,notes
test-product,email,10,"Great campaign, very successful"`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].notes, "Great campaign, very successful")
})

test("returns empty result for header-only input", () => {
  const csv = "product_slug,channel,clicks"
  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.totalRows, 0)
  assert.equal(result.validRows.length, 0)
})

test("returns empty result for empty input", () => {
  const result = parsePerformanceCsv("", baseContext)
  assert.equal(result.totalRows, 0)
  assert.equal(result.validRows.length, 0)
})

test("recognizes column aliases (slug, campaign, date)", () => {
  const csv = `slug,channel,clicks,campaign,date
test-product,email,25,spring-sale,2026-06-01`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].campaignName, "spring-sale")
  assert.ok(result.validRows[0].recordedAt)
})

test("strips dollar signs and commas from revenue", () => {
  const csv = `product_slug,channel,clicks,revenue
test-product,email,10,"$1,234.56"`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].revenue, 1234.56)
})

test("allows decimal revenue values", () => {
  const csv = `product_slug,channel,clicks,revenue
test-product,email,10,99.99`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].revenue, 99.99)
})

test("collects multiple errors from different rows", () => {
  const csv = `product_slug,channel,clicks,conversions
nonexistent,email,10,5
test-product,email,,3
test-product,email,10,-1`

  const result = parsePerformanceCsv(csv, baseContext)
  assert.equal(result.validRows.length, 0)
  assert.ok(result.errors.length >= 3)
})
