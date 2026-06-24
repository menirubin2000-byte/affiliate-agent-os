"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { buildFinalContentHash, validateFinalCopyForPlatform } from "@/lib/content-review"
import {
  createAffiliateProgram,
  createProduct,
  listAffiliateProgramsForProduct,
  listProducts,
  updateAffiliateProgramLink,
} from "@/lib/db"
import { assertIntegrationConfigured } from "@/lib/env"
import { buildPlatformBody, hashCampaignContent } from "@/lib/campaign-workflow"
import { CAMPAIGN_PLATFORMS } from "@/lib/platform-policy"
import { evaluatePostMediaGate } from "@/lib/post-media-policy"
import { getServiceRoleSupabase } from "@/lib/supabase/server"
import { slugify } from "@/lib/utils"
import type { CampaignPlatform } from "@/types/campaign-workflow"
import type { ProductStatus } from "@/types/product"

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

function optionalHttpUrl(value: string, fieldLabel: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error()
    return trimmed
  } catch {
    throw new Error(`${fieldLabel} must be a valid http or https URL.`)
  }
}

function inferReadyPostTitle(productName: string, inputTitle: string, body: string) {
  if (inputTitle.trim()) return inputTitle.trim()
  const firstLine = body.split(/\r?\n/).map((line) => line.trim()).find(Boolean)
  return firstLine && firstLine.length <= 120 ? firstLine : productName
}

function normalizeReadyPostLanguage(value: string) {
  return value === "he" ? "he" : "en"
}

async function createReadyPostsForNewProduct(input: {
  productId: string
  productName: string
  title: string
  body: string
  language: "en" | "he"
  targetKeyword: string | null
  contentAngle: string | null
  affiliateProgramId: string | null
  affiliateLink: string
  imageUrl: string | null
  imageUrlHe: string | null
  videoUrl: string | null
}) {
  const supabase = getServiceRoleSupabase()
  const body = input.body.trim()
  const contentHash = hashCampaignContent([input.productId, input.title, body, input.targetKeyword])
  const { data: source, error: sourceError } = await supabase
    .from("source_contents")
    .upsert(
      {
        product_id: input.productId,
        campaign_name: `${input.productName} ready campaign`,
        angle: input.contentAngle,
        title: input.title,
        body,
        target_keyword: input.targetKeyword,
        content_hash: contentHash,
        quality_checks: {
          createdFromProductReadyPost: true,
          language: input.language,
        },
        status: "active",
      },
      { onConflict: "product_id,content_hash" },
    )
    .select("id")
    .single()

  if (sourceError || !source) {
    throw new Error(`Unable to create source content for approval: ${sourceError?.message ?? "unknown_error"}`)
  }

  const adaptationRows = CAMPAIGN_PLATFORMS.map((platform) => {
    const platformBody = buildPlatformBody({
      platform,
      sourceBody: body,
      campaignLinkUrl: input.affiliateLink,
      affiliateLink: input.affiliateLink,
    })

    return {
      source_content_id: source.id,
      product_id: input.productId,
      platform,
      title: input.title,
      body: platformBody,
      campaign_link_id: null,
      campaign_link_url: input.affiliateLink,
      content_hash: hashCampaignContent([source.id, platform, input.title, platformBody, input.affiliateLink]),
      quality_checks: {
        createdFromProductReadyPost: true,
        language: input.language,
      },
      auto_quality_status: "auto_quality_passed",
      blocking_reason: null,
      policy_check_status: "allowed",
      policy_checked_at: new Date().toISOString(),
      policy_source_url: null,
      policy_notes: "Created from product ready post intake.",
      publish_mode: "manual",
      manual_fallback_required: true,
      output_verification_required: true,
      campaign_approval_status: "campaign_approved",
    }
  })

  const { data: adaptations, error: adaptationError } = await supabase
    .from("platform_adaptations")
    .upsert(adaptationRows, { onConflict: "source_content_id,platform,content_hash" })
    .select("id, platform, title, body")

  if (adaptationError) {
    throw new Error(`Unable to create platform posts for approval: ${adaptationError.message}`)
  }

  const finalCopyRows = ((adaptations ?? []) as Array<{
    id: string
    platform: CampaignPlatform
    title: string
    body: string
  }>).map((adaptation) => {
    const validation = validateFinalCopyForPlatform({
      body: adaptation.body,
      platform: adaptation.platform,
      finalAffiliateLink: input.affiliateLink,
      language: input.language,
    })
    const media = evaluatePostMediaGate({
      platform: adaptation.platform,
      language: input.language,
      product: {
        image_url: input.imageUrl,
        image_url_he: input.imageUrlHe,
        video_url: input.videoUrl,
      },
    })
    const blockingReasons = Array.from(
      new Set([...validation.blockingReasons, ...(media.blockingReason ? [media.blockingReason] : [])]),
    )
    const ready = validation.validationStatus === "valid" && media.mediaReady && blockingReasons.length === 0

    return {
      product_id: input.productId,
      affiliate_program_id: input.affiliateProgramId,
      affiliate_link: input.affiliateLink,
      source_content_id: source.id,
      platform_adaptation_id: adaptation.id,
      platform: adaptation.platform,
      language: input.language,
      title: adaptation.title,
      body: adaptation.body,
      content_hash: buildFinalContentHash({
        productId: input.productId,
        sourceContentId: source.id,
        adaptationId: adaptation.id,
        platform: adaptation.platform,
        title: adaptation.title,
        body: adaptation.body,
      }),
      version: 1,
      status: ready ? "ready_for_operator_approval" : "needs_system_fix",
      validation_status: validation.validationStatus,
      blocking_reasons: blockingReasons,
      image_url: media.imageUrl,
      media_asset_url: media.mediaUrl,
      media_status: media.mediaStatus,
      needs_media_repair: !media.mediaReady,
    }
  })

  if (!finalCopyRows.length) return 0

  const { error: finalCopyError } = await supabase.from("final_copies").insert(finalCopyRows)
  if (finalCopyError) {
    throw new Error(`Unable to create approval posts: ${finalCopyError.message}`)
  }

  return finalCopyRows.length
}

