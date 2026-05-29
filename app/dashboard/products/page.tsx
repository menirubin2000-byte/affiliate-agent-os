import Link from "next/link"
import { Plus, Upload } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { ProductTable } from "@/components/products/product-table"
import { badgeVariants } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listProductWorkflowItems, getProductPerformanceSignals } from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { ProductPerformanceSignal } from "@/types/performance-insight"
import type { ProductWorkflowItem, WorkflowLabel } from "@/types/workflow"

export const dynamic = "force-dynamic"

const workflowOptions: Array<{ label: string; value: "all" | WorkflowLabel }> = [
  { label: "All workflows", value: "all" },
  { label: "Needs draft", value: "needs_draft" },
  { label: "Draft ready", value: "draft_ready" },
  { label: "Awaiting approval", value: "awaiting_approval" },
  { label: "Approved, not queued", value: "approved_not_queued" },
  { label: "Queued to WordPress", value: "queued_to_wordpress" },
  { label: "WordPress failed", value: "wordpress_failed" },
  { label: "Pending performance", value: "published_draft_pending_performance" },
  { label: "Performance tracked", value: "performance_tracked" },
]

function isWorkflowLabel(value?: string): value is WorkflowLabel {
  return (
    value === "needs_draft" ||
    value === "draft_ready" ||
    value === "awaiting_approval" ||
    value === "approved_not_queued" ||
    value === "queued_to_wordpress" ||
    value === "wordpress_failed" ||
    value === "published_draft_pending_performance" ||
    value === "performance_tracked"
  )
}

export default async function ProductsPage(props: {
  searchParams: Promise<{ created?: string; error?: string; workflow?: string; status?: string; needs_drafts?: string; imported?: string; skipped?: string; importErrors?: string }>
}) {
  const searchParams = await props.searchParams
  const workflow = isWorkflowLabel(searchParams.workflow) ? searchParams.workflow : undefined
  const statusFilter = searchParams.status?.trim() || undefined
  const needsDrafts = searchParams.needs_drafts === "1"
  let products: ProductWorkflowItem[] = []
  let performanceSignals = new Map<string, ProductPerformanceSignal>()
  let pageError: string | null = null

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    pageError = `${readiness.summary} ${readiness.guidance}`
  } else {
    try {
      ;[products, performanceSignals] = await Promise.all([
        listProductWorkflowItems({ workflow }),
        getProductPerformanceSignals(),
      ])

      // Apply client-side filters for status and needs_drafts
      if (statusFilter === "active" || statusFilter === "inactive") {
        products = products.filter((p) => p.status === statusFilter)
      }
      if (needsDrafts) {
        products = products.filter((p) => p.draftCount === 0)
      }
    } catch (error) {
      pageError =
        error instanceof Error ? error.message : "Unable to load products from Supabase."
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Create affiliate products, store them in Supabase, and generate drafts for manual review."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/system"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Setup checklist
            </Link>
            <Link
              href="/dashboard/products/import"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Upload className="size-4" />
              Import products
            </Link>
            <Link
              href="/dashboard/products/new"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              <Plus className="size-4" />
              {products.length === 0 ? "Add first product" : "Add product"}
            </Link>
          </div>
        }
      />

      {searchParams.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Product error</CardTitle>
            <CardDescription className="text-destructive/80">
              {searchParams.error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.created ? (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardHeader>
            <CardTitle>Product created</CardTitle>
            <CardDescription className="text-emerald-900/80">
              The product was saved in Supabase and is ready for draft generation.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.imported ? (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardHeader>
            <CardTitle>Products imported</CardTitle>
            <CardDescription className="text-emerald-900/80">
              {searchParams.imported} product{searchParams.imported === "1" ? "" : "s"} imported successfully.
              {searchParams.skipped && searchParams.skipped !== "0" ? ` ${searchParams.skipped} skipped (slug already exists).` : ""}
              {searchParams.importErrors && searchParams.importErrors !== "0" ? ` ${searchParams.importErrors} failed.` : ""}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Workflow filters</CardTitle>
          <CardDescription>
            Surface products by their next operational step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {workflowOptions.map((option) => {
              const active = (workflow ?? "all") === option.value
              const href =
                option.value === "all"
                  ? "/dashboard/products"
                  : `/dashboard/products?workflow=${option.value}`

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

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to load products</CardTitle>
            <CardDescription className="text-destructive/80">
              {pageError}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ProductTable products={products} performanceSignals={performanceSignals} />
      )}
    </>
  )
}
