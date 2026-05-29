"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createApprovalItem, updateApprovalItemStatus } from "@/lib/db"
import type { ApprovalItemStatus, ApprovalItemType } from "@/types/approval-item"
import { VALID_APPROVAL_ITEM_TYPES, VALID_APPROVAL_ITEM_STATUSES } from "@/types/approval-item"

function revalidateApprovalPaths() {
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/approvals")
  revalidatePath("/dashboard/command-center")
}

export async function createApprovalItemAction(formData: FormData) {
  const title = formData.get("title") as string | null
  const approvalType = formData.get("approval_type") as string | null

  if (!title?.trim()) {
    redirect("/dashboard/approvals?error=title_required")
  }
  if (!approvalType || !VALID_APPROVAL_ITEM_TYPES.includes(approvalType as ApprovalItemType)) {
    redirect("/dashboard/approvals?error=invalid_type")
  }

  const productId = (formData.get("product_id") as string | null) || null
  const platform = (formData.get("platform") as string | null) || null
  const description = (formData.get("description") as string | null) || null
  const contentPreview = (formData.get("content_preview") as string | null) || null
  const campaignLinkUrl = (formData.get("campaign_link_url") as string | null) || null
  const disclosurePresent = formData.get("disclosure_present") === "true"

  try {
    await createApprovalItem({
      productId,
      approvalType: approvalType as ApprovalItemType,
      platform,
      title: title.trim(),
      description,
      contentPreview,
      campaignLinkUrl,
      disclosurePresent,
    })
  } catch {
    redirect("/dashboard/approvals?error=create_failed")
  }

  revalidateApprovalPaths()
  redirect("/dashboard/approvals?created=1")
}

export async function updateApprovalItemStatusAction(formData: FormData) {
  const itemId = formData.get("item_id") as string | null
  const status = formData.get("status") as string | null
  const operatorNotes = (formData.get("operator_notes") as string | null) || null

  if (!itemId) {
    redirect("/dashboard/approvals?error=missing_id")
  }
  if (!status || !VALID_APPROVAL_ITEM_STATUSES.includes(status as ApprovalItemStatus)) {
    redirect("/dashboard/approvals?error=invalid_status")
  }

  try {
    await updateApprovalItemStatus(itemId, status as ApprovalItemStatus, operatorNotes)
  } catch {
    redirect("/dashboard/approvals?error=update_failed")
  }

  revalidateApprovalPaths()
  redirect("/dashboard/approvals")
}
