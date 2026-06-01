import Link from "next/link"
import { ArrowRight, ExternalLink } from "lucide-react"

import { sendDraftToWordPressAction } from "@/app/dashboard/publishing/actions"
import { EmptyStateCard } from "@/components/dashboard/empty-state-card"
import { NextActionLink } from "@/components/dashboard/next-action-link"
import { PageHeader } from "@/components/dashboard/page-header"
import { WorkflowBadge } from "@/components/dashboard/workflow-badge"
import { Badge } from "@/components/ui/badge"
import { badgeVariants } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getPublishingQueueSummary,
  listPublishingWorkflowItems,
  listApprovedDraftsEligibleForPublishing,
} from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn, formatDateTime, truncate } from "@/lib/utils"
import { isWordPressConfigured } from "@/lib/wordpress"
import type { Draft } from "@/types/draft"
import type { PublishingJobStatus } from "@/types/publishing"
import type { PublishingWorkflowItem } from "@/types/workflow"

export const dynamic = "force-dynamic"

const statusOptions: Array<{ label: string; value: "all" | PublishingJobStatus }> = [
  { label: "All jobs", value: "all" },
  { label: "Queued", value: "pending" },
  { label: "Succeeded", value: "sent_to_wordpress" },
  { label: "Failed", value: "failed" },
]

function isPublishingJobStatus(value?: string): value is PublishingJobStatus {
  return (
    value === "pending" ||
    value === "sent" ||
    value === "sent_to_wordpress" ||
    value === "failed"
  )
}

function SendToWordPressForm({ draft }: { draft: Draft }) {
  return (
    <form action={sendDraftToWordPressAction}>
      <input type="hidden" name="draftId" value={draft.id} />
      <button className={cn(buttonVariants({ variant: "default", size: "sm" }))} type="submit">
        Send to WordPress Draft
      </button>
    </form>
  )
}

