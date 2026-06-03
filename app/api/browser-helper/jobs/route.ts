import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { OPERATOR_SESSION_COOKIE, verifyOperatorSessionToken } from "@/lib/operator-auth"
import { getNextPublishJobForExecutor } from "@/lib/publish-jobs-db"

export const dynamic = "force-dynamic"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value
  if (!(await verifyOperatorSessionToken(token))) {
    return NextResponse.json({ error: "Operator session required." }, { status: 401 })
  }

  const job = await getNextPublishJobForExecutor()
  return NextResponse.json({ job })
}
