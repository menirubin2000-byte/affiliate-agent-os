import Link from "next/link"
import { cookies } from "next/headers"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { classifyPublicReview, type PublicReviewKind } from "@/lib/public-review-catalog"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"

import { loginAction, logoutAction, saveReviewAction } from "./actions"

export const dynamic = "force-dynamic"

const REVIEW_EDITOR_COOKIE = "review_editor_auth"

type ReviewEditItem = {
  id: string
  name: string
  slug: string
  kind: PublicReviewKind
  current: string
  source: "override" | "post" | "angle" | "empty"
}

function looksLikeJson(text: string) {
  return /^[\s[{"]/.test(text) && /["\]}]/.test(text) && text.includes('"')
}

async function loadReviewItems(): Promise<ReviewEditItem[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = getServiceRoleSupabase()

  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, category, content_angle, public_review")
    .not("slug", "is", null)
    .order("name")
  if (!products?.length) return []

  const { data: programs } = await supabase
    .from("affiliate_programs")
    .select("product_id")
    .eq("status", "link_ready")
  const readyIds = new Set((programs ?? []).map((p) => p.product_id))

  const visible = products.filter((p) => p.slug && readyIds.has(p.id))
  const ids = visible.map((p) => p.id)

  const heBody = new Map<string, string>()
  const anyBody = new Map<string, string>()
  if (ids.length) {
    const { data: copies } = await supabase
      .from("final_copies")
      .select("product_id, language, body, updated_at")
      .in("product_id", ids)
      .not("body", "is", null)
      .order("updated_at", { ascending: false })
    for (const c of copies ?? []) {
      const text = c.body?.trim()
      if (!text) continue
      if (!anyBody.has(c.product_id)) anyBody.set(c.product_id, text)
      if (c.language === "he" && !heBody.has(c.product_id)) heBody.set(c.product_id, text)
    }
  }

  return visible.map((p) => {
    const override = p.public_review?.trim()
    const post = heBody.get(p.id) || anyBody.get(p.id)
    const angle =
      p.content_angle?.trim() && !looksLikeJson(p.content_angle) ? p.content_angle.trim() : ""

    let current = ""
    let source: ReviewEditItem["source"] = "empty"
    if (override) {
      current = override
      source = "override"
    } else if (post) {
      current = post
      source = "post"
    } else if (angle) {
      current = angle
      source = "angle"
    }

    return {
      id: p.id,
      name: p.name,
      slug: p.slug as string,
      kind: classifyPublicReview({ name: p.name, category: p.category }),
      current,
      source,
    }
  })
}

const SOURCE_LABEL: Record<ReviewEditItem["source"], { text: string; variant: "default" | "outline" | "destructive" }> = {
  override: { text: "טקסט שלך (נשמר)", variant: "default" },
  post: { text: "מתוך הפוסט", variant: "outline" },
  angle: { text: "מתוך content_angle", variant: "outline" },
  empty: { text: "ריק - טקסט ברירת מחדל", variant: "destructive" },
}

export default async function ReviewsEditorPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; saved?: string }>
}) {
  const params = (await searchParams) ?? {}
  const store = await cookies()
  const expected = process.env.DASHBOARD_EDIT_PASSWORD?.trim()
  const authed = Boolean(expected) && store.get(REVIEW_EDITOR_COOKIE)?.value === expected

  if (!authed) {
    return (
      <div dir="rtl" className="mx-auto max-w-md space-y-6 py-10">
        <PageHeader
          eyebrow="עריכת סקירות"
          title="כניסה מאובטחת"
          description="הדף הזה מאפשר לערוך את הטקסט שמופיע באתר הסקירות הציבורי. רק מי שמזין את הסיסמה יכול לערוך."
        />
        {params.error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-base">שגיאה</CardTitle>
              <CardDescription className="text-destructive">{params.error}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>סיסמת עורך</CardTitle>
            <CardDescription>הסיסמה נשמרת כ-env var בשרת (DASHBOARD_EDIT_PASSWORD).</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={loginAction} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="password">סיסמה</Label>
                <Input id="password" name="password" type="password" required autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full">
                כניסה
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const items = await loadReviewItems()
  const software = items.filter((i) => i.kind === "software")
  const products = items.filter((i) => i.kind === "product")
  const savedId = params.saved

  const renderItem = (item: ReviewEditItem) => {
    const label = SOURCE_LABEL[item.source]
    const justSaved = savedId === item.id
    return (
      <Card key={item.id} className={justSaved ? "border-green-300 bg-green-50/40" : undefined}>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-lg">{item.name}</CardTitle>
              <CardDescription>
                <Link
                  href={`/reviews/${item.slug}`}
                  target="_blank"
                  className="text-blue-700 underline"
                >
                  /reviews/{item.slug}
                </Link>
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {justSaved ? <Badge className="bg-green-600">נשמר ✓</Badge> : null}
              <Badge variant={label.variant}>{label.text}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={saveReviewAction} className="space-y-3">
            <input type="hidden" name="productId" value={item.id} />
            <input type="hidden" name="slug" value={item.slug} />
            <Textarea
              name="body"
              defaultValue={item.current}
              rows={12}
              dir="auto"
              className="font-mono text-sm leading-6"
              placeholder="כתוב כאן את הסקירה שתופיע באתר..."
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                שמירה מעדכנת רק את עמוד הסקירה הציבורי. הפוסטים המקוריים לא משתנים.
              </p>
              <Button type="submit">שמור</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        eyebrow="עריכת סקירות"
        title="עריכת טקסט הסקירות הציבוריות"
        description="כל שינוי שתשמור כאן הוא מה שיופיע באתר. הטקסט נשמר בשדה נפרד ולא נוגע בפוסטים שכבר פורסמו."
        actions={
          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              יציאה
            </Button>
          </form>
        }
      />

      {params.error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base">שגיאה</CardTitle>
            <CardDescription className="text-destructive">{params.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-4 text-sm text-amber-950">
          <span className="font-semibold">איך זה עובד:</span> כשהשדה ריק, האתר מציג את הטקסט מהפוסט אוטומטית.
          כשאתה כותב כאן ושומר — הטקסט שלך מחליף אותו. כדי לחזור לטקסט האוטומטי, פשוט מחק הכל ושמור.
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>אין סקירות להצגה</CardTitle>
            <CardDescription>לא נמצאו מוצרים עם slug וקישור שותפים פעיל.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {software.length ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">תוכנות ({software.length})</h2>
          <div className="grid gap-4">{software.map(renderItem)}</div>
        </section>
      ) : null}

      {products.length ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">מוצרים ({products.length})</h2>
          <div className="grid gap-4">{products.map(renderItem)}</div>
        </section>
      ) : null}
    </div>
  )
}
