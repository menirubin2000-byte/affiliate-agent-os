import "server-only"

import { detectBrowserPlatform, getPlatformPublishTarget, isValidPublishedPostUrl } from "@/lib/browser-control"
// LinkedIn publishing in AAOS goes through Claude in Chrome MCP, not the
// official LinkedIn API, so we no longer reference the official-API
// blocking reason here.
import {
  FACEBOOK_CURRENT_BLOCKING_REASON,
  getFacebookPageOfficialApiCapability,
  getInstagramOfficialApiCapability,
  INSTAGRAM_CURRENT_BLOCKING_REASON,
} from "@/lib/meta-official-api"
import { evaluatePlatformMediaReadiness } from "@/lib/platform-media-rules"
import { validateLanguageMediaConsistency } from "@/lib/post-media-policy"
import {
  planNextPublishSlot,
  type PublishedItem,
  type ScheduledPublishItem,
} from "@/lib/publishing-schedule-policy"
import { materializeDueScheduledPublishItems } from "@/lib/scheduled-publish-queue-db"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import type { CampaignPlatform } from "@/types/campaign-workflow"
import type { BrowserPlatform } from "@/types/browser-control"
import type { PublishJob, PublishJobStatus } from "@/types/publish-job"

type PublishJobRow = {
  id: string
  final_copy_id: string
  product_id: string
  platform: CampaignPlatform
  status: PublishJobStatus
  executor_type: string
  blocking_reason: string | null
  approval_id: string | null
  executor_url: string | null
  final_confirmed_at: string | null
  scheduled_at: string | null
  schedule_policy_version: string | null
  schedule_notes: string[] | null
  live_url: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
  products?: { name: string } | { name: string }[] | null
  final_copies?: { title: string } | { title: string }[] | null
}

type ExecutorSessionRow = {
  id: string
  status: string
  active_tab_url: string | null
  active_platform: BrowserPlatform | null
  blocker_status: string | null
  last_seen_at: string | null
}

type FinalCopyExecutionRow = {
  id: string
  product_id: string
  platform: CampaignPlatform
  status: string
  validation_status: string
  title: string
  body?: string
  language?: string | null
  image_url?: string | null
  media_asset_url?: string | null
  image_asset_path?: string | null
  source_content_id: string
  platform_adaptation_id?: string
  affiliate_link?: string | null
}

type ProductMediaRow = {
  image_url: string | null
  image_url_he: string | null
  image_status: string | null
  video_url: string | null
  video_status: string | null
  video_suitable_for: string[] | null
}

type PublishExecutorFinalCopyRelation = {
  title: string
  body: string
  source_content_id: string
  platform_adaptation_id: string
  affiliate_link: string | null
  language?: string | null
  image_url?: string | null
  media_asset_url?: string | null
  image_asset_path?: string | null
}

type PublishExecutorProductRelation = {
  name: string
  image_url: string | null
  image_url_he: string | null
  image_status: string | null
  video_url: string | null
  video_status: string | null
  video_suitable_for: string[] | null
}

type PublishExecutorJobRow = Omit<PublishJobRow, "final_copies" | "products"> & {
  final_copies?: PublishExecutorFinalCopyRelation | PublishExecutorFinalCopyRelation[] | null
  products?: PublishExecutorProductRelation | PublishExecutorProductRelation[] | null
}

export type PublishExecutorJob = PublishJob & {
  executorCommand: "fill" | "publish_confirmed"
  targetUrl: string | null
  title: string
  content: string
  affiliateLink: string | null
  mediaAssetUrl: string | null
  imageAssetPath: string | null
  videoAssetPath: string | null
  mediaRequired: boolean
  mediaReady: boolean
  publishMediaMode: "image" | "video" | "bridge_url_only"
  imageRequired: boolean
  videoRequired: boolean
  blockingReasons: string[]
  nextAction: string
}

export type PublishExecutorStatus =
  | PublishJobStatus
  | "opened"
  | "filled"
  | "waiting_user"
  | "published"
  | "blocked"
  | "blocked_policy"
  | "requires_auth"
  | "pending_operator_confirmation"
  | "failed"

