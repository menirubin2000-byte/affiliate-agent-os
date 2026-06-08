import "server-only"

import { isValidPublishedPostUrl } from "@/lib/browser-control"
import {
  getLinkedInOfficialApiCapability,
  LINKEDIN_POSTS_ENDPOINT,
  linkedInPostUrnToLiveUrl,
} from "@/lib/linkedin-official-api"
import { assertPublishJobScheduleIsDue, updatePublishJobFromExecutor } from "@/lib/publish-jobs-db"
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
      }
    | Array<{
        body: string
        status: string
        validation_status: string
      }>
    | null
}

function relatedFinalCopy(row: LinkedInPublishJobRow) {
  return Array.isArray(row.final_copies) ? row.final_copies[0] : row.final_copies
}

function requiredEnv(name: string) {
  const result = process.env[name]?.trim()
  if (!result) throw new Error(`LinkedIn official API is missing ${name}.`)
  return result
}

async function setFailedState(jobId: string, blockingReason: string) {
  const supabase = getServiceRoleSupabase()
  await supabase
    .from("publish_jobs")
    .update({
      status: "needs_system_fix",
      blocking_reason: blockingReason,
    })
    .eq("id", jobId)
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
    .select("id, final_copy_id, product_id, platform, status, approval_id, scheduled_at, final_copies(body, status, validation_status)")
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

  const confirmedAt = new Date().toISOString()
  const { error: runningError } = await supabase
    .from("publish_jobs")
    .update({
      status: "running",
      executor_type: "linkedin_official_api",
      blocking_reason: "operator_final_confirmation_granted",
      final_confirmed_at: confirmedAt,
      live_url: null,
      verified_at: null,
    })
    .eq("id", job.id)
    .eq("status", "pending_operator_confirmation")

  if (runningError) throw new Error(`Unable to start LinkedIn publish job: ${runningError.message}`)

  try {
    const response = await fetch(LINKEDIN_POSTS_ENDPOINT, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${requiredEnv("LINKEDIN_ACCESS_TOKEN")}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": requiredEnv("LINKEDIN_API_VERSION"),
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: requiredEnv("LINKEDIN_MEMBER_URN"),
        commentary: finalCopy.body,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    })

    if (!response.ok) {
      const reason =
        response.status === 401 || response.status === 403
          ? "linkedin_official_api_authorization_failed"
          : `linkedin_official_api_http_${response.status}`
      await setFailedState(job.id, reason)
      throw new Error(`LinkedIn official API rejected the publish request (${response.status}).`)
    }

    const postUrn = response.headers.get("x-restli-id")
    const liveUrl = postUrn ? linkedInPostUrnToLiveUrl(postUrn) : null
    if (!liveUrl || !isValidPublishedPostUrl(liveUrl, "linkedin")) {
      await setFailedState(job.id, "linkedin_official_api_post_id_missing")
      throw new Error("LinkedIn API did not return a verifiable post ID.")
    }

    await supabase
      .from("publish_jobs")
      .update({
        status: "waiting_url_verification",
        live_url: liveUrl,
        blocking_reason: null,
      })
      .eq("id", job.id)

    return updatePublishJobFromExecutor({
      jobId: job.id,
      status: "verified",
      postUrl: liveUrl,
      message: `Verified from LinkedIn official API response ${postUrn}.`,
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LinkedIn official API rejected")) throw error
    await setFailedState(job.id, "linkedin_official_api_publish_failed")
    throw error
  }
}
