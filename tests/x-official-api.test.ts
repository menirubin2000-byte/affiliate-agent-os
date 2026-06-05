import assert from "node:assert/strict"
import test from "node:test"

import {
  createXAuthorizeUrl,
  exchangeXAuthorizationCode,
  getXOfficialApiCapability,
  validateXOAuthCallbackState,
  X_DEFAULT_REDIRECT_URI,
  X_POSTS_ENDPOINT,
  xPostIdToLiveUrl,
} from "../lib/x-official-api"

test("X official API remains blocked when credentials are missing", () => {
  const capability = getXOfficialApiCapability({})

  assert.equal(capability.configured, false)
  assert.equal(capability.missingKeys.includes("X_ACCESS_TOKEN"), true)
  assert.equal(capability.requiredScopes.includes("tweet.write"), true)
})

test("X official API requires OAuth scopes and active API access", () => {
  const capability = getXOfficialApiCapability({
    X_CLIENT_ID: "client",
    X_CLIENT_SECRET: "secret",
    X_REDIRECT_URI: X_DEFAULT_REDIRECT_URI,
    X_OAUTH_SCOPES: "tweet.write tweet.read users.read",
    X_ACCESS_TOKEN: "token",
    X_API_ACCESS_READY: "true",
  })

  assert.equal(capability.configured, true)
  assert.deepEqual(capability.missingKeys, [])
  assert.deepEqual(capability.invalidReasons, [])
})

test("X official API rejects missing publish scope", () => {
  const capability = getXOfficialApiCapability({
    X_CLIENT_ID: "client",
    X_CLIENT_SECRET: "secret",
    X_REDIRECT_URI: X_DEFAULT_REDIRECT_URI,
    X_OAUTH_SCOPES: "tweet.read users.read",
    X_ACCESS_TOKEN: "token",
    X_API_ACCESS_READY: "true",
  })

  assert.equal(capability.configured, false)
  assert.equal(capability.invalidReasons.includes("x_tweet_write_scope_missing"), true)
})

test("X official API stays blocked when API credits or access are not ready", () => {
  const capability = getXOfficialApiCapability({
    X_CLIENT_ID: "client",
    X_CLIENT_SECRET: "secret",
    X_REDIRECT_URI: X_DEFAULT_REDIRECT_URI,
    X_OAUTH_SCOPES: "tweet.write tweet.read users.read",
    X_ACCESS_TOKEN: "token",
    X_API_ACCESS_READY: "false",
  })

  assert.equal(capability.configured, false)
  assert.equal(capability.invalidReasons.includes("x_api_access_or_credits_not_ready"), true)
})

test("builds an X live URL only from a real post id", () => {
  assert.equal(
    xPostIdToLiveUrl("1234567890123456789"),
    "https://x.com/i/web/status/1234567890123456789",
  )
  assert.equal(xPostIdToLiveUrl("not-a-post-id"), null)
})

test("X official API rejects an unexpected callback route", () => {
  const capability = getXOfficialApiCapability({
    X_CLIENT_ID: "client",
    X_CLIENT_SECRET: "secret",
    X_REDIRECT_URI: "https://affiliate-agent-os.vercel.app/api/x/oauth/callback",
    X_OAUTH_SCOPES: "tweet.write tweet.read users.read",
    X_ACCESS_TOKEN: "token",
    X_API_ACCESS_READY: "true",
  })

  assert.equal(capability.configured, false)
  assert.equal(
    capability.invalidReasons.includes("x_redirect_uri_must_match_official_callback_route"),
    true,
  )
})

test("createXAuthorizeUrl builds an official OAuth PKCE URL", async () => {
  const start = await createXAuthorizeUrl({
    X_CLIENT_ID: "client",
    X_CLIENT_SECRET: "secret",
    X_REDIRECT_URI: X_DEFAULT_REDIRECT_URI,
    X_OAUTH_SCOPES: "tweet.write tweet.read users.read",
    X_API_ACCESS_READY: "false",
  })
  const url = new URL(start.authorizeUrl)

  assert.equal(url.origin + url.pathname, "https://x.com/i/oauth2/authorize")
  assert.equal(url.searchParams.get("response_type"), "code")
  assert.equal(url.searchParams.get("client_id"), "client")
  assert.equal(url.searchParams.get("redirect_uri"), X_DEFAULT_REDIRECT_URI)
  assert.equal(url.searchParams.get("code_challenge_method"), "S256")
  assert.ok(start.state.length > 20)
  assert.ok(start.codeVerifier.length > 40)
})

test("exchangeXAuthorizationCode calls the token endpoint without creating posts", async () => {
  let calledUrl = ""
  let calledBody = ""
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    calledUrl = String(url)
    calledBody = String(init?.body)
    return new Response(JSON.stringify({ access_token: "token", token_type: "bearer" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  const token = await exchangeXAuthorizationCode({
    code: "code",
    codeVerifier: "verifier",
    env: {
      X_CLIENT_ID: "client",
      X_CLIENT_SECRET: "secret",
      X_REDIRECT_URI: X_DEFAULT_REDIRECT_URI,
      X_OAUTH_SCOPES: "tweet.write tweet.read users.read",
      X_API_ACCESS_READY: "false",
    },
    fetchImpl: fetchImpl as typeof fetch,
  })

  assert.equal(calledUrl, "https://api.x.com/2/oauth2/token")
  assert.equal(calledUrl === X_POSTS_ENDPOINT, false)
  assert.equal(calledBody.includes("grant_type=authorization_code"), true)
  assert.equal(token.access_token, "token")
})

test("X OAuth callback validation rejects missing callback state", () => {
  const validation = validateXOAuthCallbackState({
    code: "code",
    state: "state",
    expectedState: undefined,
    codeVerifier: "verifier",
  })

  assert.equal(validation.valid, false)
  if (!validation.valid) {
    assert.equal(validation.status, "x_oauth_session_missing")
  }
})

test("X OAuth callback validation rejects invalid callback state", () => {
  const validation = validateXOAuthCallbackState({
    code: "code",
    state: "attacker-state",
    expectedState: "expected-state",
    codeVerifier: "verifier",
  })

  assert.equal(validation.valid, false)
  if (!validation.valid) {
    assert.equal(validation.status, "x_oauth_state_invalid")
  }
})

test("X OAuth callback validation accepts matching state and verifier", () => {
  const validation = validateXOAuthCallbackState({
    code: "code",
    state: "state",
    expectedState: "state",
    codeVerifier: "verifier",
  })

  assert.equal(validation.valid, true)
  if (validation.valid) {
    assert.equal(validation.code, "code")
    assert.equal(validation.codeVerifier, "verifier")
  }
})
