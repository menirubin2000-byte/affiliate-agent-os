import type { Draft } from "@/types/draft"
import type { PerformanceMetric } from "@/types/performance"
import type { Product } from "@/types/product"
import type { PublishingJob } from "@/types/publishing"

export type WorkflowLabel =
  | "needs_draft"
  | "draft_ready"
  | "awaiting_approval"
  | "approved_not_queued"
  | "queued_to_wordpress"
  | "wordpress_failed"
  | "published_draft_pending_performance"
  | "performance_tracked"

export type DraftPublishingState = "not_queued" | "queued" | "sent" | "failed"

export interface NextAction {
  label: string
  href: string
}

export interface ProductWorkflowItem extends Product {
  workflowLabel: WorkflowLabel
  nextAction: NextAction
  signals: string[]
  draftCount: number
  approvedDraftCount: number
  pendingDraftCount: number
  hasApprovedLongForm: boolean
  hasOnlySocialDrafts: boolean
  hasPerformanceData: boolean
  hasQueuedWordPress: boolean
  hasPublishingFailure: boolean
}

export interface DraftWorkflowItem extends Draft {
  workflowLabel: WorkflowLabel
  publishingState: DraftPublishingState
  nextAction: NextAction
  signals: string[]
}

export interface PublishingWorkflowItem extends PublishingJob {
  workflowLabel: WorkflowLabel
  nextAction: NextAction
  signals: string[]
}

export interface PerformanceWorkflowRecord extends PerformanceMetric {
  nextAction: NextAction
  signals: string[]
  isMissingConversions: boolean
  isStale: boolean
}

