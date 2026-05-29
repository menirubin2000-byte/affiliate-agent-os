import assert from "node:assert/strict"
import test from "node:test"

import { buildApprovalReadiness } from "../lib/approval-readiness"
import type { Draft } from "../types/draft"

function makeDraft(overrides?: Partial<Draft>): Draft {
  return {
    id: "draft-1",
    productId: "product-1",
    productName: "Test Product",
    productSlug: "test-product",
    contentType: "review",
    templateType: "review",
    title: "Test Review",
    body: "Review body with affiliate disclosure.",
    metaTitle: "Test Meta Title",
    metaDescription: "Test meta description for search engines.",
    targetKeyword: "test keyword",
    qualityChecks: {
      has_disclosure: true,
      has_clear_cta: true,
      has_target_keyword: true,
      has_meta_title: true,
      has_meta_description: true,
      avoids_fake_claims: true,
      has_required_structure: true,
    },
    status: "draft",
    aiModel: "manual",
    approvalNotes: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  }
}

test("good draft is ready for approval", () => {
  const result = buildApprovalReadiness(makeDraft())

  assert.equal(result.level, "ready")
  assert.equal(result.issues.length, 0)
  assert.equal(result.passedChecks, 7)
  assert.equal(result.totalChecks, 7)
})

test("missing meta title is a warning", () => {
  const result = buildApprovalReadiness(makeDraft({
    qualityChecks: {
      ...makeDraft().qualityChecks,
      has_meta_title: false,
    },
  }))

  assert.equal(result.level, "needs_review")
  assert.equal(result.passedChecks, 6)
  const metaIssue = result.issues.find((i) => i.label.includes("meta title"))
  assert.ok(metaIssue)
  assert.equal(metaIssue.severity, "warning")
})

test("missing meta description is a warning", () => {
  const result = buildApprovalReadiness(makeDraft({
    qualityChecks: {
      ...makeDraft().qualityChecks,
      has_meta_description: false,
    },
  }))

  assert.equal(result.level, "needs_review")
  const issue = result.issues.find((i) => i.label.includes("meta description"))
  assert.ok(issue)
  assert.equal(issue.severity, "warning")
})

test("missing disclosure is critical", () => {
  const result = buildApprovalReadiness(makeDraft({
    qualityChecks: {
      ...makeDraft().qualityChecks,
      has_disclosure: false,
    },
  }))

  assert.equal(result.level, "not_ready")
  const issue = result.issues.find((i) => i.label.includes("disclosure"))
  assert.ok(issue)
  assert.equal(issue.severity, "critical")
})

test("missing CTA is critical", () => {
  const result = buildApprovalReadiness(makeDraft({
    qualityChecks: {
      ...makeDraft().qualityChecks,
      has_clear_cta: false,
    },
  }))

  assert.equal(result.level, "not_ready")
  const issue = result.issues.find((i) => i.label.includes("CTA"))
  assert.ok(issue)
  assert.equal(issue.severity, "critical")
})

test("weak quality checks combine multiple issues", () => {
  const result = buildApprovalReadiness(makeDraft({
    qualityChecks: {
      has_disclosure: false,
      has_clear_cta: false,
      has_target_keyword: false,
      has_meta_title: false,
      has_meta_description: false,
      avoids_fake_claims: false,
      has_required_structure: false,
    },
  }))

  assert.equal(result.level, "not_ready")
  assert.equal(result.passedChecks, 0)
  assert.equal(result.issues.length, 7)
  const criticalCount = result.issues.filter((i) => i.severity === "critical").length
  assert.equal(criticalCount, 4)
})

test("approved draft still returns readiness info", () => {
  const result = buildApprovalReadiness(makeDraft({ status: "approved" }))

  assert.equal(result.level, "ready")
  assert.equal(result.passedChecks, 7)
})

test("only warnings produce needs_review level", () => {
  const result = buildApprovalReadiness(makeDraft({
    qualityChecks: {
      ...makeDraft().qualityChecks,
      has_meta_title: false,
      has_meta_description: false,
      has_target_keyword: false,
    },
  }))

  assert.equal(result.level, "needs_review")
  assert.equal(result.passedChecks, 4)
  assert.ok(result.issues.every((i) => i.severity === "warning"))
})
