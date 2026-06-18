import "server-only"

import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import type {
  UpsertYouTubeDistributionWorkflowInput,
  YouTubeDistributionWorkflow,
} from "@/types/youtube-distribution-workflow"

type YouTubeDistributionWorkflowRow = {
  id: string
  product_id: string
  status: YouTubeDistributionWorkflow["status"]
  youtube_posting_method: YouTubeDistributionWorkflow["youtubePostingMethod"]
  reddit_posting_method: YouTubeDistributionWorkflow["redditPostingMethod"]
  quora_posting_method: YouTubeDistributionWorkflow["quoraPostingMethod"]
  medium_posting_method: YouTubeDistributionWorkflow["mediumPostingMethod"]
  youtube_video_idea: string | null
  youtube_title: string | null
  thumbnail_angle: string | null
  short_script: string | null
  long_video_outline: string | null
  description_with_disclosure: string | null
  pinned_comment_text: string | null
  reddit_variant_a: string | null
  reddit_variant_b: string | null
  quora_variant_a: string | null
  quora_variant_b: string | null
  medium_variant: string | null
  recommended_cta: string | null
  youtube_url: string | null
  reddit_shared_url: string | null
  quora_shared_url: string | null
  medium_shared_url: string | null
  youtube_views: number | null
  campaign_link_id: string | null
  campaign_link_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

const YOUTUBE_DISTRIBUTION_WORKFLOW_SELECT = `
  id,
  product_id,
  status,
  youtube_posting_method,
  reddit_posting_method,
  quora_posting_method,
  medium_posting_method,
  youtube_video_idea,
  youtube_title,
  thumbnail_angle,
  short_script,
  long_video_outline,
  description_with_disclosure,
  pinned_comment_text,
  reddit_variant_a,
  reddit_variant_b,
  quora_variant_a,
  quora_variant_b,
  medium_variant,
  recommended_cta,
  youtube_url,
  reddit_shared_url,
  quora_shared_url,
  medium_shared_url,
  youtube_views,
  campaign_link_id,
  campaign_link_url,
  notes,
  created_at,
  updated_at
`

function isMissingWorkflowTableError(message: string | undefined) {
  const normalized = message?.toLowerCase() ?? ""
  return normalized.includes("youtube_distribution_workflows") || normalized.includes("relation")
}

function nullableText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function mapRow(row: YouTubeDistributionWorkflowRow): YouTubeDistributionWorkflow {
  return {
    id: row.id,
    productId: row.product_id,
    status: row.status,
    youtubePostingMethod: row.youtube_posting_method,
    redditPostingMethod: row.reddit_posting_method,
    quoraPostingMethod: row.quora_posting_method,
    mediumPostingMethod: row.medium_posting_method,
    youtubeVideoIdea: row.youtube_video_idea,
    youtubeTitle: row.youtube_title,
    thumbnailAngle: row.thumbnail_angle,
    shortScript: row.short_script,
    longVideoOutline: row.long_video_outline,
    descriptionWithDisclosure: row.description_with_disclosure,
    pinnedCommentText: row.pinned_comment_text,
    redditVariantA: row.reddit_variant_a,
    redditVariantB: row.reddit_variant_b,
    quoraVariantA: row.quora_variant_a,
    quoraVariantB: row.quora_variant_b,
    mediumVariant: row.medium_variant,
    recommendedCta: row.recommended_cta,
    youtubeUrl: row.youtube_url,
    redditSharedUrl: row.reddit_shared_url,
    quoraSharedUrl: row.quora_shared_url,
    mediumSharedUrl: row.medium_shared_url,
    youtubeViews: row.youtube_views,
    campaignLinkId: row.campaign_link_id,
    campaignLinkUrl: row.campaign_link_url,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getYouTubeDistributionWorkflowByProductId(
  productId: string,
): Promise<YouTubeDistributionWorkflow | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("youtube_distribution_workflows")
    .select(YOUTUBE_DISTRIBUTION_WORKFLOW_SELECT)
    .eq("product_id", productId)
    .maybeSingle()

  if (error) {
    if (isMissingWorkflowTableError(error.message)) return null
    throw new Error(`Unable to load YouTube distribution workflow: ${error.message}`)
  }

  if (!data) return null
  return mapRow(data as YouTubeDistributionWorkflowRow)
}

export async function upsertYouTubeDistributionWorkflow(
  input: UpsertYouTubeDistributionWorkflowInput,
): Promise<YouTubeDistributionWorkflow> {
  const supabase = getServiceRoleSupabase()

  const payload = {
    product_id: input.productId,
    status: input.status,
    youtube_posting_method: input.youtubePostingMethod,
    reddit_posting_method: input.redditPostingMethod,
    quora_posting_method: input.quoraPostingMethod,
    medium_posting_method: input.mediumPostingMethod,
    youtube_video_idea: nullableText(input.youtubeVideoIdea),
    youtube_title: nullableText(input.youtubeTitle),
    thumbnail_angle: nullableText(input.thumbnailAngle),
    short_script: nullableText(input.shortScript),
    long_video_outline: nullableText(input.longVideoOutline),
    description_with_disclosure: nullableText(input.descriptionWithDisclosure),
    pinned_comment_text: nullableText(input.pinnedCommentText),
    reddit_variant_a: nullableText(input.redditVariantA),
    reddit_variant_b: nullableText(input.redditVariantB),
    quora_variant_a: nullableText(input.quoraVariantA),
    quora_variant_b: nullableText(input.quoraVariantB),
    medium_variant: nullableText(input.mediumVariant),
    recommended_cta: nullableText(input.recommendedCta),
    youtube_url: nullableText(input.youtubeUrl),
    reddit_shared_url: nullableText(input.redditSharedUrl),
    quora_shared_url: nullableText(input.quoraSharedUrl),
    medium_shared_url: nullableText(input.mediumSharedUrl),
    youtube_views: input.youtubeViews ?? null,
    campaign_link_id: nullableText(input.campaignLinkId),
    campaign_link_url: nullableText(input.campaignLinkUrl),
    notes: nullableText(input.notes),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("youtube_distribution_workflows")
    .upsert(payload, { onConflict: "product_id" })
    .select(YOUTUBE_DISTRIBUTION_WORKFLOW_SELECT)
    .single()

  if (error) {
    throw new Error(`Unable to save YouTube distribution workflow: ${error.message}`)
  }

  return mapRow(data as YouTubeDistributionWorkflowRow)
}
