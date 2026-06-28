import "server-only"

import { isValidPublishedPostUrl } from "@/lib/browser-control"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import type { CampaignPlatform } from "@/types/campaign-workflow"

const VERIFIED_MANUAL_URL_PLATFORMS = new Set<CampaignPlatform>([
  "linkedin",
  "medium",
  "substack",
  "facebook_page",
  "instagram_professional",
  "quora",
  "reddit",
])

type FinalCopyPublishRow = {
  id: string
  product_id: string
  platform: CampaignPlatform
  status: string
  validation_status: string
  source_content_id: string | null
  platform_adaptation_id: string | null
  media_asset_url?: string | null
  image_url?: string | null
  image_asset_path?: string | null
}

type PublishJobLookupRow = {
  id: string
  final_copy_id: string
  approval_id: string | null
}

type PublishedRecordRow = {
  id: string
  final_copy_id: string | null
}

export type ManualPublishReconciliationResult = {
  publishedRecordId: string
  finalCopyId: string
  liveUrl: string
}

export type ManualPublishImportResult = {
  importedCount: number
  alreadyRecordedCount: number
  skippedCount: number
  invalidCount: number
  sync: {
    publishJobsUpdated: number
    queuesUpdated: number
  }
}

export function supportsVerifiedManualPublishUrl(platform: string | null | undefined) {
  if (!platform) return false
  return VERIFIED_MANUAL_URL_PLATFORMS.has(platform as CampaignPlatform)
}

function assertManualUrlSupported(platform: CampaignPlatform) {
  if (!supportsVerifiedManualPublishUrl(platform)) {
    throw new Error(`Manual URL verification is not enabled for ${platform}.`)
  }
}

