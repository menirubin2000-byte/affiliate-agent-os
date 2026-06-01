import type {
  CampaignPlatform,
  PlatformPolicyCheck,
  PlatformPolicyStatus,
  PublishMode,
} from "@/types/campaign-workflow"

export const CAMPAIGN_PLATFORMS: CampaignPlatform[] = [
  "linkedin",
  "medium",
  "substack",
  "tiktok",
  "quora",
  "reddit",
]

interface PolicyInput {
  platform: CampaignPlatform
  includesAffiliateLink: boolean
  hasVideoAsset?: boolean
  redditRulesVerified?: boolean
}

const PLATFORM_POLICY_SOURCE: Record<CampaignPlatform, string> = {
  linkedin: "https://www.linkedin.com/legal/l/api-terms-of-use",
  medium: "https://help.medium.com/hc/en-us/articles/214151487-Medium-API-Terms-of-Use",
  substack: "https://support.substack.com/hc/en-us/articles/360037831771-How-do-I-publish-a-new-post-on-Substack",
  tiktok: "https://developers.tiktok.com/doc/overview/",
  quora: "https://help.quora.com/hc/en-us/articles/9456583756180-Questions-and-Answers-Policies",
  reddit: "https://developers.reddit.com/docs/guidelines",
}

export function platformAllowsDirectAffiliateLinks(platform: CampaignPlatform) {
  return platform !== "quora"
}

export function evaluatePlatformPolicy(input: PolicyInput): PlatformPolicyCheck {
  if (input.platform === "quora" && input.includesAffiliateLink) {
    return buildPolicy({
      platform: input.platform,
      status: "prohibited",
      publishMode: "prohibited",
      notes: "Quora adaptations must not contain direct affiliate links. Use an educational answer without the affiliate URL.",
      blocker: "quora_affiliate_links_prohibited",
    })
  }

  if (input.platform === "tiktok" && !input.hasVideoAsset) {
    return buildPolicy({
      platform: input.platform,
      status: "requires_manual_verification",
      publishMode: "manual",
      notes: "TikTok requires a video asset and commercial disclosure handling before publish readiness.",
      blocker: "missing_video_asset",
    })
  }

  if (input.platform === "reddit" && !input.redditRulesVerified) {
    return buildPolicy({
      platform: input.platform,
      status: "requires_manual_verification",
      publishMode: "manual",
      notes: "Reddit requires subreddit rules review and explicit user authorization before any publish job.",
      blocker: "reddit_rules_not_verified",
    })
  }

  if (input.platform === "medium") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "browser_helper",
      notes: "Medium publishing is treated as permission-dependent. Browser helper/manual fallback is the safe default.",
      blocker: null,
    })
  }

  if (input.platform === "substack") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "browser_helper",
      notes: "Substack publishing defaults to dashboard/browser-helper flow unless a supported API path is configured.",
      blocker: null,
    })
  }

  if (input.platform === "linkedin") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "browser_helper",
      notes: "LinkedIn API publishing requires approved permissions. Browser helper/manual confirmation is the safe default.",
      blocker: null,
    })
  }

  return buildPolicy({
    platform: input.platform,
    status: "unclear",
    publishMode: "manual",
    notes: "Platform policy could not be confirmed by deterministic defaults.",
    blocker: "policy_unclear",
  })
}

function buildPolicy(input: {
  platform: CampaignPlatform
  status: PlatformPolicyStatus
  publishMode: PublishMode
  notes: string
  blocker: string | null
}): PlatformPolicyCheck {
  return {
    platform: input.platform,
    status: input.status,
    publishMode: input.publishMode,
    manualFallbackRequired: input.publishMode !== "api",
    outputVerificationRequired: true,
    sourceUrl: PLATFORM_POLICY_SOURCE[input.platform],
    notes: input.notes,
    blocker: input.blocker,
  }
}
