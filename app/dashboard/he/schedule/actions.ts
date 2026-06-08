"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  pauseScheduledPublishItem,
  publishScheduledItemNow,
  rescheduleScheduledPublishItem,
  resumeScheduledPublishItem,
} from "@/lib/scheduled-publish-queue-db"

function fail(reason: string): never {
  redirect(`/dashboard/he/schedule?error=${encodeURIComponent(reason)}`)
}

export async function pauseScheduledPublishAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) fail("missing_scheduled_item_id")
  try {
    await pauseScheduledPublishItem(id)
  } catch (error) {
    fail(error instanceof Error ? error.message : "pause_failed")
  }
  revalidatePath("/dashboard/he/schedule")
  redirect("/dashboard/he/schedule?paused=1")
}

export async function resumeScheduledPublishAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) fail("missing_scheduled_item_id")
  try {
    await resumeScheduledPublishItem(id)
  } catch (error) {
    fail(error instanceof Error ? error.message : "resume_failed")
  }
  revalidatePath("/dashboard/he/schedule")
  redirect("/dashboard/he/schedule?resumed=1")
}

export async function rescheduleScheduledPublishAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) fail("missing_scheduled_item_id")
  try {
    await rescheduleScheduledPublishItem(id)
  } catch (error) {
    fail(error instanceof Error ? error.message : "reschedule_failed")
  }
  revalidatePath("/dashboard/he/schedule")
  redirect("/dashboard/he/schedule?rescheduled=1")
}

export async function publishScheduledNowAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  const confirmation = String(formData.get("meni_confirmation") ?? "").trim()
  if (!id) fail("missing_scheduled_item_id")
  if (confirmation !== "MENI_CONFIRM") fail("publish_now_requires_explicit_meni_confirmation")
  try {
    await publishScheduledItemNow(id)
  } catch (error) {
    fail(error instanceof Error ? error.message : "publish_now_failed")
  }
  revalidatePath("/dashboard/he/schedule")
  revalidatePath("/dashboard/he/publish-ready")
  redirect("/dashboard/he/schedule?publishNow=1")
}
