export const PINTEREST_CURRENT_BLOCKING_REASON = "pinterest_official_api_not_configured"
export const PINTEREST_BOARD_BLOCKING_REASON = "pinterest_board_not_configured"
export const PINTEREST_API_ACCESS_BLOCKING_REASON = "pinterest_api_access_not_ready"

const PINTEREST_CONNECTION_ENV_KEYS = ["PINTEREST_ACCESS_TOKEN"] as const
const PINTEREST_PUBLISH_ENV_KEYS = ["PINTEREST_ACCESS_TOKEN", "PINTEREST_BOARD_ID"] as const

export type PinterestRequiredEnvKey =
  | (typeof PINTEREST_CONNECTION_ENV_KEYS)[number]
  | (typeof PINTEREST_PUBLISH_ENV_KEYS)[number]

export type PinterestOfficialApiCapability = {
  connected: boolean
  publishReady: boolean
  tokenStorage: "server_environment"
  publishEndpoint: string
  missingKeys: string[]
  invalidReasons: string[]
  blockingReason: string | null
}

function value(env: NodeJS.ProcessEnv, key: string) {
  return env[key]?.trim() ?? ""
}

function apiAccessReady(env: NodeJS.ProcessEnv) {
  return value(env, "PINTEREST_API_ACCESS_READY").toLowerCase() === "true"
}

export function getPinterestOfficialApiCapability(
  env: NodeJS.ProcessEnv = process.env,
): PinterestOfficialApiCapability {
  const missingKeys = PINTEREST_PUBLISH_ENV_KEYS.filter((key) => !value(env, key))
  const invalidReasons: string[] = []

  if (!apiAccessReady(env)) {
    invalidReasons.push(PINTEREST_API_ACCESS_BLOCKING_REASON)
  }

  const connected =
    PINTEREST_CONNECTION_ENV_KEYS.every((key) => Boolean(value(env, key))) &&
    apiAccessReady(env)

  const publishReady = connected && missingKeys.length === 0 && invalidReasons.length === 0

  let blockingReason: string | null = null
  if (!connected) {
    blockingReason = PINTEREST_CURRENT_BLOCKING_REASON
  } else if (missingKeys.includes("PINTEREST_BOARD_ID")) {
    blockingReason = PINTEREST_BOARD_BLOCKING_REASON
  } else if (!publishReady) {
    blockingReason = PINTEREST_CURRENT_BLOCKING_REASON
  }

  return {
    connected,
    publishReady,
    tokenStorage: "server_environment",
    publishEndpoint: "https://api.pinterest.com/v5/pins",
    missingKeys,
    invalidReasons,
    blockingReason,
  }
}

export const PINTEREST_TOKEN_ENDPOINT = "https://api.pinterest.com/v5/oauth/token"

export type PinterestOAuthTokenResponse = {
  access_token?: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
  refresh_token_expires_in?: number
  scope?: string
  error?: string
  message?: string
}

/**
 * Auto-refresh: exchange a stored Pinterest refresh_token for a fresh access_token.
 * Pinterest access tokens expire (trial/standard); the refresh_token from the
 * one-time OAuth mints new ones, so the operator never re-keys Pinterest again.
 * Requires PINTEREST_CLIENT_ID (or APP_ID) + PINTEREST_APP_SECRET for Basic auth.
 */
export async function refreshPinterestAccessToken(input: {
  refreshToken: string
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
}): Promise<PinterestOAuthTokenResponse> {
  const env = input.env ?? process.env
  const fetchImpl = input.fetchImpl ?? fetch
  const clientId = (env.PINTEREST_CLIENT_ID ?? env.PINTEREST_APP_ID ?? "").trim()
  const clientSecret = (env.PINTEREST_APP_SECRET ?? "").trim()

  if (!clientId || !clientSecret) {
    throw new Error("Pinterest OAuth refresh configuration is missing (CLIENT_ID/APP_SECRET).")
  }
  if (!input.refreshToken) {
    throw new Error("Missing Pinterest refresh token.")
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
  })

  const response = await fetchImpl(PINTEREST_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  })

  const payload = (await response.json()) as PinterestOAuthTokenResponse
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Pinterest token refresh failed.")
  }
  // Pinterest may not rotate the refresh token — preserve the original if absent.
  if (!payload.refresh_token) {
    payload.refresh_token = input.refreshToken
  }
  return payload
}
