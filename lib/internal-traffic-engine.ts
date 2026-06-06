// AAOS-owned Traffic Engine.
//
// Scores (product, platform) pairs from data Affiliate Agent OS itself owns:
//   - performance_metrics (real clicks / conversions / revenue from affiliate
//     networks like Impact, PartnerStack, Reditus)
//   - campaign_links (a UTM-tagged tracking link already exists for this
//     channel, so we can actually measure traffic when we publish)
//
// We do NOT depend on GSC, Robin, or any external SEO tool. Those tools are
// the wrong shape for this problem — our content lives on third-party
// platforms (Medium, Substack, LinkedIn, …) where we are guests, not owners.
// What we DO own is the UTM link and the affiliate-network conversion data
// that comes back through it.
//
// If no signal exists at all for any product, the ranking returned here is
// flagged `fallback: true` and the dashboard shows a clear banner instead of
// pretending a real score exists.

import "server-only"

import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import {
  computeTrafficScore,
  indexScoresByProductPlatform,
  type InternalTrafficKey,
  type InternalTrafficScore,
} from "@/lib/internal-traffic-engine-scoring"

export {
  computeTrafficScore,
  indexScoresByProductPlatform,
  type InternalTrafficKey,
  type InternalTrafficScore,
}

export interface InternalTrafficSnapshot {
  /** True when at least one product has any real signal (metric or link). */
  connected: boolean
  scores: InternalTrafficScore[]
  totals: {
    products_with_metrics: number
    products_with_campaign_link: number
    total_clicks: number
    total_revenue: number
  }
  fetchError: string | null
}

const PLATFORM_CHANNEL_ALIASES: Record<string, string[]> = {
  linkedin: ["linkedin"],
  medium: ["medium"],
  substack: ["substack"],
  facebook_page: ["facebook", "facebook_page"],
  instagram_professional: ["instagram", "instagram_professional"],
  pinterest: ["pinterest"],
  x_twitter: ["x", "twitter", "x_twitter"],
  youtube: ["youtube"],
  quora: ["quora"],
  reddit: ["reddit"],
  tiktok: ["tiktok"],
}

function aliasesFor(platform: string): string[] {
  return PLATFORM_CHANNEL_ALIASES[platform] ?? [platform]
}

function normalizeChannel(channel: string | null | undefined): string {
  return (channel ?? "").trim().toLowerCase()
}

type MetricRow = {
  product_id: string
  channel: string | null
  clicks: number | string | null
  conversions: number | string | null
  revenue: number | string | null
}

type CampaignLinkRow = {
  product_id: string
  channel: string | null
  status: string | null
}

export async function getInternalTrafficSnapshot(): Promise<InternalTrafficSnapshot> {
  if (!isSupabaseConfigured()) {
    return {
      connected: false,
      scores: [],
      totals: {
        products_with_metrics: 0,
        products_with_campaign_link: 0,
        total_clicks: 0,
        total_revenue: 0,
      },
      fetchError: "supabase_not_configured",
    }
  }

  const supabase = getServiceRoleSupabase()
  const [metricsResult, linksResult] = await Promise.all([
    supabase
      .from("performance_metrics")
      .select("product_id, channel, clicks, conversions, revenue"),
    supabase.from("campaign_links").select("product_id, channel, status"),
  ])

  if (metricsResult.error) {
    return {
      connected: false,
      scores: [],
      totals: { products_with_metrics: 0, products_with_campaign_link: 0, total_clicks: 0, total_revenue: 0 },
      fetchError: `performance_metrics: ${metricsResult.error.message}`,
    }
  }
  if (linksResult.error) {
    return {
      connected: false,
      scores: [],
      totals: { products_with_metrics: 0, products_with_campaign_link: 0, total_clicks: 0, total_revenue: 0 },
      fetchError: `campaign_links: ${linksResult.error.message}`,
    }
  }

  const metrics = (metricsResult.data ?? []) as MetricRow[]
  const links = (linksResult.data ?? []) as CampaignLinkRow[]

  const linkChannelsByProduct = new Map<string, Set<string>>()
  for (const link of links) {
    if (link.status && link.status !== "active") continue
    const set = linkChannelsByProduct.get(link.product_id) ?? new Set<string>()
    const ch = normalizeChannel(link.channel)
    if (ch) set.add(ch)
    linkChannelsByProduct.set(link.product_id, set)
  }

  type Bucket = { clicks: number; conversions: number; revenue: number }
  const metricsByKey = new Map<string, Bucket>()
  for (const row of metrics) {
    const channel = normalizeChannel(row.channel)
    if (!channel) continue
    const key = `${row.product_id}::${channel}`
    const bucket = metricsByKey.get(key) ?? { clicks: 0, conversions: 0, revenue: 0 }
    bucket.clicks += Number(row.clicks ?? 0)
    bucket.conversions += Number(row.conversions ?? 0)
    bucket.revenue += Number(row.revenue ?? 0)
    metricsByKey.set(key, bucket)
  }

  // Expand into (product, platform) for every platform we know about. We do
  // this even if a platform has no metric yet, because the campaign_link
  // existence is itself a small priority signal (it means "we are measuring
  // this channel; the loop is closed").
  const productIds = new Set<string>()
  for (const row of metrics) productIds.add(row.product_id)
  for (const row of links) productIds.add(row.product_id)

  const scores: InternalTrafficScore[] = []
  let productsWithMetrics = 0
  let productsWithLink = 0
  let totalClicks = 0
  let totalRevenue = 0

  for (const productId of productIds) {
    const linkChannels = linkChannelsByProduct.get(productId) ?? new Set<string>()
    if (linkChannels.size > 0) productsWithLink++
    let productHasMetric = false

    for (const platform of Object.keys(PLATFORM_CHANNEL_ALIASES)) {
      const aliases = aliasesFor(platform)
      let clicks = 0
      let conversions = 0
      let revenue = 0
      for (const alias of aliases) {
        const bucket = metricsByKey.get(`${productId}::${alias}`)
        if (bucket) {
          clicks += bucket.clicks
          conversions += bucket.conversions
          revenue += bucket.revenue
        }
      }
      const hasCampaignLink = aliases.some((alias) => linkChannels.has(alias))
      if (clicks === 0 && conversions === 0 && revenue === 0 && !hasCampaignLink) continue

      if (clicks > 0 || conversions > 0 || revenue > 0) productHasMetric = true

      const score = computeTrafficScore({ revenue, conversions, clicks, hasCampaignLink })

      const reasonParts: string[] = []
      if (revenue > 0) reasonParts.push(`revenue $${revenue.toFixed(2)}`)
      if (conversions > 0) reasonParts.push(`${conversions} conversions`)
      if (clicks > 0) reasonParts.push(`${clicks} clicks`)
      if (hasCampaignLink) reasonParts.push("campaign_link מוכן")
      const reason = reasonParts.join(" · ") || "אין מטריקה אמיתית"

      scores.push({
        productId,
        platform,
        score,
        clicks,
        conversions,
        revenue,
        hasCampaignLink,
        reason,
      })

      totalClicks += clicks
      totalRevenue += revenue
    }
    if (productHasMetric) productsWithMetrics++
  }

  scores.sort((a, b) => b.score - a.score)

  return {
    connected: scores.length > 0,
    scores,
    totals: {
      products_with_metrics: productsWithMetrics,
      products_with_campaign_link: productsWithLink,
      total_clicks: totalClicks,
      total_revenue: totalRevenue,
    },
    fetchError: null,
  }
}

