import type { ActionItem, ActionItemPriority, ActionItemSource, OperatorActionSummary } from "@/types/action-item"
import type { CampaignLink } from "@/types/campaign-link"
import type { DataQualityIssue } from "@/types/data-quality"
import type { Draft } from "@/types/draft"
import type { ImprovementTask } from "@/types/improvement-task"
import type { PerformanceMetric } from "@/types/performance"
import type { PerformanceInsight } from "@/types/performance-insight"
import type { Product } from "@/types/product"
import type { Recommendation } from "@/types/recommendation"

const PRIORITY_ORDER: Record<ActionItemPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
}

const ACTION_SOURCES: ActionItemSource[] = [
  "data_quality",
  "improvement_task",
  "recommendation",
  "performance_insight",
  "draft",
  "product",
  "campaign_link",
]

export function normalizePriority(value: string): ActionItemPriority {
  switch (value) {
    case "critical":
      return "critical"
    case "high":
    case "warning":
      return "high"
    case "medium":
      return "medium"
    case "low":
      return "low"
    default:
      return "info"
  }
}

function normalizeTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function dedupeKey(item: ActionItem) {
  return [
    item.relatedEntityType,
    item.relatedEntityIdOrKey ?? "none",
    item.actionHref,
    normalizeTitle(item.title),
  ].join(":")
}

export function sortActionItems(items: ActionItem[]) {
  return [...items].sort((left, right) => {
    const priorityDiff = PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]
    if (priorityDiff !== 0) return priorityDiff

    const leftTime = left.detectedAt ? new Date(left.detectedAt).getTime() : 0
    const rightTime = right.detectedAt ? new Date(right.detectedAt).getTime() : 0
    if (leftTime !== rightTime) return leftTime - rightTime

    return left.title.localeCompare(right.title)
  })
}

export function dedupeActionItems(items: ActionItem[]) {
  const chosen = new Map<string, ActionItem>()

  for (const item of sortActionItems(items)) {
    const key = dedupeKey(item)
    if (!chosen.has(key)) {
      chosen.set(key, item)
    }
  }

  return sortActionItems([...chosen.values()])
}

function fromDataQuality(issue: DataQualityIssue): ActionItem {
  return {
    id: `data-quality:${issue.id}`,
    source: "data_quality",
    priority: normalizePriority(issue.severity),
    title: issue.title,
    description: issue.description,
    actionLabel: issue.actionLabel,
    actionHref: issue.actionHref,
    relatedEntityType: issue.relatedEntityType,
    relatedEntityIdOrKey: issue.relatedEntityId,
    detectedAt: null,
  }
}

function fromImprovementTask(task: ImprovementTask): ActionItem | null {
  if (task.status === "done" || task.status === "dismissed") return null

  return {
    id: `improvement-task:${task.id}`,
    source: "improvement_task",
    priority: normalizePriority(task.priority),
    title: task.title,
    description: task.description ?? "Open improvement task waiting for manual operator action.",
    actionLabel: task.suggestedAction ?? "Open improvement queue",
    actionHref: "/dashboard/improvements",
    relatedEntityType: task.contentDraftId ? "draft" : task.productId ? "product" : "improvement_task",
    relatedEntityIdOrKey: task.contentDraftId ?? task.productId ?? task.id,
    detectedAt: task.createdAt,
  }
}

function fromRecommendation(recommendation: Recommendation): ActionItem {
  return {
    id: `recommendation:${recommendation.id}`,
    source: "recommendation",
    priority: normalizePriority(recommendation.severity),
    title: recommendation.title,
    description: recommendation.description,
    actionLabel: recommendation.actionLabel,
    actionHref: recommendation.actionHref,
    relatedEntityType: recommendation.relatedEntityType,
    relatedEntityIdOrKey: recommendation.relatedEntityKey,
    detectedAt: null,
  }
}

function fromPerformanceInsight(insight: PerformanceInsight): ActionItem {
  return {
    id: `performance-insight:${insight.id}`,
    source: "performance_insight",
    priority: normalizePriority(insight.severity),
    title: insight.title,
    description: insight.description,
    actionLabel: insight.actionLabel,
    actionHref: insight.actionHref,
    relatedEntityType: insight.relatedEntityType,
    relatedEntityIdOrKey: insight.relatedEntityKey,
    detectedAt: null,
  }
}

