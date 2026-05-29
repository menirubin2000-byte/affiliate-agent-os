export type DataQualityArea =
  | "products"
  | "drafts"
  | "campaign_links"
  | "performance"
  | "improvements"
  | "saved_views"
  | "affiliate_programs"

export type DataQualitySeverity = "info" | "warning" | "critical"

export interface DataQualityIssue {
  id: string
  area: DataQualityArea
  severity: DataQualitySeverity
  title: string
  description: string
  relatedEntityType: string
  relatedEntityId: string
  actionLabel: string
  actionHref: string
}

export interface DataQualitySummary {
  total: number
  critical: number
  warning: number
  info: number
  byArea: Record<DataQualityArea, number>
}
