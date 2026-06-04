import assert from "node:assert/strict"
import test from "node:test"

import { getPlatformCapabilities } from "@/lib/platform-capabilities"

test("researched platforms expose official APIs but remain disconnected", () => {
  const capabilities = getPlatformCapabilities()

  assert.deepEqual(
    capabilities.map((item) => item.platform),
    ["facebook_page", "instagram_professional", "pinterest", "youtube"],
  )
  assert.equal(capabilities.every((item) => item.apiAvailability === "official_api_available"), true)
  assert.equal(
    capabilities.every((item) => item.connectionStatus === "requires_official_connection"),
    true,
  )
})

test("new platform capabilities never enable browser-helper publishing by default", () => {
  const capabilities = getPlatformCapabilities()

  assert.equal(capabilities.every((item) => item.safeExecutorPath === "official_api_only"), true)
  assert.equal(capabilities.every((item) => item.browserHelperAllowed === false), true)
})

test("affiliate content remains disclosure-gated on every researched platform", () => {
  const capabilities = getPlatformCapabilities()

  assert.equal(
    capabilities.every((item) => item.affiliateContentPolicy === "allowed_with_disclosure"),
    true,
  )
})