async function getApprovalId(sourceContentId: string | null, platform: CampaignPlatform) {
  if (!sourceContentId) return null

  const supabase = getServiceRoleSupabase()
  const { data } = await supabase
    .from("campaign_approvals")
    .select("id")
    .eq("source_content_id", sourceContentId)
    .eq("status", "approved")
    .contains("approved_platforms", [platform])
    .order("approved_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as { id: string } | null)?.id ?? null
}

async function updatePublishJobsForFinalCopy(input: {
  finalCopyId: string
  liveUrl: string
  verifiedAt: string
}) {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("publish_jobs")
    .update({
      status: "verified",
      live_url: input.liveUrl,
      verified_at: input.verifiedAt,
      blocking_reason: null,
    })
    .eq("final_copy_id", input.finalCopyId)
    .select("id")

  if (error?.message.includes("publish_jobs")) {
    return 0
  }
  if (error) {
    throw new Error(`Unable to sync publish jobs after manual publish: ${error.message}`)
  }

  return (data ?? []).length
}

async function updateScheduledQueueForFinalCopy(input: {
  finalCopyId: string
  publishedRecordId: string
}) {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("scheduled_publish_queue")
    .update({
      status: "published",
      published_record_id: input.publishedRecordId,
      last_error: null,
    })
    .eq("final_copy_id", input.finalCopyId)
    .select("id")

  if (error?.message.includes("scheduled_publish_queue")) {
    return 0
  }
  if (error) {
    throw new Error(`Unable to sync scheduled publish queue after manual publish: ${error.message}`)
  }

  return (data ?? []).length
}

async function upsertPublishedRecord(input: {
  finalCopy: FinalCopyPublishRow
  approvalId: string | null
  liveUrl: string
  verifiedAt: string
}) {
  const supabase = getServiceRoleSupabase()
  const mediaAssetUrl =
    input.finalCopy.media_asset_url ??
    input.finalCopy.image_url ??
    input.finalCopy.image_asset_path ??
    null
  const fullPayload = {
    product_id: input.finalCopy.product_id,
    source_content_id: input.finalCopy.source_content_id,
    platform_adaptation_id: input.finalCopy.platform_adaptation_id,
    platform: input.finalCopy.platform,
    live_url: input.liveUrl,
    verification_status: "verified",
    verified_at: input.verifiedAt,
    final_copy_id: input.finalCopy.id,
    campaign_approval_id: input.approvalId,
    media_asset_url: mediaAssetUrl,
    media_status: mediaAssetUrl ? "ready" : "not_required",
    needs_media_repair: false,
  }

  const minimalPayload = {
    product_id: input.finalCopy.product_id,
    source_content_id: input.finalCopy.source_content_id,
    platform_adaptation_id: input.finalCopy.platform_adaptation_id,
    platform: input.finalCopy.platform,
    live_url: input.liveUrl,
    verification_status: "verified",
    verified_at: input.verifiedAt,
    final_copy_id: input.finalCopy.id,
    campaign_approval_id: input.approvalId,
  }

  const fullResult = await supabase
    .from("published_records")
    .upsert(fullPayload, { onConflict: "platform,live_url" })
    .select("id, final_copy_id")
    .single()

  if (!fullResult.error) {
    return fullResult.data as PublishedRecordRow
  }

  if (
    !fullResult.error.message.includes("media_asset_url") &&
    !fullResult.error.message.includes("media_status") &&
    !fullResult.error.message.includes("needs_media_repair")
  ) {
    throw new Error(`Unable to store verified published record: ${fullResult.error.message}`)
  }

  const fallbackResult = await supabase
    .from("published_records")
    .upsert(minimalPayload, { onConflict: "platform,live_url" })
    .select("id, final_copy_id")
    .single()

  if (fallbackResult.error || !fallbackResult.data) {
    throw new Error(
      `Unable to store verified published record: ${fallbackResult.error?.message ?? "unknown_error"}`,
    )
  }

  return fallbackResult.data as PublishedRecordRow
}

async function reconcileVerifiedUrlForFinalCopy(input: {
  finalCopy: FinalCopyPublishRow
  liveUrl: string
  approvalId?: string | null
}): Promise<ManualPublishReconciliationResult> {
  assertManualUrlSupported(input.finalCopy.platform)

  if (!isValidPublishedPostUrl(input.liveUrl, input.finalCopy.platform)) {
    throw new Error("A verified live URL on the expected platform is required.")
  }

  if (input.finalCopy.validation_status !== "valid") {
    throw new Error("Only a valid final copy can be marked as manually published.")
  }

  if (!input.finalCopy.source_content_id || !input.finalCopy.platform_adaptation_id) {
    throw new Error("Published record requires source content and platform adaptation traceability.")
  }

  const supabase = getServiceRoleSupabase()
  const { data: duplicate, error: duplicateError } = await supabase
    .from("published_records")
    .select("id, final_copy_id")
    .eq("platform", input.finalCopy.platform)
    .eq("live_url", input.liveUrl)
    .maybeSingle()

  if (duplicateError && !duplicateError.message.includes("published_records")) {
    throw new Error(`Unable to validate existing published record: ${duplicateError.message}`)
  }

  if (
    duplicate &&
    (duplicate as PublishedRecordRow).final_copy_id &&
    (duplicate as PublishedRecordRow).final_copy_id !== input.finalCopy.id
  ) {
    throw new Error("This live URL is already recorded for a different final copy.")
  }

  const verifiedAt = new Date().toISOString()
  const approvalId =
    input.approvalId === undefined
      ? await getApprovalId(input.finalCopy.source_content_id, input.finalCopy.platform)
      : input.approvalId
  const publishedRecord = await upsertPublishedRecord({
    finalCopy: input.finalCopy,
    approvalId,
    liveUrl: input.liveUrl,
    verifiedAt,
  })

  const { error: finalCopyError } = await supabase
    .from("final_copies")
    .update({ status: "published_verified" })
    .eq("id", input.finalCopy.id)

  if (finalCopyError) {
    throw new Error(`Unable to mark final copy as published: ${finalCopyError.message}`)
  }

  await updatePublishJobsForFinalCopy({
    finalCopyId: input.finalCopy.id,
    liveUrl: input.liveUrl,
    verifiedAt,
  })
  await updateScheduledQueueForFinalCopy({
    finalCopyId: input.finalCopy.id,
    publishedRecordId: publishedRecord.id,
  })

  return {
    publishedRecordId: publishedRecord.id,
    finalCopyId: input.finalCopy.id,
    liveUrl: input.liveUrl,
  }
}

export async function recordVerifiedManualPublishForFinalCopy(input: {
  finalCopyId: string
  liveUrl: string
}) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.")
  }

  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("final_copies")
    .select("id, product_id, platform, status, validation_status, source_content_id, platform_adaptation_id, media_asset_url, image_url, image_asset_path")
    .eq("id", input.finalCopyId)
    .single()

  if (error || !data) {
    throw new Error(`Unable to load final copy for manual publish reconciliation: ${error?.message ?? "not_found"}`)
  }

  return reconcileVerifiedUrlForFinalCopy({
    finalCopy: data as FinalCopyPublishRow,
    liveUrl: input.liveUrl.trim(),
  })
}

