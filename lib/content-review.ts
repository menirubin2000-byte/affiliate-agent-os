import { hashCampaignContent } from "@/lib/campaign-workflow"
import type { FinalContentValidation } from "@/types/content-review"

export const SYSTEME_IO_MEDIUM_FINAL_LINK =
  "https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365&utm_source=medium&utm_medium=manual_article&utm_campaign=systeme_io_review_medium&utm_content=approved_review_v2"

const DISCLOSURE =
  "Affiliate disclosure: This article includes an affiliate link. If you visit Systeme.io through the link and later choose a paid plan, I may earn a commission at no extra cost to you."

const CTA_SECTION = `## Call to Action

To see the current features, plan details, and setup options, try Systeme.io here:

${SYSTEME_IO_MEDIUM_FINAL_LINK}`

const INTERNAL_NOTE_PATTERNS = [
  /no fake personal experience[^\n]*/i,
  /no fake rating[^\n]*/i,
  /no fake earnings[^\n]*/i,
  /no fake .*claim[^\n]*/i,
  /this draft does not claim[^\n]*/i,
]

const PERSONAL_EXPERIENCE_PATTERNS = [
  /\bi tested\b/i,
  /\bmy results\b/i,
  /\bin my experience\b/i,
  /\bi used\b/i,
  /\bi tried\b/i,
]

const INCOME_OR_GUARANTEE_PATTERNS = [
  /\bguaranteed income\b/i,
  /\bguaranteed results\b/i,
  /\bguarantee[sd]?\b/i,
  /\bearn\s+\$?\d+/i,
  /\bmake\s+\$?\d+/i,
]

export function buildFinalContentHash(input: {
  title: string
  body: string
  productId: string
  sourceContentId: string
  adaptationId: string
  platform: string
}) {
  return hashCampaignContent([
    input.productId,
    input.sourceContentId,
    input.adaptationId,
    input.platform,
    input.title,
    input.body,
  ])
}

export function cleanupMediumArticle(input: {
  title: string
  body: string
  finalAffiliateLink?: string
}) {
  const finalLink = input.finalAffiliateLink ?? SYSTEME_IO_MEDIUM_FINAL_LINK
  const title = input.title.trim()
  let body = input.body.replace(/\r\n/g, "\n").trim()

  for (const pattern of INTERNAL_NOTE_PATTERNS) {
    body = body.replace(new RegExp(pattern.source, "gi"), "")
  }

  body = removeDisclosureLines(body)
  body = removeCtaSections(body)
  body = removeSystemeAffiliateUrlLines(body)
  body = normalizeBlankLines(body)

  const pricingSection = "This article does not claim a specific discount, special saving, or business outcome."
  if (body.includes("This draft does not claim a specific discount or guaranteed saving.")) {
    body = body.replace("This draft does not claim a specific discount or guaranteed saving.", pricingSection)
  } else if (!body.includes(pricingSection)) {
    body = body.replace(
      "Exact plan limits, paid-plan pricing, and included features can change, so review the official pricing page and account dashboard before making a final decision.",
      `Exact plan limits, paid-plan pricing, and included features can change, so review the official pricing page and account dashboard before making a final decision.\n\n${pricingSection}`,
    )
  }

  body = normalizeBlankLines(`${DISCLOSURE}\n\n${body}\n\n${CTA_SECTION.replace(SYSTEME_IO_MEDIUM_FINAL_LINK, finalLink)}`)

  return { title, body }
}

