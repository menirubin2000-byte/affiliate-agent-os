import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import { buildOperatorActionItems, summarizeActionItems } from "@/lib/action-items"
import { getSupabaseReadiness } from "@/lib/env"
import { buildPostApprovalFingerprint, isPublishApprovalType } from "@/lib/approval-identity"
import { buildDataQualityIssues, summarizeDataQuality } from "@/lib/data-quality"
import { assertDraftStatusTransition, assertPublishingEligibility } from "@/lib/publishing-rules"
import { buildPerformanceInsights, buildProductPerformanceSignal } from "@/lib/performance-insights"
import { sortRecommendations, summarizeRecommendations } from "@/lib/recommendations"
import { slugify } from "@/lib/utils"
import {
  buildNextAction,
  countPassedQualityChecks,
  deriveDraftWorkflow,
  deriveProductWorkflow,
  summarizeQualityIssues,
} from "@/lib/workflow"
import type {
  ContentType,
  Draft,
  DraftCreateInput,
  DraftStatus,
  QualityChecks,
  TemplateType,
} from "@/types/draft"
import type { DraftChangeSource, DraftVersion } from "@/types/draft-version"
import type { PerformanceInsight, ProductPerformanceSignal } from "@/types/performance-insight"
import type {
  CreateImprovementTaskInput,
  ImprovementTask,
  ImprovementTaskPriority,
  ImprovementTaskStatus,
  ImprovementTaskSummary,
} from "@/types/improvement-task"
import type {
  PublishingJob,
  PublishingJobStatus,
  PublishingTargetPlatform,
} from "@/types/publishing"
import type {
  CreatePerformanceMetricInput,
  PerformanceChannelSummary,
  PerformanceMetric,
  PerformanceProductSummary,
  PerformanceSummary,
} from "@/types/performance"
import type {
  Recommendation,
  RecommendationType,
} from "@/types/recommendation"
import type { DashboardNeedsAttention, DashboardSummary } from "@/types/dashboard"
import type {
  Campaign,
  CampaignStatus,
  CampaignSummary,
  CreateCampaignInput,
} from "@/types/campaign"
import { buildCampaignTrackingUrl } from "@/lib/utm-builder"
import type { DataQualityIssue, DataQualitySummary } from "@/types/data-quality"
import type { ActionItem, OperatorActionSummary } from "@/types/action-item"
import type {
  CampaignLink,
  CampaignLinkStatus,
  CampaignLinkSummary,
  CreateCampaignLinkInput,
} from "@/types/campaign-link"
import type {
  AffiliateProgram,
  AffiliateProgramApprovalType,
  AffiliateProgramStatus,
  AffiliateProgramSummary,
  CreateAffiliateProgramInput,
} from "@/types/affiliate-program"
import type {
  ApprovalItem,
  ApprovalItemStatus,
  ApprovalItemSummary,
  ApprovalItemType,
  CreateApprovalItemInput,
} from "@/types/approval-item"
import type { CreateProductInput, Product } from "@/types/product"
import type {
  CreateSavedViewInput,
  SavedView,
  SavedViewType,
} from "@/types/saved-view"
import type {
  DraftPublishingState,
  DraftWorkflowItem,
  NextAction,
  PerformanceWorkflowRecord,
  ProductWorkflowItem,
  PublishingWorkflowItem,
  WorkflowLabel,
} from "@/types/workflow"

interface ProductRow {
  id: string
  name: string
  slug: string
  brand: string | null
  category: string | null
  affiliate_link?: string | null
  affiliate_url: string
  price: number | string | null
  commission_rate: number | string | null
  notes: string | null
  target_keyword: string | null
  secondary_keywords: string[] | null
  search_intent: string | null
  content_angle: string | null
  status: Product["status"]
  created_at: string
  updated_at: string
}

interface DraftRow {
  id: string
  product_id: string
  content_type: ContentType
  template_type: TemplateType
  title: string | null
  body: string
  meta_title: string | null
  meta_description: string | null
  target_keyword: string | null
  quality_checks: QualityChecks | null
  status: DraftStatus
  ai_model: string | null
  approval_notes: string | null
  created_at: string
  updated_at: string
  campaign_id: string | null
  products?: { name: string; slug: string } | Array<{ name: string; slug: string }> | null
}

interface PublishingJobRow {
  id: string
  content_draft_id: string
  target_platform: PublishingTargetPlatform
  status: PublishingJobStatus
  published_url: string | null
  external_post_id: string | null
  wordpress_post_id: string | null
  wordpress_post_url: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  content_drafts?:
    | {
        title: string | null
        status: DraftStatus
        template_type: TemplateType
        product_id: string
        products?: { name: string; slug: string } | Array<{ name: string; slug: string }> | null
      }
    | Array<{
        title: string | null
        status: DraftStatus
        template_type: TemplateType
        product_id: string
        products?: { name: string; slug: string } | Array<{ name: string; slug: string }> | null
      }>
    | null
}

interface PerformanceMetricRow {
  id: string
  product_id: string
  draft_id: string | null
  campaign_link_id: string | null
  channel: string
  campaign_name: string | null
  clicks: number | string
  conversions: number | string | null
  revenue: number | string | null
  notes: string | null
  recorded_at: string
  created_at: string
  products?: { name: string; slug: string } | Array<{ name: string; slug: string }> | null
  content_drafts?:
    | { title: string | null; template_type: TemplateType | null }
    | Array<{ title: string | null; template_type: TemplateType | null }>
    | null
}

interface CampaignLinkRow {
  id: string
  product_id: string
  name: string
  channel: string
  campaign_name: string | null
  source: string | null
  medium: string | null
  term: string | null
  content: string | null
  base_url: string
  final_url: string
  notes: string | null
  status: CampaignLinkStatus
  created_at: string
  updated_at: string
  products?: { name: string } | Array<{ name: string }> | null
}

