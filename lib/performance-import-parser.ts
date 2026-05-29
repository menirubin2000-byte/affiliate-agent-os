/**
 * Deterministic CSV/TSV parser for bulk performance record imports.
 *
 * Supports:
 * - Comma-separated and tab-separated values
 * - Header row required
 * - Field aliases (product_slug, product_id, campaign_link_id, etc.)
 * - Numeric validation (clicks, conversions, revenue)
 * - Date validation (recorded_at)
 * - Quoted CSV fields
 * - Empty row skipping
 * - Product matching by slug or ID
 * - Campaign link matching with field inheritance
 */

import type { CampaignLink } from "@/types/campaign-link"
import type { Product } from "@/types/product"

export interface ParsedPerformanceRow {
  rowIndex: number
  productId: string
  productName: string
  draftId: string | null
  campaignLinkId: string | null
  channel: string
  campaignName: string | null
  clicks: number
  conversions: number | null
  revenue: number | null
  notes: string | null
  recordedAt: string | null
}

export interface PerformanceRowError {
  rowIndex: number
  field: string
  message: string
}

export interface PerformanceImportResult {
  validRows: ParsedPerformanceRow[]
  errors: PerformanceRowError[]
  totalRows: number
}

const FIELD_ALIASES: Record<string, string> = {
  product_slug: "product_slug",
  productslug: "product_slug",
  slug: "product_slug",
  product_id: "product_id",
  productid: "product_id",
  draft_id: "draft_id",
  draftid: "draft_id",
  campaign_link_id: "campaign_link_id",
  campaignlinkid: "campaign_link_id",
  campaign_link: "campaign_link_id",
  channel: "channel",
  campaign_name: "campaign_name",
  campaignname: "campaign_name",
  campaign: "campaign_name",
  clicks: "clicks",
  conversions: "conversions",
  revenue: "revenue",
  notes: "notes",
  recorded_at: "recorded_at",
  recordedat: "recorded_at",
  date: "recorded_at",
}

function detectSeparator(headerLine: string): string {
  const tabCount = (headerLine.match(/\t/g) ?? []).length
  const commaCount = (headerLine.match(/,/g) ?? []).length
  return tabCount > commaCount ? "\t" : ","
}

function splitRow(line: string, separator: string): string[] {
  if (separator === "\t") {
    return line.split("\t").map((v) => v.trim())
  }

  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === separator && !inQuotes) {
      fields.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

function normalizeHeader(header: string): string | null {
  const key = header.toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "")
  return FIELD_ALIASES[key] ?? null
}

function parseInteger(value: string): number | null {
  if (!value) return null
  const cleaned = value.replace(/[$,]/g, "").trim()
  if (!cleaned) return null
  const num = Number(cleaned)
  if (!Number.isFinite(num) || !Number.isInteger(num)) return null
  return num
}

function parseDecimal(value: string): number | null {
  if (!value) return null
  const cleaned = value.replace(/[$,]/g, "").trim()
  if (!cleaned) return null
  const num = Number(cleaned)
  if (!Number.isFinite(num)) return null
  return num
}

