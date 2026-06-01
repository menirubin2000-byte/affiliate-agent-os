import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { getNextQueuedBrowserJob } from "@/lib/browser-control-db"
import { OPERATOR_SESSION_COOKIE, verifyOperatorSessionToken } from "@/lib/operator-auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value
  if (!(await verifyOperatorSessionToken(token))) {
    return NextResponse.json({ error: "Operator session required." }, { status: 401 })
  }

  const job = await getNextQueuedBrowserJob()
  return NextResponse.json({ job })
}
