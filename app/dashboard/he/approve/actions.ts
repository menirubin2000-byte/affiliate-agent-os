"use server"

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
import { getServiceRoleSupabase } from "@/lib/supabase/server"
import type { CampaignPlatform } from "@/types/campaign-workflow"

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
      .select("product_id, language, status")
      .eq("id", finalCopyId)
      .single()
    if (!fc) fail("post_not_found")
    if (fc.status === "published_verified") fail("cannot_edit_published_post")

    const { error, count } = await supabase
      .from("final_copies")
      .update({ body })
      .eq("product_id", fc.product_id)
      .eq("language", fc.language)
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

const ALL_POST_PLATFORMS: CampaignPlatform[] = [
  "facebook_page",
  "instagram_professional",
  "linkedin",
  "medium",
  "substack",
  "pinterest",
  "x_twitter",
]

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
      const lang = fc.language ?? "en"
      if (!templateByLang.has(lang)) templateByLang.set(lang, fc)
    }

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
        const lang = fc.language ?? "en"
        if (!templateByLang.has(lang)) templateByLang.set(lang, fc)
      }

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
