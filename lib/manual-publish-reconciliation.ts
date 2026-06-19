import "server-only"

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

import { isValidPublishedPostUrl } from "@/lib/browser-control"
import { getServiceRoleSupabase } from "@/lib/supabase/server"
import type { CampaignPlatform } from "@/types/campaign-workflow"

type SupabaseClient = ReturnType<typeof getServiceRoleSupabase>

type FinalCopyTraceRow = {
  id: string
  product_id: string
  source_content_id: string | null
  platform_adaptation_id: string | null
  platform: CampaignPlatform
  status: string
  media_asset_url: string | null
  updated_at: string
}

type PublishedRecordRow = {
  id: string
  product_id: string
  source_content_id: string | null
  platform_adaptation_id: string | null
  final_copy_id: string | null
  campaign_approval_id: string | null
  platform: CampaignPlatform
  live_url: string
  verification_status: "verified" | "failed"
  verified_at: string | null
  media_asset_url: string | null
  media_status: string | null
  needs_media_repair: boolean | null
}

type PublishJobRow = {
  id: string
}

type ScheduledQueueRow = {
  id: string
}

type ProductNameRow = {
  id: string
  name: string
}

const VERIFIED_MANUAL_URL_PLATFORMS = new Set<CampaignPlatform>([
  "linkedin",
  "medium",
  "substack",
  "reddit",
  "quora",
  "facebook_page",
  "instagram_professional",
])

const PUBLISHED_RECORD_SELECT =
  "id, product_id, source_content_id, platform_adaptation_id, final_copy_id, campaign_approval_id, platform, live_url, verification_status, verified_at, media_asset_url, media_status, needs_media_repair"

const FINAL_COPY_TRACE_SELECT =
  "id, product_id, source_content_id, platform_adaptation_id, platform, status, media_asset_url, updated_at"

function normalizeComparableText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function normalizeMarkdownFieldName(value: string) {
  return normalizeComparableText(value.replace(/[*`_]/g, ""))
}

function extractUuidHints(value: string) {
  return [...value.matchAll(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi)].map(
    (match) => match[0].toLowerCase(),
  )
}

function normalizeTruthyValue(value: string | null | undefined) {
  return normalizeComparableText(value).replace(/[.!?]$/g, "")
}

function parseMarkdownTableFields(section: string) {
  const fields: Record<string, string> = {}

  for (const rawLine of section.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line.startsWith("|")) continue
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim())

    if (cells.length < 2) continue
    if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) continue
    if (normalizeMarkdownFieldName(cells[0]) === "field" && normalizeMarkdownFieldName(cells[1]) === "value") {
      continue
    }

    fields[normalizeMarkdownFieldName(cells[0])] = cells[1]
  }

  return fields
}

function findFirstFieldValue(fields: Record<string, string>, names: string[]) {
  for (const name of names) {
    const value = fields[normalizeMarkdownFieldName(name)]
    if (value) return value.trim()
  }
  return null
}

export function normalizePublishLogPlatform(value: string | null | undefined): CampaignPlatform | null {
  const normalized = normalizeComparableText(value)

  if (normalized.includes("linkedin")) return "linkedin"
  if (normalized.includes("medium")) return "medium"
  if (normalized.includes("substack")) return "substack"
  if (normalized.includes("facebook")) return "facebook_page"
  if (normalized.includes("instagram")) return "instagram_professional"
  if (normalized === "reddit") return "reddit"
  if (normalized === "quora") return "quora"

  return null
}

export function supportsVerifiedManualPublishUrl(platform: string | null | undefined): platform is CampaignPlatform {
  if (!platform) return false
  return VERIFIED_MANUAL_URL_PLATFORMS.has(platform as CampaignPlatform)
}

export type ParsedPublishLogEntry = {
  sourceLabel: string
  platform: CampaignPlatform | null
  productName: string | null
  liveUrl: string | null
  published: boolean
  uuidHints: string[]
  fields: Record<string, string>
}

export function parsePublishLogMarkdown(markdown: string, sourceLabel: string): ParsedPublishLogEntry[] {
  const rawSections = markdown.split(/^## Publish Record:/m)
  const sections = (rawSections.length > 1 ? rawSections.slice(1) : rawSections)
    .map((section) => section.trim())
    .filter(Boolean)

  if (!sections.length) {
    return [
      {
        sourceLabel,
        platform: null,
        productName: null,
        liveUrl: null,
        published: false,
        uuidHints: extractUuidHints(markdown),
        fields: parseMarkdownTableFields(markdown),
      },
    ]
  }

  return sections.map((section, index) => {
    const fields = parseMarkdownTableFields(section)
    const platform = normalizePublishLogPlatform(findFirstFieldValue(fields, ["platform"]))
    const liveUrl = findFirstFieldValue(fields, ["post url", "article url", "published url", "url"])
    const publishedValue = findFirstFieldValue(fields, ["published"])

    return {
      sourceLabel: sections.length === 1 ? sourceLabel : `${sourceLabel}#${index + 1}`,
      platform,
      productName: findFirstFieldValue(fields, ["product"]),
      liveUrl,
      published: normalizeTruthyValue(publishedValue) === "yes",
      uuidHints: [...new Set(extractUuidHints(section))],
      fields,
    }
  })
}

