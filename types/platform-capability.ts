export type ResearchedPlatform =
  | "linkedin"
  | "facebook_page"
  | "instagram_professional"
  | "pinterest"
  | "x_twitter"
  | "youtube"

export type PlatformApiAvailability = "official_api_available" | "no_official_publish_api"

export type PlatformConnectionStatus =
  | "requires_official_connection"
  | "connected"
  | "blocked"

export type AffiliateContentPolicy =
  | "allowed_with_disclosure"
  | "restricted"
  | "prohibited"

export type SafeExecutorPath = "official_api_only" | "browser_helper_allowed" | "not_available"

export interface PlatformCapability {
  platform: ResearchedPlatform
  label: string
  apiAvailability: PlatformApiAvailability
  connectionStatus: PlatformConnectionStatus
  requiredAccountType: string
  requiredPermissions: string[]
  affiliateContentPolicy: AffiliateContentPolicy
  affiliatePolicyNotes: string
  safeExecutorPath: SafeExecutorPath
  browserHelperAllowed: boolean
  browserHelperNotes: string
  operatorProfileUrl?: string
  blockers: string[]
  nextOperatorAction: string
  sourceUrls: string[]
  checkedAt: string
}
