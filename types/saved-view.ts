export type SavedViewType =
  | "products"
  | "drafts"
  | "performance"
  | "campaign_links"
  | "improvements"
  | "reports"

export interface SavedView {
  id: string
  name: string
  viewType: SavedViewType
  filters: Record<string, string>
  sort: Record<string, string>
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSavedViewInput {
  name: string
  viewType: SavedViewType
  filters: Record<string, string>
  sort?: Record<string, string>
}
