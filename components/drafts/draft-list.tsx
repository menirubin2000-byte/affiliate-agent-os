import { EmptyStateCard } from "@/components/dashboard/empty-state-card"
import { NextActionLink } from "@/components/dashboard/next-action-link"
import { WorkflowBadge } from "@/components/dashboard/workflow-badge"
import { DraftStatusForm } from "@/components/drafts/draft-status-form"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn, formatDateTime, truncate } from "@/lib/utils"
import Link from "next/link"
import type { QualityChecks } from "@/types/draft"
import type { DraftWorkflowItem } from "@/types/workflow"
import { ClipboardCheck, Pencil, BarChart3 } from "lucide-react"

const statusVariantMap = {
  draft: "secondary",
  needs_review: "secondary",
  approved: "default",
  needs_changes: "outline",
  rejected: "destructive",
} as const

const qualityLabels: Array<{
  key: keyof QualityChecks
  label: string
}> = [
  { key: "has_disclosure", label: "Disclosure" },
  { key: "has_clear_cta", label: "CTA" },
  { key: "has_target_keyword", label: "Target keyword" },
  { key: "has_meta_title", label: "Meta title" },
  { key: "has_meta_description", label: "Meta description" },
  { key: "avoids_fake_claims", label: "No fake claims" },
  { key: "has_required_structure", label: "Structure" },
]

export function DraftList(props: {
  drafts: DraftWorkflowItem[]
  emptyTitle?: string
  emptyDescription?: string
  emptyActions?: Array<{
    label: string
    href: string
    variant?: "default" | "outline" | "ghost"
  }>
}) {
  if (props.drafts.length === 0) {
    return (
      <EmptyStateCard
        title={props.emptyTitle ?? "No drafts found"}
        description={
          props.emptyDescription ??
          "Generate review, comparison, buying guide, or social drafts from the products table first."
        }
        helperText="Drafts stay in manual review until a human explicitly approves or rejects them."
        actions={
          props.emptyActions ?? [
            { label: "Open products", href: "/dashboard/products", variant: "default" },
            { label: "Review setup checklist", href: "/dashboard/system", variant: "outline" },
          ]
        }
      />
    )
  }

  return (
    <div className="grid gap-4">
      {props.drafts.map((draft) => (
        <Card
          key={draft.id}
          id={`draft-${draft.id}`}
          className="border-border/70 bg-card/90 shadow-sm"
        >
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl">
                    {draft.title ?? `${draft.productName} ${draft.templateType}`}
                  </CardTitle>
                  <WorkflowBadge workflow={draft.workflowLabel} />
                  <Badge variant={statusVariantMap[draft.status]}>{draft.status}</Badge>
                  <Badge variant="outline">{draft.templateType.replace("_", " ")}</Badge>
                  <Badge variant="outline">{draft.publishingState.replace("_", " ")}</Badge>
                </div>
                <CardDescription>
                  {draft.productName} - {draft.productSlug} - {formatDateTime(draft.createdAt)}
                </CardDescription>
              </div>
              <div className="text-sm text-muted-foreground">
                AI model: {draft.aiModel ?? "unknown"}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
            <div className="space-y-4">
              <article className="rounded-lg border border-border/70 bg-background/70 p-4">
                <div className="grid gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Target keyword
                    </div>
                    <p className="mt-1 text-sm text-foreground">{draft.targetKeyword ?? "None"}</p>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Meta title
                    </div>
                    <p className="mt-1 text-sm text-foreground">{draft.metaTitle ?? "Missing"}</p>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Meta description
                    </div>
                    <p className="mt-1 text-sm text-foreground">
                      {draft.metaDescription ?? "Missing"}
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Body preview
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {truncate(draft.body, 520)}
                    </p>
                  </div>
                  {draft.signals.length > 0 ? (
                    <div>
                      <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Workflow signals
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {draft.signals.map((signal) => (
                          <Badge key={signal} variant="outline">
                            {signal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            </div>
            <div className="space-y-4 rounded-lg border border-border/70 bg-background/70 p-4">
              <div>
                <h3 className="text-sm font-semibold">Next action</h3>
                <div className="mt-3">
                  <NextActionLink action={draft.nextAction} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Quality checklist</h3>
                <div className="mt-3 grid gap-2">
                  {qualityLabels.map((item) => {
                    const passed = draft.qualityChecks[item.key]

                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-muted-foreground">{item.label}</span>
                        <Badge variant={passed ? "default" : "secondary"}>
                          {passed ? "Pass" : "Review"}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-border/70 pt-4">
                <h3 className="text-sm font-semibold">Actions</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/drafts/${draft.id}/review`}
                    className={cn(buttonVariants({ variant: draft.status === "draft" ? "default" : "outline", size: "sm" }))}
                  >
                    <ClipboardCheck className="size-3.5" />
                    Review
                  </Link>
                  <Link
                    href={`/dashboard/drafts/${draft.id}/edit`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    <Pencil className="size-3.5" />
                    {draft.status === "approved" ? "View draft" : "Edit"}
                  </Link>
                  <Link
                    href={`/dashboard/products?prompt=${draft.productId}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    Copy Claude prompt
                  </Link>
                  {draft.status === "approved" ? (
                    <>
                      <Link
                        href={`/dashboard/performance?draftId=${draft.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        <BarChart3 className="size-3.5" />
                        Record performance
                      </Link>
                      <Link
                        href="/dashboard/publishing"
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      >
                        WordPress (optional)
                      </Link>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-border/70 pt-4">
                <h3 className="text-sm font-semibold">Approval workflow</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quality checks are informational only. A human still decides approval.
                </p>
              </div>

              <DraftStatusForm draft={draft} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
