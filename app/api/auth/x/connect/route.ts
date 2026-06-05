import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { OPERATOR_SESSION_COOKIE, verifyOperatorSessionToken } from "@/lib/operator-auth"
import { createXAuthorizeUrl } from "@/lib/x-official-api"

export const dynamic = "force-dynamic"

const X_OAUTH_STATE_COOKIE = "__aao_x_oauth_state"
const X_OAUTH_VERIFIER_COOKIE = "__aao_x_oauth_verifier"

function redirectToPlatformCapabilities(request: Request, status: string) {
  return NextResponse.redirect(new URL(`/dashboard/he/platform-capabilities?x=${status}`, request.url))
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value

  if (!(await verifyOperatorSessionToken(token))) {
    return NextResponse.redirect(
      new URL("/login?next=/dashboard/he/platform-capabilities", request.url),
    )
  }

  try {
    const oauth = await createXAuthorizeUrl()
    const response = NextResponse.redirect(oauth.authorizeUrl)
    const cookieOptions = {
      httpOnly: true,
      maxAge: 10 * 60,
      path: "/api/auth/x",
      sameSite: "lax" as const,
      secure: true,
    }

    response.cookies.set(X_OAUTH_STATE_COOKIE, oauth.state, cookieOptions)
    response.cookies.set(X_OAUTH_VERIFIER_COOKIE, oauth.codeVerifier, cookieOptions)
    return response
  } catch {
    return redirectToPlatformCapabilities(request, "x_oauth_not_configured")
  }
}
