import "server-only"

import { buildFullPostText, detectBrowserPlatform, getPlatformPublishTarget, isValidPublishedPostUrl, VALID_BROWSER_JOB_STATUSES } from "@/lib/browser-control"
import { buildPostApprovalFingerprint, isPublishApprovalType } from "@/lib/approval-identity"
import { refreshPublishJobsForExecutorConnection } from "@/lib/publish-jobs-db"
import { evaluatePostMediaGate } from "@/lib/post-media-policy"
import { isSupabaseConfigured, getServiceRoleSupabase } from "@/lib/supabase/server"
import type { ApprovalItem } from "@/types/approval-item"
import type {
  BrowserControlOverview,
  BrowserEvent,
  BrowserJob,
  BrowserJobStatus,
  BrowserSession,
  BrowserSessionStatus,
} from "@/types/browser-control"

interface BrowserSessionRow {
  id: string
  helper_name: string
  extension_instance_id: string | null
  status: string
  active_tab_url: string | null
  active_tab_title: string | null
  active_platform: string | null
  blocker_status: string | null
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

interface BrowserJobRow {
  id: string
  approval_item_id: string
  browser_session_id: string | null
  product_id: string | null
  platform: string
  status: string
  target_url: string | null
  post_url: string | null
  title: string | null
  content: string
  campaign_link_url: string | null
  disclosure_present: boolean
  blocker_reason: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  products?: { name: string } | { name: string }[] | null
}

interface BrowserEventRow {
  id: string
  browser_job_id: string | null
  browser_session_id: string | null
  event_type: string
  message: string
  metadata: Record<string, unknown>
  created_at: string
}

const BROWSER_JOB_SELECT =
  "id, approval_item_id, browser_session_id, product_id, platform, status, target_url, post_url, title, content, campaign_link_url, disclosure_present, blocker_reason, error_message, created_at, updated_at, products(name)"

function mapSession(row: BrowserSessionRow): BrowserSession {
  return {
    id: row.id,
    helperName: row.helper_name,
    extensionInstanceId: row.extension_instance_id,
    status: row.status as BrowserSessionStatus,
    activeTabUrl: row.active_tab_url,
    activeTabTitle: row.active_tab_title,
    activePlatform: detectBrowserPlatform(row.active_tab_url) || "unknown",
    blockerStatus: row.blocker_status,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapJob(row: BrowserJobRow): BrowserJob {
  return {
    id: row.id,
    approvalItemId: row.approval_item_id,
    browserSessionId: row.browser_session_id,
    productId: row.product_id,
    productName: Array.isArray(row.products)
      ? (row.products[0]?.name ?? null)
      : (row.products?.name ?? null),
    platform: detectBrowserPlatform(row.target_url) === "unknown"
      ? (row.platform as BrowserJob["platform"])
      : detectBrowserPlatform(row.target_url),
    status: row.status as BrowserJobStatus,
    targetUrl: row.target_url,
    postUrl: row.post_url,
    title: row.title,
    content: row.content,
    campaignLinkUrl: row.campaign_link_url,
    disclosurePresent: row.disclosure_present,
    blockerReason: row.blocker_reason,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapEvent(row: BrowserEventRow): BrowserEvent {
  return {
    id: row.id,
    browserJobId: row.browser_job_id,
    browserSessionId: row.browser_session_id,
    eventType: row.event_type,
    message: row.message,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }
}

async function recordBrowserEvent(input: {
  browserJobId?: string | null
  browserSessionId?: string | null
  eventType: string
  message: string
  metadata?: Record<string, unknown>
}) {
  if (!isSupabaseConfigured()) return
  const supabase = getServiceRoleSupabase()
  await supabase.from("browser_events").insert({
    browser_job_id: input.browserJobId ?? null,
    browser_session_id: input.browserSessionId ?? null,
    event_type: input.eventType,
    message: input.message,
    metadata: input.metadata ?? {},
  })
}

export async function listApprovedPublishItems(): Promise<ApprovalItem[]> {
  return listPublishApprovalItems(["approved"])
}

export async function listPublishApprovalItems(statuses?: ApprovalItem["status"][]): Promise<ApprovalItem[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()
  let query = supabase
    .from("approval_items")
    .select(
      "id, product_id, approval_type, platform, title, description, content_preview, campaign_link_url, disclosure_present, status, operator_notes, resolved_at, created_at, updated_at, products(name)",
    )
    .like("approval_type", "publish_%")
    .order("created_at", { ascending: false })

  if (statuses?.length) query = query.in("status", statuses)

  const { data, error } = await query

  if (error) throw new Error(`Failed to list approved publish items: ${error.message}`)

  return (data ?? []).map((row) => {
    const typed = row as {
      id: string
      product_id: string | null
      approval_type: ApprovalItem["approvalType"]
      platform: string | null
      title: string
      description: string | null
      content_preview: string | null
      campaign_link_url: string | null
      disclosure_present: boolean
      status: ApprovalItem["status"]
      operator_notes: string | null
      resolved_at: string | null
      created_at: string
      updated_at: string
      products?: { name: string } | { name: string }[] | null
    }

    return {
      id: typed.id,
      productId: typed.product_id,
      productName: Array.isArray(typed.products)
        ? (typed.products[0]?.name ?? null)
        : (typed.products?.name ?? null),
      approvalType: typed.approval_type,
      platform: typed.platform,
      title: typed.title,
      description: typed.description,
      contentPreview: typed.content_preview,
      campaignLinkUrl: typed.campaign_link_url,
      disclosurePresent: typed.disclosure_present,
      status: typed.status,
      operatorNotes: typed.operator_notes,
      resolvedAt: typed.resolved_at,
      createdAt: typed.created_at,
      updatedAt: typed.updated_at,
    }
  })
}

export function getPostApprovalState(item: ApprovalItem) {
  if (item.status === "waiting_approval") return "ממתין לאישור"
  if (item.status === "approved") return "מאושר לפרסום"
  if (item.status === "published") return "פורסם"
  if (item.status === "needs_changes") return "צריך תיקון"
  if (item.status === "rejected") return "נדחה"
  return item.status
}

export async function approvePublishApprovalItem(approvalItemId: string): Promise<void> {
  const supabase = getServiceRoleSupabase()
  const { data: item, error } = await supabase
    .from("approval_items")
    .select("id, product_id, platform, title, content_preview, campaign_link_url, disclosure_present, status, approval_type, products(image_url, image_url_he)")
    .eq("id", approvalItemId)
    .single()

  if (error || !item) throw new Error("Approval item was not found.")
  if (!isPublishApprovalType(item.approval_type)) throw new Error("Only publish approval items can be approved here.")
  if (item.status !== "waiting_approval") throw new Error("Only waiting approval items can be approved.")
  if (!item.content_preview?.trim()) throw new Error("Cannot approve a post without content.")
  if (!item.campaign_link_url?.trim()) throw new Error("Cannot approve a post without a campaign link.")
  if (!item.disclosure_present) throw new Error("Cannot approve a post without affiliate disclosure.")
  const product = Array.isArray(item.products) ? item.products[0] ?? null : item.products ?? null
  const media = evaluatePostMediaGate({
    platform: item.platform ?? "",
    product,
  })
  if (!media.mediaReady) throw new Error("Cannot approve a visual-platform post without an image/media asset.")

  const fingerprint = buildPostApprovalFingerprint({
    productId: item.product_id,
    platform: item.platform,
    title: item.title,
    contentPreview: item.content_preview,
    campaignLinkUrl: item.campaign_link_url,
  })

  const { data: existing, error: existingError } = await supabase
    .from("approval_items")
    .select("id, product_id, platform, title, content_preview, campaign_link_url, status")
    .eq("product_id", item.product_id)
    .eq("platform", item.platform)
    .like("approval_type", "publish_%")
    .in("status", ["approved", "published"])

  if (existingError) throw new Error(`Failed to check existing approvals: ${existingError.message}`)

  const alreadyApproved = (existing ?? []).find((row) => buildPostApprovalFingerprint({
    productId: row.product_id,
    platform: row.platform,
    title: row.title,
    contentPreview: row.content_preview,
    campaignLinkUrl: row.campaign_link_url,
  }) === fingerprint)

  if (alreadyApproved) return

  const { error: updateError } = await supabase
    .from("approval_items")
    .update({
      status: "approved",
      operator_notes: "Approved once for this product/platform/content/campaign link.",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", approvalItemId)

  if (updateError) throw new Error(`Failed to approve publish item: ${updateError.message}`)
}

export async function getLatestBrowserSession(): Promise<BrowserSession | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("browser_sessions")
    .select("*")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return mapSession(data as BrowserSessionRow)
}

export async function listBrowserJobs(limit = 25): Promise<BrowserJob[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("browser_jobs")
    .select(BROWSER_JOB_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to list browser jobs: ${error.message}`)
  return (data ?? []).map((row) => mapJob(row as BrowserJobRow))
}

export async function listBrowserEvents(limit = 40): Promise<BrowserEvent[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("browser_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to list browser events: ${error.message}`)
  return (data ?? []).map((row) => mapEvent(row as BrowserEventRow))
}

export async function getBrowserControlOverview(): Promise<BrowserControlOverview> {
  const [latestSession, jobs, events] = await Promise.all([
    getLatestBrowserSession(),
    listBrowserJobs(25),
    listBrowserEvents(40),
  ])

  const connected = latestSession?.status === "connected"
  return {
    connected,
    latestSession,
    jobs,
    events,
    queuedCount: jobs.filter((job) => job.status === "queued").length,
    blockerStatus: latestSession?.blockerStatus ?? jobs.find((job) => job.status === "blocked")?.blockerReason ?? null,
  }
}

export async function upsertBrowserSession(input: {
  extensionInstanceId?: string | null
  activeTabUrl?: string | null
  activeTabTitle?: string | null
  blockerStatus?: string | null
}): Promise<BrowserSession> {
  const supabase = getServiceRoleSupabase()
  const now = new Date().toISOString()
  const extensionInstanceId = input.extensionInstanceId?.trim() || "default-helper"
  const activePlatform = detectBrowserPlatform(input.activeTabUrl)
  const status = input.blockerStatus ? "blocked" : "connected"

  const { data: existing } = await supabase
    .from("browser_sessions")
    .select("*")
    .eq("extension_instance_id", extensionInstanceId)
    .maybeSingle()

  const payload = {
    helper_name: "Affiliate Agent OS Browser Helper",
    extension_instance_id: extensionInstanceId,
    status,
    active_tab_url: input.activeTabUrl ?? null,
    active_tab_title: input.activeTabTitle ?? null,
    active_platform: activePlatform,
    blocker_status: input.blockerStatus ?? null,
    last_seen_at: now,
  }

  const query = existing
    ? supabase.from("browser_sessions").update(payload).eq("id", existing.id)
    : supabase.from("browser_sessions").insert(payload)

  const { data, error } = await query.select("*").single()
  if (error) throw new Error(`Failed to update browser session: ${error.message}`)

  const session = mapSession(data as BrowserSessionRow)
  await refreshPublishJobsForExecutorConnection()
  await recordBrowserEvent({
    browserSessionId: session.id,
    eventType: "heartbeat",
    message: input.blockerStatus ? `Browser helper blocked: ${input.blockerStatus}` : "Browser helper connected.",
    metadata: { activeTabUrl: input.activeTabUrl ?? null },
  })

  return session
}

export async function createBrowserJobForApprovalItem(approvalItemId: string): Promise<BrowserJob> {
  const supabase = getServiceRoleSupabase()
  const { data: item, error: itemError } = await supabase
    .from("approval_items")
    .select("id, product_id, platform, title, content_preview, campaign_link_url, disclosure_present, status, approval_type, products(image_url, image_url_he)")
    .eq("id", approvalItemId)
    .single()

  if (itemError || !item) throw new Error("Approval item was not found.")
  if (item.status !== "approved") throw new Error("Only approved items can be queued for browser publishing.")
  if (!String(item.approval_type).startsWith("publish_")) {
    throw new Error("Only publish approval items can be queued for browser publishing.")
  }
  if (!item.content_preview?.trim()) throw new Error("Approval item has no content to publish.")
  const product = Array.isArray(item.products) ? item.products[0] ?? null : item.products ?? null
  const media = evaluatePostMediaGate({
    platform: item.platform ?? "",
    product,
  })
  if (!media.mediaReady) throw new Error("Browser job requires an image/media asset before queueing.")

  const existing = await supabase
    .from("browser_jobs")
    .select(BROWSER_JOB_SELECT)
    .eq("approval_item_id", approvalItemId)
    .neq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing.data) return mapJob(existing.data as BrowserJobRow)

  const platform = item.platform ?? "unknown"
  const targetUrl = getPlatformPublishTarget(platform)
  const content = buildFullPostText({
    title: item.title,
    content: item.content_preview,
    campaignLinkUrl: item.campaign_link_url,
  })

  const { data, error } = await supabase
    .from("browser_jobs")
    .insert({
      approval_item_id: item.id,
      product_id: item.product_id,
      platform,
      status: "queued",
      target_url: targetUrl,
      title: item.title,
      content,
      campaign_link_url: item.campaign_link_url,
      disclosure_present: item.disclosure_present,
    })
    .select(BROWSER_JOB_SELECT)
    .single()

  if (error) throw new Error(`Failed to queue browser job: ${error.message}`)

  const job = mapJob(data as BrowserJobRow)
  await recordBrowserEvent({
    browserJobId: job.id,
    eventType: "queued",
    message: `Queued ${platform} publish job.`,
  })
  return job
}

export async function queueApprovedCampaignForProduct(productId: string): Promise<{
  queued: number
  skippedPublished: number
  waitingApproval: number
  blocked: string[]
}> {
  const supabase = getServiceRoleSupabase()
  const blocked: string[] = []

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, affiliate_url, status")
    .eq("id", productId)
    .single()

  if (productError || !product) throw new Error("Product was not found.")
  if (!product.affiliate_url?.trim()) blocked.push("Product has no affiliate URL.")

  const { data: readyPrograms, error: programError } = await supabase
    .from("affiliate_programs")
    .select("id")
    .eq("product_id", productId)
    .eq("status", "link_ready")
    .not("affiliate_link", "is", null)

  if (programError) throw new Error(`Failed to check affiliate program status: ${programError.message}`)
  if (!readyPrograms?.length) blocked.push("No link_ready affiliate program with a real affiliate link.")

  const { data: approvals, error: approvalsError } = await supabase
    .from("approval_items")
    .select("id, status, platform, content_preview, campaign_link_url, disclosure_present, approval_type")
    .eq("product_id", productId)
    .like("approval_type", "publish_%")

  if (approvalsError) throw new Error(`Failed to check campaign approvals: ${approvalsError.message}`)

  const publishApprovals = approvals ?? []
  const approvedItems = publishApprovals.filter((item) => item.status === "approved")
  const waitingApproval = publishApprovals.filter((item) => item.status === "waiting_approval").length
  const skippedPublished = publishApprovals.filter((item) => item.status === "published").length

  if (!approvedItems.length) blocked.push("No approved posts are ready for this campaign.")

  for (const item of approvedItems) {
    if (!item.content_preview?.trim()) blocked.push(`${item.platform}: missing content.`)
    if (!item.campaign_link_url?.trim()) blocked.push(`${item.platform}: missing campaign link.`)
    if (!item.disclosure_present) blocked.push(`${item.platform}: missing disclosure.`)
  }

  if (blocked.length) {
    return { queued: 0, skippedPublished, waitingApproval, blocked }
  }

  let queued = 0
  for (const item of approvedItems) {
    await createBrowserJobForApprovalItem(item.id)
    queued += 1
  }

  await recordBrowserEvent({
    eventType: "campaign_queued",
    message: `Queued ${queued} approved posts for ${product.name}.`,
    metadata: { productId, waitingApproval, skippedPublished },
  })

  return { queued, skippedPublished, waitingApproval, blocked: [] }
}

export async function getNextQueuedBrowserJob(): Promise<BrowserJob | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("browser_jobs")
    .select(BROWSER_JOB_SELECT)
    .in("status", ["queued", "opened", "filled", "waiting_user"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return mapJob(data as BrowserJobRow)
}

export async function updateBrowserJobFromHelper(input: {
  jobId: string
  status: BrowserJobStatus
  browserSessionId?: string | null
  activeTabUrl?: string | null
  blockerReason?: string | null
  errorMessage?: string | null
  postUrl?: string | null
  message?: string | null
}): Promise<BrowserJob> {
  if (!VALID_BROWSER_JOB_STATUSES.includes(input.status)) {
    throw new Error("Invalid browser job status.")
  }

  const supabase = getServiceRoleSupabase()
  const { data: current, error: currentError } = await supabase
    .from("browser_jobs")
    .select(BROWSER_JOB_SELECT)
    .eq("id", input.jobId)
    .single()

  if (currentError || !current) throw new Error("Browser job was not found.")

  const currentJob = mapJob(current as BrowserJobRow)
  const payload: Record<string, unknown> = {
    status: input.status,
    browser_session_id: input.browserSessionId ?? currentJob.browserSessionId,
    blocker_reason: input.blockerReason ?? null,
    error_message: input.errorMessage ?? null,
  }

  if (input.status === "published") {
    const postUrl = input.postUrl?.trim()
    if (!postUrl || !isValidPublishedPostUrl(postUrl, currentJob.platform)) {
      throw new Error("A real published post URL on the expected platform is required.")
    }
    payload.post_url = postUrl
  }

  const { data, error } = await supabase
    .from("browser_jobs")
    .update(payload)
    .eq("id", input.jobId)
    .select(BROWSER_JOB_SELECT)
    .single()

  if (error) throw new Error(`Failed to update browser job: ${error.message}`)

  const job = mapJob(data as BrowserJobRow)
  await recordBrowserEvent({
    browserJobId: job.id,
    browserSessionId: input.browserSessionId,
    eventType: input.status,
    message: input.message ?? `Browser job marked ${input.status}.`,
    metadata: {
      activeTabUrl: input.activeTabUrl ?? null,
      postUrl: input.postUrl ?? null,
      blockerReason: input.blockerReason ?? null,
    },
  })

  if (input.status === "published" && job.postUrl) {
    await supabase
      .from("approval_items")
      .update({
        status: "published",
        operator_notes: `Published through browser helper. Post URL: ${job.postUrl}`,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", job.approvalItemId)
  }

  return job
}

export async function markApprovalItemPublishedManually(input: {
  approvalItemId: string
  postUrl: string
}): Promise<void> {
  const supabase = getServiceRoleSupabase()
  const { data: item, error } = await supabase
    .from("approval_items")
    .select("id, platform, status")
    .eq("id", input.approvalItemId)
    .single()

  if (error || !item) throw new Error("Approval item was not found.")
  if (item.status !== "approved") throw new Error("Only approved items can be marked published.")
  if (!isValidPublishedPostUrl(input.postUrl, item.platform)) {
    throw new Error("A real post URL on the expected platform is required.")
  }

  await supabase
    .from("approval_items")
    .update({
      status: "published",
      operator_notes: `Published manually. Post URL: ${input.postUrl}`,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", input.approvalItemId)

  const { data: job } = await supabase
    .from("browser_jobs")
    .select(BROWSER_JOB_SELECT)
    .eq("approval_item_id", input.approvalItemId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (job) {
    await updateBrowserJobFromHelper({
      jobId: job.id,
      status: "published",
      postUrl: input.postUrl,
      message: "Published URL entered manually.",
    })
  }
}
