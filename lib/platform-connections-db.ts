import "server-only"

import { buildXConnectionUpsert } from "@/lib/platform-connections"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import type {
  PlatformConnection,
  PlatformConnectionProvider,
  PlatformConnectionStatus,
} from "@/types/platform-connection"
import type { XOAuthTokenResponse } from "@/lib/x-official-api"

type PlatformConnectionRow = {
  id: string
  provider: PlatformConnectionProvider
  status: PlatformConnectionStatus
  connected_by: string | null
  connected_at: string | null
  expires_at: string | null
  scopes: string[] | null
  token_type: string | null
  refresh_token_present: boolean
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

function mapConnection(row: PlatformConnectionRow): PlatformConnection {
  return {
    id: row.id,
    provider: row.provider,
    status: row.status,
    connectedBy: row.connected_by,
    connectedAt: row.connected_at,
    expiresAt: row.expires_at,
    scopes: row.scopes ?? [],
    tokenType: row.token_type,
    refreshTokenPresent: row.refresh_token_present,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function upsertXPlatformConnection(input: {
  token: XOAuthTokenResponse
  connectedBy?: string
}): Promise<PlatformConnection | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getServiceRoleSupabase()
  const payload = buildXConnectionUpsert({
    token: input.token,
    connectedBy: input.connectedBy ?? "MENI",
    apiAccessReady: process.env.X_API_ACCESS_READY,
  })

  const { data, error } = await supabase
    .from("platform_connections")
    .upsert(payload, { onConflict: "provider" })
    .select(
      "id, provider, status, connected_by, connected_at, expires_at, scopes, token_type, refresh_token_present, metadata, created_at, updated_at",
    )
    .single()

  if (error) throw new Error(`Unable to store X connection state: ${error.message}`)
  return mapConnection(data as PlatformConnectionRow)
}

export async function getPlatformConnection(provider: PlatformConnectionProvider) {
  if (!isSupabaseConfigured()) return null
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("platform_connections")
    .select(
      "id, provider, status, connected_by, connected_at, expires_at, scopes, token_type, refresh_token_present, metadata, created_at, updated_at",
    )
    .eq("provider", provider)
    .maybeSingle()

  if (error?.message.includes("platform_connections")) return null
  if (error) throw new Error(`Unable to load platform connection: ${error.message}`)
  if (!data) return null
  return mapConnection(data as PlatformConnectionRow)
}
