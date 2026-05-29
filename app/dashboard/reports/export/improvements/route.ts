import { NextResponse } from "next/server"

import {
  buildTaskReport,
  taskReportToCsv,
} from "@/lib/csv-export"
import {
  listImprovementTasks,
} from "@/lib/db"
import { isSupabaseConfigured } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })
  }

  const tasks = await listImprovementTasks()

  const rows = buildTaskReport({ tasks })
  const csv = taskReportToCsv(rows)
  const today = new Date().toISOString().split("T")[0]

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="improvement-tasks-${today}.csv"`,
    },
  })
}
