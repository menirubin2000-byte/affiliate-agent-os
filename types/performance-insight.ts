export type PerformanceSignal =
  | "no_data"
  | "getting_clicks"
  | "no_conversions"
  | "converting"
  | "needs_refresh"

export type InsightSeverity = "info" | "warning" | "critical"

export type InsightType =
  | "product_clicks_no_conversions"
  | "product_high_performance"
  | "product_revenue_no_iteration"
  | "channel_no_conversions"
  | "template_weak_conversion"
  | "approved_draft_no_performance"
  | "stale_performance_record"
  | "product_needs_iteration"
  | "campaign_link_clicks_no_conversions"
  | "campaign_link_no_performance"
  | "campaign_link_high_performance"

export interface PerformanceInsight {
  id: string
  type: InsightType
  severity: InsightSeverity
  title: string
  description: string
  relatedEntityType: "product" | "draft" | "channel" | "template_type"
  relatedEntityKey: string
  actionLabel: string
  actionHref: string
}

export interface PerformanceInsightSummary {
  total: number
  info: number
  warning: number
  critical: number
}

export interface ProductPerformanceSignal {
  productId: string
  signal: PerformanceSignal
  label: string
  clicks: number
  conversions: number
  revenue: number
  records: number
  latestRecordAge: number | null
}
