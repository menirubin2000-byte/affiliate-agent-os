import { createPerformanceMetricAction } from "@/app/dashboard/performance/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CampaignLink } from "@/types/campaign-link"
import type { Draft } from "@/types/draft"
import type { Product } from "@/types/product"

export function PerformanceMetricForm(props: {
  products: Product[]
  drafts: Draft[]
  campaignLinks?: CampaignLink[]
}) {
  return (
    <Card id="record-performance" className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>Record performance</CardTitle>
        <CardDescription>
          Record manual performance outcomes for a product, campaign, or draft. No ad-platform integration is used here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createPerformanceMetricAction} className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="product_id">Product</Label>
              <select
                id="product_id"
                name="product_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Select a product
                </option>
                {props.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="draft_id">Draft (optional)</Label>
              <select
                id="draft_id"
                name="draft_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="">No draft linked</option>
                {props.drafts.map((draft) => (
                  <option key={draft.id} value={draft.id}>
                    {draft.productName} - {draft.title ?? draft.templateType}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {props.campaignLinks && props.campaignLinks.length > 0 ? (
            <div className="grid gap-2">
              <Label htmlFor="campaign_link_id">Campaign link (optional)</Label>
              <select
                id="campaign_link_id"
                name="campaign_link_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="">No campaign link</option>
                {props.campaignLinks.map((link) => (
                  <option key={link.id} value={link.id}>
                    {link.productName} - {link.name} ({link.channel})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                If selected, the channel and campaign name from the campaign link will be used.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="channel">Channel</Label>
              <Input id="channel" name="channel" placeholder="Email, X, Facebook, Blog" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="campaign_name">Campaign name</Label>
              <Input
                id="campaign_name"
                name="campaign_name"
                placeholder="May review push"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="clicks">Clicks</Label>
              <Input id="clicks" name="clicks" type="number" min="0" step="1" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="conversions">Conversions</Label>
              <Input id="conversions" name="conversions" type="number" min="0" step="1" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="revenue">Revenue (USD)</Label>
              <Input id="revenue" name="revenue" type="number" min="0" step="0.01" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="recorded_at">Recorded at</Label>
            <Input id="recorded_at" name="recorded_at" type="datetime-local" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Context about where the clicks came from, caveats, or quality notes."
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={props.products.length === 0}>
              Save performance record
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
