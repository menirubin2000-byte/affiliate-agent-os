import * as crypto from "crypto"

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

const OAUTH1_ENV_KEYS = [
  "X_CONSUMER_KEY",
  "X_CONSUMER_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_TOKEN_SECRET",
] as const

const OAUTH2_POST_ENV_KEYS = [
  "X_OAUTH2_ACCESS_TOKEN",
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

export type XOAuthCallbackValidation =
  | {
      valid: true
      code: string
      codeVerifier: string
    }
  | {
      valid: false
      status:
        | "x_oauth_error"
        | "x_oauth_invalid_callback"
        | "x_oauth_session_missing"
        | "x_oauth_state_invalid"
    }

type XAnyEnvKey = XRequiredEnvKey | "X_CONSUMER_KEY" | "X_CONSUMER_SECRET" | "X_ACCESS_TOKEN_SECRET" | "X_USERNAME" | "X_OAUTH2_ACCESS_TOKEN"

function value(env: NodeJS.ProcessEnv, key: XAnyEnvKey) {
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

export function validateXOAuthCallbackState(input: {
  error?: string | null
  code?: string | null
  state?: string | null
  expectedState?: string | null
  codeVerifier?: string | null
}): XOAuthCallbackValidation {
  if (input.error) {
    return { valid: false, status: "x_oauth_error" }
  }
  if (!input.code || !input.state) {
    return { valid: false, status: "x_oauth_invalid_callback" }
  }
  if (!input.expectedState || !input.codeVerifier) {
    return { valid: false, status: "x_oauth_session_missing" }
  }
  if (input.state !== input.expectedState) {
    return { valid: false, status: "x_oauth_state_invalid" }
  }
  return {
    valid: true,
    code: input.code,
    codeVerifier: input.codeVerifier,
  }
}

// --- OAuth 1.0a direct posting (uses Access Token + Access Token Secret) ---

export type XPostTweetResult = {
  ok: boolean
  tweetId?: string
  tweetUrl?: string
  error?: string
}

function isOAuth1Configured(env: NodeJS.ProcessEnv = process.env): boolean {
  return OAUTH1_ENV_KEYS.every((key) => value(env, key))
}

function isOAuth2PostConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!value(env, "X_OAUTH2_ACCESS_TOKEN")
}

export function getXPublishCapability(env: NodeJS.ProcessEnv = process.env) {
  const oauth1Ready = isOAuth1Configured(env)
  const oauth2Ready = isOAuth2PostConfigured(env)
  const apiAccessReady = value(env, "X_API_ACCESS_READY").toLowerCase() === "true"
  const missing = oauth2Ready ? [] : OAUTH1_ENV_KEYS.filter((key) => !value(env, key))
  return {
    canPublish: (oauth1Ready || oauth2Ready) && apiAccessReady,
    oauth1Ready,
    oauth2Ready,
    apiAccessReady,
    missingKeys: missing,
  }
}

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

function buildOAuth1Header(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string,
): string {
  const nonce = crypto.randomBytes(16).toString("hex")
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const oauthParams: Record<string, string> = {
    ...params,
    oauth_nonce: nonce,
    oauth_timestamp: timestamp,
    oauth_signature_method: "HMAC-SHA1",
    oauth_version: "1.0",
  }

  const sortedKeys = Object.keys(oauthParams).sort()
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`).join("&")
  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`
  const signature = crypto.createHmac("sha1", signingKey).update(signatureBase).digest("base64")

  const authParams = sortedKeys
    .filter((k) => k.startsWith("oauth_"))
    .concat(["oauth_signature"])
  const allOauth: Record<string, string> = { ...oauthParams, oauth_signature: signature }
  const headerParts = [...authParams]
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(allOauth[k])}"`)
    .join(", ")

  return `OAuth ${headerParts}`
}

async function postTweetOAuth2(
  text: string,
  env: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch,
): Promise<XPostTweetResult> {
  const oauth2Token = value(env, "X_OAUTH2_ACCESS_TOKEN")
  const username = value(env, "X_USERNAME") || "i"

  const response = await fetchImpl(X_POSTS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${oauth2Token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    return { ok: false, error: `HTTP ${response.status}: ${errorBody}` }
  }

  const data = (await response.json()) as { data?: { id?: string } }
  const tweetId = data?.data?.id
  const tweetUrl = tweetId ? `https://x.com/${username}/status/${tweetId}` : undefined
  return { ok: true, tweetId, tweetUrl }
}

async function postTweetOAuth1(
  text: string,
  env: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch,
): Promise<XPostTweetResult> {
  const consumerKey = value(env, "X_CONSUMER_KEY")
  const consumerSecret = value(env, "X_CONSUMER_SECRET")
  const accessToken = value(env, "X_ACCESS_TOKEN")
  const accessTokenSecret = value(env, "X_ACCESS_TOKEN_SECRET")
  const username = value(env, "X_USERNAME") || "i"

  const oauthBaseParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_token: accessToken,
  }

  const authHeader = buildOAuth1Header(
    "POST",
    X_POSTS_ENDPOINT,
    oauthBaseParams,
    consumerSecret,
    accessTokenSecret,
  )

  const response = await fetchImpl(X_POSTS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    return { ok: false, error: `HTTP ${response.status}: ${errorBody}` }
  }

  const data = (await response.json()) as { data?: { id?: string } }
  const tweetId = data?.data?.id
  const tweetUrl = tweetId ? `https://x.com/${username}/status/${tweetId}` : undefined
  return { ok: true, tweetId, tweetUrl }
}

export async function postTweet(
  text: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<XPostTweetResult> {
  const cap = getXPublishCapability(env)
  if (!cap.canPublish) {
    return { ok: false, error: `X publishing not ready. Missing: ${cap.missingKeys.join(", ")}` }
  }

  if (cap.oauth2Ready) {
    return postTweetOAuth2(text, env, fetchImpl)
  }
  return postTweetOAuth1(text, env, fetchImpl)
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
