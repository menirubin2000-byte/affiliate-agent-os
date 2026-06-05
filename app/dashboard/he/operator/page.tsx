import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseReadiness } from "@/lib/env"
import { getPlatformRoutingOverview } from "@/lib/platform-routing-db"
import { isSupabaseConfigured } from "@/lib/supabase/server"

import {
  PlatformRegistryTable,
  PlatformRouteMatrix,
  PlatformRoutingProductTable,
  PlatformRoutingStats,
  RoutingNavActions,
} from "../platform-routing-view"

export const dynamic = "force-dynamic"

export default async function HebrewOperatorRoutingPage() {
  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    return (
      <div dir="rtl" className="space-y-6 text-right">
        <PageHeader title="דשבורד מפעיל" description="ניתוב מוצרים לפלטפורמות." />
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
        eyebrow="ניתוב מרכזי"
        title="דשבורד מפעיל"
        description="כאן רואים את כל המוצרים וכל הפלטפורמות לפי מצב אמיתי: מוכן לאישור, מוכן למנוע פרסום, חסום, או פורסם ואומת."
        actions={<RoutingNavActions />}
      />

      <PlatformRoutingStats overview={overview} />
      <PlatformRoutingProductTable overview={overview} />
      <PlatformRouteMatrix overview={overview} />
      <PlatformRegistryTable overview={overview} />
    </div>
  )
}
