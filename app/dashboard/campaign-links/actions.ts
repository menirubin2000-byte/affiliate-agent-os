"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createCampaignLink, updateCampaignLinkStatus } from "@/lib/db"
import { assertIntegrationConfigured } from "@/lib/env"
import type { CampaignLinkStatus } from "@/types/campaign-link"

export async function createCampaignLinkAction(formData: FormData) {
  try {
    assertIntegrationConfigured("supabase")

    const productId = String(formData.get("product_id") ?? "").trim()
    const name = String(formData.get("name") ?? "").trim()
    const channel = String(formData.get("channel") ?? "").trim()
    const baseUrl = String(formData.get("base_url") ?? "").trim()
    const finalUrl = String(formData.get("final_url") ?? "").trim()

    if (!productId || !name || !channel || !baseUrl || !finalUrl) {
      throw new Error("Product, name, channel, base URL, and final URL are required.")
    }

    await createCampaignLink({
      productId,
      name,
      channel,
      campaignName: String(formData.get("campaign_name") ?? "").trim() || null,
      source: String(formData.get("source") ?? "").trim() || null,
      medium: String(formData.get("medium") ?? "").trim() || null,
      term: String(formData.get("term") ?? "").trim() || null,
      content: String(formData.get("content") ?? "").trim() || null,
      baseUrl,
      finalUrl,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create campaign link."
    redirect(`/dashboard/campaign-links?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/campaign-links")
  revalidatePath("/dashboard/products")
  redirect("/dashboard/campaign-links?created=1")
}

export async function archiveCampaignLinkAction(formData: FormData) {
  try {
    assertIntegrationConfigured("supabase")
    const linkId = String(formData.get("linkId") ?? "").trim()
    const status = String(formData.get("status") ?? "archived").trim() as CampaignLinkStatus

    if (!linkId) {
      throw new Error("Campaign link ID is required.")
    }

    await updateCampaignLinkStatus(linkId, status)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update campaign link."
    redirect(`/dashboard/campaign-links?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/campaign-links")
  redirect("/dashboard/campaign-links")
}