function EligibleDraftsSection({ drafts }: { drafts: Draft[] }) {
  if (drafts.length === 0) {
    return (
      <EmptyStateCard
        title="No approved drafts waiting for WordPress"
        description="Approve a draft first, or check the jobs list below for content already sent."
        helperText="Only approved drafts can enter the WordPress queue, and every WordPress post remains a draft there."
        actions={[
          { label: "Review approved drafts", href: "/dashboard/drafts?status=approved", variant: "default" },
          { label: "Open products", href: "/dashboard/products", variant: "outline" },
        ]}
      />
    )
  }

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>Approved drafts ready for queueing</CardTitle>
        <CardDescription>
          Only approved drafts can be sent to WordPress, and they are always created there as draft posts.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="grid gap-4 rounded-lg border border-border/70 bg-background/70 p-4 lg:grid-cols-[minmax(0,1fr)_200px]"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">
                  {draft.title ?? `${draft.productName} ${draft.templateType.replace("_", " ")}`}
                </h3>
                <Badge variant="default">approved</Badge>
                <Badge variant="outline">{draft.templateType.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {draft.productName} - {draft.productSlug} - {formatDateTime(draft.updatedAt)}
              </p>
              {draft.targetKeyword ? (
                <p className="text-sm text-muted-foreground">
                  Target keyword: {draft.targetKeyword}
                </p>
              ) : null}
              <p className="text-sm leading-6 text-foreground">{truncate(draft.body, 220)}</p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <SendToWordPressForm draft={draft} />
              <Link
                href="/dashboard/drafts?status=approved"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Review approved drafts
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function PublishingJobsSection({ jobs }: { jobs: PublishingWorkflowItem[] }) {
  if (jobs.length === 0) {
    return (
      <EmptyStateCard
        title="No publishing jobs yet"
        description="Send an approved draft to WordPress draft mode to create the first queue record."
        helperText="Failed and successful WordPress handoff attempts will appear here with links back to the related draft and product."
        actions={[
          { label: "Queue approved draft", href: "/dashboard/publishing", variant: "default" },
          { label: "Review system checks", href: "/dashboard/system", variant: "ghost" },
        ]}
      />
    )
  }

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>Publishing jobs</CardTitle>
        <CardDescription>
          Queue history for WordPress draft creation. No live publish actions exist here.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="grid gap-4 rounded-lg border border-border/70 bg-background/70 p-4 lg:grid-cols-[minmax(0,1fr)_260px]"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">
                  {job.draftTitle ?? `${job.productName} ${job.templateType.replace("_", " ")}`}
                </h3>
                <WorkflowBadge workflow={job.workflowLabel} />
                <Badge variant="outline">{job.status.replace("_", " ")}</Badge>
                <Badge variant="outline">{job.targetPlatform}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {job.productName} - {job.productSlug} - {formatDateTime(job.createdAt)}
              </p>
              <p className="text-sm text-muted-foreground">
                Current draft status: {job.draftStatus}
              </p>
              {job.signals.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {job.signals.map((signal) => (
                    <Badge key={signal} variant="outline">
                      {signal}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {job.errorMessage ? (
                <p className="text-sm text-destructive">{job.errorMessage}</p>
              ) : null}
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">WordPress post ID:</span>{" "}
                {job.wordpressPostId ?? "Not created"}
              </div>
              <div>
                <span className="font-medium text-foreground">WordPress post URL:</span>{" "}
                {job.wordpressPostUrl ? (
                  <a
                    href={job.wordpressPostUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Open draft
                    <ExternalLink className="size-3.5" />
                  </a>
                ) : (
                  "Not available"
                )}
              </div>
              <div>
                <span className="font-medium text-foreground">Job ID:</span> {job.id}
              </div>
              <div>
                <span className="font-medium text-foreground">Next action:</span>
                <div className="mt-2">
                  <NextActionLink action={job.nextAction} />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <Link
                  href={`/dashboard/drafts#draft-${job.contentDraftId}`}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  View draft workflow
                </Link>
                <div>
                  <Link
                    href={`/dashboard/products#product-${job.productId}`}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    View product workflow
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default async function PublishingPage(props: {
  searchParams: Promise<{
    sent?: string
    error?: string
    status?: string
  }>
}) {
  const searchParams = await props.searchParams
  const wordpressReady = isWordPressConfigured()
  const status = isPublishingJobStatus(searchParams.status) ? searchParams.status : undefined
  let eligibleDrafts: Draft[] = []
  let jobs: PublishingWorkflowItem[] = []
  let queueSummary = {
    pending: 0,
    sent: 0,
    failed: 0,
    eligibleApprovedDrafts: 0,
  }
  let pageError: string | null = null

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    pageError = `${readiness.summary} ${readiness.guidance}`
  } else {
    try {
      ;[eligibleDrafts, jobs, queueSummary] = await Promise.all([
        listApprovedDraftsEligibleForPublishing(),
        listPublishingWorkflowItems({ status }),
        getPublishingQueueSummary(),
      ])
    } catch (error) {
      pageError =
        error instanceof Error
          ? error.message
          : "Unable to load the publishing queue from Supabase."
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Publishing"
        title="WordPress Draft Queue (Optional)"
        description="WordPress is optional and not connected. When connected, only approved drafts can be sent as draft posts. This queue never publishes live content."
        actions={
          <Link
            href="/dashboard/drafts?status=approved"
            className={cn(buttonVariants({ variant: "ghost" }))}
          >
            Review approved drafts
            <ArrowRight className="size-4" />
          </Link>
        }
      />

      {!wordpressReady ? (
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>WordPress is optional and not connected</CardTitle>
            <CardDescription>
              WordPress is not required for the core workflow. The app operates with Product → Draft → Approval → Performance → Recommendations. You can connect WordPress later when you have a test site ready. No card, domain, or paid plan is needed.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Publishing action failed</CardTitle>
            <CardDescription className="text-destructive/80">
              {searchParams.error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.sent === "1" ? (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardHeader>
            <CardTitle>WordPress draft created</CardTitle>
            <CardDescription className="text-emerald-900/80">
              The approved draft was sent to WordPress as a draft post. No live publishing occurred.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to load publishing queue</CardTitle>
            <CardDescription className="text-destructive/80">
              {pageError}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle>Queue summary</CardTitle>
              <CardDescription>
                Current WordPress handoff state and retry-ready failures.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Eligible approved drafts
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {queueSummary.eligibleApprovedDrafts}
                  </div>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Queued
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{queueSummary.pending}</div>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Succeeded
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{queueSummary.sent}</div>
                </div>
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Failed
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{queueSummary.failed}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => {
                  const active = (status ?? "all") === option.value
                  const href =
                    option.value === "all"
                      ? "/dashboard/publishing"
                      : `/dashboard/publishing?status=${option.value}`

                  return (
                    <Link
                      key={option.value}
                      href={href}
                      className={cn(
                        badgeVariants({ variant: active ? "default" : "secondary" }),
                        "rounded-md px-3 py-1 text-sm",
                      )}
                    >
                      {option.label}
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <EligibleDraftsSection drafts={eligibleDrafts} />
          <PublishingJobsSection jobs={jobs} />
        </div>
      )}
    </>
  )
}
