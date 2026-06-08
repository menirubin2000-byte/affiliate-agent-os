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
  "facebook_page",
  "instagram_professional",
  "pinterest",
  "x_twitter",
  "youtube",
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
  facebook_page: "https://developers.facebook.com/docs/pages-api/posts/",
  instagram_professional: "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/",
  pinterest: "https://developers.pinterest.com/docs/api/v5/",
  x_twitter: "https://docs.x.com/x-api/posts/creation-of-a-post",
  youtube: "https://developers.google.com/youtube/v3/docs/videos/insert",
}

export function platformAllowsDirectAffiliateLinks(platform: CampaignPlatform) {
  return platform !== "quora" && platform !== "reddit"
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

  if (input.platform === "reddit" && input.includesAffiliateLink) {
    return buildPolicy({
      platform: input.platform,
      status: "prohibited",
      publishMode: "prohibited",
      notes: "Reddit posts must not contain direct affiliate or campaign links. Link only to the public review bridge page after subreddit rules are verified.",
      blocker: "reddit_direct_affiliate_links_prohibited",
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

  if (input.platform === "youtube" && !input.hasVideoAsset) {
    return buildPolicy({
      platform: input.platform,
      status: "requires_manual_verification",
      publishMode: "api",
      notes: "YouTube publishing requires a ready video asset, OAuth, and YouTube Data API upload access.",
      blocker: "missing_video_asset",
    })
  }

  if (input.platform === "reddit" && !input.redditRulesVerified) {
    return buildPolicy({
      platform: input.platform,
      status: "requires_manual_verification",
      publishMode: "manual",
      notes: "Reddit requires a verified subreddit-specific rules match before any publish job. Generic Reddit submit or home-feed publishing is disabled.",
      blocker: "reddit_community_rules_not_verified",
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

  if (input.platform === "facebook_page") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "api",
      notes: "Facebook Page publishing is allowed only through the official Meta Pages API with affiliate disclosure.",
      blocker: null,
    })
  }

  if (input.platform === "instagram_professional") {
    return buildPolicy({
      platform: input.platform,
      status: input.hasVideoAsset ? "allowed" : "requires_manual_verification",
      publishMode: "api",
      notes: "Instagram publishing requires a Professional account, official API access, commercial disclosure, and a visual asset.",
      blocker: input.hasVideoAsset ? null : "instagram_media_asset_required",
    })
  }

  if (input.platform === "pinterest") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "api",
      notes: "Pinterest publishing requires official API access, board ID, visual asset, and affiliate disclosure.",
      blocker: null,
    })
  }

  if (input.platform === "x_twitter") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "api",
      notes: "X/Twitter publishing requires official OAuth, API access, and paid partnership disclosure.",
      blocker: null,
    })
  }

  if (input.platform === "youtube") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "api",
      notes: "YouTube publishing requires a ready video asset, OAuth, and YouTube Data API upload access.",
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
