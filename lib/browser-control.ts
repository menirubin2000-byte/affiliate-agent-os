import type { BrowserJobStatus, BrowserPlatform } from "@/types/browser-control"

export const APPROVED_BROWSER_DOMAINS = [
  "linkedin.com",
  "medium.com",
  "substack.com",
  "tiktok.com",
  "quora.com",
  "reddit.com",
  "partnerstack.com",
  "impact.com",
  "systeme.io",
] as const

export const VALID_BROWSER_JOB_STATUSES: BrowserJobStatus[] = [
  "queued",
  "opened",
  "filled",
  "waiting_user",
  "published",
  "blocked",
  "failed",
]

const platformTargets: Record<string, string> = {
  linkedin: "https://www.linkedin.com/feed/",
  medium: "https://medium.com/new-story",
  substack: "https://substack.com/home",
  tiktok: "https://www.tiktok.com/upload",
  quora: "https://www.quora.com/",
  reddit: "https://www.reddit.com/submit",
}

export function isApprovedBrowserDomain(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "")
    return APPROVED_BROWSER_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    )
  } catch {
    return false
  }
}

export function detectBrowserPlatform(url: string | null | undefined): BrowserPlatform {
  if (!url) return "unknown"

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "")
    if (hostname.endsWith("linkedin.com")) return "linkedin"
    if (hostname.endsWith("medium.com")) return "medium"
    if (hostname.endsWith("substack.com")) return "substack"
    if (hostname.endsWith("tiktok.com")) return "tiktok"
    if (hostname.endsWith("quora.com")) return "quora"
    if (hostname.endsWith("reddit.com")) return "reddit"
    if (hostname.endsWith("partnerstack.com")) return "partnerstack"
    if (hostname.endsWith("impact.com")) return "impact"
    if (hostname.endsWith("systeme.io")) return "systeme"
  } catch {
    return "unknown"
  }

  return "unknown"
}

export function getPlatformPublishTarget(platform: string | null | undefined) {
  if (!platform) return null
  return platformTargets[platform.toLowerCase()] ?? null
}

export function isValidPublishedPostUrl(url: string, platform?: string | null) {
  if (!isApprovedBrowserDomain(url)) return false

  if (!platform) return true
  const detected = detectBrowserPlatform(url)
  return detected === platform || detected === "unknown"
}

export function buildFullPostText(input: {
  title?: string | null
  content?: string | null
  campaignLinkUrl?: string | null
}) {
  const parts = [input.title, input.content, input.campaignLinkUrl]
    .map((part) => part?.trim())
    .filter(Boolean)

  return parts.join("\n\n")
}