export type PublishLogFinalCopyCandidate = {
  id: string
  sourceContentId: string | null
  platformAdaptationId: string | null
  status: string
  updatedAt: string | null
  existingVerifiedUrl: string | null
}

export function pickPublishLogFinalCopyCandidate(input: {
  liveUrl: string
  uuidHints: string[]
  candidates: PublishLogFinalCopyCandidate[]
}): { candidate: PublishLogFinalCopyCandidate; reason: string } | null {
  if (!input.candidates.length) return null

  const existingUrlMatch = input.candidates.find((candidate) => candidate.existingVerifiedUrl === input.liveUrl)
  if (existingUrlMatch) {
    return {
      candidate: existingUrlMatch,
      reason: "existing_verified_url_match",
    }
  }

  if (input.uuidHints.length > 0) {
    const hintMatches = input.candidates.filter((candidate) =>
      input.uuidHints.some(
        (hint) =>
          hint === candidate.id.toLowerCase() ||
          hint === candidate.sourceContentId?.toLowerCase() ||
          hint === candidate.platformAdaptationId?.toLowerCase(),
      ),
    )
    if (hintMatches.length === 1) {
      return {
        candidate: hintMatches[0],
        reason: "uuid_hint_match",
      }
    }
  }

  const withoutVerifiedUrl = input.candidates.filter((candidate) => !candidate.existingVerifiedUrl)
  if (withoutVerifiedUrl.length === 1) {
    return {
      candidate: withoutVerifiedUrl[0],
      reason: "single_unverified_candidate",
    }
  }

  const unpublishedCandidates = withoutVerifiedUrl.filter((candidate) => candidate.status !== "published_verified")
  if (unpublishedCandidates.length === 1) {
    return {
      candidate: unpublishedCandidates[0],
      reason: "single_unverified_nonpublished_candidate",
    }
  }

  if (input.candidates.length === 1) {
    return {
      candidate: input.candidates[0],
      reason: "single_candidate",
    }
  }

  return null
}

type PublishedRecordSyncResult = {
  publishedRecordId: string
  finalCopyId: string | null
  attachedFinalCopyId: string | null
  finalCopyUpdated: boolean
  publishJobUpdated: number
  queueUpdated: number
}

export type VerifiedManualPublishResult = {
  liveUrl: string
  publishedRecordId: string
  finalCopyId: string
  created: boolean
  sync: PublishedRecordSyncResult
}

export type PublishedRecordGapSyncSummary = {
  scanned: number
  attachedFinalCopies: number
  finalCopiesUpdated: number
  publishJobsUpdated: number
  queuesUpdated: number
}

export type ManualPublishReconciliationSummary = {
  logEntriesDiscovered: number
  importedCount: number
  alreadyRecordedCount: number
  skippedCount: number
  invalidCount: number
  sync: PublishedRecordGapSyncSummary
}

