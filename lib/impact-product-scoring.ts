import type {
  ImpactCandidateStatus,
  ImpactProductCandidate,
  ImpactProductScores,
  ImpactRelationshipStatus,
} from "@/types/impact-product-candidate"

export type ImpactProductCandidateInput = {
  externalId: string
  productName: string
  brand?: string | null
  advertiser?: string | null
  price?: number | null
  currency?: string | null
  payout?: number | null
  payoutType?: string | null
  commissionSummary?: string | null
  epc?: number | null
  conversionRate?: number | null
  recentSales?: number | null
  availability?: string | null
  inStock?: boolean | null
  imageUrl?: string | null
  productUrl?: string | null
  trackingLink?: string | null
  landingPage?: string | null
  category?: string | null
  labels?: string[]
  relationshipStatus?: ImpactRelationshipStatus
  shippingGeo?: string | null
}

export type ImpactProductCandidateScoring = ImpactProductScores & {
  status: ImpactCandidateStatus
  rejectReasons: string[]
  scoreReasons: string[]
  whyGood: string[]
  missingApproval: string | null
  platformFit: string[]
}

const HIGH_INTENT_CATEGORIES = [
  "software",
  "saas",
  "marketing",
  "business",
  "productivity",
  "finance",
  "education",
  "ai",
  "ecommerce",
  "travel",
]

export function scoreImpactProductCandidate(
  input: ImpactProductCandidateInput,
): ImpactProductCandidateScoring {
  const rejectReasons: string[] = []
  const whyGood: string[] = []
  const platformFit = derivePlatformFit(input)
  const payout = input.payout ?? parsePayoutFromSummary(input.commissionSummary)
  const epc = input.epc ?? null
  const conversionRate = input.conversionRate ?? null
  const hasImage = Boolean(input.imageUrl?.trim())
  const hasLandingPage = Boolean(input.productUrl?.trim() || input.landingPage?.trim())
  const hasTrackingLink = Boolean(input.trackingLink?.trim())
  const relationshipStatus = input.relationshipStatus ?? "unknown"
  const shippingKnown = Boolean(input.shippingGeo?.trim()) || input.inStock !== null
  const inStock = input.inStock ?? null

  if ((payout ?? 0) <= 0) rejectReasons.push("payout_0_do_not_promote")
  if (!hasImage) rejectReasons.push("missing_image")
  if (!hasTrackingLink) rejectReasons.push("missing_tracking_link_do_not_promote")
  if (!hasLandingPage) rejectReasons.push("missing_landing_page")
  if (relationshipStatus !== "approved") rejectReasons.push("needs_brand_approval")
  if (epc !== null && epc < 0.5) rejectReasons.push("bad_epc")
  if (!shippingKnown) rejectReasons.push("unknown_shipping_needs_geo_check")
  if (inStock === false) rejectReasons.push("not_in_stock")

  const commissionScore = clampScore((payout ?? 0) * 4)
  const epcScore = epc === null ? 35 : clampScore(epc * 10)
  const conversionScore = conversionRate === null ? 35 : clampScore(conversionRate * 12)
  const demandScore = scoreDemand(input, whyGood)
  const imageQualityScore = hasImage && hasLandingPage && hasTrackingLink ? 90 : hasImage ? 55 : 0
  const platformFitScore = clampScore(platformFit.length * 18 + scoreCategory(input.category) * 0.35)
  const shippingScore = inStock === false ? 0 : shippingKnown ? 80 : 35
  const riskScore = scoreRisk({ relationshipStatus, hasLandingPage, hasImage, epc, shippingKnown, inStock })

  const finalProductScore = Math.round(
    commissionScore * 0.3 +
      demandScore * 0.2 +
      ((epcScore + conversionScore) / 2) * 0.15 +
      imageQualityScore * 0.1 +
      shippingScore * 0.1 +
      platformFitScore * 0.1 +
      riskScore * 0.05,
  )

  if ((payout ?? 0) > 0) whyGood.push(`Expected commission: ${formatCommission(payout, input.payoutType)}`)
  if (epc !== null && epc >= 3) whyGood.push(`Strong EPC signal: ${epc}`)
  if (conversionRate !== null && conversionRate >= 2) whyGood.push(`Conversion rate is usable: ${conversionRate}%`)
  if (platformFit.length > 0) whyGood.push(`Platform fit: ${platformFit.join(", ")}`)

  const hardReject = rejectReasons.some((reason) =>
    ["payout_0_do_not_promote", "missing_image", "missing_tracking_link_do_not_promote", "missing_landing_page", "bad_epc", "not_in_stock"].includes(reason),
  )
  const status = deriveStatus({
    finalProductScore,
    hardReject,
    hasImage,
    hasTrackingLink,
    hasLandingPage,
    relationshipStatus,
    shippingKnown,
  })
  const scoreReasons = [
    (payout ?? 0) > 0 ? `commission is ${formatCommission(payout, input.payoutType)}` : "payout is 0, do not promote",
    epc !== null ? `EPC is ${epc}` : "EPC unknown",
    conversionRate !== null ? `conversion rate is ${conversionRate}%` : "conversion rate unknown",
    hasImage ? "image exists" : "missing image",
    hasTrackingLink ? "tracking link exists" : "missing tracking link",
    hasLandingPage ? "landing page exists" : "missing landing page",
    shippingKnown ? "shipping/geo signal exists" : "shipping unknown",
    relationshipStatus === "approved" ? "Impact relationship approved" : "brand approval missing",
    platformFit.length > 0 ? `platform fit: ${platformFit.join(", ")}` : "platform fit unclear",
  ]

  return {
    commissionScore,
    demandScore,
    epcScore,
    conversionScore,
    imageQualityScore,
    platformFitScore,
    shippingScore,
    riskScore,
    finalProductScore,
    status,
    rejectReasons,
    scoreReasons,
    whyGood,
    missingApproval: relationshipStatus === "approved" ? null : "Impact relationship is not approved yet.",
    platformFit,
  }
}

