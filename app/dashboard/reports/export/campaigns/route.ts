import { NextResponse } from "next/server"

import {
  buildCampaignReport,
  campaignReportToCsv,
} from "@/lib/csv-export"
import {
  listCampaignLinks,
  listPerformanceMetrics,
} from "@/lib/db"
import { isSupabaseConfigured } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })
  }

  const [campaignLinks, performanceMetrics] = await Promise.all([
    listCampaignLinks(),
    listPerformanceMetrics(),
  ])

  const rows = buildCampaignReport({ campaignLinks, performanceMetrics })
  const csv = campaignReportToCsv(rows)
  const today = new Date().toISOString().split("T")[0]

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="campaign-report-${today}.csv"`,
    },
  })
}
