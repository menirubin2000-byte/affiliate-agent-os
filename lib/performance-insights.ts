import type { CampaignLink } from "@/types/campaign-link"
import type { Draft } from "@/types/draft"
import type { PerformanceMetric, PerformanceProductSummary, PerformanceChannelSummary } from "@/types/performance"
import type {
  InsightSeverity,
  PerformanceInsight,
  PerformanceInsightSummary,
  PerformanceSignal,
  ProductPerformanceSignal,
} from "@/types/performance-insight"

export function buildProductPerformanceSignal(params: {
  productId: string
  records: PerformanceMetric[]
}): ProductPerformanceSignal {
  const { productId, records } = params

  if (records.length === 0) {
    return {
      productId,
      signal: "no_data",
      label: "No data yet",
      clicks: 0,
      conversions: 0,
      revenue: 0,
      records: 0,
      latestRecordAge: null,
    }
  }

  const clicks = records.reduce((sum, r) => sum + r.clicks, 0)
  const conversions = records.reduce((sum, r) => sum + (r.conversions ?? 0), 0)
  const revenue = records.reduce((sum, r) => sum + (r.revenue ?? 0), 0)

  const latestRecord = records.reduce<PerformanceMetric | null>((latest, r) => {
    if (!latest) return r
    return new Date(r.recordedAt).getTime() > new Date(latest.recordedAt).getTime() ? r : latest
  }, null)

  const latestRecordAge = latestRecord
    ? (Date.now() - new Date(latestRecord.recordedAt).getTime()) / (1000 * 60 * 60 * 24)
    : null

  let signal: PerformanceSignal
  let label: string

  if (latestRecordAge !== null && latestRecordAge > 30) {
    signal = "needs_refresh"
    label = "Needs refresh"
  } else if (conversions > 0) {
    signal = "converting"
    label = "Converting"
  } else if (clicks > 0) {
    signal = clicks >= 10 ? "no_conversions" : "getting_clicks"
    label = clicks >= 10 ? "No conversions" : "Getting clicks"
  } else {
    signal = "no_data"
    label = "No data yet"
  }

  return {
    productId,
    signal,
    label,
    clicks,
    conversions,
    revenue,
    records: records.length,
    latestRecordAge,
  }
}

