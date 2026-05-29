/**
 * Deterministic, read-only data quality checks.
 *
 * These helpers only derive issues from already persisted data. They never
 * mutate records, auto-fix content, approve drafts, queue jobs, or publish.
 */

import { isValidHttpUrl } from "@/lib/utm-builder"
import type { CampaignLink } from "@/types/campaign-link"
import type {
  DataQualityArea,
  DataQualityIssue,
  DataQualitySummary,
} from "@/types/data-quality"
import type { Draft } from "@/types/draft"
import type { ImprovementTask } from "@/types/improvement-task"
import type { PerformanceMetric } from "@/types/performance"
import type { Product } from "@/types/product"
import type { SavedView } from "@/types/saved-view"

const SEVERITY_ORDER: Record<DataQualityIssue["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

const DATA_QUALITY_AREAS: DataQualityArea[] = [
  "products",
  "drafts",
  "campaign_links",
  "performance",
  "improvements",
  "saved_views",
]

function slugKey(value: string) {
  return value.trim().toLowerCase()
}

function isSuspiciousSlug(value: string) {
  const trimmed = value.trim()
  return (
    trimmed.length === 0 ||
    trimmed.length > 96 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)
  )
}

function makeIssue(
  area: DataQualityArea,
  severity: DataQualityIssue["severity"],
  title: string,
  description: string,
  relatedEntityType: string,
  relatedEntityId: string,
  actionLabel: string,
  actionHref: string,
): DataQualityIssue {
  return {
    id: `${area}:${relatedEntityType}:${relatedEntityId}:${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    area,
    severity,
    title,
    description,
    relatedEntityType,
    relatedEntityId,
    actionLabel,
    actionHref,
  }
}

function qualityScore(draft: Draft) {
  const qc = draft.qualityChecks
  return [
    qc.has_disclosure,
    qc.has_clear_cta,
    qc.has_target_keyword,
    qc.has_meta_title,
    qc.has_meta_description,
    qc.avoids_fake_claims,
    qc.has_required_structure,
  ].filter(Boolean).length
}

export function checkProducts(params: {
  products: Product[]
  drafts: Draft[]
  campaignLinks: CampaignLink[]
}): DataQualityIssue[] {
  const { products, drafts, campaignLinks } = params
  const issues: DataQualityIssue[] = []

  const draftsByProduct = new Map<string, Draft[]>()
  for (const draft of drafts) {
    const list = draftsByProduct.get(draft.productId) ?? []
    list.push(draft)
    draftsByProduct.set(draft.productId, list)
  }

  const linksByProduct = new Map<string, CampaignLink[]>()
  for (const link of campaignLinks) {
    const list = linksByProduct.get(link.productId) ?? []
    list.push(link)
    linksByProduct.set(link.productId, list)
  }

  const productsBySlug = new Map<string, Product[]>()
  for (const product of products) {
    const key = slugKey(product.slug)
    const list = productsBySlug.get(key) ?? []
    list.push(product)
    productsBySlug.set(key, list)
  }

  for (const duplicateProducts of productsBySlug.values()) {
    if (duplicateProducts.length > 1) {
      const slug = duplicateProducts[0]?.slug ?? "unknown"
      issues.push(
        makeIssue(
          "products",
          "critical",
          `Duplicate product slug "${slug}"`,
          `Slug "${slug}" appears on ${duplicateProducts.length} products. Product slugs should be unique for routing, reports, and imports.`,
          "product_slug",
          slugKey(slug),
          "Review products",
          "/dashboard/products",
        ),
      )
    }
  }

  for (const product of products) {
    const href = `/dashboard/products/${product.id}`
    const productDrafts = draftsByProduct.get(product.id) ?? []
    const productLinks = linksByProduct.get(product.id) ?? []

    if (!product.affiliateUrl) {
      issues.push(
        makeIssue(
          "products",
          "critical",
          `"${product.name}" missing affiliate URL`,
          "Product has no affiliate URL configured.",
          "product",
          product.id,
          "Open product workspace",
          href,
        ),
      )
    } else if (!isValidHttpUrl(product.affiliateUrl)) {
      issues.push(
        makeIssue(
          "products",
          "warning",
          `"${product.name}" has invalid affiliate URL`,
          `Affiliate URL "${product.affiliateUrl}" is not a valid HTTP/HTTPS URL.`,
          "product",
          product.id,
          "Open product workspace",
          href,
        ),
      )
    }

    if (isSuspiciousSlug(product.slug)) {
      issues.push(
        makeIssue(
          "products",
          "warning",
          `"${product.name}" has suspicious slug`,
          `Slug "${product.slug}" does not match the expected lowercase hyphenated format.`,
          "product",
          product.id,
          "Open product workspace",
          href,
        ),
      )
    }

    if (!product.targetKeyword) {
      issues.push(
        makeIssue(
          "products",
          "info",
          `"${product.name}" missing target keyword`,
          "Product has no target keyword for SEO-driven content planning.",
          "product",
          product.id,
          "Open product workspace",
          href,
        ),
      )
    }

    if (!product.category) {
      issues.push(
        makeIssue(
          "products",
          "info",
          `"${product.name}" missing category`,
          "Product has no category assigned, which weakens reporting and workflow filters.",
          "product",
          product.id,
          "Open product workspace",
          href,
        ),
      )
    }

    if (productDrafts.length === 0) {
      issues.push(
        makeIssue(
          "products",
          "warning",
          `"${product.name}" has no drafts`,
          "Product has no content drafts created yet.",
          "product",
          product.id,
          "Create manual draft",
          "/dashboard/drafts/new",
        ),
      )
    }

    if (product.status === "active" && productLinks.length === 0) {
      issues.push(
        makeIssue(
          "products",
          "info",
          `"${product.name}" has no campaign links`,
          "Active product has no campaign links for tracking.",
          "product",
          product.id,
          "Create campaign link",
          "/dashboard/campaign-links#create-campaign-link",
        ),
      )
    }

    if (product.status === "inactive") {
      const activeLinks = productLinks.filter((link) => link.status === "active")
      if (activeLinks.length > 0) {
        issues.push(
          makeIssue(
            "products",
            "warning",
            `"${product.name}" is inactive but has active campaign links`,
            `Inactive product still has ${activeLinks.length} active campaign link${activeLinks.length === 1 ? "" : "s"} that may keep sending traffic.`,
            "product",
            product.id,
            "Open product workspace",
            href,
          ),
        )
      }
    }
  }

  return issues
}

export function checkDrafts(params: {
  drafts: Draft[]
  versionCounts: Map<string, number>
}): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []

  for (const draft of params.drafts) {
    const reviewHref = `/dashboard/drafts/${draft.id}/review`
    const editHref = `/dashboard/drafts/${draft.id}/edit`
    const displayTitle = draft.title || draft.productName

    if (!draft.title?.trim()) {
      issues.push(
        makeIssue(
          "drafts",
          "warning",
          `Draft for "${draft.productName}" missing title`,
          "Draft has no title set.",
          "draft",
          draft.id,
          "Edit draft",
          editHref,
        ),
      )
    }

    if (!draft.body || draft.body.trim().length < 10) {
      issues.push(
        makeIssue(
          "drafts",
          "critical",
          `Draft for "${draft.productName}" missing body`,
          "Draft body is empty or too short for review.",
          "draft",
          draft.id,
          "Edit draft",
          editHref,
        ),
      )
    }

    if (draft.status === "approved") {
      const passed = qualityScore(draft)

      if (passed < 5) {
        issues.push(
          makeIssue(
            "drafts",
            "warning",
            `Approved draft "${displayTitle}" has weak quality checks`,
            `Approved draft passed ${passed} of 7 quality checks.`,
            "draft",
            draft.id,
            "Review draft",
            reviewHref,
          ),
        )
      }

      if (!draft.metaTitle?.trim() || !draft.qualityChecks.has_meta_title) {
        issues.push(
          makeIssue(
            "drafts",
            "info",
            `Approved draft "${displayTitle}" missing meta title`,
            "Meta title is empty or failed the quality checklist for an approved draft.",
            "draft",
            draft.id,
            "Edit draft",
            editHref,
          ),
        )
      }

      if (!draft.metaDescription?.trim() || !draft.qualityChecks.has_meta_description) {
        issues.push(
          makeIssue(
            "drafts",
            "info",
            `Approved draft "${displayTitle}" missing meta description`,
            "Meta description is empty or failed the quality checklist for an approved draft.",
            "draft",
            draft.id,
            "Edit draft",
            editHref,
          ),
        )
      }
    }

    if ((params.versionCounts.get(draft.id) ?? 0) === 0) {
      issues.push(
        makeIssue(
          "drafts",
          "info",
          `Draft "${displayTitle}" has no saved versions`,
          "Draft has no version history yet.",
          "draft",
          draft.id,
          "Edit draft",
          editHref,
        ),
      )
    }

    if (draft.status === "rejected" && !draft.approvalNotes?.trim()) {
      issues.push(
        makeIssue(
          "drafts",
          "info",
          `Rejected draft "${displayTitle}" has no rejection notes`,
          "Rejection reason was not documented.",
          "draft",
          draft.id,
          "Review draft",
          reviewHref,
        ),
      )
    }
  }

  return issues
}

export function checkCampaignLinks(params: {
  campaignLinks: CampaignLink[]
  performanceMetrics: PerformanceMetric[]
  now?: Date
}): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []
  const now = params.now ?? new Date()

  const performanceByLink = new Map<string, PerformanceMetric[]>()
  for (const metric of params.performanceMetrics) {
    if (!metric.campaignLinkId) continue
    const list = performanceByLink.get(metric.campaignLinkId) ?? []
    list.push(metric)
    performanceByLink.set(metric.campaignLinkId, list)
  }

  for (const link of params.campaignLinks) {
    const href = "/dashboard/campaign-links"

    if (!isValidHttpUrl(link.finalUrl)) {
      issues.push(
        makeIssue(
          "campaign_links",
          "critical",
          `"${link.name}" has invalid final URL`,
          `Final URL "${link.finalUrl}" is not a valid HTTP/HTTPS URL.`,
          "campaign_link",
          link.id,
          "View campaign links",
          href,
        ),
      )
    }

    if (!link.source?.trim()) {
      issues.push(
        makeIssue(
          "campaign_links",
          "warning",
          `"${link.name}" missing UTM source`,
          "Campaign link has no utm_source value.",
          "campaign_link",
          link.id,
          "View campaign links",
          href,
        ),
      )
    }

    if (!link.medium?.trim()) {
      issues.push(
        makeIssue(
          "campaign_links",
          "info",
          `"${link.name}" missing UTM medium`,
          "Campaign link has no utm_medium value.",
          "campaign_link",
          link.id,
          "View campaign links",
          href,
        ),
      )
    }

    if (!link.campaignName?.trim()) {
      issues.push(
        makeIssue(
          "campaign_links",
          "info",
          `"${link.name}" missing UTM campaign`,
          "Campaign link has no campaign name value.",
          "campaign_link",
          link.id,
          "View campaign links",
          href,
        ),
      )
    }

    const linkedPerformance = performanceByLink.get(link.id) ?? []
    if (link.status === "active" && linkedPerformance.length === 0) {
      issues.push(
        makeIssue(
          "campaign_links",
          "info",
          `"${link.name}" has no performance records`,
          "Active campaign link has no linked performance data.",
          "campaign_link",
          link.id,
          "Record performance",
          "/dashboard/performance#record-performance",
        ),
      )
    }

    if (link.status === "archived") {
      const archivedAt = new Date(link.updatedAt)
      const recentRecords = linkedPerformance.filter((metric) => {
        const recordedAt = new Date(metric.recordedAt)
        return (
          Number.isFinite(recordedAt.getTime()) &&
          Number.isFinite(archivedAt.getTime()) &&
          recordedAt > archivedAt &&
          recordedAt <= now
        )
      })

      if (recentRecords.length > 0) {
        issues.push(
          makeIssue(
            "campaign_links",
            "warning",
            `"${link.name}" is archived but has newer performance records`,
            `Archived campaign link is referenced by ${recentRecords.length} performance record${recentRecords.length === 1 ? "" : "s"} recorded after its last update.`,
            "campaign_link",
            link.id,
            "View campaign links",
            href,
          ),
        )
      }
    }
  }

  return issues
}

export function checkPerformance(params: {
  performanceMetrics: PerformanceMetric[]
  productIds?: Set<string>
  now?: Date
}): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []
  const now = params.now ?? new Date()

  for (const metric of params.performanceMetrics) {
    const href = metric.productId ? `/dashboard/products/${metric.productId}` : "/dashboard/performance"
    const label = `${metric.productName || "Unknown product"} (${metric.channel || "missing channel"})`

    if (!metric.productId || (params.productIds && !params.productIds.has(metric.productId))) {
      issues.push(
        makeIssue(
          "performance",
          "critical",
          `"${label}" has no valid product`,
          "Performance record is not linked to an existing product.",
          "performance",
          metric.id,
          "View performance",
          "/dashboard/performance",
        ),
      )
    }

    if (metric.conversions !== null && metric.clicks < metric.conversions) {
      issues.push(
        makeIssue(
          "performance",
          "critical",
          `"${label}" clicks are lower than conversions`,
          `Record has ${metric.clicks} clicks but ${metric.conversions} conversions.`,
          "performance",
          metric.id,
          "View product workspace",
          href,
        ),
      )
    }

    if (metric.conversions !== null && metric.conversions > 0 && (metric.revenue === null || metric.revenue === 0)) {
      issues.push(
        makeIssue(
          "performance",
          "warning",
          `"${label}" has conversions but no revenue`,
          `Record has ${metric.conversions} conversions but no revenue.`,
          "performance",
          metric.id,
          "View product workspace",
          href,
        ),
      )
    }

    if (metric.revenue !== null && metric.revenue > 0 && (metric.conversions === null || metric.conversions === 0)) {
      issues.push(
        makeIssue(
          "performance",
          "warning",
          `"${label}" has revenue but no conversions`,
          `Record has $${metric.revenue.toFixed(2)} revenue but no conversions.`,
          "performance",
          metric.id,
          "View product workspace",
          href,
        ),
      )
    }

    if (metric.clicks < 0 || (metric.conversions !== null && metric.conversions < 0) || (metric.revenue !== null && metric.revenue < 0)) {
      issues.push(
        makeIssue(
          "performance",
          "critical",
          `"${label}" has negative values`,
          "Performance record contains negative clicks, conversions, or revenue.",
          "performance",
          metric.id,
          "View performance",
          "/dashboard/performance",
        ),
      )
    }

    if (!metric.channel?.trim()) {
      issues.push(
        makeIssue(
          "performance",
          "warning",
          "Performance record missing channel",
          "A performance record has no channel value.",
          "performance",
          metric.id,
          "View performance",
          "/dashboard/performance",
        ),
      )
    }

    if (!metric.campaignName?.trim()) {
      issues.push(
        makeIssue(
          "performance",
          "info",
          `"${label}" missing campaign name`,
          "Performance record has no campaign name.",
          "performance",
          metric.id,
          "View product workspace",
          href,
        ),
      )
    }

    const recordedAt = new Date(metric.recordedAt)
    if (Number.isFinite(recordedAt.getTime()) && recordedAt.getTime() > now.getTime()) {
      issues.push(
        makeIssue(
          "performance",
          "warning",
          `"${label}" has future recorded date`,
          `Record date ${metric.recordedAt.split("T")[0]} is in the future.`,
          "performance",
          metric.id,
          "View product workspace",
          href,
        ),
      )
    }
  }

  return issues
}

export function checkImprovementTasks(params: {
  tasks: ImprovementTask[]
  now?: Date
}): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []
  const now = params.now ?? new Date()

  for (const task of params.tasks) {
    const href = "/dashboard/improvements"

    if (task.status === "open" && task.priority === "critical") {
      const ageDays = Math.floor(
        (now.getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      )

      if (ageDays > 7) {
        issues.push(
          makeIssue(
            "improvements",
            "warning",
            `Critical task "${task.title}" is open too long`,
            `Critical task has been open for ${ageDays} days.`,
            "improvement_task",
            task.id,
            "Open improvement queue",
            href,
          ),
        )
      }
    }

    if (task.status === "in_progress") {
      const staleDays = Math.floor(
        (now.getTime() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
      )

      if (staleDays > 30) {
        issues.push(
          makeIssue(
            "improvements",
            "info",
            `In-progress task "${task.title}" is stale`,
            `Task has been in progress without updates for ${staleDays} days.`,
            "improvement_task",
            task.id,
            "Open improvement queue",
            href,
          ),
        )
      }
    }

    if (!task.productId && !task.contentDraftId) {
      issues.push(
        makeIssue(
          "improvements",
          "info",
          `Task "${task.title}" is not linked to product or draft`,
          "Improvement task has no associated product or draft.",
          "improvement_task",
          task.id,
          "Open improvement queue",
          href,
        ),
      )
    }

    if (task.status === "done" && !task.suggestedAction?.trim()) {
      issues.push(
        makeIssue(
          "improvements",
          "info",
          `Done task "${task.title}" has no suggested action`,
          "Completed task has no suggested action preserved for audit context.",
          "improvement_task",
          task.id,
          "Open improvement queue",
          href,
        ),
      )
    }
  }

  return issues
}

export function checkSavedViews(params: {
  savedViews: SavedView[]
}): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []
  const validTypes = ["products", "drafts", "performance", "campaign_links", "improvements", "reports"]

  const defaultsByType = new Map<string, SavedView[]>()
  for (const view of params.savedViews) {
    if (!view.isDefault) continue
    const list = defaultsByType.get(view.viewType) ?? []
    list.push(view)
    defaultsByType.set(view.viewType, list)
  }

  for (const [viewType, defaults] of defaultsByType) {
    if (defaults.length > 1) {
      issues.push(
        makeIssue(
          "saved_views",
          "warning",
          `${defaults.length} default saved views for "${viewType}"`,
          "Only one default saved view per view type is expected.",
          "saved_view_type",
          viewType,
          "Manage saved views",
          "/dashboard/saved-views",
        ),
      )
    }
  }

  for (const view of params.savedViews) {
    if (!validTypes.includes(view.viewType)) {
      issues.push(
        makeIssue(
          "saved_views",
          "warning",
          `Saved view "${view.name}" has unsupported type`,
          `View type "${view.viewType}" is not recognized by the app.`,
          "saved_view",
          view.id,
          "Manage saved views",
          "/dashboard/saved-views",
        ),
      )
    }

    if (typeof view.filters !== "object" || view.filters === null || Array.isArray(view.filters)) {
      issues.push(
        makeIssue(
          "saved_views",
          "warning",
          `Saved view "${view.name}" has invalid filters`,
          "Filters should be a JSON object with string key-value pairs.",
          "saved_view",
          view.id,
          "Manage saved views",
          "/dashboard/saved-views",
        ),
      )
      continue
    }

    const invalidFilterValue = Object.values(view.filters).some((value) => typeof value !== "string")
    if (invalidFilterValue) {
      issues.push(
        makeIssue(
          "saved_views",
          "warning",
          `Saved view "${view.name}" has non-string filter values`,
          "Saved view filters should contain string values so they can be restored into URL query parameters.",
          "saved_view",
          view.id,
          "Manage saved views",
          "/dashboard/saved-views",
        ),
      )
    }
  }

  return issues
}

export interface DataQualityInput {
  products: Product[]
  drafts: Draft[]
  versionCounts: Map<string, number>
  campaignLinks: CampaignLink[]
  performanceMetrics: PerformanceMetric[]
  improvementTasks: ImprovementTask[]
  savedViews: SavedView[]
  now?: Date
}

export function buildDataQualityIssues(input: DataQualityInput): DataQualityIssue[] {
  const productIds = new Set(input.products.map((product) => product.id))
  const issues: DataQualityIssue[] = [
    ...checkProducts({
      products: input.products,
      drafts: input.drafts,
      campaignLinks: input.campaignLinks,
    }),
    ...checkDrafts({
      drafts: input.drafts,
      versionCounts: input.versionCounts,
    }),
    ...checkCampaignLinks({
      campaignLinks: input.campaignLinks,
      performanceMetrics: input.performanceMetrics,
      now: input.now,
    }),
    ...checkPerformance({
      performanceMetrics: input.performanceMetrics,
      productIds,
      now: input.now,
    }),
    ...checkImprovementTasks({
      tasks: input.improvementTasks,
      now: input.now,
    }),
    ...checkSavedViews({
      savedViews: input.savedViews,
    }),
  ]

  return sortDataQualityIssues(issues)
}

export function sortDataQualityIssues(issues: DataQualityIssue[]) {
  return [...issues].sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (severityDiff !== 0) return severityDiff

    const areaDiff = a.area.localeCompare(b.area)
    if (areaDiff !== 0) return areaDiff

    return a.title.localeCompare(b.title)
  })
}

export function summarizeDataQuality(issues: DataQualityIssue[]): DataQualitySummary {
  const byArea = DATA_QUALITY_AREAS.reduce<Record<DataQualityArea, number>>(
    (summary, area) => {
      summary[area] = 0
      return summary
    },
    {} as Record<DataQualityArea, number>,
  )

  let critical = 0
  let warning = 0
  let info = 0

  for (const issue of issues) {
    byArea[issue.area] += 1
    if (issue.severity === "critical") critical += 1
    else if (issue.severity === "warning") warning += 1
    else info += 1
  }

  return {
    total: issues.length,
    critical,
    warning,
    info,
    byArea,
  }
}
