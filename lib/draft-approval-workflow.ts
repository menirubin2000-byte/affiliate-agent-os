import { CAMPAIGN_PLATFORMS } from "@/lib/platform-policy"
import type { CampaignPlatform } from "@/types/campaign-workflow"

export const MENI_CONFIRM_TOKEN = "MENI_CONFIRM"

export type ApprovalWorkflowStatusLabel =
  | "no_drafts_created"
  | "drafts_missing"
  | "pending_operator_approval"
  | "partially_approved"
  | "fully_approved"
  | "rejected_or_blocked"

export type ApprovalWorkflowLanguage = "en" | "he"

export type ApprovalWorkflowProductInput = {
  id: string
  name: string
  status: string
  affiliateUrl: string | null
}

export type ApprovalWorkflowDraftInput = {
  id: string
  productId: string
}

export type ApprovalWorkflowFinalCopyInput = {
  id: string
  productId: string
  platform: string
  language: string | null
  status: string
  updatedAt?: string | null
}

export type ApprovalWorkflowAffiliateProgramInput = {
  productId: string | null
  status: string | null
  affiliateLink: string | null
}

export type MissingPlatformLanguageDraft = {
  platform: CampaignPlatform
  language: ApprovalWorkflowLanguage
}

export type ProductApprovalWorkflowSummary = {
  productId: string
  productName: string
  productStatus: string
  hasAffiliateUrl: boolean
  hasLinkReadyAffiliateProgram: boolean
  draftsCount: number
  finalCopiesCount: number
  missingHebrewContent: number
  missingEnglishContent: number
  pendingApprovalCount: number
  approvedCount: number
  blockedCount: number
  statusLabel: ApprovalWorkflowStatusLabel
  nextAction: string
  previewFinalCopyId: string | null
}

const APPROVAL_LANGUAGES: ApprovalWorkflowLanguage[] = ["en", "he"]
const APPROVAL_PLATFORMS = CAMPAIGN_PLATFORMS
const APPROVED_FINAL_COPY_STATUSES = new Set([
  "operator_approved",
  "ready_for_manual_publish",
  "published_verified",
])
const BLOCKED_FINAL_COPY_STATUSES = new Set([
  "needs_system_fix",
  "operator_rejected",
])

function normalizeLanguage(language: string | null | undefined): ApprovalWorkflowLanguage {
  return language === "he" ? "he" : "en"
}

function buildStatusRank(status: ApprovalWorkflowStatusLabel) {
  switch (status) {
    case "pending_operator_approval":
      return 0
    case "no_drafts_created":
      return 1
    case "drafts_missing":
      return 2
    case "rejected_or_blocked":
      return 3
    case "partially_approved":
      return 4
    case "fully_approved":
      return 5
  }
}

function pickPreviewFinalCopyId(rows: ApprovalWorkflowFinalCopyInput[]) {
  const byPriority = [
    "ready_for_operator_approval",
    "needs_system_fix",
    "operator_rejected",
    "operator_approved",
    "ready_for_manual_publish",
    "published_verified",
  ]

  for (const status of byPriority) {
    const match = rows.find((row) => row.status === status)
    if (match?.id) return match.id
  }

  return rows[0]?.id ?? null
}

function buildNextAction(input: {
  finalCopiesCount: number
  pendingApprovalCount: number
  missingHebrewContent: number
  missingEnglishContent: number
  blockedCount: number
  hasAffiliateUrl: boolean
}) {
  if (!input.hasAffiliateUrl) return "Open product workspace and add affiliate URL"
  if (input.finalCopiesCount === 0) return "Create missing drafts"
  if (input.pendingApprovalCount > 0) return "Approve all ready posts for this product"
  if (input.missingHebrewContent > 0 || input.missingEnglishContent > 0) {
    return "Generate all missing Hebrew/English content"
  }
  if (input.blockedCount > 0) return "Open blocked posts and request system fix"
  return "Open product workspace"
}

function buildStatusLabel(input: {
  finalCopiesCount: number
  pendingApprovalCount: number
  approvedCount: number
  blockedCount: number
  missingHebrewContent: number
  missingEnglishContent: number
}) {
  if (input.finalCopiesCount === 0) return "no_drafts_created"
  if (input.pendingApprovalCount > 0) return "pending_operator_approval"
  if (input.approvedCount > 0 && input.missingHebrewContent === 0 && input.missingEnglishContent === 0 && input.blockedCount === 0) {
    return "fully_approved"
  }
  if (input.approvedCount > 0) return "partially_approved"
  if (input.blockedCount > 0) return "rejected_or_blocked"
  return "drafts_missing"
}

