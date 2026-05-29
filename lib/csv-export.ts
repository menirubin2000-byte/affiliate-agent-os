/**
 * Deterministic CSV export helpers.
 *
 * - Escapes commas, quotes, and newlines per RFC 4180
 * - Includes header row
 * - No external libraries
 * - Read-only: never mutates data
 */

export function escapeCsvField(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function toCsvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(",")
}

export function toCsv(headers: string[], rows: string[][]): string {
  const headerLine = toCsvRow(headers)
  const dataLines = rows.map(toCsvRow)
  return [headerLine, ...dataLines].join("\n")
}

function fmt(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  return String(value)
}

function fmtPercent(clicks: number, conversions: number): string {
  if (clicks === 0) return ""
  return ((conversions / clicks) * 100).toFixed(1) + "%"
}

function fmtMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return ""
  return value.toFixed(2)
}

// ── Product performance report CSV ──

export interface ProductReportRow {
  productName: string
  category: string | null
  targetKeyword: string | null
  draftCount: number
  approvedDraftCount: number
  campaignLinkCount: number
  clicks: number
  conversions: number
  revenue: number
  conversionRate: string
  openTasks: number
  performanceSignal: string
}

export function productReportToCsv(rows: ProductReportRow[]): string {
  const headers = [
    "Product",
    "Category",
    "Target Keyword",
    "Drafts",
    "Approved Drafts",
    "Campaign Links",
    "Clicks",
    "Conversions",
    "Revenue",
    "Conversion Rate",
    "Open Tasks",
    "Performance Signal",
  ]

  const data = rows.map((r) => [
    fmt(r.productName),
    fmt(r.category),
    fmt(r.targetKeyword),
    fmt(r.draftCount),
    fmt(r.approvedDraftCount),
    fmt(r.campaignLinkCount),
    fmt(r.clicks),
    fmt(r.conversions),
    fmtMoney(r.revenue),
    fmt(r.conversionRate),
    fmt(r.openTasks),
    fmt(r.performanceSignal),
  ])

  return toCsv(headers, data)
}

// ── Campaign performance report CSV ──

export interface CampaignReportRow {
  linkName: string
  productName: string
  channel: string
  campaignName: string | null
  clicks: number
  conversions: number
  revenue: number
  conversionRate: string
  status: string
  lastRecordedDate: string | null
}

export function campaignReportToCsv(rows: CampaignReportRow[]): string {
  const headers = [
    "Campaign Link",
    "Product",
    "Channel",
    "Campaign Name",
    "Clicks",
    "Conversions",
    "Revenue",
    "Conversion Rate",
    "Status",
    "Last Recorded Date",
  ]

  const data = rows.map((r) => [
    fmt(r.linkName),
    fmt(r.productName),
    fmt(r.channel),
    fmt(r.campaignName),
    fmt(r.clicks),
    fmt(r.conversions),
    fmtMoney(r.revenue),
    fmt(r.conversionRate),
    fmt(r.status),
    fmt(r.lastRecordedDate),
  ])

  return toCsv(headers, data)
}

// ── Draft report CSV ──

export interface DraftReportRow {
  title: string | null
  productName: string
  templateType: string
  status: string
  qualityScore: string
  versionCount: number
  performanceRecords: number
  createdAt: string
}

export function draftReportToCsv(rows: DraftReportRow[]): string {
  const headers = [
    "Title",
    "Product",
    "Template Type",
    "Status",
    "Quality Score",
    "Versions",
    "Performance Records",
    "Created At",
  ]

  const data = rows.map((r) => [
    fmt(r.title),
    fmt(r.productName),
    fmt(r.templateType),
    fmt(r.status),
    fmt(r.qualityScore),
    fmt(r.versionCount),
    fmt(r.performanceRecords),
    fmt(r.createdAt),
  ])

  return toCsv(headers, data)
}

// ── Improvement task report CSV ──

