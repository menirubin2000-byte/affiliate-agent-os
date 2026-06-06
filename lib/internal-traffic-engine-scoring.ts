// Pure scoring helpers for the AAOS-internal Traffic Engine. No I/O, no
// `server-only` so unit tests can import this file directly.

export interface InternalTrafficKey {
  productId: string
  /** Affiliate Agent OS platform routing key (linkedin, medium, …). */
  platform: string
}

export interface InternalTrafficScore extends InternalTrafficKey {
  score: number
  clicks: number
  conversions: number
  revenue: number
  hasCampaignLink: boolean
  reason: string
}

/**
 * Pure scoring function — all weights come from REAL counts; no platform tier
 * multipliers, no synthetic boosts.
 *
 *   revenue * 100           (most important: actual money from the network)
 *   conversions * 20
 *   clicks * 1
 *   + 5 if a campaign_link is already wired for this platform
 *
 * Returns 0 when there's nothing to count and no link.
 * Defensively clamps negative inputs to zero.
 */
export function computeTrafficScore(input: {
  revenue: number
  conversions: number
  clicks: number
  hasCampaignLink: boolean
}): number {
  const revenue = Math.max(0, input.revenue || 0)
  const conversions = Math.max(0, input.conversions || 0)
  const clicks = Math.max(0, input.clicks || 0)
  const linkBoost = input.hasCampaignLink ? 5 : 0
  return revenue * 100 + conversions * 20 + clicks + linkBoost
}

export function indexScoresByProductPlatform(
  scores: InternalTrafficScore[],
): Map<string, InternalTrafficScore> {
  const map = new Map<string, InternalTrafficScore>()
  for (const score of scores) {
    map.set(`${score.productId}::${score.platform}`, score)
  }
  return map
}
