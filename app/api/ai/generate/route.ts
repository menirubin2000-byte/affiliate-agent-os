import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

import { generateDraftForProduct, getContentTypeForTemplate } from "@/lib/ai"
import { createDraft, getProductById } from "@/lib/db"
import { getSupabaseReadiness, isLiveAiConfigured } from "@/lib/env"
import { buildQualityChecks } from "@/lib/quality"
import type { TemplateType } from "@/types/draft"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isTemplateType(value: unknown): value is TemplateType {
  return (
    value === "review" ||
    value === "comparison" ||
    value === "buying_guide" ||
    value === "social_post" ||
    value === "tiktok_script" ||
    value === "quora_answer" ||
    value === "reddit_post"
  )
}

export async function POST(request: Request) {
  let payload: {
    productId?: unknown
    product_id?: unknown
    templateType?: unknown
    template_type?: unknown
  }

  try {
    payload = (await request.json()) as {
      productId?: unknown
      product_id?: unknown
      templateType?: unknown
      template_type?: unknown
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const productIdValue = payload.product_id ?? payload.productId
  const templateTypeValue = payload.template_type ?? payload.templateType
  const productId = typeof productIdValue === "string" ? productIdValue.trim() : ""
  const templateType = templateTypeValue

  if (!productId || !isTemplateType(templateType)) {
    return NextResponse.json(
      { error: "product_id and a valid template_type are required." },
      { status: 400 },
    )
  }

  try {
    const supabaseReadiness = getSupabaseReadiness()

    if (supabaseReadiness.status !== "configured") {
      return NextResponse.json(
        {
          error: `${supabaseReadiness.summary} ${supabaseReadiness.guidance}`,
        },
        { status: 503 },
      )
    }

    const product = await getProductById(productId)

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 })
    }

    const generation = await generateDraftForProduct(product, templateType)
    const qualityChecks = buildQualityChecks({
      draft: generation.draft,
      affiliateUrl: product.affiliateUrl,
      targetKeyword: generation.draft.targetKeyword ?? product.targetKeyword,
      templateType,
    })

    const createdDraft = await createDraft({
      productId,
      contentType: getContentTypeForTemplate(templateType),
      templateType,
      draft: generation.draft,
      aiModel: generation.aiModel,
      qualityChecks,
      changeSource: "fallback_generation",
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/products")
    revalidatePath("/dashboard/drafts")

    return NextResponse.json(
      {
        draft_id: createdDraft.id,
        aiModel: generation.aiModel,
        generation_mode: isLiveAiConfigured() ? "live_or_fallback" : "fallback",
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to generate drafts.",
      },
      { status: 500 },
    )
  }
}
