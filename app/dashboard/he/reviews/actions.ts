"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { getServiceRoleSupabase } from "@/lib/supabase/server"

// Cookie name kept in sync with page.tsx (a "use server" file can only export async functions).
const REVIEW_EDITOR_COOKIE = "review_editor_auth"

function getExpectedPassword() {
  return process.env.DASHBOARD_EDIT_PASSWORD?.trim() ?? ""
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "")
  const expected = getExpectedPassword()

  if (!expected) {
    redirect(
      `/dashboard/he/reviews?error=${encodeURIComponent(
        "DASHBOARD_EDIT_PASSWORD לא מוגדר בשרת (Vercel env var)",
      )}`,
    )
  }
  if (password !== expected) {
    redirect(`/dashboard/he/reviews?error=${encodeURIComponent("סיסמה שגויה")}`)
  }

  const store = await cookies()
  store.set(REVIEW_EDITOR_COOKIE, expected, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/dashboard/he/reviews",
    maxAge: 60 * 60 * 24 * 30,
  })
  redirect("/dashboard/he/reviews")
}

export async function logoutAction() {
  const store = await cookies()
  store.delete(REVIEW_EDITOR_COOKIE)
  redirect("/dashboard/he/reviews")
}

export async function saveReviewAction(formData: FormData) {
  const expected = getExpectedPassword()
  const store = await cookies()
  if (!expected || store.get(REVIEW_EDITOR_COOKIE)?.value !== expected) {
    redirect(`/dashboard/he/reviews?error=${encodeURIComponent("לא מורשה - יש להתחבר מחדש")}`)
  }

  const productId = String(formData.get("productId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  if (!productId) {
    redirect(`/dashboard/he/reviews?error=${encodeURIComponent("חסר מזהה מוצר")}`)
  }

  const supabase = getServiceRoleSupabase()
  const { error } = await supabase
    .from("products")
    .update({ public_review: body || null })
    .eq("id", productId)

  if (error) {
    redirect(`/dashboard/he/reviews?error=${encodeURIComponent(error.message)}`)
  }

  if (slug) revalidatePath(`/reviews/${slug}`)
  revalidatePath("/dashboard/he/reviews")
  redirect(`/dashboard/he/reviews?saved=${encodeURIComponent(productId)}`)
}
