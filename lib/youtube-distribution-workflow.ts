import { buildUtmUrl } from "@/lib/utm-builder"
import type { CampaignLink } from "@/types/campaign-link"
import type { PerformanceMetric } from "@/types/performance"
import type { Product } from "@/types/product"
import type {
  DistributionPostingMethod,
  YouTubeDistributionStatus,
  YouTubeDistributionWorkflow,
} from "@/types/youtube-distribution-workflow"

export interface ChannelDistributionPerformanceSummary {
  channel: "youtube" | "reddit" | "quora" | "medium"
  clicks: number
  conversions: number
  revenue: number
}

export interface YouTubeDistributionWorkflowView {
  status: YouTubeDistributionStatus | null
  statusLabel: string
  statusVariant: "default" | "secondary" | "outline"
  nextAction: string
  trackingScopeLabel: string
  youtubeViews: number | null
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  suggestedCampaignLinkUrl: string
  activeCampaignLink: CampaignLink | null
  performanceByChannel: ChannelDistributionPerformanceSummary[]
  values: {
    status: YouTubeDistributionStatus
    youtubePostingMethod: DistributionPostingMethod
    redditPostingMethod: DistributionPostingMethod
    quoraPostingMethod: DistributionPostingMethod
    mediumPostingMethod: DistributionPostingMethod
    youtubeVideoIdea: string
    youtubeTitle: string
    thumbnailAngle: string
    shortScript: string
    longVideoOutline: string
    descriptionWithDisclosure: string
    pinnedCommentText: string
    redditVariantA: string
    redditVariantB: string
    quoraVariantA: string
    quoraVariantB: string
    mediumVariant: string
    recommendedCta: string
    youtubeUrl: string
    redditSharedUrl: string
    quoraSharedUrl: string
    mediumSharedUrl: string
    youtubeViews: string
    campaignLinkId: string
    campaignLinkUrl: string
    notes: string
  }
}

function text(value: string | null | undefined) {
  return value?.trim() ?? ""
}

function sentenceCase(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return ""
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function getPositioning(product: Product) {
  return (
    product.contentAngle?.trim() ||
    product.targetKeyword?.trim() ||
    product.searchIntent?.trim() ||
    `${product.name} for practical buyer evaluation`
  )
}

function getAudience(product: Product) {
  if (product.targetKeyword?.toLowerCase().includes("small")) {
    return "small teams comparing tools before buying"
  }
  if (product.searchIntent?.toLowerCase().includes("commercial")) {
    return "buyers already evaluating options"
  }
  return "operators trying to decide whether the product is worth testing"
}

function getProblemStatement(product: Product) {
  if (product.notes?.trim()) {
    return product.notes.trim().replace(/\s+/g, " ")
  }
  return product.contentAngle?.trim() || "why this product might fit the workflow better than the obvious alternatives"
}

function buildSuggestedIdea(product: Product) {
  return `Show ${product.name} for ${getAudience(product)} with a focus on ${getProblemStatement(product)}.`
}

function buildSuggestedTitle(product: Product) {
  if (product.targetKeyword?.trim()) {
    return sentenceCase(product.targetKeyword)
  }

  return `${product.name} Review: Who It Fits and Where It Breaks`
}

function buildSuggestedThumbnailAngle(product: Product) {
  const audience = getAudience(product)
  return `Clear tradeoff frame for ${audience}: “Worth it?” + one strong use-case headline.`
}

function buildSuggestedShortScript(product: Product) {
  const positioning = getPositioning(product)
  return [
    `Hook: If you're evaluating ${product.name}, here is the fast version before you waste time.`,
    `Problem: Most buyers struggle to judge ${positioning}.`,
    `Body: Show the main use case, one useful strength, one real limitation, and who should skip it.`,
    `CTA: Watch the full breakdown, then use the tracked link in the description if it fits your workflow.`,
    `Disclosure: This video may include affiliate links, which may earn a commission at no extra cost.`,
  ].join("\n")
}

function buildSuggestedLongOutline(product: Product) {
  const positioning = getPositioning(product)
  return [
    `1. Hook: why ${product.name} is worth evaluating now.`,
    `2. Who this is for: ${getAudience(product)}.`,
    `3. What problem it helps with: ${positioning}.`,
    "4. Demo or walkthrough points: setup, core workflow, and one real constraint.",
    "5. Comparison frame: where it wins, where an alternative may be better.",
    "6. Closing CTA: point to the description link and remind viewers to verify fit before buying.",
  ].join("\n")
}

function buildSuggestedDescription(product: Product, cta: string) {
  return [
    `${product.name} walkthrough for buyers evaluating the tool in a real workflow.`,
    "",
    cta,
    "",
    "Affiliate disclosure: This description may include affiliate links. If you buy through them, I may earn a commission at no extra cost to you.",
    "Verify pricing, features, and availability before making a decision.",
  ].join("\n")
}

function buildSuggestedPinnedComment(cta: string) {
  return [
    "Quick note: this video may include affiliate links.",
    cta,
    "If you have a more specific use case, reply with it before you buy anything.",
  ].join("\n")
}

function buildSuggestedRedditVariant(product: Product, mode: "post" | "answer") {
  const title = buildSuggestedTitle(product)
  const disclosure = "Disclosure: the linked video/description may include affiliate links."

  if (mode === "post") {
    return [
      `I put together a short ${product.name} breakdown because I kept seeing the same questions come up.`,
      `Main takeaway: ${title}.`,
      "I would only use it if the workflow fit is clear.",
      "If the video helps, I can answer follow-up questions here instead of pushing a hard sell.",
      disclosure,
    ].join("\n\n")
  }

  return [
    `If you're comparing ${product.name}, the fastest way to judge it is to watch a short walkthrough before clicking any buy link.`,
    `I would look at setup effort, limitations, and whether the workflow in the video matches your use case.`,
    disclosure,
  ].join("\n\n")
}

function buildSuggestedMediumVariant(product: Product, cta: string) {
  return [
    `${product.name}: YouTube-first evaluation and next steps`,
    "",
    `This post supports the YouTube walkthrough for ${product.name}.`,
    `Use it when the normal extension flow does not work and a manual browser post is the safer path.`,
    "",
    cta,
    "",
    "Affiliate disclosure: This article may include affiliate links, which may earn a commission at no extra cost to you.",
  ].join("\n")
}

function normalizeDistributionChannel(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized.includes("youtube")) return "youtube"
  if (normalized.includes("reddit")) return "reddit"
  if (normalized.includes("quora")) return "quora"
  if (normalized.includes("medium")) return "medium"
  return null
}