export interface TaskReportRow {
  title: string
  productName: string | null
  draftTitle: string | null
  sourceType: string
  priority: string
  status: string
  suggestedAction: string | null
  createdAt: string
}

export function taskReportToCsv(rows: TaskReportRow[]): string {
  const headers = [
    "Title",
    "Product",
    "Draft",
    "Source Type",
    "Priority",
    "Status",
    "Suggested Action",
    "Created At",
  ]

  const data = rows.map((r) => [
    fmt(r.title),
    fmt(r.productName),
    fmt(r.draftTitle),
    fmt(r.sourceType),
    fmt(r.priority),
    fmt(r.status),
    fmt(r.suggestedAction),
    fmt(r.createdAt),
  ])

  return toCsv(headers, data)
}

// ── Report derivation helpers ──

import type { CampaignLink } from "@/types/campaign-link"
import type { Draft } from "@/types/draft"
import type { ImprovementTask } from "@/types/improvement-task"
import type { PerformanceMetric } from "@/types/performance"
import type { ProductPerformanceSignal } from "@/types/performance-insight"
import type { Product } from "@/types/product"

export interface ReportSummary {
  totalProducts: number
  activeProducts: number
  totalDrafts: number
  approvedDrafts: number
  totalCampaignLinks: number
  activeCampaignLinks: number
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  openTasks: number
  criticalTasks: number
}

export function buildReportSummary(params: {
  products: Product[]
  drafts: Draft[]
  campaignLinks: CampaignLink[]
  performanceMetrics: PerformanceMetric[]
  improvementTasks: ImprovementTask[]
}): ReportSummary {
  const { products, drafts, campaignLinks, performanceMetrics, improvementTasks } = params

  let totalClicks = 0
  let totalConversions = 0
  let totalRevenue = 0
  for (const m of performanceMetrics) {
    totalClicks += m.clicks
    totalConversions += m.conversions ?? 0
    totalRevenue += m.revenue ?? 0
  }

  return {
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.status === "active").length,
    totalDrafts: drafts.length,
    approvedDrafts: drafts.filter((d) => d.status === "approved").length,
    totalCampaignLinks: campaignLinks.length,
    activeCampaignLinks: campaignLinks.filter((cl) => cl.status === "active").length,
    totalClicks,
    totalConversions,
    totalRevenue,
    openTasks: improvementTasks.filter((t) => t.status === "open" || t.status === "in_progress").length,
    criticalTasks: improvementTasks.filter((t) => t.priority === "critical" && (t.status === "open" || t.status === "in_progress")).length,
  }
}

export function buildProductReport(params: {
  products: Product[]
  drafts: Draft[]
  campaignLinks: CampaignLink[]
  performanceMetrics: PerformanceMetric[]
  improvementTasks: ImprovementTask[]
  signals: Map<string, ProductPerformanceSignal>
}): ProductReportRow[] {
  const { products, drafts, campaignLinks, performanceMetrics, improvementTasks, signals } = params

  // Index by product
  const draftsByProduct = new Map<string, Draft[]>()
  for (const d of drafts) {
    const list = draftsByProduct.get(d.productId) ?? []
    list.push(d)
    draftsByProduct.set(d.productId, list)
  }

  const linksByProduct = new Map<string, CampaignLink[]>()
  for (const cl of campaignLinks) {
    const list = linksByProduct.get(cl.productId) ?? []
    list.push(cl)
    linksByProduct.set(cl.productId, list)
  }

  const perfByProduct = new Map<string, PerformanceMetric[]>()
  for (const m of performanceMetrics) {
    const list = perfByProduct.get(m.productId) ?? []
    list.push(m)
    perfByProduct.set(m.productId, list)
  }

  const tasksByProduct = new Map<string, ImprovementTask[]>()
  for (const t of improvementTasks) {
    if (t.productId) {
      const list = tasksByProduct.get(t.productId) ?? []
      list.push(t)
      tasksByProduct.set(t.productId, list)
    }
  }

  return products.map((p) => {
    const pDrafts = draftsByProduct.get(p.id) ?? []
    const pLinks = linksByProduct.get(p.id) ?? []
    const pPerf = perfByProduct.get(p.id) ?? []
    const pTasks = tasksByProduct.get(p.id) ?? []

    let clicks = 0
    let conversions = 0
    let revenue = 0
    for (const m of pPerf) {
      clicks += m.clicks
      conversions += m.conversions ?? 0
      revenue += m.revenue ?? 0
    }

    const signal = signals.get(p.id)

    return {
      productName: p.name,
      category: p.category,
      targetKeyword: p.targetKeyword,
      draftCount: pDrafts.length,
      approvedDraftCount: pDrafts.filter((d) => d.status === "approved").length,
      campaignLinkCount: pLinks.length,
      clicks,
      conversions,
      revenue,
      conversionRate: fmtPercent(clicks, conversions),
      openTasks: pTasks.filter((t) => t.status === "open" || t.status === "in_progress").length,
      performanceSignal: signal?.label ?? "No data",
    }
  })
}

