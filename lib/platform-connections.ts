import crypto from "node:crypto"

import type { XOAuthTokenResponse } from "@/lib/x-official-api"
import type { YouTubeChannel, YouTubeOAuthTokenResponse } from "@/lib/youtube-official-api"
import type { PlatformConnectionStatus } from "@/types/platform-connection"

export type XConnectionUpsert = {
  provider: "x"
  status: PlatformConnectionStatus
  connected_by: string
  connected_at: string
  expires_at: string | null
  scopes: string[]
  token_type: string | null
  access_token_hash: string | null
  refresh_token_present: boolean
  metadata: Record<string, unknown>
}

export type YouTubeConnectionUpsert = {
  provider: "youtube"
  status: PlatformConnectionStatus
  connected_by: string
  connected_at: string
  expires_at: string | null
  scopes: string[]
  token_type: string | null
  access_token_hash: string | null
  refresh_token_present: boolean
  metadata: Record<string, unknown>
}

export function hashSecret(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

export function resolveXConnectionStatus(input: {
  apiAccessReady: string | undefined
  expiresAt?: string | null
}): PlatformConnectionStatus {
  const apiReady = input.apiAccessReady?.trim().toLowerCase() === "true"
  if (!apiReady) return "api_access_not_ready"
  if (input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now()) {
    return "requires_reconnect"
  }
  return "connected"
}

export function buildXConnectionUpsert(input: {
  token: XOAuthTokenResponse
  connectedBy: string
  now?: Date
  apiAccessReady?: string
}): XConnectionUpsert {
  const now = input.now ?? new Date()
  const expiresAt = input.token.expires_in
    ? new Date(now.getTime() + input.token.expires_in * 1000).toISOString()
    : null
  const scopes = input.token.scope?.split(/\s+/).filter(Boolean) ?? []

  return {
    provider: "x",
    status: resolveXConnectionStatus({
      apiAccessReady: input.apiAccessReady,
      expiresAt,
    }),
    connected_by: input.connectedBy,
    connected_at: now.toISOString(),
    expires_at: expiresAt,
    scopes,
    token_type: input.token.token_type ?? null,
    access_token_hash: input.token.access_token ? hashSecret(input.token.access_token) : null,
    refresh_token_present: Boolean(input.token.refresh_token),
    metadata: {
      source: "official_x_oauth_pkce",
      raw_token_stored: false,
      publishing_enabled: false,
    },
  }
}

export function resolveYouTubeConnectionStatus(input: {
  apiAccessReady: string | undefined
  channelId?: string | null
  expiresAt?: string | null
}): PlatformConnectionStatus {
  const apiReady = input.apiAccessReady?.trim().toLowerCase() === "true"
  if (!apiReady) return "api_access_not_ready"
  if (!input.channelId) return "not_connected"
  if (input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now()) {
    return "requires_reconnect"
  }
  return "connected"
}

export type LinkedInConnectionUpsert = {
  provider: "linkedin"
  status: PlatformConnectionStatus
  connected_by: string
  connected_at: string
  expires_at: string | null
  scopes: string[]
  token_type: string | null
  access_token_hash: string | null
  refresh_token_present: boolean
  metadata: Record<string, unknown>
}

export function buildLinkedInConnectionUpsert(input: {
  accessToken: string
  memberUrn: string
  expiresIn: number
  connectedBy: string
  now?: Date
}): LinkedInConnectionUpsert {
  const now = input.now ?? new Date()
  const expiresAt = input.expiresIn
    ? new Date(now.getTime() + input.expiresIn * 1000).toISOString()
    : null

  return {
    provider: "linkedin",
    status: "connected",
    connected_by: input.connectedBy,
    connected_at: now.toISOString(),
    expires_at: expiresAt,
    scopes: ["w_member_social"],
    token_type: "Bearer",
    access_token_hash: hashSecret(input.accessToken),
    refresh_token_present: false,
    metadata: {
      source: "official_linkedin_oauth",
      raw_token_stored: false,
      publishing_enabled: false,
      member_urn: input.memberUrn || null,
    },
  }
}

export function buildYouTubeConnectionUpsert(input: {
  token: YouTubeOAuthTokenResponse
  connectedBy: string
  channel: YouTubeChannel | null
  now?: Date
  apiAccessReady?: string
}): YouTubeConnectionUpsert {
  const now = input.now ?? new Date()
  const expiresAt = input.token.expires_in
    ? new Date(now.getTime() + input.token.expires_in * 1000).toISOString()
    : null
  const scopes = input.token.scope?.split(/\s+/).filter(Boolean) ?? []

  return {
    provider: "youtube",
    status: resolveYouTubeConnectionStatus({
      apiAccessReady: input.apiAccessReady,
      channelId: input.channel?.id ?? null,
      expiresAt,
    }),
    connected_by: input.connectedBy,
    connected_at: now.toISOString(),
    expires_at: expiresAt,
    scopes,
    token_type: input.token.token_type ?? null,
    access_token_hash: input.token.access_token ? hashSecret(input.token.access_token) : null,
    refresh_token_present: Boolean(input.token.refresh_token),
    metadata: {
      source: "official_google_youtube_oauth",
      raw_token_stored: false,
      publishing_enabled: false,
      channel_id: input.channel?.id ?? null,
      channel_title: input.channel?.title ?? null,
      video_required: true,
    },
  }
}
