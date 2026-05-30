import Link from "next/link"
import type { ReactNode } from "react"
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react"

import { updateApprovalItemStatusAction } from "@/app/dashboard/approvals/actions"
import { PageHeader } from "@/components/dashboard/page-header"
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
  getOperatorActionItems,
  listAffiliatePrograms,
  listApprovalItems,
  listCampaignLinks,
  listDrafts,
  listPerformanceMetrics,
  listProducts,
} from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn, formatDateTime, truncate } from "@/lib/utils"
import {
  APPROVAL_ITEM_STATUS_LABELS,
  APPROVAL_ITEM_TYPE_LABELS,
  type ApprovalItem,
} from "@/types/approval-item"
import {
  PROGRAM_STATUS_LABELS,
  type AffiliateProgram,
} from "@/types/affiliate-program"
import type { CampaignLink } from "@/types/campaign-link"
import type { Draft } from "@/types/draft"
import type { PerformanceMetric } from "@/types/performance"
import type { Product } from "@/types/product"

export const dynamic = "force-dynamic"

type PlatformKey = "linkedin" | "medium" | "substack"

const platformLabels: Record<PlatformKey, string> = {
  linkedin: "LinkedIn",
  medium: "Medium",
  substack: "Substack",
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No"
}

function statusVariant(status: string) {
  if (status === "approved" || status === "link_ready" || status === "published") {
    return "default" as const
  }
  if (status === "rejected" || status === "closed") {
    return "destructive" as const
  }
  return "secondary" as const
}

function priorityVariant(priority: string) {
  if (priority === "critical" || priority === "high") return "destructive" as const
  if (priority === "medium") return "secondary" as const
  return "outline" as const
}

function currency(value: number | null) {
  if (value === null) return "-"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

function groupByProductId<T extends { productId: string | null }>(items: T[]) {
  const grouped = new Map<string, T[]>()
  for (const item of items) {
    if (!item.productId) continue
    grouped.set(item.productId, [...(grouped.get(item.productId) ?? []), item])
  }
  return grouped
}

function getProductNextAction(params: {
  product: Product
  programs: AffiliateProgram[]
  drafts: Draft[]
  campaignLinks: CampaignLink[]
  performance: PerformanceMetric[]
}) {
  const hasAffiliateLink = Boolean(params.product.affiliateUrl.trim())
  const hasApprovedDraft = params.drafts.some((draft) => draft.status === "approved")
  const hasProgram = params.programs.length > 0

  if (!hasAffiliateLink) return "Add affiliate link"
  if (!hasProgram) return "Add affiliate program"
  if (!hasApprovedDraft) return "Create or approve content"
  if (params.campaignLinks.length === 0) return "Create campaign links"
  if (params.performance.length === 0) return "Record performance after first share"
  return "Review performance"
}

function getProgramNextAction(program: AffiliateProgram) {
  switch (program.status) {
    case "research_needed":
      return "Verify terms and signup path"
    case "signup_needed":
      return "Complete signup manually"
    case "awaiting_human_approval":
      return "Approve submitting application"
    case "submitted":
      return "Check dashboard/email for approval"
    case "approved":
      return program.affiliateLink ? "Mark link ready" : "Copy affiliate link"
    case "link_ready":
      return "Use link in campaigns"
    case "rejected":
      return "Review rejection and decide"
    case "closed":
      return "Find replacement program"
    default:
      return "Review program"
  }
}

function platformState(params: {
  productId: string
  platform: PlatformKey
  linksByProduct: Map<string, CampaignLink[]>
  approvalsByProduct: Map<string, ApprovalItem[]>
}) {
  const links = params.linksByProduct.get(params.productId) ?? []
  const approvals = params.approvalsByProduct.get(params.productId) ?? []
  const platform = params.platform
  const matchingApproval = approvals.find(
    (item) => item.platform?.toLowerCase() === platform,
  )
  const matchingLink = links.find((link) => link.channel.toLowerCase() === platform)

  if (matchingApproval?.status === "published") {
    return {
      status: "Published",
      url: matchingApproval.campaignLinkUrl ?? matchingLink?.finalUrl ?? null,
    }
  }

  if (matchingApproval?.status === "waiting_approval") {
    return {
      status: "Waiting approval",
      url: matchingApproval.campaignLinkUrl ?? matchingLink?.finalUrl ?? null,
    }
  }

  if (matchingApproval?.status === "approved") {
    return {
      status: "Approved for manual action",
      url: matchingApproval.campaignLinkUrl ?? matchingLink?.finalUrl ?? null,
    }
  }

  if (matchingLink) {
    return { status: "Link prepared", url: matchingLink.finalUrl }
  }

  return { status: "Not prepared", url: null }
}

function TableShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">{children}</div>
      </CardContent>
    </Card>
  )
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-6 text-center text-sm text-muted-foreground">
        {label}
      </td>
    </tr>
  )
}

