"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createProduct } from "@/lib/db"
import { assertIntegrationConfigured } from "@/lib/env"
import { upsertYouTubeDistributionWorkflow } from "@/lib/youtube-distribution-workflow-db"
import { slugify } from "@/lib/utils"
import type { ProductStatus } from "@/types/product"
import {
  VALID_DISTRIBUTION_POSTING_METHODS,
  VALID_YOUTUBE_DISTRIBUTION_STATUSES,
  type DistributionPostingMethod,
  type YouTubeDistributionStatus,
} from "@/types/youtube-distribution-workflow"

function parseOptionalNumber(value: FormDataEntryValue | null, fieldLabel: string) {
  if (typeof value !== "string" || value.trim() === "") {
    return null
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldLabel} must be a valid number.`)
  }

  return parsed
}

function parseSecondaryKeywords(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return []
  }

  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

function isValidStatus(value: string): value is ProductStatus {
  return value === "active" || value === "inactive"
}

function assertValidHttpUrl(value: string, fieldLabel = "URL") {
  try {
    const parsed = new URL(value)

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error()
    }
  } catch {
    throw new Error(`${fieldLabel} must be a valid http or https URL.`)
  }
}

function parseOptionalUrl(value: FormDataEntryValue | null, fieldLabel: string) {
  if (typeof value !== "string" || value.trim() === "") {
    return null
  }

  assertValidHttpUrl(value.trim(), fieldLabel)
  return value.trim()
}

function parseOptionalInteger(value: FormDataEntryValue | null, fieldLabel: string) {
  if (typeof value !== "string" || value.trim() === "") {
    return null
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldLabel} must be a whole number greater than or equal to 0.`)
  }

  return parsed
}

export async function createProductAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const slug = slugify(String(formData.get("slug") ?? "").trim())
  const affiliateUrl = String(formData.get("affiliate_url") ?? "").trim()
  const status = String(formData.get("status") ?? "active") as ProductStatus

  try {
    assertIntegrationConfigured("supabase")

    if (!name || !slug || !affiliateUrl) {
      throw new Error("Product name, slug, and affiliate URL are required.")
    }

    if (!isValidStatus(status)) {
      throw new Error("Product status must be active or inactive.")
    }

    assertValidHttpUrl(affiliateUrl, "Affiliate URL")

    await createProduct({
      name,
      slug,
      brand: String(formData.get("brand") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      affiliateUrl,
      price: parseOptionalNumber(formData.get("price"), "Price"),
      commissionRate: parseOptionalNumber(formData.get("commission_rate"), "Commission rate"),
      notes: String(formData.get("notes") ?? "").trim() || null,
      targetKeyword: String(formData.get("target_keyword") ?? "").trim() || null,
      secondaryKeywords: parseSecondaryKeywords(formData.get("secondary_keywords")),
      searchIntent: String(formData.get("search_intent") ?? "").trim() || null,
      contentAngle: String(formData.get("content_angle") ?? "").trim() || null,
      status,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create product."

    redirect(`/dashboard/products/new?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/products")
  redirect("/dashboard/products?created=1")
}

export async function saveYouTubeDistributionWorkflowAction(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "").trim()

  try {
    assertIntegrationConfigured("supabase")

    if (!productId) {
      throw new Error("Product ID is required.")
    }

    const status = String(formData.get("status") ?? "scripted").trim() as YouTubeDistributionStatus
    const youtubePostingMethod = String(formData.get("youtube_posting_method") ?? "browser").trim() as DistributionPostingMethod
    const redditPostingMethod = String(formData.get("reddit_posting_method") ?? "browser").trim() as DistributionPostingMethod
    const quoraPostingMethod = String(formData.get("quora_posting_method") ?? "browser").trim() as DistributionPostingMethod
    const mediumPostingMethod = String(formData.get("medium_posting_method") ?? "manual").trim() as DistributionPostingMethod

    if (!VALID_YOUTUBE_DISTRIBUTION_STATUSES.includes(status)) {
      throw new Error("Invalid workflow status.")
    }

    for (const [label, method] of [
      ["YouTube", youtubePostingMethod],
      ["Reddit", redditPostingMethod],
      ["Quora", quoraPostingMethod],
      ["Medium", mediumPostingMethod],
    ] as const) {
      if (!VALID_DISTRIBUTION_POSTING_METHODS.includes(method)) {
        throw new Error(`${label} posting method is invalid.`)
      }
    }

    await upsertYouTubeDistributionWorkflow({
      productId,
      status,
      youtubePostingMethod,
      redditPostingMethod,
      quoraPostingMethod,
      mediumPostingMethod,
      youtubeVideoIdea: String(formData.get("youtube_video_idea") ?? "").trim() || null,
      youtubeTitle: String(formData.get("youtube_title") ?? "").trim() || null,
      thumbnailAngle: String(formData.get("thumbnail_angle") ?? "").trim() || null,
      shortScript: String(formData.get("short_script") ?? "").trim() || null,
      longVideoOutline: String(formData.get("long_video_outline") ?? "").trim() || null,
      descriptionWithDisclosure: String(formData.get("description_with_disclosure") ?? "").trim() || null,
      pinnedCommentText: String(formData.get("pinned_comment_text") ?? "").trim() || null,
      redditVariantA: String(formData.get("reddit_variant_a") ?? "").trim() || null,
      redditVariantB: String(formData.get("reddit_variant_b") ?? "").trim() || null,
      quoraVariantA: String(formData.get("quora_variant_a") ?? "").trim() || null,
      quoraVariantB: String(formData.get("quora_variant_b") ?? "").trim() || null,
      mediumVariant: String(formData.get("medium_variant") ?? "").trim() || null,
      recommendedCta: String(formData.get("recommended_cta") ?? "").trim() || null,
      youtubeUrl: parseOptionalUrl(formData.get("youtube_url"), "YouTube URL"),
      redditSharedUrl: parseOptionalUrl(formData.get("reddit_shared_url"), "Reddit shared URL"),
      quoraSharedUrl: parseOptionalUrl(formData.get("quora_shared_url"), "Quora shared URL"),
      mediumSharedUrl: parseOptionalUrl(formData.get("medium_shared_url"), "Medium/manual browser URL"),
      youtubeViews: parseOptionalInteger(formData.get("youtube_views"), "YouTube views"),
      campaignLinkId: String(formData.get("campaign_link_id") ?? "").trim() || null,
      campaignLinkUrl: parseOptionalUrl(formData.get("campaign_link_url"), "Campaign link URL"),
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save the YouTube distribution workflow."

    redirect(`/dashboard/products/${productId}?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/products")
  revalidatePath(`/dashboard/products/${productId}`)
  redirect(`/dashboard/products/${productId}?distributionSaved=1`)
}
