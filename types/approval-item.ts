// ── Approval Item Types ─────────────────────────────────────────────

export type ApprovalItemType =
  | "activate_product"
  | "approve_draft"
  | "publish_linkedin"
  | "publish_medium"
  | "create_campaign_link"
  | "mark_link_ready"
  | "record_performance"
  | "create_task"

export type ApprovalItemStatus =
  | "waiting_approval"
  | "approved"
  | "rejected"
  | "published"
  | "needs_changes"

export interface ApprovalItem {
  id: string
  productId: string | null
  productName: string | null
  approvalType: ApprovalItemType
  platform: string | null
  title: string
  description: string | null
  contentPreview: string | null
  campaignLinkUrl: string | null
  disclosurePresent: boolean
  status: ApprovalItemStatus
  operatorNotes: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateApprovalItemInput {
  productId?: string | null
  approvalType: ApprovalItemType
  platform?: string | null
  title: string
  description?: string | null
  contentPreview?: string | null
  campaignLinkUrl?: string | null
  disclosurePresent?: boolean
  status?: ApprovalItemStatus
}

export interface ApprovalItemSummary {
  total: number
  waitingApproval: number
  approved: number
  rejected: number
  published: number
  needsChanges: number
}

export const VALID_APPROVAL_ITEM_TYPES: ApprovalItemType[] = [
  "activate_product",
  "approve_draft",
  "publish_linkedin",
  "publish_medium",
  "create_campaign_link",
  "mark_link_ready",
  "record_performance",
  "create_task",
]

export const VALID_APPROVAL_ITEM_STATUSES: ApprovalItemStatus[] = [
  "waiting_approval",
  "approved",
  "rejected",
  "published",
  "needs_changes",
]

export const APPROVAL_ITEM_TYPE_LABELS: Record<ApprovalItemType, string> = {
  activate_product: "Activate product",
  approve_draft: "Approve draft",
  publish_linkedin: "Publish to LinkedIn",
  publish_medium: "Publish to Medium",
  create_campaign_link: "Create campaign link",
  mark_link_ready: "Mark link ready",
  record_performance: "Record performance",
  create_task: "Create task",
}

export const APPROVAL_ITEM_STATUS_LABELS: Record<ApprovalItemStatus, string> = {
  waiting_approval: "Waiting approval",
  approved: "Approved",
  rejected: "Rejected",
  published: "Published",
  needs_changes: "Needs changes",
}
