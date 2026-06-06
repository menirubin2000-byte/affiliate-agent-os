"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createPerformanceMetric, listProducts } from "@/lib/db"
import { assertIntegrationConfigured } from "@/lib/env"
import {
  PERFORMANCE_SOURCE_ADAPTERS,
  parseCsvForSource,
  type PerformanceSourceKey,
} from "@/lib/performance-source-adapters"

function isSourceKey(value: string): value is PerformanceSourceKey {
  return value in PERFORMANCE_SOURCE_ADAPTERS
}

function fail(reason: string): never {
  redirect(`/dashboard/he/traffic-metrics?error=${encodeURIComponent(reason)}`)
}

function matchProduct(
  hint: string,
  products: Array<{ id: string; name: string; slug: string | null }>,
): string | null {
  const trimmed = hint.trim().toLowerCase()
  if (!trimmed) return null
  // Exact match on slug or name first.
  for (const p of products) {
    if ((p.slug ?? "").toLowerCase() === trimmed) return p.id
    if (p.name.toLowerCase() === trimmed) return p.id
  }
  // Loose: hint contains product name (e.g. "Systeme.io Affiliate Stats" -> Systeme.io)
  for (const p of products) {
    if (trimmed.includes(p.name.toLowerCase())) return p.id
  }
  return null
}

export async function importPerformanceMetricsAction(formData: FormData) {
  const sourceRaw = String(formData.get("source") ?? "").trim()
  const csv = String(formData.get("csv") ?? "").trim()

  if (!sourceRaw || !isSourceKey(sourceRaw)) {
    fail("missing_or_invalid_source")
  }
  if (!csv) {
    fail("missing_csv_payload")
  }

  try {
    assertIntegrationConfigured("supabase")
  } catch (error) {
    fail(error instanceof Error ? error.message : "supabase_not_ready")
  }

  const parsed = parseCsvForSource(csv, sourceRaw)
  if (parsed.errors.length > 0 && parsed.rows.length === 0) {
    fail(`parse_failed: ${parsed.errors.map((e) => e.message).join(" | ")}`)
  }

  const products = await listProducts()
  const productLite = products.map((p) => ({ id: p.id, name: p.name, slug: p.slug ?? null }))

  let inserted = 0
  let droppedNoProduct = 0
  const insertErrors: string[] = []
  for (const row of parsed.rows) {
    const productId = matchProduct(row.productHint, productLite)
    if (!productId) {
      droppedNoProduct++
      continue
    }
    try {
      await createPerformanceMetric({
        productId,
        channel: row.channel,
        campaignName: row.campaignName,
        clicks: row.clicks,
        conversions: row.conversions,
        revenue: row.revenue,
        notes: row.notes,
        recordedAt: row.recordedAt,
        source: sourceRaw,
      })
      inserted++
    } catch (err) {
      insertErrors.push(err instanceof Error ? err.message : String(err))
    }
  }

  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/he/traffic-metrics")
  revalidatePath("/dashboard/performance")

  const params = new URLSearchParams()
  params.set("source", sourceRaw)
  params.set("inserted", String(inserted))
  params.set("dropped", String(droppedNoProduct))
  if (parsed.errors.length > 0) params.set("rowErrors", String(parsed.errors.length))
  if (insertErrors.length > 0) params.set("insertErrors", String(insertErrors.length))
  redirect(`/dashboard/he/traffic-metrics?${params.toString()}`)
}
