"use server"

import OpenAI from "openai"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  createSourceContentFromLatestApprovedDraft,
  syncPlatformAdaptations,
} from "@/lib/campaign-workflow-db"
import { hashCampaignContent } from "@/lib/campaign-workflow"
import {
  approveFinalCopy,
  rejectFinalCopy,
  requestFinalCopySystemFix,
} from "@/lib/content-review-db"
import { validateFinalCopyForPlatform } from "@/lib/content-review"
import {
  assertMeniConfirmToken,
  buildMissingPlatformLanguageDrafts,
} from "@/lib/draft-approval-workflow"
import { assertIntegrationConfigured } from "@/lib/env"
import { recordVerifiedManualPublishForFinalCopy } from "@/lib/manual-publish-reconciliation"
import { requiresImageForPost, requiresVideoForPost } from "@/lib/post-media-policy"
import { getServiceRoleSupabase } from "@/lib/supabase/server"
import type { CampaignPlatform } from "@/types/campaign-workflow"

function fail(reason: string, redirectPath = "/dashboard/he/approve"): never {
  redirect(`${redirectPath}?error=${encodeURIComponent(reason)}`)
}

function getApprovalRedirectPath(formData: FormData, fallback = "/dashboard/he/approve") {
  const value = String(formData.get("redirectTo") ?? "").trim()
  if (!value.startsWith("/dashboard/he/approve")) return fallback
  return value
}

function redirectWithParams(
  redirectPath: string,
  params: Record<string, string | number | undefined>,
): never {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    search.set(key, String(value))
  }
  redirect(`${redirectPath}?${search.toString()}`)
}

const NORMAL_POST_PLATFORMS: CampaignPlatform[] = [
  "facebook_page",
  "instagram_professional",
  "linkedin",
  "medium",
  "substack",
  "pinterest",
  "x_twitter",
  "threads",
]

const COMMUNITY_POST_PLATFORMS: CampaignPlatform[] = ["quora", "reddit"]
const VIDEO_POST_PLATFORMS: CampaignPlatform[] = ["youtube", "tiktok"]
const NORMAL_POST_PLATFORM_SET = new Set<string>(NORMAL_POST_PLATFORMS)
const NON_PUBLISHED_FINAL_COPY_STATUSES = new Set<string>([
  "draft_internal",
  "needs_system_fix",
  "validated",
  "ready_for_operator_approval",
  "operator_rejected",
  "operator_approved",
  "ready_for_manual_publish",
  "published_verified",
])

// Two bulk-edit groups only: community (Quora/Reddit — special no-direct-link
// rules) and general (everything else, including video). Editing one group
// never touches the other.
const GENERAL_POST_PLATFORMS: CampaignPlatform[] = [
  ...NORMAL_POST_PLATFORMS,
  ...VIDEO_POST_PLATFORMS,
]

// Every platform the "add missing platforms" action can create for a product —
// normal social, video (YouTube/TikTok) and community (Quora/Reddit). Community
// and video copies are created from the normal post body and start as
// needs_system_fix when their stricter rules (no direct link / video required)
// are not yet met, so they appear and can be adapted instead of being skipped.
const ALL_POST_PLATFORMS: CampaignPlatform[] = [
  ...NORMAL_POST_PLATFORMS,
  ...VIDEO_POST_PLATFORMS,
  ...COMMUNITY_POST_PLATFORMS,
]

type FinalCopyTemplateRow = {
  id: string
  platform: CampaignPlatform
  language: string | null
  status: string
  title: string | null
  body: string | null
  source_content_id: string | null
  platform_adaptation_id: string | null
  affiliate_program_id: string | null
  affiliate_link: string | null
  image_url: string | null
  media_asset_url: string | null
  products:
    | { image_url: string | null; image_url_he: string | null; video_url: string | null }
    | Array<{ image_url: string | null; image_url_he: string | null; video_url: string | null }>
    | null
}

function getBulkEditPlatformGroup(platform: string): CampaignPlatform[] {
  if (COMMUNITY_POST_PLATFORMS.includes(platform as CampaignPlatform)) return COMMUNITY_POST_PLATFORMS
  return GENERAL_POST_PLATFORMS
}

function oppositeLanguage(language: string | null | undefined): "en" | "he" {
  return language === "he" ? "en" : "he"
}

function languageLabel(language: "en" | "he") {
  return language === "he" ? "Hebrew" : "English"
}

function ensureAffiliateDisclosure(body: string, language: "en" | "he") {
  const trimmed = body.trim()
  const lower = trimmed.toLowerCase()
  if (lower.includes("affiliate disclosure") || trimmed.includes("גילוי נאות")) return trimmed

  const disclosure =
    language === "he"
      ? "גילוי נאות: הפוסט כולל קישור שותפים, ואם תרכשו דרכו ייתכן שאקבל עמלה ללא עלות נוספת עבורכם."
      : "Affiliate disclosure: This post includes an affiliate link. If you buy through it, I may earn a commission at no extra cost to you."

  return `${disclosure}\n\n${trimmed}`
}

function getRequestedPlatforms(formData: FormData): CampaignPlatform[] {
  const requested = [
    ...formData.getAll("platforms").map((value) => String(value ?? "").trim()),
    String(formData.get("platform") ?? "").trim(),
  ].filter(Boolean)

  const unique = Array.from(new Set(requested))
  if (!unique.length) return []
  if (unique.some((value) => !ALL_POST_PLATFORMS.includes(value as CampaignPlatform))) {
    fail("unsupported_platform")
  }

  return unique as CampaignPlatform[]
}

