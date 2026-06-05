export const X_REQUIRED_SCOPES = ["tweet.write", "tweet.read", "users.read"] as const
export const X_POSTS_ENDPOINT = "https://api.x.com/2/tweets"
export const X_AUTHORIZE_ENDPOINT = "https://x.com/i/oauth2/authorize"
export const X_TOKEN_ENDPOINT = "https://api.x.com/2/oauth2/token"
export const X_CALLBACK_PATH = "/api/auth/x/callback"
export const X_DEFAULT_REDIRECT_URI = "https://affiliate-agent-os.vercel.app/api/auth/x/callback"
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
  authorizeEndpoint: typeof X_AUTHORIZE_ENDPOINT
  tokenEndpoint: typeof X_TOKEN_ENDPOINT
  missingKeys: XRequiredEnvKey[]
  invalidReasons: string[]
}

export type XOAuthStart = {
  authorizeUrl: string
  state: string
  codeVerifier: string
}

export type XOAuthTokenResponse = {
  access_token?: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
  scope?: string
  error?: string
  error_description?: string
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
  if (redirectUri && redirectUri !== X_DEFAULT_REDIRECT_URI) {
    invalidReasons.push("x_redirect_uri_must_match_official_callback_route")
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
    authorizeEndpoint: X_AUTHORIZE_ENDPOINT,
    tokenEndpoint: X_TOKEN_ENDPOINT,
    missingKeys,
    invalidReasons,
  }
}

export function xPostIdToLiveUrl(postId: string) {
  const normalized = postId.trim()
  if (!/^\d{1,19}$/.test(normalized)) return null
  return `https://x.com/i/web/status/${normalized}`
}

function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

async function sha256Base64Url(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  return base64Url(new Uint8Array(digest))
}

export function createXOAuthSecret(byteLength = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)))
}

export async function createXAuthorizeUrl(
  env: NodeJS.ProcessEnv = process.env,
): Promise<XOAuthStart> {
  const clientId = value(env, "X_CLIENT_ID")
  const redirectUri = value(env, "X_REDIRECT_URI")
  const scopes = value(env, "X_OAUTH_SCOPES") || X_REQUIRED_SCOPES.join(" ")

  if (!clientId || !redirectUri) {
    throw new Error("X OAuth app configuration is missing.")
  }
  if (redirectUri !== X_DEFAULT_REDIRECT_URI) {
    throw new Error("X redirect URI must match the official callback route.")
  }

  const state = createXOAuthSecret()
  const codeVerifier = createXOAuthSecret(64)
  const codeChallenge = await sha256Base64Url(codeVerifier)
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })

  return {
    authorizeUrl: `${X_AUTHORIZE_ENDPOINT}?${params.toString()}`,
    state,
    codeVerifier,
  }
}

export async function exchangeXAuthorizationCode(input: {
  code: string
  codeVerifier: string
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
}): Promise<XOAuthTokenResponse> {
  const env = input.env ?? process.env
  const fetchImpl = input.fetchImpl ?? fetch
  const clientId = value(env, "X_CLIENT_ID")
  const clientSecret = value(env, "X_CLIENT_SECRET")
  const redirectUri = value(env, "X_REDIRECT_URI")

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("X OAuth token exchange configuration is missing.")
  }
  if (redirectUri !== X_DEFAULT_REDIRECT_URI) {
    throw new Error("X redirect URI must match the official callback route.")
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: redirectUri,
    code_verifier: input.codeVerifier,
  })

  const response = await fetchImpl(X_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })

  const payload = (await response.json()) as XOAuthTokenResponse
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || "X OAuth token exchange failed.")
  }
  return payload
}
