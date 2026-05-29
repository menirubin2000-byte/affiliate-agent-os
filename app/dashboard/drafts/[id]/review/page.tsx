import Link from "next/link"
import { Activity } from "lucide-react"

import { updateDraftStatusAction } from "@/app/dashboard/drafts/actions"
import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { buildApprovalReadiness } from "@/lib/approval-readiness"
import { getDraftById, getProductById, listDraftVersions, getProductPerformanceSignals, getDraftPerformanceRecords } from "@/lib/db"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn, formatDateTime } from "@/lib/utils"
import type { QualityChecks } from "@/types/draft"

export const dynamic = "force-dynamic"

const qualityLabels: Array<{ key: keyof QualityChecks; label: string }> = [
  { key: "has_disclosure", label: "Disclosure" },
  { key: "has_clear_cta", label: "CTA" },
  { key: "has_target_keyword", label: "Target keyword" },
  { key: "has_meta_title", label: "Meta title" },
  { key: "has_meta_description", label: "Meta description" },
  { key: "avoids_fake_claims", label: "No fake claims" },
  { key: "has_required_structure", label: "Structure" },
]

const statusVariantMap = {
  draft: "secondary",
  approved: "default",
  rejected: "destructive",
} as const

const readinessVariantMap = {
  ready: "default",
  needs_review: "secondary",
  not_ready: "destructive",
} as const

const readinessLabelMap = {
  ready: "Ready for approval",
  needs_review: "Needs review",
  not_ready: "Not ready",
} as const

