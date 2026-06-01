"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { updateDraftStatus } from "@/lib/db"
import { assertIntegrationConfigured } from "@/lib/env"

export async function approveDraftAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "").trim()
  if (!draftId) redirect("/dashboard/he/approve?error=missing_draft_id")

  try {
    assertIntegrationConfigured("supabase")
    await updateDraftStatus({ draftId, status: "approved", approvalNotes: null })
  } catch (error) {
    redirect(
      `/dashboard/he/approve?error=${encodeURIComponent(
        error instanceof Error ? error.message : "approve_failed",
      )}`,
    )
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/drafts")
  redirect("/dashboard/he/approve?approved=1")
}

export async function rejectDraftAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "").trim()
  if (!draftId) redirect("/dashboard/he/approve?error=missing_draft_id")

  try {
    assertIntegrationConfigured("supabase")
    await updateDraftStatus({ draftId, status: "rejected", approvalNotes: null })
  } catch (error) {
    redirect(
      `/dashboard/he/approve?error=${encodeURIComponent(
        error instanceof Error ? error.message : "reject_failed",
      )}`,
    )
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/drafts")
  redirect("/dashboard/he/approve?rejected=1")
}
