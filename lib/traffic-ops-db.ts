import "server-only"

import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import type { CampaignPlatform } from "@/types/campaign-workflow"
import type {
  TrafficAsset,
  TrafficAssetStatus,
  TrafficOpsSummary,
  TrafficReview,
  TrafficReviewDecision,
  TrafficTask,
  TrafficTaskStatus,
  TrafficTaskType,
} from "@/types/traffic-ops"

type TaskRow = {
  id: string
  product_id: string
  platform: string
  task_type: string
  status: string
  priority: number
  traffic_score: number | string | null
  ranking_id: string | null
  final_copy_id: string | null
  publish_job_id: string | null
  blocking_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
  products: { name: string } | Array<{ name: string }> | null
  traffic_assets: Array<{ status: string }> | null
  traffic_reviews: Array<{ decision: string }> | null
}

function related<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function mapTask(row: TaskRow): TrafficTask {
  const product = related(row.products)
  const asset = row.traffic_assets?.[0] ?? null
  const review = row.traffic_reviews?.[0] ?? null
  return {
    id: row.id,
    productId: row.product_id,
    productName: product?.name ?? null,
    platform: row.platform as CampaignPlatform,
    taskType: row.task_type as TrafficTaskType,
    status: row.status as TrafficTaskStatus,
    priority: row.priority,
    trafficScore: row.traffic_score !== null ? Number(row.traffic_score) : null,
    rankingId: row.ranking_id,
    finalCopyId: row.final_copy_id,
    publishJobId: row.publish_job_id,
    blockingReason: row.blocking_reason,
    notes: row.notes,
    assetStatus: (asset?.status as TrafficAssetStatus) ?? null,
    reviewDecision: (review?.decision as TrafficReviewDecision) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getTrafficTasks(filter?: {
  status?: TrafficTaskStatus
  platform?: CampaignPlatform
}): Promise<TrafficTask[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()

  let query = supabase
    .from("traffic_tasks")
    .select("*, products(name), traffic_assets(status), traffic_reviews(decision)")
    .order("priority", { ascending: true })
    .order("traffic_score", { ascending: false, nullsFirst: false })

  if (filter?.status) query = query.eq("status", filter.status)
  if (filter?.platform) query = query.eq("platform", filter.platform)

  const { data, error } = await query
  if (error) {
    if (error.message.includes("traffic_tasks") || error.message.includes("relation")) return []
    throw new Error(`traffic_tasks: ${error.message}`)
  }
  return ((data ?? []) as TaskRow[]).map(mapTask)
}

export async function getTrafficOpsSummary(): Promise<TrafficOpsSummary> {
  if (!isSupabaseConfigured()) {
    return { total: 0, pending: 0, assetNeeded: 0, assetReady: 0, inReview: 0, approved: 0, publishJobCreated: 0, completed: 0, skipped: 0, byPlatform: {} }
  }
  const tasks = await getTrafficTasks()
  const byPlatform: Record<string, number> = {}
  let pending = 0, assetNeeded = 0, assetReady = 0, inReview = 0, approved = 0, publishJobCreated = 0, completed = 0, skipped = 0

  for (const t of tasks) {
    byPlatform[t.platform] = (byPlatform[t.platform] ?? 0) + 1
    switch (t.status) {
      case "pending": pending++; break
      case "asset_needed": assetNeeded++; break
      case "asset_ready": assetReady++; break
      case "in_review": inReview++; break
      case "approved": approved++; break
      case "publish_job_created": publishJobCreated++; break
      case "completed": completed++; break
      case "skipped": skipped++; break
    }
  }
  return { total: tasks.length, pending, assetNeeded, assetReady, inReview, approved, publishJobCreated, completed, skipped, byPlatform }
}

export async function createTrafficTask(input: {
  productId: string
  platform: CampaignPlatform
  taskType: TrafficTaskType
  priority?: number
  trafficScore?: number
  finalCopyId?: string
  notes?: string
}): Promise<string> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured.")
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("traffic_tasks")
    .insert({
      product_id: input.productId,
      platform: input.platform,
      task_type: input.taskType,
      priority: input.priority ?? 100,
      traffic_score: input.trafficScore ?? null,
      final_copy_id: input.finalCopyId ?? null,
      notes: input.notes ?? null,
      status: "pending",
    })
    .select("id")
    .single()
  if (error) throw new Error(`create traffic_task: ${error.message}`)
  return (data as { id: string }).id
}

export async function updateTrafficTaskStatus(taskId: string, status: TrafficTaskStatus, blockingReason?: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const supabase = getServiceRoleSupabase()
  const update: Record<string, unknown> = { status }
  if (blockingReason !== undefined) update.blocking_reason = blockingReason
  const { error } = await supabase.from("traffic_tasks").update(update).eq("id", taskId)
  if (error) throw new Error(`update traffic_task: ${error.message}`)
}

export async function linkPublishJob(taskId: string, publishJobId: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const supabase = getServiceRoleSupabase()
  const { error } = await supabase
    .from("traffic_tasks")
    .update({ publish_job_id: publishJobId, status: "publish_job_created" })
    .eq("id", taskId)
  if (error) throw new Error(`link publish_job: ${error.message}`)
}

export async function createTrafficAsset(input: {
  taskId: string
  productId: string
  platform: CampaignPlatform
  assetType: "image" | "video" | "carousel" | "gif" | "document"
  sourceDescription?: string
}): Promise<string> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured.")
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("traffic_assets")
    .insert({
      task_id: input.taskId,
      product_id: input.productId,
      platform: input.platform,
      asset_type: input.assetType,
      status: "needed",
      source_description: input.sourceDescription ?? null,
    })
    .select("id")
    .single()
  if (error) throw new Error(`create traffic_asset: ${error.message}`)
  return (data as { id: string }).id
}

