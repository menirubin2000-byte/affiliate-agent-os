import type { PlatformCapability } from "@/types/platform-capability"
import { getLinkedInOfficialApiCapability } from "@/lib/linkedin-official-api"
import { PINTEREST_OPERATOR_PROFILE_URL } from "@/lib/operator-social-profiles"
import {
  getPinterestOfficialApiCapability,
  PINTEREST_BOARD_BLOCKING_REASON,
  PINTEREST_CURRENT_BLOCKING_REASON,
} from "@/lib/pinterest-official-api"
import {
  getYouTubeOfficialApiCapability,
  YOUTUBE_API_ACCESS_BLOCKING_REASON,
  YOUTUBE_CURRENT_BLOCKING_REASON,
  YOUTUBE_VIDEO_ASSET_BLOCKING_REASON,
} from "@/lib/youtube-official-api"

const CHECKED_AT = "2026-06-10"
const linkedinCapability = getLinkedInOfficialApiCapability()
const pinterestCapability = getPinterestOfficialApiCapability()
const youtubeCapability = getYouTubeOfficialApiCapability()

const IMAGE_RULE_NOTE =
  "Do not publish a post without a real image/visual asset."
const VIDEO_RULE_NOTE =
  "Do not publish a video-first post without the required video asset."

function withImageRule(notes: string) {
  return `${notes} ${IMAGE_RULE_NOTE}`
}

function withVideoRule(notes: string) {
  return `${notes} ${VIDEO_RULE_NOTE}`
}

