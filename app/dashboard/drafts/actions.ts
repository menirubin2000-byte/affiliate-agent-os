"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getContentTypeForTemplate } from "@/lib/ai"
import {
  createDraft,
  getDraftById,
  getDraftVersion,
  getProductById,
  restoreDraftVersion,
  revertDraftToDraft,
  updateDraftContent,
  updateDraftStatus,
} from "@/lib/db"
import { assertIntegrationConfigured } from "@/lib/env"
import { buildQualityChecks } from "@/lib/quality"
import type { TemplateType } from "@/types/draft"
import type { DraftStatus } from "@/types/draft"

function isValidStatus(value: string): value is DraftStatus {
  return value === "approved" || value === "rejected"
}

function isTemplateType(value: string): value is TemplateType {
  return (
    value === "review" ||
    value === "comparison" ||
    value === "buying_guide" ||
    value === "social_post"
  )
}

function getRequiredString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim()
}

export async function updateDraftStatusAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "").trim()
  const nextStatus = String(formData.get("nextStatus") ?? "").trim()
  const approvalNotes = String(formData.get("approvalNotes") ?? "").trim() || null

  if (!draftId || !isValidStatus(nextStatus)) {
    redirect("/dashboard/drafts?error=Invalid%20draft%20status%20update.")
  }

  const status: DraftStatus = nextStatus

  try {
    assertIntegrationConfigured("supabase")

    await updateDraftStatus({
      draftId,
      status,
      approvalNotes,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update draft status."
    redirect(`/dashboard/drafts?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/drafts")
  redirect(`/dashboard/drafts?updated=${status}`)
}

export async function createManualDraftAction(formData: FormData) {
  const productId = getRequiredString(formData, "productId")
  const templateTypeValue = getRequiredString(formData, "templateType")
  const title = getRequiredString(formData, "title")
  const body = getRequiredString(formData, "body")
  const metaTitle = getRequiredString(formData, "metaTitle")
  const metaDescription = getRequiredString(formData, "metaDescription")
  const targetKeyword = getRequiredString(formData, "targetKeyword")
  const approvalNotes = getRequiredString(formData, "approvalNotes")

  if (!productId || !isTemplateType(templateTypeValue)) {
    redirect("/dashboard/drafts/new?error=Choose%20a%20product%20and%20template%20type.")
  }

  if (!body) {
    redirect("/dashboard/drafts/new?error=Draft%20body%20is%20required.")
  }

  try {
    assertIntegrationConfigured("supabase")

    const product = await getProductById(productId)

    if (!product) {
      throw new Error("Selected product was not found.")
    }

    const draft = {
      title: title || null,
      body,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      targetKeyword: targetKeyword || product.targetKeyword,
    }
    const qualityChecks = buildQualityChecks({
      draft,
      affiliateUrl: product.affiliateUrl,
      targetKeyword: draft.targetKeyword,
      templateType: templateTypeValue,
    })

    await createDraft({
      productId,
      contentType: getContentTypeForTemplate(templateTypeValue),
      templateType: templateTypeValue,
      draft,
      aiModel: "manual-claude-code",
      qualityChecks,
      approvalNotes,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create manual draft."
    redirect(`/dashboard/drafts/new?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/drafts")
  redirect("/dashboard/drafts?created=manual")
}

export async function updateDraftContentAction(formData: FormData) {
  const draftId = getRequiredString(formData, "draftId")
  const title = getRequiredString(formData, "title")
  const body = getRequiredString(formData, "body")
  const metaTitle = getRequiredString(formData, "metaTitle")
  const metaDescription = getRequiredString(formData, "metaDescription")
  const targetKeyword = getRequiredString(formData, "targetKeyword")
  const approvalNotes = getRequiredString(formData, "approvalNotes")

  if (!draftId) {
    redirect("/dashboard/drafts?error=Missing%20draft%20identifier.")
  }

  if (!body) {
    redirect(`/dashboard/drafts/${draftId}/edit?error=Draft%20body%20is%20required.`)
  }

  try {
    assertIntegrationConfigured("supabase")

    const draft = await getDraftById(draftId)

    if (!draft) {
      throw new Error("Draft not found.")
    }

    const product = await getProductById(draft.productId)

    if (!product) {
      throw new Error("Product not found.")
    }

    const draftInput = {
      title: title || null,
      body,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      targetKeyword: targetKeyword || product.targetKeyword,
    }

    const qualityChecks = buildQualityChecks({
      draft: draftInput,
      affiliateUrl: product.affiliateUrl,
      targetKeyword: draftInput.targetKeyword,
      templateType: draft.templateType,
    })

    await updateDraftContent({
      draftId,
      title: draftInput.title,
      body: draftInput.body,
      metaTitle: draftInput.metaTitle,
      metaDescription: draftInput.metaDescription,
      targetKeyword: draftInput.targetKeyword,
      approvalNotes: approvalNotes || null,
      qualityChecks,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update draft."
    redirect(`/dashboard/drafts/${draftId}/edit?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/drafts")
  redirect("/dashboard/drafts?updated=draft")
}

export async function revertToDraftAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "").trim()

  if (!draftId) {
    redirect("/dashboard/drafts?error=Missing%20draft%20identifier.")
  }

  try {
    assertIntegrationConfigured("supabase")
    await revertDraftToDraft(draftId)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to revert draft."
    redirect(`/dashboard/drafts?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/drafts")
  redirect(`/dashboard/drafts/${draftId}/edit`)
}

export async function restoreDraftVersionAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "").trim()
  const versionId = String(formData.get("versionId") ?? "").trim()

  if (!draftId || !versionId) {
    redirect("/dashboard/drafts?error=Missing%20draft%20or%20version%20identifier.")
  }

  try {
    assertIntegrationConfigured("supabase")

    const version = await getDraftVersion(versionId)
    if (!version || version.contentDraftId !== draftId) {
      throw new Error("Version does not belong to this draft.")
    }

    await restoreDraftVersion({ draftId, versionId })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to restore version."
    redirect(`/dashboard/drafts/${draftId}/edit?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/drafts")
  redirect(`/dashboard/drafts/${draftId}/edit`)
}