async function getLatestCampaignApprovalId(
  supabase: SupabaseClient,
  sourceContentId: string,
  platform: CampaignPlatform,
) {
  const { data, error } = await supabase
    .from("campaign_approvals")
    .select("id")
    .eq("source_content_id", sourceContentId)
    .eq("status", "approved")
    .contains("approved_platforms", [platform])
    .order("approved_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to load campaign approval for manual publish: ${error.message}`)
  }

  return (data as { id: string } | null)?.id ?? null
}

async function getManualPublishFinalCopy(finalCopyId: string) {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("final_copies")
    .select(FINAL_COPY_TRACE_SELECT)
    .eq("id", finalCopyId)
    .single()

  if (error || !data) {
    throw new Error("Final copy was not found.")
  }

  const finalCopy = data as FinalCopyTraceRow
  if (!["operator_approved", "ready_for_manual_publish", "published_verified"].includes(finalCopy.status)) {
    throw new Error("Only operator-approved or already-published final copies can be reconciled manually.")
  }
  if (!supportsVerifiedManualPublishUrl(finalCopy.platform)) {
    throw new Error("Manual publish verification is not enabled for this platform yet.")
  }
  if (!finalCopy.source_content_id || !finalCopy.platform_adaptation_id) {
    throw new Error("Final copy is missing source/adaptation traceability.")
  }

  return finalCopy
}

async function attachPublishedRecordToFinalCopyIfMissing(
  supabase: SupabaseClient,
  row: PublishedRecordRow,
): Promise<{ record: PublishedRecordRow; attachedFinalCopyId: string | null }> {
  if (row.final_copy_id) {
    return {
      record: row,
      attachedFinalCopyId: null,
    }
  }

  if (!row.source_content_id || !row.platform_adaptation_id) {
    return {
      record: row,
      attachedFinalCopyId: null,
    }
  }

  const { data: finalCopies, error } = await supabase
    .from("final_copies")
    .select("id")
    .eq("source_content_id", row.source_content_id)
    .eq("platform_adaptation_id", row.platform_adaptation_id)
    .limit(2)

  if (error) {
    throw new Error(`Unable to attach published record to final copy: ${error.message}`)
  }

  if ((finalCopies ?? []).length !== 1) {
    return {
      record: row,
      attachedFinalCopyId: null,
    }
  }

  const finalCopyId = (finalCopies?.[0] as { id: string }).id
  const { data: updated, error: updateError } = await supabase
    .from("published_records")
    .update({ final_copy_id: finalCopyId })
    .eq("id", row.id)
    .select(PUBLISHED_RECORD_SELECT)
    .single()

  if (updateError || !updated) {
    throw new Error(`Unable to save final copy link on published record: ${updateError?.message ?? "unknown_error"}`)
  }

  return {
    record: updated as PublishedRecordRow,
    attachedFinalCopyId: finalCopyId,
  }
}

async function syncPublishedRecordState(
  supabase: SupabaseClient,
  record: PublishedRecordRow,
): Promise<PublishedRecordSyncResult> {
  const attached = await attachPublishedRecordToFinalCopyIfMissing(supabase, record)
  const nextRecord = attached.record
  const verifiedAt = nextRecord.verified_at ?? new Date().toISOString()

  let finalCopyUpdated = false
  let publishJobUpdated = 0
  let queueUpdated = 0

  if (nextRecord.final_copy_id) {
    const { data: updatedFinalCopies, error: finalCopyError } = await supabase
      .from("final_copies")
      .update({ status: "published_verified" })
      .eq("id", nextRecord.final_copy_id)
      .neq("status", "published_verified")
      .select("id")

    if (finalCopyError) {
      throw new Error(`Unable to sync final copy from published record: ${finalCopyError.message}`)
    }

    finalCopyUpdated = (updatedFinalCopies ?? []).length > 0

    const { data: updatedJobs, error: publishJobError } = await supabase
      .from("publish_jobs")
      .update({
        status: "verified",
        live_url: nextRecord.live_url,
        verified_at: verifiedAt,
        blocking_reason: null,
      })
      .eq("final_copy_id", nextRecord.final_copy_id)
      .neq("status", "verified")
      .select("id")

    if (publishJobError) {
      throw new Error(`Unable to sync publish job from published record: ${publishJobError.message}`)
    }

    publishJobUpdated = ((updatedJobs ?? []) as PublishJobRow[]).length

    const { data: updatedQueue, error: queueError } = await supabase
      .from("scheduled_publish_queue")
      .update({
        status: "published",
        published_record_id: nextRecord.id,
        last_error: null,
      })
      .eq("final_copy_id", nextRecord.final_copy_id)
      .neq("status", "published")
      .select("id")

    if (queueError) {
      throw new Error(`Unable to sync scheduled publish queue from published record: ${queueError.message}`)
    }

    queueUpdated = ((updatedQueue ?? []) as ScheduledQueueRow[]).length
  }

  return {
    publishedRecordId: nextRecord.id,
    finalCopyId: nextRecord.final_copy_id,
    attachedFinalCopyId: attached.attachedFinalCopyId,
    finalCopyUpdated,
    publishJobUpdated,
    queueUpdated,
  }
}

