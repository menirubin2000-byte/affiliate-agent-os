import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Lightbulb,
  Pencil,
  Plus,
  Sparkles,
  XCircle,
} from "lucide-react"

import {
  createImprovementTaskAction,
  generateTasksFromInsightsAction,
  updateTaskStatusAction,
} from "@/app/dashboard/improvements/actions"
import { PageHeader } from "@/components/dashboard/page-header"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  getImprovementTaskSummary,
  listImprovementTasks,
  listProducts,
  listDrafts,
} from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { Draft } from "@/types/draft"
import type { ImprovementTask, ImprovementTaskSummary } from "@/types/improvement-task"
import type { Product } from "@/types/product"

export const dynamic = "force-dynamic"

const priorityVariantMap = {
  critical: "destructive",
  high: "secondary",
  medium: "outline",
  low: "outline",
} as const

const statusVariantMap = {
  open: "secondary",
  in_progress: "default",
  done: "outline",
  dismissed: "outline",
} as const

const sourceLabels: Record<string, string> = {
  recommendation: "Recommendation",
  performance_insight: "Performance insight",
  manual: "Manual",
  quality_check: "Quality check",
}

export default async function ImprovementsPage(props: {
  searchParams: Promise<{
    created?: string
    generated?: string
    error?: string
    queued?: string
    status?: string
    priority?: string
  }>
}) {
  const searchParams = await props.searchParams
  const statusFilter = searchParams.status?.trim() || undefined
  const priorityFilter = searchParams.priority?.trim() || undefined
  let tasks: ImprovementTask[] = []
  let taskSummary: ImprovementTaskSummary = {
    total: 0,
    open: 0,
    inProgress: 0,
    done: 0,
    dismissed: 0,
    critical: 0,
  }
  let products: Product[] = []
  let drafts: Draft[] = []
  let pageError: string | null = null

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    pageError = `${readiness.summary} ${readiness.guidance}`
  } else {
    try {
      const validStatuses = ["open", "in_progress", "done", "dismissed"]
      const filterStatus = statusFilter && validStatuses.includes(statusFilter)
        ? (statusFilter as ImprovementTask["status"])
        : undefined
      const validPriorities = ["low", "medium", "high", "critical"]
      const filterPriority = priorityFilter && validPriorities.includes(priorityFilter)
        ? (priorityFilter as ImprovementTask["priority"])
        : undefined

      ;[tasks, taskSummary, products, drafts] = await Promise.all([
        listImprovementTasks({ status: filterStatus, priority: filterPriority }),
        getImprovementTaskSummary(),
        listProducts(),
        listDrafts(),
      ])
    } catch (error) {
      pageError =
        error instanceof Error
          ? error.message
          : "Unable to load improvement tasks from Supabase."
    }
  }

  const hasActiveFilter = Boolean(statusFilter)

  return (
    <>
      <PageHeader
        eyebrow="Improvements"
        title="Content improvement queue"
        description="Manual improvement tasks derived from performance insights, recommendations, and operator decisions."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/improvements#create-task"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              <Plus className="size-4" />
              Create task
            </Link>
            <Link
              href="/dashboard/performance"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Performance
              <ArrowRight className="size-4" />
            </Link>
          </div>
        }
      />

      {searchParams.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription className="text-destructive/80">
              {searchParams.error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.created === "1" ? (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardHeader>
            <CardTitle>Task created</CardTitle>
            <CardDescription className="text-emerald-900/80">
              The improvement task has been added to the queue.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.generated ? (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardHeader>
            <CardTitle>Tasks generated from insights</CardTitle>
            <CardDescription className="text-emerald-900/80">
              {searchParams.generated === "0"
                ? "No new tasks were created — all current insights already have matching tasks."
                : `${searchParams.generated} new improvement task${searchParams.generated === "1" ? "" : "s"} created from performance insights.`}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.queued === "1" ? (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardHeader>
            <CardTitle>Added to improvement queue</CardTitle>
            <CardDescription className="text-emerald-900/80">
              The item has been added as an improvement task.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to load improvement tasks</CardTitle>
            <CardDescription className="text-destructive/80">
              {pageError}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Link href="/dashboard/improvements" className="block">
          <Card className={cn("border-border/70 bg-card/90 shadow-sm transition-colors hover:bg-accent/40", !statusFilter && "ring-2 ring-primary")}>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{taskSummary.total}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/dashboard/improvements?status=open" className="block">
          <Card className={cn("border-border/70 bg-card/90 shadow-sm transition-colors hover:bg-accent/40", statusFilter === "open" && "ring-2 ring-primary")}>
            <CardHeader className="pb-2">
              <CardDescription>Open</CardDescription>
              <CardTitle className="text-2xl">{taskSummary.open}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/dashboard/improvements?status=in_progress" className="block">
          <Card className={cn("border-border/70 bg-card/90 shadow-sm transition-colors hover:bg-accent/40", statusFilter === "in_progress" && "ring-2 ring-primary")}>
            <CardHeader className="pb-2">
              <CardDescription>In progress</CardDescription>
              <CardTitle className="text-2xl">{taskSummary.inProgress}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/dashboard/improvements?status=done" className="block">
          <Card className={cn("border-border/70 bg-card/90 shadow-sm transition-colors hover:bg-accent/40", statusFilter === "done" && "ring-2 ring-primary")}>
            <CardHeader className="pb-2">
              <CardDescription>Done</CardDescription>
              <CardTitle className="text-2xl">{taskSummary.done}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Critical open</CardDescription>
            <CardTitle className={cn("text-2xl", taskSummary.critical > 0 && "text-destructive")}>{taskSummary.critical}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4" />
                Generate from insights
              </CardTitle>
              <CardDescription>
                Create improvement tasks from current performance insights. Duplicates are skipped automatically.
              </CardDescription>
            </div>
            <form action={generateTasksFromInsightsAction}>
              <Button type="submit" variant="outline" size="sm">
                <Lightbulb className="size-4" />
                Generate tasks
              </Button>
            </form>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-4" />
            Improvement tasks
          </CardTitle>
          <CardDescription>
            {hasActiveFilter
              ? `Showing ${statusFilter} tasks. `
              : `${tasks.length} task${tasks.length === 1 ? "" : "s"} total. `}
            {hasActiveFilter ? (
              <Link href="/dashboard/improvements" className="font-medium underline underline-offset-4">
                Clear filter
              </Link>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="space-y-2 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                {hasActiveFilter
                  ? "No tasks match the current filter."
                  : "No improvement tasks yet. Create one manually or generate from insights."}
              </p>
              {hasActiveFilter ? (
                <Link
                  href="/dashboard/improvements"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Clear filter
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "rounded-lg border p-4",
                    task.priority === "critical" && task.status !== "done" && task.status !== "dismissed"
                      ? "border-destructive/30 bg-destructive/5"
                      : task.status === "done" || task.status === "dismissed"
                        ? "border-border/50 bg-muted/30 opacity-70"
                        : "border-border/70 bg-background/70",
                  )}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{task.title}</span>
                        <Badge variant={priorityVariantMap[task.priority]}>{task.priority}</Badge>
                        <Badge variant={statusVariantMap[task.status]}>{task.status.replace("_", " ")}</Badge>
                        <Badge variant="outline" className="text-xs">{sourceLabels[task.sourceType] ?? task.sourceType}</Badge>
                      </div>
                      {task.description ? (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      ) : null}
                      {task.suggestedAction ? (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Suggested:</span> {task.suggestedAction}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {task.productName ? (
                          <span>Product: {task.productName}</span>
                        ) : null}
                        {task.draftTitle ? (
                          <span>Draft: {task.draftTitle}</span>
                        ) : null}
                      </div>
                      {task.contentDraftId ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Link
                            href={`/dashboard/drafts/${task.contentDraftId}/edit`}
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2 text-xs")}
                          >
                            <Pencil className="size-3" />
                            Edit draft
                          </Link>
                          <Link
                            href="/dashboard/drafts/new"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2 text-xs")}
                          >
                            <FileText className="size-3" />
                            New draft iteration
                          </Link>
                          {task.productId ? (
                            <Link
                              href={`/dashboard/products#product-${task.productId}`}
                              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2 text-xs")}
                            >
                              Copy Claude prompt
                            </Link>
                          ) : null}
                        </div>
                      ) : task.productId ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Link
                            href="/dashboard/drafts/new"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2 text-xs")}
                          >
                            <FileText className="size-3" />
                            Create new draft
                          </Link>
                          <Link
                            href={`/dashboard/products#product-${task.productId}`}
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2 text-xs")}
                          >
                            Copy Claude prompt
                          </Link>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {task.status === "open" ? (
                        <form action={updateTaskStatusAction}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <input type="hidden" name="status" value="in_progress" />
                          <Button type="submit" variant="outline" size="sm" className="h-7 text-xs">
                            Start
                          </Button>
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
                            Dismiss
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90 shadow-sm" id="create-task">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            Create improvement task
          </CardTitle>
          <CardDescription>
            Add a manual improvement task for a product or draft.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createImprovementTaskAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="taskTitle">Title</Label>
              <input
                id="taskTitle"
                name="title"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                placeholder="What needs to be improved?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskProduct">Product (optional)</Label>
              <select
                id="taskProduct"
                name="productId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">No product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskDraft">Draft (optional)</Label>
              <select
                id="taskDraft"
                name="contentDraftId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">No draft</option>
                {drafts.map((draft) => (
                  <option key={draft.id} value={draft.id}>
                    {draft.title ?? `${draft.productName} ${draft.templateType}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskPriority">Priority</Label>
              <select
                id="taskPriority"
                name="priority"
                defaultValue="medium"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskSuggestedAction">Suggested action (optional)</Label>
              <input
                id="taskSuggestedAction"
                name="suggestedAction"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                placeholder="e.g. Rewrite CTA, add disclosure"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="taskDescription">Description (optional)</Label>
              <Textarea
                id="taskDescription"
                name="description"
                rows={3}
                placeholder="Additional context about what should be changed."
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit">Create task</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
