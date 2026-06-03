import type { CampaignPlatform } from "@/types/campaign-workflow"

export type PublishJobStatus =
  | "pending_meni_approval"
  | "approved_waiting_executor"
  | "blocked_executor_not_connected"
  | "blocked_policy"
  | "running"
  | "waiting_url_verification"
  | "verified"
  | "needs_system_fix"
  | "failed_needs_system_fix"

export interface PublishJob {
  id: string
  finalCopyId: string
  productId: string
  productName: string | null
  platform: CampaignPlatform
  status: PublishJobStatus
  executorType: string
  blockingReason: string | null
  approvalId: string | null
  liveUrl: string | null
  verifiedAt: string | null
  finalCopyTitle: string | null
  createdAt: string
  updatedAt: string
}