async function createFinalCopyForSelectedPlatform(input: {
  supabase: ReturnType<typeof getServiceRoleSupabase>
  productId: string
  platform: CampaignPlatform
  language: "en" | "he"
  existingCopies: FinalCopyTemplateRow[]
}) {
  const template =
    input.existingCopies.find((fc) => fc.language === input.language && NORMAL_POST_PLATFORM_SET.has(fc.platform)) ??
    input.existingCopies.find((fc) => fc.language === input.language) ??
    input.existingCopies.find((fc) => NORMAL_POST_PLATFORM_SET.has(fc.platform)) ??
    input.existingCopies[0]

  if (!template?.body || !template.source_content_id) fail("no_source_copy_for_selected_platform")
  const body = ensureAffiliateDisclosure(template.body, input.language)

  let sourceContentId = template.source_content_id
  let adaptationId = template.platform_adaptation_id

  const { data: existingAdaptation, error: existingAdaptationError } = await input.supabase
    .from("platform_adaptations")
    .select("id, source_content_id")
    .eq("product_id", input.productId)
    .eq("platform", input.platform)
    .limit(1)
    .maybeSingle()
  if (existingAdaptationError) fail(existingAdaptationError.message)

  if (existingAdaptation) {
    adaptationId = existingAdaptation.id
    sourceContentId = existingAdaptation.source_content_id
  } else {
    const adaptationHash = hashCampaignContent([input.productId, sourceContentId, input.platform, input.language, body])
    const { data: newAdaptation, error: adaptError } = await input.supabase
      .from("platform_adaptations")
      .insert({
        source_content_id: sourceContentId,
        product_id: input.productId,
        platform: input.platform,
        title: template.title ?? "",
        body,
        content_hash: adaptationHash,
        campaign_approval_status: "campaign_approved",
      })
      .select("id")
      .single()
    if (adaptError) fail(adaptError.message)
    adaptationId = newAdaptation.id
  }

  let nextVersion = 1
  if (adaptationId) {
    const { data: latestVersion, error: latestVersionError } = await input.supabase
      .from("final_copies")
      .select("version")
      .eq("platform_adaptation_id", adaptationId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestVersionError) fail(latestVersionError.message)
    nextVersion = Number(latestVersion?.version ?? 0) + 1
  }

  const productRaw = template.products
  const product = Array.isArray(productRaw) ? productRaw[0] : productRaw
  const media = mediaForTranslatedCopy({
    platform: input.platform,
    language: input.language,
    currentMediaAssetUrl: template.media_asset_url,
    currentImageUrl: template.image_url,
    product: {
      image_url: product?.image_url ?? null,
      image_url_he: product?.image_url_he ?? null,
      video_url: product?.video_url ?? null,
    },
  })

  const validation = validateFinalCopyForPlatform({
    body,
    platform: input.platform,
    finalAffiliateLink: template.affiliate_link ?? undefined,
    language: input.language,
  })
  const blockingReasons = [...validation.blockingReasons, ...media.blockingReasons]
  const ready =
    validation.validationStatus === "valid" &&
    blockingReasons.length === 0 &&
    !COMMUNITY_POST_PLATFORMS.includes(input.platform)

  const contentHash = hashCampaignContent([
    input.productId,
    sourceContentId,
    adaptationId,
    input.platform,
    input.language,
    body,
  ])

  const { data: created, error: insertError } = await input.supabase
    .from("final_copies")
    .insert({
      product_id: input.productId,
      affiliate_program_id: template.affiliate_program_id,
      affiliate_link: template.affiliate_link,
      source_content_id: sourceContentId,
      platform_adaptation_id: adaptationId,
      platform: input.platform,
      language: input.language,
      title: template.title ?? "",
      body,
      content_hash: contentHash,
      version: nextVersion,
      status: ready ? "ready_for_operator_approval" : "needs_system_fix",
      validation_status: validation.validationStatus,
      blocking_reasons: blockingReasons,
      image_url: media.image_url,
      media_asset_url: media.media_asset_url,
      media_status: media.media_status,
      needs_media_repair: media.needs_media_repair,
    })
    .select("id")
    .single()
  if (insertError) fail(insertError.message)

  return created.id
}

async function translateFinalCopyText(input: {
  title: string
  body: string
  platform: string
  targetLanguage: "en" | "he"
}) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) fail("missing_openai_api_key_for_translation")

  const client = new OpenAI({ apiKey })
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "You translate affiliate post copy for an approval workflow. Return only compact JSON with title and body. Do not add claims, metrics, links, prices, reviews, or features that are not present. Preserve URLs exactly. Preserve affiliate disclosure. For Quora/Reddit, do not introduce direct affiliate links.",
      },
      {
        role: "user",
        content: JSON.stringify({
          target_language: languageLabel(input.targetLanguage),
          platform: input.platform,
          title: input.title,
          body: input.body,
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "translated_final_copy",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["title", "body"],
          properties: {
            title: { type: "string" },
            body: { type: "string" },
          },
        },
      },
    },
  })

  const raw = response.output_text
  const parsed = JSON.parse(raw) as { title?: string; body?: string }
  const title = parsed.title?.trim()
  const body = parsed.body?.trim()
  if (!title || !body) fail("translation_missing_title_or_body")
  return { title, body }
}

function mediaForTranslatedCopy(input: {
  platform: string
  language: "en" | "he"
  currentMediaAssetUrl: string | null
  currentImageUrl: string | null
  product: {
    image_url: string | null
    image_url_he: string | null
    video_url: string | null
  }
}) {
  const imageRequired = requiresImageForPost(input.platform)
  const videoRequired = requiresVideoForPost(input.platform)
  const imageUrl = input.language === "he" ? input.product.image_url_he : input.product.image_url
  const videoUrl = input.product.video_url ?? input.currentMediaAssetUrl

  if (videoRequired) {
    return {
      image_url: imageUrl,
      media_asset_url: videoUrl,
      media_status: videoUrl ? "ready" : "missing_video",
      needs_media_repair: !videoUrl,
      blockingReasons: videoUrl ? [] : ["video_required_for_ready"],
    }
  }

  if (imageRequired) {
    return {
      image_url: imageUrl,
      media_asset_url: imageUrl,
      media_status: imageUrl ? "ready" : "missing_image",
      needs_media_repair: !imageUrl,
      blockingReasons: imageUrl ? [] : ["image_required_for_ready"],
    }
  }

  return {
    image_url: imageUrl ?? input.currentImageUrl,
    media_asset_url: input.currentMediaAssetUrl,
    media_status: "not_required",
    needs_media_repair: false,
    blockingReasons: [],
  }
}

