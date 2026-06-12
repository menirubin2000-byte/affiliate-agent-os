import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const PLATFORM_LABELS: Record<string, string> = {
  facebook_page: "Facebook",
  instagram_professional: "Instagram",
  x_twitter: "X / Twitter",
  linkedin: "LinkedIn",
  medium: "Medium",
  substack: "Substack",
  pinterest: "Pinterest",
  youtube: "YouTube",
  tiktok: "TikTok",
  reddit: "Reddit",
  quora: "Quora",
}

export default async function AllPostsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div dir="rtl" className="mx-auto max-w-4xl p-6 text-right">
        <h1 className="text-2xl font-bold">Supabase לא מוגדר</h1>
      </div>
    )
  }

  const supabase = getServiceRoleSupabase()

  const { data: posts, error } = await supabase
    .from("final_copies")
    .select("id, platform, language, status, products(name)")
    .in("status", ["ready_for_operator_approval", "operator_approved"])
    .order("updated_at", { ascending: false })
    .limit(300)

  const byProduct = new Map<string, typeof posts>()
  for (const post of posts ?? []) {
    const raw = post.products as unknown as { name: string } | { name: string }[] | null
    const name = Array.isArray(raw) ? raw[0]?.name ?? "?" : raw?.name ?? "?"
    const arr = byProduct.get(name) ?? []
    arr.push(post)
    byProduct.set(name, arr)
  }

  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-6 p-6 text-right">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">כל הפוסטים</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard/he/approve"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            תור אישור
          </Link>
          <Link
            href="/dashboard/he"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            דשבורד
          </Link>
        </div>
      </div>

      <div className="rounded-lg border-2 border-blue-400 bg-blue-50 p-4 dark:bg-blue-950">
        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
          {posts?.length ?? 0} פוסטים מוכנים
        </p>
        {error ? (
          <p className="text-sm text-red-600">שגיאה: {error.message}</p>
        ) : null}
        <p className="text-sm text-blue-600 dark:text-blue-400">
          לחץ על כפתור כחול כדי לפתוח תצוגה מקדימה עם תמונה + עריכה + מחיקה
        </p>
      </div>

      {(posts?.length ?? 0) === 0 ? (
        <p className="text-muted-foreground">אין פוסטים בסטטוס מוכן.</p>
      ) : (
        Array.from(byProduct.entries()).map(([productName, productPosts]) => (
          <div key={productName} className="space-y-3">
            <h2 className="text-lg font-bold border-b pb-1">{productName}</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {productPosts!.map((post) => (
                <Link
                  key={post.id}
                  href={`/dashboard/he/approve/preview/${post.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border-2 border-blue-400 bg-white px-4 py-3 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                >
                  <span>{PLATFORM_LABELS[post.platform] ?? post.platform}</span>
                  <span className="text-xs text-blue-500">
                    {post.language === "he" ? "עברית" : "EN"}
                    {post.status === "operator_approved" ? " | מאושר" : ""}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
