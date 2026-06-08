import { createHash } from "node:crypto"

import {
  evaluatePlatformPolicy,
  platformAllowsDirectAffiliateLinks,
} from "@/lib/platform-policy"
import type {
  CampaignPlatform,
  CampaignQualityChecks,
  PlatformPolicyCheck,
} from "@/types/campaign-workflow"

const FAKE_CLAIM_PATTERNS = [
  "guaranteed income",
  "guaranteed results",
  "5-star",
  "best price today",
  "limited-time discount",
  "verified testimonials",
  "thousands of reviews",
  "i tested",
  "my results",
]

export function hashCampaignContent(parts: Array<string | null | undefined>) {
  return createHash("sha256")
    .update(parts.map((part) => normalizeText(part ?? "")).join("\n---\n"))
    .digest("hex")
}

export function buildCampaignQualityChecks(input: {
  platform: CampaignPlatform
  title: string | null
  body: string
  targetKeyword: string | null
  affiliateLink: string | null
  campaignLinkUrl?: string | null
  publicReviewUrl?: string | null
  hasVideoAsset?: boolean
  redditRulesVerified?: boolean
}): {
  quality: CampaignQualityChecks
  policy: PlatformPolicyCheck
} {
  const body = input.body
  const combined = `${input.title ?? ""}\n${body}`
  const allowsAffiliateLink = platformAllowsDirectAffiliateLinks(input.platform)
  const expectedLink = input.campaignLinkUrl?.trim() || input.affiliateLink?.trim() || ""
  const forbiddenDirectLinks = [input.campaignLinkUrl, input.affiliateLink]
    .map((url) => url?.trim())
    .filter((url): url is string => Boolean(url))
  const bridgeOnlyPlatform = input.platform === "quora" || input.platform === "reddit"
  const publicReviewUrl = input.publicReviewUrl?.trim() ?? ""
  const includesAffiliateLink = Boolean(expectedLink && combined.includes(expectedLink))
  const includesForbiddenDirectLink = forbiddenDirectLinks.some((url) => combined.includes(url))
  const includesPublicReviewUrl = Boolean(publicReviewUrl && combined.includes(publicReviewUrl))
  const urlsInBody = extractUrls(combined)
  const hasOnlyBridgeUrls =
    !bridgeOnlyPlatform ||
    urlsInBody.every((url) => isAllowedPublicReviewUrl(url, publicReviewUrl))
  const policy = evaluatePlatformPolicy({
    platform: input.platform,
    includesAffiliateLink: bridgeOnlyPlatform
      ? includesForbiddenDirectLink || !hasOnlyBridgeUrls
      : includesAffiliateLink,
    hasVideoAsset: input.hasVideoAsset,
    redditRulesVerified: input.redditRulesVerified,
  })

  const blockers: string[] = []
  const disclosurePresent = hasDisclosure(body)
  const ctaPresent = hasCta(body)
  const affiliateLinkPresent = bridgeOnlyPlatform
    ? includesPublicReviewUrl && !includesForbiddenDirectLink && hasOnlyBridgeUrls
    : allowsAffiliateLink
      ? includesAffiliateLink
      : !includesAffiliateLink
  const avoidsFakeClaims = avoidsFakeClaimsCheck(body)
  const targetKeywordPresent = hasTargetKeyword(combined, input.targetKeyword)
  const minimumLength = body.trim().length >= minimumLengthForPlatform(input.platform)
  const platformCompatible = isPlatformCompatible(input.platform, body)
  const policyCompatible = policy.status === "allowed"

  if (!disclosurePresent) blockers.push("missing_disclosure")
  if (!ctaPresent) blockers.push("missing_cta")
  if (bridgeOnlyPlatform && !includesPublicReviewUrl) blockers.push("missing_public_review_url")
  if (bridgeOnlyPlatform && (includesForbiddenDirectLink || !hasOnlyBridgeUrls)) {
    blockers.push("direct_tracking_link_not_allowed")
  }
  if (allowsAffiliateLink && !affiliateLinkPresent) blockers.push("missing_real_affiliate_link")
  if (!allowsAffiliateLink && includesForbiddenDirectLink) blockers.push("affiliate_link_not_allowed")
  if (!avoidsFakeClaims) blockers.push("unsupported_claims")
  if (!targetKeywordPresent) blockers.push("missing_target_keyword")
  if (!minimumLength) blockers.push("minimum_length_not_met")
  if (!platformCompatible) blockers.push("platform_format_not_compatible")
  if (!policyCompatible) blockers.push(policy.blocker ?? "policy_not_allowed")

  const quality: CampaignQualityChecks = {
    disclosurePresent,
    ctaPresent,
    affiliateLinkPresent,
    avoidsFakeClaims,
    targetKeywordPresent,
    minimumLength,
    platformCompatible,
    policyCompatible,
    passed: blockers.length === 0,
    blockers,
  }

  return { quality, policy }
}

