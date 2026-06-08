import { createAffiliateProgram, createProduct } from "@/lib/db"
import { scoreImpactProductCandidate, summarizeImpactCandidate, type ImpactProductCandidateInput } from "@/lib/impact-product-scoring"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import { slugify } from "@/lib/utils"
import type {
  ImpactCandidateStatus,
  ImpactProductCandidate,
  ImpactRelationshipStatus,
} from "@/types/impact-product-candidate"

type ImpactCandidateRow = {
  id: string
  source: "impact"
  external_id: string
  product_name: string
  brand: string | null
  advertiser: string | null
  price: number | string | null
  currency: string | null
  payout: number | string | null
  payout_type: string | null
  commission_summary: string | null
  epc: number | string | null
  conversion_rate: number | string | null
  recent_sales: number | null
  availability: string | null
  in_stock: boolean | null
  image_url: string | null
  product_url: string | null
  tracking_link: string | null
  landing_page: string | null
  category: string | null
  labels: string[] | null
  relationship_status: ImpactRelationshipStatus
  shipping_geo: string | null
  platform_fit: string[] | null
  commission_score: number
  demand_score: number
  epc_score: number
  conversion_score: number
  image_quality_score: number
  platform_fit_score: number
  shipping_score: number
  risk_score: number
  final_product_score: number
  status: ImpactCandidateStatus
  reject_reasons: string[] | null
  score_reasons: string[] | null
  why_good: string[] | null
  missing_approval: string | null
  added_product_id: string | null
  imported_at: string
  updated_at: string
}

export type ImpactCandidateBucket = "all" | "top50" | "recommended20" | "launch10" | "rejected" | "needsApproval" | "needsShippingCheck"

export type ImpactCandidateSummary = {
  total: number
  top50: number
  recommended20: number
  launch10: number
  rejected: number
  needsApproval: number
  needsShippingCheck: number
  addedToSystem: number
  missingTracking: number
  missingImage: number
}

export type ImpactImportResult = {
  imported: number
  skipped: number
  errors: string[]
}

export async function listImpactProductCandidates(): Promise<ImpactProductCandidate[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("impact_product_candidates")
    .select("*")
    .order("final_product_score", { ascending: false })
    .order("updated_at", { ascending: false })

  if (error) throw new Error(`Unable to load Impact candidates: ${error.message}`)
  return (data ?? []).map((row) => mapImpactCandidate(row as ImpactCandidateRow))
}

export function summarizeImpactCandidates(candidates: ImpactProductCandidate[]): ImpactCandidateSummary {
  return {
    total: candidates.length,
    top50: getTop50Candidates(candidates).length,
    recommended20: candidates.filter((candidate) => candidate.status === "recommended").slice(0, 20).length,
    launch10: getLaunchCandidates(candidates).length,
    rejected: candidates.filter((candidate) => candidate.status === "reject").length,
    needsApproval: candidates.filter((candidate) => candidate.status === "needs_brand_approval").length,
    needsShippingCheck: candidates.filter((candidate) => candidate.status === "needs_geo_check").length,
    addedToSystem: candidates.filter((candidate) => candidate.status === "added_to_system").length,
    missingTracking: candidates.filter((candidate) => candidate.rejectReasons.includes("missing_tracking_link_do_not_promote")).length,
    missingImage: candidates.filter((candidate) => candidate.rejectReasons.includes("missing_image")).length,
  }
}

export function getImpactCandidateBucket(
  candidates: ImpactProductCandidate[],
  bucket: ImpactCandidateBucket,
) {
  switch (bucket) {
    case "top50":
      return getTop50Candidates(candidates)
    case "recommended20":
      return candidates.filter((candidate) => candidate.status === "recommended").slice(0, 20)
    case "launch10":
      return getLaunchCandidates(candidates)
    case "rejected":
      return candidates.filter((candidate) => candidate.status === "reject")
    case "needsApproval":
      return candidates.filter((candidate) => candidate.status === "needs_brand_approval")
    case "needsShippingCheck":
      return candidates.filter((candidate) => candidate.status === "needs_geo_check")
    case "all":
    default:
      return candidates
  }
}

