import "server-only"

import {
  buildCampaignQualityChecks,
  buildPlatformBody,
  getFirstBlockingReason,
  hashCampaignContent,
} from "@/lib/campaign-workflow"
import { CAMPAIGN_PLATFORMS } from "@/lib/platform-policy"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import type {
  CampaignApprovalRecord,
  CampaignPlatform,
  CampaignWorkflowProduct,
  PlatformAdaptation,
  PublishedRecord,
  SourceContent,
} from "@/types/campaign-workflow"

type ProductRow = {
  id: string
  name: string
  status: string
  affiliate_link?: string | null
  affiliate_url: string | null
  target_keyword: string | null
}

async function selectProductsForCampaignWorkflow(
  supabase: ReturnType<typeof getServiceRoleSupabase>,
): Promise<ProductRow[]> {
  const withAffiliateLink = await supabase
    .from("products")
    .select("id, name, status, affiliate_link, affiliate_url, target_keyword")
    .order("created_at", { ascending: false })

  if (!withAffiliateLink.error) return (withAffiliateLink.data ?? []) as ProductRow[]

  if (!withAffiliateLink.error.message.includes("affiliate_link")) {
    throw new Error(`Campaign workflow migration is required: ${withAffiliateLink.error.message}`)
  }

  const withoutAffiliateLink = await supabase
    .from("products")
    .select("id, name, status, affiliate_url, target_keyword")
    .order("created_at", { ascending: false })

  if (withoutAffiliateLink.error) {
    throw new Error(`Unable to load products: ${withoutAffiliateLink.error.message}`)
  }

  return ((withoutAffiliateLink.data ?? []) as Omit<ProductRow, "affiliate_link">[]).map((product) => ({
    ...product,
    affiliate_link: null,
  }))
}

async function selectProductAffiliateInfo(
  supabase: ReturnType<typeof getServiceRoleSupabase>,
  productId: string,
): Promise<{ name: string; affiliate_link: string | null; affiliate_url: string | null }> {
  const withAffiliateLink = await supabase
    .from("products")
    .select("name, affiliate_link, affiliate_url")
    .eq("id", productId)
    .single()

  if (!withAffiliateLink.error) {
    return withAffiliateLink.data as { name: string; affiliate_link: string | null; affiliate_url: string | null }
  }

  if (!withAffiliateLink.error.message.includes("affiliate_link")) {
    throw new Error(`Unable to load product affiliate info: ${withAffiliateLink.error.message}`)
  }

  const withoutAffiliateLink = await supabase
    .from("products")
    .select("name, affiliate_url")
    .eq("id", productId)
    .single()

  if (withoutAffiliateLink.error || !withoutAffiliateLink.data) {
    throw new Error(`Unable to load product affiliate info: ${withoutAffiliateLink.error?.message ?? "not found"}`)
  }

  return {
    name: withoutAffiliateLink.data.name,
    affiliate_link: null,
    affiliate_url: withoutAffiliateLink.data.affiliate_url,
  }
}

type SourceContentRow = {
  id: string
  product_id: string
  campaign_name: string
  angle: string | null
  title: string
  body: string
  target_keyword: string | null
  content_hash: string
  status: "active" | "archived"
  quality_checks: Record<string, unknown>
  created_at: string
  updated_at: string
}

type PlatformAdaptationRow = {
  id: string
  source_content_id: string
  product_id: string
  platform: CampaignPlatform
  title: string
  body: string
  campaign_link_id: string | null
  campaign_link_url: string | null
  content_hash: string
  quality_checks: PlatformAdaptation["qualityChecks"]
  auto_quality_status: PlatformAdaptation["autoQualityStatus"]
  blocking_reason: string | null
  policy_check_status: PlatformAdaptation["policyCheckStatus"]
  policy_checked_at: string | null
  policy_source_url: string | null
  policy_notes: string | null
  publish_mode: PlatformAdaptation["publishMode"]
  manual_fallback_required: boolean
  output_verification_required: boolean
  campaign_approval_status: PlatformAdaptation["campaignApprovalStatus"]
  created_at: string
  updated_at: string
}

