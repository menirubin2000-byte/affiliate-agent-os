export type ActionItemSource =
  | "data_quality"
  | "improvement_task"
  | "recommendation"
  | "performance_insight"
  | "draft"
  | "product"
  | "campaign_link"
  | "affiliate_program"

export type ActionItemPriority =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical"

export interface ActionItem {
  id: string
  source: ActionItemSource
  priority: ActionItemPriority
  title: string
  description: string
  actionLabel: string
  actionHref: string
  relatedEntityType: string
  relatedEntityIdOrKey: string | null
  detectedAt: string | null
}

export interface OperatorActionSummary {
  total: number
  info: number
  low: number
  medium: number
  high: number
  critical: number
  bySource: Record<ActionItemSource, number>
}