function fromDraftNeedingReview(draft: Draft): ActionItem | null {
  if (draft.status !== "draft") return null

  return {
    id: `draft-review:${draft.id}`,
    source: "draft",
    priority: "high",
    title: `Review draft for ${draft.productName}`,
    description: "Draft is waiting for human approval or rejection.",
    actionLabel: "Review draft",
    actionHref: `/dashboard/drafts/${draft.id}/review`,
    relatedEntityType: "draft",
    relatedEntityIdOrKey: draft.id,
    detectedAt: draft.createdAt,
  }
}

function fromProductNeedingDraft(product: Product, drafts: Draft[]): ActionItem | null {
  if (product.status !== "active") return null
  if (drafts.some((draft) => draft.productId === product.id)) return null

  return {
    id: `product-needs-draft:${product.id}`,
    source: "product",
    priority: "high",
    title: `${product.name} needs a draft`,
    description: "Active product has no content drafts yet.",
    actionLabel: "Create manual draft",
    actionHref: "/dashboard/drafts/new",
    relatedEntityType: "product",
    relatedEntityIdOrKey: product.id,
    detectedAt: product.createdAt,
  }
}

function fromApprovedDraftNeedingPerformance(draft: Draft, records: PerformanceMetric[]): ActionItem | null {
  if (draft.status !== "approved") return null
  if (records.some((record) => record.draftId === draft.id)) return null

  return {
    id: `approved-draft-needs-performance:${draft.id}`,
    source: "draft",
    priority: "medium",
    title: `${draft.productName} approved draft needs performance data`,
    description: "Approved draft has no linked performance records yet.",
    actionLabel: "Record performance",
    actionHref: `/dashboard/performance?draftId=${draft.id}`,
    relatedEntityType: "draft",
    relatedEntityIdOrKey: draft.id,
    detectedAt: draft.updatedAt,
  }
}

function fromCampaignLinkWithoutPerformance(link: CampaignLink, records: PerformanceMetric[]): ActionItem | null {
  if (link.status !== "active") return null
  if (records.some((record) => record.campaignLinkId === link.id)) return null

  return {
    id: `campaign-link-no-performance:${link.id}`,
    source: "campaign_link",
    priority: "medium",
    title: `${link.name} has no performance data`,
    description: `Active campaign link for ${link.productName} has not been measured yet.`,
    actionLabel: "Record performance",
    actionHref: "/dashboard/performance#record-performance",
    relatedEntityType: "campaign_link",
    relatedEntityIdOrKey: link.id,
    detectedAt: link.createdAt,
  }
}

export function buildOperatorActionItems(params: {
  dataQualityIssues: DataQualityIssue[]
  improvementTasks: ImprovementTask[]
  recommendations: Recommendation[]
  performanceInsights: PerformanceInsight[]
  drafts: Draft[]
  products: Product[]
  campaignLinks: CampaignLink[]
  performanceMetrics: PerformanceMetric[]
  limit?: number
}): ActionItem[] {
  const items: ActionItem[] = [
    ...params.dataQualityIssues.map(fromDataQuality),
    ...params.improvementTasks.map(fromImprovementTask).filter((item): item is ActionItem => item !== null),
    ...params.recommendations.map(fromRecommendation),
    ...params.performanceInsights.map(fromPerformanceInsight),
    ...params.drafts.map(fromDraftNeedingReview).filter((item): item is ActionItem => item !== null),
    ...params.products.map((product) => fromProductNeedingDraft(product, params.drafts)).filter((item): item is ActionItem => item !== null),
    ...params.drafts.map((draft) => fromApprovedDraftNeedingPerformance(draft, params.performanceMetrics)).filter((item): item is ActionItem => item !== null),
    ...params.campaignLinks.map((link) => fromCampaignLinkWithoutPerformance(link, params.performanceMetrics)).filter((item): item is ActionItem => item !== null),
  ]

  const deduped = dedupeActionItems(items)
  return typeof params.limit === "number" ? deduped.slice(0, params.limit) : deduped
}

export function summarizeActionItems(items: ActionItem[]): OperatorActionSummary {
  const bySource = ACTION_SOURCES.reduce<Record<ActionItemSource, number>>(
    (summary, source) => {
      summary[source] = 0
      return summary
    },
    {} as Record<ActionItemSource, number>,
  )

  const summary: OperatorActionSummary = {
    total: 0,
    info: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
    bySource,
  }

  for (const item of items) {
    summary.total += 1
    summary[item.priority] += 1
    summary.bySource[item.source] += 1
  }

  return summary
}
