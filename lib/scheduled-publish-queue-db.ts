import {
  getFacebookPageOfficialApiCapability,
  getInstagramOfficialApiCapability,
} from "@/lib/meta-official-api"
import { evaluatePlatformMediaReadiness } from "@/lib/platform-media-rules"
import { getCurrentPublishingSchedulePolicy } from "@/lib/publishing-schedule-policy-db"
import {
  deriveScheduledPublishStatus,
  getPlatformQueuePriority,
  getPlatformQueuePriorityReason,
  isAutoQueuePlatform,
  isQueueStatusMaterializable,
  isScheduledItemDue,
  planScheduledPublishTime,
  schedulePolicyNotes,
} from "@/lib/production-publishing-scheduler"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import type { CampaignPlatform } from "@/types/campaign-workflow"
import type { ScheduledPublishItem, ScheduledPublishStatus, ScheduledPublishSummary } from "@/types/scheduled-publish"

type QueueRow = {
  id: string
  final_copy_id: string
  product_id: string
  platform: CampaignPlatform
  language: string
  campaign_link: string | null
  media_asset_url: string | null
  image_asset_path: string | null
  video_asset_path: string | null
  approval_id: string | null
  status: ScheduledPublishStatus
  publish_at: string
  priority: number
  attempts: number
  last_error: string | null
  published_record_id: string | null
  created_at: string
  updated_at: string
  products?: { name: string } | { name: string }[] | null
  final_copies?: { title: string } | { title: string }[] | null
}

type FinalCopyScheduleRow = {
  id: string
  product_id: string
  platform: CampaignPlatform
  language: string | null
  status: string
  validation_status: string
  affiliate_link: string | null
  public_review_url: string | null
  media_asset_url?: string | null
  image_url?: string | null
  image_asset_path?: string | null
  source_content_id: string
  platform_adaptation_id: string
  title: string
  products?: ProductMediaRow | ProductMediaRow[] | null
}

type ProductMediaRow = {
  name?: string
  image_url: string | null
  image_url_he: string | null
  image_status: string | null
  video_url: string | null
  video_status: string | null
  video_suitable_for: string[] | null
}

const QUEUE_SELECT =
  "id, final_copy_id, product_id, platform, language, campaign_link, media_asset_url, image_asset_path, video_asset_path, approval_id, status, publish_at, priority, attempts, last_error, published_record_id, created_at, updated_at, products(name), final_copies(title)"

