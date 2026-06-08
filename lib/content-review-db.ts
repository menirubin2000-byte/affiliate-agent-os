import "server-only"

import {
  SYSTEME_IO_MEDIUM_FINAL_LINK,
  buildFinalContentHash,
  cleanupMediumArticle,
  validateFinalMediumArticle,
} from "@/lib/content-review"
import { createImprovementTask } from "@/lib/db"
import { evaluatePlatformMediaReadiness } from "@/lib/platform-media-rules"
import { createOrUpdatePublishJobForFinalCopy } from "@/lib/publish-jobs-db"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import type { CampaignPlatform } from "@/types/campaign-workflow"
import type { FinalCopy, FinalCopyStatus, FinalCopyValidationStatus } from "@/types/content-review"

type FinalCopyRow = {
  id: string
  product_id: string
  affiliate_program_id: string | null
  affiliate_link: string | null
  public_review_url: string | null
  source_content_id: string
  platform_adaptation_id: string
  platform: CampaignPlatform
  title: string
  body: string
  content_hash: string
  version: number
  status: FinalCopyStatus
  validation_status: FinalCopyValidationStatus
  blocking_reasons: string[]
  approved_by: string | null
  approved_at: string | null
  repair_task_id: string | null
  created_at: string
  updated_at: string
}

type PlatformAdaptationRow = {
  id: string
  source_content_id: string
  product_id: string
  platform: CampaignPlatform
  title: string
  body: string
  campaign_link_url: string | null
  content_hash: string
  campaign_approval_status: string
}

type ProductMediaRow = {
  image_url: string | null
  image_url_he: string | null
  image_status: string | null
  video_url: string | null
  video_status: string | null
  video_suitable_for: string[] | null
}

