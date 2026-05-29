import Link from "next/link"
import { CheckSquare, ShieldAlert } from "lucide-react"

import { ApprovalList } from "@/components/approvals/approval-list"
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
  getApprovalItemSummary,
  listApprovalItems,
} from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { ApprovalItemStatus, ApprovalItemType } from "@/types/approval-item"
import { VALID_APPROVAL_ITEM_STATUSES, VALID_APPROVAL_ITEM_TYPES } from "@/types/approval-item"

export const dynamic = "force-dynamic"

const statusFilterOptions: Array<{ value: ApprovalItemStatus; label: string }> = [
  { value: "waiting_approval", label: "Waiting approval" },
  { value: "approved", label: "Approved" },
  { value: "needs_changes", label: "Needs changes" },
  { value: "rejected", label: "Rejected" },
  { value: "published", label: "Published" },
]

const typeFilterOptions: Array<{ value: ApprovalItemType; label: string }> = [
  { value: "publish_linkedin", label: "Publish LinkedIn" },
  { value: "publish_medium", label: "Publish Medium" },
  { value: "activate_product", label: "Activate product" },
  { value: "approve_draft", label: "Approve draft" },
  { value: "create_campaign_link", label: "Campaign link" },
  { value: "mark_link_ready", label: "Mark link ready" },
  { value: "record_performance", label: "Record performance" },
  { value: "create_task", label: "Create task" },
]

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    created?: string
    error?: string
    status?: string
    type?: string
  }>
}) {
  const params = (await searchParams) ?? {}

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    return (
      <>
        <PageHeader
          eyebrow="Stage 52"
          title="Approval Board"
          description="Operator approval surface for Claude-proposed actions."
        />
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Supabase is not configured</CardTitle>
            <CardDescription className="text-destructive/80">
              {readiness.summary} {readiness.guidance}
            </CardDescription>
          </CardHeader>
        </Card>
      </>
    )
  }

  const selectedStatus = VALID_APPROVAL_ITEM_STATUSES.includes(params.status as ApprovalItemStatus)
    ? (params.status as ApprovalItemStatus)
    : undefined
  const selectedType = VALID_APPROVAL_ITEM_TYPES.includes(params.type as ApprovalItemType)
    ? (params.type as ApprovalItemType)
    : undefined

  let items = [] as Awaited<ReturnType<typeof listApprovalItems>>
  let summary = { total: 0, waitingApproval: 0, approved: 0, rejected: 0, published: 0, needsChanges: 0 }
  let pageError: string | null = null

  try {
    ;[items, summary] = await Promise.all([
      listApprovalItems({ status: selectedStatus, approvalType: selectedType }),
      getApprovalItemSummary(),
    ])
  } catch (error) {
    pageError = error instanceof Error ? error.message : "Unable to load approval items."
  }

  return (
    <>
      <PageHeader
        eyebrow="Stage 52"
        title="Approval Board"
        description="Operator approval surface for Claude-proposed actions. Approve, reject, or request changes before any sensitive action is executed."
        actions={
          <Link
            href="/dashboard/command-center"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Command Center
          </Link>
        }
      />

      {params.created ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          Approval item created.
        </div>
      ) : null}

      {params.error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {params.error === "title_required"
            ? "Title is required."
            : params.error === "invalid_type"
              ? "Invalid approval type."
              : params.error === "create_failed"
                ? "Failed to create approval item."
                : params.error === "update_failed"
                  ? "Failed to update approval item."
                  : `Error: ${params.error}`}
        </div>
      ) : null}

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Error loading approvals</CardTitle>
            <CardDescription className="text-destructive/80">{pageError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Waiting approval"
          value={String(summary.waitingApproval)}
          detail="Actions waiting for operator decision."
          icon={<CheckSquare className="size-4" />}
        />
        <StatCard
          label="Approved"
          value={String(summary.approved)}
          detail="Approved but not yet executed."
          icon={<CheckSquare className="size-4" />}
        />
        <StatCard
          label="Published"
          value={String(summary.published)}
          detail="Successfully published or executed."
          icon={<CheckSquare className="size-4" />}
        />
        <StatCard
          label="Needs changes"
          value={String(summary.needsChanges)}
          detail="Returned for revision."
          icon={<ShieldAlert className="size-4" />}
        />
        <StatCard
          label="Rejected"
          value={String(summary.rejected)}
          detail="Operator rejected these actions."
          icon={<ShieldAlert className="size-4" />}
        />
      </section>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter approval items by status or type.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Status</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/approvals"
                className={cn(
                  buttonVariants({
                    variant: !selectedStatus ? "default" : "outline",
                    size: "sm",
                  }),
                )}
              >
                All
              </Link>
              {statusFilterOptions.map((opt) => (
                <Link
                  key={opt.value}
                  href={`/dashboard/approvals?status=${opt.value}${selectedType ? `&type=${selectedType}` : ""}`}
                  className={cn(
                    buttonVariants({
                      variant: selectedStatus === opt.value ? "default" : "outline",
                      size: "sm",
                    }),
                  )}
                >
                  {opt.label}
                  {opt.value === "waiting_approval" && summary.waitingApproval > 0 ? (
                    <Badge variant="secondary" className="ml-1">
                      {summary.waitingApproval}
                    </Badge>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Type</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/approvals${selectedStatus ? `?status=${selectedStatus}` : ""}`}
                className={cn(
                  buttonVariants({
                    variant: !selectedType ? "default" : "outline",
                    size: "sm",
                  }),
                )}
              >
                All
              </Link>
              {typeFilterOptions.map((opt) => (
                <Link
                  key={opt.value}
                  href={`/dashboard/approvals?type=${opt.value}${selectedStatus ? `&status=${selectedStatus}` : ""}`}
                  className={cn(
                    buttonVariants({
                      variant: selectedType === opt.value ? "default" : "outline",
                      size: "sm",
                    }),
                  )}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <ApprovalList items={items} />
    </>
  )
}
