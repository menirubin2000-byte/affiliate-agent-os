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
        <CardTitle>Quick product intake</CardTitle>
        <CardDescription>
          Paste the product link, finished post, image URL and optional video URL. When the finished post is filled,
          the system creates approval copies for every platform immediately.
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
              <Label htmlFor="slug">Slug (optional)</Label>
              <Input id="slug" name="slug" placeholder="auto-generated from product name" />
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

          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
            <p className="font-semibold">Shortcut flow</p>
            <p className="mt-1">
              If MENI already has the full post, do not wait for research/draft generation. Fill the finished post
              below and this product goes straight to the approval page with all platform copies created.
            </p>
            <p className="mt-1 text-xs">
              Media from the local folder must be synced first with <code>npm run sync:images</code>, or paste a
              public image/video URL here.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="image_url">Image URL (required for image platforms)</Label>
              <Input id="image_url" name="image_url" placeholder="https://example.com/product-image.jpg" type="url" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image_url_he">Hebrew image URL</Label>
              <Input id="image_url_he" name="image_url_he" placeholder="optional Hebrew creative" type="url" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video_url">Video URL</Label>
              <Input id="video_url" name="video_url" placeholder="optional for YouTube/TikTok" type="url" />
            </div>
          </div>

          <div className="grid gap-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
            <div>
              <h3 className="text-sm font-semibold">Finished post to all platforms</h3>
              <p className="text-xs text-muted-foreground">
                This is the shortcut. The post is adapted into final copies for all configured platforms and sent to
                MENI approval. Existing publish automation still waits for approval; nothing is auto-published.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_160px]">
              <div className="grid gap-2">
                <Label htmlFor="ready_post_title">Post title</Label>
                <Input id="ready_post_title" name="ready_post_title" placeholder="optional; product name is used if empty" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ready_post_language">Post language</Label>
                <select
                  id="ready_post_language"
                  name="ready_post_language"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="en"
                >
                  <option value="en">English</option>
                  <option value="he">עברית</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ready_post_body">Finished post</Label>
              <Textarea
                id="ready_post_body"
                name="ready_post_body"
                placeholder="Paste the complete post text here. If this is filled, all platform approval copies are created immediately."
                rows={10}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="price">Price</Label>
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
            <Button type="submit">Create product + all platform posts</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
