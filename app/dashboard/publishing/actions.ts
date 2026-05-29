"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  createPublishingJob,
  getApprovedDraftById,
  updatePublishingJobFailure,
  updatePublishingJobSuccess,
} from "@/lib/db"
import { assertIntegrationConfigured } from "@/lib/env"
import { createWordPressDraftPost } from "@/lib/wordpress"

function buildDraftTitle(title: string | null, productName: string, templateType: string) {
  return title ?? `${productName} ${templateType.replace("_", " ")} draft`
}

export async function sendDraftToWordPressAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "").trim()

  if (!draftId) {
    redirect("/dashboard/publishing?error=Missing%20draft%20identifier.")
  }

  try {
    assertIntegrationConfigured("supabase")
    assertIntegrationConfigured("wordpress")
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "WordPress publishing is not configured."
    redirect(`/dashboard/publishing?error=${encodeURIComponent(message)}`)
  }

  const approvedDraft = await getApprovedDraftById(draftId)

  if (!approvedDraft) {
    redirect(
      "/dashboard/publishing?error=Only%20approved%20drafts%20can%20be%20sent%20to%20WordPress.",
    )
  }

  let jobId: string

  try {
    const job = await createPublishingJob({
      contentDraftId: approvedDraft.id,
    })
    jobId = job.id
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create publishing job."
    redirect(`/dashboard/publishing?error=${encodeURIComponent(message)}`)
  }

  try {
    const result = await createWordPressDraftPost({
      title: buildDraftTitle(
        approvedDraft.title,
        approvedDraft.productName,
        approvedDraft.templateType,
      ),
      content: approvedDraft.body,
      excerpt: approvedDraft.metaDescription,
    })

    await updatePublishingJobSuccess({
      jobId,
      wordpressPostId: result.wordpressPostId,
      wordpressPostUrl: result.wordpressPostUrl,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to send approved draft to WordPress."

    try {
      await updatePublishingJobFailure({
        jobId,
        errorMessage: message,
      })
    } catch (updateError) {
      const updateMessage =
        updateError instanceof Error
          ? updateError.message
          : "Unable to record the publishing failure."
      redirect(
        `/dashboard/publishing?error=${encodeURIComponent(`${message} ${updateMessage}`)}`,
      )
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/drafts")
    revalidatePath("/dashboard/publishing")
    redirect(`/dashboard/publishing?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/drafts")
  revalidatePath("/dashboard/publishing")
  redirect("/dashboard/publishing?sent=1")
}
