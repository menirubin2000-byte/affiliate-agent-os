import "server-only"

import { getLinkedInOfficialApiCapability } from "@/lib/linkedin-official-api"
import { assertPublishJobScheduleIsDue } from "@/lib/publish-jobs-db"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"

type LinkedInPublishJobRow = {
  id: string
  final_copy_id: string
  product_id: string
  platform: string
  status: string
  approval_id: string | null
  scheduled_at: string | null
  final_copies:
    | {
        body: string
        status: string
        validation_status: string
        image_url: string | null
        media_asset_url: string | null
        image_asset_path: string | null
      }
    | Array<{
        body: string
        status: string
        validation_status: string
        image_url: string | null
        media_asset_url: string | null
        image_asset_path: string | null
      }>
    | null
  products:
    | {
        image_url: string | null
        image_url_he: string | null
      }
    | Array<{
        image_url: string | null
        image_url_he: string | null
      }>
    | null
}

function relatedFinalCopy(row: LinkedInPublishJobRow) {
  return Array.isArray(row.final_copies) ? row.final_copies[0] : row.final_copies
}

function relatedProduct(row: LinkedInPublishJobRow) {
  return Array.isArray(row.products) ? row.products[0] ?? null : row.products ?? null
}

async function setJobState(jobId: string, status: "needs_system_fix" | "waiting_media", blockingReason: string) {
  const supabase = getServiceRoleSupabase()
  await supabase
    .from("publish_jobs")
    .update({
      status,
      blocking_reason: blockingReason,
    })
    .eq("id", jobId)
}

async function setFailedState(jobId: string, blockingReason: string) {
  await setJobState(jobId, "needs_system_fix", blockingReason)
}

async function setWaitingMedia(jobId: string, blockingReason = "image_required_for_ready") {
  await setJobState(jobId, "waiting_media", blockingReason)
}

export async function publishLinkedInJobViaOfficialApi(jobId: string) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.")
  const capability = getLinkedInOfficialApiCapability()
  if (!capability.configured) {
    throw new Error("LinkedIn official API is not configured.")
  }

  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("publish_jobs")
    .select("id, final_copy_id, product_id, platform, status, approval_id, scheduled_at, final_copies(body, status, validation_status, image_url, media_asset_url, image_asset_path), products(image_url, image_url_he)")
    .eq("id", jobId)
    .single()

  if (error || !data) throw new Error("LinkedIn publish job was not found.")
  const job = data as LinkedInPublishJobRow
  const finalCopy = relatedFinalCopy(job)

  if (job.platform !== "linkedin") throw new Error("Publish job is not a LinkedIn job.")
  if (job.status !== "pending_operator_confirmation") {
    throw new Error("LinkedIn job requires MENI final confirmation.")
  }
  assertPublishJobScheduleIsDue(job)
  if (!finalCopy || finalCopy.status !== "operator_approved" || finalCopy.validation_status !== "valid") {
    throw new Error("LinkedIn final copy is not approved and valid.")
  }
  const product = relatedProduct(job)
  const imageUrl =
    finalCopy.media_asset_url?.trim() ||
    finalCopy.image_url?.trim() ||
    finalCopy.image_asset_path?.trim() ||
    product?.image_url?.trim() ||
    product?.image_url_he?.trim() ||
    null
  if (!imageUrl) {
    await setWaitingMedia(job.id)
    throw new Error("LinkedIn publishing requires an image asset before execution.")
  }
  await setFailedState(job.id, "linkedin_image_upload_not_implemented")
  throw new Error("LinkedIn image upload is not implemented; text-only publishing is blocked.")
}