export async function createProductAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const requestedSlug = String(formData.get("slug") ?? "").trim()
  const affiliateUrl = String(formData.get("affiliate_url") ?? "").trim()
  const status = String(formData.get("status") ?? "active") as ProductStatus
  const imageUrlInput = String(formData.get("image_url") ?? "")
  const imageUrlHeInput = String(formData.get("image_url_he") ?? "")
  const videoUrlInput = String(formData.get("video_url") ?? "")
  const readyPostBody = String(formData.get("ready_post_body") ?? "").trim()
  const readyPostLanguage = normalizeReadyPostLanguage(String(formData.get("ready_post_language") ?? "en"))
  const readyPostTitle = inferReadyPostTitle(name, String(formData.get("ready_post_title") ?? ""), readyPostBody)
  let readyPostCount = 0

  try {
    assertIntegrationConfigured("supabase")

    if (!name || !affiliateUrl) {
      throw new Error("Product name and affiliate URL are required.")
    }

    if (!isValidStatus(status)) {
      throw new Error("Product status must be active or inactive.")
    }

    assertValidHttpUrl(affiliateUrl)
    const imageUrl = optionalHttpUrl(imageUrlInput, "Image URL")
    const imageUrlHe = optionalHttpUrl(imageUrlHeInput, "Hebrew image URL")
    const videoUrl = optionalHttpUrl(videoUrlInput, "Video URL")

    const slug = await buildUniqueSlug(chooseSlug(name, requestedSlug))
    const commissionRateInput = String(formData.get("commission_rate") ?? "").trim()
    const product = await createProduct({
      name,
      slug,
      brand: String(formData.get("brand") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      affiliateLink: affiliateUrl,
      affiliateUrl,
      imageUrl,
      imageUrlHe,
      videoUrl,
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
    let affiliateProgramId = firstProgram?.id ?? null

    if (firstProgram) {
      await updateAffiliateProgramLink(firstProgram.id, affiliateUrl)
    } else {
      const program = await createAffiliateProgram({
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
      affiliateProgramId = program.id
    }

    if (readyPostBody) {
      readyPostCount = await createReadyPostsForNewProduct({
        productId: product.id,
        productName: product.name,
        title: readyPostTitle,
        body: readyPostBody,
        language: readyPostLanguage,
        targetKeyword: String(formData.get("target_keyword") ?? "").trim() || null,
        contentAngle: String(formData.get("content_angle") ?? "").trim() || null,
        affiliateProgramId,
        affiliateLink: affiliateUrl,
        imageUrl,
        imageUrlHe,
        videoUrl,
      })
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create product."

    redirect(`/dashboard/products/new?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/products")
  revalidatePath("/dashboard/he/approve")
  if (readyPostCount > 0) {
    redirect(`/dashboard/he/approve?approved=product_ready_posts_created&created=${readyPostCount}`)
  }
  redirect("/dashboard/products?created=1")
}
