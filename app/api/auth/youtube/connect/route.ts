import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { OPERATOR_SESSION_COOKIE, verifyOperatorSessionToken } from "@/lib/operator-auth"
import { createYouTubeAuthorizeUrl } from "@/lib/youtube-official-api"

export const dynamic = "force-dynamic"

const YOUTUBE_OAUTH_STATE_COOKIE = "__aao_youtube_oauth_state"

function redirectToPlatformCapabilities(request: Request, status: string) {
  return NextResponse.redirect(
    new URL(`/dashboard/he/platform-capabilities?youtube=${status}`, request.url),
  )
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
    const oauth = createYouTubeAuthorizeUrl()
    const response = NextResponse.redirect(oauth.authorizeUrl)

    response.cookies.set(YOUTUBE_OAUTH_STATE_COOKIE, oauth.state, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: "/api/auth/youtube",
      sameSite: "lax",
      secure: true,
    })
    return response
  } catch {
    return redirectToPlatformCapabilities(request, "youtube_oauth_not_configured")
  }
}
