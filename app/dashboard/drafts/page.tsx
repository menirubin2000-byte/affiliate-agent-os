import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { DraftList } from "@/components/drafts/draft-list"
import { badgeVariants } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listDraftWorkflowItems, listPerformanceMetrics, listProducts } from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { DraftStatus, TemplateType } from "@/types/draft"
import type { Product } from "@/types/product"
import type { DraftPublishingState, DraftWorkflowItem } from "@/types/workflow"

export const dynamic = "force-dynamic"

const statusOptions: Array<{ label: string; value: "all" | DraftStatus }> = [
  { label: "All statuses", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
]

const templateOptions: Array<{ label: string; value: "all" | TemplateType }> = [
  { label: "All templates", value: "all" },
  { label: "Review", value: "review" },
  { label: "Comparison", value: "comparison" },
  { label: "Buying guide", value: "buying_guide" },
  { label: "Social post", value: "social_post" },
  { label: "TikTok script", value: "tiktok_script" },
  { label: "Quora answer", value: "quora_answer" },
  { label: "Reddit post", value: "reddit_post" },
]

const publishingOptions: Array<{ label: string; value: "all" | DraftPublishingState }> = [
  { label: "All publishing states", value: "all" },
  { label: "Not queued", value: "not_queued" },
  { label: "Queued", value: "queued" },
  { label: "Sent", value: "sent" },
  { label: "Failed", value: "failed" },
]

function isDraftStatus(value?: string): value is DraftStatus {
  return value === "draft" || value === "approved" || value === "rejected"
}

function isTemplateType(value?: string): value is TemplateType {
  return (
    value === "review" ||
    value === "comparison" ||
    value === "buying_guide" ||
    value === "social_post" ||
    value === "tiktok_script" ||
    value === "quora_answer" ||
    value === "reddit_post"
  )
}

function isPublishingState(value?: string): value is DraftPublishingState {
  return value === "not_queued" || value === "queued" || value === "sent" || value === "failed"
}

function buildDraftsHref(params: {
  status?: "all" | DraftStatus
  templateType?: "all" | TemplateType
  publishingState?: "all" | DraftPublishingState
  productId?: string
}) {
  const searchParams = new URLSearchParams()

  if (params.status && params.status !== "all") {
    searchParams.set("status", params.status)
  }

  if (params.templateType && params.templateType !== "all") {
    searchParams.set("template", params.templateType)
  }

  if (params.publishingState && params.publishingState !== "all") {
    searchParams.set("publishing", params.publishingState)
  }

  if (params.productId) {
    searchParams.set("product", params.productId)
  }

  const query = searchParams.toString()
  return query ? `/dashboard/drafts?${query}` : "/dashboard/drafts"
}

export default async function DraftsPage(props: {
  searchParams: Promise<{
    status?: string
    template?: string
    publishing?: string
    product?: string
    needs_performance?: string
    updated?: string
    created?: string
    error?: string
  }>
}) {
  const searchParams = await props.searchParams
  const status = isDraftStatus(searchParams.status) ? searchParams.status : undefined
  const templateType = isTemplateType(searchParams.template)
    ? searchParams.template
    : undefined
  const publishingState = isPublishingState(searchParams.publishing)
    ? searchParams.publishing
    : undefined
  const productId = searchParams.product?.trim() || undefined
  const needsPerformance = searchParams.needs_performance === "1"

  let drafts: DraftWorkflowItem[] = []
  let products: Product[] = []
  let pageError: string | null = null

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    pageError = `${readiness.summary} ${readiness.guidance}`
  } else {
    try {
      ;[drafts, products] = await Promise.all([
        listDraftWorkflowItems({ status, templateType, publishingState, productId }),
        listProducts(),
      ])

      // Filter to drafts without linked performance records
      if (needsPerformance) {
        const metrics = await listPerformanceMetrics()
        const draftIdsWithPerf = new Set(metrics.filter((m) => m.draftId).map((m) => m.draftId!))
        drafts = drafts.filter((d) => !draftIdsWithPerf.has(d.id))
      }
    } catch (error) {
      pageError =
        error instanceof Error ? error.message : "Unable to load drafts from Supabase."
    }
  }

  const hasAnyFilters = Boolean(status || templateType || publishingState || productId || needsPerformance)

  return (
    <>
      <PageHeader
        eyebrow="Approval"
        title="Drafts"
        description="Generated content remains in draft until a human explicitly approves or rejects it."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/drafts/new"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Create manual draft
            </Link>
            <Link
              href="/dashboard/products"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Generate fallback draft
            </Link>
          </div>
        }
      />

      {searchParams.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Draft action failed</CardTitle>
            <CardDescription className="text-destructive/80">
              {searchParams.error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.updated && isDraftStatus(searchParams.updated) ? (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardHeader>
            <CardTitle>Draft updated</CardTitle>
            <CardDescription className="text-emerald-900/80">
              Draft status changed to {searchParams.updated}.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.created === "manual" ? (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardHeader>
            <CardTitle>Manual draft created</CardTitle>
            <CardDescription className="text-emerald-900/80">
              The draft was saved as draft and still requires human approval.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Narrow the approval queue by status or template type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Status
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => {
                const active = (status ?? "all") === option.value

                return (
                  <Link
                    key={option.value}
                    href={buildDraftsHref({
                      status: option.value,
                      templateType: templateType ?? "all",
                      publishingState: publishingState ?? "all",
                      productId,
                    })}
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
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Template type
            </div>
            <div className="flex flex-wrap gap-2">
              {templateOptions.map((option) => {
                const active = (templateType ?? "all") === option.value

                return (
                  <Link
                    key={option.value}
                    href={buildDraftsHref({
                      status: status ?? "all",
                      templateType: option.value,
                      publishingState: publishingState ?? "all",
                      productId,
                    })}
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
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Publishing state
            </div>
            <div className="flex flex-wrap gap-2">
              {publishingOptions.map((option) => {
                const active = (publishingState ?? "all") === option.value

                return (
                  <Link
                    key={option.value}
                    href={buildDraftsHref({
                      status: status ?? "all",
                      templateType: templateType ?? "all",
                      publishingState: option.value,
                      productId,
                    })}
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
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Product
            </div>
            <form action="/dashboard/drafts" className="flex flex-wrap gap-2">
              {status ? <input type="hidden" name="status" value={status} /> : null}
              {templateType ? <input type="hidden" name="template" value={templateType} /> : null}
              {publishingState ? <input type="hidden" name="publishing" value={publishingState} /> : null}
              <select
                name="product"
                defaultValue={productId ?? ""}
                className="flex h-10 min-w-[240px] rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className={cn(
                  badgeVariants({ variant: "default" }),
                  "h-10 rounded-md px-4 text-sm",
                )}
              >
                Apply
              </button>
              {productId ? (
                <Link
                  href={buildDraftsHref({
                    status: status ?? "all",
                    templateType: templateType ?? "all",
                    publishingState: publishingState ?? "all",
                  })}
                  className={cn(
                    badgeVariants({ variant: "secondary" }),
                    "h-10 rounded-md px-4 text-sm",
                  )}
                >
                  Clear product
                </Link>
              ) : null}
            </form>
          </div>
        </CardContent>
      </Card>

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to load drafts</CardTitle>
            <CardDescription className="text-destructive/80">
              {pageError}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <DraftList
          drafts={drafts}
          emptyTitle={hasAnyFilters ? "No drafts match the current filters" : "No drafts found"}
          emptyDescription={
            hasAnyFilters
              ? "Try a different status or template filter, or generate another draft from the products page."
              : "Generate review, comparison, buying guide, or social drafts from the products table first."
          }
          emptyActions={
            hasAnyFilters
              ? [
                  { label: "Clear filters", href: "/dashboard/drafts", variant: "outline" },
                  { label: "Create manual draft", href: "/dashboard/drafts/new", variant: "ghost" },
                ]
              : [
                  { label: "Create manual draft", href: "/dashboard/drafts/new", variant: "default" },
                  { label: "Generate fallback draft", href: "/dashboard/products", variant: "ghost" },
                  { label: "Review setup checklist", href: "/dashboard/system", variant: "outline" },
                ]
          }
        />
      )}
    </>
  )
}