function related<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function mapQueueRow(row: QueueRow): ScheduledPublishItem {
  return {
    id: row.id,
    finalCopyId: row.final_copy_id,
    productId: row.product_id,
    productName: related(row.products)?.name ?? null,
    platform: row.platform,
    language: row.language,
    campaignLink: row.campaign_link,
    mediaAssetUrl: row.media_asset_url,
    imageAssetPath: row.image_asset_path,
    videoAssetPath: row.video_asset_path,
    approvalId: row.approval_id,
    status: row.status,
    publishAt: row.publish_at,
    priority: row.priority,
    attempts: row.attempts,
    lastError: row.last_error,
    publishedRecordId: row.published_record_id,
    finalCopyTitle: related(row.final_copies)?.title ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createOrUpdateScheduledPublishItemForFinalCopy(
  finalCopyId: string,
  options: { forceReschedule?: boolean } = {},
): Promise<ScheduledPublishItem | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("final_copies")
    .select("id, product_id, platform, language, status, validation_status, affiliate_link, public_review_url, media_asset_url, image_url, image_asset_path, source_content_id, platform_adaptation_id, title, products(name, image_url, image_url_he, image_status, video_url, video_status, video_suitable_for)")
    .eq("id", finalCopyId)
    .single()

  if (error || !data) throw new Error("Final copy was not found.")
  const finalCopy = data as FinalCopyScheduleRow
  if (finalCopy.validation_status !== "valid") throw new Error("Invalid final copy cannot be scheduled.")
  if (finalCopy.status !== "operator_approved") throw new Error("Scheduling requires MENI approval first.")
  if (!isAutoQueuePlatform(finalCopy.platform)) return null

  const { data: existingQueue } = await supabase
    .from("scheduled_publish_queue")
    .select("publish_at, status")
    .eq("final_copy_id", finalCopy.id)
    .maybeSingle()
  const productMedia = related(finalCopy.products)
  const media = evaluatePlatformMediaReadiness(finalCopy.platform, {
    ...productMedia,
    image_url: finalCopy.image_url ?? productMedia?.image_url ?? null,
    media_asset_url: finalCopy.media_asset_url ?? null,
    image_asset_path: finalCopy.image_asset_path ?? null,
    video_asset_path: null,
  })
  const imageAsset =
    finalCopy.media_asset_url ??
    finalCopy.image_url ??
    finalCopy.image_asset_path ??
    productMedia?.image_url_he ??
    productMedia?.image_url ??
    null
  const videoAsset = productMedia?.video_url ?? null
  const approvalId = await getCampaignApprovalId(finalCopy.source_content_id, finalCopy.platform)
  const existingPublishAt = (existingQueue as { publish_at?: string } | null)?.publish_at ?? null
  const publishAt = existingPublishAt && !options.forceReschedule
    ? existingPublishAt
    : await planPublishAt(finalCopy)
  const gate = getPlatformGate(finalCopy.platform, media.mediaReady)
  const status = deriveScheduledPublishStatus({
    platform: finalCopy.platform,
    productMedia,
    platformReady: gate.platformReady,
    executorReady: gate.executorReady,
    publishAt,
  })
  const existingStatus = (existingQueue as { status?: ScheduledPublishStatus } | null)?.status ?? null
  const nextStatus =
    existingStatus && ["paused", "publishing", "published"].includes(existingStatus)
      ? existingStatus
      : status

  const { data: queued, error: queueError } = await supabase
    .from("scheduled_publish_queue")
    .upsert({
      final_copy_id: finalCopy.id,
      product_id: finalCopy.product_id,
      platform: finalCopy.platform,
      language: finalCopy.language ?? "en",
      campaign_link: finalCopy.platform === "quora" || finalCopy.platform === "reddit"
        ? finalCopy.public_review_url
        : finalCopy.affiliate_link,
      media_asset_url: media.publishMediaMode === "video" ? videoAsset : imageAsset,
      image_asset_path: imageAsset,
      video_asset_path: videoAsset,
      approval_id: approvalId,
      status: nextStatus,
      publish_at: publishAt,
      priority: getPlatformQueuePriority(finalCopy.platform),
      last_error: null,
    }, { onConflict: "final_copy_id" })
    .select(QUEUE_SELECT)
    .single()

  if (queueError) throw new Error(`Unable to schedule final copy: ${queueError.message}`)
  return mapQueueRow(queued as QueueRow)
}

export async function listScheduledPublishQueue(): Promise<ScheduledPublishItem[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("scheduled_publish_queue")
    .select(QUEUE_SELECT)
    .order("priority", { ascending: true })
    .order("publish_at", { ascending: true })

  if (error?.message.includes("scheduled_publish_queue")) return []
  if (error) throw new Error(`Unable to load scheduled publish queue: ${error.message}`)
  return sortQueueItemsForDisplay(((data ?? []) as QueueRow[]).map(mapQueueRow))
}

export async function refreshScheduledPublishQueueStatuses() {
  if (!isSupabaseConfigured()) return
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("scheduled_publish_queue")
    .select("id, final_copy_id")
    .in("status", ["scheduled", "waiting_platform_connection", "waiting_media", "waiting_executor", "ready_to_publish"])

  if (error || !data?.length) return
  for (const row of data as Array<{ id: string; final_copy_id: string }>) {
    await refreshScheduledPublishItem(row.final_copy_id)
  }
}

export async function materializeDueScheduledPublishItems(limit = 10) {
  if (!isSupabaseConfigured()) return []
  await refreshScheduledPublishQueueStatuses()
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("scheduled_publish_queue")
    .select(QUEUE_SELECT)
    .lte("publish_at", new Date().toISOString())
    .in("status", ["ready_to_publish", "waiting_executor"])
    .order("priority", { ascending: true })
    .order("publish_at", { ascending: true })
    .limit(limit)

  if (error || !data?.length) return []
  const created = []
  for (const item of (data as QueueRow[]).map(mapQueueRow)) {
    if (!isQueueStatusMaterializable(item.status) || !isScheduledItemDue(item)) continue
    const job = await createPublishJobForScheduledItem(item)
    if (job) created.push(job)
  }
  return created
}

export async function pauseScheduledPublishItem(id: string) {
  await updateQueueStatus(id, "paused")
}

export async function resumeScheduledPublishItem(id: string) {
  const supabase = getServiceRoleSupabase()
  const { data } = await supabase.from("scheduled_publish_queue").select("final_copy_id").eq("id", id).maybeSingle()
  if (data) await refreshScheduledPublishItem((data as { final_copy_id: string }).final_copy_id)
}

export async function rescheduleScheduledPublishItem(id: string) {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase.from("scheduled_publish_queue").select("final_copy_id").eq("id", id).maybeSingle()
  if (error || !data) throw new Error("Scheduled item not found.")
  await createOrUpdateScheduledPublishItemForFinalCopy((data as { final_copy_id: string }).final_copy_id, {
    forceReschedule: true,
  })
}

export async function publishScheduledItemNow(id: string) {
  const supabase = getServiceRoleSupabase()
  const { error } = await supabase
    .from("scheduled_publish_queue")
    .update({ publish_at: new Date().toISOString(), status: "ready_to_publish" })
    .eq("id", id)
    .neq("status", "published")
  if (error) throw new Error(`Unable to mark scheduled item ready: ${error.message}`)
  return materializeDueScheduledPublishItems(1)
}

export function summarizeScheduledPublishQueue(items: ScheduledPublishItem[]): ScheduledPublishSummary {
  const now = new Date()
  const today = dayKey(now)
  const tomorrow = dayKey(new Date(now.getTime() + 24 * 60 * 60 * 1000))
  const byPlatform: Record<string, number> = {}
  const byProduct: Record<string, number> = {}
  let nextPublishAt: string | null = null
  for (const item of items) {
    byPlatform[item.platform] = (byPlatform[item.platform] ?? 0) + 1
    byProduct[item.productName ?? item.productId] = (byProduct[item.productName ?? item.productId] ?? 0) + 1
    if (
      ["scheduled", "ready_to_publish", "waiting_executor"].includes(item.status) &&
      (!nextPublishAt || Date.parse(item.publishAt) < Date.parse(nextPublishAt))
    ) {
      nextPublishAt = item.publishAt
    }
  }
  return {
    total: items.length,
    today: items.filter((item) => dayKey(new Date(item.publishAt)) === today).length,
    tomorrow: items.filter((item) => dayKey(new Date(item.publishAt)) === tomorrow).length,
    waitingPlatformConnection: items.filter((item) => item.status === "waiting_platform_connection").length,
    waitingMedia: items.filter((item) => item.status === "waiting_media").length,
    failed: items.filter((item) => item.status === "failed").length,
    published: items.filter((item) => item.status === "published").length,
    nextPublishAt,
    byPlatform,
    byProduct,
  }
}

async function refreshScheduledPublishItem(finalCopyId: string) {
  try {
    await createOrUpdateScheduledPublishItemForFinalCopy(finalCopyId)
  } catch {
    // Final copy may have been deleted — skip refresh for this item
  }
}

async function createPublishJobForScheduledItem(item: ScheduledPublishItem) {
  const supabase = getServiceRoleSupabase()
  if (requiresMediaButMissing(item)) {
    await supabase
      .from("scheduled_publish_queue")
      .update({
        status: "waiting_media",
        last_error: "image_required_for_ready",
      })
      .eq("id", item.id)
    return null
  }

  const { data: existing } = await supabase
    .from("publish_jobs")
    .select("id")
    .eq("final_copy_id", item.finalCopyId)
    .maybeSingle()
  if (existing) return null

  const executorState = getPlatformGate(item.platform, Boolean(item.mediaAssetUrl))
  const status = executorState.executorReady ? "pending_operator_confirmation" : "approved_waiting_executor"
  const policy = await getCurrentPublishingSchedulePolicy()
  const notes = schedulePolicyNotes(item.platform, policy)
  const { data, error } = await supabase
    .from("publish_jobs")
    .insert({
      final_copy_id: item.finalCopyId,
      product_id: item.productId,
      platform: item.platform,
      status,
      executor_type: executorTypeForPlatform(item.platform),
      blocking_reason: null,
      approval_id: item.approvalId,
      scheduled_at: item.publishAt,
      schedule_policy_version: notes[0].replace("policy=", ""),
      schedule_notes: [
        ...notes,
        `platform_priority_reason=${getPlatformQueuePriorityReason(item.platform)}`,
      ],
      live_url: null,
      verified_at: null,
    })
    .select("id")
    .single()

  if (error) {
    await markQueueFailed(item.id, error.message)
    return null
  }
  await updateQueueStatus(item.id, "publishing")
  return data
}

function requiresMediaButMissing(item: ScheduledPublishItem) {
  if (
    ["facebook_page", "instagram_professional", "pinterest", "linkedin", "medium", "substack", "x_twitter"].includes(
      item.platform,
    )
  ) {
    return !item.mediaAssetUrl && !item.imageAssetPath
  }
  if (item.platform === "tiktok" || item.platform === "youtube") {
    return !item.videoAssetPath
  }
  return false
}

async function planPublishAt(finalCopy: Pick<FinalCopyScheduleRow, "id" | "product_id" | "platform">) {
  const supabase = getServiceRoleSupabase()
  const [{ data: queueRows }, { data: records }] = await Promise.all([
    supabase
      .from("scheduled_publish_queue")
      .select("product_id, platform, publish_at, status")
      .neq("final_copy_id", finalCopy.id)
      .in("status", ["scheduled", "waiting_platform_connection", "waiting_media", "waiting_executor", "ready_to_publish", "publishing"]),
    supabase
      .from("published_records")
      .select("product_id, platform, verified_at")
      .eq("verification_status", "verified"),
  ])

  const policy = await getCurrentPublishingSchedulePolicy()
  return planScheduledPublishTime({
    productId: finalCopy.product_id,
    platform: finalCopy.platform,
    existingQueue: ((queueRows ?? []) as Array<{ product_id: string; platform: CampaignPlatform; publish_at: string | null; status: string | null }>).map((row) => ({
      productId: row.product_id,
      platform: row.platform,
      scheduledAt: row.publish_at,
      status: row.status,
    })),
    publishedRecords: ((records ?? []) as Array<{ product_id: string; platform: CampaignPlatform; verified_at: string | null }>).map((row) => ({
      productId: row.product_id,
      platform: row.platform,
      publishedAt: row.verified_at,
    })),
    policy,
  }).scheduledAt
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

function getPlatformGate(platform: CampaignPlatform, mediaReady: boolean) {
  if (!mediaReady) return { platformReady: true, executorReady: false }
  if (platform === "facebook_page") return { platformReady: getFacebookPageOfficialApiCapability().configured, executorReady: getFacebookPageOfficialApiCapability().configured }
  if (platform === "instagram_professional") return { platformReady: getInstagramOfficialApiCapability().configured, executorReady: getInstagramOfficialApiCapability().configured }
  if (platform === "pinterest" || platform === "x_twitter" || platform === "youtube" || platform === "tiktok") {
    return { platformReady: false, executorReady: false }
  }
  return { platformReady: true, executorReady: true }
}

function executorTypeForPlatform(platform: CampaignPlatform) {
  if (platform === "facebook_page") return "meta_pages_api"
  if (platform === "instagram_professional") return "instagram_graph_api"
  if (platform === "linkedin") return "linkedin_official_api"
  return "browser_helper"
}

async function updateQueueStatus(id: string, status: ScheduledPublishStatus) {
  const supabase = getServiceRoleSupabase()
  const { error } = await supabase.from("scheduled_publish_queue").update({ status }).eq("id", id)
  if (error) throw new Error(`Unable to update scheduled item: ${error.message}`)
}

async function markQueueFailed(id: string, message: string) {
  const supabase = getServiceRoleSupabase()
  await supabase.from("scheduled_publish_queue").update({
    status: "failed",
    last_error: message,
    attempts: 1,
  }).eq("id", id)
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function sortQueueItemsForDisplay(items: ScheduledPublishItem[]) {
  return [...items].sort((left, right) => {
    const priorityDiff = left.priority - right.priority
    if (priorityDiff !== 0) return priorityDiff
    const timeDiff = Date.parse(left.publishAt) - Date.parse(right.publishAt)
    if (timeDiff !== 0) return timeDiff
    return left.platform.localeCompare(right.platform)
  })
}
