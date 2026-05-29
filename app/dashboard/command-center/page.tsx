import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  ClipboardList,
  Command,
  FileText,
  ShieldAlert,
} from "lucide-react"

import { ActionItemsPanel } from "@/components/dashboard/action-items-panel"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  countPendingApprovalItems,
  getDataQualitySummary,
  getImprovementTaskSummary,
  getOperatorActionItems,
  getOperatorActionSummary,
  listDrafts,
} from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { ActionItem, ActionItemPriority, ActionItemSource, OperatorActionSummary } from "@/types/action-item"
import type { DataQualitySummary } from "@/types/data-quality"
import type { ImprovementTaskSummary } from "@/types/improvement-task"

export const dynamic = "force-dynamic"

const sourceOptions: Array<{ value: ActionItemSource; label: string }> = [
  { value: "data_quality", label: "Data quality" },
  { value: "improvement_task", label: "Improvement tasks" },
  { value: "recommendation", label: "Recommendations" },
  { value: "performance_insight", label: "Performance insights" },
  { value: "draft", label: "Drafts" },
  { value: "product", label: "Products" },
  { value: "campaign_link", label: "Campaign links" },
  { value: "affiliate_program", label: "Affiliate programs" },
]

const priorityOptions: Array<{ value: ActionItemPriority; label: string }> = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "info", label: "Info" },
]

function filterHref(params: {
  source?: ActionItemSource
  priority?: ActionItemPriority
}) {
  const query = new URLSearchParams()
  if (params.source) query.set("source", params.source)
  if (params.priority) query.set("priority", params.priority)
  const suffix = query.toString()
  return suffix ? `/dashboard/command-center?${suffix}` : "/dashboard/command-center"
}

function zeroSummary(): OperatorActionSummary {
  return {
    total: 0,
    info: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
    bySource: {
      data_quality: 0,
      improvement_task: 0,
      recommendation: 0,
      performance_insight: 0,
      draft: 0,
      product: 0,
      campaign_link: 0,
      affiliate_program: 0,
    },
  }
}

function zeroDataQualitySummary(): DataQualitySummary {
  return {
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
    byArea: {
      products: 0,
      drafts: 0,
      campaign_links: 0,
      performance: 0,
      improvements: 0,
      saved_views: 0,
      affiliate_programs: 0,
    },
  }
}

