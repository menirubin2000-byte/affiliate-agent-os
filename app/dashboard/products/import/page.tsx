import Link from "next/link"
import { ArrowRight, Upload } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { ProductImportForm } from "@/components/products/product-import-form"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function ProductImportPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const searchParams = await props.searchParams

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Import" title="Import Products" description="Configure Supabase before importing products." />
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Supabase is not configured</CardTitle>
          </CardHeader>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Import"
        title="Bulk product import"
        description="Paste CSV or tab-separated product data to import multiple products at once."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/products/new" className={cn(buttonVariants({ variant: "outline" }))}>
              Add single product
            </Link>
            <Link href="/dashboard/products" className={cn(buttonVariants({ variant: "ghost" }))}>
              Back to products
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
            Paste comma-separated (CSV) or tab-separated data with a header row. Required columns: name, slug, affiliate_url. All other columns are optional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-xs font-mono whitespace-pre">
{`name,slug,affiliate_url,brand,category,price,commission_rate,target_keyword,status
Product A,product-a,https://example.com/a,BrandX,Electronics,29.99,0.10,best product a,active
Product B,product-b,https://example.com/b,BrandY,Home,49.99,0.15,product b review,active`}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Optional columns: brand, category, price, commission_rate, notes, target_keyword, secondary_keywords (semicolon-separated), search_intent, content_angle, status.
          </p>
        </CardContent>
      </Card>

      <ProductImportForm />
    </>
  )
}
