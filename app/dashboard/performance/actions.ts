"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createPerformanceMetric } from "@/lib/db"
import { assertIntegrationConfigured } from "@/lib/env"

function parseRequiredInteger(value: FormDataEntryValue | null, field: string) {
  const raw = String(value ?? "").trim()

  if (!raw) {
    throw new Error(`${field} is required.`)
  }

  const parsed = Number(raw)

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${field} must be a whole number greater than or equal to 0.`)
  }

  return parsed
}

function parseOptionalInteger(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim()

  if (!raw) {
    return null
  }

  const parsed = Number(raw)

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Conversions must be a whole number greater than or equal to 0.")
  }

  return parsed
}

function parseOptionalDecimal(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim()

  if (!raw) {
    return null
  }

  const parsed = Number(raw)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Revenue must be a number greater than or equal to 0.")
  }

  return parsed
}

function parseOptionalDateTime(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim()

  if (!raw) {
    return null
  }

  const parsed = new Date(raw)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Recorded at must be a valid date and time.")
  }

  return parsed.toISOString()
}

export async function createPerformanceMetricAction(formData: FormData) {
  try {
    assertIntegrationConfigured("supabase")

    const productId = String(formData.get("product_id") ?? "").trim()
    const draftId = String(formData.get("draft_id") ?? "").trim() || null
    const channel = String(formData.get("channel") ?? "").trim()

    if (!productId || !channel) {
      throw new Error("Product and channel are required.")
    }

    const campaignLinkId = String(formData.get("campaign_link_id") ?? "").trim() || null

    await createPerformanceMetric({
      productId,
      draftId,
      campaignLinkId,
      channel,
      campaignName: String(formData.get("campaign_name") ?? "").trim() || null,
      clicks: parseRequiredInteger(formData.get("clicks"), "Clicks"),
      conversions: parseOptionalInteger(formData.get("conversions")),
      revenue: parseOptionalDecimal(formData.get("revenue")),
      notes: String(formData.get("notes") ?? "").trim() || null,
      recordedAt: parseOptionalDateTime(formData.get("recorded_at")),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create performance record."

    redirect(`/dashboard/performance?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/performance")
  redirect("/dashboard/performance?created=1")
}
