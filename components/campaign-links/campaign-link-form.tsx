"use client"

import { useState, useMemo } from "react"
import { ExternalLink } from "lucide-react"

import { createCampaignLinkAction } from "@/app/dashboard/campaign-links/actions"
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
import { buildUtmUrl } from "@/lib/utm-builder"
import type { Product } from "@/types/product"

export function CampaignLinkForm(props: { products: Product[] }) {
  const [selectedProductId, setSelectedProductId] = useState("")
  const [source, setSource] = useState("")
  const [medium, setMedium] = useState("")
  const [campaign, setCampaign] = useState("")
  const [term, setTerm] = useState("")
  const [content, setContent] = useState("")

  const selectedProduct = props.products.find((p) => p.id === selectedProductId)
  const baseUrl = selectedProduct?.affiliateUrl ?? ""

  const utmResult = useMemo(
    () =>
      baseUrl
        ? buildUtmUrl(baseUrl, {
            utmSource: source || null,
            utmMedium: medium || null,
            utmCampaign: campaign || null,
            utmTerm: term || null,
            utmContent: content || null,
          })
        : null,
    [baseUrl, source, medium, campaign, term, content],
  )

  return (
    <Card id="create-campaign-link" className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>Create campaign link</CardTitle>
        <CardDescription>
          Build a trackable URL with UTM parameters for a product. The final URL
          is generated from the product&apos;s affiliate URL.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createCampaignLinkAction} className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cl_product_id">Product</Label>
              <select
                id="cl_product_id"
                name="product_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
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
              <Label htmlFor="cl_name">Link name</Label>
              <Input
                id="cl_name"
                name="name"
                placeholder="May 2026 Email Push"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cl_channel">Channel</Label>
              <Input
                id="cl_channel"
                name="channel"
                placeholder="Email, X, Facebook, Blog"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cl_campaign_name">Campaign name</Label>
              <Input
                id="cl_campaign_name"
                name="campaign_name"
                placeholder="spring-review-push"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="cl_source">UTM Source</Label>
              <Input
                id="cl_source"
                name="source"
                placeholder="newsletter"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cl_medium">UTM Medium</Label>
              <Input
                id="cl_medium"
                name="medium"
                placeholder="email"
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cl_term">UTM Term</Label>
              <Input
                id="cl_term"
                name="term"
                placeholder="best headphones"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cl_content">UTM Content</Label>
              <Input
                id="cl_content"
                name="content"
                placeholder="hero-button"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>

          {/* URL preview */}
          <div className="space-y-2">
            <Label>Base URL</Label>
            <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-xs font-mono break-all">
              {baseUrl || "Select a product to see the base affiliate URL"}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Final URL preview</Label>
            <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-xs font-mono break-all">
              {utmResult?.finalUrl || "Fill in UTM fields to generate a preview"}
            </div>
            {utmResult && !utmResult.valid ? (
              <p className="text-xs text-destructive">{utmResult.error}</p>
            ) : null}
          </div>

          <input type="hidden" name="base_url" value={baseUrl} />
          <input type="hidden" name="final_url" value={utmResult?.finalUrl ?? baseUrl} />

          <div className="grid gap-2">
            <Label htmlFor="cl_notes">Notes</Label>
            <Textarea
              id="cl_notes"
              name="notes"
              rows={3}
              placeholder="Context about where this link will be used."
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                props.products.length === 0 ||
                !selectedProductId ||
                !utmResult?.valid
              }
            >
              <ExternalLink className="size-4" />
              Create campaign link
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
