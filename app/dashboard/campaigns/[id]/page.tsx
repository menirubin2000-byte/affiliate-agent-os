import Link from "next/link"
import { Copy, ExternalLink, FileText, Pencil } from "lucide-react"

import { updateCampaignStatusAction } from "@/app/dashboard/campaigns/actions"
import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getCampaignById, getProductById, listDraftsForCampaign } from "@/lib/db"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn, formatDateTime } from "@/lib/utils"

export const dynamic = "force-dynamic"

const statusVariantMap = {
  draft: "secondary",
  active: "default",
  paused: "outline",
  archived: "outline",
} as const

const draftStatusVariant = {
  draft: "secondary",
  needs_review: "secondary",
  approved: "default",
  needs_changes: "outline",
  rejected: "destructive",
} as const

export default async function CampaignDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Campaign" title="Campaign" description="Configure Supabase first." />
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Supabase is not configured</CardTitle>
          </CardHeader>
        </Card>
      </>
    )
  }

  const campaign = await getCampaignById(id)

  if (!campaign) {
    return (
      <>
        <PageHeader eyebrow="Campaign" title="Campaign not found" description="The requested campaign does not exist." />
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader><CardTitle>Campaign not found</CardTitle></CardHeader>
          <CardContent>
            <Link href="/dashboard/campaigns" className={cn(buttonVariants({ variant: "outline" }))}>
              Back to campaigns
            </Link>
          </CardContent>
        </Card>
      </>
    )
  }

  const [product, drafts] = await Promise.all([
    getProductById(campaign.productId),
    listDraftsForCampaign(id),
  ])

  const approvedCount = drafts.filter((d) => d.status === "approved").length
  const draftCount = drafts.filter((d) => d.status === "draft").length

  return (
    <>
      <PageHeader
        eyebrow="Campaign detail"
        title={campaign.name}
        description={`${campaign.productName} · ${campaign.channel} · ${campaign.status}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/drafts/new" className={cn(buttonVariants({ variant: "default" }))}>
              <FileText className="size-4" />
              Create draft
            </Link>
            <Link href="/dashboard/campaigns" className={cn(buttonVariants({ variant: "ghost" }))}>
              Back to campaigns
            </Link>
          </div>
        }
      />

      {/* Summary */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Status</div>
              <Badge variant={statusVariantMap[campaign.status]}>{campaign.status}</Badge>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Channel</div>
              <p className="text-sm font-medium">{campaign.channel}</p>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Drafts</div>
              <p className="text-sm font-medium">
                {drafts.length} total · {approvedCount} approved · {draftCount} pending
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Product</div>
              {product ? (
                <Link href={`/dashboard/products/${product.id}`} className="text-sm font-medium text-primary hover:underline">
                  {product.name}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Unknown product</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status actions */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Campaign status</CardTitle>
          <CardDescription>Change campaign status. This does not publish anything.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(["draft", "active", "paused", "archived"] as const)
            .filter((s) => s !== campaign.status)
            .map((s) => (
              <form key={s} action={updateCampaignStatusAction}>
                <input type="hidden" name="campaignId" value={campaign.id} />
                <input type="hidden" name="status" value={s} />
                <Button type="submit" variant="outline" size="sm">{s}</Button>
              </form>
            ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_380px]">
        {/* Left: Drafts */}
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4" />
                Campaign drafts
              </CardTitle>
              <CardDescription>
                {drafts.length === 0
                  ? "No drafts connected to this campaign yet."
                  : `${drafts.length} draft${drafts.length === 1 ? "" : "s"} · ${approvedCount} approved`}
              </CardDescription>
            </div>
          </CardHeader>
          {drafts.length > 0 ? (
            <CardContent className="space-y-3">
              {drafts.map((draft, index) => (
                <div key={draft.id}>
                  {index > 0 ? <Separator className="mb-3" /> : null}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {draft.title ?? `${draft.templateType.replace("_", " ")}`}
                        </span>
                        <Badge variant={draftStatusVariant[draft.status]}>{draft.status}</Badge>
                        <Badge variant="outline" className="text-xs">{draft.templateType.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDateTime(draft.createdAt)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Link
                        href={`/dashboard/drafts/${draft.id}/review`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 text-xs")}
                      >
                        Review
                      </Link>
                      <Link
                        href={`/dashboard/drafts/${draft.id}/edit`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}
                      >
                        <Pencil className="size-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          ) : null}
        </Card>

        {/* Right: Metadata & tracking */}
        <div className="space-y-4">
          {/* Placeholder metrics */}
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Performance</CardTitle>
              <CardDescription>Metrics are placeholders. Real click tracking is a future step.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Clicks</div>
                <div className="mt-1 text-lg font-semibold text-muted-foreground">Not tracked yet</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Conversions</div>
                <div className="mt-1 text-lg font-semibold text-muted-foreground">Not tracked yet</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Revenue</div>
                <div className="mt-1 text-lg font-semibold text-muted-foreground">Not tracked yet</div>
              </div>
            </CardContent>
          </Card>

          {/* Suggested tracking URL */}
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Suggested tracking URL</CardTitle>
              <CardDescription>
                Generated from the affiliate link with UTM parameters. The original affiliate link is not modified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaign.suggestedTrackingUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 p-3">
                    <span className="flex-1 break-all font-mono text-xs text-muted-foreground">
                      {campaign.suggestedTrackingUrl}
                    </span>
                    <Copy className="size-3.5 shrink-0 text-muted-foreground" />
                  </div>
                  {product ? (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Original affiliate link (not modified):</div>
                      <a
                        href={product.affiliateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {product.affiliateUrl}
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No tracking URL available. The product may not have an affiliate link.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Campaign metadata */}
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Name</div>
                <p className="mt-1">{campaign.name}</p>
              </div>
              {campaign.notes ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Notes</div>
                  <p className="mt-1 text-muted-foreground">{campaign.notes}</p>
                </div>
              ) : null}
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>Created: {formatDateTime(campaign.createdAt)}</div>
                <div>Updated: {formatDateTime(campaign.updatedAt)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
