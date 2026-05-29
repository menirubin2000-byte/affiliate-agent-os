import { createProductAction } from "@/app/dashboard/products/actions"
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

export function ProductForm() {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>Add product</CardTitle>
        <CardDescription>
          Save the affiliate product and its SEO strategy inputs before generating structured drafts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createProductAction} className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Product name</Label>
              <Input id="name" name="name" placeholder="Example: Acme SEO Suite" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" placeholder="acme-seo-suite" required />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" name="brand" placeholder="Acme" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" placeholder="SEO software" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="affiliate_url">Affiliate URL</Label>
            <Input
              id="affiliate_url"
              name="affiliate_url"
              placeholder="https://example.com/?ref=affiliate-id"
              type="url"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="price">Price (USD)</Label>
              <Input id="price" name="price" inputMode="decimal" placeholder="99.00" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="commission_rate">Commission rate (%)</Label>
              <Input
                id="commission_rate"
                name="commission_rate"
                inputMode="decimal"
                placeholder="30"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="target_keyword">Target keyword</Label>
              <Input
                id="target_keyword"
                name="target_keyword"
                placeholder="best seo software for small teams"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="secondary_keywords">Secondary keywords</Label>
              <Input
                id="secondary_keywords"
                name="secondary_keywords"
                placeholder="seo audit, on-page optimization, rank tracking"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="search_intent">Search intent</Label>
              <Input
                id="search_intent"
                name="search_intent"
                placeholder="Commercial investigation"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content_angle">Content angle</Label>
              <Input
                id="content_angle"
                name="content_angle"
                placeholder="Practical evaluation for lean teams"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Internal notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Positioning notes, caveats, or approval context."
              rows={6}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue="active"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Save product</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