export default async function ReviewDraftPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Review" title="Draft Review" description="Configure Supabase before reviewing drafts." />
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Supabase is not configured</CardTitle>
          </CardHeader>
        </Card>
      </>
    )
  }

  const draft = await getDraftById(id)

  if (!draft) {
    return (
      <>
        <PageHeader eyebrow="Review" title="Draft not found" description="The requested draft does not exist." />
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Draft not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/drafts" className={cn(buttonVariants({ variant: "outline" }))}>
              Back to drafts
            </Link>
          </CardContent>
        </Card>
      </>
    )
  }

  const [product, versions, allSignals, draftRecords] = await Promise.all([
    getProductById(draft.productId),
    listDraftVersions(id),
    getProductPerformanceSignals(),
    getDraftPerformanceRecords(id),
  ])

  const readiness = buildApprovalReadiness(draft)
  const latestVersion = versions[0] ?? null
  const isApproved = draft.status === "approved"
  const productSignal = allSignals.get(draft.productId) ?? null

  return (
    <>
      <PageHeader
        eyebrow="Review"
        title={draft.title ?? `${draft.productName} ${draft.templateType}`}
        description={`${draft.productName} · ${draft.templateType.replace("_", " ")} · ${draft.aiModel ?? "manual"}`}
        actions={
          <div className="flex gap-2">
            <Link href={`/dashboard/drafts/${id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}>
              Edit draft
            </Link>
            <Link href="/dashboard/drafts" className={cn(buttonVariants({ variant: "ghost" }))}>
              Back to drafts
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_400px]">
        <div className="space-y-4">
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Draft content
                <Badge variant={statusVariantMap[draft.status]}>{draft.status}</Badge>
              </CardTitle>
              <CardDescription>
                Created {formatDateTime(draft.createdAt)}
                {draft.updatedAt !== draft.createdAt ? ` · Updated ${formatDateTime(draft.updatedAt)}` : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Target keyword</div>
                  <p className="mt-1 text-sm">{draft.targetKeyword ?? "None"}</p>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Template type</div>
                  <p className="mt-1 text-sm">{draft.templateType.replace("_", " ")}</p>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Meta title</div>
                <p className="mt-1 text-sm">{draft.metaTitle ?? "Missing"}</p>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Meta description</div>
                <p className="mt-1 text-sm">{draft.metaDescription ?? "Missing"}</p>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Body</div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-7">{draft.body}</p>
              </div>
              {draft.approvalNotes ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Approval notes</div>
                  <p className="mt-1 text-sm text-muted-foreground">{draft.approvalNotes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {product ? (
            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Product details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Product name</div>
                  <p className="mt-1 text-sm">{product.name}</p>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Brand</div>
                  <p className="mt-1 text-sm">{product.brand ?? "N/A"}</p>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Affiliate URL</div>
                  <p className="mt-1 truncate text-sm">{product.affiliateUrl}</p>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Target keyword</div>
                  <p className="mt-1 text-sm">{product.targetKeyword ?? "None"}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card className={cn(
            "shadow-sm",
            readiness.level === "ready" && "border-emerald-200 bg-emerald-50",
            readiness.level === "needs_review" && "border-amber-200 bg-amber-50",
            readiness.level === "not_ready" && "border-destructive/30 bg-destructive/5",
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Approval readiness
                <Badge variant={readinessVariantMap[readiness.level]}>
                  {readinessLabelMap[readiness.level]}
                </Badge>
              </CardTitle>
              <CardDescription className={cn(
                readiness.level === "ready" && "text-emerald-900/80",
                readiness.level === "needs_review" && "text-amber-900/80",
                readiness.level === "not_ready" && "text-destructive/80",
              )}>
                {readiness.summary}
              </CardDescription>
            </CardHeader>
            {readiness.issues.length > 0 ? (
              <CardContent>
                <div className="grid gap-1.5">
                  {readiness.issues.map((issue) => (
                    <div key={issue.label} className="flex items-center gap-2 text-sm">
                      <Badge variant={issue.severity === "critical" ? "destructive" : "secondary"} className="text-xs">
                        {issue.severity}
                      </Badge>
                      <span>{issue.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            ) : null}
          </Card>

          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Quality checklist</CardTitle>
              <CardDescription>
                {readiness.passedChecks}/{readiness.totalChecks} checks passed
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {qualityLabels.map((item) => {
                const passed = draft.qualityChecks[item.key]
                return (
                  <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <Badge variant={passed ? "default" : "secondary"}>
                      {passed ? "Pass" : "Review"}
                    </Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {versions.length > 0 ? (
            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Version history</CardTitle>
                <CardDescription>
                  {versions.length === 1
                    ? "This draft has 1 saved version."
                    : `This draft has ${versions.length} saved versions.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {latestVersion ? (
                  <p className="text-sm text-muted-foreground">
                    Latest: v{latestVersion.versionNumber} ({latestVersion.changeSource.replace("_", " ")}) · {formatDateTime(latestVersion.createdAt)}
                  </p>
                ) : null}
                <Link
                  href={`/dashboard/drafts/${id}/edit`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  View full history
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">Performance context</CardTitle>
              </div>
              <CardDescription>
                {productSignal
                  ? `${productSignal.clicks} clicks · ${productSignal.conversions} conversions · $${productSignal.revenue.toFixed(2)} revenue`
                  : "No performance data for this product yet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {productSignal ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Product signal:</span>
                  <Badge variant={
                    productSignal.signal === "converting" ? "default"
                    : productSignal.signal === "no_conversions" ? "destructive"
                    : "secondary"
                  }>
                    {productSignal.label}
                  </Badge>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Draft records:</span>
                <span className="text-sm font-medium">{draftRecords.length}</span>
              </div>
              <Link
                href={`/dashboard/performance?product=${encodeURIComponent(draft.productId)}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                View product performance
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                {isApproved ? "Already approved" : "Approval decision"}
              </CardTitle>
              <CardDescription>
                {isApproved
                  ? "This draft has been approved. To make changes, revert to draft from the edit page."
                  : "Quality checks are informational only. A human still decides approval."}
              </CardDescription>
            </CardHeader>
            {!isApproved ? (
              <CardContent>
                <form action={updateDraftStatusAction} className="space-y-3">
                  <input type="hidden" name="draftId" value={draft.id} />
                  <div className="space-y-2">
                    <Label htmlFor="reviewApprovalNotes">Approval notes</Label>
                    <Textarea
                      id="reviewApprovalNotes"
                      name="approvalNotes"
                      defaultValue={draft.approvalNotes ?? ""}
                      rows={3}
                      placeholder="Optional notes for the human review trail."
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" name="nextStatus" value="approved">
                      Approve
                    </Button>
                    <Button type="submit" variant="secondary" name="nextStatus" value="rejected">
                      Reject
                    </Button>
                  </div>
                </form>
              </CardContent>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  )
}
