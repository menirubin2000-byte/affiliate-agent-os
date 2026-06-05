import assert from "node:assert/strict"
import test from "node:test"

import {
  getXOfficialApiCapability,
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
    X_REDIRECT_URI: "https://affiliate-agent-os.vercel.app/api/x/oauth/callback",
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
    X_REDIRECT_URI: "https://affiliate-agent-os.vercel.app/api/x/oauth/callback",
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
    X_REDIRECT_URI: "https://affiliate-agent-os.vercel.app/api/x/oauth/callback",
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
