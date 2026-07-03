import "server-only"

import { getPlatformConnection, upsertYouTubePlatformConnection } from "@/lib/platform-connections-db"
import { decryptSecret, getServerTokenEncryptionSecret } from "@/lib/secret-crypto"
import {
  fetchYouTubeConnectedChannel,
  getYouTubeOfficialApiCapability,
  refreshYouTubeAccessToken,
} from "@/lib/youtube-official-api"

const REFRESH_SKEW_MS = 5 * 60 * 1000

export type YouTubeConnectionRefreshResult = {
  refreshed: boolean
  reason:
    | "refreshed"
    | "still_fresh"
    | "not_connected"
    | "missing_refresh_token"
    | "missing_encrypted_refresh_token"
    | "missing_token_encryption_secret"
    | "youtube_oauth_not_configured"
  expiresAt: string | null
}

function shouldRefresh(expiresAt: string | null) {
  if (!expiresAt) return true
  return Date.parse(expiresAt) <= Date.now() + REFRESH_SKEW_MS
}

export async function ensureYouTubeConnectionFresh(): Promise<YouTubeConnectionRefreshResult> {
  const capability = getYouTubeOfficialApiCapability()
  if (!capability.oauthAppConfigured) {
    return {
      refreshed: false,
      reason: "youtube_oauth_not_configured",
      expiresAt: null,
    }
  }

  const connection = await getPlatformConnection("youtube")
  if (!connection) {
    return {
      refreshed: false,
      reason: "not_connected",
      expiresAt: null,
    }
  }

  if (!connection.refreshTokenPresent) {
    return {
      refreshed: false,
      reason: "missing_refresh_token",
      expiresAt: connection.expiresAt,
    }
  }

  if (!shouldRefresh(connection.expiresAt)) {
    return {
      refreshed: false,
      reason: "still_fresh",
      expiresAt: connection.expiresAt,
    }
  }

  const secret = getServerTokenEncryptionSecret()
  if (!secret) {
    return {
      refreshed: false,
      reason: "missing_token_encryption_secret",
      expiresAt: connection.expiresAt,
    }
  }

  const encryptedRefreshToken =
    typeof connection.metadata.encrypted_refresh_token === "string"
      ? connection.metadata.encrypted_refresh_token
      : null

  if (!encryptedRefreshToken) {
    return {
      refreshed: false,
      reason: "missing_encrypted_refresh_token",
      expiresAt: connection.expiresAt,
    }
  }

  const refreshToken = decryptSecret(encryptedRefreshToken, secret)
  const token = await refreshYouTubeAccessToken({ refreshToken })
  const channel = token.access_token
    ? await fetchYouTubeConnectedChannel({ accessToken: token.access_token })
    : null
  const refreshedConnection = await upsertYouTubePlatformConnection({
    token,
    channel,
    connectedBy: connection.connectedBy ?? "system",
  })

  return {
    refreshed: true,
    reason: "refreshed",
    expiresAt: refreshedConnection?.expiresAt ?? connection.expiresAt,
  }
}
