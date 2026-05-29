import Link from "next/link"

import { revertToDraftAction, updateDraftContentAction } from "@/app/dashboard/drafts/actions"
import { PageHeader } from "@/components/dashboard/page-header"
import { StructuredPasteImport } from "@/components/drafts/structured-paste-import"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDraftById, listDraftVersions } from "@/lib/db"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn, formatDateTime } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function EditDraftPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await props.params
  const searchParams = await props.searchParams

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Edit draft" title="Draft Editor" description="Configure Supabase before editing drafts." />
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Supabase is not configured</CardTitle>
            <CardDescription className="text-destructive/80">
              Configure Supabase before editing drafts.
            </CardDescription>
          </CardHeader>
        </Card>
      </>
    )
  }

  const draft = await getDraftById(id)

  if (!draft) {
    return (
      <>
        <PageHeader eyebrow="Edit draft" title="Draft not found" description="The requested draft does not exist or was deleted." />
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Draft not found</CardTitle>
            <CardDescription className="text-destructive/80">
              The requested draft does not exist or was deleted.
            </CardDescription>
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

  const versions = await listDraftVersions(id)
  const isApproved = draft.status === "approved"

  return (
    <>
      <PageHeader
        eyebrow="Edit draft"
        title={draft.title ?? `${draft.productName} ${draft.templateType}`}
        description={`${draft.productName} · ${draft.templateType.replace("_", " ")} · ${draft.aiModel ?? "manual"}`}
        actions={
          <Link href="/dashboard/drafts" className={cn(buttonVariants({ variant: "outline" }))}>
            Back to drafts
          </Link>
        }
      />

      {searchParams.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Edit failed</CardTitle>
            <CardDescription className="text-destructive/80">
              {searchParams.error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {isApproved ? (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              This draft is approved
              <Badge variant="default">approved</Badge>
            </CardTitle>
            <CardDescription className="text-amber-900/80">
              Approved drafts are read-only. Revert to draft status to enable editing. This will require re-approval after changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={revertToDraftAction}>
              <input type="hidden" name="draftId" value={draft.id} />
              <button type="submit" className={cn(buttonVariants({ variant: "default" }))}>
                Revert to draft and edit
              </button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Edit draft
              <Badge variant="secondary">{draft.status}</Badge>
            </CardTitle>
            <CardDescription>
              Changes are saved as draft. Quality checks run automatically on save. Approval is still required after editing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateDraftContentAction} className="grid gap-5">
              <input type="hidden" name="draftId" value={draft.id} />

              <StructuredPasteImport />

              <label className="grid gap-2 text-sm font-medium">
                Title
                <input
                  name="title"
                  defaultValue={draft.title ?? ""}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
                  placeholder="Draft title"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Body
                <textarea
                  name="body"
                  required
                  rows={18}
                  defaultValue={draft.body}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal leading-6"
                  placeholder="Draft body content"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Meta title
                  <input
                    name="metaTitle"
                    defaultValue={draft.metaTitle ?? ""}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  Target keyword
                  <input
                    name="targetKeyword"
                    defaultValue={draft.targetKeyword ?? ""}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium">
                Meta description
                <textarea
                  name="metaDescription"
                  rows={3}
                  defaultValue={draft.metaDescription ?? ""}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal leading-6"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Approval notes
                <textarea
                  name="approvalNotes"
                  rows={3}
                  defaultValue={draft.approvalNotes ?? ""}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal leading-6"
                  placeholder="Optional internal notes for the review trail."
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button type="submit" className={cn(buttonVariants({ variant: "default" }))}>
                  Save changes
                </button>
                <Link
                  href="/dashboard/drafts"
                  className={cn(buttonVariants({ variant: "ghost" }))}
                >
                  Cancel
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {versions.length > 0 ? (
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>Version history</CardTitle>
            <CardDescription>
              Every save creates a version. You can view or restore any previous version.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/70 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      v{version.versionNumber}
                      {" · "}
                      {version.title ?? "Untitled"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {version.changeSource.replace("_", " ")} · {formatDateTime(version.createdAt)}
                      {version.changeNotes ? ` · ${version.changeNotes}` : null}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/drafts/${id}/versions/${version.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  )
}
