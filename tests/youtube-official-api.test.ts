import assert from "node:assert/strict"
import test from "node:test"

import {
  createYouTubeAuthorizeUrl,
  exchangeYouTubeAuthorizationCode,
  fetchYouTubeConnectedChannel,
  getYouTubeOfficialApiCapability,
  validateYouTubeOAuthCallbackState,
  YOUTUBE_DEFAULT_REDIRECT_URI,
  YOUTUBE_TOKEN_ENDPOINT,
} from "../lib/youtube-official-api"

test("YouTube official API remains blocked when OAuth credentials are missing", () => {
  const capability = getYouTubeOfficialApiCapability({})

  assert.equal(capability.configured, false)
  assert.equal(capability.oauthAppConfigured, false)
  assert.equal(capability.missingKeys.includes("YOUTUBE_CLIENT_ID"), true)
  assert.equal(capability.requiredScopes.includes("https://www.googleapis.com/auth/youtube.upload"), true)
})

test("YouTube official API requires upload scope and active API access", () => {
  const capability = getYouTubeOfficialApiCapability({
    YOUTUBE_CLIENT_ID: "client",
    YOUTUBE_CLIENT_SECRET: "secret",
    YOUTUBE_REDIRECT_URI: YOUTUBE_DEFAULT_REDIRECT_URI,
    YOUTUBE_OAUTH_SCOPES:
      "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    YOUTUBE_API_ACCESS_READY: "true",
  })

  assert.equal(capability.configured, true)
  assert.deepEqual(capability.missingKeys, [])
  assert.deepEqual(capability.invalidReasons, [])
})

test("YouTube official API rejects missing publish scope", () => {
  const capability = getYouTubeOfficialApiCapability({
    YOUTUBE_CLIENT_ID: "client",
    YOUTUBE_CLIENT_SECRET: "secret",
    YOUTUBE_REDIRECT_URI: YOUTUBE_DEFAULT_REDIRECT_URI,
    YOUTUBE_OAUTH_SCOPES: "https://www.googleapis.com/auth/youtube.readonly",
    YOUTUBE_API_ACCESS_READY: "true",
  })

  assert.equal(capability.configured, false)
  assert.equal(capability.invalidReasons.includes("youtube_youtube_upload_missing"), true)
})

test("YouTube official API stays blocked when API access is not ready", () => {
  const capability = getYouTubeOfficialApiCapability({
    YOUTUBE_CLIENT_ID: "client",
    YOUTUBE_CLIENT_SECRET: "secret",
    YOUTUBE_REDIRECT_URI: YOUTUBE_DEFAULT_REDIRECT_URI,
    YOUTUBE_OAUTH_SCOPES:
      "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    YOUTUBE_API_ACCESS_READY: "false",
  })

  assert.equal(capability.configured, false)
  assert.equal(capability.invalidReasons.includes("youtube_api_access_not_ready"), true)
})

test("createYouTubeAuthorizeUrl builds a Google OAuth URL without creating posts", () => {
  const start = createYouTubeAuthorizeUrl({
    YOUTUBE_CLIENT_ID: "client",
    YOUTUBE_CLIENT_SECRET: "secret",
    YOUTUBE_REDIRECT_URI: YOUTUBE_DEFAULT_REDIRECT_URI,
    YOUTUBE_OAUTH_SCOPES:
      "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    YOUTUBE_API_ACCESS_READY: "false",
  })
  const url = new URL(start.authorizeUrl)

  assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth")
  assert.equal(url.searchParams.get("response_type"), "code")
  assert.equal(url.searchParams.get("client_id"), "client")
  assert.equal(url.searchParams.get("redirect_uri"), YOUTUBE_DEFAULT_REDIRECT_URI)
  assert.equal(url.searchParams.get("access_type"), "offline")
  assert.ok(start.state.length > 20)
})

test("exchangeYouTubeAuthorizationCode calls only the token endpoint", async () => {
  let calledUrl = ""
  let calledBody = ""
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    calledUrl = String(url)
    calledBody = String(init?.body)
    return new Response(JSON.stringify({ access_token: "token", token_type: "Bearer" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  const token = await exchangeYouTubeAuthorizationCode({
    code: "code",
    env: {
      YOUTUBE_CLIENT_ID: "client",
      YOUTUBE_CLIENT_SECRET: "secret",
      YOUTUBE_REDIRECT_URI: YOUTUBE_DEFAULT_REDIRECT_URI,
      YOUTUBE_OAUTH_SCOPES:
        "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
      YOUTUBE_API_ACCESS_READY: "false",
    },
    fetchImpl: fetchImpl as typeof fetch,
  })

  assert.equal(calledUrl, YOUTUBE_TOKEN_ENDPOINT)
  assert.equal(calledBody.includes("grant_type=authorization_code"), true)
  assert.equal(token.access_token, "token")
})

test("YouTube OAuth callback validation rejects missing and invalid state", () => {
  assert.deepEqual(
    validateYouTubeOAuthCallbackState({
      code: "code",
      state: "state",
      expectedState: undefined,
    }),
    { valid: false, status: "youtube_oauth_session_missing" },
  )

  assert.deepEqual(
    validateYouTubeOAuthCallbackState({
      code: "code",
      state: "attacker-state",
      expectedState: "expected-state",
    }),
    { valid: false, status: "youtube_oauth_state_invalid" },
  )
})

test("fetchYouTubeConnectedChannel returns only channel metadata", async () => {
  const fetchImpl = async () =>
    new Response(
      JSON.stringify({
        items: [{ id: "UC123", snippet: { title: "MENI Channel" } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )

  const channel = await fetchYouTubeConnectedChannel({
    accessToken: "raw-token",
    fetchImpl: fetchImpl as typeof fetch,
  })

  assert.deepEqual(channel, { id: "UC123", title: "MENI Channel" })
})
