export type PlatformConnectionProvider = "x"

export type PlatformConnectionStatus =
  | "not_connected"
  | "connected"
  | "requires_reconnect"
  | "api_access_not_ready"

export interface PlatformConnection {
  id: string
  provider: PlatformConnectionProvider
  status: PlatformConnectionStatus
  connectedBy: string | null
  connectedAt: string | null
  expiresAt: string | null
  scopes: string[]
  tokenType: string | null
  refreshTokenPresent: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
