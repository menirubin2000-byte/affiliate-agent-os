// Read-only access to Traffic Engine rankings written by an external system
// (Robin Marketing Automation). Affiliate Agent OS never invents rankings —
// it only reads from this table. If the table is empty, callers must show a
// "Traffic Engine not connected" fallback.

import "server-only"

import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"

export interface TrafficEngineRanking {
  id: string
  productId: string
  platform: string
  score: number
  source: string
  reason: string | null
  keyword: string | null
  trafficSignal: Record<string, unknown>
  updatedAt: string
}

type RankingRow = {
  id: string
  product_id: string
  platform: string
  score: number | string
  source: string
  reason: string | null
  keyword: string | null
  traffic_signal: Record<string, unknown> | null
  updated_at: string
}

export interface TrafficEngineSnapshot {
  /** True only when the table exists AND at least one row was returned. */
  connected: boolean
  rankings: TrafficEngineRanking[]
  /** Filled when the table is missing / unreadable, so the UI can explain why. */
  connectionError: string | null
}

export async function getTrafficEngineSnapshot(): Promise<TrafficEngineSnapshot> {
  if (!isSupabaseConfigured()) {
    return { connected: false, rankings: [], connectionError: "supabase_not_configured" }
  }
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("traffic_engine_rankings")
    .select("id, product_id, platform, score, source, reason, keyword, traffic_signal, updated_at")
    .order("score", { ascending: false })

  if (error) {
    const benign =
      error.message.includes("traffic_engine_rankings") ||
      error.message.includes("schema cache") ||
      error.message.includes("relation")
    return {
      connected: false,
      rankings: [],
      connectionError: benign ? "table_missing" : error.message,
    }
  }
  const rows = (data ?? []) as RankingRow[]
  const rankings = rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    platform: row.platform,
    score: Number(row.score),
    source: row.source,
    reason: row.reason,
    keyword: row.keyword,
    trafficSignal: row.traffic_signal ?? {},
    updatedAt: row.updated_at,
  }))
  return {
    connected: rankings.length > 0,
    rankings,
    connectionError: null,
  }
}

export function indexRankingsByProductPlatform(
  rankings: TrafficEngineRanking[],
): Map<string, TrafficEngineRanking> {
  const map = new Map<string, TrafficEngineRanking>()
  for (const ranking of rankings) {
    map.set(`${ranking.productId}::${ranking.platform}`, ranking)
  }
  return map
}