export async function updateTrafficAsset(assetId: string, update: {
  status?: TrafficAssetStatus
  assetUrl?: string
  thumbnailUrl?: string
  blockingReason?: string
}): Promise<void> {
  if (!isSupabaseConfigured()) return
  const supabase = getServiceRoleSupabase()
  const row: Record<string, unknown> = {}
  if (update.status) row.status = update.status
  if (update.assetUrl !== undefined) row.asset_url = update.assetUrl
  if (update.thumbnailUrl !== undefined) row.thumbnail_url = update.thumbnailUrl
  if (update.blockingReason !== undefined) row.blocking_reason = update.blockingReason
  const { error } = await supabase.from("traffic_assets").update(row).eq("id", assetId)
  if (error) throw new Error(`update traffic_asset: ${error.message}`)
}

export async function getTrafficAssets(taskId: string): Promise<TrafficAsset[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("traffic_assets")
    .select("*")
    .eq("task_id", taskId)
  if (error) return []
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    taskId: r.task_id as string,
    productId: r.product_id as string,
    platform: r.platform as CampaignPlatform,
    assetType: r.asset_type as TrafficAsset["assetType"],
    status: r.status as TrafficAssetStatus,
    assetUrl: (r.asset_url as string) ?? null,
    thumbnailUrl: (r.thumbnail_url as string) ?? null,
    sourceDescription: (r.source_description as string) ?? null,
    blockingReason: (r.blocking_reason as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }))
}

export async function createTrafficReview(taskId: string): Promise<string> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured.")
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("traffic_reviews")
    .insert({ task_id: taskId, reviewer: "meni", decision: "pending" })
    .select("id")
    .single()
  if (error) throw new Error(`create traffic_review: ${error.message}`)
  return (data as { id: string }).id
}

export async function submitTrafficReview(reviewId: string, decision: TrafficReviewDecision, reason?: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const supabase = getServiceRoleSupabase()
  const { error } = await supabase
    .from("traffic_reviews")
    .update({
      decision,
      reason: reason ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
  if (error) throw new Error(`submit traffic_review: ${error.message}`)
}

export async function getPendingReviews(): Promise<TrafficReview[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("traffic_reviews")
    .select("*")
    .eq("decision", "pending")
    .order("created_at", { ascending: true })
  if (error) return []
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    taskId: r.task_id as string,
    reviewer: r.reviewer as string,
    decision: r.decision as TrafficReviewDecision,
    reason: (r.reason as string) ?? null,
    reviewedAt: (r.reviewed_at as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }))
}