export function assertPublishJobScheduleIsDue(job: { scheduledAt?: string | null; scheduled_at?: string | null }) {
  const scheduledAt = job.scheduledAt ?? job.scheduled_at ?? null
  if (scheduledAt && Date.parse(scheduledAt) > Date.now()) {
    throw new Error(`Publish job is scheduled for ${scheduledAt}; publishing before schedule is blocked.`)
  }
}

const PUBLISH_JOB_SELECT =
  "id, final_copy_id, product_id, platform, status, executor_type, blocking_reason, approval_id, executor_url, final_confirmed_at, scheduled_at, schedule_policy_version, schedule_notes, live_url, verified_at, created_at, updated_at, products(name), final_copies(title)"

const PUBLISH_EXECUTOR_JOB_SELECT =
  "id, final_copy_id, product_id, platform, status, executor_type, blocking_reason, approval_id, executor_url, final_confirmed_at, scheduled_at, schedule_policy_version, schedule_notes, live_url, verified_at, created_at, updated_at, products(name, image_url, image_url_he, image_status, video_url, video_status, video_suitable_for), final_copies(title, body, source_content_id, platform_adaptation_id, affiliate_link, language, image_url, media_asset_url, image_asset_path)"

function relatedName<T extends { name?: string }>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0]?.name ?? null
  return value?.name ?? null
}

function relatedTitle(value: { title?: string } | Array<{ title?: string }> | null | undefined) {
  if (Array.isArray(value)) return value[0]?.title ?? null
  return value?.title ?? null
}

function relatedFinalCopy(
  value: PublishExecutorJobRow["final_copies"],
) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function relatedProductMedia(
  value: PublishExecutorJobRow["products"],
) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function executorTypeForPlatform(platform: CampaignPlatform) {
  if (platform === "linkedin") return "linkedin_official_api"
  if (platform === "facebook_page") return "meta_pages_api"
  if (platform === "instagram_professional") return "instagram_graph_api"
  return "browser_helper"
}

