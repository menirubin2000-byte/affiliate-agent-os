import assert from "node:assert/strict"
import test from "node:test"

import { PINTEREST_OPERATOR_PROFILE_URL } from "@/lib/operator-social-profiles"
import { getPlatformCapabilities } from "@/lib/platform-capabilities"

test("researched platforms expose official APIs but remain disconnected", () => {
  const capabilities = getPlatformCapabilities()

  assert.deepEqual(
    capabilities.map((item) => item.platform),
    ["facebook_page", "instagram_professional", "pinterest", "x_twitter", "youtube"],
  )
  assert.equal(capabilities.every((item) => item.apiAvailability === "official_api_available"), true)
  assert.equal(
    capabilities.every((item) => item.connectionStatus === "requires_official_connection"),
    true,
  )
})

test("X/Twitter requires official OAuth and paid partnership disclosure", () => {
  const capability = getPlatformCapabilities().find((item) => item.platform === "x_twitter")

  assert.equal(capability?.safeExecutorPath, "official_api_only")
  assert.equal(capability?.browserHelperAllowed, false)
  assert.equal(capability?.requiredPermissions.includes("tweet.write"), true)
  assert.equal(capability?.blockers.includes("x_paid_partnership_disclosure_required"), true)
})

test("new platform capabilities never enable browser-helper publishing by default", () => {
  const capabilities = getPlatformCapabilities()

  assert.equal(capabilities.every((item) => item.safeExecutorPath === "official_api_only"), true)
  assert.equal(capabilities.every((item) => item.browserHelperAllowed === false), true)
})

test("Pinterest has a known operator profile but remains not publish-ready until a board is configured", () => {
  const capability = getPlatformCapabilities().find((item) => item.platform === "pinterest")

  assert.equal(capability?.operatorProfileUrl, PINTEREST_OPERATOR_PROFILE_URL)
  assert.equal(
    capability?.connectionStatus === "requires_official_connection" ||
      capability?.connectionStatus === "connected",
    true,
  )
  assert.equal(capability?.safeExecutorPath, "official_api_only")
  assert.equal(capability?.browserHelperAllowed, false)
  assert.equal(
    capability?.blockers.includes("pinterest_account_not_connected") ||
      capability?.blockers.includes("pinterest_official_api_not_configured") ||
      capability?.blockers.includes("pinterest_board_not_configured"),
    true,
  )
})

test("affiliate content remains disclosure-gated on every researched platform", () => {
  const capabilities = getPlatformCapabilities()

  assert.equal(
    capabilities.every((item) => item.affiliateContentPolicy === "allowed_with_disclosure"),
    true,
  )
})
