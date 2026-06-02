import assert from "node:assert/strict"
import test from "node:test"

import {
  cleanupMediumArticle,
  SYSTEME_IO_MEDIUM_FINAL_LINK,
  validateFinalMediumArticle,
} from "../lib/content-review"

const messyBody = `Affiliate disclosure: old disclosure.

## What Systeme.io is

Systeme.io is an online business platform for funnels and email marketing.

## Pricing and free-plan note

Exact plan limits, paid-plan pricing, and included features can change, so review the official pricing page and account dashboard before making a final decision.

## Official sources checked

- Systeme.io features: https://systeme.io/features
- Systeme.io pricing and free-plan details: https://systeme.io/pricing
- Systeme.io affiliate ID/link format: https://help.systeme.io/article/162-how-the-systeme-io-affiliate-program-works

## Call to action

Try it here:

https://systeme.io/?sa=old&utm_source=old

No fake personal experience, rating, earnings result, testimonial, or discount claim is included in this draft.

CTA: Learn more here: ${SYSTEME_IO_MEDIUM_FINAL_LINK}`

test("cleanupMediumArticle creates one stable CTA and one affiliate URL", () => {
  const cleaned = cleanupMediumArticle({
    title: " Systeme.io Review ",
    body: messyBody,
  })

  assert.equal(cleaned.title, "Systeme.io Review")
  assert.equal(cleaned.body.startsWith("Affiliate disclosure:"), true)
  assert.equal(cleaned.body.split(SYSTEME_IO_MEDIUM_FINAL_LINK).length - 1, 1)
  assert.equal(cleaned.body.match(/## Call to Action/g)?.length, 1)
  assert.equal(cleaned.body.includes("No fake personal experience"), false)
  assert.equal(cleaned.body.includes("https://systeme.io/?sa=old"), false)
})

test("validateFinalMediumArticle blocks duplicate URLs and internal notes", () => {
  const body = `Affiliate disclosure: This article includes an affiliate link.

## Body

No fake personal experience should not be visible.

## Call to Action

${SYSTEME_IO_MEDIUM_FINAL_LINK}

${SYSTEME_IO_MEDIUM_FINAL_LINK}`

  const validation = validateFinalMediumArticle({ body })

  assert.equal(validation.validationStatus, "blocked")
  assert.equal(validation.checks.noDuplicateUrl, false)
  assert.equal(validation.checks.noInternalNotes, false)
})

test("validateFinalMediumArticle accepts cleaned Systeme.io Medium copy", () => {
  const cleaned = cleanupMediumArticle({
    title: "Systeme.io Review",
    body: messyBody,
  })
  const validation = validateFinalMediumArticle({ body: cleaned.body })

  assert.equal(validation.validationStatus, "valid")
  assert.deepEqual(validation.blockingReasons, [])
})