export default async function CommandCenterPage({
  searchParams,
}: {
  searchParams?: Promise<{
    source?: string
    priority?: string
  }>
}) {
  const params = (await searchParams) ?? {}
  const selectedSource = sourceOptions.some((option) => option.value === params.source)
    ? (params.source as ActionItemSource)
    : undefined
  const selectedPriority = priorityOptions.some((option) => option.value === params.priority)
    ? (params.priority as ActionItemPriority)
    : undefined

  let actionItems: ActionItem[] = []
  let summary = zeroSummary()
  let improvementSummary: ImprovementTaskSummary = {
    total: 0,
    open: 0,
    inProgress: 0,
    done: 0,
    dismissed: 0,
    critical: 0,
  }
  let dataQualitySummary = zeroDataQualitySummary()
  let draftsNeedingReview = 0
  let pendingApprovals = 0
  let pageError: string | null = null

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    pageError = `${readiness.summary} ${readiness.guidance}`
  } else {
    try {
      const [items, actionSummary, improvements, dataQuality, draftRows, approvalCount] = await Promise.all([
        getOperatorActionItems(),
        getOperatorActionSummary(),
        getImprovementTaskSummary(),
        getDataQualitySummary(),
        listDrafts({ status: "draft" }),
        countPendingApprovalItems(),
      ])
      actionItems = items
      summary = actionSummary
      improvementSummary = improvements
      dataQualitySummary = dataQuality
      draftsNeedingReview = draftRows.length
      pendingApprovals = approvalCount
    } catch (error) {
      pageError =
        error instanceof Error
          ? error.message
          : "Unable to load operator action items from Supabase."
    }
  }

  const filteredItems = actionItems.filter((item) => {
    if (selectedSource && item.source !== selectedSource) return false
    if (selectedPriority && item.priority !== selectedPriority) return false
    return true
  })

  return (
    <>
      <PageHeader
        eyebrow="Stage 32"
        title="Command Center"
        description="One advisory surface for the next manual operator actions across products, drafts, campaigns, performance, quality, recommendations, and improvements."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/data-quality"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Data quality
            </Link>
            <Link
              href="/dashboard/improvements"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Improvement queue
            </Link>
          </div>
        }
      />

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Command className="size-4" />
            Advisory command center
          </CardTitle>
          <CardDescription>
            This page aggregates manual next actions only. It does not auto-fix, auto-generate, auto-approve, auto-optimize, queue WordPress, or publish.
          </CardDescription>
        </CardHeader>
      </Card>

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to load command center</CardTitle>
            <CardDescription className="text-destructive/80">{pageError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Critical actions"
          value={String(summary.critical)}
          detail="Highest-priority manual issues across all sources."
          icon={<ShieldAlert className="size-4" />}
        />
        <StatCard
          label="High priority"
          value={String(summary.high)}
          detail="Warnings and urgent workflow items."
          icon={<AlertTriangle className="size-4" />}
        />
        <StatCard
          label="Open tasks"
          value={String(improvementSummary.open + improvementSummary.inProgress)}
          detail={`${improvementSummary.critical} critical improvement task(s).`}
          icon={<ClipboardList className="size-4" />}
        />
        <StatCard
          label="Data quality"
          value={String(dataQualitySummary.total)}
          detail={`${dataQualitySummary.critical} critical quality issue(s).`}
          icon={<ShieldAlert className="size-4" />}
        />
        <StatCard
          label="Drafts to review"
          value={String(draftsNeedingReview)}
          detail="Drafts waiting for human approval or rejection."
          icon={<FileText className="size-4" />}
        />
        <StatCard
          label="Pending approvals"
          value={String(pendingApprovals)}
          detail="Actions waiting for operator approval before execution."
          icon={<CheckSquare className="size-4" />}
        />
      </section>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter the advisory list by source or priority. Filters do not mutate data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href={filterHref({ priority: selectedPriority })}
              className={cn(buttonVariants({ variant: selectedSource ? "outline" : "default", size: "sm" }))}
            >
              All sources
            </Link>
            {sourceOptions.map((source) => (
              <Link
                key={source.value}
                href={filterHref({ source: source.value, priority: selectedPriority })}
                className={cn(buttonVariants({ variant: selectedSource === source.value ? "default" : "outline", size: "sm" }))}
              >
                {source.label}
                <Badge variant="secondary">{summary.bySource[source.value]}</Badge>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={filterHref({ source: selectedSource })}
              className={cn(buttonVariants({ variant: selectedPriority ? "outline" : "default", size: "sm" }))}
            >
              All priorities
            </Link>
            {priorityOptions.map((priority) => (
              <Link
                key={priority.value}
                href={filterHref({ source: selectedSource, priority: priority.value })}
                className={cn(buttonVariants({ variant: selectedPriority === priority.value ? "default" : "outline", size: "sm" }))}
              >
                {priority.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <ActionItemsPanel
        title="Manual action list"
        description={`${filteredItems.length} item${filteredItems.length === 1 ? "" : "s"} match the current filters.`}
        items={filteredItems}
      />

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Critical action view</CardTitle>
            <CardDescription>
              Shortcut view for the highest-risk manual work. This is intentionally a direct command-center filter, not a mutating saved view.
            </CardDescription>
          </div>
          <Link
            href="/dashboard/command-center?priority=critical"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Show critical actions
            <ArrowRight className="size-4" />
          </Link>
        </CardHeader>
      </Card>
    </>
  )
}
