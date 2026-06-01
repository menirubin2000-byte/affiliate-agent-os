import Link from "next/link"

import { createManualDraftAction } from "@/app/dashboard/drafts/actions"
import { PageHeader } from "@/components/dashboard/page-header"
import { StructuredPasteImport } from "@/components/drafts/structured-paste-import"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listProducts } from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { TemplateType } from "@/types/draft"
import type { Product } from "@/types/product"

export const dynamic = "force-dynamic"

const templateOptions: Array<{ label: string; value: TemplateType }> = [
  { label: "Review", value: "review" },
  { label: "Comparison", value: "comparison" },
  { label: "Buying guide", value: "buying_guide" },
  { label: "Social post", value: "social_post" },
  { label: "TikTok script", value: "tiktok_script" },
  { label: "Quora answer", value: "quora_answer" },
  { label: "Reddit post", value: "reddit_post" },
]

export default async function NewDraftPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const searchParams = await props.searchParams
  let products: Product[] = []
  let pageError: string | null = null

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    pageError = `${readiness.summary} ${readiness.guidance}`
  } else {
    try {
      products = await listProducts()
    } catch (error) {
      pageError =
        error instanceof Error ? error.message : "Unable to load products from Supabase."
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Manual draft"
        title="Create Draft"
        description="Paste content prepared with Claude Code or write a draft manually. It will be saved as draft and still requires approval."
        actions={
          <Link
            href="/dashboard/drafts"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Back to drafts
          </Link>
        }
      />

      {searchParams.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Manual draft failed</CardTitle>
            <CardDescription className="text-destructive/80">
              {searchParams.error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-border/70 bg-muted/30 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Paste-back workflow</CardTitle>
          <CardDescription>
            Use Claude Code to generate content, then paste the output here.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <p>1. Go to <strong>Products</strong> and copy the Claude prompt for the product you want.</p>
          <p>2. Paste the prompt into Claude Code and generate the content.</p>
          <p>3. Copy the output fields (title, body, meta title, meta description, target keyword) from Claude Code.</p>
          <p>4. Paste them into the form below and save. Quality checks run automatically on save.</p>
          <p>5. Review the draft on the <strong>Drafts</strong> page and approve or reject it.</p>
        </CardContent>
      </Card>

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to prepare manual draft form</CardTitle>
            <CardDescription className="text-destructive/80">{pageError}</CardDescription>
          </CardHeader>
        </Card>
      ) : products.length === 0 ? (
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>No products available</CardTitle>
            <CardDescription>
              Add a product before creating a manual draft.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/products/new"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Add first product
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>Draft details</CardTitle>
            <CardDescription>
              Status is always saved as draft. Approval and WordPress queueing remain separate manual steps.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createManualDraftAction} className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Product
                  <select
                    name="productId"
                    required
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  Template type
                  <select
                    name="templateType"
                    defaultValue="review"
                    required
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
                  >
                    {templateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <StructuredPasteImport />

              <label className="grid gap-2 text-sm font-medium">
                Title
                <input
                  name="title"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
                  placeholder="Product review draft title"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Body
                <textarea
                  name="body"
                  required
                  rows={14}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal leading-6"
                  placeholder="Paste Claude Code output or write the draft here. Include affiliate disclosure and a clear CTA."
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Meta title
                  <input
                    name="metaTitle"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  Target keyword
                  <input
                    name="targetKeyword"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium">
                Meta description
                <textarea
                  name="metaDescription"
                  rows={3}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal leading-6"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Approval notes
                <textarea
                  name="approvalNotes"
                  rows={3}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal leading-6"
                  placeholder="Optional internal notes. This does not approve the draft."
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className={cn(buttonVariants({ variant: "default" }))}
                >
                  Save manual draft
                </button>
                <Link
                  href="/dashboard/drafts"
                  className={cn(buttonVariants({ variant: "ghost" }))}
                >
                  Cancel
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  )
}
