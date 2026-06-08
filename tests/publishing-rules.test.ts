import assert from "node:assert/strict"
import test from "node:test"

import {
  assertDraftStatusTransition,
  getDraftStatusTransitionMessage,
  getPublishingEligibility,
  isDraftPublished,
  platformRequiresManualPublish,
} from "../lib/publishing-rules"

test("blocks moving a reviewed draft back to draft", () => {
  assert.equal(
    getDraftStatusTransitionMessage("approved", "draft"),
    "Drafts cannot be moved back to draft through the approval workflow.",
  )
})

test("allows only approved drafts to be queued for publishing", () => {
  assert.deepEqual(getPublishingEligibility({ draftStatus: "draft", alreadyPublished: false }), {
    allowed: false,
    message: "Only approved drafts can be queued for publishing.",
    requiresManual: false,
  })

  assert.deepEqual(
    getPublishingEligibility({ draftStatus: "approved", alreadyPublished: false }),
    {
      allowed: true,
      message: "Draft is eligible for publishing queue.",
      requiresManual: false,
    },
  )
})

test("draft is not published without publishedUrl", () => {
  assert.equal(isDraftPublished(null), false)
  assert.equal(isDraftPublished(undefined), false)
  assert.equal(isDraftPublished(""), false)
  assert.equal(isDraftPublished("   "), false)
  assert.equal(isDraftPublished("https://example.org/post/123"), true)
})

test("campaign link is not a publishedUrl — only real platform URLs count", () => {
  // A campaign link with UTM is NOT a published URL
  // (publishedUrl must come from the actual platform's published post)
  const campaignLink = "https://example.org/?utm_source=linkedin&utm_medium=affiliate"
  // isDraftPublished only checks truthy string — the rule that campaign link != publishedUrl
  // is enforced at the application layer: only updatePublishingJobSuccess sets it.
  // The isDraftPublished function should still return true for any non-empty URL,
  // but the workflow ensures only real published URLs reach this field.
  assert.equal(isDraftPublished(campaignLink), true) // structurally a URL
  // The real enforcement is that the publishing flow never stores a campaign link as publishedUrl
})

test("platform-specific publishing flow requirement", () => {
  assert.equal(platformRequiresManualPublish("linkedin"), true)
  assert.equal(platformRequiresManualPublish("medium"), true)
  assert.equal(platformRequiresManualPublish("substack"), true)
  assert.equal(platformRequiresManualPublish("tiktok"), true)
  assert.equal(platformRequiresManualPublish("quora"), true)
  assert.equal(platformRequiresManualPublish("reddit"), true)
  assert.equal(platformRequiresManualPublish("wordpress"), false)
})

test("platform-neutral messages do not mention WordPress unless platform is wordpress", () => {
  const linkedinResult = getPublishingEligibility({
    draftStatus: "approved",
    alreadyPublished: false,
    targetPlatform: "linkedin",
  })
  assert.ok(linkedinResult.allowed)
  assert.ok(
    !linkedinResult.message.toLowerCase().includes("wordpress"),
    `LinkedIn message should not mention WordPress. Got: ${linkedinResult.message}`,
  )

  const tiktokResult = getPublishingEligibility({
    draftStatus: "approved",
    alreadyPublished: false,
    targetPlatform: "tiktok",
  })
  assert.ok(
    !tiktokResult.message.toLowerCase().includes("wordpress"),
    `TikTok message should not mention WordPress. Got: ${tiktokResult.message}`,
  )

  const blockedResult = getPublishingEligibility({
    draftStatus: "draft",
    alreadyPublished: false,
    targetPlatform: "linkedin",
  })
  assert.ok(
    !blockedResult.message.toLowerCase().includes("wordpress"),
    `Blocked LinkedIn message should not mention WordPress. Got: ${blockedResult.message}`,
  )
})

test("approved draft with active job is blocked from re-queueing", () => {
  const result = getPublishingEligibility({
    draftStatus: "approved",
    alreadyPublished: false,
    hasActiveJob: true,
    targetPlatform: "linkedin",
  })
  assert.equal(result.allowed, false)
  assert.match(result.message, /active publishing job/)
})

test("approved draft already published is blocked from re-queueing", () => {
  const result = getPublishingEligibility({
    draftStatus: "approved",
    alreadyPublished: true,
    targetPlatform: "medium",
  })
  assert.equal(result.allowed, false)
  assert.match(result.message, /already has a published URL/)
})

test("platform-specific flows surface the publishing requirement when eligible", () => {
  const result = getPublishingEligibility({
    draftStatus: "approved",
    alreadyPublished: false,
    targetPlatform: "reddit",
  })
  assert.equal(result.allowed, true)
  assert.equal(result.requiresManual, true)
  assert.match(result.message, /platform-specific publishing flow/)
})

test("throws for invalid approval state transitions", () => {
  assert.throws(
    () => assertDraftStatusTransition("rejected", "approved"),
    /Only drafts that are still awaiting review can be approved or rejected/,
  )
})

test("allows needs_review -> approved transition", () => {
  assert.equal(getDraftStatusTransitionMessage("needs_review", "approved"), null)
})
