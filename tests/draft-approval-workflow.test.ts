import assert from "node:assert/strict"
import test from "node:test"

import {
  assertMeniConfirmToken,
  buildMissingPlatformLanguageDrafts,
  buildProductApprovalWorkflowSummaries,
  MENI_CONFIRM_TOKEN,
} from "@/lib/draft-approval-workflow"

test("active product with no drafts appears in approval workflow", () => {
  const rows = buildProductApprovalWorkflowSummaries({
    products: [
      {
        id: "product-1",
        name: "GrapeLeads",
        status: "active",
        affiliateUrl: "https://example.com/affiliate",
      },
    ],
    drafts: [],
    finalCopies: [],
    affiliatePrograms: [],
  })

  assert.equal(rows.length, 1)
  assert.equal(rows[0].productName, "GrapeLeads")
  assert.equal(rows[0].statusLabel, "no_drafts_created")
  assert.equal(rows[0].nextAction, "Create missing drafts")
})

test("product with pending final copies appears as pending approval", () => {
  const rows = buildProductApprovalWorkflowSummaries({
    products: [
      {
        id: "product-1",
        name: "GrapeLeads",
        status: "active",
        affiliateUrl: "https://example.com/affiliate",
      },
    ],
    drafts: [{ id: "draft-1", productId: "product-1" }],
    finalCopies: [
      {
        id: "fc-1",
        productId: "product-1",
        platform: "medium",
        language: "en",
        status: "ready_for_operator_approval",
        updatedAt: "2026-06-20T10:00:00.000Z",
      },
    ],
    affiliatePrograms: [],
  })

  assert.equal(rows[0].statusLabel, "pending_operator_approval")
  assert.equal(rows[0].pendingApprovalCount, 1)
})

test("bulk create skips existing platform/language content", () => {
  const missing = buildMissingPlatformLanguageDrafts({
    existingFinalCopies: [
      {
        id: "fc-en-medium",
        productId: "product-1",
        platform: "medium",
        language: "en",
        status: "ready_for_operator_approval",
      },
      {
        id: "fc-he-linkedin",
        productId: "product-1",
        platform: "linkedin",
        language: "he",
        status: "ready_for_operator_approval",
      },
    ],
    platforms: ["medium", "linkedin"],
    languages: ["en", "he"],
  })

  assert.deepEqual(missing, [
    { platform: "linkedin", language: "en" },
    { platform: "medium", language: "he" },
  ])
})

test("bulk approve requires MENI_CONFIRM", () => {
  assert.throws(() => assertMeniConfirmToken(""), /MENI_CONFIRM/)
  assert.throws(() => assertMeniConfirmToken("meni_confirm"), /MENI_CONFIRM/)
  assert.doesNotThrow(() => assertMeniConfirmToken(MENI_CONFIRM_TOKEN))
})
