import assert from "node:assert/strict"
import test from "node:test"

import { buildOperatorActionItems } from "../lib/action-items"
import { checkAffiliatePrograms } from "../lib/data-quality"
import type { AffiliateProgram } from "../types/affiliate-program"
import {
  APPROVAL_TYPE_LABELS,
  PROGRAM_STATUS_LABELS,
  VALID_APPROVAL_TYPES,
  VALID_PROGRAM_STATUSES,
} from "../types/affiliate-program"

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

function makeProgram(overrides: Partial<AffiliateProgram> = {}): AffiliateProgram {
  return {
    id: "ap-1",
    productId: "product-1",
    productName: "Demo Product",
    programName: "Demo Affiliate Program",
    programUrl: "https://example.com/affiliates",
    signupUrl: "https://example.com/signup",
    dashboardUrl: "https://app.example.com/dashboard",
    network: "Impact",
    commissionSummary: "30% recurring",
    cookieDuration: "30 days",
    approvalType: "manual_review",
    status: "research_needed",
    affiliateLink: null,
    notes: null,
    lastCheckedAt: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  }
}

/* ------------------------------------------------------------------ */
/*  Types / constants                                                  */
/* ------------------------------------------------------------------ */

test("VALID_APPROVAL_TYPES has 4 entries", () => {
  assert.equal(VALID_APPROVAL_TYPES.length, 4)
  assert.ok(VALID_APPROVAL_TYPES.includes("instant"))
  assert.ok(VALID_APPROVAL_TYPES.includes("manual_review"))
  assert.ok(VALID_APPROVAL_TYPES.includes("closed"))
  assert.ok(VALID_APPROVAL_TYPES.includes("unknown"))
})

test("VALID_PROGRAM_STATUSES has 8 entries", () => {
  assert.equal(VALID_PROGRAM_STATUSES.length, 8)
  assert.ok(VALID_PROGRAM_STATUSES.includes("research_needed"))
  assert.ok(VALID_PROGRAM_STATUSES.includes("signup_needed"))
  assert.ok(VALID_PROGRAM_STATUSES.includes("awaiting_human_approval"))
  assert.ok(VALID_PROGRAM_STATUSES.includes("submitted"))
  assert.ok(VALID_PROGRAM_STATUSES.includes("approved"))
  assert.ok(VALID_PROGRAM_STATUSES.includes("rejected"))
  assert.ok(VALID_PROGRAM_STATUSES.includes("closed"))
  assert.ok(VALID_PROGRAM_STATUSES.includes("link_ready"))
})

test("every status has a label", () => {
  for (const status of VALID_PROGRAM_STATUSES) {
    assert.ok(PROGRAM_STATUS_LABELS[status], `Missing label for status: ${status}`)
  }
})

test("every approval type has a label", () => {
  for (const type of VALID_APPROVAL_TYPES) {
    assert.ok(APPROVAL_TYPE_LABELS[type], `Missing label for approval type: ${type}`)
  }
})

/* ------------------------------------------------------------------ */
/*  Data quality checks                                                */
/* ------------------------------------------------------------------ */

test("checkAffiliatePrograms: clean program produces no issues", () => {
  const issues = checkAffiliatePrograms({
    affiliatePrograms: [makeProgram()],
    productIds: new Set(["product-1"]),
  })
  assert.equal(issues.length, 0)
})

test("checkAffiliatePrograms: approved without link is a warning", () => {
  const issues = checkAffiliatePrograms({
    affiliatePrograms: [makeProgram({ status: "approved", affiliateLink: null })],
    productIds: new Set(["product-1"]),
  })
  const issue = issues.find((i) => i.title.includes("approved but missing link"))
  assert.ok(issue, "Expected warning for approved program without link")
  assert.equal(issue.severity, "warning")
})

test("checkAffiliatePrograms: link_ready without link is critical", () => {
  const issues = checkAffiliatePrograms({
    affiliatePrograms: [makeProgram({ status: "link_ready", affiliateLink: null })],
    productIds: new Set(["product-1"]),
  })
  const issue = issues.find((i) => i.title.includes("marked link ready but has no link"))
  assert.ok(issue, "Expected critical issue for link_ready without link")
  assert.equal(issue.severity, "critical")
})

test("checkAffiliatePrograms: link_ready with link is clean", () => {
  const issues = checkAffiliatePrograms({
    affiliatePrograms: [
      makeProgram({
        status: "link_ready",
        affiliateLink: "https://example.com/ref=abc",
      }),
    ],
    productIds: new Set(["product-1"]),
  })
  // Should only potentially have the "no product linked" info issue, but we have productId set
  const linkIssues = issues.filter(
    (i) => i.title.includes("link ready") || i.title.includes("approved"),
  )
  assert.equal(linkIssues.length, 0)
})

test("checkAffiliatePrograms: no product linked is info", () => {
  const issues = checkAffiliatePrograms({
    affiliatePrograms: [makeProgram({ productId: null })],
    productIds: new Set(["product-1"]),
  })
  const issue = issues.find((i) => i.title.includes("not linked to any product"))
  assert.ok(issue, "Expected info for unlinked program")
  assert.equal(issue.severity, "info")
})

