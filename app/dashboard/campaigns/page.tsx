import Link from "next/link"
import { Plus } from "lucide-react"

import { createCampaignAction } from "@/app/dashboard/campaigns/actions"
import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { listCampaigns, listProducts } from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn, formatDateTime } from "@/lib/utils"
import type { Campaign, CampaignStatus } from "@/types/campaign"
import type { Product } from "@/types/product"

export const dynamic = "force-dynamic"

const statusVariantMap = {
  draft: "secondary",
  active: "default",
  paused: "outline",
  archived: "outline",
} as const

function isValidStatus(value?: string): value is CampaignStatus {
  return value === "draft" || value === "active" || value === "paused" || value === "archived"
}

const channelOptions = [
  "all", "linkedin", "medium", "substack", "tiktok", "quora", "reddit",
]

const statusOptions: Array<{ label: string; value: "all" | CampaignStatus }> = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Archived", value: "archived" },
]

export default async function CampaignsPage(props: {
  searchParams: Promise<{
    channel?: string
    status?: string
    error?: string
    created?: string
  }>
}) {
  const searchParams = await props.searchParams
  const channelFilter = channelOptions.includes(searchParams.channel ?? "")
    ? searchParams.channel
    : undefined
  const statusFilter = isValidStatus(searchParams.status) ? searchParams.status : undefined

  let campaigns: Campaign[] = []
  let products: Product[] = []
  let pageError: string | null = null

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    pageError = `${readiness.summary} ${readiness.guidance}`
  } else {
    try {
      ;[campaigns, products] = await Promise.all([
        listCampaigns({
          channel: channelFilter === "all" ? undefined : channelFilter,
          status: statusFilter,
        }),
        listProducts(),
      ])
    } catch (error) {
      pageError = error instanceof Error ? error.message : "Unable to load campaigns."
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Campaign Tracking"
        title="Campaigns"
        description="Group drafts by product and channel. Metrics are placeholders — real click tracking is a future step."
      />

      {searchParams.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription className="text-destructive/80">{searchParams.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.created ? (
        <Card className="border-green-200 bg-green-50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-green-950">Campaign created</CardTitle>
            <CardDescription className="text-green-800">
              The campaign was saved. Associate drafts with it from the draft creation form.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to load campaigns</CardTitle>
            <CardDescription className="text-destructive/80">{pageError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {/* Filters */}
      <section className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Channel</div>
          <div className="flex flex-wrap gap-1">
            {channelOptions.map((ch) => {
              const active = (channelFilter ?? "all") === ch
              const href = new URLSearchParams()
              if (ch !== "all") href.set("channel", ch)
              if (statusFilter) href.set("status", statusFilter)
              const query = href.toString()

              return (
                <Link
                  key={ch}
                  href={query ? `/dashboard/campaigns?${query}` : "/dashboard/campaigns"}
                  className={cn(
                    buttonVariants({ variant: active ? "default" : "outline", size: "sm" }),
                    "h-7 text-xs",
                  )}
                >
                  {ch === "all" ? "All" : ch}
                </Link>
              )
            })}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Status</div>
          <div className="flex flex-wrap gap-1">
            {statusOptions.map((opt) => {
              const active = (statusFilter ?? "all") === opt.value
              const href = new URLSearchParams()
              if (channelFilter && channelFilter !== "all") href.set("channel", channelFilter)
              if (opt.value !== "all") href.set("status", opt.value)
              const query = href.toString()

              return (
                <Link
                  key={opt.value}
                  href={query ? `/dashboard/campaigns?${query}` : "/dashboard/campaigns"}
                  className={cn(
                    buttonVariants({ variant: active ? "default" : "outline", size: "sm" }),
                    "h-7 text-xs",
                  )}
                >
                  {opt.label}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Campaign list */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>All campaigns</CardTitle>
            <CardDescription>
              {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"} found.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No campaigns yet. Create one below.
            </p>
          ) : (
            campaigns.map((campaign, index) => (
              <div key={campaign.id}>
                {index > 0 ? <Separator className="mb-3" /> : null}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      <Badge variant={statusVariantMap[campaign.status]}>{campaign.status}</Badge>
                      <Badge variant="outline">{campaign.channel}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {campaign.productName} · {campaign.draftCount} draft{campaign.draftCount === 1 ? "" : "s"} · {formatDateTime(campaign.createdAt)}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/campaigns/${campaign.id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 text-xs")}
                  >
                    View
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create campaign form */}
      {!pageError ? (
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-4" />
              Create campaign
            </CardTitle>
            <CardDescription>
              Group drafts for a product on a specific channel. Status starts as draft.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createCampaignAction} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium">
                  Campaign name
                  <input
                    name="name"
                    required
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
                    placeholder="e.g. Systeme.io - LinkedIn Q2"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Product
                  <select
                    name="productId"
                    required
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Channel
                  <select
                    name="channel"
                    required
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
                  >
                    <option value="">Select channel</option>
                    {["linkedin", "medium", "substack", "tiktok", "quora", "reddit"].map((ch) => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="grid gap-2 text-sm font-medium">
                Notes (optional)
                <textarea
                  name="notes"
                  rows={2}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal leading-6"
                  placeholder="Optional campaign notes"
                />
              </label>
              <button type="submit" className={cn(buttonVariants({ variant: "default" }), "w-fit")}>
                Create campaign
              </button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </>
  )
}
