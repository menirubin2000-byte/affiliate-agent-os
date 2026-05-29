import type { Draft, DraftStatus, TemplateType } from "@/types/draft"
import type { PerformanceSummary } from "@/types/performance"
import type { PublishingJob, PublishingJobStatus } from "@/types/publishing"
import type { Product } from "@/types/product"

export interface DashboardSummary {
  totalProducts: number
  activeProducts: number
  totalDrafts: number
  draftsByStatus: Record<DraftStatus, number>
  draftsByTemplateType: Record<TemplateType, number>
  totalPublishingJobs: number
  publishingJobsByStatus: Record<PublishingJobStatus, number>
}

export interface DashboardNeedsAttention {
  failedPublishingJobs: PublishingJob[]
  approvedDraftsNotQueued: Draft[]
  productsWithoutDrafts: Product[]
}

export type DashboardPerformanceSnapshot = PerformanceSummary