test("checkAffiliatePrograms: linked to missing product is warning", () => {
  const issues = checkAffiliatePrograms({
    affiliatePrograms: [makeProgram({ productId: "product-deleted" })],
    productIds: new Set(["product-1"]),
  })
  const issue = issues.find((i) => i.title.includes("linked to missing product"))
  assert.ok(issue, "Expected warning for missing product reference")
  assert.equal(issue.severity, "warning")
})

test("checkAffiliatePrograms: signup_needed without signup URL is info", () => {
  const issues = checkAffiliatePrograms({
    affiliatePrograms: [makeProgram({ status: "signup_needed", signupUrl: null })],
    productIds: new Set(["product-1"]),
  })
  const issue = issues.find((i) => i.title.includes("needs signup but no signup URL"))
  assert.ok(issue, "Expected info for signup_needed without URL")
  assert.equal(issue.severity, "info")
})

/* ------------------------------------------------------------------ */
/*  Action items                                                       */
/* ------------------------------------------------------------------ */

test("affiliate programs generate action items for research_needed", () => {
  const items = buildOperatorActionItems({
    dataQualityIssues: [],
    improvementTasks: [],
    recommendations: [],
    performanceInsights: [],
    drafts: [],
    products: [],
    campaignLinks: [],
    performanceMetrics: [],
    affiliatePrograms: [makeProgram({ status: "research_needed" })],
  })
  const item = items.find((i) => i.source === "affiliate_program" && i.title.includes("Research"))
  assert.ok(item, "Expected action item for research_needed")
  assert.equal(item.priority, "medium")
})

test("affiliate programs generate action items for signup_needed", () => {
  const items = buildOperatorActionItems({
    dataQualityIssues: [],
    improvementTasks: [],
    recommendations: [],
    performanceInsights: [],
    drafts: [],
    products: [],
    campaignLinks: [],
    performanceMetrics: [],
    affiliatePrograms: [makeProgram({ status: "signup_needed" })],
  })
  const item = items.find((i) => i.source === "affiliate_program" && i.title.includes("Sign up"))
  assert.ok(item, "Expected action item for signup_needed")
  assert.equal(item.priority, "high")
})

test("affiliate programs generate action items for awaiting_human_approval", () => {
  const items = buildOperatorActionItems({
    dataQualityIssues: [],
    improvementTasks: [],
    recommendations: [],
    performanceInsights: [],
    drafts: [],
    products: [],
    campaignLinks: [],
    performanceMetrics: [],
    affiliatePrograms: [makeProgram({ status: "awaiting_human_approval" })],
  })
  const item = items.find((i) => i.source === "affiliate_program" && i.title.includes("awaiting human approval"))
  assert.ok(item, "Expected action item for awaiting_human_approval")
  assert.equal(item.priority, "high")
})

test("affiliate programs generate action items for approved without link", () => {
  const items = buildOperatorActionItems({
    dataQualityIssues: [],
    improvementTasks: [],
    recommendations: [],
    performanceInsights: [],
    drafts: [],
    products: [],
    campaignLinks: [],
    performanceMetrics: [],
    affiliatePrograms: [makeProgram({ status: "approved", affiliateLink: null })],
  })
  const item = items.find((i) => i.source === "affiliate_program" && i.title.includes("Add affiliate link"))
  assert.ok(item, "Expected action item for approved without link")
  assert.equal(item.priority, "high")
})

test("approved program with link generates no action item", () => {
  const items = buildOperatorActionItems({
    dataQualityIssues: [],
    improvementTasks: [],
    recommendations: [],
    performanceInsights: [],
    drafts: [],
    products: [],
    campaignLinks: [],
    performanceMetrics: [],
    affiliatePrograms: [
      makeProgram({ status: "approved", affiliateLink: "https://example.com/ref=abc" }),
    ],
  })
  const affiliateItems = items.filter((i) => i.source === "affiliate_program")
  assert.equal(affiliateItems.length, 0)
})

test("link_ready program generates no action item", () => {
  const items = buildOperatorActionItems({
    dataQualityIssues: [],
    improvementTasks: [],
    recommendations: [],
    performanceInsights: [],
    drafts: [],
    products: [],
    campaignLinks: [],
    performanceMetrics: [],
    affiliatePrograms: [
      makeProgram({ status: "link_ready", affiliateLink: "https://example.com/ref=abc" }),
    ],
  })
  const affiliateItems = items.filter((i) => i.source === "affiliate_program")
  assert.equal(affiliateItems.length, 0)
})

test("summarizeActionItems includes affiliate_program source", () => {
  const { summarizeActionItems } = require("../lib/action-items")
  const items = buildOperatorActionItems({
    dataQualityIssues: [],
    improvementTasks: [],
    recommendations: [],
    performanceInsights: [],
    drafts: [],
    products: [],
    campaignLinks: [],
    performanceMetrics: [],
    affiliatePrograms: [makeProgram({ status: "signup_needed" })],
  })
  const summary = summarizeActionItems(items)
  assert.ok("affiliate_program" in summary.bySource, "Expected affiliate_program in bySource")
  assert.ok(summary.bySource.affiliate_program >= 1, "Expected at least 1 affiliate_program action item")
})
