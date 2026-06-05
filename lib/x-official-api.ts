export const X_REQUIRED_SCOPES = ["tweet.write", "tweet.read", "users.read"] as const
export const X_POSTS_ENDPOINT = "https://api.x.com/2/tweets"
export const X_CURRENT_BLOCKING_REASON = "x_official_api_not_configured"

const REQUIRED_ENV_KEYS = [
  "X_CLIENT_ID",
  "X_CLIENT_SECRET",
  "X_REDIRECT_URI",
  "X_OAUTH_SCOPES",
  "X_ACCESS_TOKEN",
  "X_API_ACCESS_READY",
] as const

export type XRequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number]

export type XOfficialApiCapability = {
  configured: boolean
  oauthAppConfigured: boolean
  requiredScopes: typeof X_REQUIRED_SCOPES
  tokenStorage: "server_environment"
  publishEndpoint: typeof X_POSTS_ENDPOINT
  missingKeys: XRequiredEnvKey[]
  invalidReasons: string[]
}

function value(env: NodeJS.ProcessEnv, key: XRequiredEnvKey) {
  return env[key]?.trim() ?? ""
}

export function getXOfficialApiCapability(
  env: NodeJS.ProcessEnv = process.env,
): XOfficialApiCapability {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !value(env, key))
  const invalidReasons: string[] = []
  const redirectUri = value(env, "X_REDIRECT_URI")
  const scopes = value(env, "X_OAUTH_SCOPES").split(/\s+/).filter(Boolean)
  const apiAccessReady = value(env, "X_API_ACCESS_READY").toLowerCase()

  if (redirectUri && !redirectUri.startsWith("https://")) {
    invalidReasons.push("x_redirect_uri_must_use_https")
  }

  for (const scope of X_REQUIRED_SCOPES) {
    if (scopes.length && !scopes.includes(scope)) {
      invalidReasons.push(`x_${scope.replace(".", "_")}_scope_missing`)
    }
  }

  if (apiAccessReady && apiAccessReady !== "true") {
    invalidReasons.push("x_api_access_or_credits_not_ready")
  }

  const oauthAppConfigured = [
    "X_CLIENT_ID",
    "X_CLIENT_SECRET",
    "X_REDIRECT_URI",
    "X_OAUTH_SCOPES",
  ].every((key) => !missingKeys.includes(key as XRequiredEnvKey))

  return {
    configured: missingKeys.length === 0 && invalidReasons.length === 0,
    oauthAppConfigured,
    requiredScopes: X_REQUIRED_SCOPES,
    tokenStorage: "server_environment",
    publishEndpoint: X_POSTS_ENDPOINT,
    missingKeys,
    invalidReasons,
  }
}

export function xPostIdToLiveUrl(postId: string) {
  const normalized = postId.trim()
  if (!/^\d{1,19}$/.test(normalized)) return null
  return `https://x.com/i/web/status/${normalized}`
}
