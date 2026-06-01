export type PublishingTargetPlatform =
  | "linkedin"
  | "medium"
  | "substack"
  | "tiktok"
  | "quora"
  | "reddit"
  | "wordpress"

/**
 * Platform-neutral publishing job status.
 * `sent_to_wordpress` is kept for backward compatibility with existing DB rows.
 */
export type PublishingJobStatus = "pending" | "sent" | "sent_to_wordpress" | "failed"

export interface PublishingJob {
  id: string
  contentDraftId: string
  productId: string
  draftTitle: string | null
  draftStatus: "draft" | "needs_review" | "approved" | "needs_changes" | "rejected"
  templateType:
    | "review"
    | "comparison"
    | "buying_guide"
    | "social_post"
    | "tiktok_script"
    | "quora_answer"
    | "reddit_post"
  productName: string
  productSlug: string
  targetPlatform: PublishingTargetPlatform
  status: PublishingJobStatus
  /** Platform-neutral published URL — the real post URL after publishing */
  publishedUrl: string | null
  /** Platform-neutral external post ID */
  externalPostId: string | null
  /** @deprecated Use publishedUrl instead */
  wordpressPostId: string | null
  /** @deprecated Use publishedUrl instead */
  wordpressPostUrl: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}