export const PLATFORM_CAPABILITIES: PlatformCapability[] = [
  {
    platform: "linkedin",
    label: "LinkedIn",
    apiAvailability: "official_api_available",
    connectionStatus: linkedinCapability.configured ? "connected" : linkedinCapability.oauthAppConfigured ? "requires_official_connection" : "requires_official_connection",
    requiredAccountType:
      "LinkedIn member account with a Developer App that has the Share on LinkedIn product enabled.",
    requiredPermissions: [
      "LinkedIn Developer App",
      "Share on LinkedIn product (w_member_social)",
      "OAuth 2.0 Authorization Code Flow",
      "Access Token + Member URN",
    ],
    affiliateContentPolicy: "allowed_with_disclosure",
    affiliatePolicyNotes:
      withImageRule(
        "Affiliate and sponsored content must be disclosed. LinkedIn supports Sponsored Content labels for paid posts.",
      ),
    safeExecutorPath: "official_api_only",
    browserHelperAllowed: false,
    browserHelperNotes:
      withImageRule(
        "Use the LinkedIn REST API (Posts endpoint). MCP browser is the fallback until API image upload is implemented.",
      ),
    blockers: linkedinCapability.configured
      ? []
      : linkedinCapability.missingKeys.map((k) => `missing_${k.toLowerCase()}`),
    nextOperatorAction: linkedinCapability.configured
      ? "LinkedIn API is connected. Ready for publishing through the REST API."
      : "Connect LinkedIn through OAuth to get an access token and member URN.",
    sourceUrls: [
      "https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin",
      "https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow",
    ],
    checkedAt: CHECKED_AT,
  },
  {
    platform: "facebook_page",
    label: "Facebook Page",
    apiAvailability: "official_api_available",
    connectionStatus: "requires_official_connection",
    requiredAccountType:
      "Facebook Page managed by the connected operator. Personal-profile publishing is not supported.",
    requiredPermissions: [
      "Page Access Token",
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "Page task: CREATE_CONTENT or MANAGE",
    ],
    affiliateContentPolicy: "allowed_with_disclosure",
    affiliatePolicyNotes:
      withImageRule(
        "Commercial or affiliate content must clearly disclose its commercial nature and remain eligible under Meta policies.",
      ),
    safeExecutorPath: "official_api_only",
    browserHelperAllowed: false,
    browserHelperNotes:
      withImageRule(
        "Use the official Pages API after Meta app review and OAuth. Do not automate Facebook composer UI.",
      ),
    blockers: [
      "meta_app_not_configured",
      "facebook_page_not_connected",
      "page_access_token_missing",
      "pages_manage_posts_not_verified",
    ],
    nextOperatorAction: "Connect an eligible Facebook Page through approved Meta OAuth.",
    sourceUrls: [
      "https://developers.facebook.com/docs/pages-api/posts/",
      "https://www.postman.com/meta/facebook/documentation/r56bjfd/facebook-api",
      "https://www.facebook.com/help/233665870791913/",
    ],
    checkedAt: CHECKED_AT,
  },
  {
    platform: "instagram_professional",
    label: "Instagram Business / Creator",
    apiAvailability: "official_api_available",
    connectionStatus: "requires_official_connection",
    requiredAccountType:
      "Instagram Professional account: Business or Creator. Stories publishing is limited to Business accounts.",
    requiredPermissions: [
      "instagram_business_basic",
      "instagram_business_content_publish",
      "Approved Meta app and Instagram OAuth",
    ],
    affiliateContentPolicy: "allowed_with_disclosure",
    affiliatePolicyNotes:
      withImageRule(
        "Affiliate-link content should use Instagram's Paid partnership label and comply with branded-content eligibility.",
      ),
    safeExecutorPath: "official_api_only",
    browserHelperAllowed: false,
    browserHelperNotes:
      withImageRule(
        "Use the official Instagram API. Do not automate the Instagram composer or disclosure controls through the browser.",
      ),
    blockers: [
      "meta_instagram_app_not_configured",
      "instagram_professional_account_not_connected",
      "instagram_business_content_publish_not_verified",
      "instagram_media_asset_required",
    ],
    nextOperatorAction: "Connect an Instagram Professional account through approved Instagram OAuth.",
    sourceUrls: [
      "https://www.postman.com/meta/workspace/instagram/documentation/23987686-9386f468-7714-490f-9bfc-9442db5c8f00",
      "https://www.facebook.com/help/instagram/138925576505882",
      "https://www.facebook.com/help/instagram/1317960375957564/",
    ],
    checkedAt: CHECKED_AT,
  },
  {
    platform: "pinterest",
    label: "Pinterest",
    apiAvailability: "official_api_available",
    connectionStatus: pinterestCapability.connected ? "connected" : "requires_official_connection",
    requiredAccountType:
      "Pinterest Business account to administer the developer app, plus access to the destination board.",
    requiredPermissions: [
      "boards:read",
      "boards:write",
      "pins:read",
      "pins:write",
      "Pinterest OAuth access token",
    ],
    affiliateContentPolicy: "allowed_with_disclosure",
    affiliatePolicyNotes:
      withImageRule(
        "Affiliate Pins are allowed when original, useful, transparent, and non-spammy. Commercial nature and link behavior must be disclosed.",
      ),
    safeExecutorPath: "official_api_only",
    browserHelperAllowed: false,
    browserHelperNotes:
      withImageRule(
        "Use the official Pinterest API after app approval. A visual asset and destination board are required.",
      ),
    operatorProfileUrl: PINTEREST_OPERATOR_PROFILE_URL,
    blockers: [
      ...(pinterestCapability.connected ? [] : [PINTEREST_CURRENT_BLOCKING_REASON]),
      ...(pinterestCapability.missingKeys.includes("PINTEREST_BOARD_ID")
        ? [PINTEREST_BOARD_BLOCKING_REASON]
        : []),
      "pinterest_visual_asset_required",
    ],
    nextOperatorAction: pinterestCapability.publishReady
      ? "Pinterest API is connected. Create only approved publish jobs with a visual asset and verified board."
      : "Connect Pinterest OAuth/access token and select an authorized destination board.",
    sourceUrls: [
      "https://developer.pinterest.com/docs/content/",
      "https://developer.pinterest.com/docs/getting-started/introduction/",
      "https://developer.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/",
      "https://policy.pinterest.com/en-gb/commercial-and-branded-content-guidelines",
    ],
    checkedAt: CHECKED_AT,
  },
  {
    platform: "x_twitter",
    label: "X / Twitter",
    apiAvailability: "official_api_available",
    connectionStatus: "requires_official_connection",
    requiredAccountType:
      "Regular X account connected to an X Developer app through OAuth user context. Pay-per-use API access must be active.",
    requiredPermissions: [
      "X Developer Project and App",
      "OAuth 2.0 Authorization Code Flow with PKCE",
      "tweet.write",
      "tweet.read",
      "users.read",
      "Active API access or credits for paid usage",
    ],
    affiliateContentPolicy: "allowed_with_disclosure",
    affiliatePolicyNotes:
      withImageRule(
        "Affiliate links and discount-code content are treated as paid partnership content on X. Organic posts must use the Paid Partnership disclosure, and the API supports the paid_partnership field.",
      ),
    safeExecutorPath: "official_api_only",
    browserHelperAllowed: false,
    browserHelperNotes:
      withImageRule(
        "Use X API v2 POST /2/tweets with OAuth user access. Do not automate the X composer through the browser.",
      ),
    blockers: [
      "x_oauth_not_configured",
      "x_access_token_missing",
      "x_tweet_write_scope_missing",
      "x_api_credits_or_access_not_ready",
      "x_paid_partnership_disclosure_required",
    ],
    nextOperatorAction: "Connect the X account through official OAuth and keep affiliate posts disclosure-gated.",
    sourceUrls: [
      "https://docs.x.com/x-api/posts/create-post",
      "https://docs.x.com/x-api/posts/manage-tweets/introduction",
      "https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code",
      "https://help.x.com/en/rules-and-policies/paid-partnerships-policy.html",
    ],
    checkedAt: CHECKED_AT,
  },
  {
    platform: "youtube",
    label: "YouTube",
    apiAvailability: "official_api_available",
    connectionStatus: youtubeCapability.oauthAppConfigured ? "connected" : "requires_official_connection",
    requiredAccountType:
      "Google account with a YouTube channel. YouTube Data API does not support service-account authorization.",
    requiredPermissions: [
      "Google OAuth 2.0 consent",
      "https://www.googleapis.com/auth/youtube.upload",
      "YouTube Data API enabled project",
    ],
    affiliateContentPolicy: "allowed_with_disclosure",
    affiliatePolicyNotes:
      withVideoRule(
        "Affiliate content is allowed, but excessive affiliate-only posting can violate spam policy. Commercial relationships require disclosure and paid-promotion handling where applicable.",
      ),
    safeExecutorPath: "official_api_only",
    browserHelperAllowed: false,
    browserHelperNotes:
      withVideoRule(
        "Use the YouTube Data API with a real video asset. Unverified API projects upload videos as private until audited.",
      ),
    blockers: [
      ...(youtubeCapability.oauthAppConfigured ? [] : [YOUTUBE_CURRENT_BLOCKING_REASON]),
      ...(youtubeCapability.invalidReasons.includes(YOUTUBE_API_ACCESS_BLOCKING_REASON)
        ? [YOUTUBE_API_ACCESS_BLOCKING_REASON]
        : []),
      YOUTUBE_VIDEO_ASSET_BLOCKING_REASON,
      "youtube_channel_not_connected",
      "youtube_api_project_audit_required_for_public_uploads",
    ],
    nextOperatorAction: youtubeCapability.oauthAppConfigured
      ? "Connect the YouTube channel through Google OAuth, then publish only approved video jobs."
      : "Configure YouTube OAuth credentials, then connect the YouTube channel through Google OAuth.",
    sourceUrls: [
      "https://developers.google.com/youtube/v3/guides/uploading_a_video",
      "https://developers.google.com/youtube/v3/guides/authentication",
      "https://developers.google.com/youtube/v3/docs/videos",
      "https://support.google.com/youtube/answer/9054257?hl=en-GB",
      "https://support.google.com/youtube/answer/154235?hl=en",
    ],
    checkedAt: CHECKED_AT,
  },
  {
    platform: "mastodon",
    label: "Mastodon",
    apiAvailability: "official_api_available",
    connectionStatus: "connected",
    requiredAccountType:
      "A Mastodon account on any instance (mastodon.social), with a developer application access token.",
    requiredPermissions: ["read", "write:statuses", "write:media"],
    affiliateContentPolicy: "allowed_with_disclosure",
    affiliatePolicyNotes: withImageRule(
      "Affiliate links are allowed with clear disclosure. Mastodon access tokens do not expire — connect once, permanent. 500-character limit.",
    ),
    safeExecutorPath: "official_api_only",
    browserHelperAllowed: false,
    browserHelperNotes: withImageRule(
      "Publish via POST /api/v1/statuses with media uploaded through /api/v2/media. No browser automation needed.",
    ),
    operatorProfileUrl: "https://mastodon.social/@Rubin001",
    blockers: [],
    nextOperatorAction: "Connected. Generate or approve drafts, then publish approved posts with an image.",
    sourceUrls: [
      "https://docs.joinmastodon.org/methods/statuses/",
      "https://docs.joinmastodon.org/methods/media/",
    ],
    checkedAt: CHECKED_AT,
  },
  {
    platform: "threads",
    label: "Threads",
    apiAvailability: "official_api_available",
    connectionStatus: "requires_official_connection",
    requiredAccountType:
      "A Threads account linked to Instagram, with a Threads API app and a long-lived user access token.",
    requiredPermissions: ["threads_basic", "threads_content_publish"],
    affiliateContentPolicy: "allowed_with_disclosure",
    affiliatePolicyNotes: withImageRule(
      "Affiliate links allowed with disclosure. Long-lived token (~60 days, refreshable). 500-character limit.",
    ),
    safeExecutorPath: "official_api_only",
    browserHelperAllowed: false,
    browserHelperNotes: withImageRule(
      "Publish via the Threads API two-step flow: create a media container then publish it. No browser automation.",
    ),
    operatorProfileUrl: "https://www.threads.com/@rubinmeni",
    blockers: ["threads_user_token_missing"],
    nextOperatorAction: "Generate a Threads user token (User Token Generator) for the connected tester account, then publish approved posts with an image.",
    sourceUrls: [
      "https://developers.facebook.com/docs/threads/posts",
      "https://developers.facebook.com/docs/threads/get-started",
    ],
    checkedAt: CHECKED_AT,
  },
]

export function getPlatformCapabilities() {
  return PLATFORM_CAPABILITIES
}
