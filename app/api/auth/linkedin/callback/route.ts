import * as fs from "fs"
import * as path from "path"

import { NextResponse } from "next/server"

import { upsertLinkedInPlatformConnection } from "@/lib/platform-connections-db"

export const dynamic = "force-dynamic"

function redirect(request: Request, status: string) {
  return NextResponse.redirect(
    new URL(`/dashboard/he/platform-capabilities?linkedin=${status}`, request.url),
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const error = url.searchParams.get("error")
  const code = url.searchParams.get("code")

  if (error || !code) {
    return redirect(request, error ?? "missing_code")
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID ?? ""
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? ""
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI ?? ""

  if (!clientId || !clientSecret || !redirectUri) {
    return redirect(request, "missing_env")
  }

  try {
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      console.error("LinkedIn token exchange failed:", text)
      return redirect(request, "token_exchange_failed")
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string
      expires_in: number
      id_token?: string
    }
    const accessToken = tokenData.access_token
    if (!accessToken) {
      return redirect(request, "no_access_token")
    }

    let memberUrn = ""

    const userinfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (userinfoRes.ok) {
      const profile = (await userinfoRes.json()) as { sub: string }
      if (profile.sub) memberUrn = `urn:li:person:${profile.sub}`
    }

    if (!memberUrn) {
      const meRes = await fetch("https://api.linkedin.com/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (meRes.ok) {
        const me = (await meRes.json()) as { id: string }
        if (me.id) memberUrn = `urn:li:person:${me.id}`
      }
    }

    try {
      await upsertLinkedInPlatformConnection({
        accessToken,
        memberUrn,
        expiresIn: tokenData.expires_in,
        connectedBy: "MENI",
      })
    } catch (e) {
      console.error("Failed to save LinkedIn connection:", e)
    }

    if (process.env.NODE_ENV === "development") {
      try {
        const envPath = path.join(process.cwd(), ".env.local")
        let envContent = fs.readFileSync(envPath, "utf8")
        for (const [key, val] of [
          ["LINKEDIN_ACCESS_TOKEN", accessToken],
          ["LINKEDIN_MEMBER_URN", memberUrn],
        ] as const) {
          const re = new RegExp(`^${key}=.*$`, "m")
          if (re.test(envContent)) {
            envContent = envContent.replace(re, `${key}=${val}`)
          } else {
            envContent += `\n${key}=${val}`
          }
        }
        fs.writeFileSync(envPath, envContent, "utf8")
      } catch { /* non-critical */ }
    }

    process.env.LINKEDIN_ACCESS_TOKEN = accessToken
    if (memberUrn) process.env.LINKEDIN_MEMBER_URN = memberUrn

    return redirect(request, "connected")
  } catch (err) {
    console.error("LinkedIn OAuth error:", err)
    return redirect(request, "oauth_error")
  }
}