function mapCampaignLink(row: CampaignLinkRow): CampaignLink {
  const productRecord = Array.isArray(row.products) ? row.products[0] : row.products
  return {
    id: row.id,
    productId: row.product_id,
    productName: productRecord?.name ?? "Unknown product",
    name: row.name,
    channel: row.channel,
    campaignName: row.campaign_name,
    source: row.source,
    medium: row.medium,
    term: row.term,
    content: row.content,
    baseUrl: row.base_url,
    finalUrl: row.final_url,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface DraftVersionRow {
  id: string
  content_draft_id: string
  version_number: number
  title: string | null
  body: string
  meta_title: string | null
  meta_description: string | null
  target_keyword: string | null
  quality_checks: QualityChecks | null
  change_source: DraftChangeSource
  change_notes: string | null
  created_at: string
}

function mapDraftVersion(row: DraftVersionRow): DraftVersion {
  return {
    id: row.id,
    contentDraftId: row.content_draft_id,
    versionNumber: row.version_number,
    title: row.title,
    body: row.body,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    targetKeyword: row.target_keyword,
    qualityChecks: row.quality_checks ?? {
      has_disclosure: false,
      has_clear_cta: false,
      has_target_keyword: false,
      has_meta_title: false,
      has_meta_description: false,
      avoids_fake_claims: false,
      has_required_structure: false,
    },
    changeSource: row.change_source,
    changeNotes: row.change_notes,
    createdAt: row.created_at,
  }
}

function toNullableNumber(value: number | string | null) {
  if (value === null) {
    return null
  }

  if (typeof value === "number") {
    return value
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brand,
    category: row.category,
    affiliateLink: row.affiliate_link ?? row.affiliate_url,
    affiliateUrl: row.affiliate_url,
    price: toNullableNumber(row.price),
    commissionRate: toNullableNumber(row.commission_rate),
    notes: row.notes,
    targetKeyword: row.target_keyword,
    secondaryKeywords: row.secondary_keywords ?? [],
    searchIntent: row.search_intent,
    contentAngle: row.content_angle,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapDraft(row: DraftRow): Draft {
  const productRecord = Array.isArray(row.products) ? row.products[0] : row.products

  return {
    id: row.id,
    productId: row.product_id,
    productName: productRecord?.name ?? "Unknown product",
    productSlug: productRecord?.slug ?? "unknown-product",
    contentType: row.content_type,
    templateType: row.template_type,
    title: row.title,
    body: row.body,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    targetKeyword: row.target_keyword,
    qualityChecks: row.quality_checks ?? {
      has_disclosure: false,
      has_clear_cta: false,
      has_target_keyword: false,
      has_meta_title: false,
      has_meta_description: false,
      avoids_fake_claims: false,
      has_required_structure: false,
    },
    status: row.status,
    campaignId: row.campaign_id,
    aiModel: row.ai_model,
    approvalNotes: row.approval_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapPublishingJob(row: PublishingJobRow): PublishingJob {
  const draftRecord = Array.isArray(row.content_drafts)
    ? row.content_drafts[0]
    : row.content_drafts
  const productRecord = Array.isArray(draftRecord?.products)
    ? draftRecord?.products[0]
    : draftRecord?.products

  return {
    id: row.id,
    contentDraftId: row.content_draft_id,
    productId: draftRecord?.product_id ?? "",
    draftTitle: draftRecord?.title ?? null,
    draftStatus: draftRecord?.status ?? "draft",
    templateType: draftRecord?.template_type ?? "review",
    productName: productRecord?.name ?? "Unknown product",
    productSlug: productRecord?.slug ?? "unknown-product",
    targetPlatform: row.target_platform,
    status: row.status,
    publishedUrl: row.published_url ?? row.wordpress_post_url ?? null,
    externalPostId: row.external_post_id ?? row.wordpress_post_id ?? null,
    wordpressPostId: row.wordpress_post_id,
    wordpressPostUrl: row.wordpress_post_url,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapPerformanceMetric(row: PerformanceMetricRow): PerformanceMetric {
  const productRecord = Array.isArray(row.products) ? row.products[0] : row.products
  const draftRecord = Array.isArray(row.content_drafts)
    ? row.content_drafts[0]
    : row.content_drafts

  return {
    id: row.id,
    productId: row.product_id,
    productName: productRecord?.name ?? "Unknown product",
    productSlug: productRecord?.slug ?? "unknown-product",
    draftId: row.draft_id,
    draftTitle: draftRecord?.title ?? null,
    draftTemplateType: draftRecord?.template_type ?? null,
    campaignLinkId: row.campaign_link_id ?? null,
    channel: row.channel,
    campaignName: row.campaign_name,
    clicks: toNullableNumber(row.clicks) ?? 0,
    conversions: toNullableNumber(row.conversions),
    revenue: toNullableNumber(row.revenue),
    notes: row.notes,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
  }
}

function getPublishingWorkflow(
  job: PublishingJob,
  performanceByDraftId: Map<string, PerformanceMetric[]>,
): {
  workflowLabel: WorkflowLabel
  nextAction: NextAction
  signals: string[]
} {
  const hasPerformanceData = (performanceByDraftId.get(job.contentDraftId) ?? []).length > 0
  const signals: string[] = []

  if (job.errorMessage) signals.push("Retry ready")
  if (hasPerformanceData) signals.push("Performance tracked")

  if (job.status === "failed") {
    return {
      workflowLabel: "wordpress_failed",
      nextAction: buildNextAction("Investigate failed publishing job", "/dashboard/publishing"),
      signals,
    }
  }

  if (job.status === "pending") {
    return {
      workflowLabel: "queued_to_wordpress",
      nextAction: buildNextAction("Monitor publishing queue", "/dashboard/publishing"),
      signals,
    }
  }

  if ((job.status === "sent" || job.status === "sent_to_wordpress") && !hasPerformanceData) {
    return {
      workflowLabel: "published_draft_pending_performance",
      nextAction: buildNextAction("Add performance record", "/dashboard/performance"),
      signals,
    }
  }

  return {
    workflowLabel: "performance_tracked",
    nextAction: buildNextAction("Review performance", "/dashboard/performance"),
    signals,
  }
}

function getPerformanceWorkflow(
  record: PerformanceMetric,
  latestDraftByProductId: Map<string, Draft>,
): {
  nextAction: NextAction
  signals: string[]
  isMissingConversions: boolean
  isStale: boolean
} {
  const isMissingConversions = record.clicks > 0 && (record.conversions ?? 0) === 0
  const isStale =
    (Date.now() - new Date(record.recordedAt).getTime()) / (1000 * 60 * 60 * 24) > 30
  const latestDraft = latestDraftByProductId.get(record.productId)
  const hasNewerDraft =
    latestDraft &&
    new Date(latestDraft.updatedAt).getTime() > new Date(record.recordedAt).getTime()
  const signals: string[] = []

  if (isMissingConversions) signals.push("No conversions")
  if (isStale) signals.push("Record is stale")
  if (!hasNewerDraft) signals.push("No newer draft iteration")

  if (isMissingConversions) {
    return {
      nextAction: buildNextAction(
        "Refresh content for low-performing product",
        `/dashboard/drafts?product=${encodeURIComponent(record.productId)}`,
      ),
      signals,
      isMissingConversions,
      isStale,
    }
  }

  if (isStale) {
    return {
      nextAction: buildNextAction("Add performance record", "/dashboard/performance"),
      signals,
      isMissingConversions,
      isStale,
    }
  }

  return {
    nextAction: buildNextAction("Review product workflow", "/dashboard/products"),
    signals,
    isMissingConversions,
    isStale,
  }
}

const performanceRecommendationTypes = new Set<RecommendationType>([
  "approved_draft_no_performance",
  "product_low_click_volume",
  "channel_low_click_volume",
  "template_underperforming",
  "product_no_newer_draft_iteration",
  "product_clicks_no_conversions",
  "product_no_recent_records",
])

async function computeRecommendations() {
  if (!isSupabaseConfigured()) {
    return []
  }

  const [products, drafts, publishingJobs, performanceRecords] = await Promise.all([
    listProducts(),
    listDrafts(),
    getPublishingJobs(),
    listPerformanceMetrics(),
  ])

  const recommendations: Recommendation[] = []
  const draftsByProductId = new Map<string, Draft[]>()
  const publishingJobsByDraftId = new Map<string, PublishingJob[]>()
  const performanceByProductId = new Map<string, PerformanceMetric[]>()
  const performanceByDraftId = new Map<string, PerformanceMetric[]>()
  const latestDraftByProductId = new Map<string, Draft>()

  for (const draft of drafts) {
    const productDrafts = draftsByProductId.get(draft.productId) ?? []
    productDrafts.push(draft)
    draftsByProductId.set(draft.productId, productDrafts)

    const latestDraft = latestDraftByProductId.get(draft.productId)
    if (!latestDraft || new Date(draft.updatedAt).getTime() > new Date(latestDraft.updatedAt).getTime()) {
      latestDraftByProductId.set(draft.productId, draft)
    }
  }

  for (const job of publishingJobs) {
    const draftJobs = publishingJobsByDraftId.get(job.contentDraftId) ?? []
    draftJobs.push(job)
    publishingJobsByDraftId.set(job.contentDraftId, draftJobs)
  }

  for (const record of performanceRecords) {
    const productRecords = performanceByProductId.get(record.productId) ?? []
    productRecords.push(record)
    performanceByProductId.set(record.productId, productRecords)

    if (record.draftId) {
      const draftRecords = performanceByDraftId.get(record.draftId) ?? []
      draftRecords.push(record)
      performanceByDraftId.set(record.draftId, draftRecords)
    }
  }

  for (const product of products) {
    const productDrafts = draftsByProductId.get(product.id) ?? []
    if (productDrafts.length === 0) {
      recommendations.push({
        id: `product-no-drafts:${product.id}`,
        type: "product_no_drafts",
        severity: "warning",
        title: `${product.name} has no drafts yet`,
        description: "This product is in the catalog but has not entered the draft workflow.",
        relatedEntityType: "product",
        relatedEntityKey: product.id,
        actionLabel: "Open products",
        actionHref: "/dashboard/products",
      })
    }

    const hasOnlySocialDrafts =
      productDrafts.length > 0 &&
      productDrafts.every((draft) => draft.templateType === "social_post")

    if (hasOnlySocialDrafts) {
      recommendations.push({
        id: `social-only-coverage:${product.id}`,
        type: "social_only_coverage",
        severity: "info",
        title: `${product.name} only has social coverage`,
        description:
          "This product has social post drafts but no long-form review, comparison, or buying guide draft.",
        relatedEntityType: "product",
        relatedEntityKey: product.id,
        actionLabel: "Review drafts",
        actionHref: "/dashboard/drafts",
      })
    }
  }

  for (const draft of drafts) {
    if (draft.status === "approved" && !publishingJobsByDraftId.has(draft.id)) {
      recommendations.push({
        id: `approved-no-publishing-job:${draft.id}`,
        type: "approved_draft_no_publishing_job",
        severity: "warning",
        title: `${draft.productName} approved draft is not queued`,
        description:
          "This approved draft is not queued for any target platform yet.",
        relatedEntityType: "draft",
        relatedEntityKey: draft.id,
        actionLabel: "Open publishing queue",
        actionHref: "/dashboard/publishing",
      })
    }

    if (draft.status === "approved" && !performanceByDraftId.has(draft.id)) {
      recommendations.push({
        id: `approved-no-performance:${draft.id}`,
        type: "approved_draft_no_performance",
        severity: "info",
        title: `${draft.productName} approved draft has no performance data`,
        description:
          "This approved draft has no linked performance record yet, so there is no outcome signal to compare.",
        relatedEntityType: "draft",
        relatedEntityKey: draft.id,
        actionLabel: "Open performance",
        actionHref: "/dashboard/performance",
      })
    }

    const qualityIssues = summarizeQualityIssues(draft.qualityChecks)
    const passedChecks = countPassedQualityChecks(draft.qualityChecks)
    const missingCriticalQuality =
      !draft.qualityChecks.has_disclosure ||
      !draft.qualityChecks.has_clear_cta ||
      !draft.qualityChecks.has_required_structure

    if (missingCriticalQuality || passedChecks <= 4) {
      recommendations.push({
        id: `weak-quality-draft:${draft.id}`,
        type: "draft_weak_quality",
        severity: missingCriticalQuality ? "critical" : "warning",
        title: `${draft.productName} draft needs quality review`,
        description:
          qualityIssues.length > 0
            ? `Quality checks flagged: ${qualityIssues.join(", ")}.`
            : "This draft passed too few checklist items and should be reviewed before further use.",
        relatedEntityType: "draft",
        relatedEntityKey: draft.id,
        actionLabel: "Review drafts",
        actionHref: "/dashboard/drafts",
      })
    }
  }

  for (const job of publishingJobs) {
    if (job.status === "failed") {
      recommendations.push({
        id: `failed-publishing-job:${job.id}`,
        type: "failed_publishing_job",
        severity: "critical",
        title: `${job.productName} publishing job failed`,
        description: job.errorMessage ?? "The publishing job failed and needs a manual retry.",
        relatedEntityType: "publishing_job",
        relatedEntityKey: job.id,
        actionLabel: "Open publishing queue",
        actionHref: "/dashboard/publishing",
      })
    }
  }

  const channelSummaries = new Map<string, PerformanceChannelSummary>()
  const productSummaries = new Map<string, PerformanceProductSummary>()
  const templatePerformance = new Map<
    TemplateType,
    { records: number; clicks: number; conversions: number }
  >()

  for (const record of performanceRecords) {
    const channelSummary = channelSummaries.get(record.channel) ?? {
      channel: record.channel,
      records: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    }
    channelSummary.records += 1
    channelSummary.clicks += record.clicks
    channelSummary.conversions += record.conversions ?? 0
    channelSummary.revenue += record.revenue ?? 0
    channelSummaries.set(record.channel, channelSummary)

    const productSummary = productSummaries.get(record.productId) ?? {
      productId: record.productId,
      productName: record.productName,
      productSlug: record.productSlug,
      records: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    }
    productSummary.records += 1
    productSummary.clicks += record.clicks
    productSummary.conversions += record.conversions ?? 0
    productSummary.revenue += record.revenue ?? 0
    productSummaries.set(record.productId, productSummary)

    if (record.draftTemplateType) {
      const templateSummary = templatePerformance.get(record.draftTemplateType) ?? {
        records: 0,
        clicks: 0,
        conversions: 0,
      }
      templateSummary.records += 1
      templateSummary.clicks += record.clicks
      templateSummary.conversions += record.conversions ?? 0
      templatePerformance.set(record.draftTemplateType, templateSummary)
    }
  }

  for (const productSummary of productSummaries.values()) {
    const productRecords = performanceByProductId.get(productSummary.productId) ?? []
    const latestRecord = productRecords.reduce<PerformanceMetric | null>((current, record) => {
      if (!current) {
        return record
      }

      return new Date(record.recordedAt).getTime() > new Date(current.recordedAt).getTime()
        ? record
        : current
    }, null)

    if (productSummary.clicks > 0 && productSummary.clicks < 10) {
      recommendations.push({
        id: `product-low-clicks:${productSummary.productId}`,
        type: "product_low_click_volume",
        severity: "warning",
        title: `${productSummary.productName} has low click volume`,
        description:
          `This product has ${productSummary.clicks} recorded clicks across ${productSummary.records} performance record(s).`,
        relatedEntityType: "product",
        relatedEntityKey: productSummary.productId,
        actionLabel: "Open performance",
        actionHref: "/dashboard/performance",
      })
    }

    if (productSummary.clicks >= 10 && productSummary.conversions === 0) {
      recommendations.push({
        id: `product-clicks-no-conversions:${productSummary.productId}`,
        type: "product_clicks_no_conversions",
        severity: "warning",
        title: `${productSummary.productName} has clicks but no conversions`,
        description:
          `This product has ${productSummary.clicks} clicks with no recorded conversions yet.`,
        relatedEntityType: "product",
        relatedEntityKey: productSummary.productId,
        actionLabel: "Open performance",
        actionHref: "/dashboard/performance",
      })
    }

    const latestDraft = latestDraftByProductId.get(productSummary.productId)
    if (
      latestRecord &&
      latestDraft &&
      new Date(latestRecord.recordedAt).getTime() > new Date(latestDraft.updatedAt).getTime()
    ) {
      recommendations.push({
        id: `product-no-newer-draft:${productSummary.productId}`,
        type: "product_no_newer_draft_iteration",
        severity: "info",
        title: `${productSummary.productName} has performance data but no newer draft iteration`,
        description:
          "Performance feedback exists for this product, but there is no newer draft update after the latest recorded outcome.",
        relatedEntityType: "product",
        relatedEntityKey: productSummary.productId,
        actionLabel: "Review drafts",
        actionHref: "/dashboard/drafts",
      })
    }

    if (latestRecord) {
      const ageInDays =
        (Date.now() - new Date(latestRecord.recordedAt).getTime()) / (1000 * 60 * 60 * 24)

      if (ageInDays > 30) {
        recommendations.push({
          id: `product-no-recent-records:${productSummary.productId}`,
          type: "product_no_recent_records",
          severity: "info",
          title: `${productSummary.productName} has no recent performance records`,
          description:
            `The latest recorded performance for this product is ${Math.floor(ageInDays)} day(s) old.`,
          relatedEntityType: "product",
          relatedEntityKey: productSummary.productId,
          actionLabel: "Open performance",
          actionHref: "/dashboard/performance",
        })
      }
    }
  }

  for (const channelSummary of channelSummaries.values()) {
    if (channelSummary.clicks > 0 && channelSummary.clicks < 10) {
      recommendations.push({
        id: `channel-low-clicks:${channelSummary.channel}`,
        type: "channel_low_click_volume",
        severity: "info",
        title: `${channelSummary.channel} has low click volume`,
        description:
          `This channel has ${channelSummary.clicks} clicks across ${channelSummary.records} performance record(s).`,
        relatedEntityType: "channel",
        relatedEntityKey: channelSummary.channel,
        actionLabel: "Open performance",
        actionHref: "/dashboard/performance",
      })
    }
  }

  const templateAverages = Array.from(templatePerformance.entries()).map(([templateType, summary]) => ({
    templateType,
    averageClicks: summary.records > 0 ? summary.clicks / summary.records : 0,
    records: summary.records,
  }))

  const bestTemplate = templateAverages.reduce<(typeof templateAverages)[number] | null>(
    (current, item) => {
      if (!current || item.averageClicks > current.averageClicks) {
        return item
      }

      return current
    },
    null,
  )

  if (bestTemplate && bestTemplate.averageClicks >= 10 && templateAverages.length > 1) {
    for (const template of templateAverages) {
      if (
        template.templateType !== bestTemplate.templateType &&
        template.averageClicks < bestTemplate.averageClicks * 0.6
      ) {
        recommendations.push({
          id: `template-underperforming:${template.templateType}`,
          type: "template_underperforming",
          severity: "info",
          title: `${template.templateType.replace("_", " ")} drafts are underperforming`,
          description:
            `${template.templateType.replace("_", " ")} drafts average ${template.averageClicks.toFixed(1)} clicks per record, below the current best template.`,
          relatedEntityType: "template_type",
          relatedEntityKey: template.templateType,
          actionLabel: "Open performance",
          actionHref: "/dashboard/performance",
        })
      }
    }
  }

  return sortRecommendations(recommendations)
}

export async function listRecommendations(options?: {
  limit?: number
  performanceOnly?: boolean
}) {
  const recommendations = await computeRecommendations()
  const filtered = options?.performanceOnly
    ? recommendations.filter((recommendation) =>
        performanceRecommendationTypes.has(recommendation.type),
      )
    : recommendations

  return typeof options?.limit === "number" ? filtered.slice(0, options.limit) : filtered
}

export async function getRecommendationSummary(options?: { performanceOnly?: boolean }) {
  const recommendations = await listRecommendations({
    performanceOnly: options?.performanceOnly,
  })

  return summarizeRecommendations(recommendations)
}

async function requireDatabase() {
  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    throw new Error(`${readiness.summary} ${readiness.guidance}`)
  }

  return getServiceRoleSupabase()
}

async function ensureUniqueSlug(slug: string) {
  const supabase = await requireDatabase()
  const { data, error } = await supabase.from("products").select("slug").eq("slug", slug)

  if (error) {
    throw new Error(`Unable to validate product slug: ${error.message}`)
  }

  if ((data ?? []).length > 0) {
    throw new Error("That slug already exists. Choose a different slug.")
  }
}

function assertValidHttpUrl(value: string, fieldLabel: string) {
  try {
    const parsed = new URL(value)

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error()
    }
  } catch {
    throw new Error(`${fieldLabel} must be a valid http or https URL.`)
  }
}

function assertNonNegativeNumber(value: number | null | undefined, fieldLabel: string) {
  if (value === null || value === undefined) {
    return
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldLabel} must be a number greater than or equal to 0.`)
  }
}

function isValidProductStatus(value: string): value is Product["status"] {
  return value === "active" || value === "inactive"
}

export async function listProducts() {
  if (!isSupabaseConfigured()) {
    return []
  }

  const supabase = await requireDatabase()
  const { data, error } = await supabase.from("products").select("*").order("created_at", {
    ascending: false,
  })

  if (error) {
    throw new Error(`Unable to list products: ${error.message}`)
  }

  return (data as ProductRow[]).map(mapProduct)
}

export async function listRecentProducts(limit = 5) {
  if (!isSupabaseConfigured()) {
    return []
  }

  const supabase = await requireDatabase()
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Unable to list recent products: ${error.message}`)
  }

  return (data as ProductRow[]).map(mapProduct)
}

export async function getProductById(productId: string) {
  const supabase = await requireDatabase()
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to load product: ${error.message}`)
  }

  return data ? mapProduct(data as ProductRow) : null
}

export async function createProduct(input: CreateProductInput) {
  const supabase = await requireDatabase()
  const trimmedName = input.name.trim()
  const normalizedSlug = slugify(input.slug)
  const affiliateUrl = input.affiliateUrl.trim()

  if (!trimmedName) {
    throw new Error("Product name is required.")
  }

  if (!normalizedSlug) {
    throw new Error("Slug is required.")
  }

  if (!affiliateUrl) {
    throw new Error("Affiliate URL is required.")
  }

  if (!isValidProductStatus(input.status ?? "active")) {
    throw new Error("Product status must be active or inactive.")
  }

  assertValidHttpUrl(affiliateUrl, "Affiliate URL")
  assertNonNegativeNumber(input.price, "Price")
  assertNonNegativeNumber(input.commissionRate, "Commission rate")

  await ensureUniqueSlug(normalizedSlug)

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: trimmedName,
      slug: normalizedSlug,
      brand: input.brand?.trim() || null,
      category: input.category?.trim() || null,
      affiliate_link: input.affiliateLink?.trim() || affiliateUrl,
      affiliate_url: affiliateUrl,
      price: input.price ?? null,
      commission_rate: input.commissionRate ?? null,
      notes: input.notes?.trim() || null,
      target_keyword: input.targetKeyword?.trim() || null,
      secondary_keywords: input.secondaryKeywords ?? [],
      search_intent: input.searchIntent?.trim() || null,
      content_angle: input.contentAngle?.trim() || null,
      status: input.status ?? "active",
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(`Unable to create product: ${error.message}`)
  }

  return mapProduct(data as ProductRow)
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (!isSupabaseConfigured()) {
    return {
      totalProducts: 0,
      activeProducts: 0,
      totalDrafts: 0,
      draftsByStatus: {
        draft: 0,
        needs_review: 0,
        approved: 0,
        needs_changes: 0,
        rejected: 0,
      },
      draftsByTemplateType: {
        review: 0,
        comparison: 0,
        buying_guide: 0,
        social_post: 0,
        tiktok_script: 0,
        quora_answer: 0,
        reddit_post: 0,
      },
      totalPublishingJobs: 0,
      publishingJobsByStatus: {
        pending: 0,
        sent: 0,
        sent_to_wordpress: 0,
        failed: 0,
      },
    }
  }

  const supabase = await requireDatabase()
  const [
    productsResult,
    activeProductsResult,
    allDraftsResult,
    draftOnlyResult,
    approvedDraftResult,
    rejectedDraftResult,
    reviewDraftResult,
    comparisonDraftResult,
    buyingGuideDraftResult,
    socialPostDraftResult,
    tiktokScriptDraftResult,
    quoraAnswerDraftResult,
    redditPostDraftResult,
    publishingJobsResult,
    queuedJobsResult,
    sentJobsResult,
    failedJobsResult,
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("content_drafts").select("*", { count: "exact", head: true }),
    supabase
      .from("content_drafts")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("content_drafts")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("content_drafts")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected"),
    supabase
      .from("content_drafts")
      .select("*", { count: "exact", head: true })
      .eq("template_type", "review"),
    supabase
      .from("content_drafts")
      .select("*", { count: "exact", head: true })
      .eq("template_type", "comparison"),
    supabase
      .from("content_drafts")
      .select("*", { count: "exact", head: true })
      .eq("template_type", "buying_guide"),
    supabase
      .from("content_drafts")
      .select("*", { count: "exact", head: true })
      .eq("template_type", "social_post"),
    supabase
      .from("content_drafts")
      .select("*", { count: "exact", head: true })
      .eq("template_type", "tiktok_script"),
    supabase
      .from("content_drafts")
      .select("*", { count: "exact", head: true })
      .eq("template_type", "quora_answer"),
    supabase
      .from("content_drafts")
      .select("*", { count: "exact", head: true })
      .eq("template_type", "reddit_post"),
    supabase.from("publishing_jobs").select("*", { count: "exact", head: true }),
    supabase
      .from("publishing_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("publishing_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent_to_wordpress"),
    supabase
      .from("publishing_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed"),
  ])

  if (productsResult.error) {
    throw new Error(`Unable to count products: ${productsResult.error.message}`)
  }

  if (activeProductsResult.error) {
    throw new Error(`Unable to count active products: ${activeProductsResult.error.message}`)
  }

  if (allDraftsResult.error) {
    throw new Error(`Unable to count drafts: ${allDraftsResult.error.message}`)
  }

  if (draftOnlyResult.error) {
    throw new Error(`Unable to count draft-status drafts: ${draftOnlyResult.error.message}`)
  }

  if (approvedDraftResult.error) {
    throw new Error(`Unable to count approved drafts: ${approvedDraftResult.error.message}`)
  }

  if (rejectedDraftResult.error) {
    throw new Error(`Unable to count rejected drafts: ${rejectedDraftResult.error.message}`)
  }

  if (reviewDraftResult.error) {
    throw new Error(`Unable to count review drafts: ${reviewDraftResult.error.message}`)
  }

  if (comparisonDraftResult.error) {
    throw new Error(`Unable to count comparison drafts: ${comparisonDraftResult.error.message}`)
  }

  if (buyingGuideDraftResult.error) {
    throw new Error(`Unable to count buying guide drafts: ${buyingGuideDraftResult.error.message}`)
  }

  if (socialPostDraftResult.error) {
    throw new Error(`Unable to count social post drafts: ${socialPostDraftResult.error.message}`)
  }

  if (tiktokScriptDraftResult.error) {
    throw new Error(`Unable to count TikTok script drafts: ${tiktokScriptDraftResult.error.message}`)
  }

  if (quoraAnswerDraftResult.error) {
    throw new Error(`Unable to count Quora answer drafts: ${quoraAnswerDraftResult.error.message}`)
  }

  if (redditPostDraftResult.error) {
    throw new Error(`Unable to count Reddit post drafts: ${redditPostDraftResult.error.message}`)
  }

  if (publishingJobsResult.error) {
    throw new Error(`Unable to count publishing jobs: ${publishingJobsResult.error.message}`)
  }

  if (queuedJobsResult.error) {
    throw new Error(`Unable to count queued publishing jobs: ${queuedJobsResult.error.message}`)
  }

  if (sentJobsResult.error) {
    throw new Error(`Unable to count successful publishing jobs: ${sentJobsResult.error.message}`)
  }

  if (failedJobsResult.error) {
    throw new Error(`Unable to count failed publishing jobs: ${failedJobsResult.error.message}`)
  }

  return {
    totalProducts: productsResult.count ?? 0,
    activeProducts: activeProductsResult.count ?? 0,
    totalDrafts: allDraftsResult.count ?? 0,
    draftsByStatus: {
      draft: draftOnlyResult.count ?? 0,
      needs_review: 0,
      approved: approvedDraftResult.count ?? 0,
      needs_changes: 0,
      rejected: rejectedDraftResult.count ?? 0,
    },
    draftsByTemplateType: {
      review: reviewDraftResult.count ?? 0,
      comparison: comparisonDraftResult.count ?? 0,
      buying_guide: buyingGuideDraftResult.count ?? 0,
      social_post: socialPostDraftResult.count ?? 0,
      tiktok_script: tiktokScriptDraftResult.count ?? 0,
      quora_answer: quoraAnswerDraftResult.count ?? 0,
      reddit_post: redditPostDraftResult.count ?? 0,
    },
    totalPublishingJobs: publishingJobsResult.count ?? 0,
    publishingJobsByStatus: {
      pending: queuedJobsResult.count ?? 0,
      sent: 0,
      sent_to_wordpress: sentJobsResult.count ?? 0,
      failed: failedJobsResult.count ?? 0,
    },
  }
}

export async function listDrafts(filters?: {
  status?: DraftStatus
  templateType?: TemplateType
}) {
  if (!isSupabaseConfigured()) {
    return []
  }

  const supabase = await requireDatabase()
  let query = supabase
    .from("content_drafts")
    .select(
      "id, product_id, content_type, template_type, title, body, meta_title, meta_description, target_keyword, quality_checks, status, campaign_id, ai_model, approval_notes, created_at, updated_at, products(name, slug)",
    )
    .order("created_at", { ascending: false })

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }

  if (filters?.templateType) {
    query = query.eq("template_type", filters.templateType)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Unable to list drafts: ${error.message}`)
  }

  return (data as DraftRow[]).map(mapDraft)
}

export async function listRecentDrafts(limit = 5) {
  if (!isSupabaseConfigured()) {
    return []
  }

  const supabase = await requireDatabase()
  const { data, error } = await supabase
    .from("content_drafts")
    .select(
      "id, product_id, content_type, template_type, title, body, meta_title, meta_description, target_keyword, quality_checks, status, campaign_id, ai_model, approval_notes, created_at, updated_at, products(name, slug)",
    )
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Unable to list recent drafts: ${error.message}`)
  }

  return (data as DraftRow[]).map(mapDraft)
}

export async function getDraftById(draftId: string) {
  const supabase = await requireDatabase()
  const { data, error } = await supabase
    .from("content_drafts")
    .select(
      "id, product_id, content_type, template_type, title, body, meta_title, meta_description, target_keyword, quality_checks, status, campaign_id, ai_model, approval_notes, created_at, updated_at, products(name, slug)",
    )
    .eq("id", draftId)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to load draft: ${error.message}`)
  }

  return data ? mapDraft(data as DraftRow) : null
}

