import type { QualityChecks } from "@/types/draft"

export type DraftChangeSource = "manual" | "structured_paste" | "fallback_generation" | "system"

export interface DraftVersion {
  id: string
  contentDraftId: string
  versionNumber: number
  title: string | null
  body: string
  metaTitle: string | null
  metaDescription: string | null
  targetKeyword: string | null
  qualityChecks: QualityChecks
  changeSource: DraftChangeSource
  changeNotes: string | null
  createdAt: string
}
