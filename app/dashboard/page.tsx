import Link from "next/link"
import type { ReactNode } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  CheckSquare,
  ClipboardList,
  Command,
  Clock3,
  ExternalLink,
  FileBarChart,
  FileText,
  Package2,
  ShieldAlert,
  Send,
  Workflow,
  XCircle,
} from "lucide-react"

import { DemoDataCard } from "@/components/dashboard/demo-data-card"
import { ActionItemsPanel } from "@/components/dashboard/action-items-panel"
import { LaunchChecklistCard } from "@/components/dashboard/launch-checklist-card"
import { MetricPanel } from "@/components/dashboard/metric-panel"
import { ModeBanner } from "@/components/dashboard/mode-banner"
import { OnboardingChecklistCard } from "@/components/dashboard/onboarding-checklist"
import { OperatorLoopCard } from "@/components/dashboard/operator-loop-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { RecommendationsPanel } from "@/components/dashboard/recommendations-panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { TrialReadinessCard } from "@/components/dashboard/trial-readiness-card"
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
import {
  countPendingApprovalItems,
  getCampaignLinkSummary,
  getDashboardNeedsAttention,
  getDashboardSummary,
  getDataQualitySummary,
  getImprovementTaskSummary,
  getOperatorActionItems,
  getPerformanceSummary,
  getRecommendationSummary,
  listRecommendations,
  listRecentDrafts,
  listRecentPerformanceMetrics,
  listRecentPublishingJobs,
} from "@/lib/db"
import { getOperatorExperience } from "@/lib/system"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn, formatDateTime, truncate } from "@/lib/utils"
import type { Draft } from "@/types/draft"
import type { PerformanceMetric, PerformanceSummary } from "@/types/performance"
import type { PublishingJob } from "@/types/publishing"
import type { CampaignLinkSummary } from "@/types/campaign-link"
import type { DataQualitySummary } from "@/types/data-quality"
import type { ActionItem } from "@/types/action-item"
import type { ImprovementTaskSummary } from "@/types/improvement-task"
import type { Recommendation, RecommendationSummary } from "@/types/recommendation"
import type { Product } from "@/types/product"
import type { OperatorExperience } from "@/types/system"

export const dynamic = "force-dynamic"

const publishingStatusVariantMap = {
  pending: "secondary",
  sent_to_wordpress: "default",
  failed: "destructive",
} as const

const draftStatusVariantMap = {
  draft: "secondary",
  approved: "default",
  rejected: "destructive",
} as const

const integrationStatusVariantMap = {
  configured: "default",
  missing: "destructive",
  placeholder: "secondary",
  invalid: "destructive",
} as const