export async function createDraft(params: {
  productId: string
  contentType: ContentType
  templateType: TemplateType
  draft: DraftCreateInput
  aiModel: string
  qualityChecks: QualityChecks
  approvalNotes?: string | null
  campaignId?: string | null
  changeSource?: DraftChangeSource
}) {
  const supabase = await requireDatabase()

  if (!params.productId.trim()) {
    throw new Error("A valid product is required before generating a draft.")
  }

  if (!params.draft.body.trim()) {
    throw new Error("Draft body content is required.")
  }

  const { data, error } = await supabase
    .from("content_drafts")
    .insert({
      product_id: params.productId,
      content_type: params.contentType,
      template_type: params.templateType,
      title: params.draft.title?.trim() || null,
      body: params.draft.body.trim(),
      meta_title: params.draft.metaTitle?.trim() || null,
      meta_description: params.draft.metaDescription?.trim() || null,
      target_keyword: params.draft.targetKeyword?.trim() || null,
      quality_checks: params.qualityChecks,
      status: "draft" as const,
      campaign_id: params.campaignId?.trim() || null,
      ai_model: params.aiModel,
      approval_notes: params.approvalNotes?.trim() || null,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`Unable to create draft: ${error.message}`)
  }

  await createDraftVersion({
    contentDraftId: data.id,
    title: params.draft.title?.trim() || null,
    body: params.draft.body.trim(),
    metaTitle: params.draft.metaTitle?.trim() || null,
    metaDescription: params.draft.metaDescription?.trim() || null,
    targetKeyword: params.draft.targetKeyword?.trim() || null,
    qualityChecks: params.qualityChecks,
    changeSource: params.changeSource ?? "manual",
  })

  return data
}