async function loadPublishLogEntriesFromDocs() {
  const docsDir = path.join(process.cwd(), "docs")
  const files = await readdir(docsDir)
  const logFiles = files
    .filter((file) => file.endsWith(".md"))
    .filter((file) => file.includes("PUBLISH_LOG"))
    .filter((file) => !file.includes("TEMPLATE"))
    .sort()

  const entries: ParsedPublishLogEntry[] = []
  for (const file of logFiles) {
    const markdown = await readFile(path.join(docsDir, file), "utf8")
    entries.push(...parsePublishLogMarkdown(markdown, file))
  }

  return entries
}

async function findProductByName(supabase: SupabaseClient, productName: string) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name")
    .ilike("name", productName)
    .limit(5)

  if (error) {
    throw new Error(`Unable to resolve publish log product: ${error.message}`)
  }

  const exactMatches = ((data ?? []) as ProductNameRow[]).filter(
    (candidate) => normalizeComparableText(candidate.name) === normalizeComparableText(productName),
  )

  return exactMatches.length === 1 ? exactMatches[0] : null
}

async function loadFinalCopyCandidatesForPublishLog(
  supabase: SupabaseClient,
  productId: string,
  platform: CampaignPlatform,
): Promise<PublishLogFinalCopyCandidate[]> {
  const { data: finalCopies, error } = await supabase
    .from("final_copies")
    .select("id, source_content_id, platform_adaptation_id, status, updated_at")
    .eq("product_id", productId)
    .eq("platform", platform)
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(`Unable to load final copy candidates for publish log: ${error.message}`)
  }

  const rows = (finalCopies ?? []) as Array<{
    id: string
    source_content_id: string | null
    platform_adaptation_id: string | null
    status: string
    updated_at: string | null
  }>
  if (!rows.length) return []

  const { data: publishedRecords, error: publishedRecordError } = await supabase
    .from("published_records")
    .select("final_copy_id, live_url")
    .in("final_copy_id", rows.map((row) => row.id))
    .eq("verification_status", "verified")
    .not("live_url", "is", null)
    .neq("live_url", "")

  if (publishedRecordError) {
    throw new Error(`Unable to load existing published records for publish log matching: ${publishedRecordError.message}`)
  }

  const verifiedUrlByFinalCopyId = new Map<string, string>()
  for (const row of (publishedRecords ?? []) as Array<{ final_copy_id: string | null; live_url: string }>) {
    if (row.final_copy_id && !verifiedUrlByFinalCopyId.has(row.final_copy_id)) {
      verifiedUrlByFinalCopyId.set(row.final_copy_id, row.live_url)
    }
  }

  return rows.map((row) => ({
    id: row.id,
    sourceContentId: row.source_content_id,
    platformAdaptationId: row.platform_adaptation_id,
    status: row.status,
    updatedAt: row.updated_at,
    existingVerifiedUrl: verifiedUrlByFinalCopyId.get(row.id) ?? null,
  }))
}

