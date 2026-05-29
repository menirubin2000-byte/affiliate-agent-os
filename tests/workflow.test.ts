import assert from "node:assert/strict"
import test from "node:test"

import { deriveDraftWorkflow, deriveProductWorkflow, getDraftPublishingState } from "../lib/workflow"
import type { Draft } from "../types/draft"
import type { PerformanceMetric } from "../types/performance"
import type { Product } from "../types/product"
import type { PublishingJob } from "../types/publishing"

const baseProduct: Product = {
  id: "product-1",
  name: "Acme Suite",
  slug: "acme-suite",
  brand: "Acme",
  category: "SEO",
  affiliateUrl: "https://example.org/acme",
  price: 99,
  commissionRate: 30,
  notes: null,
  targetKeyword: "acme suite review",
  secondaryKeywords: [],
  searchIntent: "commercial",
  contentAngle: "practical evaluation",
  status: "active",
  createdAt: "2026-05-28T00:00:00.000Z",
  updatedAt: "2026-05-28T00:00:00.000Z",
}

const baseDraft: Draft = {
  id: "draft-1",
  productId: "product-1",
  productName: "Acme Suite",
  productSlug: "acme-suite",
  contentType: "review",
  templateType: "review",
  title: "Acme Suite review",
  body: "Affiliate disclosure: This draft may include affiliate links.",
  metaTitle: "Acme Suite review",
  metaDescription: "Review draft.",
  targetKeyword: "acme suite review",
  qualityChecks: {
    has_disclosure: true,
    has_clear_cta: true,
    has_target_keyword: true,
    has_meta_title: true,
    has_meta_description: true,
    avoids_fake_claims: true,
    has_required_structure: true,
  },
  status: "approved",
  aiModel: "stub",
  approvalNotes: null,
  createdAt: "2026-05-28T00:00:00.000Z",
  updatedAt: "2026-05-28T00:00:00.000Z",
}

test("marks products with no drafts as needs_draft", () => {
  const workflow = deriveProductWorkflow(baseProduct, [], new Map(), new Map())

  assert.equal(workflow.workflowLabel, "needs_draft")
  assert.equal(workflow.nextAction.label, "Generate long-form draft")
})

test("marks approved drafts without queue jobs as approved_not_queued", () => {
  const workflow = deriveProductWorkflow(
    baseProduct,
    [baseDraft],
    new Map<string, PublishingJob[]>(),
    new Map<string, PerformanceMetric[]>(),
  )

  assert.equal(workflow.workflowLabel, "approved_not_queued")
})

test("derives draft publishing state from queue jobs", () => {
  const jobs = new Map<string, PublishingJob[]>([
    [
      "draft-1",
      [
        {
          id: "job-1",
          contentDraftId: "draft-1",
          productId: "product-1",
          draftTitle: "Acme Suite review",
          draftStatus: "approved",
          templateType: "review",
          productName: "Acme Suite",
          productSlug: "acme-suite",
          targetPlatform: "wordpress",
          status: "pending",
          wordpressPostId: null,
          wordpressPostUrl: null,
          errorMessage: null,
          createdAt: "2026-05-28T00:00:00.000Z",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
      ],
    ],
  ])

  assert.equal(getDraftPublishingState("draft-1", jobs), "queued")
})

test("marks approved sent drafts without performance as pending performance", () => {
  const publishingJobs = new Map<string, PublishingJob[]>([
    [
      "draft-1",
      [
        {
          id: "job-1",
          contentDraftId: "draft-1",
          productId: "product-1",
          draftTitle: "Acme Suite review",
          draftStatus: "approved",
          templateType: "review",
          productName: "Acme Suite",
          productSlug: "acme-suite",
          targetPlatform: "wordpress",
          status: "sent_to_wordpress",
          wordpressPostId: "44",
          wordpressPostUrl: "https://wp.example.org/?p=44",
          errorMessage: null,
          createdAt: "2026-05-28T00:00:00.000Z",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
      ],
    ],
  ])

  const workflow = deriveDraftWorkflow(
    baseDraft,
    [baseDraft],
    publishingJobs,
    new Map<string, PerformanceMetric[]>(),
  )

  assert.equal(workflow.workflowLabel, "published_draft_pending_performance")
})
