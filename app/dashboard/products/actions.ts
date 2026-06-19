"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  createAffiliateProgram,
  createProduct,
  listAffiliateProgramsForProduct,
  listProducts,
  updateAffiliateProgramLink,
} from "@/lib/db"
import { assertIntegrationConfigured } from "@/lib/env"
import { upsertYouTubeDistributionWorkflow } from "@/lib/youtube-distribution-workflow-db"
import { slugify } from "@/lib/utils"
import type { ProductStatus } from "@/types/product"
import {
  type DistributionPostingMethod,
  type YouTubeDistributionStatus,
  VALID_DISTRIBUTION_POSTING_METHODS,
  VALID_YOUTUBE_DISTRIBUTION_STATUSES,
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

const GENERIC_SINGLE_WORD_SLUGS = new Set([
  "ai",
  "aliexpress",
  "amazon",
  "electronics",
  "gaming",
  "headphone",
  "headphones",
  "product",
  "products",
  "software",
  "tool",
  "tools",
])

function chooseSlug(name: string, requestedSlug: string) {
  const generatedSlug = slugify(name)
  const normalizedRequestedSlug = slugify(requestedSlug)

  if (!requestedSlug.trim() || normalizedRequestedSlug === "product") {
    return generatedSlug
  }

  const requestedParts = normalizedRequestedSlug.split("-").filter(Boolean)
  const generatedParts = generatedSlug.split("-").filter(Boolean)

  if (
    requestedParts.length <= 1 &&
    generatedParts.length >= 3 &&
    GENERIC_SINGLE_WORD_SLUGS.has(normalizedRequestedSlug)
  ) {
    return generatedSlug
  }

  return normalizedRequestedSlug
}

async function buildUniqueSlug(baseSlug: string) {
  const products = await listProducts()
  const existingSlugs = new Set(products.map((product) => product.slug))

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug
  }

  let suffix = 2
  let candidate = `${baseSlug}-${suffix}`

  while (existingSlugs.has(candidate)) {
    suffix += 1
    candidate = `${baseSlug}-${suffix}`
  }

  return candidate
}

function inferAffiliateNetwork(affiliateUrl: string) {
  try {
    const hostname = new URL(affiliateUrl).hostname.toLowerCase()

    if (hostname.includes("aliexpress.com")) return "AliExpress"
    if (hostname.includes("amzn.to") || hostname.includes("amazon.")) return "Amazon"
    if (hostname.includes("impact.com")) return "Impact"
    if (hostname.includes("partnerstack.com")) return "PartnerStack"
  } catch {
    return null
  }

  return null
}

function assertValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value)

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error()
    }
  } catch {
    throw new Error("Affiliate URL must be a valid http or https URL.")
  }
}

