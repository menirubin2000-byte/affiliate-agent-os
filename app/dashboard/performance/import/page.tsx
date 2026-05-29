import Link from "next/link"
import { ArrowRight, Upload } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { PerformanceImportForm } from "@/components/performance/performance-import-form"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listCampaignLinks, listProducts } from "@/lib/db"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function PerformanceImportPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const searchParams = await props.searchParams

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Import" title="Import Performance Records" description="Configure Supabase before importing performance data." />
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Supabase is not configured</CardTitle>
          </CardHeader>
        </Card>
      </>
    )
  }

  const [products, campaignLinks] = await Promise.all([
    listProducts(),
    listCampaignLinks(),
  ])

  return (
    <>
      <PageHeader
        eyebrow="Import"
        title="Bulk performance import"
        description="Paste CSV or tab-separated performance data to import multiple records at once."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/performance#record-performance" className={cn(buttonVariants({ variant: "outline" }))}>
              Add single record
            </Link>
            <Link href="/dashboard/performance" className={cn(buttonVariants({ variant: "ghost" }))}>
              Back to performance
              <ArrowRight className="size-4" />
            </Link>
          </div>
        }
      />

      {searchParams.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Import error</CardTitle>
            <CardDescription className="text-destructive/80">{searchParams.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-4" />
            Accepted format
          </CardTitle>
          <CardDescription>
            Paste comma-separated (CSV) or tab-separated data with a header row. Required columns: product identifier (product_slug, product_id, or campaign_link_id), channel, clicks. All other columns are optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-xs font-mono whitespace-pre">
{`product_slug,channel,clicks,conversions,revenue,campaign_name,date,notes
my-product,email,120,8,45.00,spring-sale,2026-05-01,First email blast
my-product,social,85,3,18.50,instagram-may,,Organic post`}
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              <span className="font-medium">Product matching:</span> Use product_slug, product_id, or campaign_link_id. When using campaign_link_id, the product, channel, and campaign name are inherited from the link unless explicitly provided.
            </p>
            <p>
              <span className="font-medium">Optional columns:</span> conversions, revenue, campaign_name (or campaign), notes, date (or recorded_at), draft_id.
            </p>
            <p>
              <span className="font-medium">Column aliases:</span> slug = product_slug, campaign = campaign_name, date = recorded_at, campaign_link = campaign_link_id.
            </p>
          </div>
        </CardContent>
      </Card>

      <PerformanceImportForm context={{ products, campaignLinks }} />
    </>
  )
}
