/**
 * Deterministic UTM parameter builder.
 *
 * Accepts a base affiliate URL and UTM params, returns a final URL with
 * UTM query params safely appended. Preserves existing non-UTM query
 * params and replaces existing UTM params with the new values.
 */

export interface UtmParams {
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmTerm?: string | null
  utmContent?: string | null
}

export interface BuildUtmUrlResult {
  finalUrl: string
  valid: boolean
  error?: string
}

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const

/**
 * Validate that a string is a valid http/https URL.
 */
export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Build a final URL by adding UTM params to a base URL.
 *
 * - Preserves existing non-UTM query params on the base URL
 * - Replaces existing UTM params with the provided values
 * - Skips empty/null UTM values (does not add them)
 * - Returns an error result for invalid base URLs
 */
export function buildUtmUrl(
  baseUrl: string,
  params: UtmParams,
): BuildUtmUrlResult {
  const trimmed = baseUrl.trim()

  if (!trimmed) {
    return { finalUrl: "", valid: false, error: "Base URL is required." }
  }

  if (!isValidHttpUrl(trimmed)) {
    return { finalUrl: trimmed, valid: false, error: "Base URL must be a valid http or https URL." }
  }

  try {
    const url = new URL(trimmed)

    // Remove any existing UTM params to avoid duplicates
    for (const key of UTM_KEYS) {
      url.searchParams.delete(key)
    }

    // Add new UTM params (only non-empty values)
    const mapping: Array<[typeof UTM_KEYS[number], string | null | undefined]> = [
      ["utm_source", params.utmSource],
      ["utm_medium", params.utmMedium],
      ["utm_campaign", params.utmCampaign],
      ["utm_term", params.utmTerm],
      ["utm_content", params.utmContent],
    ]

    for (const [key, value] of mapping) {
      const trimmedValue = value?.trim()
      if (trimmedValue) {
        url.searchParams.set(key, trimmedValue)
      }
    }

    return { finalUrl: url.toString(), valid: true }
  } catch {
    return { finalUrl: trimmed, valid: false, error: "Unable to parse the base URL." }
  }
}

/**
 * Build a suggested tracking URL for a campaign.
 * Does not modify the original affiliate link — returns a new URL.
 */
export function buildCampaignTrackingUrl(
  affiliateUrl: string,
  channel: string,
  campaignName: string,
): BuildUtmUrlResult {
  return buildUtmUrl(affiliateUrl, {
    utmSource: channel,
    utmMedium: "affiliate",
    utmCampaign: campaignName.toLowerCase().replace(/\s+/g, "-"),
  })
}

/**
 * Extract UTM params from an existing URL.
 */
export function extractUtmParams(urlString: string): UtmParams {
  try {
    const url = new URL(urlString)
    return {
      utmSource: url.searchParams.get("utm_source") || null,
      utmMedium: url.searchParams.get("utm_medium") || null,
      utmCampaign: url.searchParams.get("utm_campaign") || null,
      utmTerm: url.searchParams.get("utm_term") || null,
      utmContent: url.searchParams.get("utm_content") || null,
    }
  } catch {
    return {}
  }
}