function ExternalUrl({ url }: { url: string | null }) {
  if (!url) return <span className="text-muted-foreground">None</span>

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-[220px] items-center gap-1 text-primary hover:underline"
    >
      <span className="truncate">{truncate(url, 54)}</span>
      <ExternalLink className="size-3" />
    </a>
  )
}

export default async function OperatorDashboardPage() {
  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    return (
      <>
        <PageHeader
          eyebrow="Operator"
          title="Operator Dashboard"
          description="Daily operating view for products, affiliate programs, manual distribution, approvals, and performance."
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

  let products: Product[] = []
  let drafts: Draft[] = []
  let programs: AffiliateProgram[] = []
  let campaignLinks: CampaignLink[] = []
  let performance: PerformanceMetric[] = []
  let approvals: ApprovalItem[] = []
  let topActions: Awaited<ReturnType<typeof getOperatorActionItems>> = []
  let pageError: string | null = null

  try {
    ;[
      products,
      drafts,
      programs,
      campaignLinks,
      performance,
      approvals,
      topActions,
    ] = await Promise.all([
      listProducts(),
      listDrafts(),
      listAffiliatePrograms(),
      listCampaignLinks(),
      listPerformanceMetrics(),
      listApprovalItems(),
      getOperatorActionItems({ limit: 5 }),
    ])
  } catch (error) {
    pageError = error instanceof Error ? error.message : "Unable to load operator data."
  }

  const draftsByProduct = groupByProductId(drafts)
  const programsByProduct = groupByProductId(programs)
  const linksByProduct = groupByProductId(campaignLinks)
  const performanceByProduct = groupByProductId(performance)
  const approvalsByProduct = groupByProductId(approvals)
  const pendingApprovals = approvals.filter((item) => item.status === "waiting_approval")

  return (
    <>
      <PageHeader
        eyebrow="Operator"
        title="Operator Dashboard"
        description="One screen for MENI's daily manual workflow. It reads existing data only and keeps every publish or approval action human-controlled."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/command-center"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Command Center
            </Link>
            <Link
              href="/dashboard/products/new"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Add product
            </Link>
          </div>
        }
      />

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to load operator dashboard</CardTitle>
            <CardDescription className="text-destructive/80">{pageError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <TableShell
        title="Top next actions"
        description="The five most important manual actions from the existing command-center logic."
      >
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {topActions.length === 0 ? (
              <EmptyRow colSpan={5} label="No urgent actions right now." />
            ) : (
              topActions.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">
                    <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
                  </td>
                  <td className="px-3 py-3 capitalize text-muted-foreground">
                    {item.source.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-3 font-medium">{item.title}</td>
                  <td className="px-3 py-3 text-muted-foreground">{item.description}</td>
                  <td className="px-3 py-3">
                    <Link
                      href={item.actionHref}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      {item.actionLabel}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>

      <TableShell
        title="Products"
        description="Product readiness across affiliate links, approved content, distribution, and next action."
      >
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Product name</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Affiliate status</th>
              <th className="px-3 py-2">Affiliate link</th>
              <th className="px-3 py-2">Content ready</th>
              <th className="px-3 py-2">Published platforms</th>
              <th className="px-3 py-2">Next action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {products.length === 0 ? (
              <EmptyRow colSpan={7} label="No products yet." />
            ) : (
              products.map((product) => {
                const productDrafts = draftsByProduct.get(product.id) ?? []
                const productPrograms = programsByProduct.get(product.id) ?? []
                const productLinks = linksByProduct.get(product.id) ?? []
                const productPerformance = performanceByProduct.get(product.id) ?? []
                const publishedPlatforms = (approvalsByProduct.get(product.id) ?? [])
                  .filter((item) => item.status === "published" && item.platform)
                  .map((item) => item.platform)
                const affiliateStatus =
                  productPrograms.length > 0
                    ? productPrograms.map((program) => PROGRAM_STATUS_LABELS[program.status]).join(", ")
                    : "No program"
                const contentReady = productDrafts.some((draft) => draft.status === "approved")

                return (
                  <tr key={product.id}>
                    <td className="px-3 py-3">
                      <Link href={`/dashboard/products/${product.id}`} className="font-medium text-primary hover:underline">
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{product.category ?? "None"}</td>
                    <td className="px-3 py-3">{affiliateStatus}</td>
                    <td className="px-3 py-3">{yesNo(Boolean(product.affiliateUrl.trim()))}</td>
                    <td className="px-3 py-3">{yesNo(contentReady)}</td>
                    <td className="px-3 py-3">{publishedPlatforms.length > 0 ? publishedPlatforms.join(", ") : "None"}</td>
                    <td className="px-3 py-3">
                      {getProductNextAction({
                        product,
                        programs: productPrograms,
                        drafts: productDrafts,
                        campaignLinks: productLinks,
                        performance: productPerformance,
                      })}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </TableShell>

      <TableShell
        title="Affiliate programs"
        description="Signup and link-readiness status for tracked affiliate programs."
      >
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="border-b text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Program status</th>
              <th className="px-3 py-2">Network</th>
              <th className="px-3 py-2">Signup URL</th>
              <th className="px-3 py-2">Dashboard URL</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2">Next human action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {programs.length === 0 ? (
              <EmptyRow colSpan={7} label="No affiliate programs tracked yet." />
            ) : (
              programs.map((program) => (
                <tr key={program.id}>
                  <td className="px-3 py-3">{program.productName ?? "Unlinked"}</td>
                  <td className="px-3 py-3">
                    <Badge variant={statusVariant(program.status)}>
                      {PROGRAM_STATUS_LABELS[program.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{program.network ?? "None"}</td>
                  <td className="px-3 py-3"><ExternalUrl url={program.signupUrl} /></td>
                  <td className="px-3 py-3"><ExternalUrl url={program.dashboardUrl} /></td>
                  <td className="px-3 py-3 text-muted-foreground">{program.notes ? truncate(program.notes, 120) : "None"}</td>
                  <td className="px-3 py-3">{getProgramNextAction(program)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>

      <TableShell
        title="Publishing"
        description="Manual distribution readiness by platform. These are not auto-publish states."
      >
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="border-b text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">LinkedIn status + URL</th>
              <th className="px-3 py-2">Medium status + URL</th>
              <th className="px-3 py-2">Substack status + URL</th>
              <th className="px-3 py-2">Disclosure status</th>
              <th className="px-3 py-2">Approval status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {products.length === 0 ? (
              <EmptyRow colSpan={6} label="No products available for distribution." />
            ) : (
              products.map((product) => {
                const productDrafts = draftsByProduct.get(product.id) ?? []
                const approvedDraft = productDrafts.find((draft) => draft.status === "approved")
                const hasDisclosure = Boolean(approvedDraft?.qualityChecks.has_disclosure)
                const approvalStatus = approvedDraft ? "Approved content ready" : "No approved draft"

                return (
                  <tr key={product.id}>
                    <td className="px-3 py-3 font-medium">{product.name}</td>
                    {(["linkedin", "medium", "substack"] as PlatformKey[]).map((platform) => {
                      const state = platformState({
                        productId: product.id,
                        platform,
                        linksByProduct,
                        approvalsByProduct,
                      })
                      return (
                        <td key={platform} className="px-3 py-3">
                          <div className="space-y-1">
                            <div>{platformLabels[platform]}: {state.status}</div>
                            <ExternalUrl url={state.url} />
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-3 py-3">{hasDisclosure ? "Disclosure present" : "Needs disclosure check"}</td>
                    <td className="px-3 py-3">{approvalStatus}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </TableShell>

      <TableShell
        title="Performance"
        description="Real recorded performance only. No fake traffic or placeholder metrics."
      >
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Platform</th>
              <th className="px-3 py-2">Clicks</th>
              <th className="px-3 py-2">Conversions</th>
              <th className="px-3 py-2">Revenue</th>
              <th className="px-3 py-2">Last checked</th>
              <th className="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {performance.length === 0 ? (
              <EmptyRow colSpan={7} label="No performance records yet. Add records only after real manual sharing." />
            ) : (
              performance.map((record) => (
                <tr key={record.id}>
                  <td className="px-3 py-3">{record.productName}</td>
                  <td className="px-3 py-3">{record.channel}</td>
                  <td className="px-3 py-3">{record.clicks}</td>
                  <td className="px-3 py-3">{record.conversions ?? "-"}</td>
                  <td className="px-3 py-3">{currency(record.revenue)}</td>
                  <td className="px-3 py-3">{formatDateTime(record.recordedAt)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{record.notes ? truncate(record.notes, 100) : "None"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>

      <TableShell
        title="Approvals"
        description="Pending human decisions. Buttons update approval records only; they do not publish anything."
      >
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Platform</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Approve / reject</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {pendingApprovals.length === 0 ? (
              <EmptyRow colSpan={5} label="No pending approvals." />
            ) : (
              pendingApprovals.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">{item.productName ?? "Unlinked"}</td>
                  <td className="px-3 py-3">{item.platform ?? "None"}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {APPROVAL_ITEM_TYPE_LABELS[item.approvalType]}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={statusVariant(item.status)}>
                      {APPROVAL_ITEM_STATUS_LABELS[item.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <form action={updateApprovalItemStatusAction}>
                        <input type="hidden" name="item_id" value={item.id} />
                        <input type="hidden" name="status" value="approved" />
                        <input
                          type="hidden"
                          name="operator_notes"
                          value="Approved from operator dashboard."
                        />
                        <button
                          type="submit"
                          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                        >
                          <CheckCircle2 className="size-4" />
                          Approve
                        </button>
                      </form>
                      <form action={updateApprovalItemStatusAction}>
                        <input type="hidden" name="item_id" value={item.id} />
                        <input type="hidden" name="status" value="rejected" />
                        <input
                          type="hidden"
                          name="operator_notes"
                          value="Rejected from operator dashboard."
                        />
                        <button
                          type="submit"
                          className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
                        >
                          <XCircle className="size-4" />
                          Reject
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </>
  )
}
