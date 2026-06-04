import assert from "node:assert/strict"
import test from "node:test"

import {
  getLinkedInOfficialApiCapability,
  linkedInPostUrnToLiveUrl,
} from "../lib/linkedin-official-api"

test("LinkedIn official API remains blocked when credentials are missing", () => {
  const capability = getLinkedInOfficialApiCapability({})

  assert.equal(capability.configured, false)
  assert.equal(capability.missingKeys.includes("LINKEDIN_ACCESS_TOKEN"), true)
  assert.equal(capability.requiredScope, "w_member_social")
})

test("LinkedIn official API requires w_member_social and valid server settings", () => {
  const capability = getLinkedInOfficialApiCapability({
    LINKEDIN_CLIENT_ID: "client",
    LINKEDIN_CLIENT_SECRET: "secret",
    LINKEDIN_REDIRECT_URI: "https://example.com/api/linkedin/oauth/callback",
    LINKEDIN_OAUTH_SCOPES: "openid profile w_member_social",
    LINKEDIN_ACCESS_TOKEN: "token",
    LINKEDIN_MEMBER_URN: "urn:li:person:abc123",
    LINKEDIN_API_VERSION: "202605",
  })

  assert.equal(capability.configured, true)
  assert.deepEqual(capability.missingKeys, [])
  assert.deepEqual(capability.invalidReasons, [])
})

test("LinkedIn official API rejects missing publish scope", () => {
  const capability = getLinkedInOfficialApiCapability({
    LINKEDIN_CLIENT_ID: "client",
    LINKEDIN_CLIENT_SECRET: "secret",
    LINKEDIN_REDIRECT_URI: "https://example.com/api/linkedin/oauth/callback",
    LINKEDIN_OAUTH_SCOPES: "openid profile",
    LINKEDIN_ACCESS_TOKEN: "token",
    LINKEDIN_MEMBER_URN: "urn:li:person:abc123",
    LINKEDIN_API_VERSION: "202605",
  })

  assert.equal(capability.configured, false)
  assert.equal(capability.invalidReasons.includes("linkedin_w_member_social_scope_missing"), true)
})

test("builds a LinkedIn live URL only from a real API post URN", () => {
  assert.equal(
    linkedInPostUrnToLiveUrl("urn:li:share:123456789"),
    "https://www.linkedin.com/feed/update/urn:li:share:123456789/",
  )
  assert.equal(linkedInPostUrnToLiveUrl("not-a-linkedin-post"), null)
})
