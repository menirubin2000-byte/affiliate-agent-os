import type { Draft, QualityChecks, TemplateType } from "@/types/draft"
import type { PerformanceMetric } from "@/types/performance"
import type { PublishingJob } from "@/types/publishing"
import type { Product } from "@/types/product"
import type {
  DraftPublishingState,
  NextAction,
  WorkflowLabel,
} from "@/types/workflow"

const SHORT_FORM_TEMPLATES: ReadonlySet<TemplateType> = new Set([
  "social_post",
  "tiktok_script",
  "quora_answer",
  "reddit_post",
])

export function buildNextAction(label: string, href: string): NextAction {
  return { label, href }
}

export function getDraftPublishingState(
  draftId: string,
  publishingJobsByDraftId: Map<string, PublishingJob[]>,
): DraftPublishingState {
  const jobs = publishingJobsByDraftId.get(draftId) ?? []

  if (jobs.some((job) => job.status === "failed")) {
    return "failed"
  }

  if (jobs.some((job) => job.status === "pending")) {
    return "queued"
  }

  if (jobs.some((job) => job.status === "sent" || job.status === "sent_to_wordpress")) {
    return "sent"
  }

  return "not_queued"
}

export function countPassedQualityChecks(qualityChecks: QualityChecks) {
  return Object.values(qualityChecks).filter(Boolean).length
}

export function summarizeQualityIssues(qualityChecks: QualityChecks) {
  const issues: string[] = []

  if (!qualityChecks.has_disclosure) issues.push("missing disclosure")
  if (!qualityChecks.has_clear_cta) issues.push("missing CTA")
  if (!qualityChecks.has_target_keyword) issues.push("missing target keyword")
  if (!qualityChecks.has_meta_description) issues.push("missing meta description")
  if (!qualityChecks.has_required_structure) issues.push("weak structure")

  return issues
}

export function deriveProductWorkflow(
  product: Product,
  productDrafts: Draft[],
  publishingJobsByDraftId: Map<string, PublishingJob[]>,
  performanceByProductId: Map<string, PerformanceMetric[]>,
): {
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
} {
  const draftCount = productDrafts.length
  const approvedDrafts = productDrafts.filter((draft) => draft.status === "approved")
  const pendingDrafts = productDrafts.filter((draft) => draft.status === "draft")
  const hasOnlySocialDrafts =
    draftCount > 0 && productDrafts.every((draft) => SHORT_FORM_TEMPLATES.has(draft.templateType))
  const hasApprovedLongForm = approvedDrafts.some(
    (draft) => !SHORT_FORM_TEMPLATES.has(draft.templateType),
  )
  const hasPerformanceData = (performanceByProductId.get(product.id) ?? []).length > 0

  const relatedJobs = approvedDrafts.flatMap(
    (draft) => publishingJobsByDraftId.get(draft.id) ?? [],
  )
  const hasPublishingFailure = relatedJobs.some((job) => job.status === "failed")
  const hasQueuedWordPress = relatedJobs.some((job) => job.status === "pending")
  const hasSentWordPress = relatedJobs.some((job) => job.status === "sent" || job.status === "sent_to_wordpress")
  const hasApprovedNotQueued = approvedDrafts.some(
    (draft) => getDraftPublishingState(draft.id, publishingJobsByDraftId) === "not_queued",
  )

  const signals: string[] = []
  if (draftCount === 0) signals.push("No drafts")
  if (hasOnlySocialDrafts) signals.push("Only social drafts")
  if (hasApprovedLongForm) signals.push("Approved long-form content")
  if (hasQueuedWordPress) signals.push("Queued to WordPress")
  if (hasPublishingFailure) signals.push("WordPress queue failed")
  if (hasPerformanceData) signals.push("Performance tracked")

  if (draftCount === 0) {
    return {
      workflowLabel: "needs_draft",
      nextAction: buildNextAction("Generate long-form draft", "/dashboard/products"),
      signals,
      draftCount,
      approvedDraftCount: approvedDrafts.length,
      pendingDraftCount: pendingDrafts.length,
      hasApprovedLongForm,
      hasOnlySocialDrafts,
      hasPerformanceData,
      hasQueuedWordPress,
      hasPublishingFailure,
    }
  }

  if (hasPublishingFailure) {
    return {
      workflowLabel: "wordpress_failed",
      nextAction: buildNextAction("Investigate failed WordPress job", "/dashboard/publishing"),
      signals,
      draftCount,
      approvedDraftCount: approvedDrafts.length,
      pendingDraftCount: pendingDrafts.length,
      hasApprovedLongForm,
      hasOnlySocialDrafts,
      hasPerformanceData,
      hasQueuedWordPress,
      hasPublishingFailure,
    }
  }

  if (hasApprovedNotQueued) {
    return {
      workflowLabel: "approved_not_queued",
      nextAction: buildNextAction("Queue approved draft", "/dashboard/publishing"),
      signals,
      draftCount,
      approvedDraftCount: approvedDrafts.length,
      pendingDraftCount: pendingDrafts.length,
      hasApprovedLongForm,
      hasOnlySocialDrafts,
      hasPerformanceData,
      hasQueuedWordPress,
      hasPublishingFailure,
    }
  }

  if (hasQueuedWordPress) {
    return {
      workflowLabel: "queued_to_wordpress",
      nextAction: buildNextAction("Monitor publishing queue", "/dashboard/publishing"),
      signals,
      draftCount,
      approvedDraftCount: approvedDrafts.length,
      pendingDraftCount: pendingDrafts.length,
      hasApprovedLongForm,
      hasOnlySocialDrafts,
      hasPerformanceData,
      hasQueuedWordPress,
      hasPublishingFailure,
    }
  }

  if (hasSentWordPress && !hasPerformanceData) {
    return {
      workflowLabel: "published_draft_pending_performance",
      nextAction: buildNextAction("Add performance record", "/dashboard/performance"),
      signals,
      draftCount,
      approvedDraftCount: approvedDrafts.length,
      pendingDraftCount: pendingDrafts.length,
      hasApprovedLongForm,
      hasOnlySocialDrafts,
      hasPerformanceData,
      hasQueuedWordPress,
      hasPublishingFailure,
    }
  }

  if (hasPerformanceData) {
    return {
      workflowLabel: "performance_tracked",
      nextAction: buildNextAction("Review performance", "/dashboard/performance"),
      signals,
      draftCount,
      approvedDraftCount: approvedDrafts.length,
      pendingDraftCount: pendingDrafts.length,
      hasApprovedLongForm,
      hasOnlySocialDrafts,
      hasPerformanceData,
      hasQueuedWordPress,
      hasPublishingFailure,
    }
  }

  if (pendingDrafts.length > 0) {
    return {
      workflowLabel: "awaiting_approval",
      nextAction: buildNextAction(
        "Review draft",
        `/dashboard/drafts?product=${encodeURIComponent(product.id)}`,
      ),
      signals,
      draftCount,
      approvedDraftCount: approvedDrafts.length,
      pendingDraftCount: pendingDrafts.length,
      hasApprovedLongForm,
      hasOnlySocialDrafts,
      hasPerformanceData,
      hasQueuedWordPress,
      hasPublishingFailure,
    }
  }

  return {
    workflowLabel: "draft_ready",
    nextAction: buildNextAction(
      hasOnlySocialDrafts ? "Generate long-form draft" : "Review drafts",
      hasOnlySocialDrafts
        ? "/dashboard/products"
        : `/dashboard/drafts?product=${encodeURIComponent(product.id)}`,
    ),
    signals,
    draftCount,
    approvedDraftCount: approvedDrafts.length,
    pendingDraftCount: pendingDrafts.length,
    hasApprovedLongForm,
    hasOnlySocialDrafts,
    hasPerformanceData,
    hasQueuedWordPress,
    hasPublishingFailure,
  }
}