export async function recordVerifiedManualPublishForFinalCopy(input: {
  finalCopyId: string
  liveUrl: string
}): Promise<VerifiedManualPublishResult> {
  const liveUrl = input.liveUrl.trim()
  if (!liveUrl) {
    throw new Error("A real published URL is required.")
  }

  const finalCopy = await getManualPublishFinalCopy(input.finalCopyId)
  if (!isValidPublishedPostUrl(liveUrl, finalCopy.platform)) {
    throw new Error("A real post URL on the expected platform is required.")
  }

  const supabase = getServiceRoleSupabase()

  const { data: existingByFinalCopy, error: existingByFinalCopyError } = await supabase
    .from("published_records")
    .select(PUBLISHED_RECORD_SELECT)
    .eq("final_copy_id", finalCopy.id)
    .eq("verification_status", "verified")
    .limit(1)
    .maybeSingle()

  if (existingByFinalCopyError) {
    throw new Error(`Unable to check existing published record: ${existingByFinalCopyError.message}`)
  }

  if (existingByFinalCopy) {
    const existing = existingByFinalCopy as PublishedRecordRow
    if (existing.live_url !== liveUrl) {
      throw new Error("This final copy already has a different verified live URL.")
    }

    const sync = await syncPublishedRecordState(supabase, existing)
    return {
      liveUrl,
      publishedRecordId: existing.id,
      finalCopyId: finalCopy.id,
      created: false,
      sync,
    }
  }

  const { data: existingByUrl, error: existingByUrlError } = await supabase
    .from("published_records")
    .select(PUBLISHED_RECORD_SELECT)
    .eq("platform", finalCopy.platform)
    .eq("live_url", liveUrl)
    .limit(1)
    .maybeSingle()

  if (existingByUrlError) {
    throw new Error(`Unable to check existing published URL: ${existingByUrlError.message}`)
  }

  const approvalId = await getLatestCampaignApprovalId(
    supabase,
    finalCopy.source_content_id ?? "",
    finalCopy.platform,
  )

  if (existingByUrl) {
    const existing = existingByUrl as PublishedRecordRow
    if (existing.final_copy_id && existing.final_copy_id !== finalCopy.id) {
      throw new Error("This live URL is already attached to a different final copy.")
    }

    const { data: updated, error: updateError } = await supabase
      .from("published_records")
      .update({
        product_id: finalCopy.product_id,
        source_content_id: finalCopy.source_content_id,
        platform_adaptation_id: finalCopy.platform_adaptation_id,
        final_copy_id: finalCopy.id,
        campaign_approval_id: existing.campaign_approval_id ?? approvalId,
        verification_status: "verified",
        verified_at: existing.verified_at ?? new Date().toISOString(),
        media_asset_url: existing.media_asset_url ?? finalCopy.media_asset_url,
        media_status: existing.media_status ?? (finalCopy.media_asset_url ? "ready" : "not_required"),
        needs_media_repair: false,
      })
      .eq("id", existing.id)
      .select(PUBLISHED_RECORD_SELECT)
      .single()

    if (updateError || !updated) {
      throw new Error(`Unable to update existing published record: ${updateError?.message ?? "unknown_error"}`)
    }

    const sync = await syncPublishedRecordState(supabase, updated as PublishedRecordRow)
    return {
      liveUrl,
      publishedRecordId: (updated as PublishedRecordRow).id,
      finalCopyId: finalCopy.id,
      created: false,
      sync,
    }
  }

  const { data: created, error: insertError } = await supabase
    .from("published_records")
    .insert({
      product_id: finalCopy.product_id,
      source_content_id: finalCopy.source_content_id,
      platform_adaptation_id: finalCopy.platform_adaptation_id,
      final_copy_id: finalCopy.id,
      campaign_approval_id: approvalId,
      platform: finalCopy.platform,
      live_url: liveUrl,
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      media_asset_url: finalCopy.media_asset_url,
      media_status: finalCopy.media_asset_url ? "ready" : "not_required",
      needs_media_repair: false,
    })
    .select(PUBLISHED_RECORD_SELECT)
    .single()

  if (insertError || !created) {
    throw new Error(`Unable to create published record: ${insertError?.message ?? "unknown_error"}`)
  }

  const sync = await syncPublishedRecordState(supabase, created as PublishedRecordRow)
  return {
    liveUrl,
    publishedRecordId: (created as PublishedRecordRow).id,
    finalCopyId: finalCopy.id,
    created: true,
    sync,
  }
}