export async function updateDraftStatus(params: {
  draftId: string
  status: DraftStatus
  approvalNotes?: string | null
}) {
  const supabase = await requireDatabase()
  const draft = await getDraftById(params.draftId)

  if (!draft) {
    throw new Error("Draft not found.")
  }

  assertDraftStatusTransition(draft.status, params.status)

  const { error } = await supabase
    .from("content_drafts")
    .update({
      status: params.status,
      approval_notes: params.approvalNotes?.trim() || null,
    })
    .eq("id", params.draftId)

  if (error) {
    throw new Error(`Unable to update draft status: ${error.message}`)
  }
}

export async function updateDraftContent(params: {
  draftId: string
  title: string | null
  body: string
  metaTitle: string | null
  metaDescription: string | null
  targetKeyword: string | null
  approvalNotes: string | null
  qualityChecks: QualityChecks
  changeSource?: DraftChangeSource
}) {
  const supabase = await requireDatabase()
  const draft = await getDraftById(params.draftId)

  if (!draft) {
    throw new Error("Draft not found.")
  }

  if (draft.status === "approved") {
    throw new Error("Approved drafts cannot be edited. Revert to draft first.")
  }

  const { error } = await supabase
    .from("content_drafts")
    .update({
      title: params.title,
      body: params.body.trim(),
      meta_title: params.metaTitle,
      meta_description: params.metaDescription,
      target_keyword: params.targetKeyword,
      approval_notes: params.approvalNotes,
      quality_checks: params.qualityChecks,
      status: "draft" as const,
    })
    .eq("id", params.draftId)

  if (error) {
    throw new Error(`Unable to update draft: ${error.message}`)
  }

  await createDraftVersion({
    contentDraftId: params.draftId,
    title: params.title,
    body: params.body.trim(),
    metaTitle: params.metaTitle,
    metaDescription: params.metaDescription,
    targetKeyword: params.targetKeyword,
    qualityChecks: params.qualityChecks,
    changeSource: params.changeSource ?? "manual",
  })
}

export async function revertDraftToDraft(draftId: string) {
  const supabase = await requireDatabase()
  const draft = await getDraftById(draftId)

  if (!draft) {
    throw new Error("Draft not found.")
  }

  if (draft.status === "draft") {
    return
  }

  const { error } = await supabase
    .from("content_drafts")
    .update({ status: "draft" as const })
    .eq("id", draftId)

  if (error) {
    throw new Error(`Unable to revert draft: ${error.message}`)
  }
}

export async function getApprovedDraftById(draftId: string) {
  const supabase = await requireDatabase()
  const { data, error } = await supabase
    .from("content_drafts")
    .select(
      "id, product_id, content_type, template_type, title, body, meta_title, meta_description, target_keyword, quality_checks, status, campaign_id, ai_model, approval_notes, created_at, updated_at, products(name, slug)",
    )
    .eq("id", draftId)
    .eq("status", "approved")
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to load approved draft: ${error.message}`)
  }

  return data ? mapDraft(data as DraftRow) : null
}

export async function listApprovedDraftsEligibleForPublishing() {
  if (!isSupabaseConfigured()) {
    return []
  }

  const supabase = await requireDatabase()
  const [draftsResult, sentJobsResult] = await Promise.all([
    supabase
      .from("content_drafts")
      .select(
        "id, product_id, content_type, template_type, title, body, meta_title, meta_description, target_keyword, quality_checks, status, campaign_id, ai_model, approval_notes, created_at, updated_at, products(name, slug)",
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("publishing_jobs")
      .select("content_draft_id")
      .eq("target_platform", "wordpress")
      .eq("status", "sent_to_wordpress"),
  ])

  if (draftsResult.error) {
    throw new Error(`Unable to list approved drafts: ${draftsResult.error.message}`)
  }

  if (sentJobsResult.error) {
    throw new Error(`Unable to list publishing jobs: ${sentJobsResult.error.message}`)
  }

  const sentDraftIds = new Set(
    (sentJobsResult.data ?? []).map((job) => String(job.content_draft_id)),
  )

  return (draftsResult.data as DraftRow[])
    .map(mapDraft)
    .filter((draft) => !sentDraftIds.has(draft.id))
}

export async function getPublishingJobs(filters?: {
  status?: PublishingJobStatus
  limit?: number
}) {
  if (!isSupabaseConfigured()) {
    return []
  }

  const supabase = await requireDatabase()
  let query = supabase
    .from("publishing_jobs")
    .select(
      "id, content_draft_id, target_platform, status, wordpress_post_id, wordpress_post_url, error_message, created_at, updated_at, content_drafts(title, status, template_type, product_id, products(name, slug))",
    )
    .order("created_at", { ascending: false })

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Unable to list publishing jobs: ${error.message}`)
  }

  return (data as PublishingJobRow[]).map(mapPublishingJob)
}

export async function listRecentPublishingJobs(limit = 5) {
  return getPublishingJobs({ limit })
}

export async function getPublishingJobForDraft(contentDraftId: string) {
  const supabase = await requireDatabase()
  const { data, error } = await supabase
    .from("publishing_jobs")
    .select(
      "id, content_draft_id, target_platform, status, wordpress_post_id, wordpress_post_url, error_message, created_at, updated_at, content_drafts(title, status, template_type, product_id, products(name, slug))",
    )
    .eq("content_draft_id", contentDraftId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to load publishing job: ${error.message}`)
  }

  return data ? mapPublishingJob(data as PublishingJobRow) : null
}

export async function createPublishingJob(params: {
  contentDraftId: string
  targetPlatform?: PublishingTargetPlatform
}) {
  const supabase = await requireDatabase()
  const draft = await getDraftById(params.contentDraftId)

  if (!draft) {
    throw new Error("Draft not found.")
  }

  const targetPlatform = params.targetPlatform ?? "wordpress"
  const { data: existingSuccess, error: existingSuccessError } = await supabase
    .from("publishing_jobs")
    .select("id")
    .eq("content_draft_id", params.contentDraftId)
    .eq("target_platform", targetPlatform)
    .eq("status", "sent_to_wordpress")
    .limit(1)
    .maybeSingle()

  if (existingSuccessError) {
    throw new Error(
      `Unable to validate existing publishing jobs: ${existingSuccessError.message}`,
    )
  }

  assertPublishingEligibility({
    draftStatus: draft.status,
    alreadyPublished: Boolean(existingSuccess),
    targetPlatform,
  })

  const { data, error } = await supabase
    .from("publishing_jobs")
    .insert({
      content_draft_id: params.contentDraftId,
      target_platform: targetPlatform,
      status: "pending" as const,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`Unable to create publishing job: ${error.message}`)
  }

  return { id: String(data.id) }
}

export async function updatePublishingJobSuccess(params: {
  jobId: string
  /** Platform-neutral external post ID (preferred) */
  externalPostId?: string
  /** Platform-neutral published URL (preferred) */
  publishedUrl?: string | null
  /** @deprecated Use externalPostId instead */
  wordpressPostId?: string
  /** @deprecated Use publishedUrl instead */
  wordpressPostUrl?: string | null
}) {
  const supabase = await requireDatabase()
  const externalPostId = params.externalPostId ?? params.wordpressPostId ?? null
  const publishedUrl = params.publishedUrl ?? params.wordpressPostUrl ?? null

  if (!publishedUrl) {
    throw new Error(
      "Cannot mark publishing job as sent without a real publishedUrl. " +
      "A draft is only considered published when a real URL exists.",
    )
  }

  const { error } = await supabase
    .from("publishing_jobs")
    .update({
      status: "sent_to_wordpress" as const,
      wordpress_post_id: externalPostId,
      wordpress_post_url: publishedUrl,
      error_message: null,
    })
    .eq("id", params.jobId)

  if (error) {
    throw new Error(`Unable to update publishing job success: ${error.message}`)
  }
}

export async function updatePublishingJobFailure(params: {
  jobId: string
  errorMessage: string
}) {
  const supabase = await requireDatabase()
  const { error } = await supabase
    .from("publishing_jobs")
    .update({
      status: "failed" as const,
      error_message: params.errorMessage.trim(),
    })
    .eq("id", params.jobId)

  if (error) {
    throw new Error(`Unable to update publishing job failure: ${error.message}`)
  }
}

export async function getDashboardNeedsAttention(): Promise<DashboardNeedsAttention> {
  if (!isSupabaseConfigured()) {
    return {
      failedPublishingJobs: [],
      approvedDraftsNotQueued: [],
      productsWithoutDrafts: [],
    }
  }

  const supabase = await requireDatabase()
  const [failedPublishingJobs, approvedDraftsNotQueued, productsResult, draftedProductsResult] =
    await Promise.all([
      getPublishingJobs({ status: "failed" }),
      listApprovedDraftsEligibleForPublishing(),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("content_drafts").select("product_id"),
    ])

  if (productsResult.error) {
    throw new Error(`Unable to list products for attention checks: ${productsResult.error.message}`)
  }

  if (draftedProductsResult.error) {
    throw new Error(
      `Unable to list drafted products for attention checks: ${draftedProductsResult.error.message}`,
    )
  }

  const draftedProductIds = new Set(
    (draftedProductsResult.data ?? []).map((row) => String(row.product_id)),
  )
  const productsWithoutDrafts = (productsResult.data as ProductRow[])
    .map(mapProduct)
    .filter((product) => !draftedProductIds.has(product.id))

  return {
    failedPublishingJobs,
    approvedDraftsNotQueued,
    productsWithoutDrafts,
  }
}

export async function createPerformanceMetric(input: CreatePerformanceMetricInput) {
  const supabase = await requireDatabase()

  if (!input.productId.trim()) {
    throw new Error("A product is required for a performance record.")
  }

  if (!input.channel.trim()) {
    throw new Error("Channel is required for a performance record.")
  }

  if (!Number.isInteger(input.clicks) || input.clicks < 0) {
    throw new Error("Clicks must be a whole number greater than or equal to 0.")
  }

  if (
    input.conversions !== null &&
    input.conversions !== undefined &&
    (!Number.isInteger(input.conversions) || input.conversions < 0)
  ) {
    throw new Error("Conversions must be a whole number greater than or equal to 0.")
  }

  if (
    input.revenue !== null &&
    input.revenue !== undefined &&
    (!Number.isFinite(input.revenue) || input.revenue < 0)
  ) {
    throw new Error("Revenue must be a number greater than or equal to 0.")
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", input.productId)
    .maybeSingle()

  if (productError) {
    throw new Error(`Unable to validate product for performance record: ${productError.message}`)
  }

  if (!product) {
    throw new Error("Selected product does not exist.")
  }

  if (input.draftId) {
    const { data: draft, error: draftError } = await supabase
      .from("content_drafts")
      .select("id, product_id")
      .eq("id", input.draftId)
      .maybeSingle()

    if (draftError) {
      throw new Error(`Unable to validate draft for performance record: ${draftError.message}`)
    }

    if (!draft) {
      throw new Error("Selected draft does not exist.")
    }

    if (String(draft.product_id) !== input.productId) {
      throw new Error("Selected draft does not belong to the chosen product.")
    }
  }

  const { data, error } = await supabase
    .from("performance_metrics")
    .insert({
      product_id: input.productId,
      draft_id: input.draftId ?? null,
      campaign_link_id: input.campaignLinkId ?? null,
      channel: input.channel.trim(),
      campaign_name: input.campaignName?.trim() || null,
      clicks: input.clicks,
      conversions: input.conversions ?? null,
      revenue: input.revenue ?? null,
      notes: input.notes?.trim() || null,
      recorded_at: input.recordedAt ?? new Date().toISOString(),
      source: input.source?.trim() || null,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`Unable to create performance record: ${error.message}`)
  }

  return { id: String(data.id) }
}

export async function listPerformanceMetrics(filters?: {
  channel?: string
  productId?: string
}) {
  if (!isSupabaseConfigured()) {
    return []
  }

  const supabase = await requireDatabase()
  let query = supabase
    .from("performance_metrics")
    .select(
      "id, product_id, draft_id, campaign_link_id, channel, campaign_name, clicks, conversions, revenue, notes, recorded_at, created_at, products(name, slug), content_drafts(title, template_type)",
    )
    .order("recorded_at", { ascending: false })

  if (filters?.channel) {
    query = query.eq("channel", filters.channel)
  }

  if (filters?.productId) {
    query = query.eq("product_id", filters.productId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Unable to list performance records: ${error.message}`)
  }

  return (data as PerformanceMetricRow[]).map(mapPerformanceMetric)
}

