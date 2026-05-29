"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  createAffiliateProgram,
  updateAffiliateProgramStatus,
  updateAffiliateProgramLink,
} from "@/lib/db"
import { assertIntegrationConfigured } from "@/lib/env"
import type { AffiliateProgramApprovalType, AffiliateProgramStatus } from "@/types/affiliate-program"
import { VALID_APPROVAL_TYPES, VALID_PROGRAM_STATUSES } from "@/types/affiliate-program"

export async function createAffiliateProgramAction(formData: FormData) {
  try {
    assertIntegrationConfigured("supabase")

    const programName = String(formData.get("program_name") ?? "").trim()
    if (!programName) throw new Error("Program name is required.")

    const approvalType = String(formData.get("approval_type") ?? "unknown").trim() as AffiliateProgramApprovalType
    const status = String(formData.get("status") ?? "research_needed").trim() as AffiliateProgramStatus

    if (!VALID_APPROVAL_TYPES.includes(approvalType)) throw new Error("Invalid approval type.")
    if (!VALID_PROGRAM_STATUSES.includes(status)) throw new Error("Invalid status.")

    await createAffiliateProgram({
      productId: String(formData.get("product_id") ?? "").trim() || null,
      programName,
      programUrl: String(formData.get("program_url") ?? "").trim() || null,
      signupUrl: String(formData.get("signup_url") ?? "").trim() || null,
      dashboardUrl: String(formData.get("dashboard_url") ?? "").trim() || null,
      network: String(formData.get("network") ?? "").trim() || null,
      commissionSummary: String(formData.get("commission_summary") ?? "").trim() || null,
      cookieDuration: String(formData.get("cookie_duration") ?? "").trim() || null,
      approvalType,
      status,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create affiliate program."
    redirect(`/dashboard/affiliate-programs?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/affiliate-programs")
  revalidatePath("/dashboard/products")
  redirect("/dashboard/affiliate-programs?created=1")
}

export async function updateAffiliateProgramStatusAction(formData: FormData) {
  try {
    assertIntegrationConfigured("supabase")
    const programId = String(formData.get("programId") ?? "").trim()
    const status = String(formData.get("status") ?? "").trim() as AffiliateProgramStatus

    if (!programId) throw new Error("Program ID is required.")
    if (!VALID_PROGRAM_STATUSES.includes(status)) throw new Error("Invalid status.")

    await updateAffiliateProgramStatus(programId, status)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update program status."
    redirect(`/dashboard/affiliate-programs?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/affiliate-programs")
  revalidatePath("/dashboard/products")
  redirect("/dashboard/affiliate-programs")
}

export async function updateAffiliateProgramLinkAction(formData: FormData) {
  try {
    assertIntegrationConfigured("supabase")
    const programId = String(formData.get("programId") ?? "").trim()
    const affiliateLink = String(formData.get("affiliate_link") ?? "").trim()

    if (!programId) throw new Error("Program ID is required.")
    if (!affiliateLink) throw new Error("Affiliate link is required.")

    await updateAffiliateProgramLink(programId, affiliateLink)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update affiliate link."
    redirect(`/dashboard/affiliate-programs?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/affiliate-programs")
  revalidatePath("/dashboard/products")
  redirect("/dashboard/affiliate-programs")
}
