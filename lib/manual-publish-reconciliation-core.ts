import type { CampaignPlatform } from "@/types/campaign-workflow"

const VERIFIED_MANUAL_URL_PLATFORMS = new Set<CampaignPlatform>([
  "linkedin",
  "medium",
  "substack",
  "reddit",
  "quora",
  "facebook_page",
  "instagram_professional",
])

export function normalizeComparableText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function normalizeMarkdownFieldName(value: string) {
  return normalizeComparableText(value.replace(/[*`_]/g, ""))
}

function extractUuidHints(value: string) {
  return [...value.matchAll(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi)].map(
    (match) => match[0].toLowerCase(),
  )
}

function normalizeTruthyValue(value: string | null | undefined) {
  return normalizeComparableText(value).replace(/[.!?]$/g, "")
}

function parseMarkdownTableFields(section: string) {
  const fields: Record<string, string> = {}

  for (const rawLine of section.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line.startsWith("|")) continue
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim())

    if (cells.length < 2) continue
    if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) continue
    if (normalizeMarkdownFieldName(cells[0]) === "field" && normalizeMarkdownFieldName(cells[1]) === "value") {
      continue
    }

    fields[normalizeMarkdownFieldName(cells[0])] = cells[1]
  }

  return fields
}

function findFirstFieldValue(fields: Record<string, string>, names: string[]) {
  for (const name of names) {
    const value = fields[normalizeMarkdownFieldName(name)]
    if (value) return value.trim()
  }
  return null
}

export function normalizePublishLogPlatform(value: string | null | undefined): CampaignPlatform | null {
  const normalized = normalizeComparableText(value)

  if (normalized.includes("linkedin")) return "linkedin"
  if (normalized.includes("medium")) return "medium"
  if (normalized.includes("substack")) return "substack"
  if (normalized.includes("facebook")) return "facebook_page"
  if (normalized.includes("instagram")) return "instagram_professional"
  if (normalized === "reddit") return "reddit"
  if (normalized === "quora") return "quora"

  return null
}

export function supportsVerifiedManualPublishUrl(platform: string | null | undefined): platform is CampaignPlatform {
  if (!platform) return false
  return VERIFIED_MANUAL_URL_PLATFORMS.has(platform as CampaignPlatform)
}

export type ParsedPublishLogEntry = {
  sourceLabel: string
  platform: CampaignPlatform | null
  productName: string | null
  liveUrl: string | null
  published: boolean
  uuidHints: string[]
  fields: Record<string, string>
}

export function parsePublishLogMarkdown(markdown: string, sourceLabel: string): ParsedPublishLogEntry[] {
  const rawSections = markdown.split(/^## Publish Record:/m)
  const sections = (rawSections.length > 1 ? rawSections.slice(1) : rawSections)
    .map((section) => section.trim())
    .filter(Boolean)

  if (!sections.length) {
    return [
      {
        sourceLabel,
        platform: null,
        productName: null,
        liveUrl: null,
        published: false,
        uuidHints: extractUuidHints(markdown),
        fields: parseMarkdownTableFields(markdown),
      },
    ]
  }

  return sections.map((section, index) => {
    const fields = parseMarkdownTableFields(section)
    const platform = normalizePublishLogPlatform(findFirstFieldValue(fields, ["platform"]))
    const liveUrl = findFirstFieldValue(fields, ["post url", "article url", "published url", "url"])
    const publishedValue = findFirstFieldValue(fields, ["published"])

    return {
      sourceLabel: sections.length === 1 ? sourceLabel : `${sourceLabel}#${index + 1}`,
      platform,
      productName: findFirstFieldValue(fields, ["product"]),
      liveUrl,
      published: normalizeTruthyValue(publishedValue) === "yes",
      uuidHints: [...new Set(extractUuidHints(section))],
      fields,
    }
  })
}

export type PublishLogFinalCopyCandidate = {
  id: string
  sourceContentId: string | null
  platformAdaptationId: string | null
  status: string
  updatedAt: string | null
  existingVerifiedUrl: string | null
}

export function pickPublishLogFinalCopyCandidate(input: {
  liveUrl: string
  uuidHints: string[]
  candidates: PublishLogFinalCopyCandidate[]
}): { candidate: PublishLogFinalCopyCandidate; reason: string } | null {
  if (!input.candidates.length) return null

  const existingUrlMatch = input.candidates.find((candidate) => candidate.existingVerifiedUrl === input.liveUrl)
  if (existingUrlMatch) {
    return {
      candidate: existingUrlMatch,
      reason: "existing_verified_url_match",
    }
  }

  if (input.uuidHints.length > 0) {
    const hintMatches = input.candidates.filter((candidate) =>
      input.uuidHints.some(
        (hint) =>
          hint === candidate.id.toLowerCase() ||
          hint === candidate.sourceContentId?.toLowerCase() ||
          hint === candidate.platformAdaptationId?.toLowerCase(),
      ),
    )
    if (hintMatches.length === 1) {
      return {
        candidate: hintMatches[0],
        reason: "uuid_hint_match",
      }
    }
  }

  const withoutVerifiedUrl = input.candidates.filter((candidate) => !candidate.existingVerifiedUrl)
  if (withoutVerifiedUrl.length === 1) {
    return {
      candidate: withoutVerifiedUrl[0],
      reason: "single_unverified_candidate",
    }
  }

  const unpublishedCandidates = withoutVerifiedUrl.filter((candidate) => candidate.status !== "published_verified")
  if (unpublishedCandidates.length === 1) {
    return {
      candidate: unpublishedCandidates[0],
      reason: "single_unverified_nonpublished_candidate",
    }
  }

  if (input.candidates.length === 1) {
    return {
      candidate: input.candidates[0],
      reason: "single_candidate",
    }
  }

  return null
}
