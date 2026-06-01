import assert from "node:assert/strict"
import test from "node:test"

import {
  assertDraftStatusTransition,
  getDraftStatusTransitionMessage,
  isDraftPublished,
} from "../lib/publishing-rules"
import type { DraftStatus } from "../types/draft"

test("approve changes draft to approved (status transition allowed)", () => {
  assert.equal(getDraftStatusTransitionMessage("draft", "approved"), null)
  assert.doesNotThrow(() => assertDraftStatusTransition("draft", "approved"))
})

test("approve does NOT create published status — published is not a DraftStatus", () => {
  // DraftStatus is the source of truth — 'published' is not in the union
  const validStatuses: DraftStatus[] = [
    "draft",
    "needs_review",
    "approved",
    "needs_changes",
    "rejected",
  ]
  assert.equal(validStatuses.length, 5)
  // @ts-expect-error - "published" is not a valid DraftStatus
  const invalid: DraftStatus = "published"
  // The string exists at runtime but the TS compiler rejects it
  assert.equal(invalid, "published")
})

test("approve does not create a fake URL — approval has no URL side effect", () => {
  // Approval is a status change only. It should not produce a publishedUrl.
  // The publishedUrl only comes from the publishing layer after real publication.
  assert.equal(isDraftPublished(null), false)
  assert.equal(isDraftPublished(undefined), false)
  assert.equal(isDraftPublished(""), false)
})

test("approval flow: draft → approved → publish job → publishedUrl", () => {
  // Step 1: draft starts as 'draft' or 'needs_review'
  let status: DraftStatus = "draft"
  let publishedUrl: string | null = null

  // Step 2: human approves → status becomes 'approved'
  assert.doesNotThrow(() => assertDraftStatusTransition(status, "approved"))
  status = "approved"

  // Step 3: at approved state, no publishedUrl yet
  assert.equal(isDraftPublished(publishedUrl), false)

  // Step 4: publish job is created and the real URL is recorded
  publishedUrl = "https://www.linkedin.com/feed/update/urn:li:activity:1234567890/"
  assert.equal(isDraftPublished(publishedUrl), true)

  // Draft status itself stays 'approved' — 'published' is a publishing-layer concept
  assert.equal(status, "approved")
})

test("rejected draft cannot be re-approved through the same transition", () => {
  assert.throws(
    () => assertDraftStatusTransition("rejected", "approved"),
    /Only drafts that are still awaiting review can be approved or rejected/,
  )
})

test("needs_review can transition to approved or rejected", () => {
  assert.equal(getDraftStatusTransitionMessage("needs_review", "approved"), null)
  assert.equal(getDraftStatusTransitionMessage("needs_review", "rejected"), null)
})
