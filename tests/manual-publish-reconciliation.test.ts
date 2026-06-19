import assert from "node:assert/strict"
import test from "node:test"

import {
  normalizePublishLogPlatform,
  parsePublishLogMarkdown,
  pickPublishLogFinalCopyCandidate,
  supportsVerifiedManualPublishUrl,
} from "../lib/manual-publish-reconciliation-core"

test("normalizes supported publish log platforms", () => {
  assert.equal(normalizePublishLogPlatform("LinkedIn"), "linkedin")
  assert.equal(normalizePublishLogPlatform("Medium"), "medium")
  assert.equal(normalizePublishLogPlatform("Substack"), "substack")
  assert.equal(normalizePublishLogPlatform("Instagram Business"), "instagram_professional")
  assert.equal(normalizePublishLogPlatform("Facebook Page"), "facebook_page")
  assert.equal(normalizePublishLogPlatform("Unknown Platform"), null)
})

test("reports which platforms can accept manual verified URLs", () => {
  assert.equal(supportsVerifiedManualPublishUrl("linkedin"), true)
  assert.equal(supportsVerifiedManualPublishUrl("medium"), true)
  assert.equal(supportsVerifiedManualPublishUrl("facebook_page"), true)
  assert.equal(supportsVerifiedManualPublishUrl("x_twitter"), false)
  assert.equal(supportsVerifiedManualPublishUrl("youtube"), false)
})

test("parses markdown publish log fields and uses article url when present", () => {
  const markdown = `# Stage 54: Medium Publish Log

## Publish Record: Medium - Systeme.io

| Field | Value |
|-------|-------|
| **Platform** | Medium |
| **Product** | Systeme.io |
| **Draft/content version** | Approved review (id: 3f1d87d2-3667-44e1-b67a-3638d2abf413) |
| **Published** | Yes |
| **Article URL** | https://medium.com/@Rubin-Q.S/systeme-io-review-free-funnel-and-email-marketing-platform-for-online-businesses-8c4f042ceaa9 |
`

  const entries = parsePublishLogMarkdown(markdown, "STAGE_54_MEDIUM_PUBLISH_LOG.md")
  assert.equal(entries.length, 1)
  assert.equal(entries[0].platform, "medium")
  assert.equal(entries[0].productName, "Systeme.io")
  assert.equal(entries[0].published, true)
  assert.equal(
    entries[0].liveUrl,
    "https://medium.com/@Rubin-Q.S/systeme-io-review-free-funnel-and-email-marketing-platform-for-online-businesses-8c4f042ceaa9",
  )
  assert.deepEqual(entries[0].uuidHints, ["3f1d87d2-3667-44e1-b67a-3638d2abf413"])
})

test("picks a final copy candidate from UUID hints when multiple candidates exist", () => {
  const picked = pickPublishLogFinalCopyCandidate({
    liveUrl: "https://www.linkedin.com/feed/update/urn:li:activity:123/",
    uuidHints: ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
    candidates: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        sourceContentId: "11111111-1111-4111-8111-111111111111",
        platformAdaptationId: "22222222-2222-4222-8222-222222222222",
        status: "operator_approved",
        updatedAt: "2026-06-10T10:00:00Z",
        existingVerifiedUrl: null,
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        sourceContentId: "33333333-3333-4333-8333-333333333333",
        platformAdaptationId: "44444444-4444-4444-8444-444444444444",
        status: "operator_approved",
        updatedAt: "2026-06-11T10:00:00Z",
        existingVerifiedUrl: null,
      },
    ],
  })

  assert.ok(picked)
  assert.equal(picked?.reason, "uuid_hint_match")
  assert.equal(picked?.candidate.id, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
})

test("prefers the single candidate without a verified published url", () => {
  const picked = pickPublishLogFinalCopyCandidate({
    liveUrl: "https://menirubin.substack.com/p/systemeio-review",
    uuidHints: [],
    candidates: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        sourceContentId: "11111111-1111-4111-8111-111111111111",
        platformAdaptationId: "22222222-2222-4222-8222-222222222222",
        status: "published_verified",
        updatedAt: "2026-06-10T10:00:00Z",
        existingVerifiedUrl: "https://menirubin.substack.com/p/older-review",
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        sourceContentId: "33333333-3333-4333-8333-333333333333",
        platformAdaptationId: "44444444-4444-4444-8444-444444444444",
        status: "operator_approved",
        updatedAt: "2026-06-11T10:00:00Z",
        existingVerifiedUrl: null,
      },
    ],
  })

  assert.ok(picked)
  assert.equal(picked?.reason, "single_unverified_candidate")
  assert.equal(picked?.candidate.id, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
})

test("returns null when publish log matching stays ambiguous", () => {
  const picked = pickPublishLogFinalCopyCandidate({
    liveUrl: "https://www.linkedin.com/feed/update/urn:li:activity:123/",
    uuidHints: [],
    candidates: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        sourceContentId: "11111111-1111-4111-8111-111111111111",
        platformAdaptationId: "22222222-2222-4222-8222-222222222222",
        status: "operator_approved",
        updatedAt: "2026-06-10T10:00:00Z",
        existingVerifiedUrl: null,
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        sourceContentId: "33333333-3333-4333-8333-333333333333",
        platformAdaptationId: "44444444-4444-4444-8444-444444444444",
        status: "operator_approved",
        updatedAt: "2026-06-11T10:00:00Z",
        existingVerifiedUrl: null,
      },
    ],
  })

  assert.equal(picked, null)
})
