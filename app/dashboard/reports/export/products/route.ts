import { NextResponse } from "next/server"

import {
  buildProductReport,
  productReportToCsv,
} from "@/lib/csv-export"
import {
  getProductPerformanceSignals,
  listCampaignLinks,
  listDrafts,
  listImprovementTasks,
  listPerformanceMetrics,
  listProducts,
} from "@/lib/db"
import { isSupabaseConfigured } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })
  }

  const [products, drafts, campaignLinks, performanceMetrics, improvementTasks, signals] =
    await Promise.all([
      listProducts(),
      listDrafts(),
      listCampaignLinks(),
      listPerformanceMetrics(),
      listImprovementTasks(),
      getProductPerformanceSignals(),
    ])

  const rows = buildProductReport({
    products,
    drafts,
    campaignLinks,
    performanceMetrics,
    improvementTasks,
    signals,
  })

  const csv = productReportToCsv(rows)
  const today = new Date().toISOString().split("T")[0]

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="product-report-${today}.csv"`,
    },
  })
}
