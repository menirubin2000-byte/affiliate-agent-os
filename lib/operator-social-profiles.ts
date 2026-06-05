import type { ResearchedPlatform } from "@/types/platform-capability"
import type { OperatorSocialProfile } from "@/types/operator-social-profile"

export const PINTEREST_OPERATOR_PROFILE_URL =
  "https://www.pinterest.com/rubinqs0941/?actingBusinessId=1143633036534323486"

export const OPERATOR_SOCIAL_PROFILES: OperatorSocialProfile[] = [
  {
    platform: "pinterest",
    label: "Pinterest",
    url: PINTEREST_OPERATOR_PROFILE_URL,
    purpose: "operator_profile",
    profileUrlKnown: true,
    isAffiliateLink: false,
    isOAuthConnection: false,
    isPublishedRecord: false,
  },
]

export function getOperatorSocialProfiles() {
  return OPERATOR_SOCIAL_PROFILES
}

export function getOperatorSocialProfile(platform: ResearchedPlatform) {
  return OPERATOR_SOCIAL_PROFILES.find((profile) => profile.platform === platform) ?? null
}

export function getAffiliateSignupSocialLinks() {
  return OPERATOR_SOCIAL_PROFILES.map((profile) => ({
    platform: profile.platform,
    label: profile.label,
    url: profile.url,
    purpose: profile.purpose,
  }))
}
