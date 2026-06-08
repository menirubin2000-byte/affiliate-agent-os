import type { DraftStatus } from "@/types/draft"
import type { PublishingTargetPlatform } from "@/types/publishing"

export function getDraftStatusTransitionMessage(currentStatus: DraftStatus, nextStatus: DraftStatus) {
  if (nextStatus === "draft") {
    return "Drafts cannot be moved back to draft through the approval workflow."
  }

  if (currentStatus !== "draft" && currentStatus !== "needs_review") {
    return "Only drafts that are still awaiting review can be approved or rejected."
  }

  return null
}

export function assertDraftStatusTransition(currentStatus: DraftStatus, nextStatus: DraftStatus) {
  const message = getDraftStatusTransitionMessage(currentStatus, nextStatus)

  if (message) {
    throw new Error(message)
  }
}

/**
 * Platforms that require a non-WordPress publishing path
 * (official API, browser helper, or a platform-specific executor).
 */
const MANUAL_PUBLISH_PLATFORMS: PublishingTargetPlatform[] = [
  "linkedin",
  "medium",
  "substack",
  "tiktok",
  "quora",
  "reddit",
]

export function platformRequiresManualPublish(platform: PublishingTargetPlatform): boolean {
  return MANUAL_PUBLISH_PLATFORMS.includes(platform)
}

export interface PublishingEligibilityInput {
  draftStatus: DraftStatus
  /** True if a publishedUrl already exists for this draft on this platform */
  alreadyPublished: boolean
  /** True if an active (pending/sent) publishing job already exists */
  hasActiveJob?: boolean
  /** Optional: target platform, used to surface platform-specific notes */
  targetPlatform?: PublishingTargetPlatform
  /**
   * @deprecated Use alreadyPublished instead. Kept for backward compatibility with old call sites.
   */
  alreadySentToWordPress?: boolean
}

export type PublishingEligibilityResult =
  | { allowed: true; message: string; requiresManual: boolean }
  | { allowed: false; message: string; requiresManual: boolean }

export function getPublishingEligibility(
  params: PublishingEligibilityInput,
): PublishingEligibilityResult {
  const requiresManual = params.targetPlatform
    ? platformRequiresManualPublish(params.targetPlatform)
    : false

  // Backward-compat: treat the deprecated wordpress flag as "alreadyPublished"
  const alreadyPublished = params.alreadyPublished || Boolean(params.alreadySentToWordPress)

  if (params.draftStatus !== "approved") {
    return {
      allowed: false,
      message: "Only approved drafts can be queued for publishing.",
      requiresManual,
    }
  }

  if (alreadyPublished) {
    return {
      allowed: false,
      message: "This draft already has a published URL recorded.",
      requiresManual,
    }
  }

  if (params.hasActiveJob) {
    return {
      allowed: false,
      message: "This draft already has an active publishing job.",
      requiresManual,
    }
  }

  if (requiresManual) {
    return {
      allowed: true,
      message: "Draft is approved. Platform requires a platform-specific publishing flow — record only the real published URL after posting.",
      requiresManual: true,
    }
  }

  return {
    allowed: true,
    message: "Draft is eligible for publishing queue.",
    requiresManual: false,
  }
}

export function assertPublishingEligibility(params: PublishingEligibilityInput) {
  const result = getPublishingEligibility(params)

  if (!result.allowed) {
    throw new Error(result.message)
  }
}

/**
 * A draft is only "published" when there is a real publishedUrl.
 * Campaign links, approval state, and queue jobs do NOT count as publication.
 */
export function isDraftPublished(publishedUrl: string | null | undefined): boolean {
  return Boolean(publishedUrl && publishedUrl.trim().length > 0)
}
