import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Package2,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  buildCampaignReport,
  buildDraftReport,
  buildProductReport,
  buildReportSummary,
  buildTaskReport,
} from "@/lib/csv-export"
import {
  getProductPerformanceSignals,
  listCampaignLinks,
  listDrafts,
  listDraftVersions,
  listImprovementTasks,
  listPerformanceMetrics,
  listProducts,
} from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { CampaignReportRow, DraftReportRow, ProductReportRow, TaskReportRow } from "@/lib/csv-export"
import type { ReportSummary } from "@/lib/csv-export"

export const dynamic = "force-dynamic"

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

export default async function ReportsPage() {
  let summary: ReportSummary = {
    totalProducts: 0,
    activeProducts: 0,
    totalDrafts: 0,
    approvedDrafts: 0,
    totalCampaignLinks: 0,
    activeCampaignLinks: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    openTasks: 0,
    criticalTasks: 0,
  }
  let productRows: ProductReportRow[] = []
  let campaignRows: CampaignReportRow[] = []
  let draftRows: DraftReportRow[] = []
  let taskRows: TaskReportRow[] = []
  let pageError: string | null = null

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    pageError = `${readiness.summary} ${readiness.guidance}`
  } else {
    try {
      const [products, drafts, campaignLinks, performanceMetrics, improvementTasks, signals] =
        await Promise.all([
          listProducts(),
          listDrafts(),
          listCampaignLinks(),
          listPerformanceMetrics(),
          listImprovementTasks(),
          getProductPerformanceSignals(),
        ])

      summary = buildReportSummary({
        products,
        drafts,
        campaignLinks,
        performanceMetrics,
        improvementTasks,
      })

      productRows = buildProductReport({
        products,
        drafts,
        campaignLinks,
        performanceMetrics,
        improvementTasks,
        signals,
      })

      campaignRows = buildCampaignReport({
        campaignLinks,
        performanceMetrics,
      })

      // Build version and perf counts for draft report
      const versionCounts = new Map<string, number>()
      const versionPromises = drafts.map(async (d) => {
        const versions = await listDraftVersions(d.id)
        versionCounts.set(d.id, versions.length)
      })
      await Promise.all(versionPromises)

      const perfCountsByDraft = new Map<string, number>()
      for (const m of performanceMetrics) {
        if (m.draftId) {
          perfCountsByDraft.set(m.draftId, (perfCountsByDraft.get(m.draftId) ?? 0) + 1)
        }
      }

      draftRows = buildDraftReport({
        drafts,
        versionCounts,
        performanceRecordCounts: perfCountsByDraft,
      })

      taskRows = buildTaskReport({ tasks: improvementTasks })
    } catch (error) {
      pageError =
        error instanceof Error
          ? error.message
          : "Unable to load reports from Supabase."
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Reports and Export Center"
        description="Read-only operational reports with CSV export. Reports do not change data or trigger automation."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Back to dashboard
              <ArrowRight className="size-4" />
            </Link>
          </div>
        }
      />

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to load reports</CardTitle>
            <CardDescription className="text-destructive/80">
              {pageError}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {/* Summary cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Products"
          value={`${summary.activeProducts} active`}
          detail={`${summary.totalProducts} total products in the system.`}
          icon={<Package2 className="size-4" />}
        />
        <StatCard
          label="Drafts"
          value={`${summary.approvedDrafts} approved`}
          detail={`${summary.totalDrafts} total drafts created.`}
          icon={<FileText className="size-4" />}
        />
        <StatCard
          label="Campaign Links"
          value={`${summary.activeCampaignLinks} active`}
          detail={`${summary.totalCampaignLinks} total campaign links.`}
          icon={<ExternalLink className="size-4" />}
        />
        <StatCard
          label="Performance"
          value={formatMoney(summary.totalRevenue)}
          detail={`${summary.totalClicks} clicks, ${summary.totalConversions} conversions.`}
          icon={<Activity className="size-4" />}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Improvement Tasks"
          value={`${summary.openTasks} open`}
          detail={summary.criticalTasks > 0 ? `${summary.criticalTasks} critical tasks need attention.` : "No critical tasks."}
          icon={<ClipboardList className="size-4" />}
        />
        <StatCard
          label="Conversion Rate"
          value={summary.totalClicks > 0 ? `${((summary.totalConversions / summary.totalClicks) * 100).toFixed(1)}%` : "N/A"}
          detail={summary.totalClicks > 0 ? `${summary.totalConversions} conversions from ${summary.totalClicks} clicks.` : "No performance data yet."}
          icon={<BarChart3 className="size-4" />}
        />
      </section>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4" />
              Data Quality Center
            </CardTitle>
            <CardDescription>
              Review read-only checks for incomplete, inconsistent, duplicate, or suspicious data before exporting reports.
            </CardDescription>
          </div>
          <Link
            href="/dashboard/data-quality"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Open quality center
            <ArrowRight className="size-4" />
          </Link>
        </CardHeader>
      </Card>

      {/* Product performance report */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package2 className="size-4" />
                Product performance report
              </CardTitle>
              <CardDescription className="mt-1">
                Product-level metrics including drafts, campaign links, performance, and improvement tasks.
              </CardDescription>
            </div>
            <a
              href="/dashboard/reports/export/products"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Download className="size-3.5" />
              Export CSV
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {productRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products to report.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">Drafts</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                    <TableHead className="text-right">Links</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Conv.</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Tasks</TableHead>
                    <TableHead>Signal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productRows.map((row) => (
                    <TableRow key={row.productName}>
                      <TableCell className="font-medium text-sm">{row.productName}</TableCell>
                      <TableCell className="text-xs">{row.category ?? "-"}</TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate">{row.targetKeyword ?? "-"}</TableCell>
                      <TableCell className="text-xs text-right">{row.draftCount}</TableCell>
                      <TableCell className="text-xs text-right">{row.approvedDraftCount}</TableCell>
                      <TableCell className="text-xs text-right">{row.campaignLinkCount}</TableCell>
                      <TableCell className="text-xs text-right">{row.clicks}</TableCell>
                      <TableCell className="text-xs text-right">{row.conversions}</TableCell>
                      <TableCell className="text-xs text-right">{row.revenue > 0 ? formatMoney(row.revenue) : "-"}</TableCell>
                      <TableCell className="text-xs text-right">{row.conversionRate || "-"}</TableCell>
                      <TableCell className="text-xs text-right">{row.openTasks}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {row.performanceSignal}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign performance report */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="size-4" />
                Campaign performance report
              </CardTitle>
              <CardDescription className="mt-1">
                Campaign link outcomes including clicks, conversions, revenue, and last recorded date.
              </CardDescription>
            </div>
            <a
              href="/dashboard/reports/export/campaigns"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Download className="size-3.5" />
              Export CSV
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {campaignRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaign links to report.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Link</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Conv.</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Recorded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{row.linkName}</TableCell>
                      <TableCell className="text-xs">{row.productName}</TableCell>
                      <TableCell className="text-xs">{row.channel}</TableCell>
                      <TableCell className="text-xs">{row.campaignName ?? "-"}</TableCell>
                      <TableCell className="text-xs text-right">{row.clicks}</TableCell>
                      <TableCell className="text-xs text-right">{row.conversions}</TableCell>
                      <TableCell className="text-xs text-right">{row.revenue > 0 ? formatMoney(row.revenue) : "-"}</TableCell>
                      <TableCell className="text-xs text-right">{row.conversionRate || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "active" ? "default" : "secondary"} className="text-xs">
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{row.lastRecordedDate ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Draft report */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4" />
                Draft report
              </CardTitle>
              <CardDescription className="mt-1">
                All content drafts with quality scores, version history, and performance linkage.
              </CardDescription>
            </div>
            <a
              href="/dashboard/reports/export/drafts"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Download className="size-3.5" />
              Export CSV
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {draftRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drafts to report.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead className="text-right">Versions</TableHead>
                    <TableHead className="text-right">Perf. Records</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draftRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm max-w-[180px] truncate">{row.title ?? "Untitled"}</TableCell>
                      <TableCell className="text-xs">{row.productName}</TableCell>
                      <TableCell className="text-xs">{row.templateType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={row.status === "approved" ? "default" : row.status === "rejected" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{row.qualityScore}</TableCell>
                      <TableCell className="text-xs text-right">{row.versionCount}</TableCell>
                      <TableCell className="text-xs text-right">{row.performanceRecords}</TableCell>
                      <TableCell className="text-xs">{row.createdAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Improvement task report */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-4" />
                Improvement task report
              </CardTitle>
              <CardDescription className="mt-1">
                All improvement tasks with priority, status, and source tracking.
              </CardDescription>
            </div>
            <a
              href="/dashboard/reports/export/improvements"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Download className="size-3.5" />
              Export CSV
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {taskRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No improvement tasks to report.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Draft</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Suggested Action</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm max-w-[180px] truncate">{row.title}</TableCell>
                      <TableCell className="text-xs">{row.productName ?? "-"}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{row.draftTitle ?? "-"}</TableCell>
                      <TableCell className="text-xs">{row.sourceType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.priority === "critical" ? "destructive"
                              : row.priority === "high" ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {row.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.status === "done" ? "default"
                              : row.status === "in_progress" ? "secondary"
                              : row.status === "dismissed" ? "outline"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate">{row.suggestedAction ?? "-"}</TableCell>
                      <TableCell className="text-xs">{row.createdAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
