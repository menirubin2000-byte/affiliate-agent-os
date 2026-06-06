import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { PlatformCapabilitiesPanel } from "@/components/dashboard/platform-capabilities-panel"
import { PlatformConnectionsPanel } from "@/components/dashboard/platform-connections-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { getSupabaseReadiness } from "@/lib/env"
import { listPlatformConnections } from "@/lib/platform-connections-db"
import { getPlatformRoutingOverview } from "@/lib/platform-routing-db"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

import { PlatformRegistryTable, PlatformRoutingStats, RoutingNavActions } from "./platform-routing-view"

export const dynamic = "force-dynamic"

export default async function HebrewDashboardPage() {
  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    return (
      <div dir="rtl" className="space-y-6 text-right">
        <PageHeader title="דשבורד בעברית" description="מרכז הפעלה יומי ל-Affiliate Agent OS." />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>Supabase לא מוגדר</CardTitle>
            <CardDescription>
              {readiness.summary} {readiness.guidance}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const [overview, connections] = await Promise.all([
    getPlatformRoutingOverview(),
    listPlatformConnections(),
  ])
  const totals = overview.counts
  const nothingConnected =
    totals.products === 0 && totals.publishedVerified === 0 && totals.waitingApproval === 0

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <PageHeader
        eyebrow="Affiliate Agent OS"
        title="דשבורד מפעיל"
        description="מסך מפעיל נקי: מה פעיל, מה חסר, מה ממתין לאישור, ומה הפעולה הבאה. כל המספרים מתעדכנים ישירות מ-Supabase. MENI לא מקבל משימות העתקה, הדבקה או פרסום ידני."
        actions={<RoutingNavActions />}
      />

      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-destructive">🛑 כללים לקלוד - חובה לקרוא לפני הפעלה</CardTitle>
            <CardDescription>
              לפני כל פרסום / אישור / סקריפט - קלוד חייב לעבור על הצ׳קליסט. בלי זה אסור להגיד &quot;אי אפשר&quot;.
            </CardDescription>
          </div>
          <Link href="/dashboard/he/claude-rules" className={cn(buttonVariants({ variant: "destructive" }))}>
            פתח כללים לקלוד
          </Link>
        </CardHeader>
      </Card>

      <PlatformRoutingStats overview={overview} />

      {nothingConnected ? (
        <Card className="border-amber-300 bg-amber-50/80">
          <CardHeader>
            <CardTitle>אין נתונים מחוברים</CardTitle>
            <CardDescription>
              Supabase מוגדר אבל לא מצאנו מוצרים, אישורים פתוחים או פרסומים מאומתים. הוסף מוצר וקישור שותף כדי שהמסך הזה יתחיל להציג מצב אמיתי.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NextActionCard
          title="ממתינים לאישור MENI"
          count={totals.waitingApproval}
          description="פוסטים מאושרים לוויזואל אבל ממתינים שמני ילחץ אשר / דחה / דרוש תיקון."
          href="/dashboard/he/approve"
          ctaLabel="פתח תור אישור"
        />
        <NextActionCard
          title="מוכן למנוע פרסום"
          count={totals.readyForExecutor}
          description="כבר אושר ע״י מני. ממתין למנוע הפרסום לבצע ולהחזיר URL מאומת."
          href="/dashboard/he/publish-ready"
          ctaLabel="פתח מצב פרסום"
        />
        <NextActionCard
          title="חסומים"
          count={totals.blocked}
          description="חסימה של מדיניות, executor, קישור שותף או Final Copy. נדרש תיקון במערכת — לא משימה למני."
          href="/dashboard/he/content-review"
          ctaLabel="פתח בדיקת קופי"
          variant={totals.blocked > 0 ? "destructive" : "outline"}
        />
        <NextActionCard
          title="פורסם ואומת"
          count={totals.publishedVerified}
          description="רק רשומות עם URL חי מאומת. כל פוסט שלא כאן עדיין לא פורסם."
          href="/dashboard/he/operator"
          ctaLabel="צפה בדשבורד המלא"
        />
        <NextActionCard
          title="מוכנים שותפים"
          count={totals.affiliateReadyProducts}
          description="מוצרים שיש להם link_ready וקישור שותף אמיתי. רק אלה רשאים לעלות לפרסום."
          href="/dashboard/products"
          ctaLabel="פתח רשימת מוצרים"
        />
        <NextActionCard
          title="מוצרים במערכת"
          count={totals.products}
          description="כל המוצרים. אם המספר 0 — אין שום נתון תפעולי לבחון כרגע."
          href="/dashboard/products"
          ctaLabel="פתח רשימת מוצרים"
        />
      </section>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>כלל עבודה</CardTitle>
          <CardDescription>
            מוצר עולה לפרסום רק כשיש link_ready, קישור שותף אמיתי, Final Copy תקין, אישור MENI, publish_job ומנוע פרסום מחובר.
            רשומת Published נוצרת רק אחרי URL חי מאומת.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-amber-300 bg-amber-50/80">
        <CardHeader>
          <CardTitle>חוק READY עסקי - מדיה חובה</CardTitle>
          <CardDescription>
            תמונה חובה לפני READY בפלטפורמות LinkedIn, Facebook Page, Medium, Substack, Instagram Business,
            Pinterest ו-X/Twitter. וידאו חובה לפני READY ב-TikTok וב-YouTube. Quora ו-Reddit הם ידניים בלבד
            ולא נכנסים ל-READY אוטומטי. גם אם פלטפורמה תומכת טקסט בלבד, AAOS לא מציג אותה לאישור בלי המדיה הנדרשת.
          </CardDescription>
        </CardHeader>
      </Card>

      <PlatformConnectionsPanel connections={connections} />

      <PlatformCapabilitiesPanel platforms={overview.platforms} />

      <PlatformRegistryTable overview={overview} />
    </div>
  )
}

function NextActionCard({
  title,
  count,
  description,
  href,
  ctaLabel,
  variant = "outline",
}: {
  title: string
  count: number
  description: string
  href: string
  ctaLabel: string
  variant?: "default" | "outline" | "destructive"
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{title}</span>
          <span className="text-3xl font-bold">{count}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={href} className={cn(buttonVariants({ variant }), "w-full")}>
          {ctaLabel}
        </Link>
      </CardContent>
    </Card>
  )
}
