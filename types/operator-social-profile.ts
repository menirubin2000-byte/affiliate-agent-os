import type { ResearchedPlatform } from "@/types/platform-capability"

export type OperatorSocialProfilePurpose = "operator_profile"

export interface OperatorSocialProfile {
  platform: ResearchedPlatform
  label: string
  url: string
  purpose: OperatorSocialProfilePurpose
  profileUrlKnown: boolean
  isAffiliateLink: false
  isOAuthConnection: false
  isPublishedRecord: false
}