type CampaignApprovalRow = {
  id: string
  product_id: string
  source_content_id: string
  status: CampaignApprovalRecord["status"]
  approved_platforms: CampaignPlatform[]
  excluded_platforms: Record<string, string>
  approved_by: string | null
  approval_notes: string | null
  approved_at: string
  created_at: string
  updated_at: string
}

type PublishedRecordRow = {
  id: string
  product_id: string
  source_content_id: string
  platform_adaptation_id: string
  browser_job_id: string | null
  platform: CampaignPlatform
  live_url: string
  verification_status: "verified" | "failed"
  verified_at: string
  created_at: string
  updated_at: string
}

type ApprovedDraftRow = {
  id: string
  title: string | null
  body: string | null
  target_keyword: string | null
  template_type: string | null
  quality_checks: Record<string, unknown> | null
  updated_at: string
}

const CANONICAL_DRAFT_TEMPLATE_PRIORITY: Record<string, number> = {
  review: 0,
  comparison: 1,
  buying_guide: 2,
  reddit_post: 3,
  quora_answer: 4,
  social_post: 5,
  tiktok_script: 6,
}

function compareApprovedDraftsForSource(a: ApprovedDraftRow, b: ApprovedDraftRow) {
  const aPriority = CANONICAL_DRAFT_TEMPLATE_PRIORITY[a.template_type ?? ""] ?? 99
  const bPriority = CANONICAL_DRAFT_TEMPLATE_PRIORITY[b.template_type ?? ""] ?? 99

  if (aPriority !== bPriority) return aPriority - bPriority
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
}

