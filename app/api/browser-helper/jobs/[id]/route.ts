import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { updateBrowserJobFromHelper } from "@/lib/browser-control-db"
import { OPERATOR_SESSION_COOKIE, verifyOperatorSessionToken } from "@/lib/operator-auth"
import type { BrowserJobStatus } from "@/types/browser-control"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies()
  const token = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value
  if (!(await verifyOperatorSessionToken(token))) {
    return NextResponse.json({ error: "Operator session required." }, { status: 401 })
  }

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as {
    status?: BrowserJobStatus
    browserSessionId?: string
    activeTabUrl?: string
    blockerReason?: string
    errorMessage?: string
    postUrl?: string
    message?: string
  }

  if (!body.status) {
    return NextResponse.json({ error: "status is required." }, { status: 400 })
  }

  try {
    const job = await updateBrowserJobFromHelper({
      jobId: id,
      status: body.status,
      browserSessionId: body.browserSessionId,
      activeTabUrl: body.activeTabUrl,
      blockerReason: body.blockerReason,
      errorMessage: body.errorMessage,
      postUrl: body.postUrl,
      message: body.message,
    })
    return NextResponse.json({ job })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update browser job." },
      { status: 400 },
    )
  }
}
