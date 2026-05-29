export type CampaignLinkStatus = "active" | "archived"

export interface CampaignLink {
  id: string
  productId: string
  productName: string
  name: string
  channel: string
  campaignName: string | null
  source: string | null
  medium: string | null
  term: string | null
  content: string | null
  baseUrl: string
  finalUrl: string
  notes: string | null
  status: CampaignLinkStatus
  createdAt: string
  updatedAt: string
}

export interface CreateCampaignLinkInput {
  productId: string
  name: string
  channel: string
  campaignName?: string | null
  source?: string | null
  medium?: string | null
  term?: string | null
  content?: string | null
  baseUrl: string
  finalUrl: string
  notes?: string | null
}

export interface CampaignLinkSummary {
  total: number
  active: number
  archived: number
  withoutPerformance: number
}
