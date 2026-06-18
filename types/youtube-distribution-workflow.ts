export type DistributionPostingMethod = "extension" | "browser" | "manual"

export type YouTubeDistributionStatus =
  | "scripted"
  | "published_youtube"
  | "shared_reddit"
  | "shared_quora"
  | "shared_medium"
  | "tracking"

export interface YouTubeDistributionWorkflow {
  id: string
  productId: string
  status: YouTubeDistributionStatus
  youtubePostingMethod: DistributionPostingMethod
  redditPostingMethod: DistributionPostingMethod
  quoraPostingMethod: DistributionPostingMethod
  mediumPostingMethod: DistributionPostingMethod
  youtubeVideoIdea: string | null
  youtubeTitle: string | null
  thumbnailAngle: string | null
  shortScript: string | null
  longVideoOutline: string | null
  descriptionWithDisclosure: string | null
  pinnedCommentText: string | null
  redditVariantA: string | null
  redditVariantB: string | null
  quoraVariantA: string | null
  quoraVariantB: string | null
  mediumVariant: string | null
  recommendedCta: string | null
  youtubeUrl: string | null
  redditSharedUrl: string | null
  quoraSharedUrl: string | null
  mediumSharedUrl: string | null
  youtubeViews: number | null
  campaignLinkId: string | null
  campaignLinkUrl: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface UpsertYouTubeDistributionWorkflowInput {
  productId: string
  status: YouTubeDistributionStatus
  youtubePostingMethod: DistributionPostingMethod
  redditPostingMethod: DistributionPostingMethod
  quoraPostingMethod: DistributionPostingMethod
  mediumPostingMethod: DistributionPostingMethod
  youtubeVideoIdea?: string | null
  youtubeTitle?: string | null
  thumbnailAngle?: string | null
  shortScript?: string | null
  longVideoOutline?: string | null
  descriptionWithDisclosure?: string | null
  pinnedCommentText?: string | null
  redditVariantA?: string | null
  redditVariantB?: string | null
  quoraVariantA?: string | null
  quoraVariantB?: string | null
  mediumVariant?: string | null
  recommendedCta?: string | null
  youtubeUrl?: string | null
  redditSharedUrl?: string | null
  quoraSharedUrl?: string | null
  mediumSharedUrl?: string | null
  youtubeViews?: number | null
  campaignLinkId?: string | null
  campaignLinkUrl?: string | null
  notes?: string | null
}

export const VALID_DISTRIBUTION_POSTING_METHODS: DistributionPostingMethod[] = [
  "extension",
  "browser",
  "manual",
]

export const VALID_YOUTUBE_DISTRIBUTION_STATUSES: YouTubeDistributionStatus[] = [
  "scripted",
  "published_youtube",
  "shared_reddit",
  "shared_quora",
  "shared_medium",
  "tracking",
]

export const DISTRIBUTION_POSTING_METHOD_LABELS: Record<DistributionPostingMethod, string> = {
  extension: "Extension",
  browser: "Browser",
  manual: "Manual",
}

export const YOUTUBE_DISTRIBUTION_STATUS_LABELS: Record<YouTubeDistributionStatus, string> = {
  scripted: "Scripted",
  published_youtube: "Published on YouTube",
  shared_reddit: "Shared on Reddit",
  shared_quora: "Shared on Quora",
  shared_medium: "Shared on Medium",
  tracking: "Tracking",
}