type ProductMediaForWorkflow = {
  image_url: string | null
  image_url_he: string | null
  video_url: string | null
}

type PlatformAdaptationSeed = {
  id: string
  source_content_id: string
  product_id: string
  platform: CampaignPlatform
  title: string | null
  body: string | null
}

async function getOrCreatePrimarySourceContentId(productId: string) {
  const supabase = getServiceRoleSupabase()
  const { data: existingSource, error: sourceError } = await supabase
    .from("source_contents")
    .select("id")
    .eq("product_id", productId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (sourceError) throw new Error(sourceError.message)
  if (existingSource?.id) return existingSource.id
  const created = await createSourceContentFromLatestApprovedDraft(productId)
  return created.id
}

async function loadPrimaryAffiliateProgram(productId: string) {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("affiliate_programs")
    .select("id, affiliate_link")
    .eq("product_id", productId)
    .eq("status", "link_ready")
    .not("affiliate_link", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as { id: string; affiliate_link: string | null } | null
}

async function loadProductMediaForWorkflow(productId: string) {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("products")
    .select("affiliate_url, image_url, image_url_he, video_url")
    .eq("id", productId)
    .single()
  if (error || !data) throw new Error(error?.message ?? "product_not_found")
  return data as {
    affiliate_url: string | null
    image_url: string | null
    image_url_he: string | null
    video_url: string | null
  }
}

async function createMissingEnglishFinalCopiesForProduct(productId: string) {
  const supabase = getServiceRoleSupabase()
  const { data: existingRows, error: existingError } = await supabase
    .from("final_copies")
    .select("id, platform, language, source_content_id, platform_adaptation_id, version")
    .eq("product_id", productId)
    .order("updated_at", { ascending: false })
  if (existingError) throw new Error(existingError.message)

  const existingFinalCopies = (existingRows ?? []) as Array<{
    id: string
    platform: CampaignPlatform
    language: string | null
    source_content_id: string
    platform_adaptation_id: string | null
    version: number | null
  }>

  const missingDrafts = buildMissingPlatformLanguageDrafts({
    existingFinalCopies: existingFinalCopies.map((row) => ({
      id: row.id,
      productId,
      platform: row.platform,
      language: row.language,
      status: "existing",
    })),
    languages: ["en"],
  })

  if (missingDrafts.length === 0) return { created: 0, skipped: 0 }

  const sourceContentId =
    existingFinalCopies[0]?.source_content_id ?? await getOrCreatePrimarySourceContentId(productId)
  const syncedAdaptations = await syncPlatformAdaptations(sourceContentId)
  const adaptationByPlatform = new Map(
    syncedAdaptations.map((adaptation) => [adaptation.platform, adaptation]),
  )
  const latestVersionByAdaptation = new Map<string, number>()
  for (const row of existingFinalCopies) {
    if (!row.platform_adaptation_id) continue
    latestVersionByAdaptation.set(
      row.platform_adaptation_id,
      Math.max(latestVersionByAdaptation.get(row.platform_adaptation_id) ?? 0, Number(row.version ?? 0)),
    )
  }

  const product = await loadProductMediaForWorkflow(productId)
  const program = await loadPrimaryAffiliateProgram(productId)
  const finalAffiliateLink = program?.affiliate_link?.trim() || product.affiliate_url?.trim() || null
  if (!finalAffiliateLink) throw new Error("missing_real_affiliate_link")

  let created = 0
  let skipped = 0
  for (const missing of missingDrafts) {
    const adaptation = adaptationByPlatform.get(missing.platform) as PlatformAdaptationSeed | undefined
    if (!adaptation?.body?.trim()) {
      skipped += 1
      continue
    }

    const media = mediaForTranslatedCopy({
      platform: missing.platform,
      language: "en",
      currentMediaAssetUrl: null,
      currentImageUrl: null,
      product,
    })
    const validation = validateFinalCopyForPlatform({
      body: adaptation.body,
      platform: missing.platform,
      finalAffiliateLink,
      language: "en",
    })
    const blockingReasons = [...validation.blockingReasons, ...media.blockingReasons]
    const ready =
      validation.validationStatus === "valid" &&
      blockingReasons.length === 0 &&
      !COMMUNITY_POST_PLATFORMS.includes(missing.platform)
    const contentHash = hashCampaignContent([
      productId,
      adaptation.source_content_id,
      adaptation.id,
      missing.platform,
      "en",
      adaptation.body,
    ])

    const { error: insertError } = await supabase.from("final_copies").insert({
      product_id: productId,
      affiliate_program_id: program?.id ?? null,
      affiliate_link: finalAffiliateLink,
      source_content_id: adaptation.source_content_id,
      platform_adaptation_id: adaptation.id,
      platform: missing.platform,
      language: "en",
      title: adaptation.title ?? "",
      body: adaptation.body,
      content_hash: contentHash,
      version: (latestVersionByAdaptation.get(adaptation.id) ?? 0) + 1,
      status: ready ? "ready_for_operator_approval" : "needs_system_fix",
      validation_status: validation.validationStatus,
      blocking_reasons: blockingReasons,
      image_url: media.image_url,
      media_asset_url: media.media_asset_url,
      media_status: media.media_status,
      needs_media_repair: media.needs_media_repair,
    })
    if (insertError) {
      skipped += 1
      continue
    }
    latestVersionByAdaptation.set(adaptation.id, (latestVersionByAdaptation.get(adaptation.id) ?? 0) + 1)
    created += 1
  }

  return { created, skipped }
}

async function createTranslatedFinalCopyForId(finalCopyId: string) {
  assertIntegrationConfigured("supabase")
  const supabase = getServiceRoleSupabase()
  const { data: fc, error: fcError } = await supabase
    .from("final_copies")
    .select(`
      id, product_id, affiliate_program_id, affiliate_link, source_content_id,
      platform_adaptation_id, platform, title, body, language, status, version,
      image_url, media_asset_url,
      products (image_url, image_url_he, video_url)
    `)
    .eq("id", finalCopyId)
    .single()
  if (fcError) throw new Error(fcError.message)
  if (!fc) throw new Error("post_not_found")
  if (fc.status === "published_verified") throw new Error("cannot_translate_published_post")

  const targetLanguage = oppositeLanguage(fc.language)
  const { data: existing, error: existingError } = await supabase
    .from("final_copies")
    .select("id")
    .eq("product_id", fc.product_id)
    .eq("platform", fc.platform)
    .eq("language", targetLanguage)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existingError) throw new Error(existingError.message)
  if (existing?.id) return { id: existing.id, created: false }

  const translated = await translateFinalCopyText({
    title: fc.title ?? "",
    body: fc.body ?? "",
    platform: fc.platform,
    targetLanguage,
  })

  const contentHash = hashCampaignContent([
    fc.product_id,
    fc.source_content_id,
    fc.platform,
    targetLanguage,
    translated.title,
    translated.body,
  ])

  const { data: adaptation, error: adaptationError } = await supabase
    .from("platform_adaptations")
    .insert({
      source_content_id: fc.source_content_id,
      product_id: fc.product_id,
      platform: fc.platform,
      title: translated.title,
      body: translated.body,
      content_hash: contentHash,
      campaign_approval_status: "campaign_approved",
    })
    .select("id")
    .single()
  if (adaptationError) throw new Error(adaptationError.message)

  const productRaw = fc.products as unknown as
    | { image_url: string | null; image_url_he: string | null; video_url: string | null }
    | Array<{ image_url: string | null; image_url_he: string | null; video_url: string | null }>
    | null
  const product = Array.isArray(productRaw) ? productRaw[0] : productRaw
  const media = mediaForTranslatedCopy({
    platform: fc.platform,
    language: targetLanguage,
    currentMediaAssetUrl: fc.media_asset_url,
    currentImageUrl: fc.image_url,
    product: {
      image_url: product?.image_url ?? null,
      image_url_he: product?.image_url_he ?? null,
      video_url: product?.video_url ?? null,
    },
  })

  const validation = validateFinalCopyForPlatform({
    body: translated.body,
    platform: fc.platform,
    finalAffiliateLink: fc.affiliate_link ?? undefined,
    language: targetLanguage,
  })
  const blockingReasons = [...validation.blockingReasons, ...media.blockingReasons]
  const ready = validation.validationStatus === "valid" && blockingReasons.length === 0

  const { data: created, error: insertError } = await supabase
    .from("final_copies")
    .insert({
      product_id: fc.product_id,
      affiliate_program_id: fc.affiliate_program_id,
      affiliate_link: fc.affiliate_link,
      source_content_id: fc.source_content_id,
      platform_adaptation_id: adaptation.id,
      platform: fc.platform,
      title: translated.title,
      body: translated.body,
      content_hash: contentHash,
      version: Number(fc.version ?? 0) + 1,
      status: ready ? "ready_for_operator_approval" : "needs_system_fix",
      validation_status: validation.validationStatus,
      blocking_reasons: blockingReasons,
      language: targetLanguage,
      image_url: media.image_url,
      media_asset_url: media.media_asset_url,
      media_status: media.media_status,
      needs_media_repair: media.needs_media_repair,
    })
    .select("id")
    .single()
  if (insertError) throw new Error(insertError.message)
  return { id: created.id, created: true }
}

async function createMissingLanguageFinalCopiesForProduct(productId: string) {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("final_copies")
    .select("id, platform, language, updated_at")
    .eq("product_id", productId)
    .order("updated_at", { ascending: false })
  if (error) throw new Error(error.message)

  const latestByPlatformLanguage = new Map<string, { id: string; platform: CampaignPlatform; language: "en" | "he" }>()
  for (const row of (data ?? []) as Array<{ id: string; platform: CampaignPlatform; language: string | null }>) {
    const language = row.language === "he" ? "he" : "en"
    const key = `${row.platform}::${language}`
    if (!latestByPlatformLanguage.has(key)) {
      latestByPlatformLanguage.set(key, { id: row.id, platform: row.platform, language })
    }
  }

  let created = 0
  let skipped = 0
  for (const platform of ALL_POST_PLATFORMS) {
    const en = latestByPlatformLanguage.get(`${platform}::en`)
    const he = latestByPlatformLanguage.get(`${platform}::he`)
    if (en && !he) {
      const result = await createTranslatedFinalCopyForId(en.id)
      if (result.created) created += 1
      else skipped += 1
    }
    if (he && !en) {
      const result = await createTranslatedFinalCopyForId(he.id)
      if (result.created) created += 1
      else skipped += 1
    }
  }
  return { created, skipped }
}

async function completeMissingFinalCopiesForProduct(productId: string) {
  const englishCoverage = await createMissingEnglishFinalCopiesForProduct(productId)
  const missingLanguageCoverage = await createMissingLanguageFinalCopiesForProduct(productId)

  return {
    englishCreated: englishCoverage.created,
    englishSkipped: englishCoverage.skipped,
    languagesCreated: missingLanguageCoverage.created,
    languagesSkipped: missingLanguageCoverage.skipped,
    totalCreated: englishCoverage.created + missingLanguageCoverage.created,
    totalSkipped: englishCoverage.skipped + missingLanguageCoverage.skipped,
  }
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
  revalidatePath("/dashboard/he/schedule")
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

export async function markPublishedByOperatorAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  const liveUrlInput = String(formData.get("liveUrl") ?? "").trim()
  if (!finalCopyId) fail("missing_final_copy_id")
  if (!liveUrlInput) fail("missing_live_url")

  try {
    assertIntegrationConfigured("supabase")
    await recordVerifiedManualPublishForFinalCopy({
      finalCopyId,
      liveUrl: liveUrlInput,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "mark_published_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/he/publish-ready")
  redirect(`/dashboard/he/approve/preview/${finalCopyId}?approved=marked_published`)
}

export async function createTranslatedFinalCopyAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  if (!finalCopyId) fail("missing_final_copy_id")

  try {
    const result = await createTranslatedFinalCopyForId(finalCopyId)
    revalidatePath("/dashboard/he/approve")
    revalidatePath("/dashboard/he/all-posts")
    redirect(`/dashboard/he/approve/preview/${result.id}?approved=translated_created`)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "translation_failed")
  }
}

// Create a BLANK, editable draft for every platform that has no final_copy yet.
// This guarantees the operator can always open and edit a draft per platform —
// even when there is no auto-generated content or affiliate link to seed it from.
async function createBlankDraftsForMissingPlatforms(productId: string) {
  const supabase = getServiceRoleSupabase()
  const { data: existingRows, error } = await supabase
    .from("final_copies")
    .select("platform, source_content_id")
    .eq("product_id", productId)
  if (error) throw new Error(error.message)

  const existing = (existingRows ?? []) as Array<{ platform: CampaignPlatform; source_content_id: string | null }>
  const existingPlatforms = new Set(existing.map((row) => row.platform))

  const missingPlatforms = ALL_POST_PLATFORMS.filter((platform) => !existingPlatforms.has(platform))
  if (missingPlatforms.length === 0) return { created: 0 }

  const sourceContentId =
    existing.find((row) => row.source_content_id)?.source_content_id ??
    (await getOrCreatePrimarySourceContentId(productId))

  const program = await loadPrimaryAffiliateProgram(productId).catch(() => null)
  let affiliateLink: string | null = program?.affiliate_link?.trim() || null
  if (!affiliateLink) {
    const product = await loadProductMediaForWorkflow(productId).catch(() => null)
    affiliateLink = product?.affiliate_url?.trim() || null
  }

  let created = 0
  for (const platform of missingPlatforms) {
    const contentHash = hashCampaignContent([productId, sourceContentId, platform, "blank-draft"])
    const { data: adaptation, error: adaptationError } = await supabase
      .from("platform_adaptations")
      .insert({
        source_content_id: sourceContentId,
        product_id: productId,
        platform,
        title: "",
        body: "",
        content_hash: contentHash,
        campaign_approval_status: "campaign_approved",
      })
      .select("id")
      .single()
    if (adaptationError || !adaptation) continue

    const { error: insertError } = await supabase.from("final_copies").insert({
      product_id: productId,
      affiliate_program_id: program?.id ?? null,
      affiliate_link: affiliateLink,
      source_content_id: sourceContentId,
      platform_adaptation_id: adaptation.id,
      platform,
      language: "he",
      title: "",
      body: "",
      content_hash: contentHash,
      version: 1,
      status: "draft_internal",
      validation_status: "blocked",
      blocking_reasons: ["טיוטה ריקה — מלא טקסט ושמור"],
    })
    if (!insertError) created += 1
  }
  return { created }
}

export async function createMissingDraftsForProductAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim()
  const redirectPath = getApprovalRedirectPath(formData)
  if (!productId) fail("missing_product_id", redirectPath)

  try {
    assertIntegrationConfigured("supabase")
    // Best-effort: seed real English content where the system can. Never block on it.
    let seeded = 0
    try {
      const result = await createMissingEnglishFinalCopiesForProduct(productId)
      seeded = result.created
    } catch {
      seeded = 0
    }
    // Always guarantee a blank editable draft for any platform still missing.
    const blanks = await createBlankDraftsForMissingPlatforms(productId)
    if (seeded + blanks.created === 0) fail("no_new_missing_drafts_created", redirectPath)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "create_missing_drafts_failed", redirectPath)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/he/all-posts")
  redirectWithParams(redirectPath, { approved: "product_drafts_created" })
}

export async function generateMissingLanguageContentForProductAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim()
  const redirectPath = getApprovalRedirectPath(formData)
  if (!productId) fail("missing_product_id", redirectPath)

  try {
    assertIntegrationConfigured("supabase")
    const result = await createMissingLanguageFinalCopiesForProduct(productId)
    if (result.created === 0) fail("no_missing_language_content_created", redirectPath)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "generate_missing_language_content_failed", redirectPath)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/he/all-posts")
  redirectWithParams(redirectPath, { approved: "product_languages_created" })
}

export async function approveAllReadyPostsForProductAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim()
  const confirmation = String(formData.get("confirmation") ?? "").trim()
  if (!productId) fail("missing_product_id")

  try {
    assertIntegrationConfigured("supabase")
    assertMeniConfirmToken(confirmation)
    const supabase = getServiceRoleSupabase()
    const { data: readyCopies, error } = await supabase
      .from("final_copies")
      .select("id")
      .eq("product_id", productId)
      .eq("status", "ready_for_operator_approval")
      .eq("validation_status", "valid")
      .order("updated_at", { ascending: false })
    if (error) fail(error.message)
    if (!readyCopies?.length) fail("no_ready_posts_for_product")
    for (const copy of readyCopies as Array<{ id: string }>) {
      await approveFinalCopy(copy.id)
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "approve_all_ready_posts_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/he/schedule")
  revalidatePath("/dashboard/he/publish-ready")
  redirect("/dashboard/he/approve?approved=product_bulk_approved")
}

