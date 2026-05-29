import type { DraftStatus } from "@/types/draft"

export function getDraftStatusTransitionMessage(currentStatus: DraftStatus, nextStatus: DraftStatus) {
  if (nextStatus === "draft") {
    return "Drafts cannot be moved back to draft through the approval workflow."
  }

  if (currentStatus !== "draft") {
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

export function getPublishingEligibility(params: {
  draftStatus: DraftStatus
  alreadySentToWordPress: boolean
}) {
  if (params.draftStatus !== "approved") {
    return {
      allowed: false,
      message: "Only approved drafts can be sent to WordPress.",
    } as const
  }

  if (params.alreadySentToWordPress) {
    return {
      allowed: false,
      message: "This draft was already sent to WordPress.",
    } as const
  }

  return {
    allowed: true,
    message: "Draft is eligible for WordPress queueing.",
  } as const
}

export function assertPublishingEligibility(params: {
  draftStatus: DraftStatus
  alreadySentToWordPress: boolean
}) {
  const result = getPublishingEligibility(params)

  if (!result.allowed) {
    throw new Error(result.message)
  }
}
