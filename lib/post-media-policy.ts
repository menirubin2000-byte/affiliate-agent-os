import type { CampaignPlatform } from "@/types/campaign-workflow"

export const IMAGE_REQUIRED_PLATFORMS: CampaignPlatform[] = [
  "facebook_page",
  "instagram_professional",
  "pinterest",
  "linkedin",
  "medium",
  "substack",
  "quora",
  "reddit",
  "x_twitter",
]

export const VIDEO_REQUIRED_PLATFORMS: CampaignPlatform[] = ["tiktok", "youtube"]

const imagePlatforms = new Set<string>(IMAGE_REQUIRED_PLATFORMS)
const videoPlatforms = new Set<string>(VIDEO_REQUIRED_PLATFORMS)

export type MediaSource =
  | "final_copy.media_asset_url"
  | "final_copy.image_url"
  | "final_copy.image_asset_path"
  | "product.image_url_he"
  | "product.image_url"
  | "product.video_url"
  | "none"

export type PostMediaGateInput = {
  platform: string
  language?: string | null
  finalCopy?: {
    media_asset_url?: string | null
    image_url?: string | null
    image_asset_path?: string | null
    video_asset_path?: string | null
  } | null
  product?: {
    image_url?: string | null
    image_url_he?: string | null
    image_status?: string | null
    video_url?: string | null
    video_status?: string | null
  } | null
}

export type PostMediaGate = {
  imageRequired: boolean
  videoRequired: boolean
  mediaRequired: boolean
  mediaReady: boolean
  mediaUrl: string | null
  imageUrl: string | null
  videoUrl: string | null
  imageSource: MediaSource
  missingReason: string | null
  blockingReason: string | null
  mediaStatus: "ready" | "missing_image" | "missing_video" | "not_required"
}

export function requiresImageForPost(platform: string) {
  return imagePlatforms.has(platform)
}

export function requiresVideoForPost(platform: string) {
  return videoPlatforms.has(platform)
}

export function evaluatePostMediaGate(input: PostMediaGateInput): PostMediaGate {
  const imageRequired = requiresImageForPost(input.platform)
  const videoRequired = requiresVideoForPost(input.platform)
  const image = pickImage(input)
  const video = pickVideo(input)

  if (imageRequired && !image.url) {
    return {
      imageRequired,
      videoRequired,
      mediaRequired: true,
      mediaReady: false,
      mediaUrl: null,
      imageUrl: null,
      videoUrl: video.url,
      imageSource: "none",
      missingReason: "needs_image_generation_or_upload",
      blockingReason: "image_required_for_ready",
      mediaStatus: "missing_image",
    }
  }

  if (videoRequired && !video.url) {
    return {
      imageRequired,
      videoRequired,
      mediaRequired: true,
      mediaReady: false,
      mediaUrl: null,
      imageUrl: image.url,
      videoUrl: null,
      imageSource: image.source,
      missingReason: "needs_video_upload",
      blockingReason: "video_required_for_ready",
      mediaStatus: "missing_video",
    }
  }

  return {
    imageRequired,
    videoRequired,
    mediaRequired: imageRequired || videoRequired,
    mediaReady: true,
    mediaUrl: videoRequired ? video.url : image.url,
    imageUrl: image.url,
    videoUrl: video.url,
    imageSource: image.source,
    missingReason: null,
    blockingReason: null,
    mediaStatus: imageRequired || videoRequired ? "ready" : "not_required",
  }
}

function pickImage(input: PostMediaGateInput): { url: string | null; source: MediaSource } {
  const finalCopy = input.finalCopy
  const product = input.product
  const candidates: Array<{ url?: string | null; source: MediaSource }> = [
    { url: finalCopy?.media_asset_url, source: "final_copy.media_asset_url" },
    { url: finalCopy?.image_url, source: "final_copy.image_url" },
    { url: finalCopy?.image_asset_path, source: "final_copy.image_asset_path" },
  ]

  if (input.language === "he") {
    candidates.push(
      { url: product?.image_url_he, source: "product.image_url_he" },
      { url: product?.image_url, source: "product.image_url" },
    )
  } else {
    candidates.push(
      { url: product?.image_url, source: "product.image_url" },
      { url: product?.image_url_he, source: "product.image_url_he" },
    )
  }

  const found = candidates.find((candidate) => Boolean(candidate.url?.trim()))
  return found ? { url: found.url?.trim() ?? null, source: found.source } : { url: null, source: "none" }
}

function pickVideo(input: PostMediaGateInput): { url: string | null; source: MediaSource } {
  const video = input.finalCopy?.video_asset_path?.trim() || input.product?.video_url?.trim() || null
  return { url: video, source: video ? "product.video_url" : "none" }
}

// ---------------------------------------------------------------------------
// Language–media consistency validation
// ---------------------------------------------------------------------------

export type LanguageConsistencyInput = {
  language: string | null | undefined
  imageUrl: string | null | undefined
  product?: {
    image_url?: string | null
    image_url_he?: string | null
  } | null
}

export type LanguageConsistencyResult = {
  consistent: boolean
  reason: string | null
}

/**
 * Checks that the image attached to a final copy matches the copy language.
 *
 * If the product provides both `image_url` (EN) and `image_url_he` (HE) and they
 * differ, the image on the final copy MUST match the one for its language.
 * A Hebrew copy using the English image (or vice-versa) returns inconsistent.
 */
export function validateLanguageMediaConsistency(input: LanguageConsistencyInput): LanguageConsistencyResult {
  const { language, imageUrl, product } = input
  if (!language || !imageUrl || !product) return { consistent: true, reason: null }

  const enImage = product.image_url?.trim() || null
  const heImage = product.image_url_he?.trim() || null

  if (!enImage || !heImage || enImage === heImage) return { consistent: true, reason: null }

  if (language === "en" && imageUrl === heImage) {
    return { consistent: false, reason: "language_mismatch_media_copy" }
  }
  if (language === "he" && imageUrl === enImage) {
    return { consistent: false, reason: "language_mismatch_media_copy" }
  }

  return { consistent: true, reason: null }
}
