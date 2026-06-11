"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { OPERATOR_SESSION_COOKIE, verifyOperatorSessionToken } from "@/lib/operator-auth"
import { submitTrafficReview, updateTrafficTaskStatus } from "@/lib/traffic-ops-db"

const PAGE = "/dashboard/he/traffic-ops"

async function requireAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value
  if (!(await verifyOperatorSessionToken(token))) {
    redirect(`/login?next=${encodeURIComponent(PAGE)}`)
  }
}

export async function approveTrafficReviewAction(formData: FormData) {
  await requireAuth()
  const reviewId = String(formData.get("reviewId") ?? "")
  const taskId = String(formData.get("taskId") ?? "")
  if (!reviewId || !taskId) redirect(`${PAGE}?error=missing_ids`)

  try {
    await submitTrafficReview(reviewId, "approved")
    await updateTrafficTaskStatus(taskId, "approved")
  } catch (error) {
    redirect(
      `${PAGE}?error=${encodeURIComponent(error instanceof Error ? error.message : "approve_failed")}`,
    )
  }

  revalidatePath(PAGE)
  redirect(`${PAGE}?approved=1`)
}

export async function rejectTrafficReviewAction(formData: FormData) {
  await requireAuth()
  const reviewId = String(formData.get("reviewId") ?? "")
  const taskId = String(formData.get("taskId") ?? "")
  const reason = String(formData.get("reason") ?? "")
  if (!reviewId || !taskId) redirect(`${PAGE}?error=missing_ids`)

  try {
    await submitTrafficReview(reviewId, "rejected", reason || undefined)
    await updateTrafficTaskStatus(taskId, "skipped", reason || "נדחה על ידי MENI")
  } catch (error) {
    redirect(
      `${PAGE}?error=${encodeURIComponent(error instanceof Error ? error.message : "reject_failed")}`,
    )
  }

  revalidatePath(PAGE)
  redirect(`${PAGE}?rejected=1`)
}

export async function skipTrafficTaskAction(formData: FormData) {
  await requireAuth()
  const taskId = String(formData.get("taskId") ?? "")
  const reason = String(formData.get("reason") ?? "")
  if (!taskId) redirect(`${PAGE}?error=missing_task`)

  try {
    await updateTrafficTaskStatus(taskId, "skipped", reason || "דילג MENI")
  } catch (error) {
    redirect(
      `${PAGE}?error=${encodeURIComponent(error instanceof Error ? error.message : "skip_failed")}`,
    )
  }

  revalidatePath(PAGE)
  redirect(`${PAGE}?skipped=1`)
}
