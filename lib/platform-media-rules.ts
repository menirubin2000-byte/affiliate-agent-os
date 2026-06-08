export type PublishMediaMode = "image" | "video" | "bridge_url_only"

export type ProductMediaInput = {
  imageUrl?: string | null
  imageUrlHe?: string | null
  imageStatus?: "ready" | "missing" | string | null
  videoUrl?: string | null
  videoStatus?: "ready" | "missing" | string | null
  videoSuitableFor?: string[] | null
  image_url?: string | null
  image_url_he?: string | null
  image_status?: "ready" | "missing" | string | null
  video_url?: string | null
  video_status?: "ready" | "missing" | string | null
  video_suitable_for?: string[] | null
}

export type PlatformMediaRule = {
  platform: string
  mediaRequired: boolean
  publishMediaMode: PublishMediaMode
  imageRequired: boolean
  videoRequired: boolean
  automaticReadyAllowed: boolean
}

export type PlatformMediaReadiness = PlatformMediaRule & {
  mediaReady: boolean
  blockingReasons: string[]
  nextAction: string
}

export const IMAGE_REQUIRED_FOR_READY = [
  "linkedin",
  "facebook_page",
  "medium",
  "substack",
  "instagram_professional",
  "pinterest",
  "x_twitter",
] as const

export const VIDEO_REQUIRED_FOR_READY = ["tiktok", "youtube"] as const

export const BRIDGE_URL_ONLY_NOT_AUTO_READY = ["quora", "reddit"] as const

const imageRequiredPlatforms = new Set<string>(IMAGE_REQUIRED_FOR_READY)
const videoRequiredPlatforms = new Set<string>(VIDEO_REQUIRED_FOR_READY)
const bridgeUrlOnlyPlatforms = new Set<string>(BRIDGE_URL_ONLY_NOT_AUTO_READY)

export function getPlatformMediaRule(platform: string): PlatformMediaRule {
  const imageRequired = imageRequiredPlatforms.has(platform)
  const videoRequired = videoRequiredPlatforms.has(platform)
  const bridgeUrlOnly = bridgeUrlOnlyPlatforms.has(platform)

  return {
    platform,
    mediaRequired: imageRequired || videoRequired,
    publishMediaMode: bridgeUrlOnly ? "bridge_url_only" : videoRequired ? "video" : "image",
    imageRequired,
    videoRequired,
    automaticReadyAllowed: !bridgeUrlOnly,
  }
}

export function evaluatePlatformMediaReadiness(
  platform: string,
  product: ProductMediaInput | null | undefined,
): PlatformMediaReadiness {
  const rule = getPlatformMediaRule(platform)
  const hasImage =
    product?.imageStatus === "ready" ||
    product?.image_status === "ready" ||
    Boolean(product?.imageUrl?.trim()) ||
    Boolean(product?.imageUrlHe?.trim()) ||
    Boolean(product?.image_url?.trim()) ||
    Boolean(product?.image_url_he?.trim())
  const hasVideo =
    product?.videoStatus === "ready" ||
    product?.video_status === "ready" ||
    Boolean(product?.videoUrl?.trim()) ||
    Boolean(product?.video_url?.trim()) ||
    Boolean(product?.videoSuitableFor?.includes(platform)) ||
    Boolean(product?.video_suitable_for?.includes(platform))

  const blockingReasons: string[] = []
  if (!rule.automaticReadyAllowed) {
    blockingReasons.push("bridge_url_required")
  }
  if (rule.imageRequired && !hasImage) {
    blockingReasons.push("image_required_for_ready")
  }
  if (rule.videoRequired && !hasVideo) {
    blockingReasons.push("video_required_for_ready")
  }

  return {
    ...rule,
    mediaReady: blockingReasons.length === 0,
    blockingReasons,
    nextAction: buildNextAction(rule, blockingReasons),
  }
}

function buildNextAction(rule: PlatformMediaRule, blockingReasons: string[]) {
  if (blockingReasons.includes("bridge_url_required")) {
    return "bridge_url_required"
  }
  if (rule.imageRequired && blockingReasons.includes("image_required_for_ready")) {
    return "add_product_image"
  }
  if (rule.videoRequired && blockingReasons.includes("video_required_for_ready")) {
    return "add_product_video"
  }
  return "ready"
}
