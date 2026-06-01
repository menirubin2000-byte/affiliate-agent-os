import assert from "node:assert/strict"
import test from "node:test"

import { getContentTypeForTemplate } from "../lib/ai"
import { buildQualityChecks } from "../lib/quality"
import { deriveProductWorkflow } from "../lib/workflow"
import type { Draft, TemplateType } from "../types/draft"
import type { PerformanceMetric } from "../types/performance"
import type { Product } from "../types/product"
import type { PublishingJob } from "../types/publishing"

const testProduct: Product = {
  id: "qa-product-1",
  name: "TestTool Pro",
  slug: "testtool-pro",
  brand: "TestBrand",
  category: "Marketing Automation",
  affiliateUrl: "https://example.org/testtool?ref=affiliate",
  price: 49,
  commissionRate: 25,
  notes: null,
  targetKeyword: "marketing automation tool",
  secondaryKeywords: ["email marketing", "funnel builder"],
  searchIntent: "commercial",
  contentAngle: "practical evaluation",
  status: "active",
  createdAt: "2026-05-30T00:00:00.000Z",
  updatedAt: "2026-05-30T00:00:00.000Z",
}

const newTemplateTypes: TemplateType[] = ["tiktok_script", "quora_answer", "reddit_post"]

// --- Content type mapping ---

test("new template types map to social_post content type", () => {
  for (const templateType of newTemplateTypes) {
    assert.equal(
      getContentTypeForTemplate(templateType),
      "social_post",
      `${templateType} should map to social_post`,
    )
  }
})

test("existing template types still map correctly", () => {
  assert.equal(getContentTypeForTemplate("review"), "review")
  assert.equal(getContentTypeForTemplate("comparison"), "review")
  assert.equal(getContentTypeForTemplate("buying_guide"), "review")
  assert.equal(getContentTypeForTemplate("social_post"), "social_post")
})

// --- Fallback body generation via quality checks ---

test("tiktok_script fallback body includes affiliate URL and passes quality checks", () => {
  // Simulate the fallback body that createStubDraft would produce
  const body = [
    `[Hook] Looking for a solid ${testProduct.category} that actually works?`,
    "",
    `[Body] ${testProduct.name} caught my attention because it fits a real use case without overcomplicating things.`,
    "Product details should be verified from the official page before recording.",
    "",
    `[CTA] Link in bio to check it out: ${testProduct.affiliateUrl}`,
    "Affiliate disclosure: This video may include affiliate links, and a commission may be earned at no extra cost to you.",
    `Target keyword: ${testProduct.targetKeyword}.`,
  ].join("\n")

  assert.ok(body.includes(testProduct.affiliateUrl), "body must include affiliate URL")
  assert.ok(body.toLowerCase().includes("affiliate disclosure"), "body must include disclosure")
  assert.ok(body.toLowerCase().includes("hook"), "body must include hook marker")

  const checks = buildQualityChecks({
    draft: {
      title: `${testProduct.name} TikTok script draft`,
      body,
      metaTitle: `${testProduct.name} tiktok script | ${testProduct.targetKeyword}`,
      metaDescription: `Draft content for ${testProduct.name}. Verify product details, pricing, and fit before publishing.`,
      targetKeyword: testProduct.targetKeyword,
    },
    affiliateUrl: testProduct.affiliateUrl,
    targetKeyword: testProduct.targetKeyword,
    templateType: "tiktok_script",
  })

  assert.equal(checks.has_disclosure, true, "disclosure check must pass")
  assert.equal(checks.has_clear_cta, true, "CTA check must pass")
  assert.equal(checks.has_target_keyword, true, "keyword check must pass")
  assert.equal(checks.has_required_structure, true, "structure check must pass")
  assert.equal(checks.avoids_fake_claims, true, "fake claims check must pass")
  assert.equal(checks.has_meta_title, true, "meta title check must pass")
  assert.equal(checks.has_meta_description, true, "meta description check must pass")
})