function parseOptionalText(formData: FormData, field: string) {
  const value = formData.get(field)
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseOptionalUrl(formData: FormData, field: string) {
  const value = parseOptionalText(formData, field)
  if (!value) {
    return null
  }

  assertValidHttpUrl(value)
  return value
}

function parseOptionalInteger(formData: FormData, field: string, label: string) {
  const value = parseOptionalText(formData, field)
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative whole number.`)
  }

  return parsed
}

function parsePostingMethod(value: FormDataEntryValue | null, fieldLabel: string): DistributionPostingMethod {
  if (typeof value !== "string" || !VALID_DISTRIBUTION_POSTING_METHODS.includes(value as DistributionPostingMethod)) {
    throw new Error(`${fieldLabel} must be a valid posting method.`)
  }

  return value as DistributionPostingMethod
}

function parseWorkflowStatus(value: FormDataEntryValue | null): YouTubeDistributionStatus {
  if (typeof value !== "string" || !VALID_YOUTUBE_DISTRIBUTION_STATUSES.includes(value as YouTubeDistributionStatus)) {
    throw new Error("Workflow status must be valid.")
  }

  return value as YouTubeDistributionStatus
}

export async function createProductAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const requestedSlug = String(formData.get("slug") ?? "").trim()
  const affiliateUrl = String(formData.get("affiliate_url") ?? "").trim()
  const status = String(formData.get("status") ?? "active") as ProductStatus

  try {
    assertIntegrationConfigured("supabase")

    if (!name || !affiliateUrl) {
      throw new Error("Product name and affiliate URL are required.")
    }

    if (!isValidStatus(status)) {
      throw new Error("Product status must be active or inactive.")
    }

    assertValidHttpUrl(affiliateUrl)

    const slug = await buildUniqueSlug(chooseSlug(name, requestedSlug))
    const commissionRateInput = String(formData.get("commission_rate") ?? "").trim()
    const product = await createProduct({
      name,
      slug,
      brand: String(formData.get("brand") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      affiliateLink: affiliateUrl,
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

    const existingPrograms = await listAffiliateProgramsForProduct(product.id)
    const firstProgram = existingPrograms[0]

    if (firstProgram) {
      await updateAffiliateProgramLink(firstProgram.id, affiliateUrl)
    } else {
      await createAffiliateProgram({
        productId: product.id,
        programName: `${name} Affiliate Program`,
        programUrl: affiliateUrl,
        network: inferAffiliateNetwork(affiliateUrl),
        commissionSummary: commissionRateInput ? `${commissionRateInput}%` : null,
        approvalType: "instant",
        status: "link_ready",
        affiliateLink: affiliateUrl,
        notes: "Created automatically from Add product form.",
      })
    }
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

    await upsertYouTubeDistributionWorkflow({
      productId,
      status: parseWorkflowStatus(formData.get("status")),
      youtubePostingMethod: parsePostingMethod(formData.get("youtube_posting_method"), "YouTube method"),
      redditPostingMethod: parsePostingMethod(formData.get("reddit_posting_method"), "Reddit method"),
      quoraPostingMethod: parsePostingMethod(formData.get("quora_posting_method"), "Quora method"),
      mediumPostingMethod: parsePostingMethod(formData.get("medium_posting_method"), "Medium method"),
      youtubeVideoIdea: parseOptionalText(formData, "youtube_video_idea"),
      youtubeTitle: parseOptionalText(formData, "youtube_title"),
      thumbnailAngle: parseOptionalText(formData, "thumbnail_angle"),
      shortScript: parseOptionalText(formData, "short_script"),
      longVideoOutline: parseOptionalText(formData, "long_video_outline"),
      descriptionWithDisclosure: parseOptionalText(formData, "description_with_disclosure"),
      pinnedCommentText: parseOptionalText(formData, "pinned_comment_text"),
      redditVariantA: parseOptionalText(formData, "reddit_variant_a"),
      redditVariantB: parseOptionalText(formData, "reddit_variant_b"),
      quoraVariantA: parseOptionalText(formData, "quora_variant_a"),
      quoraVariantB: parseOptionalText(formData, "quora_variant_b"),
      mediumVariant: parseOptionalText(formData, "medium_variant"),
      recommendedCta: parseOptionalText(formData, "recommended_cta"),
      youtubeUrl: parseOptionalUrl(formData, "youtube_url"),
      redditSharedUrl: parseOptionalUrl(formData, "reddit_shared_url"),
      quoraSharedUrl: parseOptionalUrl(formData, "quora_shared_url"),
      mediumSharedUrl: parseOptionalUrl(formData, "medium_shared_url"),
      youtubeViews: parseOptionalInteger(formData, "youtube_views", "YouTube views"),
      campaignLinkId: parseOptionalText(formData, "campaign_link_id"),
      campaignLinkUrl: parseOptionalUrl(formData, "campaign_link_url"),
      notes: parseOptionalText(formData, "notes"),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save the YouTube workflow."

    redirect(`/dashboard/products/${productId}?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard/products")
  revalidatePath(`/dashboard/products/${productId}`)
  redirect(`/dashboard/products/${productId}?distributionSaved=1`)
}
