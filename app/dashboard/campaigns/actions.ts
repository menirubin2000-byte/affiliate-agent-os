"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createCampaign, updateCampaignStatus } from "@/lib/db"
import { assertIntegrationConfigured } from "@/lib/env"
import type { CampaignStatus } from "@/types/campaign"

function getRequiredString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim()
}

function isValidStatus(value: string): value is CampaignStatus {
  return value === "draft" || value === "active" || value === "paused" || value === "archived"
}

export async function createCampaignAction(formData: FormData) {
  const name = getRequiredString(formData, "name")
  const productId = getRequiredString(formData, "productId")
  const channel = getRequiredString(formData, "channel")
  const notes = getRequiredString(formData, "notes")

  if (!name || !productId || !channel) {
    redirect("/dashboard/campaigns?error=Campaign%20name%2C%20product%2C%20and%20channel%20are%20required.")
  }

  try {
    assertIntegrationConfigured("supabase")
    await createCampaign({ name, productId, channel, notes: notes || null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create campaign."
    redirect(`/dashboard/campaigns?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/campaigns")
  redirect("/dashboard/campaigns?created=1")
}

export async function updateCampaignStatusAction(formData: FormData) {
  const campaignId = getRequiredString(formData, "campaignId")
  const nextStatus = getRequiredString(formData, "status")

  if (!campaignId || !isValidStatus(nextStatus)) {
    redirect("/dashboard/campaigns?error=Invalid%20campaign%20status%20update.")
  }

  try {
    assertIntegrationConfigured("supabase")
    await updateCampaignStatus(campaignId, nextStatus)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update campaign status."
    redirect(`/dashboard/campaigns?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/campaigns")
  redirect(`/dashboard/campaigns/${campaignId}`)
}