export async function recordVerifiedManualPublishForJob(input: {
  jobId: string
  liveUrl: string
}) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.")
  }

  const supabase = getServiceRoleSupabase()
  const { data: job, error: jobError } = await supabase
    .from("publish_jobs")
    .select("id, final_copy_id, approval_id")
    .eq("id", input.jobId)
    .single()

  if (jobError || !job) {
    throw new Error(`Unable to load publish job for manual publish reconciliation: ${jobError?.message ?? "not_found"}`)
  }

  const { data: finalCopy, error: finalCopyError } = await supabase
    .from("final_copies")
    .select("id, product_id, platform, status, validation_status, source_content_id, platform_adaptation_id, media_asset_url, image_url, image_asset_path")
    .eq("id", (job as PublishJobLookupRow).final_copy_id)
    .single()

  if (finalCopyError || !finalCopy) {
    throw new Error(
      `Unable to load final copy for manual publish reconciliation: ${finalCopyError?.message ?? "not_found"}`,
    )
  }

  return reconcileVerifiedUrlForFinalCopy({
    finalCopy: finalCopy as FinalCopyPublishRow,
    approvalId: (job as PublishJobLookupRow).approval_id,
    liveUrl: input.liveUrl.trim(),
  })
}

export async function importPublishLogsAndReconcileGaps(): Promise<ManualPublishImportResult> {
  if (!isSupabaseConfigured()) {
    return {
      importedCount: 0,
      alreadyRecordedCount: 0,
      skippedCount: 0,
      invalidCount: 0,
      sync: {
        publishJobsUpdated: 0,
        queuesUpdated: 0,
      },
    }
  }

  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("published_records")
    .select("id, final_copy_id, live_url, verified_at")
    .eq("verification_status", "verified")
    .not("final_copy_id", "is", null)

  if (error?.message.includes("published_records")) {
    return {
      importedCount: 0,
      alreadyRecordedCount: 0,
      skippedCount: 0,
      invalidCount: 0,
      sync: {
        publishJobsUpdated: 0,
        queuesUpdated: 0,
      },
    }
  }
  if (error) {
    throw new Error(`Unable to load published records for reconciliation: ${error.message}`)
  }

  let publishJobsUpdated = 0
  let queuesUpdated = 0

  for (const record of (data ?? []) as Array<{
    id: string
    final_copy_id: string
    live_url: string
    verified_at: string | null
  }>) {
    const verifiedAt = record.verified_at ?? new Date().toISOString()

    const { error: finalCopyError } = await supabase
      .from("final_copies")
      .update({ status: "published_verified" })
      .eq("id", record.final_copy_id)

    if (finalCopyError && !finalCopyError.message.includes("final_copies")) {
      throw new Error(`Unable to sync final copy publish state: ${finalCopyError.message}`)
    }

    publishJobsUpdated += await updatePublishJobsForFinalCopy({
      finalCopyId: record.final_copy_id,
      liveUrl: record.live_url,
      verifiedAt,
    })
    queuesUpdated += await updateScheduledQueueForFinalCopy({
      finalCopyId: record.final_copy_id,
      publishedRecordId: record.id,
    })
  }

  return {
    importedCount: 0,
    alreadyRecordedCount: (data ?? []).length,
    skippedCount: 0,
    invalidCount: 0,
    sync: {
      publishJobsUpdated,
      queuesUpdated,
    },
  }
}
