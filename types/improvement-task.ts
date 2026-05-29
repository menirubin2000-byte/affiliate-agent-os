export type ImprovementTaskSourceType = "recommendation" | "performance_insight" | "manual" | "quality_check"

export type ImprovementTaskPriority = "low" | "medium" | "high" | "critical"

export type ImprovementTaskStatus = "open" | "in_progress" | "done" | "dismissed"

export interface ImprovementTask {
  id: string
  productId: string | null
  productName: string | null
  contentDraftId: string | null
  draftTitle: string | null
  sourceType: ImprovementTaskSourceType
  priority: ImprovementTaskPriority
  status: ImprovementTaskStatus
  title: string
  description: string | null
  suggestedAction: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateImprovementTaskInput {
  productId?: string | null
  contentDraftId?: string | null
  sourceType: ImprovementTaskSourceType
  priority?: ImprovementTaskPriority
  title: string
  description?: string | null
  suggestedAction?: string | null
}

export interface ImprovementTaskSummary {
  total: number
  open: number
  inProgress: number
  done: number
  dismissed: number
  critical: number
}
