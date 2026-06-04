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
  linkedin: "https://www.linkedin.com/help/linkedin/answer/a1341387/prohibited-software-and-extensions?lang=en",
  medium: "https://help.medium.com/hc/en-us/articles/213477928-Medium-Rules",
  substack: "https://support.substack.com/hc/en-us/articles/360037455072-Can-I-use-affiliate-links-or-advertising-in-my-emails",
  tiktok: "https://www.tiktok.com/legal/page/global/bc-policy/en",
  quora: "https://help.quora.com/hc/en-us/articles/9456583756180-Questions-and-Answers-Policies",
  reddit: "https://support.reddithelp.com/hc/en-us/articles/360043504051-What-constitutes-spam",
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

  if (input.platform === "quora") {
    return buildPolicy({
      platform: input.platform,
      status: "requires_manual_verification",
      publishMode: "manual",
      notes: "Quora answers must stay educational and cannot contain direct affiliate links.",
      blocker: "quora_manual_no_direct_affiliate_link",
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
      status: "requires_manual_verification",
      publishMode: "browser_helper",
      notes: "Substack requires a real educational post/newsletter, not pure promotion. Use browser-helper/manual verification.",
      blocker: "substack_manual_value_check_required",
    })
  }

  if (input.platform === "linkedin") {
    return buildPolicy({
      platform: input.platform,
      status: "requires_manual_verification",
      publishMode: "api",
      notes: "LinkedIn publishing is allowed only through an approved official API application. No browser-helper or manual publishing fallback is assigned to MENI.",
      blocker: "linkedin_developer_app_blocked_not_enough_connections",
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
