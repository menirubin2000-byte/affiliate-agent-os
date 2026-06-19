export const YOUTUBE_REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
] as const

export const YOUTUBE_AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
export const YOUTUBE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
export const YOUTUBE_CHANNELS_ENDPOINT = "https://www.googleapis.com/youtube/v3/channels"
export const YOUTUBE_CALLBACK_PATH = "/api/auth/youtube/callback"
export const YOUTUBE_DEFAULT_REDIRECT_URI =
  "https://affiliate-agent-os.vercel.app/api/auth/youtube/callback"
export const YOUTUBE_CURRENT_BLOCKING_REASON = "youtube_oauth_not_configured"
export const YOUTUBE_API_ACCESS_BLOCKING_REASON = "youtube_api_access_not_ready"
export const YOUTUBE_VIDEO_ASSET_BLOCKING_REASON = "youtube_video_asset_required"

const REQUIRED_ENV_KEYS = [
  "YOUTUBE_CLIENT_ID",
  "YOUTUBE_CLIENT_SECRET",
  "YOUTUBE_REDIRECT_URI",
  "YOUTUBE_OAUTH_SCOPES",
  "YOUTUBE_API_ACCESS_READY",
] as const

export type YouTubeRequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number]

export type YouTubeOfficialApiCapability = {
  configured: boolean
  oauthAppConfigured: boolean
  requiredScopes: typeof YOUTUBE_REQUIRED_SCOPES
  tokenStorage: "encrypted_platform_connection_metadata"
  authorizeEndpoint: typeof YOUTUBE_AUTHORIZE_ENDPOINT
  tokenEndpoint: typeof YOUTUBE_TOKEN_ENDPOINT
  channelsEndpoint: typeof YOUTUBE_CHANNELS_ENDPOINT
  missingKeys: YouTubeRequiredEnvKey[]
  invalidReasons: string[]
}

export type YouTubeOAuthStart = {
  authorizeUrl: string
  state: string
}

export type YouTubeOAuthTokenResponse = {
  access_token?: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
  scope?: string
  error?: string
  error_description?: string
}

export type YouTubeOAuthCallbackValidation =
  | {
      valid: true
      code: string
    }
  | {
      valid: false
      status:
        | "youtube_oauth_error"
        | "youtube_oauth_invalid_callback"
        | "youtube_oauth_session_missing"
        | "youtube_oauth_state_invalid"
    }

export type YouTubeChannel = {
  id: string
  title: string | null
}

function value(env: NodeJS.ProcessEnv, key: YouTubeRequiredEnvKey) {
  return env[key]?.trim() ?? ""
}

function scopesFromEnv(env: NodeJS.ProcessEnv) {
  return value(env, "YOUTUBE_OAUTH_SCOPES").split(/\s+/).filter(Boolean)
}

export function getYouTubeOfficialApiCapability(
  env: NodeJS.ProcessEnv = process.env,
): YouTubeOfficialApiCapability {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !value(env, key))
  const invalidReasons: string[] = []
  const redirectUri = value(env, "YOUTUBE_REDIRECT_URI")
  const scopes = scopesFromEnv(env)
  const apiAccessReady = value(env, "YOUTUBE_API_ACCESS_READY").toLowerCase()

  if (redirectUri && !redirectUri.startsWith("https://")) {
    invalidReasons.push("youtube_redirect_uri_must_use_https")
  }
  if (redirectUri && redirectUri !== YOUTUBE_DEFAULT_REDIRECT_URI) {
    invalidReasons.push("youtube_redirect_uri_must_match_official_callback_route")
  }

  for (const scope of YOUTUBE_REQUIRED_SCOPES) {
    if (scopes.length && !scopes.includes(scope)) {
      invalidReasons.push(`youtube_${scope.split("/").pop()?.replace(".", "_") ?? "scope"}_missing`)
    }
  }

  if (apiAccessReady && apiAccessReady !== "true") {
    invalidReasons.push(YOUTUBE_API_ACCESS_BLOCKING_REASON)
  }

  const oauthAppConfigured = [
    "YOUTUBE_CLIENT_ID",
    "YOUTUBE_CLIENT_SECRET",
    "YOUTUBE_REDIRECT_URI",
    "YOUTUBE_OAUTH_SCOPES",
  ].every((key) => !missingKeys.includes(key as YouTubeRequiredEnvKey))

  return {
    configured: missingKeys.length === 0 && invalidReasons.length === 0,
    oauthAppConfigured,
    requiredScopes: YOUTUBE_REQUIRED_SCOPES,
    tokenStorage: "encrypted_platform_connection_metadata",
    authorizeEndpoint: YOUTUBE_AUTHORIZE_ENDPOINT,
    tokenEndpoint: YOUTUBE_TOKEN_ENDPOINT,
    channelsEndpoint: YOUTUBE_CHANNELS_ENDPOINT,
    missingKeys,
    invalidReasons,
  }
}