export async function approveSelectedPostsAction(formData: FormData) {
  const redirectPath = getApprovalRedirectPath(formData)
  const selectedIds = Array.from(
    new Set(formData.getAll("finalCopyIds").map((value) => String(value ?? "").trim()).filter(Boolean)),
  )
  const confirmation = String(formData.get("confirmation") ?? "").trim()

  if (selectedIds.length === 0) fail("no_posts_selected", redirectPath)

  try {
    assertIntegrationConfigured("supabase")
    assertMeniConfirmToken(confirmation)
    const supabase = getServiceRoleSupabase()
    const { data: readyCopies, error } = await supabase
      .from("final_copies")
      .select("id")
      .in("id", selectedIds)
      .eq("status", "ready_for_operator_approval")
      .eq("validation_status", "valid")
    if (error) fail(error.message, redirectPath)
    if (!readyCopies?.length) fail("no_selected_ready_posts", redirectPath)

    for (const copy of readyCopies as Array<{ id: string }>) {
      await approveFinalCopy(copy.id)
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/he")
    revalidatePath("/dashboard/he/approve")
    revalidatePath("/dashboard/he/schedule")
    revalidatePath("/dashboard/he/publish-ready")
    revalidatePath("/dashboard/he/content-review")
    redirectWithParams(redirectPath, {
      approved: "selected_posts_approved",
      approvedCount: readyCopies.length,
      skipped: selectedIds.length - readyCopies.length,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "approve_selected_posts_failed", redirectPath)
  }
}

export async function deleteFinalCopyAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  if (!finalCopyId) fail("missing_final_copy_id")

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const { data: fc } = await supabase
      .from("final_copies")
      .select("status")
      .eq("id", finalCopyId)
      .single()
    if (fc?.status === "published_verified") fail("cannot_delete_published_post")
    const { error } = await supabase.from("final_copies").delete().eq("id", finalCopyId)
    if (error) fail(error.message)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "delete_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he/approve")
  redirect("/dashboard/he/approve?approved=post_deleted")
}

