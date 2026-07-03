import "server-only"

import {
  buildProductApprovalWorkflowSummaries,
  type ApprovalWorkflowAffiliateProgramInput,
  type ApprovalWorkflowDraftInput,
  type ApprovalWorkflowFinalCopyInput,
  type ApprovalWorkflowProductInput,
} from "@/lib/draft-approval-workflow"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"

type ProductRow = {
  id: string
  name: string
  status: string
  affiliate_url: string | null
}

type DraftRow = {
  id: string
  product_id: string
}

type FinalCopyRow = {
  id: string
  product_id: string
  platform: string
  language: string | null
  status: string
  updated_at: string | null
}

type AffiliateProgramRow = {
  product_id: string | null
  status: string | null
  affiliate_link: string | null
}

export async function getDraftApprovalWorkflowProducts() {
  if (!isSupabaseConfigured()) return []

  const supabase = getServiceRoleSupabase()
  const [productsResult, draftsResult, finalCopiesResult, programsResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, status, affiliate_url")
      // include suspended so they stay visible in the work list (greyed + toggleable)
      .in("status", ["active", "suspended"])
      .order("updated_at", { ascending: false }),
    supabase
      .from("content_drafts")
      .select("id, product_id"),
    supabase
      .from("final_copies")
      .select("id, product_id, platform, language, status, updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("affiliate_programs")
      .select("product_id, status, affiliate_link")
      .order("updated_at", { ascending: false }),
  ])

  if (productsResult.error) throw new Error(`Unable to load products: ${productsResult.error.message}`)
  if (draftsResult.error) throw new Error(`Unable to load drafts: ${draftsResult.error.message}`)
  if (finalCopiesResult.error) throw new Error(`Unable to load final copies: ${finalCopiesResult.error.message}`)
  if (programsResult.error) throw new Error(`Unable to load affiliate programs: ${programsResult.error.message}`)

  const products = ((productsResult.data ?? []) as ProductRow[]).map((row): ApprovalWorkflowProductInput => ({
    id: row.id,
    name: row.name,
    status: row.status,
    affiliateUrl: row.affiliate_url,
  }))

  const drafts = ((draftsResult.data ?? []) as DraftRow[]).map((row): ApprovalWorkflowDraftInput => ({
    id: row.id,
    productId: row.product_id,
  }))

  const finalCopies = ((finalCopiesResult.data ?? []) as FinalCopyRow[]).map((row): ApprovalWorkflowFinalCopyInput => ({
    id: row.id,
    productId: row.product_id,
    platform: row.platform,
    language: row.language,
    status: row.status,
    updatedAt: row.updated_at,
  }))

  const affiliatePrograms = ((programsResult.data ?? []) as AffiliateProgramRow[]).map((row): ApprovalWorkflowAffiliateProgramInput => ({
    productId: row.product_id,
    status: row.status,
    affiliateLink: row.affiliate_link,
  }))

  return buildProductApprovalWorkflowSummaries({
    products,
    drafts,
    finalCopies,
    affiliatePrograms,
  })
}
