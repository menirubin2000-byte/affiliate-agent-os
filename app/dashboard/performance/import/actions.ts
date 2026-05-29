"use server"

import { redirect } from "next/navigation"

import { createPerformanceMetric } from "@/lib/db"
import type { ParsedPerformanceRow } from "@/lib/performance-import-parser"

export async function importPerformanceRecordsAction(formData: FormData) {
  const rowsJson = formData.get("rows") as string

  if (!rowsJson) {
    redirect("/dashboard/performance/import?error=No+valid+rows+to+import")
  }

  let rows: ParsedPerformanceRow[]
  try {
    rows = JSON.parse(rowsJson)
  } catch {
    redirect("/dashboard/performance/import?error=Invalid+import+data")
  }

  if (rows.length === 0) {
    redirect("/dashboard/performance/import?error=No+valid+rows+to+import")
  }

  let imported = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      await createPerformanceMetric({
        productId: row.productId,
        draftId: row.draftId,
        campaignLinkId: row.campaignLinkId,
        channel: row.channel,
        campaignName: row.campaignName,
        clicks: row.clicks,
        conversions: row.conversions,
        revenue: row.revenue,
        notes: row.notes,
        recordedAt: row.recordedAt,
      })
      imported++
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      errors.push(`Row ${row.rowIndex}: ${message}`)
    }
  }

  const params = new URLSearchParams()
  params.set("imported", String(imported))
  if (errors.length > 0) {
    params.set("importErrors", String(errors.length))
  }

  redirect(`/dashboard/performance?${params.toString()}`)
}
