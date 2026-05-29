export type PublishingTargetPlatform = "wordpress"
export type PublishingJobStatus = "pending" | "sent_to_wordpress" | "failed"

export interface PublishingJob {
  id: string
  contentDraftId: string
  productId: string
  draftTitle: string | null
  draftStatus: "draft" | "approved" | "rejected"
  templateType: "review" | "comparison" | "buying_guide" | "social_post"
  productName: string
  productSlug: string
  targetPlatform: PublishingTargetPlatform
  status: PublishingJobStatus
  wordpressPostId: string | null
  wordpressPostUrl: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}
