import "server-only"

import { getPlatformPublishTarget, isValidPublishedPostUrl } from "@/lib/browser-control"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import type { CampaignPlatform } from "@/types/campaign-workflow"
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
  live_url: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
  products?: { name: string } | { name: string }[] | null
  final_copies?: { title: string } | { title: string }[] | null
}

type FinalCopyExecutionRow = {
  id: string
  product_id: string
  platform: CampaignPlatform
  status: string
  validation_status: string
  title: string
  body?: string
  source_content_id: string
  platform_adaptation_id?: string
  affiliate_link?: string | null
}

type PublishExecutorFinalCopyRelation = {
  title: string
  body: string
  source_content_id: string
  platform_adaptation_id: string
  affiliate_link: string | null
}

type PublishExecutorJobRow = Omit<PublishJobRow, "final_copies"> & {
  final_copies?: PublishExecutorFinalCopyRelation | PublishExecutorFinalCopyRelation[] | null
}

export type PublishExecutorJob = PublishJob & {
  targetUrl: string | null
  title: string
  content: string
  affiliateLink: string | null
}

export type PublishExecutorStatus =
  | PublishJobStatus
  | "opened"
  | "filled"
  | "waiting_user"
  | "published"
  | "blocked"
  | "failed"

const PUBLISH_JOB_SELECT =
  "id, final_copy_id, product_id, platform, status, executor_type, blocking_reason, approval_id, live_url, verified_at, created_at, updated_at, products(name), final_copies(title)"

const PUBLISH_EXECUTOR_JOB_SELECT =
  "id, final_copy_id, product_id, platform, status, executor_type, blocking_reason, approval_id, live_url, verified_at, created_at, updated_at, products(name), final_copies(title, body, source_content_id, platform_adaptation_id, affiliate_link)"

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

  return {
    ...job,
    targetUrl: getPlatformPublishTarget(row.platform),
    title: finalCopy?.title ?? job.finalCopyTitle ?? "Approved post",
    content: finalCopy?.body ?? "",
    affiliateLink: finalCopy?.affiliate_link ?? null,
  }
}

async function hasConnectedExecutor() {
  const supabase = getServiceRoleSupabase()
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from("browser_sessions")
    .select("id")
    .eq("status", "connected")
    .gte("last_seen_at", tenMinutesAgo)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return false
  return Boolean(data)
}

export async function refreshPublishJobsForExecutorConnection() {
  if (!isSupabaseConfigured()) return
  const supabase = getServiceRoleSupabase()
  const executorConnected = await hasConnectedExecutor()

  if (executorConnected) {
    await supabase
      .from("publish_jobs")
      .update({
        status: "approved_waiting_executor",
        blocking_reason: null,
      })
      .eq("status", "blocked_executor_not_connected")
      .eq("blocking_reason", "executor_not_connected")
    return
  }

  await supabase
    .from("publish_jobs")
    .update({
      status: "blocked_executor_not_connected",
      blocking_reason: "executor_not_connected",
    })
    .eq("status", "approved_waiting_executor")
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

export async function createOrUpdatePublishJobForFinalCopy(finalCopyId: string): Promise<PublishJob | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getServiceRoleSupabase()

  const { data: finalCopy, error: finalCopyError } = await supabase
    .from("final_copies")
    .select("id, product_id, platform, status, validation_status, title, source_content_id")
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

  const executorConnected = await hasConnectedExecutor()
  const nextStatus: PublishJobStatus = executorConnected
    ? "approved_waiting_executor"
    : "blocked_executor_not_connected"
  const blockingReason = executorConnected ? null : "executor_not_connected"
  const approvalId = await getCampaignApprovalId(copy.source_content_id, copy.platform)

  const { data, error } = await supabase
    .from("publish_jobs")
    .upsert({
      final_copy_id: copy.id,
      product_id: copy.product_id,
      platform: copy.platform,
      status: nextStatus,
      executor_type: "browser_helper",
      blocking_reason: blockingReason,
      approval_id: approvalId,
      live_url: null,
      verified_at: null,
    }, { onConflict: "final_copy_id" })
    .select(PUBLISH_JOB_SELECT)
    .single()

  if (error) throw new Error(`Unable to create publish job: ${error.message}`)
  return mapPublishJob(data as PublishJobRow)
}

export async function listPublishJobsForHebrewDashboard(): Promise<PublishJob[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("publish_jobs")
    .select(PUBLISH_JOB_SELECT)
    .order("updated_at", { ascending: false })

  if (error?.message.includes("publish_jobs")) return []
  if (error) throw new Error(`Unable to load publish jobs: ${error.message}`)
  return ((data ?? []) as PublishJobRow[]).map(mapPublishJob)
}

export async function getNextPublishJobForExecutor(): Promise<PublishExecutorJob | null> {
  if (!isSupabaseConfigured()) return null
  await refreshPublishJobsForExecutorConnection()

  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("publish_jobs")
    .select(PUBLISH_EXECUTOR_JOB_SELECT)
    .eq("status", "approved_waiting_executor")
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const job = mapPublishExecutorJob(data as PublishExecutorJobRow)

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

  return job
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
    const postUrl = input.postUrl?.trim()
    if (!postUrl || !isValidPublishedPostUrl(postUrl, job.platform)) {
      throw new Error("A verified live URL on the expected platform is required.")
    }

    const finalCopy = relatedFinalCopy((current as PublishExecutorJobRow).final_copies)
    if (!finalCopy?.source_content_id || !finalCopy.platform_adaptation_id) {
      throw new Error("Published record requires source content and platform adaptation traceability.")
    }

    await supabase
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
      }, { onConflict: "platform,live_url" })

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
    return mapPublishJob(data as PublishJobRow)
  }

  const nextStatus: PublishJobStatus =
    input.status === "opened" || input.status === "filled" || input.status === "running"
      ? "running"
      : input.status === "waiting_url_verification"
        ? "waiting_url_verification"
        : input.status === "waiting_user"
          ? "failed_needs_system_fix"
          : input.status === "blocked" || input.status === "failed" || input.status === "failed_needs_system_fix"
            ? "failed_needs_system_fix"
            : input.status

  const blockingReason =
    input.status === "waiting_user"
      ? "executor_requires_manual_publish_action"
      : input.blockerReason ?? (nextStatus === "failed_needs_system_fix" ? "executor_failed" : null)

  const { data, error } = await supabase
    .from("publish_jobs")
    .update({
      status: nextStatus,
      blocking_reason: blockingReason,
    })
    .eq("id", job.id)
    .select(PUBLISH_JOB_SELECT)
    .single()

  if (error) throw new Error(`Unable to update publish job: ${error.message}`)
  return mapPublishJob(data as PublishJobRow)
}
