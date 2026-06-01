import assert from "node:assert/strict"
import test from "node:test"

import { buildPostApprovalFingerprint } from "@/lib/approval-identity"

test("same post approval identity creates the same fingerprint", () => {
  const first = buildPostApprovalFingerprint({
    productId: "product-1",
    platform: "LinkedIn",
    title: "Title",
    contentPreview: "Affiliate disclosure\nContent",
    campaignLinkUrl: "https://example.com/?utm_source=linkedin",
  })
  const second = buildPostApprovalFingerprint({
    productId: "product-1",
    platform: " linkedin ",
    title: "Title",
    contentPreview: "Affiliate disclosure Content",
    campaignLinkUrl: "https://example.com/?utm_source=linkedin",
  })

  assert.equal(first, second)
})

test("changed campaign link requires a new approval identity", () => {
  const first = buildPostApprovalFingerprint({
    productId: "product-1",
    platform: "linkedin",
    title: "Title",
    contentPreview: "Content",
    campaignLinkUrl: "https://example.com/?utm_source=linkedin",
  })
  const second = buildPostApprovalFingerprint({
    productId: "product-1",
    platform: "linkedin",
    title: "Title",
    contentPreview: "Content",
    campaignLinkUrl: "https://example.com/?utm_source=medium",
  })

  assert.notEqual(first, second)
})
