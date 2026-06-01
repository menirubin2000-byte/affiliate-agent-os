import assert from "node:assert/strict"
import test from "node:test"

import { getContentTypeForTemplate } from "../lib/ai"
import type { Product } from "../types/product"

test("tiktok_script maps to social_post content type", () => {
  assert.equal(getContentTypeForTemplate("tiktok_script"), "social_post")
})

test("quora_answer maps to social_post content type", () => {
  assert.equal(getContentTypeForTemplate("quora_answer"), "social_post")
})

test("reddit_post maps to social_post content type", () => {
  assert.equal(getContentTypeForTemplate("reddit_post"), "social_post")
})

test("social_post maps to social_post content type", () => {
  assert.equal(getContentTypeForTemplate("social_post"), "social_post")
})

test("review maps to review content type", () => {
  assert.equal(getContentTypeForTemplate("review"), "review")
})

test("comparison maps to review content type", () => {
  assert.equal(getContentTypeForTemplate("comparison"), "review")
})

test("buying_guide maps to review content type", () => {
  assert.equal(getContentTypeForTemplate("buying_guide"), "review")
})

// Simulate the fallback body generator behavior — no "Target keyword" in body
const testProduct: Product = {
  id: "test-1",
  name: "TestProduct",
  slug: "testproduct",
  brand: null,
  category: "SaaS",
  affiliateUrl: "https://example.org/test",
  price: 49,
  commissionRate: 25,
  notes: null,
  targetKeyword: "best test product",
  secondaryKeywords: [],
  searchIntent: null,
  contentAngle: null,
  status: "active",
  createdAt: "2026-05-31T00:00:00.000Z",
  updatedAt: "2026-05-31T00:00:00.000Z",
}

test("fallback body does NOT include 'Target keyword' line for tiktok_script", async () => {
  const { generateDraftForProduct } = await import("../lib/ai")
  const result = await generateDraftForProduct(testProduct, "tiktok_script")
  assert.ok(
    !result.draft.body.includes("Target keyword:"),
    `Body should not contain 'Target keyword:' line. Got: ${result.draft.body}`,
  )
})

test("fallback body does NOT include 'Target keyword' line for quora_answer", async () => {
  const { generateDraftForProduct } = await import("../lib/ai")
  const result = await generateDraftForProduct(testProduct, "quora_answer")
  assert.ok(
    !result.draft.body.includes("Target keyword:"),
    `Body should not contain 'Target keyword:' line. Got: ${result.draft.body}`,
  )
})

test("fallback body does NOT include 'Target keyword' line for reddit_post", async () => {
  const { generateDraftForProduct } = await import("../lib/ai")
  const result = await generateDraftForProduct(testProduct, "reddit_post")
  assert.ok(
    !result.draft.body.includes("Target keyword:"),
    `Body should not contain 'Target keyword:' line. Got: ${result.draft.body}`,
  )
})

test("fallback body does NOT include 'Target keyword' line for review", async () => {
  const { generateDraftForProduct } = await import("../lib/ai")
  const result = await generateDraftForProduct(testProduct, "review")
  assert.ok(
    !result.draft.body.includes("Target keyword:"),
    `Body should not contain 'Target keyword:' line. Got: ${result.draft.body}`,
  )
})

test("AI fallback exposes failureReason when AI is not configured", async () => {
  const { generateDraftForProduct } = await import("../lib/ai")
  const result = await generateDraftForProduct(testProduct, "tiktok_script")
  // When no AI provider is set, this should return a stub with a failure reason
  // (only true if env doesn't have ANTHROPIC_API_KEY or OPENAI_API_KEY set)
  if (result.aiModel === "stub") {
    assert.ok(result.failureReason, "stub should expose failureReason")
  }
})
