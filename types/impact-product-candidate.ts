export type ImpactCandidateStatus =
  | "recommended"
  | "maybe"
  | "reject"
  | "needs_image"
  | "needs_brand_approval"
  | "needs_geo_check"
  | "added_to_system"

export type ImpactRelationshipStatus =
  | "approved"
  | "not_approved"
  | "needs_brand_approval"
  | "unknown"

export interface ImpactProductScores {
  commissionScore: number
  demandScore: number
  epcScore: number
  conversionScore: number
  imageQualityScore: number
  platformFitScore: number
  shippingScore: number
  riskScore: number
  finalProductScore: number
}

export interface ImpactProductCandidate extends ImpactProductScores {
  id: string
  source: "impact"
  externalId: string
  productName: string
  brand: string | null
  advertiser: string | null
  price: number | null
  currency: string | null
  payout: number | null
  payoutType: string | null
  commissionSummary: string | null
  epc: number | null
  conversionRate: number | null
  recentSales: number | null
  availability: string | null
  inStock: boolean | null
  imageUrl: string | null
  landingPage: string | null
  category: string | null
  labels: string[]
  relationshipStatus: ImpactRelationshipStatus
  shippingGeo: string | null
  platformFit: string[]
  status: ImpactCandidateStatus
  rejectReasons: string[]
  whyGood: string[]
  missingApproval: string | null
  addedProductId: string | null
  importedAt: string
  updatedAt: string
}
