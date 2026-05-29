"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  createOperatorSessionToken,
  getExpiredOperatorSessionCookieOptions,
  getOperatorSessionCookieOptions,
  OPERATOR_SESSION_COOKIE,
  verifyOperatorPassword,
} from "@/lib/operator-auth"

function getSafeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "/dashboard"
  return next.startsWith("/dashboard") ? next : "/dashboard"
}

export async function loginOperatorAction(formData: FormData) {
  const password = String(formData.get("password") ?? "")
  const next = getSafeNext(formData.get("next"))

  if (!verifyOperatorPassword(password)) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`)
  }

  const token = await createOperatorSessionToken()
  const cookieStore = await cookies()
  cookieStore.set(OPERATOR_SESSION_COOKIE, token, getOperatorSessionCookieOptions())

  redirect(next)
}

export async function logoutOperatorAction() {
  const cookieStore = await cookies()
  cookieStore.set(OPERATOR_SESSION_COOKIE, "", getExpiredOperatorSessionCookieOptions())

  redirect("/login?logged_out=1")
}
