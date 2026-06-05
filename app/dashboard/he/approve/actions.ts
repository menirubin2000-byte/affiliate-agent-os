"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  approveFinalCopy,
  rejectFinalCopy,
  requestFinalCopySystemFix,
} from "@/lib/content-review-db"
import { assertIntegrationConfigured } from "@/lib/env"

function fail(reason: string): never {
  redirect(`/dashboard/he/approve?error=${encodeURIComponent(reason)}`)
}

export async function approveFinalCopyAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  if (!finalCopyId) fail("missing_final_copy_id")

  try {
    assertIntegrationConfigured("supabase")
    await approveFinalCopy(finalCopyId)
  } catch (error) {
    fail(error instanceof Error ? error.message : "approve_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/he/publish-ready")
  revalidatePath("/dashboard/he/content-review")
  redirect("/dashboard/he/approve?approved=1")
}

export async function rejectFinalCopyAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  if (!finalCopyId) fail("missing_final_copy_id")

  try {
    assertIntegrationConfigured("supabase")
    await rejectFinalCopy(finalCopyId)
  } catch (error) {
    fail(error instanceof Error ? error.message : "reject_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/he/content-review")
  redirect("/dashboard/he/approve?rejected=1")
}

export async function requestFinalCopyFixAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  if (!finalCopyId) fail("missing_final_copy_id")

  try {
    assertIntegrationConfigured("supabase")
    await requestFinalCopySystemFix(finalCopyId)
  } catch (error) {
    fail(error instanceof Error ? error.message : "fix_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/he/content-review")
  revalidatePath("/dashboard/improvements")
  redirect("/dashboard/he/approve?fix=1")
}
