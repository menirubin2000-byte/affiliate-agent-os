import { NextResponse } from "next/server"

import {
  buildDraftReport,
  draftReportToCsv,
} from "@/lib/csv-export"
import {
  listDrafts,
  listDraftVersions,
  listPerformanceMetrics,
} from "@/lib/db"
import { isSupabaseConfigured } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })
  }

  const [drafts, performanceMetrics] = await Promise.all([
    listDrafts(),
    listPerformanceMetrics(),
  ])

  // Build version counts per draft
  const versionCounts = new Map<string, number>()
  const versionPromises = drafts.map(async (d) => {
    const versions = await listDraftVersions(d.id)
    versionCounts.set(d.id, versions.length)
  })
  await Promise.all(versionPromises)

  // Build performance record counts per draft
  const perfCountsByDraft = new Map<string, number>()
  for (const m of performanceMetrics) {
    if (m.draftId) {
      perfCountsByDraft.set(m.draftId, (perfCountsByDraft.get(m.draftId) ?? 0) + 1)
    }
  }

  const rows = buildDraftReport({
    drafts,
    versionCounts,
    performanceRecordCounts: perfCountsByDraft,
  })

  const csv = draftReportToCsv(rows)
  const today = new Date().toISOString().split("T")[0]

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="draft-report-${today}.csv"`,
    },
  })
}