export function summarizeImpactCandidate(candidate: Pick<
  ImpactProductCandidate,
  "productName" | "brand" | "commissionSummary" | "payout" | "payoutType" | "epc" | "conversionRate" | "shippingGeo" | "status" | "rejectReasons"
>) {
  const commission = candidate.commissionSummary || formatCommission(candidate.payout, candidate.payoutType)
  const signals = [
    commission ? `Commission: ${commission}` : null,
    candidate.epc !== null ? `EPC: ${candidate.epc}` : null,
    candidate.conversionRate !== null ? `Conversion: ${candidate.conversionRate}%` : null,
    candidate.shippingGeo ? `Geo: ${candidate.shippingGeo}` : null,
    candidate.rejectReasons.length > 0 ? `Checks: ${candidate.rejectReasons.join(", ")}` : null,
  ].filter(Boolean)

  return `${candidate.productName}${candidate.brand ? ` by ${candidate.brand}` : ""}. ${signals.join(" · ")}`
}

function deriveStatus(input: {
  finalProductScore: number
  hardReject: boolean
  hasImage: boolean
  hasTrackingLink: boolean
  hasLandingPage: boolean
  relationshipStatus: ImpactRelationshipStatus
  shippingKnown: boolean
}): ImpactCandidateStatus {
  if (input.hardReject || input.finalProductScore < 60) return "reject"
  if (input.relationshipStatus !== "approved") return "needs_brand_approval"
  if (!input.shippingKnown) return "needs_geo_check"
  if (input.finalProductScore >= 80) return "recommended"
  return "maybe"
}

function derivePlatformFit(input: ImpactProductCandidateInput) {
  const text = [
    input.productName,
    input.brand,
    input.advertiser,
    input.category,
    ...(input.labels ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  const platforms = new Set<string>()

  if (/software|saas|business|marketing|ai|seo|crm|productivity|email/.test(text)) {
    platforms.add("LinkedIn")
    platforms.add("Medium")
    platforms.add("Substack")
  }
  if (/template|design|visual|shop|fashion|home|beauty|travel|food/.test(text)) {
    platforms.add("Pinterest")
    platforms.add("Instagram")
  }
  if (/developer|automation|workflow|tool|software|finance/.test(text)) {
    platforms.add("X/Twitter")
  }
  if (/course|education|tutorial|how to|ai|software/.test(text)) {
    platforms.add("YouTube")
  }
  if (platforms.size === 0) {
    platforms.add("Medium")
    platforms.add("Facebook")
  }
  return Array.from(platforms)
}

function scoreDemand(input: ImpactProductCandidateInput, whyGood: string[]) {
  const categoryScore = scoreCategory(input.category)
  const salesScore = input.recentSales === null || input.recentSales === undefined
    ? 40
    : clampScore(input.recentSales * 5)
  const labelBoost = (input.labels ?? []).some((label) => /top|best|popular|sale|new/i.test(label)) ? 10 : 0
  const score = clampScore(categoryScore * 0.55 + salesScore * 0.35 + labelBoost)
  if (score >= 70) whyGood.push("Demand indicators are above baseline.")
  return score
}

function scoreCategory(category?: string | null) {
  const normalized = category?.toLowerCase() ?? ""
  if (!normalized) return 45
  if (HIGH_INTENT_CATEGORIES.some((item) => normalized.includes(item))) return 82
  if (/home|beauty|health|fitness|consumer|retail|travel/.test(normalized)) return 65
  return 50
}

function scoreRisk(input: {
  relationshipStatus: ImpactRelationshipStatus
  hasLandingPage: boolean
  hasImage: boolean
  epc: number | null
  shippingKnown: boolean
  inStock: boolean | null
}) {
  let score = 100
  if (input.relationshipStatus !== "approved") score -= 30
  if (!input.hasLandingPage) score -= 25
  if (!input.hasImage) score -= 20
  if (input.epc !== null && input.epc < 0.5) score -= 25
  if (!input.shippingKnown) score -= 15
  if (input.inStock === false) score -= 35
  return clampScore(score)
}

function parsePayoutFromSummary(summary?: string | null) {
  const match = summary?.match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

function formatCommission(value?: number | null, type?: string | null) {
  if (value === null || value === undefined) return ""
  if (type === "amount") return `$${value}`
  return `${value}%`
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}