export async function listRecentPerformanceMetrics(limit = 5) {
  if (!isSupabaseConfigured()) {
    return []
  }

  const supabase = await requireDatabase()
  const { data, error } = await supabase
    .from("performance_metrics")
    .select(
      "id, product_id, draft_id, campaign_link_id, channel, campaign_name, clicks, conversions, revenue, notes, recorded_at, created_at, products(name, slug), content_drafts(title, template_type)",
    )
    .order("recorded_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Unable to list recent performance records: ${error.message}`)
  }

  return (data as PerformanceMetricRow[]).map(mapPerformanceMetric)
}

export async function getPerformanceSummary(): Promise<PerformanceSummary> {
  const records = await listPerformanceMetrics()

  const byChannelMap = new Map<string, PerformanceChannelSummary>()
  const byProductMap = new Map<string, PerformanceProductSummary>()

  for (const record of records) {
    const conversions = record.conversions ?? 0
    const revenue = record.revenue ?? 0

    const channelSummary = byChannelMap.get(record.channel) ?? {
      channel: record.channel,
      records: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    }

    channelSummary.records += 1
    channelSummary.clicks += record.clicks
    channelSummary.conversions += conversions
    channelSummary.revenue += revenue
    byChannelMap.set(record.channel, channelSummary)

    const productSummary = byProductMap.get(record.productId) ?? {
      productId: record.productId,
      productName: record.productName,
      productSlug: record.productSlug,
      records: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    }

    productSummary.records += 1
    productSummary.clicks += record.clicks
    productSummary.conversions += conversions
    productSummary.revenue += revenue
    byProductMap.set(record.productId, productSummary)
  }

  return {
    totalRecords: records.length,
    totalClicks: records.reduce((sum, record) => sum + record.clicks, 0),
    totalConversions: records.reduce((sum, record) => sum + (record.conversions ?? 0), 0),
    totalRevenue: records.reduce((sum, record) => sum + (record.revenue ?? 0), 0),
    byChannel: Array.from(byChannelMap.values()).sort((a, b) => b.clicks - a.clicks),
    byProduct: Array.from(byProductMap.values()).sort((a, b) => b.clicks - a.clicks),
  }
}

export async function listProductWorkflowItems(filters?: {
  workflow?: WorkflowLabel
}) {
  const [products, drafts, publishingJobs, performanceRecords] = await Promise.all([
    listProducts(),
    listDrafts(),
    getPublishingJobs(),
    listPerformanceMetrics(),
  ])

  const draftsByProductId = new Map<string, Draft[]>()
  const publishingJobsByDraftId = new Map<string, PublishingJob[]>()
  const performanceByProductId = new Map<string, PerformanceMetric[]>()

  for (const draft of drafts) {
    const productDrafts = draftsByProductId.get(draft.productId) ?? []
    productDrafts.push(draft)
    draftsByProductId.set(draft.productId, productDrafts)
  }

  for (const job of publishingJobs) {
    const draftJobs = publishingJobsByDraftId.get(job.contentDraftId) ?? []
    draftJobs.push(job)
    publishingJobsByDraftId.set(job.contentDraftId, draftJobs)
  }

  for (const record of performanceRecords) {
    const productRecords = performanceByProductId.get(record.productId) ?? []
    productRecords.push(record)
    performanceByProductId.set(record.productId, productRecords)
  }

  const items: ProductWorkflowItem[] = products.map((product) => {
    const workflow = deriveProductWorkflow(
      product,
      draftsByProductId.get(product.id) ?? [],
      publishingJobsByDraftId,
      performanceByProductId,
    )

    return {
      ...product,
      ...workflow,
    }
  })

  return filters?.workflow
    ? items.filter((item) => item.workflowLabel === filters.workflow)
    : items
}

export async function listDraftWorkflowItems(filters?: {
  status?: DraftStatus
  templateType?: TemplateType
  productId?: string
  publishingState?: DraftPublishingState
}) {
  const [drafts, allDrafts, publishingJobs, performanceRecords] = await Promise.all([
    listDrafts({
      status: filters?.status,
      templateType: filters?.templateType,
    }),
    listDrafts(),
    getPublishingJobs(),
    listPerformanceMetrics(),
  ])

  const draftsByProductId = new Map<string, Draft[]>()
  const publishingJobsByDraftId = new Map<string, PublishingJob[]>()
  const performanceByDraftId = new Map<string, PerformanceMetric[]>()

  for (const draft of allDrafts) {
    const productDrafts = draftsByProductId.get(draft.productId) ?? []
    productDrafts.push(draft)
    draftsByProductId.set(draft.productId, productDrafts)
  }

  for (const job of publishingJobs) {
    const draftJobs = publishingJobsByDraftId.get(job.contentDraftId) ?? []
    draftJobs.push(job)
    publishingJobsByDraftId.set(job.contentDraftId, draftJobs)
  }

  for (const record of performanceRecords) {
    if (!record.draftId) continue
    const draftRecords = performanceByDraftId.get(record.draftId) ?? []
    draftRecords.push(record)
    performanceByDraftId.set(record.draftId, draftRecords)
  }

  const items: DraftWorkflowItem[] = drafts
    .filter((draft) => !filters?.productId || draft.productId === filters.productId)
    .map((draft) => {
      const workflow = deriveDraftWorkflow(
        draft,
        draftsByProductId.get(draft.productId) ?? [draft],
        publishingJobsByDraftId,
        performanceByDraftId,
      )

      return {
        ...draft,
        ...workflow,
      }
    })

  return filters?.publishingState
    ? items.filter((item) => item.publishingState === filters.publishingState)
    : items
}

export async function getPublishingQueueSummary() {
  const [jobs, eligibleDrafts] = await Promise.all([
    getPublishingJobs(),
    listApprovedDraftsEligibleForPublishing(),
  ])

  return {
    pending: jobs.filter((job) => job.status === "pending").length,
    sent: jobs.filter((job) => job.status === "sent_to_wordpress").length,
    failed: jobs.filter((job) => job.status === "failed").length,
    eligibleApprovedDrafts: eligibleDrafts.length,
  }
}

export async function listPublishingWorkflowItems(filters?: {
  status?: PublishingJobStatus
}) {
  const [jobs, performanceRecords] = await Promise.all([
    getPublishingJobs({ status: filters?.status }),
    listPerformanceMetrics(),
  ])

  const performanceByDraftId = new Map<string, PerformanceMetric[]>()
  for (const record of performanceRecords) {
    if (!record.draftId) continue
    const draftRecords = performanceByDraftId.get(record.draftId) ?? []
    draftRecords.push(record)
    performanceByDraftId.set(record.draftId, draftRecords)
  }

  return jobs.map<PublishingWorkflowItem>((job) => ({
    ...job,
    ...getPublishingWorkflow(job, performanceByDraftId),
  }))
}

export async function listPerformanceWorkflowRecords(filters?: {
  productId?: string
  channel?: string
  recency?: "all" | "last_7_days" | "last_30_days" | "older_than_30_days"
  missingConversions?: boolean
}) {
  const [records, drafts] = await Promise.all([
    listPerformanceMetrics({
      productId: filters?.productId,
      channel: filters?.channel,
    }),
    listDrafts(),
  ])

  const latestDraftByProductId = new Map<string, Draft>()
  for (const draft of drafts) {
    const current = latestDraftByProductId.get(draft.productId)
    if (!current || new Date(draft.updatedAt).getTime() > new Date(current.updatedAt).getTime()) {
      latestDraftByProductId.set(draft.productId, draft)
    }
  }

  const items: PerformanceWorkflowRecord[] = records.map((record) => ({
    ...record,
    ...getPerformanceWorkflow(record, latestDraftByProductId),
  }))

  return items.filter((item) => {
    if (filters?.missingConversions && !item.isMissingConversions) {
      return false
    }

    if (!filters?.recency || filters.recency === "all") {
      return true
    }

    const ageInDays =
      (Date.now() - new Date(item.recordedAt).getTime()) / (1000 * 60 * 60 * 24)

    if (filters.recency === "last_7_days") {
      return ageInDays <= 7
    }

    if (filters.recency === "last_30_days") {
      return ageInDays <= 30
    }

    return ageInDays > 30
  })
}

