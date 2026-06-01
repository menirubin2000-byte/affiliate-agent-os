import { createHash } from "node:crypto"

export function normalizeApprovalIdentityValue(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() ?? ""
}

export function buildPostApprovalFingerprint(input: {
  productId?: string | null
  platform?: string | null
  title?: string | null
  contentPreview?: string | null
  campaignLinkUrl?: string | null
}) {
  const parts = [
    normalizeApprovalIdentityValue(input.productId),
    normalizeApprovalIdentityValue(input.platform),
    normalizeApprovalIdentityValue(input.title),
    normalizeApprovalIdentityValue(input.contentPreview),
    normalizeApprovalIdentityValue(input.campaignLinkUrl),
  ]

  return createHash("sha256").update(parts.join("\n")).digest("hex")
}

export function isPublishApprovalType(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith("publish_")
}