export function buildPlatformBody(input: {
  platform: CampaignPlatform
  sourceBody: string
  campaignLinkUrl: string | null
  affiliateLink?: string | null
  publicReviewUrl?: string | null
}) {
  const sourceBody = input.sourceBody.trim()

  if (input.platform === "quora" || input.platform === "reddit") {
    return buildBridgeBody({
      body: sourceBody,
      bridgeUrl: input.publicReviewUrl ?? null,
      forbiddenUrls: [input.campaignLinkUrl, input.affiliateLink],
    })
  }

  if (!input.campaignLinkUrl) return sourceBody
  if (sourceBody.includes(input.campaignLinkUrl)) return sourceBody

  return `${sourceBody}\n\nCTA: Learn more here: ${input.campaignLinkUrl}`
}

export function getFirstBlockingReason(quality: CampaignQualityChecks, policy: PlatformPolicyCheck) {
  if (quality.blockers.length) return quality.blockers.join(", ")
  if (policy.blocker) return policy.blocker
  return null
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

function extractUrls(value: string) {
  return Array.from(value.matchAll(/https?:\/\/[^\s)\]]+/gi), (match) =>
    match[0].replace(/[.,;:!?]+$/, ""),
  )
}

function isAllowedPublicReviewUrl(url: string, publicReviewUrl: string) {
  if (!publicReviewUrl) return false
  return (
    url === publicReviewUrl ||
    url.startsWith(`${publicReviewUrl}?`) ||
    url.startsWith(`${publicReviewUrl}#`)
  )
}

function hasDisclosure(body: string) {
  const normalized = normalizeText(body)
  return (
    normalized.includes("affiliate disclosure") ||
    normalized.includes("affiliate link") ||
    normalized.includes("may earn a commission") ||
    normalized.includes("commission at no extra cost")
  )
}

function hasCta(body: string) {
  const normalized = normalizeText(body)
  return (
    normalized.includes("cta:") ||
    normalized.includes("learn more") ||
    normalized.includes("try ") ||
    normalized.includes("visit ") ||
    normalized.includes("check ")
  )
}

function avoidsFakeClaimsCheck(body: string) {
  const normalized = normalizeText(body)
  return !FAKE_CLAIM_PATTERNS.some((pattern) => normalized.includes(pattern))
}

function hasTargetKeyword(combined: string, targetKeyword: string | null) {
  if (!targetKeyword?.trim()) return false
  return normalizeText(combined).includes(normalizeText(targetKeyword))
}

function minimumLengthForPlatform(platform: CampaignPlatform) {
  if (platform === "tiktok") return 180
  if (
    platform === "linkedin" ||
    platform === "quora" ||
    platform === "reddit" ||
    platform === "facebook_page" ||
    platform === "instagram_professional"
  ) {
    return 280
  }
  return 700
}

function isPlatformCompatible(platform: CampaignPlatform, body: string) {
  if (platform === "tiktok") {
    return normalizeText(body).includes("hook") || body.length < 1200
  }
  if (platform === "linkedin") {
    return body.length <= 3000
  }
  if (platform === "reddit") {
    return hasDisclosure(body)
  }
  if (platform === "facebook_page") {
    return body.length <= 5000
  }
  if (platform === "instagram_professional") {
    return body.length <= 2200
  }
  return true
}

function removeAffiliateLinks(body: string, urls: Array<string | null | undefined>) {
  const links = urls.filter((url): url is string => Boolean(url?.trim()))
  if (!links.length) return body
  return body
    .split("\n")
    .filter((line) => !links.some((link) => line.includes(link)))
    .join("\n")
    .trim()
}

function buildBridgeBody(input: {
  body: string
  bridgeUrl: string | null
  forbiddenUrls: Array<string | null | undefined>
}) {
  const safeBridgeUrl = input.bridgeUrl?.trim()
  const withoutForbiddenLinks = removeAffiliateLinks(input.body, input.forbiddenUrls)
    .split("\n")
    .filter((line) => !/https?:\/\//i.test(line))
    .join("\n")
    .trim()

  if (!safeBridgeUrl) return withoutForbiddenLinks

  return `${withoutForbiddenLinks}\n\nCTA: Read the public review page here: ${safeBridgeUrl}`
}