export function buildCampaignReport(params: {
  campaignLinks: CampaignLink[]
  performanceMetrics: PerformanceMetric[]
}): CampaignReportRow[] {
  const { campaignLinks, performanceMetrics } = params

  const perfByLink = new Map<string, PerformanceMetric[]>()
  for (const m of performanceMetrics) {
    if (m.campaignLinkId) {
      const list = perfByLink.get(m.campaignLinkId) ?? []
      list.push(m)
      perfByLink.set(m.campaignLinkId, list)
    }
  }

  return campaignLinks.map((cl) => {
    const records = perfByLink.get(cl.id) ?? []
    let clicks = 0
    let conversions = 0
    let revenue = 0
    let lastDate: string | null = null

    for (const m of records) {
      clicks += m.clicks
      conversions += m.conversions ?? 0
      revenue += m.revenue ?? 0
      if (!lastDate || m.recordedAt > lastDate) {
        lastDate = m.recordedAt
      }
    }

    return {
      linkName: cl.name,
      productName: cl.productName,
      channel: cl.channel,
      campaignName: cl.campaignName,
      clicks,
      conversions,
      revenue,
      conversionRate: fmtPercent(clicks, conversions),
      status: cl.status,
      lastRecordedDate: lastDate ? new Date(lastDate).toISOString().split("T")[0] : null,
    }
  })
}

export function buildDraftReport(params: {
  drafts: Draft[]
  versionCounts: Map<string, number>
  performanceRecordCounts: Map<string, number>
}): DraftReportRow[] {
  const { drafts, versionCounts, performanceRecordCounts } = params

  return drafts.map((d) => {
    const qc = d.qualityChecks
    const total = 7
    const passed = [
      qc.has_disclosure,
      qc.has_clear_cta,
      qc.has_target_keyword,
      qc.has_meta_title,
      qc.has_meta_description,
      qc.avoids_fake_claims,
      qc.has_required_structure,
    ].filter(Boolean).length

    return {
      title: d.title,
      productName: d.productName,
      templateType: d.templateType,
      status: d.status,
      qualityScore: `${passed}/${total}`,
      versionCount: versionCounts.get(d.id) ?? 0,
      performanceRecords: performanceRecordCounts.get(d.id) ?? 0,
      createdAt: new Date(d.createdAt).toISOString().split("T")[0],
    }
  })
}

export function buildTaskReport(params: {
  tasks: ImprovementTask[]
}): TaskReportRow[] {
  return params.tasks.map((t) => ({
    title: t.title,
    productName: t.productName,
    draftTitle: t.draftTitle,
    sourceType: t.sourceType,
    priority: t.priority,
    status: t.status,
    suggestedAction: t.suggestedAction,
    createdAt: new Date(t.createdAt).toISOString().split("T")[0],
  }))
}
