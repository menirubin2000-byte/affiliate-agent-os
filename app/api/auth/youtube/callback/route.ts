import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { upsertYouTubePlatformConnection } from "@/lib/platform-connections-db"
import {
  exchangeYouTubeAuthorizationCode,
  fetchYouTubeConnectedChannel,
  validateYouTubeOAuthCallbackState,
} from "@/lib/youtube-official-api"

export const dynamic = "force-dynamic"

const YOUTUBE_OAUTH_STATE_COOKIE = "__aao_youtube_oauth_state"
const YOUTUBE_OAUTH_CONNECTED_COOKIE = "__aao_youtube_oauth_connected"

function redirectToPlatformCapabilities(request: Request, status: string) {
  return NextResponse.redirect(
    new URL(`/dashboard/he/platform-capabilities?youtube=${status}`, request.url),
  )
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(YOUTUBE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/api/auth/youtube",
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
  const expectedState = cookieStore.get(YOUTUBE_OAUTH_STATE_COOKIE)?.value

  const validation = validateYouTubeOAuthCallbackState({
    error,
    code,
    state,
    expectedState,
  })
  if (!validation.valid) {
    const response = redirectToPlatformCapabilities(request, validation.status)
    clearOAuthCookies(response)
    return response
  }

  try {
    const token = await exchangeYouTubeAuthorizationCode({ code: validation.code })
    if (!token.access_token) {
      throw new Error("YouTube OAuth callback did not return an access token.")
    }

    const channel = await fetchYouTubeConnectedChannel({ accessToken: token.access_token })
    await upsertYouTubePlatformConnection({ token, channel, connectedBy: "MENI" })

    const response = redirectToPlatformCapabilities(request, "youtube_oauth_connected")
    clearOAuthCookies(response)
    response.cookies.set(YOUTUBE_OAUTH_CONNECTED_COOKIE, "1", {
      httpOnly: true,
      maxAge: 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: true,
    })
    return response
  } catch {
    const response = redirectToPlatformCapabilities(request, "youtube_oauth_token_exchange_failed")
    clearOAuthCookies(response)
    return response
  }
}