export async function deleteProductAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim()
  if (!productId) fail("missing_product_id")

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const { error } = await supabase.from("products").delete().eq("id", productId)
    if (error) fail(error.message)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "delete_product_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/products")
  redirect("/dashboard/he/approve?approved=product_deleted")
}

export async function updateFinalCopyBodyAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  const body = String(formData.get("body") ?? "")
  if (!finalCopyId) fail("missing_final_copy_id")

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const { data: fc } = await supabase
      .from("final_copies")
      .select("status")
      .eq("id", finalCopyId)
      .single()
    if (fc?.status === "published_verified") fail("cannot_edit_published_post")
    const { error } = await supabase
      .from("final_copies")
      .update({ body })
      .eq("id", finalCopyId)
    if (error) fail(error.message)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "update_failed")
  }

  revalidatePath("/dashboard/he/approve")
  redirect(`/dashboard/he/approve/preview/${finalCopyId}?approved=body_updated`)
}

export async function updateAllProductPostsBodyAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  const body = String(formData.get("body") ?? "")
  if (!finalCopyId) fail("missing_final_copy_id")

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const { data: fc } = await supabase
      .from("final_copies")
      .select("product_id, platform, language, status")
      .eq("id", finalCopyId)
      .single()
    if (!fc) fail("post_not_found")
    if (fc.status === "published_verified") fail("cannot_edit_published_post")
    const platformGroup = getBulkEditPlatformGroup(fc.platform)

    const { error } = await supabase
      .from("final_copies")
      .update({ body })
      .eq("product_id", fc.product_id)
      .eq("language", fc.language)
      .in("platform", platformGroup)
      .neq("status", "published_verified")
    if (error) fail(error.message)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "update_all_failed")
  }

  revalidatePath("/dashboard/he/approve")
  redirect(`/dashboard/he/approve/preview/${finalCopyId}?approved=all_posts_updated`)
}

export async function updateSelectedProductPostsBodyAction(formData: FormData) {
  const redirectPath = getApprovalRedirectPath(formData)
  const selectedIds = Array.from(
    new Set(formData.getAll("finalCopyIds").map((value) => String(value ?? "").trim()).filter(Boolean)),
  )
  const body = String(formData.get("body") ?? "")

  if (selectedIds.length === 0) fail("no_posts_selected", redirectPath)
  if (!body.trim()) fail("missing_body", redirectPath)

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const { data: copies, error } = await supabase
      .from("final_copies")
      .select("id, product_id, status")
      .in("id", selectedIds)
    if (error) fail(error.message, redirectPath)
    if (!copies?.length) fail("selected_posts_not_found", redirectPath)

    const editableCopies = copies.filter((copy) => copy.status !== "published_verified")
    if (!editableCopies.length) fail("cannot_edit_published_post", redirectPath)

    const productIds = new Set(editableCopies.map((copy) => copy.product_id))
    if (productIds.size > 1) fail("selected_posts_must_belong_to_one_product", redirectPath)

    const { error: updateError } = await supabase
      .from("final_copies")
      .update({ body })
      .in("id", editableCopies.map((copy) => copy.id))
    if (updateError) fail(updateError.message, redirectPath)

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/he")
    revalidatePath("/dashboard/he/approve")
    revalidatePath("/dashboard/he/all-posts")
    redirectWithParams(redirectPath, {
      approved: "selected_posts_updated",
      updatedCount: editableCopies.length,
      skipped: selectedIds.length - editableCopies.length,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "update_selected_posts_failed", redirectPath)
  }
}

