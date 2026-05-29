import Link from "next/link"

import { restoreDraftVersionAction } from "@/app/dashboard/drafts/actions"
import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDraftById, getDraftVersion } from "@/lib/db"
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

export default async function VersionViewPage(props: {
  params: Promise<{ id: string; versionId: string }>
}) {
  const { id, versionId } = await props.params

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Version" title="Version View" description="Configure Supabase to view versions." />
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Supabase is not configured</CardTitle>
          </CardHeader>
        </Card>
      </>
    )
  }

  const [draft, version] = await Promise.all([
    getDraftById(id),
    getDraftVersion(versionId),
  ])

  if (!draft || !version || version.contentDraftId !== id) {
    return (
      <>
        <PageHeader eyebrow="Version" title="Not found" description="The requested version does not exist." />
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Version not found</CardTitle>
            <CardDescription className="text-destructive/80">
              The requested draft version does not exist or does not belong to this draft.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/dashboard/drafts/${id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}>
              Back to draft
            </Link>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow={`Version ${version.versionNumber}`}
        title={version.title ?? `${draft.productName} ${draft.templateType}`}
        description={`${version.changeSource.replace("_", " ")} · ${formatDateTime(version.createdAt)}`}
        actions={
          <Link href={`/dashboard/drafts/${id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}>
            Back to draft
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_360px]">
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>
              Snapshot from {formatDateTime(version.createdAt)}.
              {version.changeNotes ? ` ${version.changeNotes}` : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Title</div>
              <p className="mt-1 text-sm">{version.title ?? "Untitled"}</p>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Meta title</div>
              <p className="mt-1 text-sm">{version.metaTitle ?? "Missing"}</p>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Meta description</div>
              <p className="mt-1 text-sm">{version.metaDescription ?? "Missing"}</p>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Target keyword</div>
              <p className="mt-1 text-sm">{version.targetKeyword ?? "None"}</p>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Body</div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-7">{version.body}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle>Quality checks</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {qualityLabels.map((item) => {
                const passed = version.qualityChecks[item.key]
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

          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle>Restore</CardTitle>
              <CardDescription>
                Restoring sets the draft back to this version and changes the status to draft. Approval will be required again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={restoreDraftVersionAction}>
                <input type="hidden" name="draftId" value={id} />
                <input type="hidden" name="versionId" value={version.id} />
                <button type="submit" className={cn(buttonVariants({ variant: "default" }))}>
                  Restore version {version.versionNumber}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
