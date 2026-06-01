export type DraftStatus = "draft" | "needs_review" | "approved" | "needs_changes" | "rejected"
export type ContentType = "review" | "social_post"
export type TemplateType =
  | "review"
  | "comparison"
  | "buying_guide"
  | "social_post"
  | "tiktok_script"
  | "quora_answer"
  | "reddit_post"

export interface QualityChecks {
  has_disclosure: boolean
  has_clear_cta: boolean
  has_target_keyword: boolean
  has_meta_title: boolean
  has_meta_description: boolean
  avoids_fake_claims: boolean
  has_required_structure: boolean
}

export interface Draft {
  id: string
  productId: string
  productName: string
  productSlug: string
  contentType: ContentType
  templateType: TemplateType
  title: string | null
  body: string
  metaTitle: string | null
  metaDescription: string | null
  targetKeyword: string | null
  qualityChecks: QualityChecks
  status: DraftStatus
  campaignId: string | null
  aiModel: string | null
  approvalNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface DraftCreateInput {
  title?: string | null
  body: string
  metaTitle?: string | null
  metaDescription?: string | null
  targetKeyword?: string | null
}
