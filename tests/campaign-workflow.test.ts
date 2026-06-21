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

test("quora adaptations remove direct affiliate links and use the public review URL", () => {
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
  assert.equal(policy.status, "allowed")
})

test("quora with a direct affiliate or campaign link is prohibited", () => {
  const { quality, policy } = buildCampaignQualityChecks({
    platform: "quora",
    title: "Systeme.io Review",
    body: baseBody(),
    targetKeyword: "systeme.io review",
    affiliateLink,
    campaignLinkUrl: affiliateLink,
    publicReviewUrl,
  })

  assert.equal(policy.status, "prohibited")
  assert.equal(policy.publishMode, "prohibited")
  assert.equal(quality.passed, false)
  assert.equal(quality.blockers.includes("direct_tracking_link_not_allowed"), true)
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

test("reddit passes link validation with public review URL only", () => {
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
    publicReviewUrl,
  })

  assert.equal(body.includes(affiliateLink), false)
  assert.equal(body.includes(publicReviewUrl), true)
  assert.equal(policy.status, "allowed")
  assert.equal(policy.blocker, null)
  assert.equal(quality.passed, true)
})

test("reddit without public review URL is blocked", () => {
  const body = buildPlatformBody({
    platform: "reddit",
    sourceBody: baseBody(),
    campaignLinkUrl: affiliateLink,
  })
  const { quality, policy } = buildCampaignQualityChecks({
    platform: "reddit",
    title: "Useful discussion",
    body,
    targetKeyword: "systeme.io review",
    affiliateLink,
    campaignLinkUrl: affiliateLink,
  })

  assert.equal(policy.status, "allowed")
  assert.equal(quality.passed, false)
  assert.equal(quality.blockers.includes("missing_public_review_url"), true)
})

test("medium is manual-only and still requires a real image", () => {
  const policy = evaluatePlatformPolicy({
    platform: "medium",
    includesAffiliateLink: true,
  })

  assert.equal(policy.status, "allowed")
  assert.equal(policy.publishMode, "manual")
  assert.equal(policy.notes.includes("manual-only"), true)
  assert.equal(policy.notes.includes("real image"), true)
})

test("content hash is stable for unchanged source/adaptation content", () => {
  const first = hashCampaignContent(["product-1", "linkedin", "Title", "Body"])
  const second = hashCampaignContent([" product-1 ", "linkedin", "Title", "Body"])

  assert.equal(first, second)
})
