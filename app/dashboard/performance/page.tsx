import Link from "next/link"
import { Activity, AlertTriangle, ArrowRight, BarChart3, ClipboardList, Info, Lightbulb, MousePointerClick, Package2, Upload } from "lucide-react"

import { createTaskFromContextAction } from "@/app/dashboard/improvements/actions"
import { MetricPanel } from "@/components/dashboard/metric-panel"
import { PageHeader } from "@/components/dashboard/page-header"
import { RecommendationsPanel } from "@/components/dashboard/recommendations-panel"
import { PerformanceMetricForm } from "@/components/performance/performance-form"
import { PerformanceRecordsTable } from "@/components/performance/performance-records"
import { StatCard } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getRecommendationSummary,
  getPerformanceSummary,
  getPerformanceInsights,
  listCampaignLinks,
  listRecommendations,
  listDrafts,
  listPerformanceWorkflowRecords,
  listProducts,
} from "@/lib/db"
import { summarizeInsights } from "@/lib/performance-insights"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { CampaignLink } from "@/types/campaign-link"
import type { Draft } from "@/types/draft"
import type { PerformanceSummary } from "@/types/performance"
import type { PerformanceInsight, PerformanceInsightSummary } from "@/types/performance-insight"
import type { Recommendation, RecommendationSummary } from "@/types/recommendation"
import type { Product } from "@/types/product"
import type { PerformanceWorkflowRecord } from "@/types/workflow"

export const dynamic = "force-dynamic"

const recencyOptions = [
  { label: "All recency", value: "all" },
  { label: "Last 7 days", value: "last_7_days" },
  { label: "Last 30 days", value: "last_30_days" },
  { label: "Older than 30 days", value: "older_than_30_days" },
] as const

type RecencyFilter = (typeof recencyOptions)[number]["value"]

