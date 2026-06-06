import "server-only"

import { buildPlatformRoutingOverview } from "@/lib/platform-routing"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import type {
  PlatformRoutingOverview,
  RoutingAffiliateProgramInput,
  RoutingFinalCopyInput,
  RoutingProductInput,
  RoutingPublishJobInput,
  RoutingPublishedRecordInput,
} from "@/lib/platform-routing"

type ProductRow = {
  id: string
  name: string
  status: string
  category: string | null
  affiliate_link?: string | null
  affiliate_url: string | null
}

type AffiliateProgramRow = {
  product_id: string | null
  status: string
  affiliate_link: string | null
}

type FinalCopyRow = {
  id: string
  product_id: string
  platform: string
  status: string
  validation_status: string
  title: string | null
  blocking_reasons: unknown
}

type PublishJobRow = {
  id: string
  final_copy_id: string
  product_id: string
  platform: string
  status: string
  blocking_reason: string | null
  live_url: string | null
  verified_at: string | null
}

type PublishedRecordRow = {
  id: string
  final_copy_id?: string | null
  product_id: string
  platform: string
  live_url: string | null
  verification_status: string
  verified_at: string | null
}

export async function getPlatformRoutingOverview(): Promise<PlatformRoutingOverview> {
  if (!isSupabaseConfigured()) {
    return buildPlatformRoutingOverview({
      products: [],
      affiliatePrograms: [],
      finalCopies: [],
      publishJobs: [],
      publishedRecords: [],
      includePendingSetupPlatforms: true,
    })
  }

  const supabase = getServiceRoleSupabase()
  const [products, affiliatePrograms, finalCopies, publishJobs, publishedRecords] = await Promise.all([
    safeSelect<ProductRow>("products", () =>
      supabase
        .from("products")
        .select("id, name, status, category, affiliate_link, affiliate_url")
        .order("updated_at", { ascending: false }),
    ),
    safeSelect<AffiliateProgramRow>("affiliate_programs", () =>
      supabase
        .from("affiliate_programs")
        .select("product_id, status, affiliate_link")
        .order("updated_at", { ascending: false }),
    ),
    safeSelect<FinalCopyRow>("final_copies", () =>
      supabase
        .from("final_copies")
        .select("id, product_id, platform, status, validation_status, title, blocking_reasons")
        .order("updated_at", { ascending: false }),
    ),
    safeSelect<PublishJobRow>("publish_jobs", () =>
      supabase
        .from("publish_jobs")
        .select("id, final_copy_id, product_id, platform, status, blocking_reason, live_url, verified_at")
        .order("updated_at", { ascending: false }),
    ),
    safeSelect<PublishedRecordRow>("published_records", () =>
      supabase
        .from("published_records")
        .select("id, final_copy_id, product_id, platform, live_url, verification_status, verified_at")
        .order("verified_at", { ascending: false }),
    ),
  ])

  // Operator rule: only products MENI actually owns belong on the dashboard.
  // A product is "owned" iff at least one affiliate_programs row has
  // status='link_ready' AND a non-empty affiliate_link. Everything else is a
  // tracking placeholder (registered as a potential future partner) and
  // would only add noise to the queue. The placeholders stay in the DB —
  // we keep history — but the routing overview ignores them.
  const ownedProductIds = new Set(
    affiliatePrograms
      .filter((p) => p.status === "link_ready" && (p.affiliate_link ?? "").trim() !== "")
      .map((p) => p.product_id)
      .filter((id): id is string => Boolean(id)),
  )
  const ownedProducts = products.filter((p) => ownedProductIds.has(p.id))

  return buildPlatformRoutingOverview({
    products: ownedProducts.map(mapProduct),
    affiliatePrograms: affiliatePrograms.map(mapAffiliateProgram),
    finalCopies: finalCopies.map(mapFinalCopy),
    publishJobs: publishJobs.map(mapPublishJob),
    publishedRecords: publishedRecords.map(mapPublishedRecord),
    includePendingSetupPlatforms: true,
  })
}

async function safeSelect<T>(
  tableName: string,
  query: () => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const { data, error } = await query()
  if (!error) return (data ?? []) as T[]

  if (
    error.message.includes(tableName) ||
    error.message.includes("schema cache") ||
    error.message.includes("column")
  ) {
    return []
  }

  throw new Error(`Unable to load ${tableName}: ${error.message}`)
}

function mapProduct(row: ProductRow): RoutingProductInput {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    category: row.category,
    affiliateLink: row.affiliate_link ?? null,
    affiliateUrl: row.affiliate_url,
  }
}

function mapAffiliateProgram(row: AffiliateProgramRow): RoutingAffiliateProgramInput {
  return {
    productId: row.product_id,
    status: row.status,
    affiliateLink: row.affiliate_link,
  }
}

function mapFinalCopy(row: FinalCopyRow): RoutingFinalCopyInput {
  return {
    id: row.id,
    productId: row.product_id,
    platform: row.platform,
    status: row.status,
    validationStatus: row.validation_status,
    title: row.title,
    blockingReasons: normalizeStringArray(row.blocking_reasons),
  }
}

function mapPublishJob(row: PublishJobRow): RoutingPublishJobInput {
  return {
    id: row.id,
    finalCopyId: row.final_copy_id,
    productId: row.product_id,
    platform: row.platform,
    status: row.status,
    blockingReason: row.blocking_reason,
    liveUrl: row.live_url,
    verifiedAt: row.verified_at,
  }
}

function mapPublishedRecord(row: PublishedRecordRow): RoutingPublishedRecordInput {
  return {
    id: row.id,
    finalCopyId: row.final_copy_id ?? null,
    productId: row.product_id,
    platform: row.platform,
    liveUrl: row.live_url,
    verificationStatus: row.verification_status,
    verifiedAt: row.verified_at,
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return parsed.map((item) => String(item))
    } catch {
      return [value]
    }
  }
  return [String(value)]
}
