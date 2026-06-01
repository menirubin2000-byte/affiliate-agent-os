import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { upsertBrowserSession } from "@/lib/browser-control-db"
import { OPERATOR_SESSION_COOKIE, verifyOperatorSessionToken } from "@/lib/operator-auth"

export const dynamic = "force-dynamic"

async function assertOperatorSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value
  if (!(await verifyOperatorSessionToken(token))) {
    return false
  }
  return true
}

export async function POST(request: Request) {
  if (!(await assertOperatorSession())) {
    return NextResponse.json({ error: "Operator session required." }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    extensionInstanceId?: string
    activeTabUrl?: string
    activeTabTitle?: string
    blockerStatus?: string
  }

  const session = await upsertBrowserSession({
    extensionInstanceId: body.extensionInstanceId,
    activeTabUrl: body.activeTabUrl,
    activeTabTitle: body.activeTabTitle,
    blockerStatus: body.blockerStatus,
  })

  return NextResponse.json({ session })
}
