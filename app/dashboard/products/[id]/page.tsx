import Link from "next/link"
import {
  Activity,
  Archive,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Upload,
  XCircle,
} from "lucide-react"

import { archiveCampaignLinkAction } from "@/app/dashboard/campaign-links/actions"
import { updateTaskStatusAction } from "@/app/dashboard/improvements/actions"
import { AffiliateProgramList } from "@/components/affiliate-programs/affiliate-program-list"
import { PageHeader } from "@/components/dashboard/page-header"
import { ClaudePromptHelper } from "@/components/products/claude-prompt-helper"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  buildProductWorkspaceSummary,
  getProductById,
  getProductPerformanceSignals,
  listAffiliateProgramsForProduct,
  listCampaignLinksForProduct,
  listDraftsForProduct,
  listImprovementTasksForProduct,
  listPerformanceRecordsForProduct,
  listRecommendations,
} from "@/lib/db"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn, formatCurrency, formatDateTime, formatPercent, truncate } from "@/lib/utils"

export const dynamic = "force-dynamic"

const draftStatusVariant = {
  draft: "secondary",
  needs_review: "secondary",
  approved: "default",
  needs_changes: "outline",
  rejected: "destructive",
} as const

const taskPriorityVariant = {
  critical: "destructive",
  high: "secondary",
  medium: "outline",
  low: "outline",
} as const

const taskStatusVariant = {
  open: "secondary",
  in_progress: "default",
  done: "outline",
  dismissed: "outline",
} as const

const signalVariantMap = {
  converting: "default",
  getting_clicks: "secondary",
  no_conversions: "destructive",
  needs_refresh: "secondary",
  no_data: "outline",
} as const

