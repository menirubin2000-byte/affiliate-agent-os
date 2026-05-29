import Link from "next/link"
import { ArrowRight, ExternalLink, Upload } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { CampaignLinkForm } from "@/components/campaign-links/campaign-link-form"
import { CampaignLinkList } from "@/components/campaign-links/campaign-link-list"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getCampaignLinkSummary,
  listCampaignLinks,
  listPerformanceMetrics,
  listProducts,
} from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { CampaignLink, CampaignLinkSummary } from "@/types/campaign-link"
import type { Product } from "@/types/product"

export const dynamic = "force-dynamic"

export default async function CampaignLinksPage(props: {
  searchParams: Promise<{ created?: string; error?: string; status?: string; channel?: string; no_performance?: string }>
}) {
  const searchParams = await props.searchParams
  const statusFilter = searchParams.status === "archived" ? "archived" as const : searchParams.status === "active" ? "active" as const : undefined
  const channelFilter = searchParams.channel?.trim() || undefined
  const noPerformance = searchParams.no_performance === "1"
  let links: CampaignLink[] = []
  let products: Product[] = []
  let summary: CampaignLinkSummary = { total: 0, active: 0, archived: 0, withoutPerformance: 0 }
  let pageError: string | null = null

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    pageError = `${readiness.summary} ${readiness.guidance}`
  } else {
    try {
      ;[links, products, summary] = await Promise.all([
        listCampaignLinks({ status: statusFilter, channel: channelFilter }),
        listProducts(),
        getCampaignLinkSummary(),
      ])

      // Filter to links with no performance records if requested
      if (noPerformance) {
        const metrics = await listPerformanceMetrics()
        const linkedIds = new Set(metrics.filter((m) => m.campaignLinkId).map((m) => m.campaignLinkId!))
        links = links.filter((l) => !linkedIds.has(l.id))
      }
    } catch (error) {
      pageError =
        error instanceof Error ? error.message : "Unable to load campaign links from Supabase."
    }
  }

  const channels = Array.from(new Set(links.map((l) => l.channel)))

  return (
    <>
      <PageHeader
        eyebrow="Campaigns"
        title="Campaign Links"
        description="Create trackable affiliate URLs with UTM parameters. Connect campaign links to performance records to measure channel outcomes."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/campaign-links#create-campaign-link"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              <ExternalLink className="size-4" />
              Create campaign link
            </Link>
            <Link
              href="/dashboard/performance/import"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Upload className="size-4" />
              Import performance
            </Link>
            <Link
              href="/dashboard/products"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Back to products
              <ArrowRight className="size-4" />
            </Link>
          </div>
        }
      />

      {searchParams.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Campaign link error</CardTitle>
            <CardDescription className="text-destructive/80">
              {searchParams.error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.created === "1" ? (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardHeader>
            <CardTitle>Campaign link created</CardTitle>
            <CardDescription className="text-emerald-900/80">
              The campaign link was saved and is ready to use. Copy the final URL for your campaign.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to load campaign links</CardTitle>
            <CardDescription className="text-destructive/80">
              {pageError}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total links"
          value={String(summary.total)}
          detail="All campaign links created for products."
          icon={<ExternalLink className="size-4" />}
        />
        <StatCard
          label="Active links"
          value={String(summary.active)}
          detail="Links currently in use for campaigns."
          icon={<ExternalLink className="size-4" />}
        />
        <StatCard
          label="Archived"
          value={String(summary.archived)}
          detail="Links no longer active but preserved for reference."
          icon={<ExternalLink className="size-4" />}
        />
        <StatCard
          label="No performance"
          value={String(summary.withoutPerformance)}
          detail="Active links without any linked performance records."
          icon={<ExternalLink className="size-4" />}
        />
      </section>

      {/* Filters */}
      {(channels.length > 0 || statusFilter) ? (
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter campaign links by status or channel.</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <form action="/dashboard/campaign-links" className="grid gap-3 md:grid-cols-3">
              <select
                name="status"
                defaultValue={statusFilter ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Active links</option>
                <option value="archived">Archived links</option>
              </select>
              <select
                name="channel"
                defaultValue={channelFilter ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All channels</option>
                {channels.map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button className={cn(buttonVariants({ variant: "default" }))} type="submit">
                  Apply
                </button>
                {(statusFilter || channelFilter) ? (
                  <Link href="/dashboard/campaign-links" className={cn(buttonVariants({ variant: "outline" }))}>
                    Clear
                  </Link>
                ) : null}
              </div>
            </form>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <CampaignLinkForm products={products} />
        <CampaignLinkList links={links} />
      </section>
    </>
  )
}
