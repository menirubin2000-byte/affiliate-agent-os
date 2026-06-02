"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  approveFinalCopy,
  rejectFinalCopy,
  requestFinalCopySystemFix,
} from "@/lib/content-review-db"

export async function approveFinalCopyAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "")
  if (!finalCopyId) redirect("/dashboard/he/content-review?error=missing_final_copy")

  try {
    await approveFinalCopy(finalCopyId)
  } catch (error) {
    redirect(
      `/dashboard/he/content-review?error=${encodeURIComponent(
        error instanceof Error ? error.message : "approve_failed",
      )}`,
    )
  }

  revalidatePath("/dashboard/he/content-review")
  revalidatePath("/dashboard/he/publish-ready")
  redirect("/dashboard/he/content-review?approved=1")
}

export async function rejectFinalCopyAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "")
  if (!finalCopyId) redirect("/dashboard/he/content-review?error=missing_final_copy")

  try {
    await rejectFinalCopy(finalCopyId)
  } catch (error) {
    redirect(
      `/dashboard/he/content-review?error=${encodeURIComponent(
        error instanceof Error ? error.message : "reject_failed",
      )}`,
    )
  }

  revalidatePath("/dashboard/he/content-review")
  redirect("/dashboard/he/content-review?rejected=1")
}

export async function requestFinalCopyFixAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "")
  if (!finalCopyId) redirect("/dashboard/he/content-review?error=missing_final_copy")

  try {
    await requestFinalCopySystemFix(finalCopyId)
  } catch (error) {
    redirect(
      `/dashboard/he/content-review?error=${encodeURIComponent(
        error instanceof Error ? error.message : "fix_failed",
      )}`,
    )
  }

  revalidatePath("/dashboard/he/content-review")
  revalidatePath("/dashboard/improvements")
  redirect("/dashboard/he/content-review?fix=1")
}
