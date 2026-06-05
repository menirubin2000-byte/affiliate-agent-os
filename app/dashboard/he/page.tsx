import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { getSupabaseReadiness } from "@/lib/env"
import { getPlatformRoutingOverview } from "@/lib/platform-routing-db"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

import {
  PlatformRegistryTable,
  PlatformRouteMatrix,
  PlatformRoutingProductTable,
  PlatformRoutingStats,
  RoutingNavActions,
} from "./platform-routing-view"

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

  const overview = await getPlatformRoutingOverview()

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <PageHeader
        eyebrow="Affiliate Agent OS"
        title="דשבורד ניתוב מוצרים"
        description="מסך אחד שמראה מה מוכן לפרסום, מה חסום, מה כבר פורסם עם URL אמיתי, ומה הפעולה הבאה. MENI לא מקבל משימות העתקה, הדבקה או פרסום ידני."
        actions={<RoutingNavActions />}
      />

      <PlatformRoutingStats overview={overview} />

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>כלל עבודה</CardTitle>
          <CardDescription>
            מוצר מתפרסם רק אם יש link_ready, קישור שותף אמיתי, Final Copy תקין, אישור MENI, publish_job ומנוע פרסום מחובר.
            רשומת Published נוצרת רק אחרי URL חי מאומת.
          </CardDescription>
        </CardHeader>
      </Card>

      <PlatformRoutingProductTable overview={overview} limit={12} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">קמפיינים שצריכים תשומת לב</h2>
            <p className="text-sm text-muted-foreground">
              מוצרים עם אישור חסר, מנוע חסום, מדיניות חסומה או Final Copy חסר.
            </p>
          </div>
          <Link href="/dashboard/he/operator" className={cn(buttonVariants({ variant: "outline" }))}>
            פתח דשבורד מפעיל מלא
          </Link>
        </div>
        <PlatformRouteMatrix overview={overview} onlyActionable />
      </section>

      <PlatformRegistryTable overview={overview} />
    </div>
  )
}