function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

export function createYouTubeOAuthSecret(byteLength = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)))
}

export function createYouTubeAuthorizeUrl(
  env: NodeJS.ProcessEnv = process.env,
): YouTubeOAuthStart {
  const clientId = value(env, "YOUTUBE_CLIENT_ID")
  const redirectUri = value(env, "YOUTUBE_REDIRECT_URI")
  const scopes = value(env, "YOUTUBE_OAUTH_SCOPES") || YOUTUBE_REQUIRED_SCOPES.join(" ")

  if (!clientId || !redirectUri) {
    throw new Error("YouTube OAuth app configuration is missing.")
  }
  if (redirectUri !== YOUTUBE_DEFAULT_REDIRECT_URI) {
    throw new Error("YouTube redirect URI must match the official callback route.")
  }

  const state = createYouTubeOAuthSecret()
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  })

  return {
    authorizeUrl: `${YOUTUBE_AUTHORIZE_ENDPOINT}?${params.toString()}`,
    state,
  }
}

export function validateYouTubeOAuthCallbackState(input: {
  error?: string | null
  code?: string | null
  state?: string | null
  expectedState?: string | null
}): YouTubeOAuthCallbackValidation {
  if (input.error) {
    return { valid: false, status: "youtube_oauth_error" }
  }
  if (!input.code || !input.state) {
    return { valid: false, status: "youtube_oauth_invalid_callback" }
  }
  if (!input.expectedState) {
    return { valid: false, status: "youtube_oauth_session_missing" }
  }
  if (input.state !== input.expectedState) {
    return { valid: false, status: "youtube_oauth_state_invalid" }
  }
  return {
    valid: true,
    code: input.code,
  }
}

export async function exchangeYouTubeAuthorizationCode(input: {
  code: string
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
}): Promise<YouTubeOAuthTokenResponse> {
  const env = input.env ?? process.env
  const fetchImpl = input.fetchImpl ?? fetch
  const clientId = value(env, "YOUTUBE_CLIENT_ID")
  const clientSecret = value(env, "YOUTUBE_CLIENT_SECRET")
  const redirectUri = value(env, "YOUTUBE_REDIRECT_URI")

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("YouTube OAuth token exchange configuration is missing.")
  }
  if (redirectUri !== YOUTUBE_DEFAULT_REDIRECT_URI) {
    throw new Error("YouTube redirect URI must match the official callback route.")
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const response = await fetchImpl(YOUTUBE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })

  const payload = (await response.json()) as YouTubeOAuthTokenResponse
  if (!response.ok) {
    throw new Error(
      payload.error_description || payload.error || "YouTube OAuth token exchange failed.",
    )
  }
  return payload
}

export async function fetchYouTubeConnectedChannel(input: {
  accessToken: string
  fetchImpl?: typeof fetch
}): Promise<YouTubeChannel | null> {
  const fetchImpl = input.fetchImpl ?? fetch
  const url = new URL(YOUTUBE_CHANNELS_ENDPOINT)
  url.searchParams.set("part", "snippet")
  url.searchParams.set("mine", "true")

  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
  })

  if (!response.ok) return null
  const payload = (await response.json()) as {
    items?: Array<{ id?: string; snippet?: { title?: string } }>
  }
  const item = payload.items?.find((entry) => entry.id)
  if (!item?.id) return null

  return {
    id: item.id,
    title: item.snippet?.title ?? null,
  }
}
