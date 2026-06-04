export const LINKEDIN_REQUIRED_SCOPE = "w_member_social"
export const LINKEDIN_POSTS_ENDPOINT = "https://api.linkedin.com/rest/posts"
export const LINKEDIN_CURRENT_BLOCKING_REASON =
  "linkedin_developer_app_blocked_not_enough_connections"

const REQUIRED_ENV_KEYS = [
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "LINKEDIN_REDIRECT_URI",
  "LINKEDIN_OAUTH_SCOPES",
  "LINKEDIN_ACCESS_TOKEN",
  "LINKEDIN_MEMBER_URN",
  "LINKEDIN_API_VERSION",
] as const

export type LinkedInRequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number]

export type LinkedInOfficialApiCapability = {
  configured: boolean
  oauthAppConfigured: boolean
  requiredScope: typeof LINKEDIN_REQUIRED_SCOPE
  tokenStorage: "server_environment"
  publishEndpoint: typeof LINKEDIN_POSTS_ENDPOINT
  missingKeys: LinkedInRequiredEnvKey[]
  invalidReasons: string[]
}

function value(env: NodeJS.ProcessEnv, key: LinkedInRequiredEnvKey) {
  return env[key]?.trim() ?? ""
}

export function getLinkedInOfficialApiCapability(
  env: NodeJS.ProcessEnv = process.env,
): LinkedInOfficialApiCapability {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !value(env, key))
  const invalidReasons: string[] = []
  const redirectUri = value(env, "LINKEDIN_REDIRECT_URI")
  const scopes = value(env, "LINKEDIN_OAUTH_SCOPES").split(/\s+/).filter(Boolean)
  const memberUrn = value(env, "LINKEDIN_MEMBER_URN")
  const apiVersion = value(env, "LINKEDIN_API_VERSION")

  if (redirectUri && !redirectUri.startsWith("https://")) {
    invalidReasons.push("linkedin_redirect_uri_must_use_https")
  }
  if (scopes.length && !scopes.includes(LINKEDIN_REQUIRED_SCOPE)) {
    invalidReasons.push("linkedin_w_member_social_scope_missing")
  }
  if (memberUrn && !/^urn:li:person:[A-Za-z0-9_-]+$/.test(memberUrn)) {
    invalidReasons.push("linkedin_member_urn_invalid")
  }
  if (apiVersion && !/^\d{6}$/.test(apiVersion)) {
    invalidReasons.push("linkedin_api_version_invalid")
  }

  const oauthAppConfigured = [
    "LINKEDIN_CLIENT_ID",
    "LINKEDIN_CLIENT_SECRET",
    "LINKEDIN_REDIRECT_URI",
    "LINKEDIN_OAUTH_SCOPES",
  ].every((key) => !missingKeys.includes(key as LinkedInRequiredEnvKey))

  return {
    configured: missingKeys.length === 0 && invalidReasons.length === 0,
    oauthAppConfigured,
    requiredScope: LINKEDIN_REQUIRED_SCOPE,
    tokenStorage: "server_environment",
    publishEndpoint: LINKEDIN_POSTS_ENDPOINT,
    missingKeys,
    invalidReasons,
  }
}

export function linkedInPostUrnToLiveUrl(postUrn: string) {
  const normalized = postUrn.trim()
  if (!/^urn:li:(share|ugcPost):\d+$/.test(normalized)) return null
  return `https://www.linkedin.com/feed/update/${normalized}/`
}
