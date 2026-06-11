import type { CampaignPlatform } from "@/types/campaign-workflow"

export type TrafficTaskType =
  | "publish_content"
  | "create_asset"
  | "refresh_content"
  | "boost_performing"
  | "expand_platform"
  | "bridge_post"

export type TrafficTaskStatus =
  | "pending"
  | "asset_needed"
  | "asset_ready"
  | "in_review"
  | "approved"
  | "publish_job_created"
  | "completed"
  | "skipped"

export type TrafficAssetType = "image" | "video" | "carousel" | "gif" | "document"

export type TrafficAssetStatus = "needed" | "in_progress" | "ready" | "rejected" | "not_applicable"

export type TrafficReviewDecision = "pending" | "approved" | "rejected" | "deferred"

export interface TrafficTask {
  id: string
  productId: string
  productName: string | null
  platform: CampaignPlatform
  taskType: TrafficTaskType
  status: TrafficTaskStatus
  priority: number
  trafficScore: number | null
  rankingId: string | null
  finalCopyId: string | null
  publishJobId: string | null
  blockingReason: string | null
  notes: string | null
  assetStatus: TrafficAssetStatus | null
  reviewDecision: TrafficReviewDecision | null
  createdAt: string
  updatedAt: string
}

export interface TrafficAsset {
  id: string
  taskId: string
  productId: string
  platform: CampaignPlatform
  assetType: TrafficAssetType
  status: TrafficAssetStatus
  assetUrl: string | null
  thumbnailUrl: string | null
  sourceDescription: string | null
  blockingReason: string | null
  createdAt: string
  updatedAt: string
}

export interface TrafficReview {
  id: string
  taskId: string
  reviewer: string
  decision: TrafficReviewDecision
  reason: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TrafficOpsSummary {
  total: number
  pending: number
  assetNeeded: number
  assetReady: number
  inReview: number
  approved: number
  publishJobCreated: number
  completed: number
  skipped: number
  byPlatform: Record<string, number>
}
