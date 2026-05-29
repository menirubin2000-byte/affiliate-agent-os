import Link from "next/link"
import {
  ArrowRight,
  Bookmark,
  ExternalLink,
  Lightbulb,
  Plus,
  Star,
  Trash2,
} from "lucide-react"

import {
  createSavedViewAction,
  deleteSavedViewAction,
  saveRecommendedViewAction,
  setDefaultSavedViewAction,
} from "@/app/dashboard/saved-views/actions"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listSavedViews } from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import {
  buildFilterHref,
  getRecommendedViews,
  VALID_VIEW_TYPES,
  VIEW_TYPE_LABELS,
} from "@/lib/saved-views"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { SavedView } from "@/types/saved-view"

export const dynamic = "force-dynamic"

export default async function SavedViewsPage(props: {
  searchParams: Promise<{
    created?: string
    deleted?: string
    default_set?: string
    error?: string
  }>
}) {
  const searchParams = await props.searchParams
  let views: SavedView[] = []
  let pageError: string | null = null

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    pageError = `${readiness.summary} ${readiness.guidance}`
  } else {
    try {
      views = await listSavedViews()
    } catch (error) {
      pageError =
        error instanceof Error
          ? error.message
          : "Unable to load saved views from Supabase."
    }
  }

  const recommendedViews = getRecommendedViews()
  const savedNames = new Set(views.map((v) => v.name))

  // Group saved views by type
  const viewsByType = new Map<string, SavedView[]>()
  for (const v of views) {
    const list = viewsByType.get(v.viewType) ?? []
    list.push(v)
    viewsByType.set(v.viewType, list)
  }

  return (
    <>
      <PageHeader
        eyebrow="Views"
        title="Saved Views"
        description="Named filter presets for quick access to important operational screens. Views are read-only shortcuts and do not modify data."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/saved-views#create-view"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              <Plus className="size-4" />
              Create view
            </Link>
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
            <CardTitle>View saved</CardTitle>
            <CardDescription className="text-emerald-900/80">
              The saved view was created and is ready to use.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.deleted === "1" ? (
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>View deleted</CardTitle>
            <CardDescription>
              The saved view was removed.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.default_set === "1" ? (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardHeader>
            <CardTitle>Default updated</CardTitle>
            <CardDescription className="text-emerald-900/80">
              The default view for that type has been updated.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to load saved views</CardTitle>
            <CardDescription className="text-destructive/80">
              {pageError}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {/* Recommended views */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="size-4 text-amber-600" />
            Recommended views
          </CardTitle>
          <CardDescription>
            Common filter presets you can open directly or save for quick access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recommendedViews.map((rv) => (
              <div
                key={rv.name}
                className="flex flex-col gap-2 rounded-md border border-border/70 p-3"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {VIEW_TYPE_LABELS[rv.viewType]}
                  </Badge>
                  <span className="text-sm font-medium">{rv.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{rv.description}</p>
                <div className="mt-auto flex gap-2">
                  <Link
                    href={rv.href}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}
                  >
                    <ExternalLink className="size-3" />
                    Open
                  </Link>
                  {savedNames.has(rv.name) ? (
                    <Badge variant="secondary" className="text-xs self-center">
                      Saved
                    </Badge>
                  ) : (
                    <form action={saveRecommendedViewAction}>
                      <input type="hidden" name="name" value={rv.name} />
                      <input type="hidden" name="view_type" value={rv.viewType} />
                      <input type="hidden" name="filters" value={JSON.stringify(rv.filters)} />
                      <Button type="submit" variant="ghost" size="sm" className="text-xs">
                        <Bookmark className="size-3" />
                        Save
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Saved views list */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="size-4" />
            Your saved views ({views.length})
          </CardTitle>
          <CardDescription>
            Custom and saved recommended views. Default views are highlighted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {views.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved views yet. Save a recommended view or create a custom one below.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Filters</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {views.map((view) => (
                    <TableRow key={view.id}>
                      <TableCell className="font-medium text-sm">
                        <Link
                          href={buildFilterHref(view.viewType, view.filters)}
                          className="hover:underline"
                        >
                          {view.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {VIEW_TYPE_LABELS[view.viewType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {Object.keys(view.filters).length > 0
                          ? Object.entries(view.filters)
                              .map(([k, v]) => `${k}=${v}`)
                              .join(", ")
                          : "No filters"}
                      </TableCell>
                      <TableCell>
                        {view.isDefault ? (
                          <Badge variant="default" className="text-xs">
                            <Star className="size-3 mr-1" />
                            Default
                          </Badge>
                        ) : (
                          <form action={setDefaultSavedViewAction} className="inline">
                            <input type="hidden" name="id" value={view.id} />
                            <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              Set default
                            </Button>
                          </form>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={buildFilterHref(view.viewType, view.filters)}
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2 text-xs")}
                          >
                            <ExternalLink className="size-3" />
                            Open
                          </Link>
                          <form action={deleteSavedViewAction} className="inline">
                            <input type="hidden" name="id" value={view.id} />
                            <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive">
                              <Trash2 className="size-3" />
                              Delete
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create custom view form */}
      <Card id="create-view" className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            Create custom view
          </CardTitle>
          <CardDescription>
            Create a named filter preset with custom query parameters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createSavedViewAction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="viewName" className="text-sm font-medium">
                  Name
                </label>
                <input
                  id="viewName"
                  name="name"
                  type="text"
                  required
                  placeholder="My custom view"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="viewType" className="text-sm font-medium">
                  View type
                </label>
                <select
                  id="viewType"
                  name="view_type"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {VALID_VIEW_TYPES.map((vt) => (
                    <option key={vt} value={vt}>
                      {VIEW_TYPE_LABELS[vt]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="viewFilters" className="text-sm font-medium">
                  Filters (JSON)
                </label>
                <input
                  id="viewFilters"
                  name="filters"
                  type="text"
                  placeholder='{"status": "active"}'
                  defaultValue="{}"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono"
                />
              </div>
            </div>
            <Button type="submit">
              <Plus className="size-4" />
              Create view
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
