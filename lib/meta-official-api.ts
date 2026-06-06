export const FACEBOOK_CURRENT_BLOCKING_REASON = "facebook_page_official_api_not_configured"
export const INSTAGRAM_CURRENT_BLOCKING_REASON = "instagram_official_api_not_configured"

const FACEBOOK_REQUIRED_ENV_KEYS = [
  "FB_PAGE_ACCESS_TOKEN",
  "FB_PAGE_ID",
] as const

const INSTAGRAM_REQUIRED_ENV_KEYS = [
  "IG_ACCESS_TOKEN",
  "IG_BUSINESS_ACCOUNT_ID",
] as const

export type FacebookRequiredEnvKey = (typeof FACEBOOK_REQUIRED_ENV_KEYS)[number]
export type InstagramRequiredEnvKey = (typeof INSTAGRAM_REQUIRED_ENV_KEYS)[number]

export type MetaOfficialApiCapability = {
  configured: boolean
  tokenStorage: "server_environment"
  publishEndpoint: string
  missingKeys: string[]
  invalidReasons: string[]
  blockingReason: string | null
}

function value(env: NodeJS.ProcessEnv, key: string) {
  return env[key]?.trim() ?? ""
}

function numericIdIsValid(id: string) {
  return /^\d+$/.test(id)
}

export function getFacebookPageOfficialApiCapability(
  env: NodeJS.ProcessEnv = process.env,
): MetaOfficialApiCapability {
  const missingKeys = FACEBOOK_REQUIRED_ENV_KEYS.filter((key) => !value(env, key))
  const invalidReasons: string[] = []
  const pageId = value(env, "FB_PAGE_ID")

  if (pageId && !numericIdIsValid(pageId)) {
    invalidReasons.push("facebook_page_id_invalid")
  }

  return {
    configured: missingKeys.length === 0 && invalidReasons.length === 0,
    tokenStorage: "server_environment",
    publishEndpoint: "https://graph.facebook.com/v23.0/{page-id}/feed",
    missingKeys,
    invalidReasons,
    blockingReason:
      missingKeys.length === 0 && invalidReasons.length === 0
        ? null
        : FACEBOOK_CURRENT_BLOCKING_REASON,
  }
}

export function getInstagramOfficialApiCapability(
  env: NodeJS.ProcessEnv = process.env,
): MetaOfficialApiCapability {
  const missingKeys = INSTAGRAM_REQUIRED_ENV_KEYS.filter((key) => !value(env, key))
  const invalidReasons: string[] = []
  const accountId = value(env, "IG_BUSINESS_ACCOUNT_ID")

  if (accountId && !numericIdIsValid(accountId)) {
    invalidReasons.push("instagram_business_account_id_invalid")
  }

  return {
    configured: missingKeys.length === 0 && invalidReasons.length === 0,
    tokenStorage: "server_environment",
    publishEndpoint: "https://graph.instagram.com/v23.0/{ig-user-id}/media_publish",
    missingKeys,
    invalidReasons,
    blockingReason:
      missingKeys.length === 0 && invalidReasons.length === 0
        ? null
        : INSTAGRAM_CURRENT_BLOCKING_REASON,
  }
}

export function facebookGraphPostIdToLiveUrl(postId: string) {
  const normalized = postId.trim()
  if (!/^\d+_\d+$/.test(normalized) && !/^\d+$/.test(normalized)) return null
  return `https://www.facebook.com/${normalized}`
}
