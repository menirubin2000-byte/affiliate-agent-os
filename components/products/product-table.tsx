import Link from "next/link"
import { ExternalLink, FolderOpen, Plus } from "lucide-react"

import { EmptyStateCard } from "@/components/dashboard/empty-state-card"
import { NextActionLink } from "@/components/dashboard/next-action-link"
import { WorkflowBadge } from "@/components/dashboard/workflow-badge"
import { ClaudePromptHelper } from "@/components/products/claude-prompt-helper"
import { GenerateDraftButtons } from "@/components/products/generate-draft-buttons"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, formatCurrency, formatDateTime, formatPercent, truncate } from "@/lib/utils"
import type { ProductPerformanceSignal } from "@/types/performance-insight"
import type { ProductWorkflowItem } from "@/types/workflow"

const signalVariantMap: Record<ProductPerformanceSignal["signal"], "default" | "secondary" | "destructive" | "outline"> = {
  converting: "default",
  getting_clicks: "secondary",
  no_conversions: "destructive",
  needs_refresh: "secondary",
  no_data: "outline",
}

export function ProductTable({ products, performanceSignals }: {
  products: ProductWorkflowItem[]
  performanceSignals?: Map<string, ProductPerformanceSignal>
}) {
  if (products.length === 0) {
    return (
      <EmptyStateCard
        title="No products yet"
        description="The workflow starts here. Add the first affiliate product before generating drafts."
        helperText="Once a product exists, the products table becomes the main place to generate long-form and social drafts."
        actions={[
          {
            label: "Add first product",
            href: "/dashboard/products/new",
            variant: "default",
          },
          {
            label: "Open setup checklist",
            href: "/dashboard/system",
            variant: "outline",
          },
        ]}
        icon={<Plus className="size-4" />}
      />
    )
  }

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>Product catalog</CardTitle>
        <CardDescription>Manual inputs plus SEO guidance for structured draft generation.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>SEO</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Next action</TableHead>
              <TableHead className="w-[240px]">Content workflow</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} id={`product-${product.id}`}>
                <TableCell className="align-top">
                  <div className="space-y-1">
                    <Link href={`/dashboard/products/${product.id}`} className="font-medium hover:underline underline-offset-4">
                      {product.name}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {product.brand ?? "No brand"} - {product.slug}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {product.category ?? "No category"}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={product.affiliateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Affiliate URL
                        <ExternalLink className="size-3.5" />
                      </a>
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-6 px-2 text-xs")}
                      >
                        <FolderOpen className="size-3" />
                        Workspace
                      </Link>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="space-y-2">
                    <WorkflowBadge workflow={product.workflowLabel} />
                    {performanceSignals?.get(product.id) ? (
                      <Badge variant={signalVariantMap[performanceSignals.get(product.id)!.signal]}>
                        {performanceSignals.get(product.id)!.label}
                      </Badge>
                    ) : null}
                    <div className="flex flex-wrap gap-1">
                      {product.signals.map((signal) => (
                        <Badge key={signal} variant="outline">
                          {signal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Target:</span>{" "}
                      <span className="text-muted-foreground">{product.targetKeyword ?? "None"}</span>
                    </div>
                    <div>
                      <span className="font-medium">Intent:</span>{" "}
                      <span className="text-muted-foreground">{product.searchIntent ?? "None"}</span>
                    </div>
                    {product.contentAngle ? (
                      <div className="text-muted-foreground">{truncate(product.contentAngle, 80)}</div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="align-top">{formatCurrency(product.price)}</TableCell>
                <TableCell className="align-top">{formatPercent(product.commissionRate)}</TableCell>
                <TableCell className="align-top">
                  <Badge variant={product.status === "active" ? "default" : "secondary"}>
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell className="align-top text-sm text-muted-foreground">
                  {formatDateTime(product.createdAt)}
                </TableCell>
                <TableCell className="align-top">
                  <div className="space-y-2">
                    <NextActionLink action={product.nextAction} />
                    <div className="text-xs text-muted-foreground">
                      {product.draftCount} draft{product.draftCount === 1 ? "" : "s"} /{" "}
                      {product.approvedDraftCount} approved
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="space-y-4">
                    <ClaudePromptHelper product={product} />
                    <GenerateDraftButtons productId={product.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