function parseDate(value: string): string | null {
  if (!value.trim()) return null
  const date = new Date(value.trim())
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export interface PerformanceImportContext {
  products: Product[]
  campaignLinks: CampaignLink[]
}

export function parsePerformanceCsv(
  raw: string,
  context: PerformanceImportContext,
): PerformanceImportResult {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    return { validRows: [], errors: [], totalRows: 0 }
  }

  const headerLine = lines[0]
  const separator = detectSeparator(headerLine)
  const rawHeaders = splitRow(headerLine, separator)
  const headers = rawHeaders.map(normalizeHeader)

  // Build lookup maps
  const productBySlug = new Map<string, Product>()
  const productById = new Map<string, Product>()
  for (const p of context.products) {
    productBySlug.set(p.slug, p)
    productById.set(p.id, p)
  }
  const campaignLinkById = new Map<string, CampaignLink>()
  for (const cl of context.campaignLinks) {
    campaignLinkById.set(cl.id, cl)
  }

  const errors: PerformanceRowError[] = []
  const validRows: ParsedPerformanceRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = splitRow(lines[i], separator)
    const rowIndex = i + 1

    const record: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j]
      if (header) {
        record[header] = values[j] ?? ""
      }
    }

    let rowValid = true

    // Resolve product
    let resolvedProduct: Product | null = null
    let resolvedCampaignLink: CampaignLink | null = null

    // Try campaign link first (it can provide product, channel, campaign_name)
    const campaignLinkIdRaw = record.campaign_link_id?.trim() || null
    if (campaignLinkIdRaw) {
      resolvedCampaignLink = campaignLinkById.get(campaignLinkIdRaw) ?? null
      if (!resolvedCampaignLink) {
        errors.push({ rowIndex, field: "campaign_link_id", message: `Campaign link "${campaignLinkIdRaw}" not found` })
        rowValid = false
      } else {
        resolvedProduct = productById.get(resolvedCampaignLink.productId) ?? null
      }
    }

    // Product resolution from explicit fields (overrides campaign link product if both given)
    const productIdRaw = record.product_id?.trim() || null
    const productSlugRaw = record.product_slug?.trim() || null

    if (productIdRaw) {
      const p = productById.get(productIdRaw) ?? null
      if (!p) {
        errors.push({ rowIndex, field: "product_id", message: `Product ID "${productIdRaw}" not found` })
        rowValid = false
      } else {
        resolvedProduct = p
      }
    } else if (productSlugRaw) {
      const p = productBySlug.get(productSlugRaw) ?? null
      if (!p) {
        errors.push({ rowIndex, field: "product_slug", message: `Product slug "${productSlugRaw}" not found` })
        rowValid = false
      } else {
        resolvedProduct = p
      }
    }

    if (!resolvedProduct) {
      if (!campaignLinkIdRaw && !productIdRaw && !productSlugRaw) {
        errors.push({ rowIndex, field: "product_slug", message: "Product is required (product_slug, product_id, or campaign_link_id)" })
      }
      rowValid = false
    }

    // Channel: explicit overrides campaign link
    const channelRaw = record.channel?.trim() || null
    const resolvedChannel = channelRaw || resolvedCampaignLink?.channel || null
    if (!resolvedChannel) {
      errors.push({ rowIndex, field: "channel", message: "Channel is required" })
      rowValid = false
    }

    // Campaign name: explicit overrides campaign link
    const campaignNameRaw = record.campaign_name?.trim() || null
    const resolvedCampaignName = campaignNameRaw || resolvedCampaignLink?.campaignName || null

    // Clicks (required)
    const clicksRaw = record.clicks?.trim() || ""
    let clicks: number | null = null
    if (!clicksRaw) {
      errors.push({ rowIndex, field: "clicks", message: "Clicks is required" })
      rowValid = false
    } else {
      clicks = parseInteger(clicksRaw)
      if (clicks === null || clicks < 0) {
        errors.push({ rowIndex, field: "clicks", message: "Clicks must be a non-negative whole number" })
        rowValid = false
      }
    }

    // Conversions (optional)
    let conversions: number | null = null
    const conversionsRaw = record.conversions?.trim() || ""
    if (conversionsRaw) {
      conversions = parseInteger(conversionsRaw)
      if (conversions === null || conversions < 0) {
        errors.push({ rowIndex, field: "conversions", message: "Conversions must be a non-negative whole number" })
        rowValid = false
      }
    }

    // Revenue (optional)
    let revenue: number | null = null
    const revenueRaw = record.revenue?.trim() || ""
    if (revenueRaw) {
      revenue = parseDecimal(revenueRaw)
      if (revenue === null || revenue < 0) {
        errors.push({ rowIndex, field: "revenue", message: "Revenue must be a non-negative number" })
        rowValid = false
      }
    }

    // Recorded at (optional)
    let recordedAt: string | null = null
    const recordedAtRaw = record.recorded_at?.trim() || ""
    if (recordedAtRaw) {
      recordedAt = parseDate(recordedAtRaw)
      if (!recordedAt) {
        errors.push({ rowIndex, field: "recorded_at", message: "Invalid date format" })
        rowValid = false
      }
    }

    if (!rowValid) continue

    validRows.push({
      rowIndex,
      productId: resolvedProduct!.id,
      productName: resolvedProduct!.name,
      draftId: record.draft_id?.trim() || null,
      campaignLinkId: resolvedCampaignLink?.id ?? null,
      channel: resolvedChannel!,
      campaignName: resolvedCampaignName,
      clicks: clicks!,
      conversions,
      revenue,
      notes: record.notes?.trim() || null,
      recordedAt,
    })
  }

  return {
    validRows,
    errors,
    totalRows: lines.length - 1,
  }
}
