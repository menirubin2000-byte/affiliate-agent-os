export type AffiliateProgramApprovalType = "instant" | "manual_review" | "closed" | "unknown"

export type AffiliateProgramStatus =
  | "research_needed"
  | "signup_needed"
  | "awaiting_human_approval"
  | "submitted"
  | "approved"
  | "rejected"
  | "closed"
  | "link_ready"

export interface AffiliateProgram {
  id: string
  productId: string | null
  productName: string | null
  programName: string
  programUrl: string | null
  signupUrl: string | null
  dashboardUrl: string | null
  network: string | null
  commissionSummary: string | null
  cookieDuration: string | null
  approvalType: AffiliateProgramApprovalType
  status: AffiliateProgramStatus
  affiliateLink: string | null
  notes: string | null
  lastCheckedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAffiliateProgramInput {
  productId?: string | null
  programName: string
  programUrl?: string | null
  signupUrl?: string | null
  dashboardUrl?: string | null
  network?: string | null
  commissionSummary?: string | null
  cookieDuration?: string | null
  approvalType?: AffiliateProgramApprovalType
  status?: AffiliateProgramStatus
  affiliateLink?: string | null
  notes?: string | null
}

export interface AffiliateProgramSummary {
  total: number
  researchNeeded: number
  signupNeeded: number
  awaitingHumanApproval: number
  submitted: number
  approved: number
  rejected: number
  closed: number
  linkReady: number
}

export const VALID_APPROVAL_TYPES: AffiliateProgramApprovalType[] = [
  "instant",
  "manual_review",
  "closed",
  "unknown",
]

export const VALID_PROGRAM_STATUSES: AffiliateProgramStatus[] = [
  "research_needed",
  "signup_needed",
  "awaiting_human_approval",
  "submitted",
  "approved",
  "rejected",
  "closed",
  "link_ready",
]

export const PROGRAM_STATUS_LABELS: Record<AffiliateProgramStatus, string> = {
  research_needed: "Research needed",
  signup_needed: "Signup needed",
  awaiting_human_approval: "Awaiting human approval",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  closed: "Program closed",
  link_ready: "Link ready",
}

export const APPROVAL_TYPE_LABELS: Record<AffiliateProgramApprovalType, string> = {
  instant: "Instant approval",
  manual_review: "Manual review",
  closed: "Closed",
  unknown: "Unknown",
}
