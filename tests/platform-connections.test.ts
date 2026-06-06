import assert from "node:assert/strict"
import test from "node:test"

import {
  buildXConnectionUpsert,
  buildYouTubeConnectionUpsert,
  hashSecret,
  resolveXConnectionStatus,
  resolveYouTubeConnectionStatus,
} from "../lib/platform-connections"

test("X connection payload stores token metadata without raw secrets", () => {
  const payload = buildXConnectionUpsert({
    token: {
      access_token: "raw-access-token",
      refresh_token: "raw-refresh-token",
      token_type: "bearer",
      expires_in: 7200,
      scope: "tweet.write tweet.read users.read",
    },
    connectedBy: "MENI",
    now: new Date("2026-06-05T10:00:00.000Z"),
    apiAccessReady: "false",
  })

  const serialized = JSON.stringify(payload)

  assert.equal(payload.provider, "x")
  assert.equal(payload.status, "api_access_not_ready")
  assert.equal(payload.access_token_hash, hashSecret("raw-access-token"))
  assert.equal(payload.refresh_token_present, true)
  assert.deepEqual(payload.scopes, ["tweet.write", "tweet.read", "users.read"])
  assert.equal(serialized.includes("raw-access-token"), false)
  assert.equal(serialized.includes("raw-refresh-token"), false)
  assert.equal(serialized.includes("publish_job"), false)
  assert.equal(serialized.includes("published_record"), false)
  assert.equal(payload.metadata.raw_token_stored, false)
  assert.equal(payload.metadata.publishing_enabled, false)
})

test("X connection can be connected only when API access is ready and token is fresh", () => {
  const status = resolveXConnectionStatus({
    apiAccessReady: "true",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  })

  assert.equal(status, "connected")
})

test("X connection requires reconnect when the token is expired", () => {
  const status = resolveXConnectionStatus({
    apiAccessReady: "true",
    expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
  })

  assert.equal(status, "requires_reconnect")
})

test("X connection remains not publish-ready when API access is disabled", () => {
  const status = resolveXConnectionStatus({
    apiAccessReady: "false",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  })

  assert.equal(status, "api_access_not_ready")
})

test("YouTube connection payload stores metadata without raw secrets or publishing side effects", () => {
  const payload = buildYouTubeConnectionUpsert({
    token: {
      access_token: "raw-youtube-access-token",
      refresh_token: "raw-youtube-refresh-token",
      token_type: "Bearer",
      expires_in: 3600,
      scope:
        "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    },
    channel: { id: "UC123", title: "MENI Channel" },
    connectedBy: "MENI",
    now: new Date("2026-06-06T10:00:00.000Z"),
    apiAccessReady: "false",
  })

  const serialized = JSON.stringify(payload)

  assert.equal(payload.provider, "youtube")
  assert.equal(payload.status, "api_access_not_ready")
  assert.equal(payload.access_token_hash, hashSecret("raw-youtube-access-token"))
  assert.equal(payload.refresh_token_present, true)
  assert.equal(payload.metadata.channel_id, "UC123")
  assert.equal(payload.metadata.raw_token_stored, false)
  assert.equal(payload.metadata.publishing_enabled, false)
  assert.equal(payload.metadata.video_required, true)
  assert.equal(serialized.includes("raw-youtube-access-token"), false)
  assert.equal(serialized.includes("raw-youtube-refresh-token"), false)
  assert.equal(serialized.includes("publish_job"), false)
  assert.equal(serialized.includes("published_record"), false)
})

test("YouTube connection requires a channel, API readiness, and fresh token", () => {
  assert.equal(
    resolveYouTubeConnectionStatus({
      apiAccessReady: "true",
      channelId: "UC123",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
    "connected",
  )
  assert.equal(
    resolveYouTubeConnectionStatus({
      apiAccessReady: "true",
      channelId: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
    "not_connected",
  )
  assert.equal(
    resolveYouTubeConnectionStatus({
      apiAccessReady: "false",
      channelId: "UC123",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
    "api_access_not_ready",
  )
})