function mapFinalCopy(row: FinalCopyRow, productName?: string | null): FinalCopy {
  return {
    id: row.id,
    productId: row.product_id,
    productName: productName ?? null,
    affiliateProgramId: row.affiliate_program_id,
    affiliateLink: row.affiliate_link,
    publicReviewUrl: row.public_review_url,
    sourceContentId: row.source_content_id,
    platformAdaptationId: row.platform_adaptation_id,
    platform: row.platform,
    title: row.title,
    body: row.body,
    contentHash: row.content_hash,
    version: row.version,
    status: row.status,
    validationStatus: row.validation_status,
    blockingReasons: row.blocking_reasons ?? [],
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    repairTaskId: row.repair_task_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getOrCreateSystemeIoMediumFinalCopy(): Promise<FinalCopy | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getServiceRoleSupabase()

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, affiliate_link, affiliate_url")
    .eq("name", "Systeme.io")
    .single()

  if (productError || !product) throw new Error("Systeme.io product was not found.")

  const { data: program, error: programError } = await supabase
    .from("affiliate_programs")
    .select("id, affiliate_link")
    .eq("product_id", product.id)
    .eq("status", "link_ready")
    .not("affiliate_link", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (programError) throw new Error(`Unable to load Systeme.io affiliate program: ${programError.message}`)

  const { data: adaptation, error: adaptationError } = await supabase
    .from("platform_adaptations")
    .select("id, source_content_id, product_id, platform, title, body, campaign_link_url, content_hash, campaign_approval_status")
    .eq("product_id", product.id)
    .eq("platform", "medium")
    .eq("campaign_approval_status", "campaign_approved")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (adaptationError) throw new Error(`Unable to load Systeme.io Medium adaptation: ${adaptationError.message}`)
  if (!adaptation) return null

  const adaptationRow = adaptation as PlatformAdaptationRow
  const { data: existing, error: existingError } = await supabase
    .from("final_copies")
    .select("*")
    .eq("platform_adaptation_id", adaptationRow.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) throw new Error(`Final Copy migration is required: ${existingError.message}`)
  if (existing) return mapFinalCopy(existing as FinalCopyRow, product.name)

  const finalAffiliateLink = SYSTEME_IO_MEDIUM_FINAL_LINK
  const cleaned = cleanupMediumArticle({
    title: adaptationRow.title,
    body: adaptationRow.body,
    finalAffiliateLink,
  })
  const validation = validateFinalMediumArticle({ body: cleaned.body, finalAffiliateLink })
  const contentHash = buildFinalContentHash({
    title: cleaned.title,
    body: cleaned.body,
    productId: adaptationRow.product_id,
    sourceContentId: adaptationRow.source_content_id,
    adaptationId: adaptationRow.id,
    platform: adaptationRow.platform,
  })
  const status: FinalCopyStatus = validation.validationStatus === "valid"
    ? "ready_for_operator_approval"
    : "needs_system_fix"

  const { data: created, error: createError } = await supabase
    .from("final_copies")
    .insert({
      product_id: adaptationRow.product_id,
      affiliate_program_id: program?.id ?? null,
      affiliate_link: finalAffiliateLink ?? null,
      source_content_id: adaptationRow.source_content_id,
      platform_adaptation_id: adaptationRow.id,
      platform: adaptationRow.platform,
      title: cleaned.title,
      body: cleaned.body,
      content_hash: contentHash,
      version: 1,
      status,
      validation_status: validation.validationStatus,
      blocking_reasons: validation.blockingReasons,
    })
    .select("*")
    .single()

  if (createError) throw new Error(`Unable to create final copy: ${createError.message}`)
  return mapFinalCopy(created as FinalCopyRow, product.name)
}

export async function getFinalCopyValidation(finalCopy: FinalCopy) {
  const validation = validateFinalMediumArticle({
    body: finalCopy.body,
    finalAffiliateLink: finalCopy.affiliateLink ?? undefined,
  })
  const productMedia = await getProductMedia(finalCopy.productId)
  const media = evaluatePlatformMediaReadiness(finalCopy.platform, productMedia)
  const blockingReasons = Array.from(new Set([...validation.blockingReasons, ...media.blockingReasons]))
  return {
    validationStatus: blockingReasons.length ? "blocked" as const : validation.validationStatus,
    blockingReasons,
    checks: {
      ...validation.checks,
      mediaReady: media.mediaReady,
      imageReady: !media.imageRequired || media.mediaReady,
      videoReady: !media.videoRequired || media.mediaReady,
      automaticReadyAllowed: media.automaticReadyAllowed,
    },
  }
}

export async function approveFinalCopy(finalCopyId: string): Promise<FinalCopy> {
  const supabase = getServiceRoleSupabase()
  const { data: finalCopy, error: finalCopyError } = await supabase
    .from("final_copies")
    .select("*")
    .eq("id", finalCopyId)
    .single()

  if (finalCopyError || !finalCopy) throw new Error("Final copy was not found.")

  const validation = validateFinalMediumArticle({
    body: finalCopy.body,
    finalAffiliateLink: finalCopy.affiliate_link ?? undefined,
  })
  if (validation.validationStatus !== "valid") {
    throw new Error(`Cannot approve invalid final copy: ${validation.blockingReasons.join(", ")}`)
  }

  const productMedia = await getProductMedia(finalCopy.product_id)
  const media = evaluatePlatformMediaReadiness(finalCopy.platform, productMedia)
  if (!media.mediaReady) {
    throw new Error(`Cannot approve invalid final copy: ${media.blockingReasons.join(", ")}`)
  }

  const { data: updated, error: updateError } = await supabase
    .from("final_copies")
    .update({
      status: "operator_approved",
      validation_status: "valid",
      blocking_reasons: [],
      approved_by: "MENI",
      approved_at: new Date().toISOString(),
    })
    .eq("id", finalCopyId)
    .select("*")
    .single()

  if (updateError) throw new Error(`Unable to approve final copy: ${updateError.message}`)
  await createOrUpdatePublishJobForFinalCopy(finalCopyId)
  return mapFinalCopy(updated as FinalCopyRow)
}

async function getProductMedia(productId: string): Promise<ProductMediaRow | null> {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("products")
    .select("image_url, image_url_he, image_status, video_url, video_status, video_suitable_for")
    .eq("id", productId)
    .maybeSingle()

  if (error || !data) return null
  return data as ProductMediaRow
}

export async function rejectFinalCopy(finalCopyId: string): Promise<FinalCopy> {
  const supabase = getServiceRoleSupabase()
  const { data: updated, error } = await supabase
    .from("final_copies")
    .update({
      status: "operator_rejected",
      approved_by: "MENI",
      approved_at: new Date().toISOString(),
    })
    .eq("id", finalCopyId)
    .select("*")
    .single()

  if (error) throw new Error(`Unable to reject final copy: ${error.message}`)
  return mapFinalCopy(updated as FinalCopyRow)
}

export async function requestFinalCopySystemFix(finalCopyId: string): Promise<FinalCopy> {
  const supabase = getServiceRoleSupabase()
  const { data: finalCopy, error: finalCopyError } = await supabase
    .from("final_copies")
    .select("*")
    .eq("id", finalCopyId)
    .single()

  if (finalCopyError || !finalCopy) throw new Error("Final copy was not found.")

  const row = finalCopy as FinalCopyRow
  const task = await createImprovementTask({
    productId: row.product_id,
    sourceType: "quality_check",
    priority: "medium",
    title: "System fix required for final Medium copy",
    description: `MENI requested a system fix for ${row.platform} final copy v${row.version}.`,
    suggestedAction: "Create a new final_copies version after deterministic cleanup/validation changes. MENI should not edit English manually.",
  })

  const { data: updated, error: updateError } = await supabase
    .from("final_copies")
    .update({
      status: "needs_system_fix",
      validation_status: "fix_requested",
      approved_by: null,
      approved_at: null,
      repair_task_id: task.id,
    })
    .eq("id", finalCopyId)
    .select("*")
    .single()

  if (updateError) throw new Error(`Unable to request final copy fix: ${updateError.message}`)
  return mapFinalCopy(updated as FinalCopyRow)
}
