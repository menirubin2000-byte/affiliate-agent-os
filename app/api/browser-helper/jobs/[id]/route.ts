import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { OPERATOR_SESSION_COOKIE, verifyOperatorSessionToken } from "@/lib/operator-auth"
import { updatePublishJobFromExecutor } from "@/lib/publish-jobs-db"
import type { PublishExecutorStatus } from "@/lib/publish-jobs-db"

export const dynamic = "force-dynamic"

const VALID_EXECUTOR_STATUSES: PublishExecutorStatus[] = [
  "pending_meni_approval",
  "approved_waiting_executor",
  "blocked_executor_not_connected",
  "running",
  "waiting_url_verification",
  "verified",
  "failed_needs_system_fix",
  "opened",
  "filled",
  "waiting_user",
  "published",
  "blocked",
  "failed",
]

function isPublishExecutorStatus(value: string): value is PublishExecutorStatus {
  return VALID_EXECUTOR_STATUSES.includes(value as PublishExecutorStatus)
}

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
    status?: string
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
  if (!isPublishExecutorStatus(body.status)) {
    return NextResponse.json({ error: "Invalid executor status." }, { status: 400 })
  }

  try {
    const job = await updatePublishJobFromExecutor({
      jobId: id,
      status: body.status,
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
