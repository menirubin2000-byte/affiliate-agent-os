import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getInternalTrafficSnapshot,
  type InternalTrafficScore,
} from "@/lib/internal-traffic-engine"
import { getPerformanceMetricsSummary } from "@/lib/performance-metrics-summary"
import { PERFORMANCE_SOURCE_ADAPTERS } from "@/lib/performance-source-adapters"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

import { importPerformanceMetricsAction } from "./actions"

export const dynamic = "force-dynamic"

const TOP_PICKS_LIMIT = 6

export default async function TrafficMetricsPage(props: {
  searchParams: Promise<{ source?: string; inserted?: string; dropped?: string; rowErrors?: string; insertErrors?: string; error?: string }>
}) {
  const params = (await props.searchParams) ?? {}

  if (!isSupabaseConfigured()) {
    return (
      <div dir="rtl" className="space-y-6 text-right">
        <PageHeader eyebrow="Traffic Metrics" title="מטריקות תנועה" description="Supabase לא מוגדר." />
      </div>
    )
  }

  const [summary, snapshot] = await Promise.all([
    getPerformanceMetricsSummary(),
    getInternalTrafficSnapshot(),
  ])

  const topPicks: InternalTrafficScore[] = snapshot.scores.slice(0, TOP_PICKS_LIMIT)

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <PageHeader
        eyebrow="Traffic Metrics"
        title="מטריקות תנועה אמיתיות"
        description="כל מה שנכנס לטבלה performance_metrics + נתוני עזר זמניים של AAOS. תוכנת פירסום רובין היא מנוע התנועה הראשי; אם אין נתונים - הדשבורד נשאר fallback."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/he" className={cn(buttonVariants({ variant: "outline" }))}>
              חזרה לדשבורד
            </Link>
            <Link href="/dashboard/he/approve" className={cn(buttonVariants({ variant: "outline" }))}>
              תור אישור
            </Link>
            <Link href="/dashboard/performance" className={cn(buttonVariants({ variant: "ghost" }))}>
              דשבורד ביצועים (אנגלית)
            </Link>
          </div>
        }
      />

      {params.inserted ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-950">ייבוא הסתיים</CardTitle>
            <CardDescription className="text-green-900">
              נוספו {params.inserted} שורות מתוך מקור {params.source ?? "—"}.{" "}
              {params.dropped && Number(params.dropped) > 0
                ? `${params.dropped} שורות נדחו כי לא נמצא product התואם.`
                : ""}
              {params.rowErrors && Number(params.rowErrors) > 0
                ? ` ${params.rowErrors} שגיאות פרסור.`
                : ""}
              {params.insertErrors && Number(params.insertErrors) > 0
                ? ` ${params.insertErrors} שגיאות הוספה.`
                : ""}
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

      <section className="grid gap-3 md:grid-cols-4">
        <StatCard title="סה״כ performance_metrics" value={summary.total.toLocaleString()} tone={summary.total > 0 ? "primary" : "muted"} />
        <StatCard
          title="סך קליקים"
          value={summary.bySource.reduce((s, r) => s + r.clicks, 0).toLocaleString()}
          tone="muted"
        />
        <StatCard
          title="סך המרות"
          value={summary.bySource.reduce((s, r) => s + r.conversions, 0).toLocaleString()}
          tone="muted"
        />
        <StatCard
          title="סך הכנסות"
          value={`$${summary.bySource.reduce((s, r) => s + r.revenue, 0).toFixed(2)}`}
          tone={summary.total > 0 ? "green" : "muted"}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>מקורות בפועל</CardTitle>
          <CardDescription>
            כל שורה ב-performance_metrics נכתבת עם source על ידי ה-CSV adapter המתאים. אסור לקבוע source ידנית.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.bySource.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              אין כרגע אפילו שורה אחת ב-performance_metrics. עד שתופיע שורה אמיתית - הדשבורד נשאר fallback מוצהר.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-1 pr-2 text-right">Source</th>
                  <th className="py-1 pr-2 text-right">שורות</th>
                  <th className="py-1 pr-2 text-right">קליקים</th>
                  <th className="py-1 pr-2 text-right">המרות</th>
                  <th className="py-1 pr-2 text-right">הכנסות</th>
                </tr>
              </thead>
              <tbody>
                {summary.bySource.map((row) => (
                  <tr key={row.source} className="border-b last:border-0">
                    <td className="py-1 pr-2">
                      <Badge variant={row.source === "unknown_source" ? "outline" : "secondary"}>
                        {row.source}
                      </Badge>
                    </td>
                    <td className="py-1 pr-2">{row.records}</td>
                    <td className="py-1 pr-2">{row.clicks}</td>
                    <td className="py-1 pr-2">{row.conversions}</td>
                    <td className="py-1 pr-2">${row.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>קליקים לפי מוצר × פלטפורמה</CardTitle>
          <CardDescription>אגרגציה ישירה של performance_metrics. אם מוצר חסר כאן - לא הגיע לו עדיין שום signal אמיתי.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.byProductChannel.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין נתונים עדיין.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-1 pr-2 text-right">מוצר</th>
                  <th className="py-1 pr-2 text-right">channel</th>
                  <th className="py-1 pr-2 text-right">שורות</th>
                  <th className="py-1 pr-2 text-right">קליקים</th>
                  <th className="py-1 pr-2 text-right">המרות</th>
                  <th className="py-1 pr-2 text-right">הכנסות</th>
                </tr>
              </thead>
              <tbody>
                {summary.byProductChannel.slice(0, 30).map((row) => (
                  <tr key={`${row.productId}::${row.channel}`} className="border-b last:border-0">
                    <td className="py-1 pr-2">{row.productName}</td>
                    <td className="py-1 pr-2">{row.channel}</td>
                    <td className="py-1 pr-2">{row.records}</td>
                    <td className="py-1 pr-2">{row.clicks}</td>
                    <td className="py-1 pr-2">{row.conversions}</td>
                    <td className="py-1 pr-2">${row.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>עדיפות זמנית לפי נתוני AAOS</CardTitle>
          <CardDescription>
            {snapshot.connected
              ? `יש signal אמיתי. עד ${TOP_PICKS_LIMIT} עדיפויות גבוהות.`
              : "אין עדיין מדדי ביצוע ב-AAOS - מיון זמני לפי מוכנות. תור האישור פועל ב-fallback עד שתוכנת פירסום רובין שולחת דירוגים."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topPicks.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין כרגע ציון אמיתי לאף זוג (מוצר, פלטפורמה).</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {topPicks.map((pick) => (
                <li key={`${pick.productId}::${pick.platform}`} className="rounded border p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {pick.productId} · {pick.platform}
                    </span>
                    <Badge variant="default">score {pick.score.toFixed(2)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{pick.reason}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ייבוא CSV מאיזה מקור</CardTitle>
          <CardDescription>
            בוחרים source, מדביקים CSV מקורי של המקור. ה-adapter בודק את העמודות הנדרשות, נורמליזציה, ומכניס רק שורות עם signal אמיתי (clicks/conversions/revenue ≠ 0). שורה שלא נמצא לה מוצר תואם נדחית, לא נוצרת.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={importPerformanceMetricsAction} className="space-y-3">
            <label className="block text-sm">
              <span className="block pb-1">Source</span>
              <select name="source" required className="w-full rounded border bg-background p-2">
                {Object.values(PERFORMANCE_SOURCE_ADAPTERS).map((adapter) => (
                  <option key={adapter.key} value={adapter.key}>
                    {adapter.englishLabel} - דורש: {adapter.requiredColumns.join(", ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="block pb-1">CSV תוכן</span>
              <textarea
                name="csv"
                required
                rows={10}
                placeholder="הדבק כאן את ה-CSV המקורי של המקור (כולל שורת כותרת)"
                className="w-full rounded border bg-background p-2 font-mono text-xs"
              />
            </label>
            <Button type="submit">ייבא</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-amber-300 bg-amber-50/70">
        <CardHeader>
          <CardTitle>חוקי ייבוא</CardTitle>
          <CardDescription>
            <ul className="list-inside list-disc space-y-1">
              <li>שורה בלי signal אמיתי (clicks=0, conversions=0, revenue=0) נדחית - לא נוצרת רשומה.</li>
              <li>שורה שלא נמצא לה product תואם לפי slug/שם נדחית.</li>
              <li>ה-source נקבע על ידי ה-adapter בלבד, לא על ידי המפעיל.</li>
              <li>אין הגנה על שורות כפולות עדיין - הימנע מהדבקה כפולה של אותו דוח.</li>
            </ul>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  tone,
}: {
  title: string
  value: string
  tone: "primary" | "green" | "muted"
}) {
  const cls =
    tone === "primary"
      ? "border-primary/40 bg-primary/5"
      : tone === "green"
        ? "border-green-300 bg-green-50"
        : "border-border bg-muted/30"
  return (
    <Card className={cls}>
      <CardHeader className="space-y-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}