export default async function ProductWorkspacePage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Product" title="Product Workspace" description="Configure Supabase before viewing products." />
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Supabase is not configured</CardTitle>
          </CardHeader>
        </Card>
      </>
    )
  }

  const product = await getProductById(id)

  if (!product) {
    return (
      <>
        <PageHeader eyebrow="Product" title="Product not found" description="The requested product does not exist." />
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Product not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/products" className={cn(buttonVariants({ variant: "outline" }))}>
              Back to products
            </Link>
          </CardContent>
        </Card>
      </>
    )
  }

  const [drafts, records, tasks, campaignLinks, affiliatePrograms, allSignals, recommendations] = await Promise.all([
    listDraftsForProduct(id),
    listPerformanceRecordsForProduct(id),
    listImprovementTasksForProduct(id),
    listCampaignLinksForProduct(id),
    listAffiliateProgramsForProduct(id),
    getProductPerformanceSignals(),
    listRecommendations({ limit: 20 }),
  ])

  const summary = buildProductWorkspaceSummary({ drafts, records, tasks })
  const signal = allSignals.get(id) ?? null
  const productRecommendations = recommendations.filter(
    (r) => r.title.includes(product.name) || r.actionHref.includes(product.id),
  )

  const channelMap = new Map<string, { clicks: number; conversions: number; revenue: number }>()
  for (const r of records) {
    const cs = channelMap.get(r.channel) ?? { clicks: 0, conversions: 0, revenue: 0 }
    cs.clicks += r.clicks
    cs.conversions += r.conversions ?? 0
    cs.revenue += r.revenue ?? 0
    channelMap.set(r.channel, cs)
  }

  const activeTasks = tasks.filter((t) => t.status === "open" || t.status === "in_progress")
  const activeCampaignLinks = campaignLinks.filter((l) => l.status === "active")

  return (
    <>
      <PageHeader
        eyebrow="Product workspace"
        title={product.name}
        description={`${product.brand ?? "No brand"} · ${product.category ?? "No category"} · ${product.slug}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/drafts/new" className={cn(buttonVariants({ variant: "default" }))}>
              <Plus className="size-4" />
              Create draft
            </Link>
            <Link
              href={`/dashboard/performance#record-performance`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Record performance
            </Link>
            <Link href="/dashboard/products" className={cn(buttonVariants({ variant: "ghost" }))}>
              Back to products
            </Link>
          </div>
        }
      />

      {/* Summary card */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Status</div>
              <div className="flex items-center gap-2">
                <Badge variant={product.status === "active" ? "default" : "secondary"}>{product.status}</Badge>
                {signal ? (
                  <Badge variant={signalVariantMap[signal.signal]}>{signal.label}</Badge>
                ) : null}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Target keyword</div>
              <p className="text-sm font-medium">{product.targetKeyword ?? "None"}</p>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Drafts</div>
              <p className="text-sm font-medium">
                {summary.draftCount} total · {summary.approvedDraftCount} approved · {summary.pendingDraftCount} pending
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Performance</div>
              <p className="text-sm font-medium">
                {summary.totalClicks} clicks · {summary.totalConversions} conversions · ${summary.totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_400px]">
        {/* Left column */}
        <div className="space-y-4">
          {/* Drafts section */}
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-4" />
                  Drafts
                </CardTitle>
                <CardDescription>
                  {drafts.length === 0
                    ? "No drafts for this product yet."
                    : `${drafts.length} draft${drafts.length === 1 ? "" : "s"} · ${summary.approvedDraftCount} approved`}
                </CardDescription>
              </div>
              <Link href="/dashboard/drafts/new" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                <Plus className="size-3.5" />
                New draft
              </Link>
            </CardHeader>
            {drafts.length > 0 ? (
              <CardContent className="space-y-3">
                {drafts.map((draft, index) => (
                  <div key={draft.id}>
                    {index > 0 ? <Separator className="mb-3" /> : null}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm">
                            {draft.title ?? `${draft.templateType.replace("_", " ")}`}
                          </span>
                          <Badge variant={draftStatusVariant[draft.status]}>{draft.status}</Badge>
                          <Badge variant="outline" className="text-xs">{draft.templateType.replace("_", " ")}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDateTime(draft.createdAt)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Link
                          href={`/dashboard/drafts/${draft.id}/review`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 text-xs")}
                        >
                          Review
                        </Link>
                        <Link
                          href={`/dashboard/drafts/${draft.id}/edit`}
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}
                        >
                          <Pencil className="size-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            ) : null}
          </Card>

          {/* Performance section */}
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="size-4" />
                  Performance
                </CardTitle>
                <CardDescription>
                  {records.length === 0
                    ? "No performance records for this product yet."
                    : `${records.length} record${records.length === 1 ? "" : "s"} · ${summary.totalClicks} clicks · ${summary.totalConversions} conversions`}
                </CardDescription>
              </div>
              <Link
                href={`/dashboard/performance?product=${encodeURIComponent(id)}`}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                View all
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {channelMap.size > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">By channel</div>
                  {Array.from(channelMap.entries()).map(([ch, data]) => (
                    <div key={ch} className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{ch}</span>
                      <span className="text-muted-foreground">
                        {data.clicks} clicks · {data.conversions} conv · ${data.revenue.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              {records.length > 0 ? (
                <>
                  <Separator />
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Recent records</div>
                  {records.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{r.channel}</Badge>
                        <span className="text-muted-foreground">{r.campaignName ?? "No campaign"}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {r.clicks} clicks · {formatDateTime(r.recordedAt)}
                      </span>
                    </div>
                  ))}
                </>
              ) : null}
            </CardContent>
          </Card>

          {/* Improvement tasks section */}
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="size-4" />
                  Improvement tasks
                </CardTitle>
                <CardDescription>
                  {activeTasks.length === 0
                    ? "No active improvement tasks for this product."
                    : `${activeTasks.length} active task${activeTasks.length === 1 ? "" : "s"}`}
                </CardDescription>
              </div>
              <Link
                href={`/dashboard/improvements`}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                View all
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            {activeTasks.length > 0 ? (
              <CardContent className="space-y-3">
                {activeTasks.map((task, index) => (
                  <div key={task.id}>
                    {index > 0 ? <Separator className="mb-3" /> : null}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{task.title}</span>
                          <Badge variant={taskPriorityVariant[task.priority]} className="text-xs">{task.priority}</Badge>
                          <Badge variant={taskStatusVariant[task.status]} className="text-xs">{task.status.replace("_", " ")}</Badge>
                        </div>
                        {task.suggestedAction ? (
                          <p className="text-xs text-muted-foreground">Suggested: {task.suggestedAction}</p>
                        ) : null}
                      </div>
                      <div className="flex gap-1">
                        {task.status === "open" ? (
                          <form action={updateTaskStatusAction}>
                            <input type="hidden" name="taskId" value={task.id} />
                            <input type="hidden" name="status" value="in_progress" />
                            <Button type="submit" variant="outline" size="sm" className="h-7 text-xs">Start</Button>
                          </form>
                        ) : null}
                        {task.status === "in_progress" ? (
                          <form action={updateTaskStatusAction}>
                            <input type="hidden" name="taskId" value={task.id} />
                            <input type="hidden" name="status" value="done" />
                            <Button type="submit" variant="outline" size="sm" className="h-7 text-xs">
                              <CheckCircle2 className="size-3" />
                              Done
                            </Button>
                          </form>
                        ) : null}
                        {task.status !== "done" && task.status !== "dismissed" ? (
                          <form action={updateTaskStatusAction}>
                            <input type="hidden" name="taskId" value={task.id} />
                            <input type="hidden" name="status" value="dismissed" />
                            <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
                              <XCircle className="size-3" />
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            ) : null}
          </Card>

          {/* Campaign links section */}
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="size-4" />
                  Campaign links
                </CardTitle>
                <CardDescription>
                  {activeCampaignLinks.length === 0
                    ? "No active campaign links for this product."
                    : `${activeCampaignLinks.length} active link${activeCampaignLinks.length === 1 ? "" : "s"}`}
                </CardDescription>
              </div>
              <Link
                href={`/dashboard/campaign-links#create-campaign-link`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Plus className="size-3.5" />
                New link
              </Link>
            </CardHeader>
            {activeCampaignLinks.length > 0 ? (
              <CardContent className="space-y-3">
                {activeCampaignLinks.map((link, index) => (
                  <div key={link.id}>
                    {index > 0 ? <Separator className="mb-3" /> : null}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{link.name}</span>
                          <Badge variant="outline" className="text-xs">{link.channel}</Badge>
                          {link.campaignName ? (
                            <Badge variant="outline" className="text-xs">{link.campaignName}</Badge>
                          ) : null}
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Copy final URL">
                          <Copy className="size-3" />
                          <span className="max-w-[280px] truncate font-mono">{link.finalUrl}</span>
                        </span>
                      </div>
                      <form action={archiveCampaignLinkAction}>
                        <input type="hidden" name="linkId" value={link.id} />
                        <input type="hidden" name="status" value="archived" />
                        <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
                          <Archive className="size-3" />
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
              </CardContent>
            ) : null}
          </Card>

          {/* Affiliate programs section */}
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-4" />
                  Affiliate programs
                </CardTitle>
                <CardDescription>
                  {affiliatePrograms.length === 0
                    ? "No affiliate programs tracked for this product."
                    : `${affiliatePrograms.length} program${affiliatePrograms.length === 1 ? "" : "s"} tracked`}
                </CardDescription>
              </div>
              <Link
                href="/dashboard/affiliate-programs#create-affiliate-program"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Plus className="size-3.5" />
                Add program
              </Link>
            </CardHeader>
            {affiliatePrograms.length > 0 ? (
              <CardContent>
                <AffiliateProgramList programs={affiliatePrograms} compact />
              </CardContent>
            ) : null}
          </Card>

          {/* Recommendations */}
          {productRecommendations.length > 0 ? (
            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Recommendations</CardTitle>
                <CardDescription>
                  {productRecommendations.length} recommendation{productRecommendations.length === 1 ? "" : "s"} related to this product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {productRecommendations.map((rec, index) => (
                  <div key={rec.id}>
                    {index > 0 ? <Separator className="mb-3" /> : null}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{rec.title}</span>
                        <Badge variant={rec.severity === "critical" ? "destructive" : rec.severity === "warning" ? "secondary" : "outline"} className="text-xs">
                          {rec.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.description}</p>
                      <Link
                        href={rec.actionHref}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2 text-xs")}
                      >
                        {rec.actionLabel}
                        <ArrowRight className="ml-1 size-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Claude prompt helper */}
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Claude Code prompt</CardTitle>
              <CardDescription>Generate a structured prompt for this product.</CardDescription>
            </CardHeader>
            <CardContent>
              <ClaudePromptHelper product={product} />
            </CardContent>
          </Card>

          {/* Product metadata */}
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Product details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Name</div>
                <p className="mt-1 text-sm">{product.name}</p>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Brand</div>
                <p className="mt-1 text-sm">{product.brand ?? "N/A"}</p>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Category</div>
                <p className="mt-1 text-sm">{product.category ?? "N/A"}</p>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Affiliate URL</div>
                <a
                  href={product.affiliateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  {truncate(product.affiliateUrl, 50)}
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Price</div>
                  <p className="mt-1 text-sm">{formatCurrency(product.price)}</p>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Commission</div>
                  <p className="mt-1 text-sm">{formatPercent(product.commissionRate)}</p>
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Target keyword</div>
                <p className="mt-1 text-sm">{product.targetKeyword ?? "None"}</p>
              </div>
              {product.secondaryKeywords.length > 0 ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Secondary keywords</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {product.secondaryKeywords.map((kw) => (
                      <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Search intent</div>
                <p className="mt-1 text-sm">{product.searchIntent ?? "N/A"}</p>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Content angle</div>
                <p className="mt-1 text-sm">{product.contentAngle ?? "N/A"}</p>
              </div>
              {product.notes ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Notes</div>
                  <p className="mt-1 text-sm text-muted-foreground">{product.notes}</p>
                </div>
              ) : null}
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>Created: {formatDateTime(product.createdAt)}</div>
                <div>Updated: {formatDateTime(product.updatedAt)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/dashboard/drafts/new" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-start")}>
                <FileText className="size-3.5" />
                Create draft
              </Link>
              <Link
                href={`/dashboard/performance?product=${encodeURIComponent(id)}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-start")}
              >
                <Activity className="size-3.5" />
                View performance
              </Link>
              <Link
                href="/dashboard/performance/import"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-start")}
              >
                <Upload className="size-3.5" />
                Import performance
              </Link>
              <Link
                href="/dashboard/campaign-links#create-campaign-link"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-start")}
              >
                <ExternalLink className="size-3.5" />
                Create campaign link
              </Link>
              <Link
                href="/dashboard/improvements#create-task"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-start")}
              >
                <ClipboardList className="size-3.5" />
                Add improvement task
              </Link>
              <Link
                href="/dashboard/affiliate-programs#create-affiliate-program"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-start")}
              >
                <Building2 className="size-3.5" />
                Add affiliate program
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
