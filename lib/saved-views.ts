/**
 * Saved views helpers.
 *
 * - Recommended views: deterministic preset list (no DB seed required)
 * - Filter query string builder
 * - JSON-safe filter validation
 */

import type { SavedViewType } from "@/types/saved-view"

export interface RecommendedView {
  name: string
  viewType: SavedViewType
  filters: Record<string, string>
  description: string
  href: string
}

const VIEW_TYPE_ROUTES: Record<SavedViewType, string> = {
  products: "/dashboard/products",
  drafts: "/dashboard/drafts",
  performance: "/dashboard/performance",
  campaign_links: "/dashboard/campaign-links",
  improvements: "/dashboard/improvements",
  reports: "/dashboard/reports",
}

export function getViewTypeRoute(viewType: SavedViewType): string {
  return VIEW_TYPE_ROUTES[viewType]
}

export function buildFilterHref(
  viewType: SavedViewType,
  filters: Record<string, string>,
): string {
  const base = VIEW_TYPE_ROUTES[viewType]
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value)
    }
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

export function isJsonSafeFilters(
  value: unknown,
): value is Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }
  for (const [k, v] of Object.entries(value)) {
    if (typeof k !== "string" || typeof v !== "string") {
      return false
    }
  }
  return true
}

export const VALID_VIEW_TYPES: SavedViewType[] = [
  "products",
  "drafts",
  "performance",
  "campaign_links",
  "improvements",
  "reports",
]

export function isValidViewType(value: string): value is SavedViewType {
  return VALID_VIEW_TYPES.includes(value as SavedViewType)
}

export function getRecommendedViews(): RecommendedView[] {
  const views: RecommendedView[] = [
    {
      name: "Products needing drafts",
      viewType: "products",
      filters: { status: "active", needs_drafts: "1" },
      description:
        "Active products that have no content drafts yet.",
      href: "",
    },
    {
      name: "Approved drafts needing performance",
      viewType: "drafts",
      filters: { status: "approved", needs_performance: "1" },
      description:
        "Approved drafts without any linked performance records.",
      href: "",
    },
    {
      name: "Critical improvement tasks",
      viewType: "improvements",
      filters: { priority: "critical", status: "open" },
      description:
        "Open improvement tasks marked as critical priority.",
      href: "",
    },
    {
      name: "Campaign links with no performance",
      viewType: "campaign_links",
      filters: { status: "active", no_performance: "1" },
      description:
        "Active campaign links that have no performance records.",
      href: "",
    },
    {
      name: "Performance with no conversions",
      viewType: "performance",
      filters: { missing_conversions: "1" },
      description:
        "Performance records that have clicks but no conversions recorded.",
      href: "",
    },
    {
      name: "Reports overview",
      viewType: "reports",
      filters: {},
      description:
        "Open the read-only reports and export center.",
      href: "",
    },
  ]

  // Compute href for each recommended view
  return views.map((v) => ({
    ...v,
    href: buildFilterHref(v.viewType, v.filters),
  }))
}

export const VIEW_TYPE_LABELS: Record<SavedViewType, string> = {
  products: "Products",
  drafts: "Drafts",
  performance: "Performance",
  campaign_links: "Campaign Links",
  improvements: "Improvements",
  reports: "Reports",
}
