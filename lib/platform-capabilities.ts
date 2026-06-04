import type { PlatformCapability } from "@/types/platform-capability"

const CHECKED_AT = "2026-06-04"

export const PLATFORM_CAPABILITIES: PlatformCapability[] = [
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
      "Commercial or affiliate content must clearly disclose its commercial nature and remain eligible under Meta policies.",
    safeExecutorPath: "official_api_only",
    browserHelperAllowed: false,
    browserHelperNotes:
      "Use the official Pages API after Meta app review and OAuth. Do not automate Facebook composer UI.",
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
      "Affiliate-link content should use Instagram's Paid partnership label and comply with branded-content eligibility.",
    safeExecutorPath: "official_api_only",
    browserHelperAllowed: false,
    browserHelperNotes:
      "Use the official Instagram API. Do not automate the Instagram composer or disclosure controls through the browser.",
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
    connectionStatus: "requires_official_connection",
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
      "Affiliate Pins are allowed when original, useful, transparent, and non-spammy. Commercial nature and link behavior must be disclosed.",
    safeExecutorPath: "official_api_only",
    browserHelperAllowed: false,
    browserHelperNotes:
      "Use the official Pinterest API after app approval. A visual asset and destination board are required.",
    blockers: [
      "pinterest_app_not_approved",
      "pinterest_account_not_connected",
      "pinterest_board_not_selected",
      "pinterest_visual_asset_required",
    ],
    nextOperatorAction: "Connect Pinterest OAuth and select an authorized destination board.",
    sourceUrls: [
      "https://developer.pinterest.com/docs/content/",
      "https://developer.pinterest.com/docs/getting-started/introduction/",
      "https://developer.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/",
      "https://policy.pinterest.com/en-gb/commercial-and-branded-content-guidelines",
    ],
    checkedAt: CHECKED_AT,
  },
  {
    platform: "youtube",
    label: "YouTube",
    apiAvailability: "official_api_available",
    connectionStatus: "requires_official_connection",
    requiredAccountType:
      "Google account with a YouTube channel. YouTube Data API does not support service-account authorization.",
    requiredPermissions: [
      "Google OAuth 2.0 consent",
      "https://www.googleapis.com/auth/youtube.upload",
      "YouTube Data API enabled project",
    ],
    affiliateContentPolicy: "allowed_with_disclosure",
    affiliatePolicyNotes:
      "Affiliate content is allowed, but excessive affiliate-only posting can violate spam policy. Commercial relationships require disclosure and paid-promotion handling where applicable.",
    safeExecutorPath: "official_api_only",
    browserHelperAllowed: false,
    browserHelperNotes:
      "Use the YouTube Data API with a real video asset. Unverified API projects upload videos as private until audited.",
    blockers: [
      "youtube_oauth_not_configured",
      "youtube_channel_not_connected",
      "youtube_video_asset_required",
      "youtube_api_project_audit_required_for_public_uploads",
    ],
    nextOperatorAction: "Connect the YouTube channel through Google OAuth after an upload-ready video exists.",
    sourceUrls: [
      "https://developers.google.com/youtube/v3/guides/uploading_a_video",
      "https://developers.google.com/youtube/v3/guides/authentication",
      "https://developers.google.com/youtube/v3/docs/videos",
      "https://support.google.com/youtube/answer/9054257?hl=en-GB",
      "https://support.google.com/youtube/answer/154235?hl=en",
    ],
    checkedAt: CHECKED_AT,
  },
]

export function getPlatformCapabilities() {
  return PLATFORM_CAPABILITIES
}