function RecentDraftsSection({ drafts }: { drafts: Draft[] }) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Recent drafts</CardTitle>
          <CardDescription>Latest AI outputs and approval state.</CardDescription>
        </div>
        <Link
          href="/dashboard/drafts"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Review drafts
          <ArrowRight className="size-4" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No drafts yet. Generate them from the products table.
          </p>
        ) : (
          drafts.map((draft, index) => (
            <div key={draft.id}>
              {index > 0 ? <Separator className="mb-4" /> : null}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {draft.title ?? `${draft.productName} ${draft.templateType.replace("_", " ")}`}
                  </p>
                  <Badge variant={draftStatusVariantMap[draft.status]}>{draft.status}</Badge>
                  <Badge variant="outline">{draft.templateType.replace("_", " ")}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {draft.productName} - {formatDateTime(draft.createdAt)}
                </p>
                <p className="text-sm text-muted-foreground">{truncate(draft.body, 160)}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function RecentPublishingJobsSection({ jobs }: { jobs: PublishingJob[] }) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Recent publishing jobs</CardTitle>
          <CardDescription>Latest WordPress handoff attempts and queue state.</CardDescription>
        </div>
        <Link
          href="/dashboard/publishing"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Open queue
          <ArrowRight className="size-4" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No publishing jobs yet. Approved drafts will appear here after queueing.
          </p>
        ) : (
          jobs.map((job, index) => (
            <div key={job.id}>
              {index > 0 ? <Separator className="mb-4" /> : null}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {job.draftTitle ?? `${job.productName} ${job.templateType.replace("_", " ")}`}
                  </p>
                  <Badge variant={publishingStatusVariantMap[job.status]}>{job.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {job.productName} - {formatDateTime(job.createdAt)}
                </p>
                {job.wordpressPostId ? (
                  <p className="text-sm text-muted-foreground">
                    WordPress post ID: {job.wordpressPostId}
                  </p>
                ) : null}
                {job.errorMessage ? (
                  <p className="text-sm text-destructive">{job.errorMessage}</p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function RecentPerformanceSection(props: {
  records: PerformanceMetric[]
  summary: PerformanceSummary
}) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Performance snapshot</CardTitle>
          <CardDescription>
            Manual click, conversion, and revenue records grouped by channel and product.
          </CardDescription>
        </div>
        <Link
          href="/dashboard/performance"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Open performance
          <ArrowRight className="size-4" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Clicks
            </div>
            <div className="mt-1 text-2xl font-semibold">{props.summary.totalClicks}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Conversions
            </div>
            <div className="mt-1 text-2xl font-semibold">{props.summary.totalConversions}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Revenue
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
              }).format(props.summary.totalRevenue)}
            </div>
          </div>
        </div>

        {props.records.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No performance records yet. Add them from the performance page.
          </p>
        ) : (
          props.records.map((record, index) => (
            <div key={record.id}>
              {index > 0 ? <Separator className="mb-4" /> : null}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{record.productName}</p>
                  <Badge variant="outline">{record.channel}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {record.campaignName ?? "No campaign"} - {record.clicks} clicks
                  {record.conversions !== null ? ` - ${record.conversions} conversions` : ""}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function AttentionCard(props: {
  title: string
  description: string
  count: number
  icon: ReactNode
  actionHref: string
  actionLabel: string
  children: ReactNode
}) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>{props.title}</CardTitle>
            <Badge variant={props.count > 0 ? "destructive" : "secondary"}>{props.count}</Badge>
          </div>
          <CardDescription>{props.description}</CardDescription>
        </div>
        <div className="text-muted-foreground">{props.icon}</div>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.children}
        <Link
          href={props.actionHref}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          {props.actionLabel}
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  )
}

function FailedJobsAttention({ jobs }: { jobs: PublishingJob[] }) {
  const visibleJobs = jobs.slice(0, 5)

  return (
    <AttentionCard
      title="Failed WordPress jobs"
      description="Jobs that need a manual retry after credentials, content, or WordPress-side issues."
      count={jobs.length}
      icon={<XCircle className="size-4" />}
      actionHref="/dashboard/publishing"
      actionLabel="Open publishing queue"
    >
      {visibleJobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No failed jobs right now.</p>
      ) : (
        visibleJobs.map((job, index) => (
          <div key={job.id}>
            {index > 0 ? <Separator className="mb-3" /> : null}
            <div className="space-y-1">
              <p className="font-medium">
                {job.draftTitle ?? `${job.productName} ${job.templateType.replace("_", " ")}`}
              </p>
              <p className="text-sm text-muted-foreground">{job.productName}</p>
              <p className="text-sm text-destructive">{truncate(job.errorMessage ?? "Failed job", 140)}</p>
            </div>
          </div>
        ))
      )}
    </AttentionCard>
  )
}

function ApprovedDraftsAttention({ drafts }: { drafts: Draft[] }) {
  const visibleDrafts = drafts.slice(0, 5)

  return (
    <AttentionCard
      title="Approved drafts not queued"
      description="Approved content that is ready for WordPress draft creation but has not been handed off yet."
      count={drafts.length}
      icon={<Clock3 className="size-4" />}
      actionHref="/dashboard/publishing"
      actionLabel="Queue approved drafts"
    >
      {visibleDrafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No approved drafts are waiting for queueing.</p>
      ) : (
        visibleDrafts.map((draft, index) => (
          <div key={draft.id}>
            {index > 0 ? <Separator className="mb-3" /> : null}
            <div className="space-y-1">
              <p className="font-medium">
                {draft.title ?? `${draft.productName} ${draft.templateType.replace("_", " ")}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {draft.productName} - {draft.templateType.replace("_", " ")}
              </p>
            </div>
          </div>
        ))
      )}
    </AttentionCard>
  )
}

function ProductsWithoutDraftsAttention({ products }: { products: Product[] }) {
  const visibleProducts = products.slice(0, 5)

  return (
    <AttentionCard
      title="Products with no drafts"
      description="Products that were created in Supabase but have not entered the draft workflow yet."
      count={products.length}
      icon={<AlertTriangle className="size-4" />}
      actionHref="/dashboard/products"
      actionLabel="Open products"
    >
      {visibleProducts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Every product has at least one draft.</p>
      ) : (
        visibleProducts.map((product, index) => (
          <div key={product.id}>
            {index > 0 ? <Separator className="mb-3" /> : null}
            <div className="space-y-1">
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-muted-foreground">
                {product.brand ?? "No brand"} - {product.category ?? "No category"}
              </p>
            </div>
          </div>
        ))
      )}
    </AttentionCard>
  )
}

export default async function DashboardPage() {
  let operatorExperience: OperatorExperience = {
    systemStatus: {
      integrations: [],
      configuredCount: 0,
      blockingCount: 0,
    },
    checklist: {
      steps: [],
      completedCount: 0,
      totalCount: 0,
      blockingCount: 0,
    },
    verificationChecklist: {
      steps: [],
      completedCount: 0,
      totalCount: 0,
      blockingCount: 0,
    },
    launchChecklist: {
      steps: [],
      completedCount: 0,
      readyCount: 0,
      totalCount: 0,
      blockingCount: 0,
    },
    trialProgress: {
      completedWorkflowSteps: 0,
      totalWorkflowSteps: 0,
      percentComplete: 0,
      nextActionLabel: "Open system checks",
      nextActionHref: "/dashboard/system",
      summary: "No trial progress has been loaded yet.",
    },
    demoData: {
      isLoaded: false,
      productCount: 0,
      draftCount: 0,
      publishingJobCount: 0,
      performanceRecordCount: 0,
      title: "No demo data detected",
      description: "No seeded demo records were detected.",
      actionLabel: "Open system checks",
      actionHref: "/dashboard/system",
    },
    trialHandoff: {
      ready: false,
      title: "Not ready for staged trial yet",
      description: "Complete the remaining setup and verification steps first.",
      actionLabel: "Review system checks",
      actionHref: "/dashboard/system",
      testOrder: [],
      stagingNotes: [],
    },
    blockers: [],
    mode: {
      mode: "setup",
      title: "Setup mode",
      description: "Core integrations still need to be configured.",
      actionLabel: "Open system checks",
      actionHref: "/dashboard/system",
    },
  }
  let summary = {
    totalProducts: 0,
    activeProducts: 0,
    totalDrafts: 0,
    draftsByStatus: {
      draft: 0,
      approved: 0,
      rejected: 0,
    },
    draftsByTemplateType: {
      review: 0,
      comparison: 0,
      buying_guide: 0,
      social_post: 0,
    },
    totalPublishingJobs: 0,
    publishingJobsByStatus: {
      pending: 0,
      sent_to_wordpress: 0,
      failed: 0,
    },
  }
  let recentDrafts: Draft[] = []
  let recentPublishingJobs: PublishingJob[] = []
  let recentPerformance: PerformanceMetric[] = []
  let recommendations: Recommendation[] = []
  let recommendationSummary: RecommendationSummary = {
    total: 0,
    info: 0,
    warning: 0,
    critical: 0,
  }
  let dataQualitySummary: DataQualitySummary = {
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
  let urgentActionItems: ActionItem[] = []
  let performanceSummary: PerformanceSummary = {
    totalRecords: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    byChannel: [],
    byProduct: [],
  }
  let needsAttention = {
    failedPublishingJobs: [] as PublishingJob[],
    approvedDraftsNotQueued: [] as Draft[],
    productsWithoutDrafts: [] as Product[],
  }
  let improvementSummary: ImprovementTaskSummary = {
    total: 0,
    open: 0,
    inProgress: 0,
    done: 0,
    dismissed: 0,
    critical: 0,
  }
  let campaignLinkSummary: CampaignLinkSummary = {
    total: 0,
    active: 0,
    archived: 0,
    withoutPerformance: 0,
  }
  let pendingApprovals = 0
  let pageError: string | null = null

  try {
    operatorExperience = await getOperatorExperience()
  } catch (error) {
    pageError =
      error instanceof Error ? error.message : "Unable to load setup guidance."
  }

  if (isSupabaseConfigured() && !pageError) {
    try {
      ;[
        summary,
        recentDrafts,
        recentPublishingJobs,
        recentPerformance,
        recommendations,
        recommendationSummary,
        performanceSummary,
        needsAttention,
        improvementSummary,
        campaignLinkSummary,
        dataQualitySummary,
        urgentActionItems,
        pendingApprovals,
      ] = await Promise.all([
        getDashboardSummary(),
        listRecentDrafts(),
        listRecentPublishingJobs(),
        listRecentPerformanceMetrics(),
        listRecommendations({ limit: 8 }),
        getRecommendationSummary(),
        getPerformanceSummary(),
        getDashboardNeedsAttention(),
        getImprovementTaskSummary(),
        getCampaignLinkSummary(),
        getDataQualitySummary(),
        getOperatorActionItems({ limit: 5 }),
        countPendingApprovalItems(),
      ])
    } catch (error) {
      pageError =
        error instanceof Error ? error.message : "Unable to load dashboard data from Supabase."
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Stage 14"
        title="Overview"
        description="A local-first operating surface for setup, product intake, structured draft generation, manual approval, performance tracking, recommendations, and staging launch readiness."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/system"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              System status
            </Link>
            <Link
              href="/dashboard/products/new"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              {summary.totalProducts === 0 ? "Add first product" : "Add product"}
            </Link>
          </div>
        }
      />

      {!isSupabaseConfigured() ? (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardHeader>
            <CardTitle>Supabase is not configured yet</CardTitle>
            <CardDescription className="text-amber-900/80">
              The app is still in setup mode. Open the system page to finish configuration and unblock the first real workflow cycle.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to load dashboard metrics</CardTitle>
            <CardDescription className="text-destructive/80">{pageError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ModeBanner mode={operatorExperience.mode} />
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>Next blockers</CardTitle>
            <CardDescription>
              The shortest list of issues preventing the next operator step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {operatorExperience.blockers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No blocking setup issues are visible right now. Continue with the checklist below.
              </p>
            ) : (
              operatorExperience.blockers.slice(0, 4).map((blocker) => (
                <div
                  key={blocker}
                  className="rounded-lg border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground"
                >
                  {blocker}
                </div>
              ))
            )}
            <Link
              href="/dashboard/system"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Review system checks
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Operator Dashboard</CardTitle>
          <CardDescription>
            Daily one-screen view for products, affiliate programs, manual distribution, approvals, performance, and next actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/dashboard/operator"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            Open Operator Dashboard
            <ArrowRight className="size-4" />
          </Link>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ActionItemsPanel
          title="Command Center"
          description="Top urgent manual actions aggregated from quality checks, recommendations, insights, drafts, products, campaigns, and improvement tasks."
          items={urgentActionItems}
          compact
          actionHref="/dashboard/command-center"
          actionLabel="Open command center"
        />
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Command className="size-4" />
              Critical action view
            </CardTitle>
            <CardDescription>
              Jump straight to the highest-risk manual work. This view is advisory only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/command-center?priority=critical"
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              View critical actions
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <LaunchChecklistCard
          checklist={operatorExperience.launchChecklist}
          progress={operatorExperience.trialProgress}
        />
        <OperatorLoopCard />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <OnboardingChecklistCard checklist={operatorExperience.checklist} />
        <TrialReadinessCard handoff={operatorExperience.trialHandoff} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <DemoDataCard demoData={operatorExperience.demoData} />
        <OnboardingChecklistCard
          checklist={operatorExperience.verificationChecklist}
          title="Staging verification checklist"
          description="Confirm each external and persisted step before treating this as a real trial."
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Integration readiness</CardTitle>
              <CardDescription>
                Configuration state for the services this MVP depends on.
              </CardDescription>
            </div>
            <ShieldAlert className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {operatorExperience.systemStatus.integrations.map((integration) => (
              <div
                key={integration.name}
                className="rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{integration.label}</p>
                  <Badge variant={integrationStatusVariantMap[integration.status]}>
                    {integration.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{integration.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>Setup blockers</CardTitle>
          <CardDescription>
              Missing or placeholder integrations that still need operator setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold">{operatorExperience.systemStatus.blockingCount}</div>
            <p className="text-sm text-muted-foreground">
              Open the system page for connection checks and next-step guidance.
            </p>
            <Link
              href="/dashboard/system"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Review system checks
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total products"
          value={String(summary.totalProducts)}
          detail={`${summary.activeProducts} active products currently available for draft generation.`}
          icon={<Package2 className="size-4" />}
        />
        <StatCard
          label="Total drafts"
          value={String(summary.totalDrafts)}
          detail={`${summary.draftsByStatus.draft} still waiting for human review.`}
          icon={<FileText className="size-4" />}
        />
        <StatCard
          label="Approved drafts"
          value={String(summary.draftsByStatus.approved)}
          detail={`${needsAttention.approvedDraftsNotQueued.length} approved drafts are not yet in the publishing queue.`}
          icon={<Clock3 className="size-4" />}
        />
        <StatCard
          label="Publishing jobs"
          value={String(summary.totalPublishingJobs)}
          detail={`${summary.publishingJobsByStatus.failed} failed jobs currently need attention.`}
          icon={<Send className="size-4" />}
        />
        <StatCard
          label="Critical recommendations"
          value={String(recommendationSummary.critical)}
          detail={`${recommendationSummary.warning} warning items and ${recommendationSummary.info} info items are also open.`}
          icon={<ShieldAlert className="size-4" />}
        />
        <StatCard
          label="Improvement tasks"
          value={String(improvementSummary.open + improvementSummary.inProgress)}
          detail={`${improvementSummary.open} open, ${improvementSummary.inProgress} in progress, ${improvementSummary.done} done. ${improvementSummary.critical} critical.`}
          icon={<ClipboardList className="size-4" />}
        />
        <StatCard
          label="Campaign links"
          value={String(campaignLinkSummary.active)}
          detail={`${campaignLinkSummary.total} total · ${campaignLinkSummary.withoutPerformance} without performance records.`}
          icon={<ExternalLink className="size-4" />}
        />
        <StatCard
          label="Data quality issues"
          value={String(dataQualitySummary.total)}
          detail={`${dataQualitySummary.critical} critical, ${dataQualitySummary.warning} warning, ${dataQualitySummary.info} info findings.`}
          icon={<AlertTriangle className="size-4" />}
        />
        <StatCard
          label="Pending approvals"
          value={String(pendingApprovals)}
          detail={pendingApprovals > 0 ? "Actions waiting for operator approval." : "No actions waiting for approval."}
          icon={<CheckSquare className="size-4" />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <MetricPanel
          title="Products"
          description="Current intake and activation state."
          icon={<Package2 className="size-4" />}
          actionHref="/dashboard/products"
          actionLabel="View products"
          rows={[
            {
              label: "Total products",
              value: summary.totalProducts,
              href: "/dashboard/products",
            },
            {
              label: "Active products",
              value: summary.activeProducts,
              href: "/dashboard/products",
              variant: "default",
            },
            {
              label: "Without drafts",
              value: needsAttention.productsWithoutDrafts.length,
              href: "/dashboard/products",
              variant:
                needsAttention.productsWithoutDrafts.length > 0 ? "destructive" : "secondary",
            },
          ]}
        />

        <MetricPanel
          title="Draft workflow"
          description="Approval state across all persisted drafts."
          icon={<Workflow className="size-4" />}
          actionHref="/dashboard/drafts"
          actionLabel="Open drafts"
          rows={[
            {
              label: "Draft",
              value: summary.draftsByStatus.draft,
              href: "/dashboard/drafts?status=draft",
            },
            {
              label: "Approved",
              value: summary.draftsByStatus.approved,
              href: "/dashboard/drafts?status=approved",
              variant: "default",
            },
            {
              label: "Rejected",
              value: summary.draftsByStatus.rejected,
              href: "/dashboard/drafts?status=rejected",
              variant: summary.draftsByStatus.rejected > 0 ? "destructive" : "secondary",
            },
          ]}
        />

        <MetricPanel
          title="Template mix"
          description="How current draft inventory is distributed."
          icon={<FileText className="size-4" />}
          actionHref="/dashboard/drafts"
          actionLabel="Filter drafts by template"
          rows={[
            {
              label: "Review",
              value: summary.draftsByTemplateType.review,
              href: "/dashboard/drafts?template=review",
            },
            {
              label: "Comparison",
              value: summary.draftsByTemplateType.comparison,
              href: "/dashboard/drafts?template=comparison",
            },
            {
              label: "Buying guide",
              value: summary.draftsByTemplateType.buying_guide,
              href: "/dashboard/drafts?template=buying_guide",
            },
            {
              label: "Social post",
              value: summary.draftsByTemplateType.social_post,
              href: "/dashboard/drafts?template=social_post",
            },
          ]}
        />

        <MetricPanel
          title="Publishing queue"
          description="WordPress handoff job state. Posts remain drafts there."
          icon={<Send className="size-4" />}
          actionHref="/dashboard/publishing"
          actionLabel="Open publishing queue"
          rows={[
            {
              label: "Queued jobs",
              value: summary.publishingJobsByStatus.pending,
              href: "/dashboard/publishing",
            },
            {
              label: "Succeeded jobs",
              value: summary.publishingJobsByStatus.sent_to_wordpress,
              href: "/dashboard/publishing",
              variant: "default",
            },
            {
              label: "Failed jobs",
              value: summary.publishingJobsByStatus.failed,
              href: "/dashboard/publishing",
              variant:
                summary.publishingJobsByStatus.failed > 0 ? "destructive" : "secondary",
            },
          ]}
        />

        <MetricPanel
          title="Blocked items"
          description="Work that cannot progress without manual action."
          icon={<AlertTriangle className="size-4" />}
          actionHref="/dashboard/publishing"
          actionLabel="Resolve blocked items"
          rows={[
            {
              label: "Failed WordPress jobs",
              value: needsAttention.failedPublishingJobs.length,
              href: "/dashboard/publishing",
              variant:
                needsAttention.failedPublishingJobs.length > 0 ? "destructive" : "secondary",
            },
            {
              label: "Approved not queued",
              value: needsAttention.approvedDraftsNotQueued.length,
              href: "/dashboard/publishing",
              variant:
                needsAttention.approvedDraftsNotQueued.length > 0 ? "destructive" : "secondary",
            },
            {
              label: "Products with no drafts",
              value: needsAttention.productsWithoutDrafts.length,
              href: "/dashboard/products",
              variant:
                needsAttention.productsWithoutDrafts.length > 0 ? "destructive" : "secondary",
            },
          ]}
        />

        <MetricPanel
          title="Performance"
          description="Manual outcome tracking across products and channels."
          icon={<FileText className="size-4" />}
          actionHref="/dashboard/performance"
          actionLabel="Open performance"
          rows={[
            {
              label: "Records",
              value: performanceSummary.totalRecords,
              href: "/dashboard/performance",
            },
            {
              label: "Clicks",
              value: performanceSummary.totalClicks,
              href: "/dashboard/performance",
              variant: "default",
            },
            {
              label: "Conversions",
              value: performanceSummary.totalConversions,
              href: "/dashboard/performance",
              variant: "default",
            },
          ]}
        />

      </section>

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <MetricPanel
          title="Recommendations"
          description="Deterministic next actions derived from current product, draft, publishing, and performance data."
          icon={<ShieldAlert className="size-4" />}
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

        <RecommendationsPanel
          title="Needs action"
          description="High-signal recommendations based on the current stored state."
          recommendations={recommendations}
          showQueueAction
          returnTo="/dashboard"
          emptyTitle="No recommendations right now"
          emptyDescription="Current workflow data does not surface any actionable issues."
          emptyActions={[
            { label: "Open products", href: "/dashboard/products", variant: "outline" },
            { label: "Review checklist", href: "/dashboard/system", variant: "ghost" },
          ]}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <RecentDraftsSection drafts={recentDrafts} />
        <RecentPublishingJobsSection jobs={recentPublishingJobs} />
      </section>

      <section className="grid gap-4">
        <RecentPerformanceSection
          records={recentPerformance}
          summary={performanceSummary}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileBarChart className="size-4" />
                Reports and export
              </CardTitle>
              <CardDescription>
                View read-only reports for products, campaigns, drafts, and improvement tasks. Export any report as CSV.
              </CardDescription>
            </div>
            <Link
              href="/dashboard/reports"
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              Open reports
              <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="size-4" />
                Saved views
              </CardTitle>
              <CardDescription>
                Quick-access filter presets for products, drafts, performance, campaigns, and tasks.
              </CardDescription>
            </div>
            <Link
              href="/dashboard/saved-views"
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              Open views
              <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4" />
                Data quality
              </CardTitle>
              <CardDescription>
                Find incomplete, inconsistent, duplicate, or suspicious data without changing records.
              </CardDescription>
            </div>
            <Link
              href="/dashboard/data-quality"
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              Open quality center
              <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Needs attention</h2>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <FailedJobsAttention jobs={needsAttention.failedPublishingJobs} />
          <ApprovedDraftsAttention drafts={needsAttention.approvedDraftsNotQueued} />
          <ProductsWithoutDraftsAttention products={needsAttention.productsWithoutDrafts} />
        </div>
      </section>
    </>
  )
}