function buildPerformanceByChannel(records: PerformanceMetric[]): ChannelDistributionPerformanceSummary[] {
  const summary = new Map<ChannelDistributionPerformanceSummary["channel"], ChannelDistributionPerformanceSummary>()
  const orderedChannels: ChannelDistributionPerformanceSummary["channel"][] = [
    "youtube",
    "reddit",
    "quora",
    "medium",
  ]

  for (const record of records) {
    const channel = normalizeDistributionChannel(record.channel)
    if (!channel) continue

    const current = summary.get(channel) ?? {
      channel,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    }

    current.clicks += record.clicks
    current.conversions += record.conversions ?? 0
    current.revenue += record.revenue ?? 0
    summary.set(channel, current)
  }

  return orderedChannels
    .map((channel) =>
      summary.get(channel) ?? {
        channel,
        clicks: 0,
        conversions: 0,
        revenue: 0,
      },
    )
}

function getStatusMeta(status: YouTubeDistributionStatus | null) {
  switch (status) {
    case "tracking":
      return { label: "Tracking", variant: "default" as const }
    case "shared_medium":
      return { label: "Shared on Medium", variant: "secondary" as const }
    case "shared_quora":
      return { label: "Shared on Quora", variant: "secondary" as const }
    case "shared_reddit":
      return { label: "Shared on Reddit", variant: "secondary" as const }
    case "published_youtube":
      return { label: "Published on YouTube", variant: "secondary" as const }
    case "scripted":
      return { label: "Scripted", variant: "outline" as const }
    default:
      return { label: "Not saved yet", variant: "outline" as const }
  }
}

function buildNextAction(input: {
  workflow: YouTubeDistributionWorkflow | null
  scopedRecords: PerformanceMetric[]
}) {
  const workflow = input.workflow

  if (!workflow) return "Save the YouTube-first plan and tighten the first video angle."
  if (!text(workflow.youtubeUrl)) return "Publish the YouTube video and save the live URL."
  if (!text(workflow.redditSharedUrl)) return "Share the YouTube URL manually in one relevant Reddit thread."
  if (!text(workflow.quoraSharedUrl)) return "Publish a Quora answer that points to the YouTube video."
  if (text(workflow.mediumVariant) && !text(workflow.mediumSharedUrl)) {
    return "Post the Medium/manual browser version only if the normal extension flow does not work."
  }
  if (workflow.youtubeViews === null) return "Update YouTube views after the first distribution cycle."
  if (input.scopedRecords.length === 0) return "Record clicks and conversions for this distribution cycle."
  return "Review the tracked results and decide whether to iterate the video, CTA, or distribution copy."
}

function preferredCampaignLink(product: Product, campaignLinks: CampaignLink[]) {
  const activeYouTubeLink =
    campaignLinks.find((link) => link.status === "active" && link.channel.trim().toLowerCase() === "youtube") ??
    null

  const suggested = buildUtmUrl(product.affiliateUrl, {
    utmSource: "youtube",
    utmMedium: "video",
    utmCampaign: `${product.slug}-youtube-distribution`,
    utmContent: "description",
  })

  return {
    activeCampaignLink: activeYouTubeLink,
    suggestedCampaignLinkUrl: activeYouTubeLink?.finalUrl ?? suggested.finalUrl,
  }
}

