export type CampaignPlatform =
  | "linkedin"
  | "medium"
  | "substack"
  | "tiktok"
  | "quora"
  | "reddit"
  | "facebook_page"
  | "instagram_professional"
  | "pinterest"
  | "x_twitter"
  | "youtube"

export type AutoQualityStatus = "pending" | "auto_quality_passed" | "blocked"

export type PlatformPolicyStatus =
  | "allowed"
  | "prohibited"
  | "unclear"
  | "requires_manual_verification"

export type PublishMode = "api" | "browser_helper" | "manual" | "prohibited"

export type CampaignApprovalStatus =
  | "not_requested"
  | "campaign_approved"
  | "excluded"
  | "blocked"

export type CampaignApprovalRecordStatus = "approved" | "rejected" | "cancelled"

export interface CampaignQualityChecks {
  disclosurePresent: boolean
  ctaPresent: boolean
  affiliateLinkPresent: boolean
  avoidsFakeClaims: boolean
  targetKeywordPresent: boolean
  minimumLength: boolean
  platformCompatible: boolean
  policyCompatible: boolean
  passed: boolean
  blockers: string[]
}

export interface PlatformPolicyCheck {
  platform: CampaignPlatform
  status: PlatformPolicyStatus
  publishMode: PublishMode
  manualFallbackRequired: boolean
  outputVerificationRequired: boolean
  sourceUrl: string
  notes: string
  blocker: string | null
}

export interface SourceContent {
  id: string
  productId: string
  productName: string | null
  campaignName: string
  angle: string | null
  title: string
  body: string
  targetKeyword: string | null
  contentHash: string
  status: "active" | "archived"
  qualityChecks: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface PlatformAdaptation {
  id: string
  sourceContentId: string
  productId: string
  productName: string | null
  platform: CampaignPlatform
  title: string
  body: string
  campaignLinkId: string | null
  campaignLinkUrl: string | null
  contentHash: string
  qualityChecks: CampaignQualityChecks
  autoQualityStatus: AutoQualityStatus
  blockingReason: string | null
  policyCheckStatus: PlatformPolicyStatus
  policyCheckedAt: string | null
  policySourceUrl: string | null
  policyNotes: string | null
  publishMode: PublishMode
  manualFallbackRequired: boolean
  outputVerificationRequired: boolean
  campaignApprovalStatus: CampaignApprovalStatus
  createdAt: string
  updatedAt: string
}

export interface CampaignApprovalRecord {
  id: string
  productId: string
  sourceContentId: string
  status: CampaignApprovalRecordStatus
  approvedPlatforms: CampaignPlatform[]
  excludedPlatforms: Record<string, string>
  approvedBy: string | null
  approvalNotes: string | null
  approvedAt: string
  createdAt: string
  updatedAt: string
}

export interface PublishedRecord {
  id: string
  productId: string
  sourceContentId: string
  platformAdaptationId: string
  browserJobId: string | null
  platform: CampaignPlatform
  liveUrl: string
  verificationStatus: "verified" | "failed"
  verifiedAt: string
  createdAt: string
  updatedAt: string
}

export interface CampaignWorkflowProduct {
  productId: string
  productName: string
  productStatus: string
  affiliateLink: string | null
  hasLinkReadyProgram: boolean
  sourceContent: SourceContent | null
  adaptations: PlatformAdaptation[]
  approvedCampaign: CampaignApprovalRecord | null
  publishedRecords: PublishedRecord[]
  blockers: string[]
  eligiblePlatforms: CampaignPlatform[]
}
