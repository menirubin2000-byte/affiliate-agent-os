import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import {
  isHostedRuntime,
  isOperatorAccessGateConfigured,
  OPERATOR_SESSION_COOKIE,
  verifyOperatorSessionToken,
} from "@/lib/operator-auth"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next()
  }

  const gateConfigured = isOperatorAccessGateConfigured()

  if (!gateConfigured && !isHostedRuntime()) {
    return NextResponse.next()
  }

  const token = request.cookies.get(OPERATOR_SESSION_COOKIE)?.value
  const validSession = await verifyOperatorSessionToken(token)

  if (validSession) {
    return NextResponse.next()
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = "/login"
  loginUrl.search = ""
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
