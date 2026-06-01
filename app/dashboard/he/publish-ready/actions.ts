"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { generateDraftForProduct, getContentTypeForTemplate } from "@/lib/ai"
import {
  approvePublishApprovalItem,
  createBrowserJobForApprovalItem,
  markApprovalItemPublishedManually,
  queueApprovedCampaignForProduct,
} from "@/lib/browser-control-db"
import { createDraft, listDrafts, listProducts } from "@/lib/db"
import { buildQualityChecks } from "@/lib/quality"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import type { TemplateType } from "@/types/draft"

export async function queueBrowserPublishJobAction(formData: FormData) {
  const approvalItemId = String(formData.get("approvalItemId") ?? "")
  if (!approvalItemId) redirect("/dashboard/he/publish-ready?error=missing_item")

  try {
    await createBrowserJobForApprovalItem(approvalItemId)
  } catch (error) {
    redirect(
      `/dashboard/he/publish-ready?error=${encodeURIComponent(
        error instanceof Error ? error.message : "queue_failed",
      )}`,
    )
  }

  revalidatePath("/dashboard/he/publish-ready")
  revalidatePath("/dashboard/he/browser-control")
  redirect("/dashboard/he/browser-control?queued=1")
}

export async function approvePublishItemAction(formData: FormData) {
  const approvalItemId = String(formData.get("approvalItemId") ?? "")
  if (!approvalItemId) redirect("/dashboard/he/publish-ready?error=missing_item")

  try {
    await approvePublishApprovalItem(approvalItemId)
  } catch (error) {
    redirect(
      `/dashboard/he/publish-ready?error=${encodeURIComponent(
        error instanceof Error ? error.message : "approve_failed",
      )}`,
    )
  }

  revalidatePath("/dashboard/he/publish-ready")
  redirect("/dashboard/he/publish-ready?approved=1")
}

export async function queueCampaignAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "")
  if (!productId) redirect("/dashboard/he/publish-ready?error=missing_product")

  try {
    const result = await queueApprovedCampaignForProduct(productId)
    if (result.blocked.length) {
      redirect(`/dashboard/he/publish-ready?error=${encodeURIComponent(result.blocked.join(" "))}`)
    }
  } catch (error) {
    redirect(
      `/dashboard/he/publish-ready?error=${encodeURIComponent(
        error instanceof Error ? error.message : "campaign_queue_failed",
      )}`,
    )
  }

  revalidatePath("/dashboard/he/publish-ready")
  revalidatePath("/dashboard/he/browser-control")
  redirect("/dashboard/he/browser-control?campaignQueued=1")
}

export async function markPublishedUrlAction(formData: FormData) {
  const approvalItemId = String(formData.get("approvalItemId") ?? "")
  const postUrl = String(formData.get("postUrl") ?? "")

  try {
    await markApprovalItemPublishedManually({ approvalItemId, postUrl })
  } catch (error) {
    redirect(
      `/dashboard/he/publish-ready?error=${encodeURIComponent(
        error instanceof Error ? error.message : "publish_url_failed",
      )}`,
    )
  }

  revalidatePath("/dashboard/he/publish-ready")
  revalidatePath("/dashboard/he/browser-control")
  redirect("/dashboard/he/publish-ready?published=1")
}

const ALL_PLATFORMS: Array<{ platform: string; templateType: TemplateType }> = [
  { platform: "linkedin", templateType: "social_post" },
  { platform: "medium", templateType: "review" },
  { platform: "substack", templateType: "review" },
  { platform: "tiktok", templateType: "tiktok_script" },
  { platform: "quora", templateType: "quora_answer" },
  { platform: "reddit", templateType: "reddit_post" },
]

export async function generateMissingPlatformDraftsAction() {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard/he/publish-ready?error=Supabase+not+configured")
  }

  try {
    const [products, existingDrafts] = await Promise.all([
      listProducts(),
      listDrafts(),
    ])

    // Only products with real affiliate links
    const activeProducts = products.filter((p) => p.affiliateUrl.trim().length > 0)
    let created = 0

    for (const product of activeProducts) {
      const productDrafts = existingDrafts.filter((d) => d.productId === product.id)

      // Only generate for the 3 new platforms (tiktok, quora, reddit)
      // LinkedIn/Medium/Substack already have content for active products
      const newPlatforms = ALL_PLATFORMS.filter(
        (p) => p.templateType === "tiktok_script" || p.templateType === "quora_answer" || p.templateType === "reddit_post",
      )

      for (const { templateType } of newPlatforms) {
        const alreadyExists = productDrafts.some((d) => d.templateType === templateType)
        if (alreadyExists) continue

        const generation = await generateDraftForProduct(product, templateType)
        const qualityChecks = buildQualityChecks({
          draft: generation.draft,
          affiliateUrl: product.affiliateUrl,
          targetKeyword: generation.draft.targetKeyword ?? product.targetKeyword,
          templateType,
        })

        await createDraft({
          productId: product.id,
          contentType: getContentTypeForTemplate(templateType),
          templateType,
          draft: generation.draft,
          aiModel: generation.aiModel,
          qualityChecks,
        })

        created++
      }
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/he")
    revalidatePath("/dashboard/he/publish-ready")
    revalidatePath("/dashboard/drafts")
    redirect(`/dashboard/he/publish-ready?generated=${created}`)
  } catch (error) {
    // Re-throw redirect errors (Next.js uses exceptions for redirect)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error
    }
    redirect(
      `/dashboard/he/publish-ready?error=${encodeURIComponent(
        error instanceof Error ? error.message : "generate_failed",
      )}`,
    )
  }
}