export async function uploadProductImageAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim()
  const language = String(formData.get("language") ?? "en")
  const file = formData.get("image") as File | null
  if (!productId || !file || file.size === 0) fail("missing_image")

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const ext = file.name.split(".").pop() ?? "png"
    const path = `product-images/${productId}/${language}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, buffer, { contentType: file.type, upsert: true })
    if (uploadError) fail(uploadError.message)
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path)
    const col = language === "he" ? "image_url_he" : "image_url"
    const { error } = await supabase
      .from("products")
      .update({ [col]: urlData.publicUrl, asset_synced_at: new Date().toISOString() })
      .eq("id", productId)
    if (error) fail(error.message)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "upload_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he/approve")
  redirect(`/dashboard/he/approve?approved=image_uploaded`)
}

export async function getVideoUploadSignedUrl(
  productId: string,
  ext: string,
): Promise<{ token: string; storagePath: string } | { error: string }> {
  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const storagePath = `product-videos/${productId}/video.${ext}`

    await supabase.storage.from("media").remove([storagePath])

    const { data, error } = await supabase.storage
      .from("media")
      .createSignedUploadUrl(storagePath)
    if (error) return { error: error.message }
    return { token: data.token, storagePath }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "signed_url_failed" }
  }
}

export async function confirmVideoUpload(
  productId: string,
  storagePath: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const { data: urlData } = supabase.storage.from("media").getPublicUrl(storagePath)
    const { error } = await supabase
      .from("products")
      .update({ video_url: urlData.publicUrl, video_status: "ready", asset_synced_at: new Date().toISOString() })
      .eq("id", productId)
    if (error) return { error: error.message }
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/he/approve")
    return { ok: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "confirm_failed" }
  }
}

export async function deleteProductVideoAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim()
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  if (!productId) fail("missing_product_id")

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()

    // Best-effort remove the stored object so the slot is free for re-upload.
    const { data: prod } = await supabase
      .from("products")
      .select("video_url")
      .eq("id", productId)
      .single()
    const url = prod?.video_url ?? ""
    const marker = "/media/"
    const idx = url.indexOf(marker)
    if (idx >= 0) {
      const path = url.slice(idx + marker.length)
      if (path) {
        try {
          await supabase.storage.from("media").remove([path])
        } catch {
          // Storage cleanup is best-effort; clearing the DB pointer is what matters.
        }
      }
    }

    const { error } = await supabase
      .from("products")
      .update({ video_url: null, video_status: null })
      .eq("id", productId)
    if (error) fail(error.message)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "delete_video_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he/approve")
  if (finalCopyId) {
    redirect(`/dashboard/he/approve/preview/${finalCopyId}?approved=video_deleted`)
  }
  redirect("/dashboard/he/approve?approved=video_deleted")
}

export async function addMissingPlatformPostsAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim()
  if (!productId) fail("missing_product_id")

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()

    const { data: existing } = await supabase
      .from("final_copies")
      .select("id, platform, language, body, source_content_id, platform_adaptation_id, affiliate_link")
      .eq("product_id", productId)
      .order("updated_at", { ascending: false })

    if (!existing?.length) fail("no_existing_posts_to_copy_from")

    const templateByLang = new Map<string, typeof existing[0]>()
    for (const fc of existing) {
      if (!NORMAL_POST_PLATFORM_SET.has(fc.platform)) continue
      const lang = fc.language ?? "en"
      if (!templateByLang.has(lang)) templateByLang.set(lang, fc)
    }
    if (templateByLang.size === 0) fail("no_normal_platform_source_copy")

    const existingPlatforms = new Set(existing.map((fc) => `${fc.platform}::${fc.language ?? "en"}`))

    let created = 0
    for (const [lang, template] of templateByLang) {
      for (const platform of ALL_POST_PLATFORMS) {
        const key = `${platform}::${lang}`
        if (existingPlatforms.has(key)) continue

        let sourceContentId = template.source_content_id
        let adaptationId = template.platform_adaptation_id

        const { data: existingAdaptation } = await supabase
          .from("platform_adaptations")
          .select("id, source_content_id")
          .eq("product_id", productId)
          .eq("platform", platform)
          .limit(1)
          .maybeSingle()

        if (existingAdaptation) {
          adaptationId = existingAdaptation.id
          sourceContentId = existingAdaptation.source_content_id
        } else {
          const contentHash = hashCampaignContent([productId, sourceContentId, platform, template.body])
          const { data: newAdaptation, error: adaptError } = await supabase
            .from("platform_adaptations")
            .insert({
              source_content_id: sourceContentId,
              product_id: productId,
              platform,
              title: "",
              body: template.body,
              content_hash: contentHash,
              campaign_approval_status: "campaign_approved",
            })
            .select("id")
            .single()
          if (adaptError) continue
          adaptationId = newAdaptation.id
        }

        const fcContentHash = hashCampaignContent([
          productId, sourceContentId, adaptationId, platform, lang, template.body,
        ])

        const validation = validateFinalCopyForPlatform({
          body: template.body,
          platform,
          finalAffiliateLink: template.affiliate_link ?? undefined,
          language: lang,
        })

        const { error: insertError } = await supabase
          .from("final_copies")
          .insert({
            product_id: productId,
            affiliate_program_id: null,
            affiliate_link: template.affiliate_link,
            source_content_id: sourceContentId,
            platform_adaptation_id: adaptationId,
            platform,
            language: lang,
            title: "",
            body: template.body,
            content_hash: fcContentHash,
            version: 1,
            // Community posts (Quora/Reddit) must never start ready with a
            // direct affiliate link copied from the source — they need
            // indirect-link adaptation first, so force them to needs_system_fix.
            status:
              validation.validationStatus === "valid" &&
              !COMMUNITY_POST_PLATFORMS.includes(platform)
                ? "ready_for_operator_approval"
                : "needs_system_fix",
            validation_status: validation.validationStatus,
            blocking_reasons: validation.blockingReasons,
          })
        if (!insertError) created += 1
      }
    }

    if (created === 0) fail("no_new_posts_created_all_platforms_already_exist")
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "add_posts_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  redirect("/dashboard/he/approve?approved=posts_added")
}

export async function addSelectedPlatformPostAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim()
  const requestedPlatforms = getRequestedPlatforms(formData)
  const languageInput = String(formData.get("language") ?? "he").trim()
  const language = languageInput === "en" ? "en" : "he"
  const redirectPath = getApprovalRedirectPath(formData)

  if (!productId) fail("missing_product_id", redirectPath)
  if (requestedPlatforms.length === 0) fail("no_platform_selected", redirectPath)

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()

    const { data: existing, error: existingError } = await supabase
      .from("final_copies")
      .select(`
        id, platform, language, status, title, body, source_content_id,
        platform_adaptation_id, affiliate_program_id, affiliate_link,
        image_url, media_asset_url, products (image_url, image_url_he, video_url)
      `)
      .eq("product_id", productId)
      .order("updated_at", { ascending: false })
    if (existingError) fail(existingError.message, redirectPath)
    if (!existing?.length) fail("no_existing_posts_to_copy_from", redirectPath)

    const existingCopies = existing as FinalCopyTemplateRow[]
    const dedupeCandidates = existingCopies
      .filter((row) => NON_PUBLISHED_FINAL_COPY_STATUSES.has(row.status))
      .map((row) => ({
        id: row.id,
        productId,
        platform: row.platform,
        language: row.language,
        status: row.status,
      }))
    const missingSelections = buildMissingPlatformLanguageDrafts({
      existingFinalCopies: dedupeCandidates,
      platforms: requestedPlatforms,
      languages: [language],
    })
    const selectedPlatforms = missingSelections.map((row) => row.platform)
    const skippedCount = requestedPlatforms.length - selectedPlatforms.length

    if (selectedPlatforms.length === 0) {
      const params = new URLSearchParams({
        approved: "selected_platforms_already_exist",
        skipped: String(skippedCount),
      })
      revalidatePath("/dashboard/he/approve")
      redirect(`${redirectPath}?${params.toString()}`)
    }

    let createdCount = 0
    for (const platform of selectedPlatforms) {
      await createFinalCopyForSelectedPlatform({
        supabase,
        productId,
        platform,
        language,
        existingCopies,
      })
      createdCount += 1
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/he")
    revalidatePath("/dashboard/he/approve")
    revalidatePath("/dashboard/he/all-posts")
    const params = new URLSearchParams({
      approved: "selected_platforms_added",
      created: String(createdCount),
      skipped: String(skippedCount),
    })
    redirect(`${redirectPath}?${params.toString()}`)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "add_selected_platform_failed", redirectPath)
  }
}

export async function addAllMissingPlatformPostsForProductAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim()
  const redirectPath = getApprovalRedirectPath(formData)

  if (!productId) fail("missing_product_id", redirectPath)

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const { data: existingRows, error: existingError } = await supabase
      .from("final_copies")
      .select("id, platform, language, status")
      .eq("product_id", productId)
      .order("updated_at", { ascending: false })
    if (existingError) fail(existingError.message, redirectPath)

    const missingBefore = buildMissingPlatformLanguageDrafts({
      existingFinalCopies: ((existingRows ?? []) as Array<{
        id: string
        platform: CampaignPlatform
        language: string | null
        status: string
      }>).map((row) => ({
        id: row.id,
        productId,
        platform: row.platform,
        language: row.language,
        status: row.status,
      })),
    }).length

    const result = await completeMissingFinalCopiesForProduct(productId)
    if (result.totalCreated === 0) {
      if (missingBefore === 0) {
        redirectWithParams(redirectPath, { approved: "product_missing_already_complete" })
      }
      fail("no_missing_product_content_created", redirectPath)
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/he")
    revalidatePath("/dashboard/he/approve")
    revalidatePath("/dashboard/he/all-posts")
    redirectWithParams(redirectPath, {
      approved: "product_missing_completed",
      created: result.totalCreated,
      platformsCreated: result.englishCreated,
      languagesCreated: result.languagesCreated,
      skipped: result.totalSkipped,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "add_all_missing_platforms_failed", redirectPath)
  }
}

export async function addMissingPostsForAllProductsAction() {
  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()

    const { data: products } = await supabase
      .from("products")
      .select("id")
      .order("updated_at", { ascending: false })

    if (!products?.length) fail("no_products_found")

    let totalCreated = 0
    for (const product of products) {
      const { data: existing } = await supabase
        .from("final_copies")
        .select("id, platform, language, body, source_content_id, platform_adaptation_id, affiliate_link")
        .eq("product_id", product.id)
        .order("updated_at", { ascending: false })

      if (!existing?.length) continue

      const templateByLang = new Map<string, typeof existing[0]>()
      for (const fc of existing) {
        if (!NORMAL_POST_PLATFORM_SET.has(fc.platform)) continue
        const lang = fc.language ?? "en"
        if (!templateByLang.has(lang)) templateByLang.set(lang, fc)
      }
      if (templateByLang.size === 0) continue

      const existingPlatforms = new Set(existing.map((fc) => `${fc.platform}::${fc.language ?? "en"}`))

      for (const [lang, template] of templateByLang) {
        for (const platform of ALL_POST_PLATFORMS) {
          const key = `${platform}::${lang}`
          if (existingPlatforms.has(key)) continue

          let sourceContentId = template.source_content_id
          let adaptationId = template.platform_adaptation_id

          const { data: existingAdaptation } = await supabase
            .from("platform_adaptations")
            .select("id, source_content_id")
            .eq("product_id", product.id)
            .eq("platform", platform)
            .limit(1)
            .maybeSingle()

          if (existingAdaptation) {
            adaptationId = existingAdaptation.id
            sourceContentId = existingAdaptation.source_content_id
          } else {
            const contentHash = hashCampaignContent([product.id, sourceContentId, platform, template.body])
            const { data: newAdaptation, error: adaptError } = await supabase
              .from("platform_adaptations")
              .insert({
                source_content_id: sourceContentId,
                product_id: product.id,
                platform,
                title: "",
                body: template.body,
                content_hash: contentHash,
                campaign_approval_status: "campaign_approved",
              })
              .select("id")
              .single()
            if (adaptError) continue
            adaptationId = newAdaptation.id
          }

          const fcContentHash = hashCampaignContent([
            product.id, sourceContentId, adaptationId, platform, lang, template.body,
          ])

          const validation = validateFinalCopyForPlatform({
            body: template.body,
            platform,
            finalAffiliateLink: template.affiliate_link ?? undefined,
            language: lang,
          })

          const { error: insertError } = await supabase
            .from("final_copies")
            .insert({
              product_id: product.id,
              affiliate_program_id: null,
              affiliate_link: template.affiliate_link,
              source_content_id: sourceContentId,
              platform_adaptation_id: adaptationId,
              platform,
              language: lang,
              title: "",
              body: template.body,
              content_hash: fcContentHash,
              version: 1,
              status:
                validation.validationStatus === "valid" &&
                !COMMUNITY_POST_PLATFORMS.includes(platform)
                  ? "ready_for_operator_approval"
                  : "needs_system_fix",
              validation_status: validation.validationStatus,
              blocking_reasons: validation.blockingReasons,
            })
          if (!insertError) totalCreated += 1
        }
      }
    }

    if (totalCreated === 0) fail("no_new_posts_created_all_platforms_already_exist")
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "add_posts_all_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  redirect(`/dashboard/he/approve?approved=all_products_posts_added`)
}