function mapPublishJob(row: PublishJobRow): PublishJob {
  return {
    id: row.id,
    finalCopyId: row.final_copy_id,
    productId: row.product_id,
    productName: relatedName(row.products),
    platform: row.platform,
    status: row.status,
    executorType: row.executor_type,
    blockingReason: row.blocking_reason,
    approvalId: row.approval_id,
    executorUrl: row.executor_url,
    finalConfirmedAt: row.final_confirmed_at,
    scheduledAt: row.scheduled_at,
    schedulePolicyVersion: row.schedule_policy_version,
    scheduleNotes: row.schedule_notes ?? [],
    liveUrl: row.live_url,
    verifiedAt: row.verified_at,
    finalCopyTitle: relatedTitle(row.final_copies),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapPublishExecutorJob(row: PublishExecutorJobRow): PublishExecutorJob {
  const job = mapPublishJob(row)
  const finalCopy = relatedFinalCopy(row.final_copies as PublishExecutorJobRow["final_copies"])
  const productMedia = relatedProductMedia(row.products)
  const media = evaluatePlatformMediaReadiness(row.platform, {
    ...productMedia,
    image_url: finalCopy?.image_url ?? productMedia?.image_url ?? null,
    media_asset_url: finalCopy?.media_asset_url ?? null,
    image_asset_path: finalCopy?.image_asset_path ?? null,
    video_asset_path: null,
  })
  const mediaAssetUrl =
    media.publishMediaMode === "video"
      ? productMedia?.video_url ?? null
      : finalCopy?.media_asset_url ??
        finalCopy?.image_url ??
        finalCopy?.image_asset_path ??
        productMedia?.image_url_he ??
        productMedia?.image_url ??
        null
  const publishConfirmed = row.status === "running" && row.blocking_reason === "operator_final_confirmation_granted"

  return {
    ...job,
    executorCommand: publishConfirmed ? "publish_confirmed" : "fill",
    targetUrl: publishConfirmed ? row.executor_url : getPlatformPublishTarget(row.platform),
    title: finalCopy?.title ?? job.finalCopyTitle ?? "Approved post",
    content: finalCopy?.body ?? "",
    affiliateLink: finalCopy?.affiliate_link ?? null,
    mediaAssetUrl,
    imageAssetPath: media.publishMediaMode === "image" ? mediaAssetUrl : null,
    videoAssetPath: media.publishMediaMode === "video" ? mediaAssetUrl : null,
    mediaRequired: media.mediaRequired,
    mediaReady: media.mediaReady,
    publishMediaMode: media.publishMediaMode,
    imageRequired: media.imageRequired,
    videoRequired: media.videoRequired,
    blockingReasons: media.blockingReasons,
    nextAction: media.nextAction,
  }
}

async function getActiveExecutorSession(): Promise<ExecutorSessionRow | null> {
  const supabase = getServiceRoleSupabase()
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from("browser_sessions")
    .select("id, status, active_tab_url, active_platform, blocker_status, last_seen_at")
    .gte("last_seen_at", tenMinutesAgo)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as ExecutorSessionRow
}

function getExecutorStateForPlatform(
  platform: CampaignPlatform,
  session: ExecutorSessionRow | null,
): { status: PublishJobStatus; blockingReason: string | null } {
  if (platform === "linkedin") {
    // Official API is blocked by LinkedIn until 100+ connections, but we
    // publish LinkedIn via Claude in Chrome MCP successfully (proven by
    // multiple verified published_records). So when the official API isn't
    // available, the operational truth is "approved, ready for MCP
    // publish" — not blocked.
    return {
      status: "pending_operator_confirmation",
      blockingReason: null,
    }
  }

  if (platform === "facebook_page") {
    if (getFacebookPageOfficialApiCapability().configured) {
      return {
        status: "pending_operator_confirmation",
        blockingReason: null,
      }
    }
    return {
      status: "blocked_executor_not_connected",
      blockingReason: FACEBOOK_CURRENT_BLOCKING_REASON,
    }
  }

  if (platform === "instagram_professional") {
    if (getInstagramOfficialApiCapability().configured) {
      return {
        status: "pending_operator_confirmation",
        blockingReason: null,
      }
    }
    return {
      status: "blocked_executor_not_connected",
      blockingReason: INSTAGRAM_CURRENT_BLOCKING_REASON,
    }
  }

  if (platform !== "medium" && platform !== "substack") {
    return {
      status: "blocked_policy",
      blockingReason: `${platform}_not_enabled_for_executor`,
    }
  }

  // For Medium / Substack: AAOS publishes via Claude in Chrome MCP, not via
  // a background browser_helper executor. If no executor session is
  // registered, the operational truth is "approved, waiting for the MCP
  // publish step", NOT "blocked". Surface that to the dashboard so the
  // operator sees an actionable item, not a sea of red.
  if (!session) {
    return {
      status: "pending_operator_confirmation",
      blockingReason: null,
    }
  }

  if (session.status === "blocked" || session.blocker_status) {
    return {
      status: "requires_auth",
      blockingReason: session.blocker_status ?? "platform_auth_required",
    }
  }

  if (session.status !== "connected") {
    return {
      status: "blocked_executor_not_connected",
      blockingReason: "executor_not_connected",
    }
  }

  const activePlatform = session.active_platform ?? detectBrowserPlatform(session.active_tab_url)
  if (activePlatform !== "unknown" && activePlatform !== platform) {
    return {
      status: "approved_waiting_executor",
      blockingReason: null,
    }
  }

  return {
    status: "approved_waiting_executor",
    blockingReason: null,
  }
}

export async function refreshPublishJobsForExecutorConnection() {
  if (!isSupabaseConfigured()) return
  const supabase = getServiceRoleSupabase()
  const session = await getActiveExecutorSession()
  const { data: jobs, error } = await supabase
    .from("publish_jobs")
    .select(PUBLISH_EXECUTOR_JOB_SELECT)
    .in("status", ["blocked_executor_not_connected", "approved_waiting_executor", "requires_auth", "waiting_media", "pending_operator_confirmation"])

  if (error || !jobs?.length) return

  for (const row of jobs as PublishExecutorJobRow[]) {
    const job = mapPublishExecutorJob(row)
    if (!job.mediaReady) {
      await supabase
        .from("publish_jobs")
        .update({
          status: "waiting_media",
          executor_type: executorTypeForPlatform(job.platform),
          blocking_reason: job.blockingReasons.join(", ") || "media_not_ready",
        })
        .eq("id", job.id)
      continue
    }
    const next = getExecutorStateForPlatform(job.platform, session)
    await supabase
      .from("publish_jobs")
      .update({
        status: next.status,
        executor_type: executorTypeForPlatform(job.platform),
        blocking_reason: next.blockingReason,
      })
      .eq("id", job.id)
  }
}

async function getCampaignApprovalId(sourceContentId: string, platform: CampaignPlatform) {
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

async function markPublishJobWaitingMedia(jobId: string, blockingReason: string) {
  const supabase = getServiceRoleSupabase()
  await supabase
    .from("publish_jobs")
    .update({
      status: "waiting_media",
      blocking_reason: blockingReason,
      live_url: null,
      verified_at: null,
    })
    .eq("id", jobId)
}

export async function createOrUpdatePublishJobForFinalCopy(finalCopyId: string): Promise<PublishJob | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getServiceRoleSupabase()

  const { data: finalCopy, error: finalCopyError } = await supabase
    .from("final_copies")
    .select("id, product_id, platform, status, validation_status, title, source_content_id, language, image_url, media_asset_url, image_asset_path")
    .eq("id", finalCopyId)
    .single()

  if (finalCopyError || !finalCopy) throw new Error("Final copy was not found.")
  const copy = finalCopy as FinalCopyExecutionRow

  if (copy.validation_status !== "valid") {
    throw new Error("Invalid final copy cannot create a publish job.")
  }
  if (copy.status !== "operator_approved") {
    throw new Error("Publish job requires MENI approval first.")
  }

  const productMedia = await getProductMedia(copy.product_id)
  const media = evaluatePlatformMediaReadiness(copy.platform, {
    ...productMedia,
    image_url: copy.image_url ?? productMedia?.image_url ?? null,
    media_asset_url: copy.media_asset_url ?? null,
    image_asset_path: copy.image_asset_path ?? null,
    video_asset_path: null,
  })
  const langCheck = validateLanguageMediaConsistency({
    language: copy.language,
    imageUrl: copy.media_asset_url ?? copy.image_url ?? null,
    product: productMedia,
  })
  if (!langCheck.consistent) {
    const { data, error } = await supabase
      .from("publish_jobs")
      .upsert({
        final_copy_id: copy.id,
        product_id: copy.product_id,
        platform: copy.platform,
        status: "waiting_media",
        executor_type: executorTypeForPlatform(copy.platform),
        blocking_reason: langCheck.reason,
        live_url: null,
        verified_at: null,
      }, { onConflict: "final_copy_id" })
      .select(PUBLISH_JOB_SELECT)
      .single()

    if (error) throw new Error(`Unable to mark language-mismatch publish job: ${error.message}`)
    return mapPublishJob(data as PublishJobRow)
  }

  if (!media.mediaReady) {
    const { data, error } = await supabase
      .from("publish_jobs")
      .upsert({
        final_copy_id: copy.id,
        product_id: copy.product_id,
        platform: copy.platform,
        status: "waiting_media",
        executor_type: executorTypeForPlatform(copy.platform),
        blocking_reason: media.blockingReasons.join(", ") || "media_not_ready",
        live_url: null,
        verified_at: null,
      }, { onConflict: "final_copy_id" })
      .select(PUBLISH_JOB_SELECT)
      .single()

    if (error) throw new Error(`Unable to mark publish job waiting_media: ${error.message}`)
    return mapPublishJob(data as PublishJobRow)
  }

  const executorState = getExecutorStateForPlatform(copy.platform, await getActiveExecutorSession())
  const approvalId = await getCampaignApprovalId(copy.source_content_id, copy.platform)
  const schedulePlan = await getPublishSchedulePlanForCopy(copy)

  const { data, error } = await supabase
    .from("publish_jobs")
    .upsert({
      final_copy_id: copy.id,
      product_id: copy.product_id,
      platform: copy.platform,
      status: executorState.status,
      executor_type: executorTypeForPlatform(copy.platform),
      blocking_reason: executorState.blockingReason,
      approval_id: approvalId,
      scheduled_at: schedulePlan.scheduledAt,
      schedule_policy_version: schedulePlan.policyVersion,
      schedule_notes: schedulePlan.reasons,
      live_url: null,
      verified_at: null,
    }, { onConflict: "final_copy_id" })
    .select(PUBLISH_JOB_SELECT)
    .single()

  if (error) throw new Error(`Unable to create publish job: ${error.message}`)
  return mapPublishJob(data as PublishJobRow)
}

async function getPublishSchedulePlanForCopy(copy: FinalCopyExecutionRow) {
  const supabase = getServiceRoleSupabase()
  const [{ data: existingJobs, error: jobsError }, { data: publishedRecords, error: recordsError }] =
    await Promise.all([
      supabase
        .from("publish_jobs")
        .select("product_id, platform, scheduled_at, status")
        .not("scheduled_at", "is", null)
        .neq("final_copy_id", copy.id),
      supabase
        .from("published_records")
        .select("product_id, platform, verified_at")
        .eq("verification_status", "verified"),
    ])

  if (jobsError) throw new Error(`Unable to load existing publish schedule: ${jobsError.message}`)
  if (recordsError) throw new Error(`Unable to load published records for schedule: ${recordsError.message}`)

  return planNextPublishSlot({
    productId: copy.product_id,
    platform: copy.platform,
    existingJobs: ((existingJobs ?? []) as Array<{
      product_id: string
      platform: CampaignPlatform
      scheduled_at: string | null
      status: string | null
    }>).map((job): ScheduledPublishItem => ({
      productId: job.product_id,
      platform: job.platform,
      scheduledAt: job.scheduled_at,
      status: job.status,
    })),
    publishedRecords: ((publishedRecords ?? []) as Array<{
      product_id: string
      platform: CampaignPlatform
      verified_at: string | null
    }>).map((record): PublishedItem => ({
      productId: record.product_id,
      platform: record.platform,
      publishedAt: record.verified_at,
    })),
  })
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

export async function listPublishJobsForHebrewDashboard(): Promise<PublishJob[]> {
  if (!isSupabaseConfigured()) return []
  try {
    await materializeDueScheduledPublishItems()
  } catch {
    // Non-fatal: scheduled publish materialization failure should not crash dashboard
  }
  try {
    await refreshPublishJobsForExecutorConnection()
  } catch {
    // Non-fatal: stale executor state is acceptable for dashboard display
  }
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("publish_jobs")
    .select(PUBLISH_JOB_SELECT)
    .order("updated_at", { ascending: false })

  if (error?.message.includes("publish_jobs")) return []
  if (error) throw new Error(`Unable to load publish jobs: ${error.message}`)
  return ((data ?? []) as PublishJobRow[])
    .map(mapPublishJob)
    .filter((job) => !job.scheduledAt || Date.parse(job.scheduledAt) <= Date.now() || job.status === "verified")
}

export async function getNextPublishJobForExecutor(): Promise<PublishExecutorJob | null> {
  if (!isSupabaseConfigured()) return null
  await refreshPublishJobsForExecutorConnection()

  const supabase = getServiceRoleSupabase()
  const { data: confirmed, error: confirmedError } = await supabase
    .from("publish_jobs")
    .select(PUBLISH_EXECUTOR_JOB_SELECT)
    .eq("status", "running")
    .eq("blocking_reason", "operator_final_confirmation_granted")
    .not("executor_url", "is", null)
    .order("final_confirmed_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!confirmedError && confirmed) {
    const job = mapPublishExecutorJob(confirmed as PublishExecutorJobRow)
    if (!job.mediaReady) {
      await markPublishJobWaitingMedia(job.id, job.blockingReasons.join(", ") || "media_not_ready")
      return null
    }
    return job
  }

  const { data, error } = await supabase
    .from("publish_jobs")
    .select(PUBLISH_EXECUTOR_JOB_SELECT)
    .eq("status", "approved_waiting_executor")
    .order("scheduled_at", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: true })
    .limit(20)

  if (error || !data?.length) return null
  const dueRow = (data as PublishExecutorJobRow[]).find(
    (row) => !row.scheduled_at || Date.parse(row.scheduled_at) <= Date.now(),
  )
  if (!dueRow) return null
  const job = mapPublishExecutorJob(dueRow)

  if (!job.targetUrl) {
    await updatePublishJobFromExecutor({
      jobId: job.id,
      status: "failed_needs_system_fix",
      blockerReason: "platform_target_not_configured",
      message: "Executor blocked because platform target URL is not configured.",
    })
    return null
  }

  if (!job.content.trim()) {
    await updatePublishJobFromExecutor({
      jobId: job.id,
      status: "failed_needs_system_fix",
      blockerReason: "final_copy_body_missing",
      message: "Executor blocked because final copy body is missing.",
    })
    return null
  }

  if (!job.mediaReady) {
    await markPublishJobWaitingMedia(job.id, job.blockingReasons.join(", ") || "media_not_ready")
    return null
  }

  return job
}

export async function confirmPreparedPublishJobForExecution(jobId: string): Promise<PublishJob> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.")
  const supabase = getServiceRoleSupabase()

  const { data: current, error: currentError } = await supabase
    .from("publish_jobs")
    .select(PUBLISH_EXECUTOR_JOB_SELECT)
    .eq("id", jobId)
    .single()

  if (currentError || !current) throw new Error("Publish job was not found.")
  const executorJob = mapPublishExecutorJob(current as PublishExecutorJobRow)
  const job = mapPublishJob(current as PublishJobRow)

  if (job.platform !== "medium" && job.platform !== "substack") {
    throw new Error("Final confirmation is enabled only for prepared Medium and Substack jobs.")
  }
  if (job.status !== "pending_operator_confirmation") {
    throw new Error("Only a job waiting for final confirmation can be confirmed.")
  }
  assertPublishJobScheduleIsDue(job)
  if (!executorJob.mediaReady) {
    await markPublishJobWaitingMedia(job.id, executorJob.blockingReasons.join(", ") || "media_not_ready")
    throw new Error("Publish job is waiting for required image/media before final confirmation.")
  }
  if (!job.executorUrl || detectBrowserPlatform(job.executorUrl) !== job.platform) {
    throw new Error(`Prepared ${job.platform} executor draft URL is missing.`)
  }

  const { data, error } = await supabase
    .from("publish_jobs")
    .update({
      status: "running",
      blocking_reason: "operator_final_confirmation_granted",
      final_confirmed_at: new Date().toISOString(),
      live_url: null,
      verified_at: null,
    })
    .eq("id", job.id)
    .eq("status", "pending_operator_confirmation")
    .select(PUBLISH_JOB_SELECT)
    .single()

  if (error) throw new Error(`Unable to confirm prepared publish job: ${error.message}`)
  return mapPublishJob(data as PublishJobRow)
}

export async function updatePublishJobFromExecutor(input: {
  jobId: string
  status: PublishExecutorStatus
  activeTabUrl?: string | null
  blockerReason?: string | null
  errorMessage?: string | null
  postUrl?: string | null
  message?: string | null
}): Promise<PublishJob> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.")
  const supabase = getServiceRoleSupabase()

  const { data: current, error: currentError } = await supabase
    .from("publish_jobs")
    .select(PUBLISH_EXECUTOR_JOB_SELECT)
    .eq("id", input.jobId)
    .single()

  if (currentError || !current) throw new Error("Publish job was not found.")
  const job = mapPublishExecutorJob(current as PublishExecutorJobRow)

  if (input.status === "published" || input.status === "verified") {
    if (!job.mediaReady) {
      await markPublishJobWaitingMedia(job.id, job.blockingReasons.join(", ") || "media_not_ready")
      throw new Error("Verified publishing is blocked until required image/media is attached.")
    }

    const postUrl = input.postUrl?.trim()
    if (!postUrl || !isValidPublishedPostUrl(postUrl, job.platform)) {
      throw new Error("A verified live URL on the expected platform is required.")
    }

    const finalCopy = relatedFinalCopy((current as PublishExecutorJobRow).final_copies)
    if (!finalCopy?.source_content_id || !finalCopy.platform_adaptation_id) {
      throw new Error("Published record requires source content and platform adaptation traceability.")
    }

    const { data: publishedRecord, error: publishedRecordError } = await supabase
      .from("published_records")
      .upsert({
        product_id: job.productId,
        source_content_id: finalCopy.source_content_id,
        platform_adaptation_id: finalCopy.platform_adaptation_id,
        platform: job.platform,
        live_url: postUrl,
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        final_copy_id: job.finalCopyId,
        campaign_approval_id: job.approvalId,
        media_asset_url: job.mediaAssetUrl,
        media_status: job.mediaRequired ? "ready" : "not_required",
        needs_media_repair: false,
      }, { onConflict: "platform,live_url" })
      .select("id")
      .single()

    if (publishedRecordError) {
      throw new Error(`Unable to create published record: ${publishedRecordError.message}`)
    }

    await supabase
      .from("final_copies")
      .update({ status: "published_verified" })
      .eq("id", job.finalCopyId)

    const { data, error } = await supabase
      .from("publish_jobs")
      .update({
        status: "verified",
        live_url: postUrl,
        verified_at: new Date().toISOString(),
        blocking_reason: null,
      })
      .eq("id", job.id)
      .select(PUBLISH_JOB_SELECT)
      .single()

    if (error) throw new Error(`Unable to verify publish job: ${error.message}`)
    await supabase
      .from("scheduled_publish_queue")
      .update({
        status: "published",
        published_record_id: (publishedRecord as { id: string }).id,
        last_error: null,
      })
      .eq("final_copy_id", job.finalCopyId)
    return mapPublishJob(data as PublishJobRow)
  }

  const nextStatus: PublishJobStatus =
    input.status === "opened" || input.status === "filled" || input.status === "running"
      ? "running"
      : input.status === "waiting_url_verification"
        ? "waiting_url_verification"
        : input.status === "waiting_user"
          ? "pending_operator_confirmation"
          : input.status === "pending_operator_confirmation"
            ? "pending_operator_confirmation"
            : input.status === "requires_auth"
              ? "requires_auth"
              : input.status === "blocked_policy"
                ? "blocked_policy"
                : input.status === "blocked" || input.status === "failed" || input.status === "failed_needs_system_fix"
                  ? "needs_system_fix"
                  : input.status

  const blockingReason =
    input.status === "waiting_user"
      ? "executor_waiting_final_confirmation"
      : input.blockerReason ?? (nextStatus === "needs_system_fix" ? "executor_failed" : null)

  const { data, error } = await supabase
    .from("publish_jobs")
    .update({
      status: nextStatus,
      blocking_reason: blockingReason,
      executor_url:
        nextStatus === "pending_operator_confirmation" &&
        input.activeTabUrl &&
        detectBrowserPlatform(input.activeTabUrl) === job.platform
          ? input.activeTabUrl
          : job.executorUrl,
    })
    .eq("id", job.id)
    .select(PUBLISH_JOB_SELECT)
    .single()

  if (error) throw new Error(`Unable to update publish job: ${error.message}`)
  return mapPublishJob(data as PublishJobRow)
}
