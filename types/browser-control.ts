export type BrowserSessionStatus = "connected" | "disconnected" | "blocked"

export type BrowserJobStatus =
  | "queued"
  | "opened"
  | "filled"
  | "waiting_user"
  | "published"
  | "blocked"
  | "failed"

export type BrowserPlatform =
  | "linkedin"
  | "medium"
  | "substack"
  | "tiktok"
  | "quora"
  | "reddit"
  | "partnerstack"
  | "impact"
  | "systeme"
  | "unknown"

export interface BrowserSession {
  id: string
  helperName: string
  extensionInstanceId: string | null
  status: BrowserSessionStatus
  activeTabUrl: string | null
  activeTabTitle: string | null
  activePlatform: BrowserPlatform
  blockerStatus: string | null
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}

export interface BrowserJob {
  id: string
  approvalItemId: string
  browserSessionId: string | null
  productId: string | null
  productName: string | null
  platform: BrowserPlatform
  status: BrowserJobStatus
  targetUrl: string | null
  postUrl: string | null
  title: string | null
  content: string
  campaignLinkUrl: string | null
  disclosurePresent: boolean
  blockerReason: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface BrowserEvent {
  id: string
  browserJobId: string | null
  browserSessionId: string | null
  eventType: string
  message: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface BrowserControlOverview {
  connected: boolean
  latestSession: BrowserSession | null
  jobs: BrowserJob[]
  events: BrowserEvent[]
  queuedCount: number
  blockerStatus: string | null
}
