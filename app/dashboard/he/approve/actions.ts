"use server"

import OpenAI from "openai"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { hashCampaignContent } from "@/lib/campaign-workflow"
import {
  approveFinalCopy,
  rejectFinalCopy,
  requestFinalCopySystemFix,
} from "@/lib/content-review-db"
import { validateFinalCopyForPlatform } from "@/lib/content-review"
import { assertIntegrationConfigured } from "@/lib/env"
import { requiresImageForPost, requiresVideoForPost } from "@/lib/post-media-policy"
import { getServiceRoleSupabase } from "@/lib/supabase/server"
import type { CampaignPlatform } from "@/types/campaign-workflow"

function fail(reason: string): never {
  redirect(`/dashboard/he/approve?error=${encodeURIComponent(reason)}`)
}

const NORMAL_POST_PLATFORMS: CampaignPlatform[] = [
  "facebook_page",
  "instagram_professional",
  "linkedin",
  "medium",
  "substack",
  "pinterest",
  "x_twitter",
]

const COMMUNITY_POST_PLATFORMS: CampaignPlatform[] = ["quora", "reddit"]
const VIDEO_POST_PLATFORMS: CampaignPlatform[] = ["youtube", "tiktok"]
const NORMAL_POST_PLATFORM_SET = new Set<string>(NORMAL_POST_PLATFORMS)

// Two bulk-edit groups only: community (Quora/Reddit — special no-direct-link
// rules) and general (everything else, including video). Editing one group
// never touches the other.
const GENERAL_POST_PLATFORMS: CampaignPlatform[] = [
  ...NORMAL_POST_PLATFORMS,
  ...VIDEO_POST_PLATFORMS,
]

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

export async function createTranslatedFinalCopyAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  if (!finalCopyId) fail("missing_final_copy_id")

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const { data: fc, error: fcError } = await supabase
      .from("final_copies")
      .select(`
        id, product_id, affiliate_program_id, affiliate_link, source_content_id,
        platform_adaptation_id, platform, title, body, language, status,
        image_url, media_asset_url,
        products (image_url, image_url_he, video_url)
      `)
      .eq("id", finalCopyId)
      .single()
    if (fcError) fail(fcError.message)
    if (!fc) fail("post_not_found")
    if (fc.status === "published_verified") fail("cannot_translate_published_post")

    const targetLanguage = oppositeLanguage(fc.language)
    const { data: existing, error: existingError } = await supabase
      .from("final_copies")
      .select("id")
      .eq("product_id", fc.product_id)
      .eq("platform", fc.platform)
      .eq("language", targetLanguage)
      .neq("status", "published_verified")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existingError) fail(existingError.message)
    if (existing?.id) {
      revalidatePath("/dashboard/he/approve")
      redirect(`/dashboard/he/approve/preview/${existing.id}`)
    }

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
    if (adaptationError) fail(adaptationError.message)

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
        version: 1,
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
    if (insertError) fail(insertError.message)

    revalidatePath("/dashboard/he/approve")
    revalidatePath("/dashboard/he/all-posts")
    redirect(`/dashboard/he/approve/preview/${created.id}?approved=translated_created`)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "translation_failed")
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
      for (const platform of NORMAL_POST_PLATFORMS) {
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
            status: validation.validationStatus === "valid"
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
        for (const platform of NORMAL_POST_PLATFORMS) {
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
              status: validation.validationStatus === "valid"
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
