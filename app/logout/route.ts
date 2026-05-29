import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  getExpiredOperatorSessionCookieOptions,
  OPERATOR_SESSION_COOKIE,
} from "@/lib/operator-auth"

export async function GET() {
  const cookieStore = await cookies()
  cookieStore.set(OPERATOR_SESSION_COOKIE, "", getExpiredOperatorSessionCookieOptions())
  redirect("/login?logged_out=1")
}

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set(OPERATOR_SESSION_COOKIE, "", getExpiredOperatorSessionCookieOptions())
  redirect("/login?logged_out=1")
}