test("quora_answer fallback body includes affiliate URL and passes quality checks", () => {
  const body = [
    `When looking at options in ${testProduct.category}, ${testProduct.name} is one tool worth considering.`,
    "",
    "What stands out:",
    "- The product page should be checked for current features and pricing.",
    "- This answer is based on publicly available information and should be verified.",
    "",
    `For more details, you can visit: ${testProduct.affiliateUrl}`,
    "Affiliate disclosure: This answer may include affiliate links, and a commission may be earned at no extra cost to you.",
    `Target keyword: ${testProduct.targetKeyword}.`,
  ].join("\n")

  assert.ok(body.includes(testProduct.affiliateUrl), "body must include affiliate URL")
  assert.ok(body.toLowerCase().includes("affiliate disclosure"), "body must include disclosure")
  assert.ok(body.toLowerCase().includes("what stands out"), "body must include structure marker")

  const checks = buildQualityChecks({
    draft: {
      title: `${testProduct.name} Quora answer draft`,
      body,
      metaTitle: `${testProduct.name} quora answer | ${testProduct.targetKeyword}`,
      metaDescription: `Draft content for ${testProduct.name}. Verify product details.`,
      targetKeyword: testProduct.targetKeyword,
    },
    affiliateUrl: testProduct.affiliateUrl,
    targetKeyword: testProduct.targetKeyword,
    templateType: "quora_answer",
  })

  assert.equal(checks.has_disclosure, true)
  assert.equal(checks.has_clear_cta, true)
  assert.equal(checks.has_target_keyword, true)
  assert.equal(checks.has_required_structure, true)
  assert.equal(checks.avoids_fake_claims, true)
})

test("reddit_post fallback body includes affiliate URL and passes quality checks", () => {
  const body = [
    `Has anyone tried ${testProduct.name} for ${testProduct.category}?`,
    "",
    `I've been looking into options in ${testProduct.category} and came across ${testProduct.name}. The product page lists some interesting features but I'd like to hear real experiences.`,
    "",
    `Check it out here: ${testProduct.affiliateUrl}`,
    "Affiliate disclosure: The link above may be an affiliate link. I may earn a commission at no extra cost to you.",
    `Target keyword: ${testProduct.targetKeyword}.`,
  ].join("\n")

  assert.ok(body.includes(testProduct.affiliateUrl), "body must include affiliate URL")
  assert.ok(body.toLowerCase().includes("affiliate disclosure"), "body must include disclosure")

  const checks = buildQualityChecks({
    draft: {
      title: `${testProduct.name} Reddit post draft`,
      body,
      metaTitle: `${testProduct.name} reddit post | ${testProduct.targetKeyword}`,
      metaDescription: `Draft content for ${testProduct.name}. Verify product details.`,
      targetKeyword: testProduct.targetKeyword,
    },
    affiliateUrl: testProduct.affiliateUrl,
    targetKeyword: testProduct.targetKeyword,
    templateType: "reddit_post",
  })

  assert.equal(checks.has_disclosure, true)
  assert.equal(checks.has_clear_cta, true)
  assert.equal(checks.has_target_keyword, true)
  assert.equal(checks.has_required_structure, true)
  assert.equal(checks.avoids_fake_claims, true)
})

// --- Disclosure enforcement ---

test("tiktok_script without disclosure fails quality checks", () => {
  const checks = buildQualityChecks({
    draft: {
      title: "TikTok Script",
      body: "[Hook] Check this out!\n[Body] Great product.\n[CTA] Link in bio.",
      metaTitle: null,
      metaDescription: null,
      targetKeyword: null,
    },
    affiliateUrl: "https://example.org/product",
    targetKeyword: null,
    templateType: "tiktok_script",
  })

  assert.equal(checks.has_disclosure, false, "missing disclosure must be detected")
})

test("quora_answer without disclosure fails quality checks", () => {
  const checks = buildQualityChecks({
    draft: {
      title: "Quora Answer",
      body: "What stands out:\n- Good product.\nCheck it out at https://example.org/product",
      metaTitle: null,
      metaDescription: null,
      targetKeyword: null,
    },
    affiliateUrl: "https://example.org/product",
    targetKeyword: null,
    templateType: "quora_answer",
  })

  assert.equal(checks.has_disclosure, false, "missing disclosure must be detected")
})

test("reddit_post without disclosure fails quality checks", () => {
  const checks = buildQualityChecks({
    draft: {
      title: "Reddit Post",
      body: "Has anyone tried this product? https://example.org/product",
      metaTitle: null,
      metaDescription: null,
      targetKeyword: null,
    },
    affiliateUrl: "https://example.org/product",
    targetKeyword: null,
    templateType: "reddit_post",
  })

  assert.equal(checks.has_disclosure, false, "missing disclosure must be detected")
  assert.equal(checks.has_required_structure, false, "missing structure must be detected")
})

// --- Workflow treats new types as short-form ---

