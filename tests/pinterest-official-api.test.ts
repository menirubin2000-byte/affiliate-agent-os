import assert from "node:assert/strict"
import test from "node:test"

import {
  getPinterestOfficialApiCapability,
  PINTEREST_API_ACCESS_BLOCKING_REASON,
  PINTEREST_BOARD_BLOCKING_REASON,
  PINTEREST_CURRENT_BLOCKING_REASON,
} from "@/lib/pinterest-official-api"

test("Pinterest official API is not connected without an access token", () => {
  const capability = getPinterestOfficialApiCapability({})

  assert.equal(capability.connected, false)
  assert.equal(capability.publishReady, false)
  assert.equal(capability.blockingReason, PINTEREST_CURRENT_BLOCKING_REASON)
})

test("Pinterest token and API access connect the profile but do not publish without a board", () => {
  const capability = getPinterestOfficialApiCapability({
    PINTEREST_ACCESS_TOKEN: "token",
    PINTEREST_API_ACCESS_READY: "true",
  })

  assert.equal(capability.connected, true)
  assert.equal(capability.publishReady, false)
  assert.equal(capability.missingKeys.includes("PINTEREST_BOARD_ID"), true)
  assert.equal(capability.blockingReason, PINTEREST_BOARD_BLOCKING_REASON)
})

test("Pinterest publishing requires active API access", () => {
  const capability = getPinterestOfficialApiCapability({
    PINTEREST_ACCESS_TOKEN: "token",
    PINTEREST_BOARD_ID: "board",
    PINTEREST_API_ACCESS_READY: "false",
  })

  assert.equal(capability.connected, false)
  assert.equal(capability.publishReady, false)
  assert.equal(capability.invalidReasons.includes(PINTEREST_API_ACCESS_BLOCKING_REASON), true)
})

test("Pinterest is publish-ready only with token, API access, and board", () => {
  const capability = getPinterestOfficialApiCapability({
    PINTEREST_ACCESS_TOKEN: "token",
    PINTEREST_BOARD_ID: "board",
    PINTEREST_API_ACCESS_READY: "true",
  })

  assert.equal(capability.connected, true)
  assert.equal(capability.publishReady, true)
  assert.equal(capability.blockingReason, null)
})
