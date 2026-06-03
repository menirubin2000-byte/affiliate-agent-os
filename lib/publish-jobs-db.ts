import "server-only"

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
  source_content_id: string
}

const PUBLISH_JOB_SELECT =
  "id, final_copy_id, product_id, platform, status, executor_type, blocking_reason, approval_id, live_url, verified_at, created_at, updated_at, products(name), final_copies(title)"

function relatedName<T extends { name?: string }>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0]?.name ?? null
  return value?.name ?? null
}

function relatedTitle(value: { title?: string } | Array<{ title?: string }> | null | undefined) {
  if (Array.isArray(value)) return value[0]?.title ?? null
  return value?.title ?? null
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