export function buildMissingPlatformLanguageDrafts(input: {
  existingFinalCopies: ApprovalWorkflowFinalCopyInput[]
  platforms?: CampaignPlatform[]
  languages?: ApprovalWorkflowLanguage[]
}) {
  const existingKeys = new Set(
    input.existingFinalCopies.map((row) => `${row.platform}::${normalizeLanguage(row.language)}`),
  )
  const platforms = input.platforms ?? APPROVAL_PLATFORMS
  const languages = input.languages ?? APPROVAL_LANGUAGES
  const missing: MissingPlatformLanguageDraft[] = []

  for (const language of languages) {
    for (const platform of platforms) {
      const key = `${platform}::${language}`
      if (!existingKeys.has(key)) {
        missing.push({ platform, language })
      }
    }
  }

  return missing
}

export function assertMeniConfirmToken(value: string | null | undefined) {
  if ((value ?? "").trim() !== MENI_CONFIRM_TOKEN) {
    throw new Error("MENI_CONFIRM is required before bulk approval.")
  }
}

export function buildProductApprovalWorkflowSummaries(input: {
  products: ApprovalWorkflowProductInput[]
  drafts: ApprovalWorkflowDraftInput[]
  finalCopies: ApprovalWorkflowFinalCopyInput[]
  affiliatePrograms: ApprovalWorkflowAffiliateProgramInput[]
}) {
  const draftCounts = new Map<string, number>()
  for (const draft of input.drafts) {
    draftCounts.set(draft.productId, (draftCounts.get(draft.productId) ?? 0) + 1)
  }

  const finalCopiesByProduct = new Map<string, ApprovalWorkflowFinalCopyInput[]>()
  for (const finalCopy of input.finalCopies) {
    const existing = finalCopiesByProduct.get(finalCopy.productId) ?? []
    existing.push(finalCopy)
    finalCopiesByProduct.set(finalCopy.productId, existing)
  }
  for (const rows of finalCopiesByProduct.values()) {
    rows.sort((a, b) => Date.parse(b.updatedAt ?? "") - Date.parse(a.updatedAt ?? ""))
  }

  const linkReadyPrograms = new Set(
    input.affiliatePrograms
      .filter((program) => program.status === "link_ready" && Boolean(program.affiliateLink?.trim()))
      .map((program) => program.productId)
      .filter((productId): productId is string => Boolean(productId)),
  )

  return input.products
    .map((product): ProductApprovalWorkflowSummary => {
      const productFinalCopies = finalCopiesByProduct.get(product.id) ?? []
      const missingDrafts = buildMissingPlatformLanguageDrafts({
        existingFinalCopies: productFinalCopies,
      })
      const pendingApprovalCount = productFinalCopies.filter((row) => row.status === "ready_for_operator_approval").length
      const approvedCount = productFinalCopies.filter((row) => APPROVED_FINAL_COPY_STATUSES.has(row.status)).length
      const blockedCount = productFinalCopies.filter((row) => BLOCKED_FINAL_COPY_STATUSES.has(row.status)).length
      const missingHebrewContent = missingDrafts.filter((row) => row.language === "he").length
      const missingEnglishContent = missingDrafts.filter((row) => row.language === "en").length
      const hasAffiliateUrl = Boolean(product.affiliateUrl?.trim())
      const statusLabel = buildStatusLabel({
        finalCopiesCount: productFinalCopies.length,
        pendingApprovalCount,
        approvedCount,
        blockedCount,
        missingHebrewContent,
        missingEnglishContent,
      })

      return {
        productId: product.id,
        productName: product.name,
        productStatus: product.status,
        hasAffiliateUrl,
        hasLinkReadyAffiliateProgram: linkReadyPrograms.has(product.id),
        draftsCount: draftCounts.get(product.id) ?? 0,
        finalCopiesCount: productFinalCopies.length,
        missingHebrewContent,
        missingEnglishContent,
        pendingApprovalCount,
        approvedCount,
        blockedCount,
        statusLabel,
        nextAction: buildNextAction({
          finalCopiesCount: productFinalCopies.length,
          pendingApprovalCount,
          missingHebrewContent,
          missingEnglishContent,
          blockedCount,
          hasAffiliateUrl,
        }),
        previewFinalCopyId: pickPreviewFinalCopyId(productFinalCopies),
      }
    })
    .sort((a, b) => {
      const rankDiff = buildStatusRank(a.statusLabel) - buildStatusRank(b.statusLabel)
      if (rankDiff !== 0) return rankDiff
      if (b.pendingApprovalCount !== a.pendingApprovalCount) return b.pendingApprovalCount - a.pendingApprovalCount
      return a.productName.localeCompare(b.productName)
    })
}
