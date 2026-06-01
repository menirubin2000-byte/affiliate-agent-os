import assert from "node:assert/strict"
import test from "node:test"

import { buildQualityChecks } from "../lib/quality"

test("passes the expected quality checks for a structured review draft", () => {
  const checks = buildQualityChecks({
    affiliateUrl: "https://example.org/product",
    targetKeyword: "best seo software",
    templateType: "review",
    draft: {
      title: "Best SEO Software Review",
      metaTitle: "Best SEO Software Review for Lean Teams",
      metaDescription: "Review the current product fit, pricing context, and next steps.",
      targetKeyword: "best seo software",
      body: [
        "Best SEO Software Review",
        "Who it is for:",
        "- Lean teams that need clear evaluation notes.",
        "Who it is not for:",
        "- Buyers who need verified claims that are not in the source data.",
        "Affiliate disclosure: This draft may include affiliate links, and a commission may be earned at no extra cost to the buyer.",
        "CTA: Visit https://example.org/product to review the official product page and current details.",
      ].join("\n"),
    },
  })

  assert.equal(checks.has_disclosure, true)
  assert.equal(checks.has_clear_cta, true)
  assert.equal(checks.has_target_keyword, true)
  assert.equal(checks.has_required_structure, true)
  assert.equal(checks.avoids_fake_claims, true)
})

test("tiktok_script requires hook and disclosure", () => {
  const passing = buildQualityChecks({
    affiliateUrl: "https://example.org/product",
    targetKeyword: "best tool",
    templateType: "tiktok_script",
    draft: {
      title: "TikTok Script Draft",
      metaTitle: "Best tool TikTok",
      metaDescription: "Short video script draft.",
      targetKeyword: "best tool",
      body: [
        "[Hook] Looking for a solid tool that actually works?",
        "[Body] This product caught my attention.",
        "Affiliate disclosure: This video may include affiliate links.",
        "CTA: Visit https://example.org/product to check it out.",
      ].join("\n"),
    },
  })

  assert.equal(passing.has_disclosure, true)
  assert.equal(passing.has_clear_cta, true)
  assert.equal(passing.has_required_structure, true)

  const failing = buildQualityChecks({
    affiliateUrl: "https://example.org/product",
    targetKeyword: "best tool",
    templateType: "tiktok_script",
    draft: {
      title: "TikTok Script",
      body: "Just a short video about a product.",
      metaTitle: null,
      metaDescription: null,
      targetKeyword: null,
    },
  })

  assert.equal(failing.has_required_structure, false)
  assert.equal(failing.has_disclosure, false)
})

test("quora_answer requires what-stands-out and disclosure", () => {
  const passing = buildQualityChecks({
    affiliateUrl: "https://example.org/product",
    targetKeyword: "best seo",
    templateType: "quora_answer",
    draft: {
      title: "Quora Answer Draft",
      metaTitle: "Quora Answer",
      metaDescription: "Answer draft.",
      targetKeyword: "best seo",
      body: [
        "When evaluating options, this product is worth considering.",
        "What stands out:",
        "- Clean interface and good documentation.",
        "Affiliate disclosure: This answer may include affiliate links.",
        "Visit https://example.org/product for details.",
      ].join("\n"),
    },
  })

  assert.equal(passing.has_required_structure, true)
  assert.equal(passing.has_disclosure, true)
})

test("reddit_post requires disclosure", () => {
  const passing = buildQualityChecks({
    affiliateUrl: "https://example.org/product",
    targetKeyword: "best tool",
    templateType: "reddit_post",
    draft: {
      title: "Reddit Post Draft",
      metaTitle: "Reddit Post",
      metaDescription: "Post draft.",
      targetKeyword: "best tool",
      body: [
        "Has anyone tried this product?",
        "Affiliate disclosure: The link may be an affiliate link.",
        "Check it out: https://example.org/product",
      ].join("\n"),
    },
  })

  assert.equal(passing.has_required_structure, true)
  assert.equal(passing.has_disclosure, true)

  const failing = buildQualityChecks({
    affiliateUrl: "https://example.org/product",
    targetKeyword: "best tool",
    templateType: "reddit_post",
    draft: {
      title: "Reddit Post",
      body: "Has anyone tried this? Link: https://example.org/product",
      metaTitle: null,
      metaDescription: null,
      targetKeyword: null,
    },
  })

  assert.equal(failing.has_required_structure, false)
  assert.equal(failing.has_disclosure, false)
})

test("flags fake-claim language and missing structure", () => {
  const checks = buildQualityChecks({
    affiliateUrl: "https://example.org/product",
    targetKeyword: "team crm",
    templateType: "comparison",
    draft: {
      body: "Award-winning team CRM with thousands of reviews.",
      metaTitle: null,
      metaDescription: null,
      targetKeyword: null,
      title: null,
    },
  })

  assert.equal(checks.avoids_fake_claims, false)
  assert.equal(checks.has_required_structure, false)
  assert.equal(checks.has_meta_description, false)
})