export function buildPerformanceInsights(params: {
  productSummaries: PerformanceProductSummary[]
  channelSummaries: PerformanceChannelSummary[]
  approvedDrafts: Draft[]
  performanceByProductId: Map<string, PerformanceMetric[]>
  performanceByDraftId: Map<string, PerformanceMetric[]>
  latestDraftByProductId: Map<string, Draft>
  campaignLinks?: CampaignLink[]
  performanceByCampaignLinkId?: Map<string, PerformanceMetric[]>
}): PerformanceInsight[] {
  const insights: PerformanceInsight[] = []

  for (const ps of params.productSummaries) {
    if (ps.clicks >= 10 && ps.conversions === 0) {
      insights.push({
        id: `product-clicks-no-conv:${ps.productId}`,
        type: "product_clicks_no_conversions",
        severity: "warning",
        title: `${ps.productName} has ${ps.clicks} clicks but no conversions`,
        description: "Consider refreshing the content or updating the CTA to improve conversion.",
        relatedEntityType: "product",
        relatedEntityKey: ps.productId,
        actionLabel: "Review drafts",
        actionHref: `/dashboard/drafts?product=${encodeURIComponent(ps.productId)}`,
      })
    }

    if (ps.clicks >= 20 && ps.conversions >= 3) {
      insights.push({
        id: `product-high-perf:${ps.productId}`,
        type: "product_high_performance",
        severity: "info",
        title: `${ps.productName} is performing well`,
        description: `${ps.clicks} clicks and ${ps.conversions} conversions recorded.`,
        relatedEntityType: "product",
        relatedEntityKey: ps.productId,
        actionLabel: "View performance",
        actionHref: `/dashboard/performance?product=${encodeURIComponent(ps.productId)}`,
      })
    }

    if (ps.revenue > 0) {
      const latestDraft = params.latestDraftByProductId.get(ps.productId)
      const records = params.performanceByProductId.get(ps.productId) ?? []
      const latestRecord = records.reduce<PerformanceMetric | null>((latest, r) => {
        if (!latest) return r
        return new Date(r.recordedAt).getTime() > new Date(latest.recordedAt).getTime() ? r : latest
      }, null)

      if (latestDraft && latestRecord &&
          new Date(latestRecord.recordedAt).getTime() > new Date(latestDraft.updatedAt).getTime()) {
        insights.push({
          id: `product-revenue-no-iter:${ps.productId}`,
          type: "product_revenue_no_iteration",
          severity: "info",
          title: `${ps.productName} has revenue but no newer draft iteration`,
          description: "Performance data exists after the latest draft. Consider a new draft to build on momentum.",
          relatedEntityType: "product",
          relatedEntityKey: ps.productId,
          actionLabel: "Create new draft",
          actionHref: "/dashboard/drafts/new",
        })
      }
    }

    const records = params.performanceByProductId.get(ps.productId) ?? []
    const latestRecord = records.reduce<PerformanceMetric | null>((latest, r) => {
      if (!latest) return r
      return new Date(r.recordedAt).getTime() > new Date(latest.recordedAt).getTime() ? r : latest
    }, null)

    if (latestRecord) {
      const ageInDays = (Date.now() - new Date(latestRecord.recordedAt).getTime()) / (1000 * 60 * 60 * 24)
      if (ageInDays > 30) {
        insights.push({
          id: `product-stale:${ps.productId}`,
          type: "stale_performance_record",
          severity: "warning",
          title: `${ps.productName} performance data is stale`,
          description: `Latest record is ${Math.floor(ageInDays)} days old. Add a fresh performance record.`,
          relatedEntityType: "product",
          relatedEntityKey: ps.productId,
          actionLabel: "Record performance",
          actionHref: "/dashboard/performance",
        })
      }
    }
  }

  for (const cs of params.channelSummaries) {
    if (cs.clicks >= 10 && cs.conversions === 0) {
      insights.push({
        id: `channel-no-conv:${cs.channel}`,
        type: "channel_no_conversions",
        severity: "warning",
        title: `${cs.channel} channel has ${cs.clicks} clicks but no conversions`,
        description: "This channel drives traffic but has not produced conversions yet.",
        relatedEntityType: "channel",
        relatedEntityKey: cs.channel,
        actionLabel: "View channel records",
        actionHref: `/dashboard/performance?channel=${encodeURIComponent(cs.channel)}`,
      })
    }
  }

  for (const draft of params.approvedDrafts) {
    const draftRecords = params.performanceByDraftId.get(draft.id) ?? []
    if (draftRecords.length === 0) {
      insights.push({
        id: `draft-no-perf:${draft.id}`,
        type: "approved_draft_no_performance",
        severity: "info",
        title: `${draft.productName} approved draft has no performance records`,
        description: "Record performance after this draft is used so you can measure outcomes.",
        relatedEntityType: "draft",
        relatedEntityKey: draft.id,
        actionLabel: "Record performance",
        actionHref: `/dashboard/performance?draftId=${draft.id}`,
      })
    }
  }

  // Campaign link insights
  if (params.campaignLinks && params.performanceByCampaignLinkId) {
    for (const link of params.campaignLinks) {
      if (link.status !== "active") continue
      const linkRecords = params.performanceByCampaignLinkId.get(link.id) ?? []

      if (linkRecords.length === 0) {
        insights.push({
          id: `campaign-link-no-perf:${link.id}`,
          type: "campaign_link_no_performance",
          severity: "info",
          title: `Campaign link "${link.name}" has no performance records`,
          description: `This active campaign link for ${link.productName} has not been connected to any performance records yet.`,
          relatedEntityType: "product",
          relatedEntityKey: link.productId,
          actionLabel: "Record performance",
          actionHref: "/dashboard/performance",
        })
        continue
      }

      const totalClicks = linkRecords.reduce((s, r) => s + r.clicks, 0)
      const totalConversions = linkRecords.reduce((s, r) => s + (r.conversions ?? 0), 0)

      if (totalClicks >= 10 && totalConversions === 0) {
        insights.push({
          id: `campaign-link-no-conv:${link.id}`,
          type: "campaign_link_clicks_no_conversions",
          severity: "warning",
          title: `Campaign link "${link.name}" has ${totalClicks} clicks but no conversions`,
          description: `This campaign link for ${link.productName} on ${link.channel} is driving traffic but has not converted.`,
          relatedEntityType: "product",
          relatedEntityKey: link.productId,
          actionLabel: "Review campaign",
          actionHref: "/dashboard/campaign-links",
        })
      }

      if (totalClicks >= 20 && totalConversions >= 3) {
        insights.push({
          id: `campaign-link-high-perf:${link.id}`,
          type: "campaign_link_high_performance",
          severity: "info",
          title: `Campaign link "${link.name}" is performing well`,
          description: `${totalClicks} clicks and ${totalConversions} conversions on ${link.channel}.`,
          relatedEntityType: "product",
          relatedEntityKey: link.productId,
          actionLabel: "View campaign links",
          actionHref: "/dashboard/campaign-links",
        })
      }
    }
  }

  return insights.sort((a, b) => {
    const severityOrder: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

export function summarizeInsights(insights: PerformanceInsight[]): PerformanceInsightSummary {
  return {
    total: insights.length,
    info: insights.filter((i) => i.severity === "info").length,
    warning: insights.filter((i) => i.severity === "warning").length,
    critical: insights.filter((i) => i.severity === "critical").length,
  }
}
