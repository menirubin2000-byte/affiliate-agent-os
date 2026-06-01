export type CampaignStatus = "draft" | "active" | "paused" | "archived"

export interface Campaign {
  id: string
  name: string
  productId: string
  productName: string
  channel: string
  status: CampaignStatus
  notes: string | null
  suggestedTrackingUrl: string | null
  draftCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateCampaignInput {
  name: string
  productId: string
  channel: string
  notes?: string | null
}

export interface CampaignSummary {
  total: number
  active: number
  draftsWithCampaign: number
  draftsWithoutCampaign: number
}
