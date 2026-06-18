import Link from "next/link"
import { ArrowRight, ExternalLink, PlayCircle, RadioTower } from "lucide-react"

import { saveYouTubeDistributionWorkflowAction } from "@/app/dashboard/products/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { CampaignLink } from "@/types/campaign-link"
import {
  DISTRIBUTION_POSTING_METHOD_LABELS,
  VALID_DISTRIBUTION_POSTING_METHODS,
  VALID_YOUTUBE_DISTRIBUTION_STATUSES,
  YOUTUBE_DISTRIBUTION_STATUS_LABELS,
} from "@/types/youtube-distribution-workflow"
import type { YouTubeDistributionWorkflowView } from "@/lib/youtube-distribution-workflow"

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

export function YouTubeDistributionWorkflowCard(props: {
  productId: string
  view: YouTubeDistributionWorkflowView
  campaignLinks: CampaignLink[]
}) {
  const { productId, view, campaignLinks } = props

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="size-4" />
            YouTube-first distribution workflow
          </CardTitle>
          <Badge variant={view.statusVariant}>{view.statusLabel}</Badge>
          {view.youtubeViews !== null ? (
            <Badge variant="outline">{view.youtubeViews} YouTube views</Badge>
          ) : null}
        </div>
        <CardDescription>
          Build the YouTube asset first, then distribute the live video manually on Reddit, Quora, and Medium when needed. No auto-posting, no scraping, and no direct platform bypass.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-background/70 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Next action</div>
            <p className="mt-2 text-sm font-medium">{view.nextAction}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Tracking scope</div>
            <p className="mt-2 text-sm text-muted-foreground">{view.trackingScopeLabel}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Clicks / conversions</div>
            <p className="mt-2 text-sm font-medium">
              {view.totalClicks} clicks · {view.totalConversions} conversions
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Revenue</div>
            <p className="mt-2 text-sm font-medium">{formatMoney(view.totalRevenue)}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-background/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <RadioTower className="size-4" />
              Distribution URLs
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>YouTube: {view.values.youtubeUrl || "Not saved yet"}</div>
              <div>Reddit: {view.values.redditSharedUrl || "Not saved yet"}</div>
              <div>Quora: {view.values.quoraSharedUrl || "Not saved yet"}</div>
              <div>Medium/manual: {view.values.mediumSharedUrl || "Not saved yet"}</div>
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-background/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <ExternalLink className="size-4" />
              Campaign link
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="break-all font-mono text-xs">{view.suggestedCampaignLinkUrl}</p>
              {view.activeCampaignLink ? (
                <p>
                  Using saved YouTube link: <span className="font-medium">{view.activeCampaignLink.name}</span>
                </p>
              ) : (
                <p>No active YouTube campaign link exists yet. The suggested URL above is ready to store.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {view.performanceByChannel.map((channel) => (
            <div key={channel.channel} className="rounded-lg border border-border/70 bg-background/70 p-4">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{channel.channel}</div>
              <p className="mt-2 text-sm font-medium">
                {channel.clicks} clicks · {channel.conversions} conversions
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{formatMoney(channel.revenue)} revenue</p>
            </div>
          ))}
        </div>

        <form action={saveYouTubeDistributionWorkflowAction} className="grid gap-6">
          <input type="hidden" name="product_id" value={productId} />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="grid gap-2">
              <Label htmlFor="ytwf_status">Status</Label>
              <select
                id="ytwf_status"
                name="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={view.values.status}
              >
                {VALID_YOUTUBE_DISTRIBUTION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {YOUTUBE_DISTRIBUTION_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ytwf_youtube_method">YouTube method</Label>
              <select
                id="ytwf_youtube_method"
                name="youtube_posting_method"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={view.values.youtubePostingMethod}
              >
                {VALID_DISTRIBUTION_POSTING_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {DISTRIBUTION_POSTING_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ytwf_reddit_method">Reddit method</Label>
              <select
                id="ytwf_reddit_method"
                name="reddit_posting_method"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={view.values.redditPostingMethod}
              >
                {VALID_DISTRIBUTION_POSTING_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {DISTRIBUTION_POSTING_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ytwf_quora_method">Quora method</Label>
              <select
                id="ytwf_quora_method"
                name="quora_posting_method"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={view.values.quoraPostingMethod}
              >
                {VALID_DISTRIBUTION_POSTING_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {DISTRIBUTION_POSTING_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ytwf_medium_method">Medium method</Label>
              <select
                id="ytwf_medium_method"
                name="medium_posting_method"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={view.values.mediumPostingMethod}
              >
                {VALID_DISTRIBUTION_POSTING_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {DISTRIBUTION_POSTING_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ytwf_video_idea">YouTube video idea</Label>
              <Textarea id="ytwf_video_idea" name="youtube_video_idea" rows={3} defaultValue={view.values.youtubeVideoIdea} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ytwf_youtube_title">YouTube title</Label>
              <Textarea id="ytwf_youtube_title" name="youtube_title" rows={3} defaultValue={view.values.youtubeTitle} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ytwf_thumbnail_angle">Thumbnail angle</Label>
              <Textarea id="ytwf_thumbnail_angle" name="thumbnail_angle" rows={3} defaultValue={view.values.thumbnailAngle} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ytwf_recommended_cta">Recommended CTA</Label>
              <Textarea id="ytwf_recommended_cta" name="recommended_cta" rows={3} defaultValue={view.values.recommendedCta} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ytwf_short_script">60-second script</Label>
              <Textarea id="ytwf_short_script" name="short_script" rows={8} defaultValue={view.values.shortScript} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ytwf_long_outline">Longer video outline</Label>
              <Textarea id="ytwf_long_outline" name="long_video_outline" rows={8} defaultValue={view.values.longVideoOutline} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ytwf_description">Description with affiliate disclosure</Label>
              <Textarea id="ytwf_description" name="description_with_disclosure" rows={8} defaultValue={view.values.descriptionWithDisclosure} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ytwf_pinned_comment">Pinned comment text</Label>
              <Textarea id="ytwf_pinned_comment" name="pinned_comment_text" rows={8} defaultValue={view.values.pinnedCommentText} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ytwf_reddit_a">Reddit variant A</Label>
              <Textarea id="ytwf_reddit_a" name="reddit_variant_a" rows={7} defaultValue={view.values.redditVariantA} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ytwf_reddit_b">Reddit variant B</Label>
              <Textarea id="ytwf_reddit_b" name="reddit_variant_b" rows={7} defaultValue={view.values.redditVariantB} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ytwf_quora_a">Quora variant A</Label>
              <Textarea id="ytwf_quora_a" name="quora_variant_a" rows={7} defaultValue={view.values.quoraVariantA} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ytwf_quora_b">Quora variant B</Label>
              <Textarea id="ytwf_quora_b" name="quora_variant_b" rows={7} defaultValue={view.values.quoraVariantB} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ytwf_medium_variant">Medium/manual browser variant</Label>
            <Textarea id="ytwf_medium_variant" name="medium_variant" rows={7} defaultValue={view.values.mediumVariant} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="ytwf_youtube_url">YouTube URL</Label>
              <Input id="ytwf_youtube_url" name="youtube_url" type="url" defaultValue={view.values.youtubeUrl} placeholder="https://www.youtube.com/watch?v=..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ytwf_reddit_url">Reddit shared URL</Label>
              <Input id="ytwf_reddit_url" name="reddit_shared_url" type="url" defaultValue={view.values.redditSharedUrl} placeholder="https://www.reddit.com/..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ytwf_quora_url">Quora shared URL</Label>
              <Input id="ytwf_quora_url" name="quora_shared_url" type="url" defaultValue={view.values.quoraSharedUrl} placeholder="https://www.quora.com/..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ytwf_medium_url">Medium/manual browser URL</Label>
              <Input id="ytwf_medium_url" name="medium_shared_url" type="url" defaultValue={view.values.mediumSharedUrl} placeholder="https://medium.com/..." />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="ytwf_youtube_views">YouTube views</Label>
              <Input id="ytwf_youtube_views" name="youtube_views" type="number" min="0" step="1" defaultValue={view.values.youtubeViews} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ytwf_campaign_link_id">Campaign link</Label>
              <select
                id="ytwf_campaign_link_id"
                name="campaign_link_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={view.values.campaignLinkId}
              >
                <option value="">No saved campaign link selected</option>
                {campaignLinks
                  .filter((link) => link.status === "active")
                  .map((link) => (
                    <option key={link.id} value={link.id}>
                      {link.name} ({link.channel})
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ytwf_campaign_link_url">Campaign link URL</Label>
              <Input id="ytwf_campaign_link_url" name="campaign_link_url" type="url" defaultValue={view.values.campaignLinkUrl} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ytwf_notes">Operator notes</Label>
            <Textarea
              id="ytwf_notes"
              name="notes"
              rows={4}
              defaultValue={view.values.notes}
              placeholder="Manual notes about subreddit fit, Quora angles, browser-extension issues, or next actions."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/70 px-3 py-1">Operator-approved/manual only</span>
              <span className="rounded-full border border-border/70 px-3 py-1">Do not auto-post</span>
              <span className="rounded-full border border-border/70 px-3 py-1">Keep affiliate disclosure</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/campaign-links#create-campaign-link"
                className={cn("inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted")}
              >
                Create campaign link
              </Link>
              <Link
                href="/dashboard/performance#record-performance"
                className={cn("inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted")}
              >
                Record performance
                <ArrowRight className="ml-1 size-3.5" />
              </Link>
              <Button type="submit">
                <PlayCircle className="size-4" />
                Save workflow
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
