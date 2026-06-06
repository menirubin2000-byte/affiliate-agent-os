// Read-only aggregation of performance_metrics for the Hebrew traffic-metrics
// dashboard. Reports counts BY source and BY (product, channel). Never invents
// numbers — if a metric has no source it shows up as "unknown_source".

import "server-only"

import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"

export interface SourceCount {
  source: string
  records: number
  clicks: number
  conversions: number
  revenue: number
}

export interface ProductPlatformCount {
  productId: string
  productName: string
  channel: string
  records: number
  clicks: number
  conversions: number
  revenue: number
}

export interface PerformanceMetricsSummary {
  total: number
  bySource: SourceCount[]
  byProductChannel: ProductPlatformCount[]
  fetchError: string | null
}

type Row = {
  product_id: string
  channel: string | null
  clicks: number | string | null
  conversions: number | string | null
  revenue: number | string | null
  source: string | null
  products: { name: string | null } | { name: string | null }[] | null
}

function pickProductName(row: Row): string {
  if (!row.products) return "—"
  if (Array.isArray(row.products)) return row.products[0]?.name ?? "—"
  return row.products.name ?? "—"
}

export async function getPerformanceMetricsSummary(): Promise<PerformanceMetricsSummary> {
  if (!isSupabaseConfigured()) {
    return {
      total: 0,
      bySource: [],
      byProductChannel: [],
      fetchError: "supabase_not_configured",
    }
  }
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("performance_metrics")
    .select("product_id, channel, clicks, conversions, revenue, source, products(name)")

  if (error) {
    return {
      total: 0,
      bySource: [],
      byProductChannel: [],
      fetchError: error.message,
    }
  }
  const rows = (data ?? []) as Row[]

  const bySourceMap = new Map<string, SourceCount>()
  const byPair = new Map<string, ProductPlatformCount>()
  for (const row of rows) {
    const source = (row.source ?? "unknown_source").trim() || "unknown_source"
    const channel = (row.channel ?? "").trim() || "unknown_channel"
    const productName = pickProductName(row)
    const clicks = Number(row.clicks ?? 0)
    const conversions = Number(row.conversions ?? 0)
    const revenue = Number(row.revenue ?? 0)

    const src = bySourceMap.get(source) ?? {
      source,
      records: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    }
    src.records += 1
    src.clicks += clicks
    src.conversions += conversions
    src.revenue += revenue
    bySourceMap.set(source, src)

    const key = `${row.product_id}::${channel}`
    const pair = byPair.get(key) ?? {
      productId: row.product_id,
      productName,
      channel,
      records: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    }
    pair.records += 1
    pair.clicks += clicks
    pair.conversions += conversions
    pair.revenue += revenue
    byPair.set(key, pair)
  }

  return {
    total: rows.length,
    bySource: Array.from(bySourceMap.values()).sort((a, b) => b.records - a.records),
    byProductChannel: Array.from(byPair.values()).sort(
      (a, b) => b.revenue - a.revenue || b.clicks - a.clicks,
    ),
    fetchError: null,
  }
}