export async function recordVerifiedManualPublishForJob(input: {
  jobId: string
  liveUrl: string
}): Promise<VerifiedManualPublishResult> {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("publish_jobs")
    .select("id, final_copy_id")
    .eq("id", input.jobId)
    .single()

  if (error || !data) {
    throw new Error("Publish job was not found.")
  }

  return recordVerifiedManualPublishForFinalCopy({
    finalCopyId: (data as { id: string; final_copy_id: string }).final_copy_id,
    liveUrl: input.liveUrl,
  })
}

export async function syncVerifiedPublishedRecordGaps(): Promise<PublishedRecordGapSyncSummary> {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("published_records")
    .select(PUBLISHED_RECORD_SELECT)
    .eq("verification_status", "verified")
    .not("live_url", "is", null)
    .neq("live_url", "")
    .order("verified_at", { ascending: false })

  if (error) {
    throw new Error(`Unable to load published records for reconciliation: ${error.message}`)
  }

  let attachedFinalCopies = 0
  let finalCopiesUpdated = 0
  let publishJobsUpdated = 0
  let queuesUpdated = 0

  for (const row of (data ?? []) as PublishedRecordRow[]) {
    const sync = await syncPublishedRecordState(supabase, row)
    if (sync.attachedFinalCopyId) attachedFinalCopies += 1
    if (sync.finalCopyUpdated) finalCopiesUpdated += 1
    publishJobsUpdated += sync.publishJobUpdated
    queuesUpdated += sync.queueUpdated
  }

  return {
    scanned: (data ?? []).length,
    attachedFinalCopies,
    finalCopiesUpdated,
    publishJobsUpdated,
    queuesUpdated,
  }
}

export async function importPublishLogsAndReconcileGaps(): Promise<ManualPublishReconciliationSummary> {
  const supabase = getServiceRoleSupabase()
  const entries = await loadPublishLogEntriesFromDocs()

  let importedCount = 0
  let alreadyRecordedCount = 0
  let skippedCount = 0
  let invalidCount = 0

  for (const entry of entries) {
    if (!entry.published || !entry.platform || !entry.productName || !entry.liveUrl) {
      skippedCount += 1
      continue
    }

    if (!isValidPublishedPostUrl(entry.liveUrl, entry.platform)) {
      invalidCount += 1
      continue
    }

    const { data: existingByUrl, error: existingByUrlError } = await supabase
      .from("published_records")
      .select(PUBLISHED_RECORD_SELECT)
      .eq("platform", entry.platform)
      .eq("live_url", entry.liveUrl)
      .limit(1)
      .maybeSingle()

    if (existingByUrlError) {
      throw new Error(`Unable to check existing log URL in published records: ${existingByUrlError.message}`)
    }

    if (existingByUrl) {
      alreadyRecordedCount += 1
      await syncPublishedRecordState(supabase, existingByUrl as PublishedRecordRow)
      continue
    }

    const product = await findProductByName(supabase, entry.productName)
    if (!product) {
      skippedCount += 1
      continue
    }

    const candidates = await loadFinalCopyCandidatesForPublishLog(supabase, product.id, entry.platform)
    const picked = pickPublishLogFinalCopyCandidate({
      liveUrl: entry.liveUrl,
      uuidHints: entry.uuidHints,
      candidates,
    })

    if (!picked) {
      skippedCount += 1
      continue
    }

    await recordVerifiedManualPublishForFinalCopy({
      finalCopyId: picked.candidate.id,
      liveUrl: entry.liveUrl,
    })
    importedCount += 1
  }

  return {
    logEntriesDiscovered: entries.length,
    importedCount,
    alreadyRecordedCount,
    skippedCount,
    invalidCount,
    sync: await syncVerifiedPublishedRecordGaps(),
  }
}