function isRecencyFilter(value?: string): value is RecencyFilter {
  return (
    value === "all" ||
    value === "last_7_days" ||
    value === "last_30_days" ||
    value === "older_than_30_days"
  )
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

export default async function PerformancePage(props: {
  searchParams: Promise<{
    created?: string
    error?: string
    imported?: string
    importErrors?: string
    product?: string
    channel?: string
    recency?: string
    missing_conversions?: string
  }>
}) {
  const searchParams = await props.searchParams
  const productId = searchParams.product?.trim() || undefined
  const channel = searchParams.channel?.trim() || undefined
  const recency = isRecencyFilter(searchParams.recency) ? searchParams.recency : "all"
  const missingConversions = searchParams.missing_conversions === "1"
  let summary: PerformanceSummary = {
    totalRecords: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    byChannel: [],
    byProduct: [],
  }
  let records: PerformanceWorkflowRecord[] = []
  let products: Product[] = []
  let drafts: Draft[] = []
  let recommendations: Recommendation[] = []
  let recommendationSummary: RecommendationSummary = {
    total: 0,
    info: 0,
    warning: 0,
    critical: 0,
  }
  let campaignLinks: CampaignLink[] = []
  let insights: PerformanceInsight[] = []
  let insightSummary: PerformanceInsightSummary = { total: 0, info: 0, warning: 0, critical: 0 }
  let pageError: string | null = null

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    pageError = `${readiness.summary} ${readiness.guidance}`
  } else {
    try {
      ;[summary, records, products, drafts, campaignLinks, recommendations, recommendationSummary, insights] =
        await Promise.all([
        getPerformanceSummary(),
        listPerformanceWorkflowRecords({
          productId,
          channel,
          recency,
          missingConversions,
        }),
        listProducts(),
        listDrafts(),
        listCampaignLinks({ status: "active" }),
        listRecommendations({ performanceOnly: true, limit: 8 }),
        getRecommendationSummary({ performanceOnly: true }),
        getPerformanceInsights(),
      ])
      insightSummary = summarizeInsights(insights)
    } catch (error) {
      pageError =
        error instanceof Error
          ? error.message
          : "Unable to load performance records from Supabase."
    }
  }

  const channels = summary.byChannel.map((item) => item.channel)
  const hasActiveFilters = Boolean(productId || channel || missingConversions || recency !== "all")

  return (
    <>
      <PageHeader
        eyebrow="Performance"
        title="Performance tracking"
        description="Record simple campaign outcomes and compare channel and product performance without external analytics integrations."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/performance/import"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              <Upload className="size-4" />
              Import performance
            </Link>
            <Link
              href="/dashboard/performance#record-performance"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Record performance
            </Link>
            <Link
              href="/dashboard/products"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Back to products
              <ArrowRight className="size-4" />
            </Link>
          </div>
        }
      />

      {searchParams.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Performance record failed</CardTitle>
            <CardDescription className="text-destructive/80">
              {searchParams.error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.created === "1" ? (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardHeader>
            <CardTitle>Performance record saved</CardTitle>
            <CardDescription className="text-emerald-900/80">
              The performance record was written to Supabase and is now included in dashboard summaries.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.imported ? (
        <Card className={searchParams.importErrors ? "border-amber-200 bg-amber-50 shadow-sm" : "border-emerald-200 bg-emerald-50 shadow-sm"}>
          <CardHeader>
            <CardTitle>
              {searchParams.importErrors
                ? `Imported ${searchParams.imported} records with ${searchParams.importErrors} errors`
                : `Imported ${searchParams.imported} performance records`}
            </CardTitle>
            <CardDescription className={searchParams.importErrors ? "text-amber-900/80" : "text-emerald-900/80"}>
              {searchParams.importErrors
                ? `${searchParams.imported} records were saved. ${searchParams.importErrors} records failed due to database errors.`
                : "All records were saved to Supabase and are now included in dashboard summaries."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to load performance tracking</CardTitle>
            <CardDescription className="text-destructive/80">
              {pageError}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Performance records"
          value={String(summary.totalRecords)}
          detail="Manual performance inputs persisted in Supabase."
          icon={<Activity className="size-4" />}
        />
        <StatCard
          label="Total clicks"
          value={String(summary.totalClicks)}
          detail="Summed across all tracked channels and campaigns."
          icon={<MousePointerClick className="size-4" />}
        />
        <StatCard
          label="Conversions"
          value={String(summary.totalConversions)}
          detail="Simple outcome count linked to products and optional drafts."
          icon={<BarChart3 className="size-4" />}
        />
        <StatCard
          label="Revenue"
          value={formatMoney(summary.totalRevenue)}
          detail="Manual revenue totals. No external attribution integration yet."
          icon={<Package2 className="size-4" />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <MetricPanel
          title="By channel"
          description="Which channels currently show more recorded activity."
          icon={<BarChart3 className="size-4" />}
          rows={
            summary.byChannel.length === 0
              ? [{ label: "No channels recorded", value: 0, variant: "secondary" }]
              : summary.byChannel.slice(0, 6).map((item) => ({
                  label: `${item.channel} (${item.records} records)`,
                  value: item.clicks,
                  variant: "default" as const,
                }))
          }
        />

        <MetricPanel
          title="By product"
          description="Which products currently have stronger recorded outcomes."
          icon={<Package2 className="size-4" />}
          rows={
            summary.byProduct.length === 0
              ? [{ label: "No product records", value: 0, variant: "secondary" }]
              : summary.byProduct.slice(0, 6).map((item) => ({
                  label: `${item.productName} (${item.records} records)`,
                  value: item.clicks,
                  variant: "default" as const,
                }))
          }
        />

        <MetricPanel
          title="Performance recommendations"
          description="Actionable items derived from current performance and draft linkage data."
          icon={<Activity className="size-4" />}
          rows={[
            {
              label: "Critical",
              value: recommendationSummary.critical,
              variant: recommendationSummary.critical > 0 ? "destructive" : "secondary",
            },
            {
              label: "Warning",
              value: recommendationSummary.warning,
              variant: recommendationSummary.warning > 0 ? "secondary" : "outline",
            },
            {
              label: "Info",
              value: recommendationSummary.info,
              variant: "outline",
            },
          ]}
        />
      </section>

      {insights.length > 0 ? (
        <section className="space-y-4">
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-amber-600" />
                <CardTitle>Performance insights</CardTitle>
              </div>
              <CardDescription>
                Actionable signals derived from product and channel performance data.
                {insightSummary.warning > 0 || insightSummary.critical > 0
                  ? ` ${insightSummary.warning + insightSummary.critical} item${insightSummary.warning + insightSummary.critical === 1 ? "" : "s"} need attention.`
                  : " No issues detected."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-3",
                    insight.severity === "critical" && "border-destructive/30 bg-destructive/5",
                    insight.severity === "warning" && "border-amber-200 bg-amber-50",
                    insight.severity === "info" && "border-border/70 bg-muted/30",
                  )}
                >
                  <div className="mt-0.5">
                    {insight.severity === "critical" ? (
                      <AlertTriangle className="size-4 text-destructive" />
                    ) : insight.severity === "warning" ? (
                      <AlertTriangle className="size-4 text-amber-600" />
                    ) : (
                      <Info className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{insight.title}</span>
                      <Badge
                        variant={
                          insight.severity === "critical"
                            ? "destructive"
                            : insight.severity === "warning"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {insight.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    <div className="flex flex-wrap gap-1">
                      <Link
                        href={insight.actionHref}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2 text-xs")}
                      >
                        {insight.actionLabel}
                        <ArrowRight className="ml-1 size-3" />
                      </Link>
                      <form action={createTaskFromContextAction}>
                        <input type="hidden" name="title" value={insight.title} />
                        <input type="hidden" name="description" value={insight.description} />
                        <input type="hidden" name="sourceType" value="performance_insight" />
                        <input type="hidden" name="priority" value={insight.severity === "critical" ? "critical" : insight.severity === "warning" ? "high" : "medium"} />
                        <input type="hidden" name="suggestedAction" value={insight.actionLabel} />
                        {insight.relatedEntityType === "product" ? <input type="hidden" name="productId" value={insight.relatedEntityKey} /> : null}
                        {insight.relatedEntityType === "draft" ? <input type="hidden" name="contentDraftId" value={insight.relatedEntityKey} /> : null}
                        <input type="hidden" name="returnTo" value="/dashboard/performance" />
                        <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          <ClipboardList className="size-3" />
                          Add to queue
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Workflow filters</CardTitle>
          <CardDescription>
            Narrow performance records by product, channel, recency, or missing conversions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/dashboard/performance" className="grid gap-3 md:grid-cols-4">
            <select
              name="product"
              defaultValue={productId ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>

            <select
              name="channel"
              defaultValue={channel ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All channels</option>
              {channels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              name="recency"
              defaultValue={recency}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {recencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              name="missing_conversions"
              defaultValue={missingConversions ? "1" : "0"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="0">All conversion states</option>
              <option value="1">Missing conversions only</option>
            </select>

            <div className="md:col-span-4 flex flex-wrap gap-2">
              <button className={cn(buttonVariants({ variant: "default" }))} type="submit">
                Apply filters
              </button>
              {hasActiveFilters ? (
                <Link
                  href="/dashboard/performance"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  Clear filters
                </Link>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <RecommendationsPanel
        title="Performance recommendations"
        description="Low-performing channels, missing performance coverage, and products that need a fresh iteration."
        recommendations={recommendations}
        showQueueAction
        returnTo="/dashboard/performance"
        emptyTitle="No performance recommendations right now"
        emptyDescription="Current performance data does not surface any advisory items."
        emptyActions={[
          { label: "Record performance", href: "/dashboard/performance#record-performance", variant: "default" },
          { label: "Open products", href: "/dashboard/products", variant: "outline" },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <PerformanceMetricForm products={products} drafts={drafts} campaignLinks={campaignLinks} />
        <PerformanceRecordsTable
          records={records}
          emptyTitle={hasActiveFilters ? "No performance records match the current filters" : undefined}
          emptyDescription={
            hasActiveFilters
              ? "Try a different filter combination, or add a fresh performance record."
              : undefined
          }
          emptyActions={
            hasActiveFilters
              ? [
                  { label: "Clear filters", href: "/dashboard/performance", variant: "outline" },
                  { label: "Record performance", href: "/dashboard/performance#record-performance", variant: "ghost" },
                ]
              : undefined
          }
        />
      </section>
    </>
  )
}
