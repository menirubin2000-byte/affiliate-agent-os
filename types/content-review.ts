import type { CampaignPlatform } from "@/types/campaign-workflow"

export type FinalCopyStatus =
  | "draft_internal"
  | "needs_system_fix"
  | "validated"
  | "ready_for_operator_approval"
  | "operator_approved"
  | "operator_rejected"
  | "ready_for_manual_publish"
  | "published_verified"

export type FinalCopyValidationStatus = "valid" | "blocked" | "fix_requested"

export interface FinalCopy {
  id: string
  productId: string
  productName: string | null
  affiliateProgramId: string | null
  affiliateLink: string | null
  publicReviewUrl: string | null
  sourceContentId: string
  platformAdaptationId: string
  platform: CampaignPlatform
  title: string
  body: string
  contentHash: string
  version: number
  status: FinalCopyStatus
  validationStatus: FinalCopyValidationStatus
  blockingReasons: string[]
  approvedBy: string | null
  approvedAt: string | null
  repairTaskId: string | null
  createdAt: string
  updatedAt: string
}

export interface FinalContentValidation {
  validationStatus: FinalCopyValidationStatus
  blockingReasons: string[]
  checks: {
    disclosureAtTop: boolean
    oneCtaOnly: boolean
    affiliateLinkExists: boolean
    noDuplicateUrl: boolean
    noInternalNotes: boolean
    noPersonalExperienceClaim: boolean
    noIncomeOrGuaranteeClaim: boolean
    mediaReady?: boolean
    imageReady?: boolean
    videoReady?: boolean
    automaticReadyAllowed?: boolean
  }
}
