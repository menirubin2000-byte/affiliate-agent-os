import { randomBytes } from "crypto"

import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const LINKEDIN_STATE_COOKIE = "__aao_linkedin_oauth_state"

export async function GET(request: Request) {
  const clientId = process.env.LINKEDIN_CLIENT_ID ?? ""
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI ?? ""
  const scopes = process.env.LINKEDIN_OAUTH_SCOPES ?? "w_member_social"

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(
      new URL("/dashboard/he/platform-capabilities?linkedin=missing_env", request.url),
    )
  }

  const state = randomBytes(16).toString("hex")

  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization")
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("scope", scopes)
  authUrl.searchParams.set("state", state)

  const cookieStore = await cookies()
  cookieStore.set(LINKEDIN_STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 600,
    path: "/api/auth/linkedin",
    sameSite: "lax",
    secure: true,
  })

  return NextResponse.redirect(authUrl.toString())
}
