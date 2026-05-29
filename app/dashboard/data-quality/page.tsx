import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  Info,
  ShieldAlert,
} from "lucide-react"

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
import { Separator } from "@/components/ui/separator"
import { getDataQualityIssues, getDataQualitySummary } from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type {
  DataQualityArea,
  DataQualityIssue,
  DataQualitySeverity,
  DataQualitySummary,
} from "@/types/data-quality"

export const dynamic = "force-dynamic"

const areaOptions: Array<{ value: DataQualityArea; label: string }> = [
  { value: "products", label: "Products" },
  { value: "drafts", label: "Drafts" },
  { value: "campaign_links", label: "Campaign links" },
  { value: "performance", label: "Performance" },
  { value: "improvements", label: "Improvement tasks" },
  { value: "saved_views", label: "Saved views" },
]

const severityOptions: Array<{ value: DataQualitySeverity; label: string }> = [
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
]

const severityVariantMap = {
  critical: "destructive",
  warning: "secondary",
  info: "outline",
} as const

const areaLabels = Object.fromEntries(
  areaOptions.map((option) => [option.value, option.label]),
) as Record<DataQualityArea, string>

function filterHref(params: {
  area?: DataQualityArea
  severity?: DataQualitySeverity
}) {
  const query = new URLSearchParams()
  if (params.area) query.set("area", params.area)
  if (params.severity) query.set("severity", params.severity)
  const suffix = query.toString()
  return suffix ? `/dashboard/data-quality?${suffix}` : "/dashboard/data-quality"
}

function IssueCard({ issue }: { issue: DataQualityIssue }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={severityVariantMap[issue.severity]}>
              {issue.severity}
            </Badge>
            <Badge variant="outline">{areaLabels[issue.area]}</Badge>
            <span className="text-xs text-muted-foreground">
              {issue.relatedEntityType}: {issue.relatedEntityId}
            </span>
          </div>
          <div>
            <h3 className="font-medium">{issue.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{issue.description}</p>
          </div>
        </div>
        <Link
          href={issue.actionHref}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          {issue.actionLabel}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}

function GroupedIssues(props: {
  area: DataQualityArea
  issues: DataQualityIssue[]
}) {
  if (props.issues.length === 0) return null

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{areaLabels[props.area]}</CardTitle>
            <CardDescription>
              {props.issues.length} issue{props.issues.length === 1 ? "" : "s"} detected in this area.
            </CardDescription>
          </div>
          <Link
            href={filterHref({ area: props.area })}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Filter area
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </CardContent>
    </Card>
  )
}

function EmptyQualityState() {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          No data quality issues found
        </CardTitle>
        <CardDescription>
          The current persisted data did not trigger any deterministic quality checks.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Link href="/dashboard/products" className={cn(buttonVariants({ variant: "outline" }))}>
          Open products
        </Link>
        <Link href="/dashboard/reports" className={cn(buttonVariants({ variant: "ghost" }))}>
          Open reports
        </Link>
      </CardContent>
    </Card>
  )
}

export default async function DataQualityPage({
  searchParams,
}: {
  searchParams?: Promise<{
    area?: string
    severity?: string
  }>
}) {
  const params = (await searchParams) ?? {}
  const selectedArea = areaOptions.some((option) => option.value === params.area)
    ? (params.area as DataQualityArea)
    : undefined
  const selectedSeverity = severityOptions.some((option) => option.value === params.severity)
    ? (params.severity as DataQualitySeverity)
    : undefined

  let issues: DataQualityIssue[] = []
  let summary: DataQualitySummary = {
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
  let pageError: string | null = null

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    pageError = `${readiness.summary} ${readiness.guidance}`
  } else {
    try {
      ;[issues, summary] = await Promise.all([
        getDataQualityIssues(),
        getDataQualitySummary(),
      ])
    } catch (error) {
      pageError =
        error instanceof Error
          ? error.message
          : "Unable to load data quality checks from Supabase."
    }
  }

  const filteredIssues = issues.filter((issue) => {
    if (selectedArea && issue.area !== selectedArea) return false
    if (selectedSeverity && issue.severity !== selectedSeverity) return false
    return true
  })

  const groupedIssues = areaOptions.map((area) => ({
    area: area.value,
    issues: filteredIssues.filter((issue) => issue.area === area.value),
  }))

  return (
    <>
      <PageHeader
        eyebrow="Stage 31"
        title="Data Quality Center"
        description="Read-only checks for incomplete, inconsistent, duplicate, or suspicious data across the operating workflow."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/reports" className={cn(buttonVariants({ variant: "outline" }))}>
              Open reports
            </Link>
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost" }))}>
              Back to dashboard
            </Link>
          </div>
        }
      />

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-4" />
            Read-only quality checks
          </CardTitle>
          <CardDescription>
            This center only reports issues and links to manual fix pages. It does not auto-fix, auto-generate, auto-approve, auto-optimize, or publish anything.
          </CardDescription>
        </CardHeader>
      </Card>

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to load data quality checks</CardTitle>
            <CardDescription className="text-destructive/80">
              {pageError}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total issues"
          value={String(summary.total)}
          detail="All deterministic data quality findings currently visible."
          icon={<DatabaseZap className="size-4" />}
        />
        <StatCard
          label="Critical"
          value={String(summary.critical)}
          detail="Blocking contradictions or missing core data that should be reviewed first."
          icon={<ShieldAlert className="size-4" />}
        />
        <StatCard
          label="Warnings"
          value={String(summary.warning)}
          detail="Operational issues that can reduce reliability or reporting quality."
          icon={<AlertTriangle className="size-4" />}
        />
        <StatCard
          label="Info"
          value={String(summary.info)}
          detail="Completeness and cleanup suggestions for better workflow data."
          icon={<Info className="size-4" />}
        />
      </section>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Narrow findings by severity or workflow area. Filters do not change data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href={filterHref({ severity: selectedSeverity })}
              className={cn(buttonVariants({ variant: selectedArea ? "outline" : "default", size: "sm" }))}
            >
              All areas
            </Link>
            {areaOptions.map((area) => (
              <Link
                key={area.value}
                href={filterHref({ area: area.value, severity: selectedSeverity })}
                className={cn(buttonVariants({ variant: selectedArea === area.value ? "default" : "outline", size: "sm" }))}
              >
                {area.label}
                <Badge variant="secondary">{summary.byArea[area.value]}</Badge>
              </Link>
            ))}
          </div>
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Link
              href={filterHref({ area: selectedArea })}
              className={cn(buttonVariants({ variant: selectedSeverity ? "outline" : "default", size: "sm" }))}
            >
              All severities
            </Link>
            {severityOptions.map((severity) => (
              <Link
                key={severity.value}
                href={filterHref({ area: selectedArea, severity: severity.value })}
                className={cn(buttonVariants({ variant: selectedSeverity === severity.value ? "default" : "outline", size: "sm" }))}
              >
                {severity.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {filteredIssues.length === 0 && !pageError ? <EmptyQualityState /> : null}

      <section className="space-y-4">
        {groupedIssues.map((group) => (
          <GroupedIssues
            key={group.area}
            area={group.area}
            issues={group.issues}
          />
        ))}
      </section>
    </>
  )
}