export async function getNextDraftVersionNumber(contentDraftId: string): Promise<number> {
  const supabase = await requireDatabase()
  const { data, error } = await supabase
    .from("draft_versions")
    .select("version_number")
    .eq("content_draft_id", contentDraftId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to determine next version number: ${error.message}`)
  }

  return (data?.version_number ?? 0) + 1
}

export async function createDraftVersion(params: {
  contentDraftId: string
  title: string | null
  body: string
  metaTitle: string | null
  metaDescription: string | null
  targetKeyword: string | null
  qualityChecks: QualityChecks
  changeSource: DraftChangeSource
  changeNotes?: string | null
}) {
  const supabase = await requireDatabase()
  const versionNumber = await getNextDraftVersionNumber(params.contentDraftId)

  const { data, error } = await supabase
    .from("draft_versions")
    .insert({
      content_draft_id: params.contentDraftId,
      version_number: versionNumber,
      title: params.title,
      body: params.body,
      meta_title: params.metaTitle,
      meta_description: params.metaDescription,
      target_keyword: params.targetKeyword,
      quality_checks: params.qualityChecks,
      change_source: params.changeSource,
      change_notes: params.changeNotes?.trim() || null,
    })
    .select("id, version_number")
    .single()

  if (error) {
    throw new Error(`Unable to create draft version: ${error.message}`)
  }

  return { id: String(data.id), versionNumber: data.version_number as number }
}

export async function listDraftVersions(contentDraftId: string): Promise<DraftVersion[]> {
  const supabase = await requireDatabase()
  const { data, error } = await supabase
    .from("draft_versions")
    .select("*")
    .eq("content_draft_id", contentDraftId)
    .order("version_number", { ascending: false })

  if (error) {
    throw new Error(`Unable to list draft versions: ${error.message}`)
  }

  return (data as DraftVersionRow[]).map(mapDraftVersion)
}

export async function getDraftVersion(versionId: string): Promise<DraftVersion | null> {
  const supabase = await requireDatabase()
  const { data, error } = await supabase
    .from("draft_versions")
    .select("*")
    .eq("id", versionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to load draft version: ${error.message}`)
  }

  return data ? mapDraftVersion(data as DraftVersionRow) : null
}

export async function restoreDraftVersion(params: {
  draftId: string
  versionId: string
}) {
  const supabase = await requireDatabase()
  const [draft, version] = await Promise.all([
    getDraftById(params.draftId),
    getDraftVersion(params.versionId),
  ])

  if (!draft) {
    throw new Error("Draft not found.")
  }

  if (!version) {
    throw new Error("Version not found.")
  }

  if (version.contentDraftId !== params.draftId) {
    throw new Error("Version does not belong to this draft.")
  }

  const { error } = await supabase
    .from("content_drafts")
    .update({
      title: version.title,
      body: version.body,
      meta_title: version.metaTitle,
      meta_description: version.metaDescription,
      target_keyword: version.targetKeyword,
      quality_checks: version.qualityChecks,
      status: "draft" as const,
    })
    .eq("id", params.draftId)

  if (error) {
    throw new Error(`Unable to restore draft version: ${error.message}`)
  }

  await createDraftVersion({
    contentDraftId: params.draftId,
    title: version.title,
    body: version.body,
    metaTitle: version.metaTitle,
    metaDescription: version.metaDescription,
    targetKeyword: version.targetKeyword,
    qualityChecks: version.qualityChecks,
    changeSource: "system",
    changeNotes: `Restored from version ${version.versionNumber}`,
  })
}

export async function getPerformanceInsights(): Promise<PerformanceInsight[]> {
  if (!isSupabaseConfigured()) return []

  const [drafts, records, campaignLinks] = await Promise.all([
    listDrafts(),
    listPerformanceMetrics(),
    listCampaignLinks(),
  ])

  const approvedDrafts = drafts.filter((d) => d.status === "approved")
  const performanceByProductId = new Map<string, PerformanceMetric[]>()
  const performanceByDraftId = new Map<string, PerformanceMetric[]>()
  const performanceByCampaignLinkId = new Map<string, PerformanceMetric[]>()
  const latestDraftByProductId = new Map<string, Draft>()

  for (const record of records) {
    const arr = performanceByProductId.get(record.productId) ?? []
    arr.push(record)
    performanceByProductId.set(record.productId, arr)
    if (record.draftId) {
      const dArr = performanceByDraftId.get(record.draftId) ?? []
      dArr.push(record)
      performanceByDraftId.set(record.draftId, dArr)
    }
    if (record.campaignLinkId) {
      const clArr = performanceByCampaignLinkId.get(record.campaignLinkId) ?? []
      clArr.push(record)
      performanceByCampaignLinkId.set(record.campaignLinkId, clArr)
    }
  }

  for (const draft of drafts) {
    const current = latestDraftByProductId.get(draft.productId)
    if (!current || new Date(draft.updatedAt).getTime() > new Date(current.updatedAt).getTime()) {
      latestDraftByProductId.set(draft.productId, draft)
    }
  }

  const productSummaries = Array.from(performanceByProductId.entries()).map(([productId, recs]) => ({
    productId,
    productName: recs[0]?.productName ?? "Unknown",
    productSlug: recs[0]?.productSlug ?? "unknown",
    records: recs.length,
    clicks: recs.reduce((s, r) => s + r.clicks, 0),
    conversions: recs.reduce((s, r) => s + (r.conversions ?? 0), 0),
    revenue: recs.reduce((s, r) => s + (r.revenue ?? 0), 0),
  }))

  const channelMap = new Map<string, { channel: string; records: number; clicks: number; conversions: number; revenue: number }>()
  for (const record of records) {
    const cs = channelMap.get(record.channel) ?? { channel: record.channel, records: 0, clicks: 0, conversions: 0, revenue: 0 }
    cs.records += 1
    cs.clicks += record.clicks
    cs.conversions += record.conversions ?? 0
    cs.revenue += record.revenue ?? 0
    channelMap.set(record.channel, cs)
  }

  return buildPerformanceInsights({
    productSummaries,
    channelSummaries: Array.from(channelMap.values()),
    approvedDrafts,
    performanceByProductId,
    performanceByDraftId,
    latestDraftByProductId,
    campaignLinks,
    performanceByCampaignLinkId,
  })
}

export async function getProductPerformanceSignals(): Promise<Map<string, ProductPerformanceSignal>> {
  if (!isSupabaseConfigured()) return new Map()

  const records = await listPerformanceMetrics()
  const byProductId = new Map<string, PerformanceMetric[]>()

  for (const record of records) {
    const arr = byProductId.get(record.productId) ?? []
    arr.push(record)
    byProductId.set(record.productId, arr)
  }

  const result = new Map<string, ProductPerformanceSignal>()
  for (const [productId, recs] of byProductId) {
    result.set(productId, buildProductPerformanceSignal({ productId, records: recs }))
  }

  return result
}

export async function getDraftPerformanceRecords(draftId: string): Promise<PerformanceMetric[]> {
  if (!isSupabaseConfigured()) return []

  const records = await listPerformanceMetrics()
  return records.filter((r) => r.draftId === draftId)
}

interface ImprovementTaskRow {
  id: string
  product_id: string | null
  content_draft_id: string | null
  source_type: string
  priority: string
  status: string
  title: string
  description: string | null
  suggested_action: string | null
  created_at: string
  updated_at: string
}

