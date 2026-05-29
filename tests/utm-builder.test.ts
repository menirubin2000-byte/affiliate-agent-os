import assert from "node:assert/strict"
import test from "node:test"

import { buildUtmUrl, extractUtmParams, isValidHttpUrl } from "../lib/utm-builder"

test("isValidHttpUrl accepts https URLs", () => {
  assert.equal(isValidHttpUrl("https://example.com/path"), true)
})

test("isValidHttpUrl accepts http URLs", () => {
  assert.equal(isValidHttpUrl("http://example.com"), true)
})

test("isValidHttpUrl rejects non-http URLs", () => {
  assert.equal(isValidHttpUrl("ftp://example.com"), false)
  assert.equal(isValidHttpUrl("not-a-url"), false)
  assert.equal(isValidHttpUrl(""), false)
})

test("buildUtmUrl adds UTM params to a base URL", () => {
  const result = buildUtmUrl("https://example.com/product", {
    utmSource: "newsletter",
    utmMedium: "email",
    utmCampaign: "spring-sale",
  })
  assert.equal(result.valid, true)
  const url = new URL(result.finalUrl)
  assert.equal(url.searchParams.get("utm_source"), "newsletter")
  assert.equal(url.searchParams.get("utm_medium"), "email")
  assert.equal(url.searchParams.get("utm_campaign"), "spring-sale")
})

test("buildUtmUrl preserves existing non-UTM query params", () => {
  const result = buildUtmUrl("https://example.com/product?ref=abc&tag=123", {
    utmSource: "twitter",
  })
  assert.equal(result.valid, true)
  const url = new URL(result.finalUrl)
  assert.equal(url.searchParams.get("ref"), "abc")
  assert.equal(url.searchParams.get("tag"), "123")
  assert.equal(url.searchParams.get("utm_source"), "twitter")
})

test("buildUtmUrl replaces existing UTM params", () => {
  const result = buildUtmUrl(
    "https://example.com/product?utm_source=old_source&utm_medium=old_medium&ref=keep",
    {
      utmSource: "new_source",
      utmMedium: "new_medium",
    },
  )
  assert.equal(result.valid, true)
  const url = new URL(result.finalUrl)
  assert.equal(url.searchParams.get("utm_source"), "new_source")
  assert.equal(url.searchParams.get("utm_medium"), "new_medium")
  assert.equal(url.searchParams.get("ref"), "keep")
})

test("buildUtmUrl skips empty UTM values", () => {
  const result = buildUtmUrl("https://example.com", {
    utmSource: "newsletter",
    utmMedium: "",
    utmCampaign: null,
    utmTerm: undefined,
  })
  assert.equal(result.valid, true)
  const url = new URL(result.finalUrl)
  assert.equal(url.searchParams.get("utm_source"), "newsletter")
  assert.equal(url.searchParams.has("utm_medium"), false)
  assert.equal(url.searchParams.has("utm_campaign"), false)
  assert.equal(url.searchParams.has("utm_term"), false)
})

test("buildUtmUrl returns error for empty URL", () => {
  const result = buildUtmUrl("", { utmSource: "test" })
  assert.equal(result.valid, false)
  assert.ok(result.error)
})

test("buildUtmUrl returns error for invalid URL", () => {
  const result = buildUtmUrl("not-a-url", { utmSource: "test" })
  assert.equal(result.valid, false)
  assert.ok(result.error)
})

test("buildUtmUrl returns error for ftp URL", () => {
  const result = buildUtmUrl("ftp://example.com/file", { utmSource: "test" })
  assert.equal(result.valid, false)
  assert.ok(result.error)
})

test("buildUtmUrl supports all five UTM params", () => {
  const result = buildUtmUrl("https://example.com", {
    utmSource: "google",
    utmMedium: "cpc",
    utmCampaign: "summer",
    utmTerm: "headphones",
    utmContent: "banner-ad",
  })
  assert.equal(result.valid, true)
  const url = new URL(result.finalUrl)
  assert.equal(url.searchParams.get("utm_source"), "google")
  assert.equal(url.searchParams.get("utm_medium"), "cpc")
  assert.equal(url.searchParams.get("utm_campaign"), "summer")
  assert.equal(url.searchParams.get("utm_term"), "headphones")
  assert.equal(url.searchParams.get("utm_content"), "banner-ad")
})

test("buildUtmUrl trims whitespace from values", () => {
  const result = buildUtmUrl("  https://example.com  ", {
    utmSource: "  newsletter  ",
  })
  assert.equal(result.valid, true)
  const url = new URL(result.finalUrl)
  assert.equal(url.searchParams.get("utm_source"), "newsletter")
})

test("extractUtmParams extracts UTM params from URL", () => {
  const params = extractUtmParams(
    "https://example.com?utm_source=test&utm_medium=email&ref=abc",
  )
  assert.equal(params.utmSource, "test")
  assert.equal(params.utmMedium, "email")
  assert.equal(params.utmCampaign, null)
})

test("extractUtmParams returns empty for invalid URL", () => {
  const params = extractUtmParams("not-a-url")
  assert.equal(params.utmSource, undefined)
})

test("buildUtmUrl with no UTM params returns base URL unchanged", () => {
  const result = buildUtmUrl("https://example.com/product?ref=abc", {})
  assert.equal(result.valid, true)
  const url = new URL(result.finalUrl)
  assert.equal(url.searchParams.get("ref"), "abc")
  assert.equal(url.searchParams.has("utm_source"), false)
})