test("product with only new channel drafts is treated as short-form only", () => {
  const tiktokDraft: Draft = {
    id: "draft-tiktok",
    productId: testProduct.id,
    productName: testProduct.name,
    productSlug: testProduct.slug,
    contentType: "social_post",
    templateType: "tiktok_script",
    title: "TikTok script",
    body: "test body",
    metaTitle: null,
    metaDescription: null,
    targetKeyword: null,
    qualityChecks: {
      has_disclosure: true,
      has_clear_cta: true,
      has_target_keyword: false,
      has_meta_title: false,
      has_meta_description: false,
      avoids_fake_claims: true,
      has_required_structure: true,
    },
    status: "approved",
    aiModel: "stub",
    approvalNotes: null,
    createdAt: "2026-05-30T00:00:00.000Z",
    updatedAt: "2026-05-30T00:00:00.000Z",
  }

  const workflow = deriveProductWorkflow(
    testProduct,
    [tiktokDraft],
    new Map<string, PublishingJob[]>(),
    new Map<string, PerformanceMetric[]>(),
  )

  assert.equal(workflow.hasOnlySocialDrafts, true, "product with only tiktok draft should be treated as social-only")
  assert.equal(workflow.hasApprovedLongForm, false, "tiktok draft is not long-form")
})

test("product with review and reddit drafts is not social-only", () => {
  const reviewDraft: Draft = {
    id: "draft-review",
    productId: testProduct.id,
    productName: testProduct.name,
    productSlug: testProduct.slug,
    contentType: "review",
    templateType: "review",
    title: "Review",
    body: "test body",
    metaTitle: null,
    metaDescription: null,
    targetKeyword: null,
    qualityChecks: {
      has_disclosure: true,
      has_clear_cta: true,
      has_target_keyword: false,
      has_meta_title: false,
      has_meta_description: false,
      avoids_fake_claims: true,
      has_required_structure: true,
    },
    status: "approved",
    aiModel: "stub",
    approvalNotes: null,
    createdAt: "2026-05-30T00:00:00.000Z",
    updatedAt: "2026-05-30T00:00:00.000Z",
  }

  const redditDraft: Draft = {
    ...reviewDraft,
    id: "draft-reddit",
    contentType: "social_post",
    templateType: "reddit_post",
    title: "Reddit post",
  }

  const workflow = deriveProductWorkflow(
    testProduct,
    [reviewDraft, redditDraft],
    new Map<string, PublishingJob[]>(),
    new Map<string, PerformanceMetric[]>(),
  )

  assert.equal(workflow.hasOnlySocialDrafts, false, "mixed draft types should not be social-only")
  assert.equal(workflow.hasApprovedLongForm, true, "review draft is long-form")
})

// --- No publishing triggered ---

test("new channel drafts in draft status do not trigger publishing workflow", () => {
  for (const templateType of newTemplateTypes) {
    const draft: Draft = {
      id: `draft-${templateType}`,
      productId: testProduct.id,
      productName: testProduct.name,
      productSlug: testProduct.slug,
      contentType: "social_post",
      templateType,
      title: `${templateType} draft`,
      body: "test body with affiliate disclosure",
      metaTitle: null,
      metaDescription: null,
      targetKeyword: null,
      qualityChecks: {
        has_disclosure: true,
        has_clear_cta: true,
        has_target_keyword: false,
        has_meta_title: false,
        has_meta_description: false,
        avoids_fake_claims: true,
        has_required_structure: true,
      },
      status: "draft",
      aiModel: "stub",
      approvalNotes: null,
      createdAt: "2026-05-30T00:00:00.000Z",
      updatedAt: "2026-05-30T00:00:00.000Z",
    }

    const workflow = deriveProductWorkflow(
      testProduct,
      [draft],
      new Map<string, PublishingJob[]>(),
      new Map<string, PerformanceMetric[]>(),
    )

    assert.notEqual(
      workflow.workflowLabel,
      "approved_not_queued",
      `${templateType} in draft status should not be in approved_not_queued state`,
    )
  }
})

// --- Fake claims detection still works for new types ---

test("fake claims are detected in new template types", () => {
  for (const templateType of newTemplateTypes) {
    const checks = buildQualityChecks({
      draft: {
        title: "Draft with fake claims",
        body: "This award-winning product has thousands of reviews and guaranteed results. Affiliate disclosure included.",
        metaTitle: null,
        metaDescription: null,
        targetKeyword: null,
      },
      affiliateUrl: "https://example.org/product",
      targetKeyword: null,
      templateType,
    })

    assert.equal(
      checks.avoids_fake_claims,
      false,
      `fake claims should be detected in ${templateType}`,
    )
  }
})

// --- Product with no affiliate URL ---

test("new template types without affiliate URL and no CTA phrase fail CTA check", () => {
  for (const templateType of newTemplateTypes) {
    const checks = buildQualityChecks({
      draft: {
        title: "Draft",
        body: "Some content with affiliate disclosure. No link or action here.",
        metaTitle: null,
        metaDescription: null,
        targetKeyword: null,
      },
      affiliateUrl: "https://example.org/missing-from-body",
      targetKeyword: null,
      templateType,
    })

    assert.equal(checks.has_clear_cta, false, `CTA check should fail when affiliate URL is not in body for ${templateType}`)
  }
})
