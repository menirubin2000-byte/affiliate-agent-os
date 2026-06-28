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
  "mastodon",
  "threads",
]

interface PolicyInput {
  platform: CampaignPlatform
  includesAffiliateLink: boolean
  hasVideoAsset?: boolean
  redditRulesVerified?: boolean
}

// Medium caps new/unverified accounts at 2 published/scheduled stories per 24h.
// Enforce before publishing a Medium post: if 2 medium published_records exist in
// the last 24h, block the attempt and surface this to the operator.
export const MEDIUM_DAILY_POST_LIMIT = 2

const IMAGE_REQUIRED_POLICY_NOTE =
  "Publishing without a real image is forbidden on every non-video platform."
const VIDEO_REQUIRED_POLICY_NOTE =
  "Video-first platforms must include the required video asset; assetless posts are forbidden."

const PLATFORM_POLICY_SOURCE: Record<CampaignPlatform, string> = {
  linkedin:
    "https://www.linkedin.com/help/linkedin/answer/a1341387/prohibited-software-and-extensions?lang=en",
  medium: "https://help.medium.com/hc/en-us/articles/213477928-Medium-Rules",
  substack:
    "https://support.substack.com/hc/en-us/articles/360037455072-Can-I-use-affiliate-links-or-advertising-in-my-emails",
  tiktok: "https://www.tiktok.com/legal/page/global/bc-policy/en",
  quora: "https://help.quora.com/hc/en-us/articles/9456583756180-Questions-and-Answers-Policies",
  reddit: "https://support.reddithelp.com/hc/en-us/articles/360043504051-What-constitutes-spam",
  facebook_page: "https://developers.facebook.com/docs/pages-api/posts/",
  instagram_professional:
    "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/",
  pinterest: "https://developers.pinterest.com/docs/api/v5/",
  x_twitter: "https://docs.x.com/x-api/posts/creation-of-a-post",
  youtube: "https://developers.google.com/youtube/v3/docs/videos/insert",
  mastodon: "https://docs.joinmastodon.org/methods/statuses/",
  threads: "https://developers.facebook.com/docs/threads/posts",
}

function withImageRule(notes: string) {
  return `${notes} ${IMAGE_REQUIRED_POLICY_NOTE}`
}

function withVideoRule(notes: string) {
  return `${notes} ${VIDEO_REQUIRED_POLICY_NOTE}`
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
      notes: withImageRule(
        "Quora posts must not contain direct affiliate, campaign, or tracking links. Use only the public review bridge URL in the post body.",
      ),
      blocker: "quora_direct_tracking_links_prohibited",
    })
  }

  if (input.platform === "reddit" && input.includesAffiliateLink) {
    return buildPolicy({
      platform: input.platform,
      status: "prohibited",
      publishMode: "prohibited",
      notes: withImageRule(
        "Reddit posts must not contain direct affiliate, campaign, or tracking links. Use only the public review bridge URL in the post body.",
      ),
      blocker: "reddit_direct_tracking_links_prohibited",
    })
  }

  if (input.platform === "quora") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "browser_helper",
      notes: withImageRule(
        "Quora/Reddit bridge URL only. The post body may use public_review_url/bridge_url and must not include affiliate_link or campaign_link directly.",
      ),
      blocker: null,
    })
  }

  if (input.platform === "tiktok" && !input.hasVideoAsset) {
    return buildPolicy({
      platform: input.platform,
      status: "requires_manual_verification",
      publishMode: "manual",
      notes: withVideoRule(
        "TikTok requires a video asset and commercial disclosure handling before publish readiness.",
      ),
      blocker: "missing_video_asset",
    })
  }

  if (input.platform === "youtube" && !input.hasVideoAsset) {
    return buildPolicy({
      platform: input.platform,
      status: "requires_manual_verification",
      publishMode: "api",
      notes: withVideoRule(
        "YouTube publishing requires a ready video asset, OAuth, and YouTube Data API upload access.",
      ),
      blocker: "missing_video_asset",
    })
  }

  if (input.platform === "reddit") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "browser_helper",
      notes: withImageRule(
        "Quora/Reddit bridge URL only. The post body may use public_review_url/bridge_url and must not include affiliate_link or campaign_link directly. Keep subreddit/community rules in the compliance notes.",
      ),
      blocker: null,
    })
  }

  if (input.platform === "medium") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "manual",
      notes: withImageRule(
        "Medium publishing is manual-only. Do not use the browser helper/browser form for Medium (Cloudflare bot-challenge blocks automation). Hard limit: max 2 stories per 24 hours per account (Medium rate limit for new/unverified accounts) — never attempt a 3rd within 24h. Every Medium post must include a real image before publish.",
      ),
      blocker: null,
    })
  }

  if (input.platform === "substack") {
    return buildPolicy({
      platform: input.platform,
      status: "requires_manual_verification",
      publishMode: "browser_helper",
      notes: withImageRule(
        "Substack requires a real educational post/newsletter, not pure promotion. Use browser-helper/manual verification.",
      ),
      blocker: "substack_manual_value_check_required",
    })
  }

  if (input.platform === "linkedin") {
    return buildPolicy({
      platform: input.platform,
      status: "requires_manual_verification",
      publishMode: "api",
      notes: withImageRule(
        "LinkedIn publishing is allowed only through an approved official API application. MENI is not assigned copy/paste publishing work.",
      ),
      blocker: "linkedin_developer_app_blocked_not_enough_connections",
    })
  }

  if (input.platform === "facebook_page") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "api",
      notes: withImageRule(
        "Facebook Page publishing is allowed only through the official Meta Pages API with affiliate disclosure.",
      ),
      blocker: null,
    })
  }

  if (input.platform === "instagram_professional") {
    return buildPolicy({
      platform: input.platform,
      status: input.hasVideoAsset ? "allowed" : "requires_manual_verification",
      publishMode: "api",
      notes: withImageRule(
        "Instagram publishing requires a Professional account, official API access, commercial disclosure, and a visual asset.",
      ),
      blocker: input.hasVideoAsset ? null : "instagram_media_asset_required",
    })
  }

  if (input.platform === "pinterest") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "api",
      notes: withImageRule(
        "Pinterest publishing requires official API access, board ID, visual asset, and affiliate disclosure.",
      ),
      blocker: null,
    })
  }

  if (input.platform === "x_twitter") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "api",
      notes: withImageRule(
        "X/Twitter publishing requires official OAuth, API access, and paid partnership disclosure. Hard limit: 280 characters per post (non-premium account; a URL counts as 23 chars). Every X post MUST include a real image — text-only posts are forbidden.",
      ),
      blocker: null,
    })
  }

  if (input.platform === "youtube") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "api",
      notes: withVideoRule(
        "YouTube publishing requires a ready video asset, OAuth, and YouTube Data API upload access.",
      ),
      blocker: null,
    })
  }

  if (input.platform === "mastodon") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "api",
      notes: withImageRule(
        "Mastodon publishing uses a permanent access token (no expiry, no approval). 500-char limit. Post via /api/v1/statuses + /api/v2/media.",
      ),
      blocker: null,
    })
  }

  if (input.platform === "threads") {
    return buildPolicy({
      platform: input.platform,
      status: "allowed",
      publishMode: "api",
      notes: withImageRule(
        "Threads publishing uses the Threads API (long-lived ~60d token, refreshable). 500-char limit. Post via the two-step create + publish containers.",
      ),
      blocker: null,
    })
  }

  return buildPolicy({
    platform: input.platform,
    status: "unclear",
    publishMode: "manual",
    notes: withImageRule("Platform policy could not be confirmed by deterministic defaults."),
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
