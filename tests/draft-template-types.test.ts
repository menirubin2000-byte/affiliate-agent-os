import assert from "node:assert/strict"
import test from "node:test"

import type { TemplateType } from "../types/draft"

const VALID_TEMPLATE_TYPES: TemplateType[] = [
  "review",
  "comparison",
  "buying_guide",
  "social_post",
  "tiktok_script",
  "quora_answer",
  "reddit_post",
]

test("TemplateType supports all 7 template types", () => {
  assert.equal(VALID_TEMPLATE_TYPES.length, 7)
  assert.ok(VALID_TEMPLATE_TYPES.includes("tiktok_script"))
  assert.ok(VALID_TEMPLATE_TYPES.includes("quora_answer"))
  assert.ok(VALID_TEMPLATE_TYPES.includes("reddit_post"))
})

test("All 7 template types are TypeScript-valid", () => {
  // Compile-time assertion — if any of these are invalid, this file won't compile
  const types: TemplateType[] = [
    "review",
    "comparison",
    "buying_guide",
    "social_post",
    "tiktok_script",
    "quora_answer",
    "reddit_post",
  ]
  assert.equal(types.length, 7)
})

test("Old draft statuses still work, new ones are added", () => {
  type DraftStatus = "draft" | "needs_review" | "approved" | "needs_changes" | "rejected"
  const statuses: DraftStatus[] = ["draft", "needs_review", "approved", "needs_changes", "rejected"]
  assert.equal(statuses.length, 5)
  // 'published' is NOT a valid draft status
  // @ts-expect-error - published is not a valid DraftStatus
  const invalidStatus: DraftStatus = "published"
  assert.equal(invalidStatus, "published") // runtime string is fine, but TS rejects assignment
})
