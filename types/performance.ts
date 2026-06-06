import type { TemplateType } from "@/types/draft"

export interface PerformanceMetric {
  id: string
  productId: string
  productName: string
  productSlug: string
  draftId: string | null
  draftTitle: string | null
  draftTemplateType: TemplateType | null
  campaignLinkId: string | null
  channel: string
  campaignName: string | null
  clicks: number
  conversions: number | null
  revenue: number | null
  notes: string | null
  recordedAt: string
  createdAt: string
}

export interface CreatePerformanceMetricInput {
  productId: string
  draftId?: string | null
  campaignLinkId?: string | null
  channel: string
  campaignName?: string | null
  clicks: number
  conversions?: number | null
  revenue?: number | null
  notes?: string | null
  recordedAt?: string | null
  /** External network/platform the metric came from. Adapter-set, never user-set. */
  source?: string | null
}

export interface PerformanceChannelSummary {
  channel: string
  records: number
  clicks: number
  conversions: number
  revenue: number
}

export interface PerformanceProductSummary {
  productId: string
  productName: string
  productSlug: string
  records: number
  clicks: number
  conversions: number
  revenue: number
}

export interface PerformanceSummary {
  totalRecords: number
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  byChannel: PerformanceChannelSummary[]
  byProduct: PerformanceProductSummary[]
}