export function validateFinalMediumArticle(input: {
  body: string
  finalAffiliateLink?: string
}): FinalContentValidation {
  const finalLink = input.finalAffiliateLink ?? SYSTEME_IO_MEDIUM_FINAL_LINK
  const body = input.body.trim()
  const urlSignature = finalLink.includes("https://systeme.io/?sa=")
    ? "https://systeme.io/?sa="
    : finalLink
  const firstAffiliateLinkIndex = body.indexOf(urlSignature)
  const disclosureIndex = body.toLowerCase().indexOf("affiliate disclosure:")
  const finalLinkCount = countOccurrences(body, finalLink)
  const affiliateUrlCount = countOccurrences(body, urlSignature)
  const ctaHeadingCount = countOccurrences(body.toLowerCase(), "## call to action")
  const internalNotes = INTERNAL_NOTE_PATTERNS.some((pattern) => pattern.test(body))
  const personalExperience = PERSONAL_EXPERIENCE_PATTERNS.some((pattern) => pattern.test(body))
  const incomeOrGuarantee = INCOME_OR_GUARANTEE_PATTERNS.some((pattern) => pattern.test(body))

  const checks = {
    disclosureAtTop: disclosureIndex === 0 && (firstAffiliateLinkIndex === -1 || disclosureIndex < firstAffiliateLinkIndex),
    oneCtaOnly: ctaHeadingCount === 1 && finalLinkCount === 1,
    affiliateLinkExists: finalLinkCount === 1,
    noDuplicateUrl: affiliateUrlCount === 1,
    noInternalNotes: !internalNotes,
    noPersonalExperienceClaim: !personalExperience,
    noIncomeOrGuaranteeClaim: !incomeOrGuarantee,
  }

  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key)

  return {
    validationStatus: blockingReasons.length ? "blocked" : "valid",
    blockingReasons,
    checks,
  }
}

const LONG_FORM_PLATFORMS = new Set(["medium", "substack", "linkedin"])

export function validateFinalCopyForPlatform(input: {
  body: string
  platform: string
  finalAffiliateLink?: string
}): FinalContentValidation {
  if (LONG_FORM_PLATFORMS.has(input.platform)) {
    return validateFinalMediumArticle(input)
  }

  const body = input.body.trim()
  const disclosureIndex = body.toLowerCase().indexOf("affiliate disclosure")
  const internalNotes = INTERNAL_NOTE_PATTERNS.some((pattern) => pattern.test(body))
  const incomeOrGuarantee = INCOME_OR_GUARANTEE_PATTERNS.some((pattern) => pattern.test(body))
  const hasLink = input.finalAffiliateLink ? body.includes(input.finalAffiliateLink) : true

  const checks = {
    disclosureAtTop: disclosureIndex >= 0,
    oneCtaOnly: true,
    affiliateLinkExists: hasLink,
    noDuplicateUrl: true,
    noInternalNotes: !internalNotes,
    noPersonalExperienceClaim: true,
    noIncomeOrGuaranteeClaim: !incomeOrGuarantee,
  }

  const blockingReasons: string[] = []
  if (!checks.disclosureAtTop) blockingReasons.push("missingDisclosure")
  if (!checks.affiliateLinkExists) blockingReasons.push("missingAffiliateLink")
  if (!checks.noInternalNotes) blockingReasons.push("internalNotes")
  if (!checks.noIncomeOrGuaranteeClaim) blockingReasons.push("incomeOrGuaranteeClaim")
  if (body.length < 10) blockingReasons.push("bodyTooShort")

  return {
    validationStatus: blockingReasons.length ? "blocked" : "valid",
    blockingReasons,
    checks,
  }
}

function removeDisclosureLines(body: string) {
  return body
    .split("\n")
    .filter((line) => !line.trim().toLowerCase().startsWith("affiliate disclosure:"))
    .join("\n")
}

function removeCtaSections(body: string) {
  const ctaIndex = body.toLowerCase().indexOf("## call to action")
  if (ctaIndex === -1) return body
  return body.slice(0, ctaIndex).trim()
}

function removeSystemeAffiliateUrlLines(body: string) {
  return body
    .split("\n")
    .filter((line) => !line.includes("https://systeme.io/?sa="))
    .filter((line) => !line.trim().toLowerCase().startsWith("cta:"))
    .join("\n")
}

function normalizeBlankLines(body: string) {
  return body
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function countOccurrences(value: string, needle: string) {
  if (!needle) return 0
  return value.split(needle).length - 1
}
