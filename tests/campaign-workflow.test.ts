import assert from "node:assert/strict"
import test from "node:test"

import {
  buildCampaignQualityChecks,
  buildPlatformBody,
  hashCampaignContent,
} from "@/lib/campaign-workflow"
import { evaluatePlatformPolicy } from "@/lib/platform-policy"

const affiliateLink = "https://try.example.com/abc123"

function baseBody(link = affiliateLink) {
  return [
    "Affiliate disclosure: This post contains an affiliate link. If you sign up through it, I may earn a commission at no extra cost to you.",
    "This practical systeme.io review covers who the product may fit, key features, limitations, and setup considerations.",
    "It is written as an operator checklist, not a fake personal review or guaranteed result claim.",
    `CTA: Learn more here: ${link}`,
  ].join("\n\n")
}

test("linkedin content requires manual verification before publish readiness", () => {
  const { quality, policy } = buildCampaignQualityChecks({
    platform: "linkedin",
    title: "Systeme.io Review",
    body: baseBody(),
    targetKeyword: "systeme.io review",
    affiliateLink,
    campaignLinkUrl: affiliateLink,
  })

  assert.equal(policy.status, "requires_manual_verification")
  assert.equal(quality.passed, false)
  assert.equal(quality.blockers.includes("linkedin_manual_verification_required"), true)
})

test("missing affiliate link blocks platforms that allow affiliate links", () => {
  const { quality } = buildCampaignQualityChecks({
    platform: "linkedin",
    title: "Systeme.io Review",
    body: baseBody("https://example.com/plain"),
    targetKeyword: "systeme.io review",
    affiliateLink,
    campaignLinkUrl: affiliateLink,
  })

  assert.equal(quality.passed, false)
  assert.equal(quality.blockers.includes("missing_real_affiliate_link"), true)
})

test("quora adaptations remove direct affiliate links and remain manual verification", () => {
  const body = buildPlatformBody({
    platform: "quora",
    sourceBody: baseBody(),
    campaignLinkUrl: affiliateLink,
  })
  const policy = evaluatePlatformPolicy({
    platform: "quora",
    includesAffiliateLink: body.includes(affiliateLink),
  })

  assert.equal(body.includes(affiliateLink), false)
  assert.equal(policy.status, "requires_manual_verification")
})

test("quora with a direct affiliate link is prohibited", () => {
  const policy = evaluatePlatformPolicy({
    platform: "quora",
    includesAffiliateLink: true,
  })

  assert.equal(policy.status, "prohibited")
  assert.equal(policy.publishMode, "prohibited")
})

test("tiktok without video asset is not publish-ready", () => {
  const { quality, policy } = buildCampaignQualityChecks({
    platform: "tiktok",
    title: "Systeme.io Review",
    body: `Hook: Quick review.\n\n${baseBody()}`,
    targetKeyword: "systeme.io review",
    affiliateLink,
    campaignLinkUrl: affiliateLink,
    hasVideoAsset: false,
  })

  assert.equal(policy.status, "requires_manual_verification")
  assert.equal(quality.passed, false)
  assert.equal(quality.blockers.includes("missing_video_asset"), true)
})

test("content hash is stable for unchanged source/adaptation content", () => {
  const first = hashCampaignContent(["product-1", "linkedin", "Title", "Body"])
  const second = hashCampaignContent([" product-1 ", "linkedin", "Title", "Body"])

  assert.equal(first, second)
})