export function deriveDraftWorkflow(
  draft: Draft,
  productDrafts: Draft[],
  publishingJobsByDraftId: Map<string, PublishingJob[]>,
  performanceByDraftId: Map<string, PerformanceMetric[]>,
): {
  workflowLabel: WorkflowLabel
  publishingState: DraftPublishingState
  nextAction: NextAction
  signals: string[]
} {
  const publishingState = getDraftPublishingState(draft.id, publishingJobsByDraftId)
  const hasPerformanceData = (performanceByDraftId.get(draft.id) ?? []).length > 0
  const hasOnlySocialCoverage =
    productDrafts.length > 0 && productDrafts.every((item) => SHORT_FORM_TEMPLATES.has(item.templateType))
  const signals: string[] = []

  if (!draft.qualityChecks.has_meta_description) signals.push("Missing meta description")
  if (!draft.qualityChecks.has_target_keyword) signals.push("Missing target keyword")
  if (!draft.qualityChecks.has_required_structure) signals.push("Weak structure")
  if (hasOnlySocialCoverage) signals.push("Only social coverage for product")
  if (hasPerformanceData) signals.push("Performance linked")

  if (publishingState === "failed") {
    return {
      workflowLabel: "wordpress_failed",
      publishingState,
      nextAction: buildNextAction("Investigate failed WordPress job", "/dashboard/publishing"),
      signals,
    }
  }

  if (draft.status === "approved" && publishingState === "queued") {
    return {
      workflowLabel: "queued_to_wordpress",
      publishingState,
      nextAction: buildNextAction("Monitor publishing queue", "/dashboard/publishing"),
      signals,
    }
  }

  if (draft.status === "approved" && publishingState === "sent" && !hasPerformanceData) {
    return {
      workflowLabel: "published_draft_pending_performance",
      publishingState,
      nextAction: buildNextAction("Add performance record", "/dashboard/performance"),
      signals,
    }
  }

  if (draft.status === "approved" && publishingState === "sent" && hasPerformanceData) {
    return {
      workflowLabel: "performance_tracked",
      publishingState,
      nextAction: buildNextAction("Review performance", "/dashboard/performance"),
      signals,
    }
  }

  if (draft.status === "approved" && publishingState === "not_queued") {
    return {
      workflowLabel: "approved_not_queued",
      publishingState,
      nextAction: buildNextAction("Queue approved draft", "/dashboard/publishing"),
      signals,
    }
  }

  if (draft.status === "draft") {
    return {
      workflowLabel: "awaiting_approval",
      publishingState,
      nextAction: buildNextAction("Review draft", "/dashboard/drafts"),
      signals,
    }
  }

  return {
    workflowLabel: "draft_ready",
    publishingState,
    nextAction: buildNextAction("Generate replacement draft", "/dashboard/products"),
    signals,
  }
}
