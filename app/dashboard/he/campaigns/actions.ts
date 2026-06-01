"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  approveCampaign,
  createSourceContentFromLatestApprovedDraft,
  syncPlatformAdaptations,
} from "@/lib/campaign-workflow-db"

function redirectWithError(error: unknown) {
  redirect(`/dashboard/he/campaigns?error=${encodeURIComponent(error instanceof Error ? error.message : "operation_failed")}`)
}

export async function createSourceFromApprovedDraftAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "")
  if (!productId) redirect("/dashboard/he/campaigns?error=missing_product")

  try {
    const source = await createSourceContentFromLatestApprovedDraft(productId)
    await syncPlatformAdaptations(source.id)
  } catch (error) {
    redirectWithError(error)
  }

  revalidatePath("/dashboard/he/campaigns")
  revalidatePath("/dashboard/he/publish-ready")
  redirect("/dashboard/he/campaigns?source=created")
}

export async function syncPlatformAdaptationsAction(formData: FormData) {
  const sourceContentId = String(formData.get("sourceContentId") ?? "")
  if (!sourceContentId) redirect("/dashboard/he/campaigns?error=missing_source")

  try {
    await syncPlatformAdaptations(sourceContentId)
  } catch (error) {
    redirectWithError(error)
  }

  revalidatePath("/dashboard/he/campaigns")
  revalidatePath("/dashboard/he/publish-ready")
  redirect("/dashboard/he/campaigns?synced=1")
}

export async function approveCampaignAction(formData: FormData) {
  const sourceContentId = String(formData.get("sourceContentId") ?? "")
  if (!sourceContentId) redirect("/dashboard/he/campaigns?error=missing_source")

  try {
    await approveCampaign(sourceContentId)
  } catch (error) {
    redirectWithError(error)
  }

  revalidatePath("/dashboard/he/campaigns")
  revalidatePath("/dashboard/he/publish-ready")
  redirect("/dashboard/he/campaigns?approved=1")
}
