import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { ProductForm } from "@/components/products/product-form"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default async function NewProductPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const searchParams = await props.searchParams

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Quick product intake"
        description="Create a product and, when a finished post is provided, send all platform copies straight to MENI approval."
        actions={
          <Link
            href="/dashboard/products"
            className={cn(buttonVariants({ variant: "ghost" }))}
          >
            <ArrowLeft className="size-4" />
            Back to products
          </Link>
        }
      />

      {searchParams.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to save product</CardTitle>
            <CardDescription className="text-destructive/80">
              {searchParams.error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <ProductForm />
    </>
  )
}