function mapImprovementTask(
  row: ImprovementTaskRow,
  productName: string | null,
  draftTitle: string | null,
): ImprovementTask {
  return {
    id: String(row.id),
    productId: row.product_id ? String(row.product_id) : null,
    productName,
    contentDraftId: row.content_draft_id ? String(row.content_draft_id) : null,
    draftTitle,
    sourceType: row.source_type as ImprovementTask["sourceType"],
    priority: row.priority as ImprovementTask["priority"],
    status: row.status as ImprovementTask["status"],
    title: row.title,
    description: row.description,
    suggestedAction: row.suggested_action,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createImprovementTask(input: CreateImprovementTaskInput): Promise<ImprovementTask> {
  const supabase = await requireDatabase()

  const { data, error } = await supabase
    .from("improvement_tasks")
    .insert({
      product_id: input.productId || null,
      content_draft_id: input.contentDraftId || null,
      source_type: input.sourceType,
      priority: input.priority ?? "medium",
      title: input.title.trim(),
      description: input.description?.trim() || null,
      suggested_action: input.suggestedAction?.trim() || null,
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(`Unable to create improvement task: ${error.message}`)
  }

  const row = data as ImprovementTaskRow
  let productName: string | null = null
  let draftTitle: string | null = null

  if (row.product_id) {
    const product = await getProductById(String(row.product_id))
    productName = product?.name ?? null
  }
  if (row.content_draft_id) {
    const draft = await getDraftById(String(row.content_draft_id))
    draftTitle = draft?.title ?? null
  }

  return mapImprovementTask(row, productName, draftTitle)
}

export async function listImprovementTasks(filters?: {
  status?: ImprovementTaskStatus
  priority?: ImprovementTaskPriority
  productId?: string
}): Promise<ImprovementTask[]> {
  const supabase = await requireDatabase()

  let query = supabase
    .from("improvement_tasks")
    .select("*")
    .order("created_at", { ascending: false })

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }
  if (filters?.priority) {
    query = query.eq("priority", filters.priority)
  }
  if (filters?.productId) {
    query = query.eq("product_id", filters.productId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Unable to list improvement tasks: ${error.message}`)
  }

  const rows = data as ImprovementTaskRow[]
  const [products, drafts] = await Promise.all([listProducts(), listDrafts()])

  const productMap = new Map(products.map((p) => [p.id, p.name]))
  const draftMap = new Map(drafts.map((d) => [d.id, d.title]))

  return rows.map((row) =>
    mapImprovementTask(
      row,
      row.product_id ? (productMap.get(String(row.product_id)) ?? null) : null,
      row.content_draft_id ? (draftMap.get(String(row.content_draft_id)) ?? null) : null,
    ),
  )
}

export async function updateImprovementTaskStatus(
  taskId: string,
  status: ImprovementTaskStatus,
): Promise<void> {
  const supabase = await requireDatabase()

  const { error } = await supabase
    .from("improvement_tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", taskId)

  if (error) {
    throw new Error(`Unable to update improvement task status: ${error.message}`)
  }
}

export async function generateImprovementTasksFromInsights(
  insights: PerformanceInsight[],
): Promise<number> {
  if (insights.length === 0) return 0

  const existingTasks = await listImprovementTasks()
  const existingKeys = new Set(
    existingTasks
      .filter((t) => t.status !== "done" && t.status !== "dismissed")
      .map((t) => `${t.sourceType}:${t.title}`),
  )

  let created = 0

  for (const insight of insights) {
    const priority: ImprovementTaskPriority =
      insight.severity === "critical" ? "critical"
      : insight.severity === "warning" ? "high"
      : "medium"

    const key = `performance_insight:${insight.title}`
    if (existingKeys.has(key)) continue

    const productId = insight.relatedEntityType === "product" ? insight.relatedEntityKey : undefined
    const draftId = insight.relatedEntityType === "draft" ? insight.relatedEntityKey : undefined

    await createImprovementTask({
      productId: productId || null,
      contentDraftId: draftId || null,
      sourceType: "performance_insight",
      priority,
      title: insight.title,
      description: insight.description,
      suggestedAction: insight.actionLabel,
    })

    existingKeys.add(key)
    created++
  }

  return created
}

export async function getImprovementTaskSummary(): Promise<ImprovementTaskSummary> {
  if (!isSupabaseConfigured()) {
    return { total: 0, open: 0, inProgress: 0, done: 0, dismissed: 0, critical: 0 }
  }

  const tasks = await listImprovementTasks()

  return {
    total: tasks.length,
    open: tasks.filter((t) => t.status === "open").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
    dismissed: tasks.filter((t) => t.status === "dismissed").length,
    critical: tasks.filter((t) => t.priority === "critical" && t.status !== "done" && t.status !== "dismissed").length,
  }
}

export async function listDraftsForProduct(productId: string): Promise<Draft[]> {
  return (await listDrafts()).filter((d) => d.productId === productId)
}

export async function listPerformanceRecordsForProduct(productId: string): Promise<PerformanceMetric[]> {
  if (!isSupabaseConfigured()) return []
  return listPerformanceMetrics({ productId })
}

export async function listImprovementTasksForProduct(productId: string): Promise<ImprovementTask[]> {
  return listImprovementTasks({ productId })
}

export interface ProductWorkspaceSummary {
  draftCount: number
  approvedDraftCount: number
  pendingDraftCount: number
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  performanceRecordCount: number
  openTaskCount: number
  criticalTaskCount: number
}

export function buildProductWorkspaceSummary(params: {
  drafts: Draft[]
  records: PerformanceMetric[]
  tasks: ImprovementTask[]
}): ProductWorkspaceSummary {
  const { drafts, records, tasks } = params
  return {
    draftCount: drafts.length,
    approvedDraftCount: drafts.filter((d) => d.status === "approved").length,
    pendingDraftCount: drafts.filter((d) => d.status === "draft").length,
    totalClicks: records.reduce((s, r) => s + r.clicks, 0),
    totalConversions: records.reduce((s, r) => s + (r.conversions ?? 0), 0),
    totalRevenue: records.reduce((s, r) => s + (r.revenue ?? 0), 0),
    performanceRecordCount: records.length,
    openTaskCount: tasks.filter((t) => t.status === "open" || t.status === "in_progress").length,
    criticalTaskCount: tasks.filter((t) => t.priority === "critical" && t.status !== "done" && t.status !== "dismissed").length,
  }
}

// ---------------------------------------------------------------------------
// Campaign links
// ---------------------------------------------------------------------------

const CAMPAIGN_LINK_SELECT =
  "id, product_id, name, channel, campaign_name, source, medium, term, content, base_url, final_url, notes, status, created_at, updated_at, products(name)"

export async function createCampaignLink(input: CreateCampaignLinkInput): Promise<CampaignLink> {
  const supabase = await requireDatabase()

  if (!input.productId.trim()) {
    throw new Error("A product is required for a campaign link.")
  }
  if (!input.name.trim()) {
    throw new Error("Campaign link name is required.")
  }
  if (!input.channel.trim()) {
    throw new Error("Channel is required.")
  }
  if (!input.baseUrl.trim()) {
    throw new Error("Base URL is required.")
  }
  if (!input.finalUrl.trim()) {
    throw new Error("Final URL is required.")
  }

  assertValidHttpUrl(input.baseUrl, "Base URL")
  assertValidHttpUrl(input.finalUrl, "Final URL")

  const { data, error } = await supabase
    .from("campaign_links")
    .insert({
      product_id: input.productId,
      name: input.name.trim(),
      channel: input.channel.trim(),
      campaign_name: input.campaignName?.trim() || null,
      source: input.source?.trim() || null,
      medium: input.medium?.trim() || null,
      term: input.term?.trim() || null,
      content: input.content?.trim() || null,
      base_url: input.baseUrl.trim(),
      final_url: input.finalUrl.trim(),
      notes: input.notes?.trim() || null,
    })
    .select(CAMPAIGN_LINK_SELECT)
    .single()

  if (error) {
    throw new Error(`Unable to create campaign link: ${error.message}`)
  }

  return mapCampaignLink(data as CampaignLinkRow)
}

export async function listCampaignLinks(filters?: {
  status?: CampaignLinkStatus
  channel?: string
  productId?: string
}): Promise<CampaignLink[]> {
  if (!isSupabaseConfigured()) return []

  const supabase = await requireDatabase()
  let query = supabase
    .from("campaign_links")
    .select(CAMPAIGN_LINK_SELECT)
    .order("created_at", { ascending: false })

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }
  if (filters?.channel) {
    query = query.eq("channel", filters.channel)
  }
  if (filters?.productId) {
    query = query.eq("product_id", filters.productId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Unable to list campaign links: ${error.message}`)
  }

  return (data as CampaignLinkRow[]).map(mapCampaignLink)
}

export async function listCampaignLinksForProduct(productId: string): Promise<CampaignLink[]> {
  return listCampaignLinks({ productId })
}

export async function updateCampaignLinkStatus(
  linkId: string,
  status: CampaignLinkStatus,
): Promise<void> {
  const supabase = await requireDatabase()
  const { error } = await supabase
    .from("campaign_links")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", linkId)

  if (error) {
    throw new Error(`Unable to update campaign link status: ${error.message}`)
  }
}

export async function getCampaignLinkSummary(): Promise<CampaignLinkSummary> {
  if (!isSupabaseConfigured()) {
    return { total: 0, active: 0, archived: 0, withoutPerformance: 0 }
  }

  const [links, records] = await Promise.all([
    listCampaignLinks(),
    listPerformanceMetrics(),
  ])

  const linkedIds = new Set(records.filter((r) => r.campaignLinkId).map((r) => r.campaignLinkId!))
  const activeLinks = links.filter((l) => l.status === "active")

  return {
    total: links.length,
    active: activeLinks.length,
    archived: links.length - activeLinks.length,
    withoutPerformance: activeLinks.filter((l) => !linkedIds.has(l.id)).length,
  }
}

// ── Saved Views ──

interface SavedViewRow {
  id: string
  name: string
  view_type: SavedViewType
  filters: Record<string, string>
  sort: Record<string, string>
  is_default: boolean
  created_at: string
  updated_at: string
}

function mapSavedView(row: SavedViewRow): SavedView {
  return {
    id: row.id,
    name: row.name,
    viewType: row.view_type,
    filters: row.filters ?? {},
    sort: row.sort ?? {},
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const SAVED_VIEW_SELECT = "id, name, view_type, filters, sort, is_default, created_at, updated_at"

export async function createSavedView(input: CreateSavedViewInput): Promise<SavedView> {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("saved_views")
    .insert({
      name: input.name,
      view_type: input.viewType,
      filters: input.filters,
      sort: input.sort ?? {},
    })
    .select(SAVED_VIEW_SELECT)
    .single()

  if (error) throw new Error(`Failed to create saved view: ${error.message}`)
  return mapSavedView(data as SavedViewRow)
}

export async function listSavedViews(): Promise<SavedView[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("saved_views")
    .select(SAVED_VIEW_SELECT)
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to list saved views: ${error.message}`)
  return (data as SavedViewRow[]).map(mapSavedView)
}

export async function listSavedViewsByType(viewType: SavedViewType): Promise<SavedView[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("saved_views")
    .select(SAVED_VIEW_SELECT)
    .eq("view_type", viewType)
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to list saved views: ${error.message}`)
  return (data as SavedViewRow[]).map(mapSavedView)
}

// ---------------------------------------------------------------------------
// Data quality
// ---------------------------------------------------------------------------

async function getDraftVersionCounts(drafts: Draft[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>()

  await Promise.all(
    drafts.map(async (draft) => {
      const versions = await listDraftVersions(draft.id)
      counts.set(draft.id, versions.length)
    }),
  )

  return counts
}

export async function getDataQualityIssues(): Promise<DataQualityIssue[]> {
  if (!isSupabaseConfigured()) return []

  const [
    products,
    drafts,
    campaignLinks,
    performanceMetrics,
    improvementTasks,
    savedViews,
    affiliatePrograms,
  ] = await Promise.all([
    listProducts(),
    listDrafts(),
    listCampaignLinks(),
    listPerformanceMetrics(),
    listImprovementTasks(),
    listSavedViews(),
    listAffiliatePrograms(),
  ])

  const versionCounts = await getDraftVersionCounts(drafts)

  return buildDataQualityIssues({
    products,
    drafts,
    versionCounts,
    campaignLinks,
    performanceMetrics,
    improvementTasks,
    savedViews,
    affiliatePrograms,
  })
}

export async function getDataQualitySummary(): Promise<DataQualitySummary> {
  return summarizeDataQuality(await getDataQualityIssues())
}

export async function getOperatorActionItems(options?: { limit?: number }): Promise<ActionItem[]> {
  if (!isSupabaseConfigured()) return []

  const [
    dataQualityIssues,
    improvementTasks,
    recommendations,
    performanceInsights,
    drafts,
    products,
    campaignLinks,
    performanceMetrics,
    affiliatePrograms,
  ] = await Promise.all([
    getDataQualityIssues(),
    listImprovementTasks(),
    listRecommendations(),
    getPerformanceInsights(),
    listDrafts(),
    listProducts(),
    listCampaignLinks(),
    listPerformanceMetrics(),
    listAffiliatePrograms(),
  ])

  return buildOperatorActionItems({
    dataQualityIssues,
    improvementTasks,
    recommendations,
    performanceInsights,
    drafts,
    products,
    campaignLinks,
    performanceMetrics,
    affiliatePrograms,
    limit: options?.limit,
  })
}

export async function getOperatorActionSummary(): Promise<OperatorActionSummary> {
  return summarizeActionItems(await getOperatorActionItems())
}

export async function getSavedView(id: string): Promise<SavedView | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("saved_views")
    .select(SAVED_VIEW_SELECT)
    .eq("id", id)
    .single()

  if (error) return null
  return mapSavedView(data as SavedViewRow)
}

export async function deleteSavedView(id: string): Promise<void> {
  const supabase = getServiceRoleSupabase()
  const { error } = await supabase
    .from("saved_views")
    .delete()
    .eq("id", id)

  if (error) throw new Error(`Failed to delete saved view: ${error.message}`)
}

export async function setDefaultSavedView(id: string, viewType: SavedViewType): Promise<void> {
  const supabase = getServiceRoleSupabase()

  // Unset existing defaults for this view type
  const { error: unsetError } = await supabase
    .from("saved_views")
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("view_type", viewType)
    .eq("is_default", true)

  if (unsetError) throw new Error(`Failed to unset default: ${unsetError.message}`)

  // Set the new default
  const { error: setError } = await supabase
    .from("saved_views")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (setError) throw new Error(`Failed to set default: ${setError.message}`)
}

export async function getDefaultSavedView(viewType: SavedViewType): Promise<SavedView | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("saved_views")
    .select(SAVED_VIEW_SELECT)
    .eq("view_type", viewType)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return mapSavedView(data as SavedViewRow)
}

// ── Affiliate Programs ──────────────────────────────────────────────

interface AffiliateProgramRow {
  id: string
  product_id: string | null
  program_name: string
  program_url: string | null
  signup_url: string | null
  dashboard_url: string | null
  network: string | null
  commission_summary: string | null
  cookie_duration: string | null
  approval_type: string
  status: string
  affiliate_link: string | null
  notes: string | null
  last_checked_at: string | null
  created_at: string
  updated_at: string
  products?: { name: string } | { name: string }[] | null
}

const AFFILIATE_PROGRAM_SELECT =
  "id, product_id, program_name, program_url, signup_url, dashboard_url, network, commission_summary, cookie_duration, approval_type, status, affiliate_link, notes, last_checked_at, created_at, updated_at, products(name)"

function mapAffiliateProgram(row: AffiliateProgramRow): AffiliateProgram {
  return {
    id: row.id,
    productId: row.product_id,
    productName: Array.isArray(row.products)
      ? (row.products[0]?.name ?? null)
      : (row.products?.name ?? null),
    programName: row.program_name,
    programUrl: row.program_url,
    signupUrl: row.signup_url,
    dashboardUrl: row.dashboard_url,
    network: row.network,
    commissionSummary: row.commission_summary,
    cookieDuration: row.cookie_duration,
    approvalType: row.approval_type as AffiliateProgram["approvalType"],
    status: row.status as AffiliateProgram["status"],
    affiliateLink: row.affiliate_link,
    notes: row.notes,
    lastCheckedAt: row.last_checked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listAffiliatePrograms(filters?: {
  status?: AffiliateProgramStatus
  approvalType?: AffiliateProgramApprovalType
  network?: string
  productId?: string
}): Promise<AffiliateProgram[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()
  let query = supabase
    .from("affiliate_programs")
    .select(AFFILIATE_PROGRAM_SELECT)
    .order("created_at", { ascending: false })

  if (filters?.status) query = query.eq("status", filters.status)
  if (filters?.approvalType) query = query.eq("approval_type", filters.approvalType)
  if (filters?.network) query = query.eq("network", filters.network)
  if (filters?.productId) query = query.eq("product_id", filters.productId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to list affiliate programs: ${error.message}`)
  return (data ?? []).map((row) => mapAffiliateProgram(row as AffiliateProgramRow))
}

export async function listAffiliateProgramsForProduct(productId: string): Promise<AffiliateProgram[]> {
  return listAffiliatePrograms({ productId })
}

export async function getAffiliateProgramById(id: string): Promise<AffiliateProgram | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("affiliate_programs")
    .select(AFFILIATE_PROGRAM_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null
  return mapAffiliateProgram(data as AffiliateProgramRow)
}

export async function createAffiliateProgram(input: CreateAffiliateProgramInput): Promise<AffiliateProgram> {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("affiliate_programs")
    .insert({
      product_id: input.productId ?? null,
      program_name: input.programName,
      program_url: input.programUrl ?? null,
      signup_url: input.signupUrl ?? null,
      dashboard_url: input.dashboardUrl ?? null,
      network: input.network ?? null,
      commission_summary: input.commissionSummary ?? null,
      cookie_duration: input.cookieDuration ?? null,
      approval_type: input.approvalType ?? "unknown",
      status: input.status ?? "research_needed",
      affiliate_link: input.affiliateLink ?? null,
      notes: input.notes ?? null,
    })
    .select(AFFILIATE_PROGRAM_SELECT)
    .single()

  if (error) throw new Error(`Failed to create affiliate program: ${error.message}`)
  return mapAffiliateProgram(data as AffiliateProgramRow)
}

export async function updateAffiliateProgramStatus(
  id: string,
  status: AffiliateProgramStatus,
): Promise<void> {
  const supabase = getServiceRoleSupabase()
  const { error } = await supabase
    .from("affiliate_programs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(`Failed to update affiliate program status: ${error.message}`)
}

export async function updateAffiliateProgramLink(
  id: string,
  affiliateLink: string,
): Promise<void> {
  const supabase = getServiceRoleSupabase()
  const { error } = await supabase
    .from("affiliate_programs")
    .update({
      affiliate_link: affiliateLink,
      status: "link_ready",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw new Error(`Failed to update affiliate link: ${error.message}`)
}

export async function getAffiliateProgramSummary(): Promise<AffiliateProgramSummary> {
  if (!isSupabaseConfigured()) {
    return { total: 0, researchNeeded: 0, signupNeeded: 0, awaitingHumanApproval: 0, submitted: 0, approved: 0, rejected: 0, closed: 0, linkReady: 0 }
  }
  const programs = await listAffiliatePrograms()
  return {
    total: programs.length,
    researchNeeded: programs.filter((p) => p.status === "research_needed").length,
    signupNeeded: programs.filter((p) => p.status === "signup_needed").length,
    awaitingHumanApproval: programs.filter((p) => p.status === "awaiting_human_approval").length,
    submitted: programs.filter((p) => p.status === "submitted").length,
    approved: programs.filter((p) => p.status === "approved").length,
    rejected: programs.filter((p) => p.status === "rejected").length,
    closed: programs.filter((p) => p.status === "closed").length,
    linkReady: programs.filter((p) => p.status === "link_ready").length,
  }
}

// ── Approval Items ─────────────────────────────────────────────────

interface ApprovalItemRow {
  id: string
  product_id: string | null
  approval_type: string
  platform: string | null
  title: string
  description: string | null
  content_preview: string | null
  campaign_link_url: string | null
  disclosure_present: boolean
  status: string
  operator_notes: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  products?: { name: string } | { name: string }[] | null
}

const APPROVAL_ITEM_SELECT =
  "id, product_id, approval_type, platform, title, description, content_preview, campaign_link_url, disclosure_present, status, operator_notes, resolved_at, created_at, updated_at, products(name)"

function mapApprovalItem(row: ApprovalItemRow): ApprovalItem {
  return {
    id: row.id,
    productId: row.product_id,
    productName: Array.isArray(row.products)
      ? (row.products[0]?.name ?? null)
      : (row.products?.name ?? null),
    approvalType: row.approval_type as ApprovalItem["approvalType"],
    platform: row.platform,
    title: row.title,
    description: row.description,
    contentPreview: row.content_preview,
    campaignLinkUrl: row.campaign_link_url,
    disclosurePresent: row.disclosure_present,
    status: row.status as ApprovalItem["status"],
    operatorNotes: row.operator_notes,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listApprovalItems(filters?: {
  status?: ApprovalItemStatus
  approvalType?: ApprovalItemType
}): Promise<ApprovalItem[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()
  let query = supabase
    .from("approval_items")
    .select(APPROVAL_ITEM_SELECT)
    .order("created_at", { ascending: false })

  if (filters?.status) query = query.eq("status", filters.status)
  if (filters?.approvalType) query = query.eq("approval_type", filters.approvalType)

  const { data, error } = await query
  if (error) throw new Error(`Failed to list approval items: ${error.message}`)
  return (data ?? []).map((row) => mapApprovalItem(row as ApprovalItemRow))
}

export async function getApprovalItemById(id: string): Promise<ApprovalItem | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("approval_items")
    .select(APPROVAL_ITEM_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null
  return mapApprovalItem(data as ApprovalItemRow)
}

export async function createApprovalItem(input: CreateApprovalItemInput): Promise<ApprovalItem> {
  const supabase = getServiceRoleSupabase()

  if (isPublishApprovalType(input.approvalType)) {
    const fingerprint = buildPostApprovalFingerprint(input)
    const { data: existing, error: existingError } = await supabase
      .from("approval_items")
      .select(APPROVAL_ITEM_SELECT)
      .eq("product_id", input.productId ?? null)
      .eq("platform", input.platform ?? null)
      .like("approval_type", "publish_%")
      .order("created_at", { ascending: false })

    if (existingError) {
      throw new Error(`Failed to check existing approval items: ${existingError.message}`)
    }

    const duplicate = (existing ?? [])
      .map((row) => mapApprovalItem(row as ApprovalItemRow))
      .find((item) => buildPostApprovalFingerprint(item) === fingerprint)

    if (duplicate) return duplicate
  }

  const { data, error } = await supabase
    .from("approval_items")
    .insert({
      product_id: input.productId ?? null,
      approval_type: input.approvalType,
      platform: input.platform ?? null,
      title: input.title,
      description: input.description ?? null,
      content_preview: input.contentPreview ?? null,
      campaign_link_url: input.campaignLinkUrl ?? null,
      disclosure_present: input.disclosurePresent ?? false,
      status: input.status ?? "waiting_approval",
    })
    .select(APPROVAL_ITEM_SELECT)
    .single()

  if (error) throw new Error(`Failed to create approval item: ${error.message}`)
  return mapApprovalItem(data as ApprovalItemRow)
}

export async function updateApprovalItemStatus(
  id: string,
  status: ApprovalItemStatus,
  operatorNotes?: string | null,
): Promise<void> {
  const supabase = getServiceRoleSupabase()
  const isResolved = status === "approved" || status === "rejected" || status === "published"
  const { error } = await supabase
    .from("approval_items")
    .update({
      status,
      operator_notes: operatorNotes ?? null,
      resolved_at: isResolved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw new Error(`Failed to update approval item status: ${error.message}`)
}

export async function countPendingApprovalItems(): Promise<number> {
  if (!isSupabaseConfigured()) return 0
  const supabase = getServiceRoleSupabase()
  const { count, error } = await supabase
    .from("approval_items")
    .select("id", { count: "exact", head: true })
    .eq("status", "waiting_approval")

  if (error) return 0
  return count ?? 0
}

export async function getApprovalItemSummary(): Promise<ApprovalItemSummary> {
  if (!isSupabaseConfigured()) {
    return { total: 0, waitingApproval: 0, approved: 0, rejected: 0, published: 0, needsChanges: 0 }
  }
  const items = await listApprovalItems()
  return {
    total: items.length,
    waitingApproval: items.filter((i) => i.status === "waiting_approval").length,
    approved: items.filter((i) => i.status === "approved").length,
    rejected: items.filter((i) => i.status === "rejected").length,
    published: items.filter((i) => i.status === "published").length,
    needsChanges: items.filter((i) => i.status === "needs_changes").length,
  }
}

// ── Campaigns ──────────────────────────────────────────────────────

interface CampaignRow {
  id: string
  name: string
  product_id: string
  channel: string
  status: CampaignStatus
  notes: string | null
  created_at: string
  updated_at: string
  products?: { name: string; affiliate_url: string } | Array<{ name: string; affiliate_url: string }> | null
  content_drafts?: Array<{ id: string }> | null
}

function mapCampaign(row: CampaignRow): Campaign {
  const productRecord = Array.isArray(row.products) ? row.products[0] : row.products
  const draftCount = Array.isArray(row.content_drafts) ? row.content_drafts.length : 0
  const affiliateUrl = productRecord?.affiliate_url ?? ""

  let suggestedTrackingUrl: string | null = null
  if (affiliateUrl) {
    const result = buildCampaignTrackingUrl(affiliateUrl, row.channel, row.name)
    if (result.valid) suggestedTrackingUrl = result.finalUrl
  }

  return {
    id: row.id,
    name: row.name,
    productId: row.product_id,
    productName: productRecord?.name ?? "Unknown product",
    channel: row.channel,
    status: row.status,
    notes: row.notes,
    suggestedTrackingUrl,
    draftCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const CAMPAIGN_SELECT =
  "id, name, product_id, channel, status, notes, created_at, updated_at, products(name, affiliate_url), content_drafts(id)"

export async function listCampaigns(filters?: {
  channel?: string
  status?: CampaignStatus
  productId?: string
}): Promise<Campaign[]> {
  if (!isSupabaseConfigured()) return []

  const supabase = await requireDatabase()
  let query = supabase
    .from("campaigns")
    .select(CAMPAIGN_SELECT)
    .order("created_at", { ascending: false })

  if (filters?.channel) query = query.eq("channel", filters.channel)
  if (filters?.status) query = query.eq("status", filters.status)
  if (filters?.productId) query = query.eq("product_id", filters.productId)

  const { data, error } = await query
  if (error) throw new Error(`Unable to list campaigns: ${error.message}`)
  return (data as CampaignRow[]).map(mapCampaign)
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = await requireDatabase()
  const { data, error } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error) throw new Error(`Unable to load campaign: ${error.message}`)
  if (!data) return null
  return mapCampaign(data as CampaignRow)
}

export async function createCampaign(input: CreateCampaignInput): Promise<{ id: string }> {
  const supabase = await requireDatabase()

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name: input.name.trim(),
      product_id: input.productId,
      channel: input.channel.trim(),
      notes: input.notes?.trim() || null,
      status: "draft" as const,
    })
    .select("id")
    .single()

  if (error) throw new Error(`Unable to create campaign: ${error.message}`)
  return { id: String(data.id) }
}

export async function updateCampaignStatus(
  campaignId: string,
  status: CampaignStatus,
): Promise<void> {
  const supabase = await requireDatabase()

  const { error } = await supabase
    .from("campaigns")
    .update({ status })
    .eq("id", campaignId)

  if (error) throw new Error(`Unable to update campaign status: ${error.message}`)
}

export async function findOrCreateCampaign(
  productId: string,
  channel: string,
  productName: string,
): Promise<{ id: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.")
  }

  const existing = await listCampaigns({ productId, channel })
  const active = existing.find((c) => c.status !== "archived")
  if (active) return { id: active.id }

  return createCampaign({
    name: `${productName} - ${channel}`,
    productId,
    channel,
  })
}

export async function getCampaignSummary(): Promise<CampaignSummary> {
  if (!isSupabaseConfigured()) {
    return { total: 0, active: 0, draftsWithCampaign: 0, draftsWithoutCampaign: 0 }
  }

  const supabase = await requireDatabase()

  const [allResult, activeResult, withCampaignResult, withoutCampaignResult] = await Promise.all([
    supabase.from("campaigns").select("*", { count: "exact", head: true }),
    supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("content_drafts").select("*", { count: "exact", head: true }).not("campaign_id", "is", null),
    supabase.from("content_drafts").select("*", { count: "exact", head: true }).is("campaign_id", null),
  ])

  if (allResult.error) throw new Error(`Unable to count campaigns: ${allResult.error.message}`)
  if (activeResult.error) throw new Error(`Unable to count active campaigns: ${activeResult.error.message}`)

  return {
    total: allResult.count ?? 0,
    active: activeResult.count ?? 0,
    draftsWithCampaign: withCampaignResult.count ?? 0,
    draftsWithoutCampaign: withoutCampaignResult.count ?? 0,
  }
}

export async function listDraftsForCampaign(campaignId: string): Promise<Draft[]> {
  return (await listDrafts()).filter((d) => d.campaignId === campaignId)
}
