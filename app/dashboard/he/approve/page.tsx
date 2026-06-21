import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

type FinalCopyRow = {
  id: string
  product_id: string
  platform: string
  language: string | null
  status: string
  updated_at: string | null
  products: { name: string } | { name: string }[] | null
}

type ProductPostGroup = {
  productId: string
  productName: string
  posts: FinalCopyRow[]
}

const APPROVAL_STATUSES = [
  "ready_for_operator_approval",
  "validated",
  "operator_approved",
  "ready_for_manual_publish",
  "published_verified",
]

const platformNames: Record<string, string> = {
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
  threads: "threads",
  mastodon: "mastodon",
}

function productNameFrom(row: FinalCopyRow) {
  const raw = row.products
  if (Array.isArray(raw)) return raw[0]?.name ?? "מוצר ללא שם"
  return raw?.name ?? "מוצר ללא שם"
}

function languageLabel(language: string | null) {
  return language === "he" ? "עב" : "EN"
}

function statusLabel(status: string) {
  if (status === "operator_approved" || status === "ready_for_manual_publish") return "מאושר"
  if (status === "published_verified") return "פורסם"
  return ""
}

function groupByProduct(rows: FinalCopyRow[]) {
  const groups = new Map<string, ProductPostGroup>()

  for (const row of rows) {
    const existing = groups.get(row.product_id) ?? {
      productId: row.product_id,
      productName: productNameFrom(row),
      posts: [],
    }
    existing.posts.push(row)
    groups.set(row.product_id, existing)
  }

  return [...groups.values()].sort((a, b) => a.productName.localeCompare(b.productName))
}

export default async function HebrewApprovePage() {
  let groups: ProductPostGroup[] = []
  let pageError: string | null = null

  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceRoleSupabase()
      const { data, error } = await supabase
        .from("final_copies")
        .select("id, product_id, platform, language, status, updated_at, products(name)")
        .in("status", APPROVAL_STATUSES)
        .order("updated_at", { ascending: false })
        .limit(1000)

      if (error) throw error
      groups = groupByProduct((data ?? []) as FinalCopyRow[])
    } catch (error) {
      pageError = error instanceof Error ? error.message : "טעינת טיוטות לאישור נכשלה."
    }
  }

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <PageHeader
        eyebrow="אישור תוכן"
        title="אישור טיוטות לפי מוצר"
        description="רק מוצר, פלטפורמה ושפה. אין דוח ענק, אין אישור בכמות, ואין יצירת פלטפורמות."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/products" className={cn(buttonVariants({ variant: "outline" }))}>
              מוצרים
            </Link>
            <Link href="/dashboard/he" className={cn(buttonVariants({ variant: "outline" }))}>
              חזרה לדשבורד
            </Link>
          </div>
        }
      />

      {!isSupabaseConfigured() ? (
        <Card>
          <CardHeader>
            <CardTitle>Supabase לא מוגדר</CardTitle>
            <CardDescription>אי אפשר לטעון טיוטות לאישור בלי חיבור למסד הנתונים.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>שגיאה בטעינה</CardTitle>
            <CardDescription className="text-destructive">{pageError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>טיוטות ופוסטים קיימים</CardTitle>
          <CardDescription>
            לחץ על פלטפורמה כדי לפתוח את הפוסט המלא, לערוך ולאשר. כל הכפתורים כאן פותחים פוסטים קיימים בלבד.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.length === 0 && !pageError ? (
            <p className="text-sm text-muted-foreground">אין פוסטים קיימים לאישור כרגע.</p>
          ) : null}

          {groups.map((group) => (
            <div key={group.productId} className="rounded-xl border p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{group.productName}</h2>
                  <p className="text-sm text-muted-foreground">
                    פתח פוסט קיים לעריכה ואישור. לא נוצרת כאן פלטפורמה חדשה.
                  </p>
                </div>
                <Badge variant="outline">{group.posts.length} פוסטים</Badge>
              </div>

              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {group.posts.map((post) => {
                  const label = statusLabel(post.status)

                  return (
                    <Link
                      key={post.id}
                      href={`/dashboard/he/approve/preview/${post.id}`}
                      className="flex min-h-14 items-center justify-between rounded-lg border border-blue-400 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      <span>
                        {languageLabel(post.language)}
                        {label ? ` - ${label}` : ""}
                      </span>
                      <span>{platformNames[post.platform] ?? post.platform}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
