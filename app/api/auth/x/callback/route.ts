import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { exchangeXAuthorizationCode } from "@/lib/x-official-api"

export const dynamic = "force-dynamic"

const X_OAUTH_STATE_COOKIE = "__aao_x_oauth_state"
const X_OAUTH_VERIFIER_COOKIE = "__aao_x_oauth_verifier"
const X_OAUTH_CONNECTED_COOKIE = "__aao_x_oauth_connected"

function redirectToPlatformCapabilities(request: Request, status: string) {
  return NextResponse.redirect(new URL(`/dashboard/he/platform-capabilities?x=${status}`, request.url))
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(X_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/api/auth/x",
    sameSite: "lax",
    secure: true,
  })
  response.cookies.set(X_OAUTH_VERIFIER_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/api/auth/x",
    sameSite: "lax",
    secure: true,
  })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const error = url.searchParams.get("error")
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const cookieStore = await cookies()
  const expectedState = cookieStore.get(X_OAUTH_STATE_COOKIE)?.value
  const codeVerifier = cookieStore.get(X_OAUTH_VERIFIER_COOKIE)?.value

  if (error) {
    const response = redirectToPlatformCapabilities(request, "x_oauth_error")
    clearOAuthCookies(response)
    return response
  }

  if (!code || !state) {
    const response = redirectToPlatformCapabilities(request, "x_oauth_invalid_callback")
    clearOAuthCookies(response)
    return response
  }

  if (!expectedState || !codeVerifier) {
    const response = redirectToPlatformCapabilities(request, "x_oauth_session_missing")
    clearOAuthCookies(response)
    return response
  }

  if (state !== expectedState) {
    const response = redirectToPlatformCapabilities(request, "x_oauth_state_invalid")
    clearOAuthCookies(response)
    return response
  }

  try {
    const token = await exchangeXAuthorizationCode({ code, codeVerifier })
    if (!token.access_token) {
      throw new Error("X OAuth callback did not return an access token.")
    }

    const response = redirectToPlatformCapabilities(request, "x_oauth_connected")
    clearOAuthCookies(response)
    response.cookies.set(X_OAUTH_CONNECTED_COOKIE, "1", {
      httpOnly: true,
      maxAge: 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: true,
    })
    return response
  } catch {
    const response = redirectToPlatformCapabilities(request, "x_oauth_token_exchange_failed")
    clearOAuthCookies(response)
    return response
  }
}
