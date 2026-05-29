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
