import type { CampaignPlatform } from "@/types/campaign-workflow"

/**
 * Single source of truth for per-platform character limits.
 *
 * `null` = no hard character limit (long-form platforms — Medium, Substack,
 * Quora, Reddit). For these the full post body is fine.
 *
 * For the limited platforms a post MUST be a short, platform-specific version:
 * on X/Mastodon/Threads a URL is weighted as a fixed 23 characters (t.co /
 * Mastodon URL weighting), so the counted length is not the raw string length.
 *
 * Used by the post pages to show the operator the limit + a live count, and by
 * the generator to produce a separate short version for limited platforms.
 */
export const PLATFORM_CHAR_LIMITS: Record<string, number | null> = {
  x_twitter: 280,
  mastodon: 500,
  threads: 500,
  pinterest: 500, // pin description
  instagram_professional: 2200, // caption
  tiktok: 2200, // caption
  linkedin: 3000,
  youtube: 5000, // description
  facebook_page: 5000,
  medium: null,
  substack: null,
  quora: null,
  reddit: null,
}

const URL_WEIGHTED_PLATFORMS = new Set(["x_twitter", "mastodon", "threads"])
const URL_WEIGHT = 23

export function getPlatformCharLimit(platform: CampaignPlatform): number | null {
  return PLATFORM_CHAR_LIMITS[platform] ?? null
}

export function hasPlatformCharLimit(platform: CampaignPlatform): boolean {
  return getPlatformCharLimit(platform) !== null
}

/**
 * Count characters the way the platform counts them. On X/Mastodon/Threads
 * every URL counts as 23 chars regardless of its real length.
 */
export function countCharsForPlatform(platform: CampaignPlatform, text: string): number {
  let n = (text ?? "").length
  if (URL_WEIGHTED_PLATFORMS.has(platform)) {
    for (const url of (text ?? "").match(/https?:\/\/\S+/g) ?? []) {
      n = n - url.length + URL_WEIGHT
    }
  }
  return n
}

export function isWithinPlatformLimit(platform: CampaignPlatform, text: string): boolean {
  const limit = getPlatformCharLimit(platform)
  if (limit === null) return true
  return countCharsForPlatform(platform, text) <= limit
}

/** Remaining characters before hitting the limit (null when the platform is unlimited). */
export function platformCharsRemaining(platform: CampaignPlatform, text: string): number | null {
  const limit = getPlatformCharLimit(platform)
  if (limit === null) return null
  return limit - countCharsForPlatform(platform, text)
}
