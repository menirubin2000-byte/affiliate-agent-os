import assert from "node:assert/strict"
import test from "node:test"

import { parseProductCsv } from "../lib/product-import-parser"

test("parses valid CSV with all fields", () => {
  const csv = `name,slug,affiliate_url,brand,category,price,commission_rate,target_keyword,status
Product A,product-a,https://example.com/a,BrandX,Electronics,29.99,0.10,best product a,active
Product B,product-b,https://example.com/b,BrandY,Home,49.99,0.15,product b review,inactive`

  const result = parseProductCsv(csv)
  assert.equal(result.totalRows, 2)
  assert.equal(result.validRows.length, 2)
  assert.equal(result.errors.length, 0)

  assert.equal(result.validRows[0].name, "Product A")
  assert.equal(result.validRows[0].slug, "product-a")
  assert.equal(result.validRows[0].affiliateUrl, "https://example.com/a")
  assert.equal(result.validRows[0].brand, "BrandX")
  assert.equal(result.validRows[0].price, 29.99)
  assert.equal(result.validRows[0].commissionRate, 0.10)
  assert.equal(result.validRows[0].status, "active")
  assert.equal(result.validRows[1].status, "inactive")
})

test("reports missing required fields", () => {
  const csv = `name,slug,affiliate_url
,product-a,https://example.com/a
Product B,,https://example.com/b
Product C,product-c,`

  const result = parseProductCsv(csv)
  assert.equal(result.validRows.length, 0)
  assert.equal(result.errors.length, 3)

  const nameErr = result.errors.find((e) => e.rowIndex === 2 && e.field === "name")
  assert.ok(nameErr)
  const slugErr = result.errors.find((e) => e.rowIndex === 3 && e.field === "slug")
  assert.ok(slugErr)
  const urlErr = result.errors.find((e) => e.rowIndex === 4 && e.field === "affiliate_url")
  assert.ok(urlErr)
})

test("detects duplicate slugs in import", () => {
  const csv = `name,slug,affiliate_url
Product A,product-a,https://example.com/a
Product B,product-a,https://example.com/b`

  const result = parseProductCsv(csv)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.duplicateSlugs.length, 1)
  assert.equal(result.duplicateSlugs[0], "product-a")
})

test("rejects invalid URLs", () => {
  const csv = `name,slug,affiliate_url
Product A,product-a,not-a-url
Product B,product-b,ftp://bad.com/path`

  const result = parseProductCsv(csv)
  assert.equal(result.validRows.length, 0)
  const urlErrors = result.errors.filter((e) => e.field === "affiliate_url")
  assert.equal(urlErrors.length, 2)
})

test("parses secondary keywords with semicolons", () => {
  const csv = `name,slug,affiliate_url,secondary_keywords
Product A,product-a,https://example.com/a,keyword1;keyword2;keyword3`

  const result = parseProductCsv(csv)
  assert.equal(result.validRows.length, 1)
  assert.deepEqual(result.validRows[0].secondaryKeywords, ["keyword1", "keyword2", "keyword3"])
})

test("ignores empty rows", () => {
  const csv = `name,slug,affiliate_url
Product A,product-a,https://example.com/a

Product B,product-b,https://example.com/b
`

  const result = parseProductCsv(csv)
  assert.equal(result.totalRows, 2)
  assert.equal(result.validRows.length, 2)
})

test("handles numeric parsing for price and commission", () => {
  const csv = `name,slug,affiliate_url,price,commission_rate
Product A,product-a,https://example.com/a,$29.99,0.15
Product B,product-b,https://example.com/b,bad_price,0.10
Product C,product-c,https://example.com/c,49.99,-0.05`

  const result = parseProductCsv(csv)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].price, 29.99)
  assert.equal(result.validRows[0].commissionRate, 0.15)

  const priceErr = result.errors.find((e) => e.rowIndex === 3 && e.field === "price")
  assert.ok(priceErr)
  const commErr = result.errors.find((e) => e.rowIndex === 4 && e.field === "commission_rate")
  assert.ok(commErr)
})

test("parses tab-separated values", () => {
  const tsv = "name\tslug\taffiliate_url\tbrand\nProduct A\tproduct-a\thttps://example.com/a\tBrandX"

  const result = parseProductCsv(tsv)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].name, "Product A")
  assert.equal(result.validRows[0].brand, "BrandX")
})

test("handles Windows-style line endings", () => {
  const csv = "name,slug,affiliate_url\r\nProduct A,product-a,https://example.com/a\r\n"

  const result = parseProductCsv(csv)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].name, "Product A")
})

test("handles quoted CSV fields", () => {
  const csv = `name,slug,affiliate_url,notes
"Product A, Deluxe",product-a,https://example.com/a,"Great product, highly rated"`

  const result = parseProductCsv(csv)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].name, "Product A, Deluxe")
  assert.equal(result.validRows[0].notes, "Great product, highly rated")
})

test("returns empty result for header-only input", () => {
  const csv = "name,slug,affiliate_url"
  const result = parseProductCsv(csv)
  assert.equal(result.totalRows, 0)
  assert.equal(result.validRows.length, 0)
})

test("returns empty result for empty input", () => {
  const result = parseProductCsv("")
  assert.equal(result.totalRows, 0)
  assert.equal(result.validRows.length, 0)
})

test("defaults status to active when not provided", () => {
  const csv = `name,slug,affiliate_url
Product A,product-a,https://example.com/a`

  const result = parseProductCsv(csv)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].status, "active")
})

test("rejects invalid status values", () => {
  const csv = `name,slug,affiliate_url,status
Product A,product-a,https://example.com/a,archived`

  const result = parseProductCsv(csv)
  assert.equal(result.validRows.length, 0)
  const err = result.errors.find((e) => e.field === "status")
  assert.ok(err)
})

test("recognizes alternative header names", () => {
  const csv = `product_name,product_slug,url,keyword
Product A,product-a,https://example.com/a,my keyword`

  const result = parseProductCsv(csv)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.validRows[0].targetKeyword, "my keyword")
})