export async function upsertImpactProductCandidates(
  inputs: Array<ImpactProductCandidateInput & { rawData?: unknown }>,
): Promise<ImpactImportResult> {
  const supabase = getServiceRoleSupabase()
  const errors: string[] = []
  let imported = 0
  let skipped = 0

  for (const input of inputs) {
    try {
      if (!input.externalId || !input.productName.trim()) {
        skipped += 1
        continue
      }
      const scoring = scoreImpactProductCandidate(input)
      const { error } = await supabase
        .from("impact_product_candidates")
        .upsert({
          source: "impact",
          external_id: input.externalId,
          product_name: input.productName.trim(),
          brand: input.brand?.trim() || null,
          advertiser: input.advertiser?.trim() || null,
          price: input.price ?? null,
          currency: input.currency?.trim() || null,
          payout: input.payout ?? null,
          payout_type: input.payoutType?.trim() || null,
          commission_summary: input.commissionSummary?.trim() || null,
          epc: input.epc ?? null,
          conversion_rate: input.conversionRate ?? null,
          recent_sales: input.recentSales ?? null,
          availability: input.availability?.trim() || null,
          in_stock: input.inStock ?? null,
          image_url: input.imageUrl?.trim() || null,
          product_url: input.productUrl?.trim() || input.landingPage?.trim() || null,
          tracking_link: input.trackingLink?.trim() || null,
          landing_page: input.landingPage?.trim() || null,
          category: input.category?.trim() || null,
          labels: input.labels ?? [],
          relationship_status: input.relationshipStatus ?? "unknown",
          shipping_geo: input.shippingGeo?.trim() || null,
          platform_fit: scoring.platformFit,
          commission_score: scoring.commissionScore,
          demand_score: scoring.demandScore,
          epc_score: scoring.epcScore,
          conversion_score: scoring.conversionScore,
          image_quality_score: scoring.imageQualityScore,
          platform_fit_score: scoring.platformFitScore,
          shipping_score: scoring.shippingScore,
          risk_score: scoring.riskScore,
          final_product_score: scoring.finalProductScore,
          status: scoring.status,
          reject_reasons: scoring.rejectReasons,
          score_reasons: scoring.scoreReasons,
          why_good: scoring.whyGood,
          missing_approval: scoring.missingApproval,
          raw_data: input.rawData ?? {},
          imported_at: new Date().toISOString(),
        }, { onConflict: "source,external_id" })

      if (error) throw error
      imported += 1
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Unable to import ${input.productName}`)
    }
  }

  return { imported, skipped, errors }
}

export async function addImpactCandidateToSystem(candidateId: string) {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("impact_product_candidates")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle()

  if (error) throw new Error(`Unable to load Impact candidate: ${error.message}`)
  if (!data) throw new Error("Impact candidate not found.")
  const candidate = mapImpactCandidate(data as ImpactCandidateRow)

  if (candidate.status === "reject") {
    throw new Error("Rejected candidates cannot be added to the system.")
  }
  if (!candidate.landingPage) {
    throw new Error("Candidate has no landing page.")
  }
  if (!candidate.trackingLink) {
    throw new Error("Candidate has no Impact tracking link.")
  }

  const product = await createProduct({
    name: candidate.productName,
    slug: await buildUniqueProductSlug(candidate.productName),
    brand: candidate.brand ?? candidate.advertiser,
    category: candidate.category,
    affiliateUrl: candidate.trackingLink,
    price: candidate.price,
    commissionRate: candidate.payoutType === "percent" ? candidate.payout : null,
    notes: [
      "Imported from Impact marketplace candidate scanner.",
      summarizeImpactCandidate(candidate),
      candidate.shippingGeo ? `Shipping/geo: ${candidate.shippingGeo}` : "Shipping/geo: needs check.",
      candidate.missingApproval ? `Approval: ${candidate.missingApproval}` : "Approval: approved in Impact.",
    ].join("\n"),
    targetKeyword: `${candidate.productName} review`,
    secondaryKeywords: [candidate.brand, candidate.category].filter(Boolean) as string[],
    searchIntent: "Commercial investigation",
    contentAngle: candidate.whyGood[0] ?? "Practical affiliate product evaluation.",
    status: "inactive",
  })

  await createAffiliateProgram({
    productId: product.id,
    programName: `${candidate.advertiser ?? candidate.brand ?? candidate.productName} - Impact`,
    programUrl: candidate.productUrl ?? candidate.landingPage,
    signupUrl: candidate.productUrl ?? candidate.landingPage,
    network: "Impact",
    commissionSummary: candidate.commissionSummary || (candidate.payout ? `${candidate.payout}${candidate.payoutType === "amount" ? " fixed" : "%"}` : null),
    approvalType: candidate.relationshipStatus === "approved" ? "instant" : "manual_review",
    status: candidate.relationshipStatus === "approved" ? "approved" : "awaiting_human_approval",
    affiliateLink: candidate.trackingLink,
    notes: summarizeImpactCandidate(candidate),
  })

  const { error: updateError } = await supabase
    .from("impact_product_candidates")
    .update({
      status: "added_to_system",
      added_product_id: product.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidate.id)

  if (updateError) throw new Error(`Unable to mark candidate as added: ${updateError.message}`)
  return product
}

function getLaunchCandidates(candidates: ImpactProductCandidate[]) {
  return candidates
    .filter((candidate) => candidate.status === "recommended" && candidate.relationshipStatus === "approved" && Boolean(candidate.trackingLink))
    .slice(0, 10)
}

function getTop50Candidates(candidates: ImpactProductCandidate[]) {
  return candidates
    .filter((candidate) => candidate.status !== "reject" && candidate.status !== "added_to_system")
    .slice(0, 50)
}

async function buildUniqueProductSlug(productName: string) {
  const supabase = getServiceRoleSupabase()
  const base = slugify(productName)
  let slug = base
  let suffix = 2

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()

    if (error) throw new Error(`Unable to check product slug: ${error.message}`)
    if (!data) return slug
    slug = `${base}-${suffix}`
    suffix += 1
  }
}

function mapImpactCandidate(row: ImpactCandidateRow): ImpactProductCandidate {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    productName: row.product_name,
    brand: row.brand,
    advertiser: row.advertiser,
    price: toNullableNumber(row.price),
    currency: row.currency,
    payout: toNullableNumber(row.payout),
    payoutType: row.payout_type,
    commissionSummary: row.commission_summary,
    epc: toNullableNumber(row.epc),
    conversionRate: toNullableNumber(row.conversion_rate),
    recentSales: row.recent_sales,
    availability: row.availability,
    inStock: row.in_stock,
    imageUrl: row.image_url,
    productUrl: row.product_url ?? row.landing_page,
    trackingLink: row.tracking_link,
    landingPage: row.product_url ?? row.landing_page,
    category: row.category,
    labels: row.labels ?? [],
    relationshipStatus: row.relationship_status,
    shippingGeo: row.shipping_geo,
    platformFit: row.platform_fit ?? [],
    commissionScore: row.commission_score,
    demandScore: row.demand_score,
    epcScore: row.epc_score,
    conversionScore: row.conversion_score,
    imageQualityScore: row.image_quality_score,
    platformFitScore: row.platform_fit_score,
    shippingScore: row.shipping_score,
    riskScore: row.risk_score,
    finalProductScore: row.final_product_score,
    status: row.status,
    rejectReasons: row.reject_reasons ?? [],
    scoreReasons: row.score_reasons ?? [],
    whyGood: row.why_good ?? [],
    missingApproval: row.missing_approval,
    addedProductId: row.added_product_id,
    importedAt: row.imported_at,
    updatedAt: row.updated_at,
  }
}

function toNullableNumber(value: number | string | null) {
  if (value === null) return null
  if (typeof value === "number") return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
