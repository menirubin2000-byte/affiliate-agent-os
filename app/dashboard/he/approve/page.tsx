import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getPlatformRoutingOverview } from "@/lib/platform-routing-db"
import type { PlatformRoute } from "@/lib/platform-routing"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import { cn, truncate } from "@/lib/utils"

import {
  approveFinalCopyAction,
  rejectFinalCopyAction,
  requestFinalCopyFixAction,
} from "./actions"

export const dynamic = "force-dynamic"

const TOP_LIMIT = 6

type ReadyRouteWithBody = PlatformRoute & {
  body: string
  validationStatus: string
  blockingReasons: string[]
}

type SectionCounts = {
  ready: number
  needsFix: number
  published: number
  platformBlocked: number
  legacyDrafts: number
}

export default async function HebrewApprovePage(props: {
  searchParams: Promise<{ approved?: string; rejected?: string; fix?: string; error?: string }>
}) {
  const params = (await props.searchParams) ?? {}

  if (!isSupabaseConfigured()) {
    return (
      <div dir="rtl" className="space-y-6 text-right">
        <PageHeader
          eyebrow="אישור תוכן"
          title="ממתין לאישור"
          description="Supabase לא מוגדר. אי-אפשר לבדוק את התור."
        />
      </div>
    )
  }

  let overviewError: string | null = null
  let counts: SectionCounts = { ready: 0, needsFix: 0, published: 0, platformBlocked: 0, legacyDrafts: 0 }
  let readyRoutes: PlatformRoute[] = []
  let needsFixRoutes: PlatformRoute[] = []
  let platformBlockedRoutes: PlatformRoute[] = []
  let publishedRoutes: PlatformRoute[] = []
  let topReady: ReadyRouteWithBody[] = []

  try {
    const overview = await getPlatformRoutingOverview()
    const allRoutes = overview.products.flatMap((p) => p.routes)

    readyRoutes = allRoutes.filter((r) => r.state === "pending_meni_approval" && r.finalCopyId)
    needsFixRoutes = allRoutes.filter((r) =>
      ["needs_system_fix", "missing_final_copy", "missing_affiliate_link"].includes(r.state),
    )
    publishedRoutes = allRoutes.filter((r) => r.state === "published_verified")
    platformBlockedRoutes = allRoutes.filter((r) =>
      ["platform_pending_setup", "platform_disabled", "policy_blocked", "executor_blocked", "requires_auth"].includes(
        r.state,
      ),
    )

    const legacyDraftsCount = await countLegacyDrafts()

    counts = {
      ready: readyRoutes.length,
      needsFix: needsFixRoutes.length,
      published: publishedRoutes.length,
      platformBlocked: platformBlockedRoutes.length,
      legacyDrafts: legacyDraftsCount,
    }

    const topRouteIds = readyRoutes.slice(0, TOP_LIMIT).map((r) => r.finalCopyId!).filter(Boolean)
    if (topRouteIds.length > 0) {
      const bodies = await loadFinalCopyBodies(topRouteIds)
      topReady = readyRoutes.slice(0, TOP_LIMIT).map((route) => {
        const detail = bodies.get(route.finalCopyId ?? "")
        return {
          ...route,
          body: detail?.body ?? "",
          validationStatus: detail?.validation_status ?? "unknown",
          blockingReasons: Array.isArray(detail?.blocking_reasons) ? (detail!.blocking_reasons as string[]) : [],
        }
      })
    }
  } catch (error) {
    overviewError = error instanceof Error ? error.message : "טעינת תור האישור נכשלה."
  }

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <PageHeader
        eyebrow="אישור תוכן"
        title="תור אישור MENI - מסונן"
        description={`${counts.ready} פוסטים מסוננים ובאמת מוכנים לאישור MENI. המערכת לא מציגה כפילויות, חסומים או פוסטים שכבר פורסמו. למניעת עומס מוצגים ${TOP_LIMIT} הראשונים לפי דחיפות.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/he" className={cn(buttonVariants({ variant: "outline" }))}>
              חזרה לדשבורד
            </Link>
            <Link href="/dashboard/he/content-review" className={cn(buttonVariants({ variant: "outline" }))}>
              בדיקת קופי
            </Link>
            <Link href="/dashboard/he/publish-ready" className={cn(buttonVariants({ variant: "outline" }))}>
              מצב פרסום
            </Link>
          </div>
        }
      />

      {params.approved ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-950">Final copy אושר</CardTitle>
            <CardDescription className="text-green-800">
              סטטוס שונה ל-operator_approved ונוצר/עודכן publish_job. ממתין למנוע פרסום.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {params.rejected ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-950">Final copy נדחה</CardTitle>
            <CardDescription className="text-amber-800">
              סטטוס שונה ל-operator_rejected. צריך גרסה חדשה לפני אישור חוזר.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {params.fix ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-950">נדרש תיקון מערכת</CardTitle>
            <CardDescription className="text-amber-800">
              סומן needs_system_fix ונוצרה משימת improvement. זה לא משימה למני - תיקון קוד/דטה.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {params.error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>שגיאה</CardTitle>
            <CardDescription className="text-destructive">{params.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {overviewError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>שגיאה בטעינה</CardTitle>
            <CardDescription className="text-destructive">{overviewError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <CountBadge title="מוכן לאישור MENI" value={counts.ready} tone="primary" />
        <CountBadge title="צריך תיקון מערכת" value={counts.needsFix} tone="amber" />
        <CountBadge title="חסום פלטפורמה" value={counts.platformBlocked} tone="muted" />
        <CountBadge title="כבר פורסם ואומת" value={counts.published} tone="green" />
        <CountBadge title="טיוטות ישנות (legacy)" value={counts.legacyDrafts} tone="muted" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>1. מוכן לאישור MENI</CardTitle>
          <CardDescription>
            פוסטים שעברו את כל הסינונים: יש קישור שותף אמיתי + link_ready, יש Final Copy תקין, אין כפילות עם
            published_records, הפלטפורמה פעילה. מציג עד {TOP_LIMIT} ראשונים לפי דחיפות.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {topReady.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              אין פריטים מוכנים לאישור כרגע. אם קיימות טיוטות במערכת - הן בסטטוס אחר (תיקון, חסום, או כבר פורסם).
            </p>
          ) : (
            topReady.map((route) => <ReadyRouteCard key={route.finalCopyId ?? `${route.productId}-${route.platform.key}`} route={route} />)
          )}
          {counts.ready > TOP_LIMIT ? (
            <p className="text-sm text-muted-foreground">
              עוד {counts.ready - TOP_LIMIT} פוסטים בהמתנה. אחרי שתסיים את ה-{TOP_LIMIT} שלמעלה - רענן את הדף.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. צריך תיקון מערכת</CardTitle>
          <CardDescription>
            פוסטים שלא מגיעים למני - דורשים שינוי קוד / Final Copy חדש / השלמת affiliate link. לא משימה למני.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {needsFixRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין פריטים בקבוצה זו.</p>
          ) : (
            <RouteList routes={needsFixRoutes.slice(0, 12)} more={needsFixRoutes.length - 12} cta="/dashboard/he/content-review" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. כבר פורסם ואומת</CardTitle>
          <CardDescription>רשומות עם URL חי. לא מציגים שוב לאישור. רק למעקב ביצועים.</CardDescription>
        </CardHeader>
        <CardContent>
          {publishedRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין רשומות מאומתות כרגע.</p>
          ) : (
            <RouteList routes={publishedRoutes.slice(0, 20)} more={publishedRoutes.length - 20} cta="/dashboard/he/operator" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. חסום פלטפורמה</CardTitle>
          <CardDescription>
            הפלטפורמה לא מחוברת או המדיניות שלה לא תומכת באישור עכשיו. דרוש קישור OAuth / חוקי קהילה / תיקון מדיניות -
            לא משימה למני.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {platformBlockedRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין פריטים בקבוצה זו.</p>
          ) : (
            <RouteList routes={platformBlockedRoutes.slice(0, 20)} more={platformBlockedRoutes.length - 20} cta="/dashboard/he/publish-ready" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. טיוטות ישנות / ארכיון</CardTitle>
          <CardDescription>
            רשומות בטבלת content_drafts הישנה (לפני מעבר ל-final_copies). לא בלולאת האישור החדשה. נשמרות רק להיסטוריה.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            סה״כ טיוטות ישנות: <strong>{counts.legacyDrafts}</strong>
          </p>
          <p className="text-muted-foreground">
            ניתן לצפות בהן ב-/dashboard/drafts אך אין צורך לאשר אותן ידנית. הזרימה החדשה היא final_copies בלבד.
          </p>
          <Link href="/dashboard/drafts" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            פתח רשימת drafts ישנה
          </Link>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>כלל פעולה</CardTitle>
          <CardDescription>
            רק פריטים בקבוצה 1 ממתינים למני. כל השאר זה עבודה של המערכת/מנוע פרסום ולא נדרש קליק של מני. אחרי אישור -
            נוצר publish_job ו-MENI לא מפרסם ידנית.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

function CountBadge({
  title,
  value,
  tone,
}: {
  title: string
  value: number
  tone: "primary" | "amber" | "green" | "muted"
}) {
  const toneClass =
    tone === "primary"
      ? "border-primary/40 bg-primary/5"
      : tone === "amber"
        ? "border-amber-300 bg-amber-50"
        : tone === "green"
          ? "border-green-300 bg-green-50"
          : "border-border bg-muted/30"
  return (
    <Card className={toneClass}>
      <CardHeader className="space-y-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function ReadyRouteCard({ route }: { route: ReadyRouteWithBody }) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            {route.finalCopyTitle ?? `${route.productName} · ${route.platform.hebrewName}`}
          </h3>
          <p className="text-sm text-muted-foreground">
            מוצר: {route.productName} · פלטפורמה: {route.platform.hebrewName} ({route.platform.englishName})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">מוכן לאישור</Badge>
          <Badge variant="outline">{route.platform.contentType}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant={route.validationStatus === "valid" ? "default" : "destructive"}>
          validation: {route.validationStatus}
        </Badge>
        {route.blockingReasons.length === 0 ? (
          <Badge variant="default">אין blocking reasons</Badge>
        ) : (
          route.blockingReasons.map((reason) => (
            <Badge variant="destructive" key={reason}>
              {reason}
            </Badge>
          ))
        )}
      </div>

      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded border bg-muted/30 p-3 text-sm">
        {truncate(route.body || "אין תוכן זמין.", 800)}
      </pre>

      <div className="flex flex-wrap gap-2 border-t pt-3">
        <form action={approveFinalCopyAction}>
          <input type="hidden" name="finalCopyId" value={route.finalCopyId ?? ""} />
          <Button type="submit" size="sm">
            ✓ אשר לפרסום
          </Button>
        </form>
        <form action={rejectFinalCopyAction}>
          <input type="hidden" name="finalCopyId" value={route.finalCopyId ?? ""} />
          <Button type="submit" variant="outline" size="sm">
            ✗ דחה
          </Button>
        </form>
        <form action={requestFinalCopyFixAction}>
          <input type="hidden" name="finalCopyId" value={route.finalCopyId ?? ""} />
          <Button type="submit" variant="ghost" size="sm">
            דרוש תיקון מערכת
          </Button>
        </form>
        <Link
          href="/dashboard/he/content-review"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          צפה בקופי מלא
        </Link>
      </div>
    </div>
  )
}

function RouteList({ routes, more, cta }: { routes: PlatformRoute[]; more: number; cta: string }) {
  return (
    <div className="space-y-2 text-sm">
      <ul className="space-y-1">
        {routes.map((route) => (
          <li
            key={route.finalCopyId ?? `${route.productId}-${route.platform.key}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2"
          >
            <span>
              {route.productName} · <span className="text-muted-foreground">{route.platform.hebrewName}</span>
            </span>
            <span className="text-xs text-muted-foreground">{route.blocker ?? route.labelHe}</span>
          </li>
        ))}
      </ul>
      {more > 0 ? <p className="text-xs text-muted-foreground">+ עוד {more} פריטים נוספים.</p> : null}
      <Link href={cta} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        פתח מסך מתאים
      </Link>
    </div>
  )
}

async function countLegacyDrafts(): Promise<number> {
  const supabase = getServiceRoleSupabase()
  const { count, error } = await supabase
    .from("content_drafts")
    .select("*", { count: "exact", head: true })
    .eq("status", "draft")
  if (error) return 0
  return count ?? 0
}

async function loadFinalCopyBodies(
  ids: string[],
): Promise<Map<string, { body: string; validation_status: string; blocking_reasons: unknown }>> {
  const map = new Map<string, { body: string; validation_status: string; blocking_reasons: unknown }>()
  if (ids.length === 0) return map
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("final_copies")
    .select("id, body, validation_status, blocking_reasons")
    .in("id", ids)
  if (error || !data) return map
  for (const row of data as Array<{ id: string; body: string; validation_status: string; blocking_reasons: unknown }>) {
    map.set(row.id, {
      body: row.body ?? "",
      validation_status: row.validation_status ?? "unknown",
      blocking_reasons: row.blocking_reasons ?? [],
    })
  }
  return map
}
