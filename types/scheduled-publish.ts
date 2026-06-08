import type { CampaignPlatform } from "@/types/campaign-workflow"

export type ScheduledPublishStatus =
  | "scheduled"
  | "waiting_platform_connection"
  | "waiting_media"
  | "waiting_executor"
  | "ready_to_publish"
  | "publishing"
  | "published"
  | "failed"
  | "paused"

export interface ScheduledPublishItem {
  id: string
  finalCopyId: string
  productId: string
  productName: string | null
  platform: CampaignPlatform
  language: string
  campaignLink: string | null
  mediaAssetUrl: string | null
  imageAssetPath: string | null
  videoAssetPath: string | null
  approvalId: string | null
  status: ScheduledPublishStatus
  publishAt: string
  priority: number
  attempts: number
  lastError: string | null
  publishedRecordId: string | null
  finalCopyTitle: string | null
  createdAt: string
  updatedAt: string
}

export interface ScheduledPublishSummary {
  total: number
  today: number
  tomorrow: number
  waitingPlatformConnection: number
  waitingMedia: number
  failed: number
  published: number
  nextPublishAt: string | null
  byPlatform: Record<string, number>
  byProduct: Record<string, number>
}
