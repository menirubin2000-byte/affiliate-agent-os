import assert from "node:assert/strict"
import test from "node:test"

import {
  buildCampaignQualityChecks,
  buildPlatformBody,
  hashCampaignContent,
} from "@/lib/campaign-workflow"
import { evaluatePlatformPolicy } from "@/lib/platform-policy"

const affiliateLink = "https://try.example.com/abc123"
const publicReviewUrl = "https://affiliate-agent-os.vercel.app/reviews/systeme-io"

function baseBody(link = affiliateLink) {
  return [
    "Affiliate disclosure: This post contains an affiliate link. If you sign up through it, I may earn a commission at no extra cost to you.",
    "This practical systeme.io review covers who the product may fit, key features, limitations, and setup considerations.",
    "It is written as an operator checklist, not a fake personal review or guaranteed result claim.",
    `CTA: Learn more here: ${link}`,
  ].join("\n\n")
}

test("linkedin content remains blocked until the official developer app is available", () => {
  const { quality, policy } = buildCampaignQualityChecks({
    platform: "linkedin",
    title: "Systeme.io Review",
    body: baseBody(),
    targetKeyword: "systeme.io review",
    affiliateLink,
    campaignLinkUrl: affiliateLink,
  })

  assert.equal(policy.status, "requires_manual_verification")
  assert.equal(policy.publishMode, "api")
  assert.equal(quality.passed, false)
  assert.equal(
    quality.blockers.includes("linkedin_developer_app_blocked_not_enough_connections"),
    true,
  )
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
    publicReviewUrl,
  })
  const policy = evaluatePlatformPolicy({
    platform: "quora",
    includesAffiliateLink: body.includes(affiliateLink),
  })

  assert.equal(body.includes(affiliateLink), false)
  assert.equal(body.includes(publicReviewUrl), true)
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

test("reddit stays blocked until community rules are verified", () => {
  const body = buildPlatformBody({
    platform: "reddit",
    sourceBody: baseBody(),
    campaignLinkUrl: affiliateLink,
    publicReviewUrl,
  })
  const { quality, policy } = buildCampaignQualityChecks({
    platform: "reddit",
    title: "Useful discussion",
    body,
    targetKeyword: "systeme.io review",
    affiliateLink,
    campaignLinkUrl: affiliateLink,
    redditRulesVerified: false,
  })

  assert.equal(body.includes(affiliateLink), false)
  assert.equal(body.includes(publicReviewUrl), true)
  assert.equal(policy.status, "requires_manual_verification")
  assert.equal(policy.blocker, "reddit_community_rules_not_verified")
  assert.equal(quality.passed, false)
})

test("reddit with a direct affiliate link is prohibited", () => {
  const policy = evaluatePlatformPolicy({
    platform: "reddit",
    includesAffiliateLink: true,
    redditRulesVerified: true,
  })

  assert.equal(policy.status, "prohibited")
  assert.equal(policy.blocker, "reddit_direct_affiliate_links_prohibited")
})

test("content hash is stable for unchanged source/adaptation content", () => {
  const first = hashCampaignContent(["product-1", "linkedin", "Title", "Body"])
  const second = hashCampaignContent([" product-1 ", "linkedin", "Title", "Body"])

  assert.equal(first, second)
})