export function buildYouTubeDistributionWorkflowView(input: {
  product: Product
  workflow: YouTubeDistributionWorkflow | null
  campaignLinks: CampaignLink[]
  records: PerformanceMetric[]
}): YouTubeDistributionWorkflowView {
  const { activeCampaignLink, suggestedCampaignLinkUrl } = preferredCampaignLink(
    input.product,
    input.campaignLinks,
  )
  const trackingRecords = input.workflow?.campaignLinkId
    ? input.records.filter((record) => record.campaignLinkId === input.workflow?.campaignLinkId)
    : input.records
  const performanceByChannel = buildPerformanceByChannel(trackingRecords)
  const totalClicks = trackingRecords.reduce((sum, record) => sum + record.clicks, 0)
  const totalConversions = trackingRecords.reduce((sum, record) => sum + (record.conversions ?? 0), 0)
  const totalRevenue = trackingRecords.reduce((sum, record) => sum + (record.revenue ?? 0), 0)
  const recommendedCta =
    input.workflow?.recommendedCta?.trim() ||
    `Watch the full breakdown, then use this tracked link if ${input.product.name} fits your workflow: ${suggestedCampaignLinkUrl}`
  const statusMeta = getStatusMeta(input.workflow?.status ?? null)

  return {
    status: input.workflow?.status ?? null,
    statusLabel: statusMeta.label,
    statusVariant: statusMeta.variant,
    nextAction: buildNextAction({ workflow: input.workflow, scopedRecords: trackingRecords }),
    trackingScopeLabel: input.workflow?.campaignLinkId ? "Tracking scoped to the selected campaign link." : "Tracking uses all performance records for this product.",
    youtubeViews: input.workflow?.youtubeViews ?? null,
    totalClicks,
    totalConversions,
    totalRevenue,
    suggestedCampaignLinkUrl,
    activeCampaignLink,
    performanceByChannel,
    values: {
      status: input.workflow?.status ?? "scripted",
      youtubePostingMethod: input.workflow?.youtubePostingMethod ?? "browser",
      redditPostingMethod: input.workflow?.redditPostingMethod ?? "browser",
      quoraPostingMethod: input.workflow?.quoraPostingMethod ?? "browser",
      mediumPostingMethod: input.workflow?.mediumPostingMethod ?? "manual",
      youtubeVideoIdea: input.workflow?.youtubeVideoIdea ?? buildSuggestedIdea(input.product),
      youtubeTitle: input.workflow?.youtubeTitle ?? buildSuggestedTitle(input.product),
      thumbnailAngle: input.workflow?.thumbnailAngle ?? buildSuggestedThumbnailAngle(input.product),
      shortScript: input.workflow?.shortScript ?? buildSuggestedShortScript(input.product),
      longVideoOutline: input.workflow?.longVideoOutline ?? buildSuggestedLongOutline(input.product),
      descriptionWithDisclosure:
        input.workflow?.descriptionWithDisclosure ?? buildSuggestedDescription(input.product, recommendedCta),
      pinnedCommentText: input.workflow?.pinnedCommentText ?? buildSuggestedPinnedComment(recommendedCta),
      redditVariantA: input.workflow?.redditVariantA ?? buildSuggestedRedditVariant(input.product, "post"),
      redditVariantB: input.workflow?.redditVariantB ?? buildSuggestedRedditVariant(input.product, "answer"),
      quoraVariantA: input.workflow?.quoraVariantA ?? buildSuggestedRedditVariant(input.product, "answer"),
      quoraVariantB:
        input.workflow?.quoraVariantB ??
        `Answer the core buyer question, embed the YouTube link naturally, and keep the affiliate disclosure clear.`,
      mediumVariant: input.workflow?.mediumVariant ?? buildSuggestedMediumVariant(input.product, recommendedCta),
      recommendedCta,
      youtubeUrl: input.workflow?.youtubeUrl ?? "",
      redditSharedUrl: input.workflow?.redditSharedUrl ?? "",
      quoraSharedUrl: input.workflow?.quoraSharedUrl ?? "",
      mediumSharedUrl: input.workflow?.mediumSharedUrl ?? "",
      youtubeViews: input.workflow?.youtubeViews === null || input.workflow?.youtubeViews === undefined ? "" : String(input.workflow.youtubeViews),
      campaignLinkId: input.workflow?.campaignLinkId ?? activeCampaignLink?.id ?? "",
      campaignLinkUrl: input.workflow?.campaignLinkUrl ?? activeCampaignLink?.finalUrl ?? suggestedCampaignLinkUrl,
      notes: input.workflow?.notes ?? "",
    },
  }
}