function mapSource(row: SourceContentRow, productName?: string | null): SourceContent {
  return {
    id: row.id,
    productId: row.product_id,
    productName: productName ?? null,
    campaignName: row.campaign_name,
    angle: row.angle,
    title: row.title,
    body: row.body,
    targetKeyword: row.target_keyword,
    contentHash: row.content_hash,
    status: row.status,
    qualityChecks: row.quality_checks ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapAdaptation(row: PlatformAdaptationRow, productName?: string | null): PlatformAdaptation {
  return {
    id: row.id,
    sourceContentId: row.source_content_id,
    productId: row.product_id,
    productName: productName ?? null,
    platform: row.platform,
    title: row.title,
    body: row.body,
    campaignLinkId: row.campaign_link_id,
    campaignLinkUrl: row.campaign_link_url,
    contentHash: row.content_hash,
    qualityChecks: row.quality_checks,
    autoQualityStatus: row.auto_quality_status,
    blockingReason: row.blocking_reason,
    policyCheckStatus: row.policy_check_status,
    policyCheckedAt: row.policy_checked_at,
    policySourceUrl: row.policy_source_url,
    policyNotes: row.policy_notes,
    publishMode: row.publish_mode,
    manualFallbackRequired: row.manual_fallback_required,
    outputVerificationRequired: row.output_verification_required,
    campaignApprovalStatus: row.campaign_approval_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapApproval(row: CampaignApprovalRow): CampaignApprovalRecord {
  return {
    id: row.id,
    productId: row.product_id,
    sourceContentId: row.source_content_id,
    status: row.status,
    approvedPlatforms: row.approved_platforms ?? [],
    excludedPlatforms: row.excluded_platforms ?? {},
    approvedBy: row.approved_by,
    approvalNotes: row.approval_notes,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function isEligibleForCampaignApproval(row: PlatformAdaptationRow) {
  return (
    row.auto_quality_status === "auto_quality_passed" &&
    row.policy_check_status === "allowed" &&
    row.campaign_approval_status !== "campaign_approved"
  )
}

function buildExcludedPlatforms(rows: PlatformAdaptationRow[], eligible: PlatformAdaptationRow[]) {
  const eligibleIds = new Set(eligible.map((row) => row.id))

  return Object.fromEntries(
    rows
      .filter((row) => !eligibleIds.has(row.id))
      .map((row) => [row.platform, row.blocking_reason ?? row.policy_check_status]),
  )
}

function uniqueCampaignPlatforms(platforms: CampaignPlatform[]) {
  return [...new Set(platforms)]
}

function mapPublished(row: PublishedRecordRow): PublishedRecord {
  return {
    id: row.id,
    productId: row.product_id,
    sourceContentId: row.source_content_id,
    platformAdaptationId: row.platform_adaptation_id,
    browserJobId: row.browser_job_id,
    platform: row.platform,
    liveUrl: row.live_url,
    verificationStatus: row.verification_status,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getCampaignWorkflowProducts(): Promise<CampaignWorkflowProduct[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()

  const allProductRows = await selectProductsForCampaignWorkflow(supabase)
  if (!allProductRows.length) return []

  const allProductIds = allProductRows.map((product) => product.id)
  const programsResult = await supabase
    .from("affiliate_programs")
    .select("product_id, status, affiliate_link")
    .in("product_id", allProductIds)

  if (programsResult.error) throw new Error(`Unable to load affiliate programs: ${programsResult.error.message}`)

  const programRows = (programsResult.data ?? []) as Array<{
    product_id: string
    status: string
    affiliate_link: string | null
  }>

  const productRows = allProductRows
    .filter((product) => {
      const hasLinkReadyProgram = programRows.some(
        (program) =>
          program.product_id === product.id &&
          program.status === "link_ready" &&
          Boolean(program.affiliate_link?.trim()),
      )

      return product.status === "active" || hasLinkReadyProgram
    })
    .sort((a, b) => {
      const aReady = programRows.some((program) => program.product_id === a.id && program.status === "link_ready")
      const bReady = programRows.some((program) => program.product_id === b.id && program.status === "link_ready")
      if (aReady !== bReady) return aReady ? -1 : 1
      if (a.status === "active" && b.status !== "active") return -1
      if (a.status !== "active" && b.status === "active") return 1
      return a.name.localeCompare(b.name)
    })

  if (!productRows.length) return []

  const productIds = productRows.map((product) => product.id)
  const [sourcesResult, adaptationsResult, approvalsResult, publishedResult] = await Promise.all([
    supabase
      .from("source_contents")
      .select("*")
      .in("product_id", productIds)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("platform_adaptations")
      .select("*")
      .in("product_id", productIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("campaign_approvals")
      .select("*")
      .in("product_id", productIds)
      .order("approved_at", { ascending: false }),
    supabase
      .from("published_records")
      .select("*")
      .in("product_id", productIds)
      .order("created_at", { ascending: false }),
  ])

  for (const result of [sourcesResult, adaptationsResult, approvalsResult, publishedResult]) {
    if (result.error) throw new Error(`Campaign workflow migration is required: ${result.error.message}`)
  }

  return productRows.map((product) => {
    const programAffiliateLink = programRows.find(
      (program) =>
        program.product_id === product.id &&
        program.status === "link_ready" &&
        Boolean(program.affiliate_link?.trim()),
    )?.affiliate_link
    const affiliateLink = product.affiliate_link ?? programAffiliateLink ?? product.affiliate_url ?? null
    const source = ((sourcesResult.data ?? []) as SourceContentRow[]).find((row) => row.product_id === product.id)
    const sourceContent = source ? mapSource(source, product.name) : null
    const adaptations = ((adaptationsResult.data ?? []) as PlatformAdaptationRow[])
      .filter((row) => row.product_id === product.id && (!sourceContent || row.source_content_id === sourceContent.id))
      .map((row) => mapAdaptation(row, product.name))
    const approvedCampaign = ((approvalsResult.data ?? []) as CampaignApprovalRow[])
      .filter((row) =>
        row.status === "approved" &&
        row.product_id === product.id &&
        (!sourceContent || row.source_content_id === sourceContent.id),
      )
      .map(mapApproval)[0] ?? null
    const publishedRecords = ((publishedResult.data ?? []) as PublishedRecordRow[])
      .filter((row) => row.product_id === product.id)
      .map(mapPublished)
    const hasLinkReadyProgram = programRows
      .some((program) => program.product_id === product.id && program.status === "link_ready" && Boolean(program.affiliate_link?.trim()))

    const blockers: string[] = []
    if (!affiliateLink?.trim()) blockers.push("missing_real_affiliate_link")
    if (!hasLinkReadyProgram) blockers.push("no_link_ready_affiliate_program")
    if (!sourceContent) blockers.push("missing_source_content")

    const eligiblePlatforms = adaptations
      .filter((adaptation) =>
        adaptation.autoQualityStatus === "auto_quality_passed" &&
        adaptation.policyCheckStatus === "allowed" &&
        adaptation.campaignApprovalStatus !== "campaign_approved",
      )
      .map((adaptation) => adaptation.platform)

    return {
      productId: product.id,
      productName: product.name,
      productStatus: product.status,
      affiliateLink,
      hasLinkReadyProgram,
      sourceContent,
      adaptations,
      approvedCampaign,
      publishedRecords,
      blockers,
      eligiblePlatforms,
    }
  })
}

export async function createSourceContentFromLatestApprovedDraft(productId: string): Promise<SourceContent> {
  const supabase = getServiceRoleSupabase()
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, content_angle")
    .eq("id", productId)
    .single()

  if (productError || !product) throw new Error("Product was not found.")

  const { data: draft, error: draftError } = await supabase
    .from("content_drafts")
    .select("id, title, body, target_keyword, template_type, quality_checks, updated_at")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("updated_at", { ascending: false })
    .limit(20)

  if (draftError) throw new Error(`Unable to load approved draft: ${draftError.message}`)
  const approvedDraft = ((draft ?? []) as ApprovedDraftRow[])
    .filter((candidate) => Boolean(candidate.body?.trim()))
    .sort(compareApprovedDraftsForSource)[0]

  if (!approvedDraft?.body?.trim()) throw new Error("No approved draft exists for this product.")

  const title = approvedDraft.title?.trim() || `${product.name} campaign`
  const contentHash = hashCampaignContent([productId, title, approvedDraft.body, approvedDraft.target_keyword])
  // The live source_contents schema intentionally has no source_draft_id column yet.
  // Preserve traceability in quality_checks so the canonical source can be audited without a schema change.
  const qualityChecks = {
    ...(approvedDraft.quality_checks ?? {}),
    sourceDraftId: approvedDraft.id,
    sourceDraftTemplateType: approvedDraft.template_type,
  }

  const { data, error } = await supabase
    .from("source_contents")
    .upsert({
      product_id: productId,
      campaign_name: `${product.name} campaign`,
      angle: product.content_angle ?? null,
      title,
      body: approvedDraft.body,
      target_keyword: approvedDraft.target_keyword ?? null,
      content_hash: contentHash,
      quality_checks: qualityChecks,
      status: "active",
    }, { onConflict: "product_id,content_hash" })
    .select("*")
    .single()

  if (error) throw new Error(`Unable to create source content: ${error.message}`)
  return mapSource(data as SourceContentRow, product.name)
}

export async function syncPlatformAdaptations(sourceContentId: string): Promise<PlatformAdaptation[]> {
  const supabase = getServiceRoleSupabase()
  const { data: source, error: sourceError } = await supabase
    .from("source_contents")
    .select("*")
    .eq("id", sourceContentId)
    .single()

  if (sourceError || !source) throw new Error("Source content was not found.")

  const sourceRow = source as SourceContentRow
  const product = await selectProductAffiliateInfo(supabase, sourceRow.product_id)
  const affiliateLink = product.affiliate_link ?? product.affiliate_url ?? null

  const { data: links, error: linksError } = await supabase
    .from("campaign_links")
    .select("id, channel, final_url")
    .eq("product_id", sourceRow.product_id)
    .eq("status", "active")

  if (linksError) throw new Error(`Unable to load campaign links: ${linksError.message}`)

  const rows = CAMPAIGN_PLATFORMS.map((platform) => {
    const link = (links ?? []).find((candidate) => candidate.channel?.toLowerCase() === platform)
    const campaignLinkUrl = link?.final_url ?? affiliateLink
    const body = buildPlatformBody({
      platform,
      sourceBody: sourceRow.body,
      campaignLinkUrl,
      affiliateLink,
    })
    const { quality, policy } = buildCampaignQualityChecks({
      platform,
      title: sourceRow.title,
      body,
      targetKeyword: sourceRow.target_keyword,
      affiliateLink,
      campaignLinkUrl,
    })
    const contentHash = hashCampaignContent([sourceRow.id, platform, sourceRow.title, body, campaignLinkUrl])

    return {
      source_content_id: sourceRow.id,
      product_id: sourceRow.product_id,
      platform,
      title: sourceRow.title,
      body,
      campaign_link_id: link?.id ?? null,
      campaign_link_url: campaignLinkUrl,
      content_hash: contentHash,
      quality_checks: quality,
      auto_quality_status: quality.passed ? "auto_quality_passed" : "blocked",
      blocking_reason: getFirstBlockingReason(quality, policy),
      policy_check_status: policy.status,
      policy_checked_at: new Date().toISOString(),
      policy_source_url: policy.sourceUrl,
      policy_notes: policy.notes,
      publish_mode: policy.publishMode,
      manual_fallback_required: policy.manualFallbackRequired,
      output_verification_required: policy.outputVerificationRequired,
      campaign_approval_status: quality.passed ? "not_requested" : "blocked",
    }
  })

  const { data, error } = await supabase
    .from("platform_adaptations")
    .upsert(rows, { onConflict: "source_content_id,platform,content_hash" })
    .select("*")

  if (error) throw new Error(`Unable to sync platform adaptations: ${error.message}`)
  return ((data ?? []) as PlatformAdaptationRow[]).map((row) => mapAdaptation(row, product.name))
}

export async function approveCampaign(sourceContentId: string): Promise<CampaignApprovalRecord> {
  const supabase = getServiceRoleSupabase()
  const { data: source, error: sourceError } = await supabase
    .from("source_contents")
    .select("id, product_id")
    .eq("id", sourceContentId)
    .single()

  if (sourceError || !source) throw new Error("Source content was not found.")

  const { data: adaptations, error: adaptationsError } = await supabase
    .from("platform_adaptations")
    .select("*")
    .eq("source_content_id", sourceContentId)

  if (adaptationsError) throw new Error(`Unable to load adaptations: ${adaptationsError.message}`)

  const rows = (adaptations ?? []) as PlatformAdaptationRow[]
  const eligible = rows.filter(isEligibleForCampaignApproval)
  const excluded = buildExcludedPlatforms(rows, eligible)

  const { data: existingApproval, error: existingApprovalError } = await supabase
    .from("campaign_approvals")
    .select("*")
    .eq("source_content_id", sourceContentId)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingApprovalError) {
    throw new Error(`Unable to load existing campaign approval: ${existingApprovalError.message}`)
  }

  if (!eligible.length) {
    if (existingApproval) return mapApproval(existingApproval as CampaignApprovalRow)

    throw new Error("No eligible platform adaptations are ready for campaign approval.")
  }

  const approvedPlatforms = uniqueCampaignPlatforms([
    ...(((existingApproval as CampaignApprovalRow | null)?.approved_platforms ?? []) as CampaignPlatform[]),
    ...eligible.map((row) => row.platform),
  ])
  const approvalPayload = {
    product_id: source.product_id,
    source_content_id: sourceContentId,
    status: "approved",
    approved_platforms: approvedPlatforms,
    excluded_platforms: excluded,
    approved_by: "MENI",
    approval_notes: "Single human campaign approval. Blocked platforms remain excluded.",
  }

  const approvalQuery = existingApproval
    ? supabase
        .from("campaign_approvals")
        .update(approvalPayload)
        .eq("id", (existingApproval as CampaignApprovalRow).id)
        .select("*")
        .single()
    : supabase
        .from("campaign_approvals")
        .insert(approvalPayload)
        .select("*")
        .single()

  const { data: approval, error } = await approvalQuery

  if (error) throw new Error(`Unable to approve campaign: ${error.message}`)

  const { error: updateError } = await supabase
    .from("platform_adaptations")
    .update({ campaign_approval_status: "campaign_approved" })
    .in("id", eligible.map((row) => row.id))

  if (updateError) throw new Error(`Unable to mark adaptations as campaign approved: ${updateError.message}`)

  return mapApproval(approval as CampaignApprovalRow)
}
