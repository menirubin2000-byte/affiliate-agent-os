export type RecommendationSeverity = "info" | "warning" | "critical"

export type RecommendationType =
  | "product_no_drafts"
  | "approved_draft_no_publishing_job"
  | "approved_draft_no_performance"
  | "failed_publishing_job"
  | "product_low_click_volume"
  | "channel_low_click_volume"
  | "draft_weak_quality"
  | "template_underperforming"
  | "product_no_newer_draft_iteration"
  | "product_clicks_no_conversions"
  | "product_no_recent_records"
  | "social_only_coverage"

export type RecommendationEntityType =
  | "product"
  | "draft"
  | "publishing_job"
  | "channel"
  | "template_type"
  | "system"

export interface Recommendation {
  id: string
  type: RecommendationType
  severity: RecommendationSeverity
  title: string
  description: string
  relatedEntityType: RecommendationEntityType
  relatedEntityKey: string | null
  actionLabel: string
  actionHref: string
}

export interface RecommendationSummary {
  total: number
  info: number
  warning: number
  critical: number
}

