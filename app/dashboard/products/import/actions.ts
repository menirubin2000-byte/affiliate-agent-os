"use server"

import { redirect } from "next/navigation"

import { createProduct, listProducts } from "@/lib/db"
import type { ParsedProductRow } from "@/lib/product-import-parser"

export async function importProductsAction(formData: FormData) {
  const rowsJson = formData.get("rows") as string

  if (!rowsJson) {
    redirect("/dashboard/products/import?error=No+valid+rows+to+import")
  }

  let rows: ParsedProductRow[]
  try {
    rows = JSON.parse(rowsJson)
  } catch {
    redirect("/dashboard/products/import?error=Invalid+import+data")
  }

  if (rows.length === 0) {
    redirect("/dashboard/products/import?error=No+valid+rows+to+import")
  }

  const existingProducts = await listProducts()
  const existingSlugs = new Set(existingProducts.map((p) => p.slug))

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    if (existingSlugs.has(row.slug)) {
      skipped++
      continue
    }

    try {
      await createProduct({
        name: row.name,
        slug: row.slug,
        brand: row.brand,
        category: row.category,
        affiliateUrl: row.affiliateUrl,
        price: row.price,
        commissionRate: row.commissionRate,
        notes: row.notes,
        targetKeyword: row.targetKeyword,
        secondaryKeywords: row.secondaryKeywords,
        searchIntent: row.searchIntent,
        contentAngle: row.contentAngle,
        status: row.status as "active" | "inactive",
      })
      existingSlugs.add(row.slug)
      imported++
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      errors.push(`Row ${row.rowIndex}: ${message}`)
    }
  }

  const params = new URLSearchParams()
  params.set("imported", String(imported))
  params.set("skipped", String(skipped))
  if (errors.length > 0) {
    params.set("importErrors", String(errors.length))
  }

  redirect(`/dashboard/products?${params.toString()}`)
}
