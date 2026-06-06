import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { StatCard } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, truncate } from "@/lib/utils"
import type { PlatformRoute, PlatformRouteState, PlatformRoutingOverview } from "@/lib/platform-routing"

const stateVariant: Record<PlatformRouteState, "default" | "secondary" | "destructive" | "outline"> = {
  published_verified: "default",
  ready_for_executor: "secondary",
  pending_meni_approval: "outline",
  executor_blocked: "destructive",
  policy_blocked: "destructive",
  requires_auth: "secondary",
  running: "secondary",
  waiting_url_verification: "secondary",
  needs_system_fix: "destructive",
  missing_final_copy: "destructive",
  missing_affiliate_link: "destructive",
  platform_pending_setup: "outline",
  platform_disabled: "outline",
}

export function PlatformRoutingStats({ overview }: { overview: PlatformRoutingOverview }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <StatCard label="מוצרים" value={String(overview.counts.products)} detail="כל המוצרים במערכת." />
      <StatCard
        label="מוכנים שותפים"
        value={String(overview.counts.affiliateReadyProducts)}
        detail="יש link_ready וקישור שותף אמיתי."
      />
      <StatCard
        label="פורסם ואומת"
        value={String(overview.counts.publishedVerified)}
        detail="רק רשומות עם URL חי מאומת."
      />
      <StatCard
        label="ממתין לאישור"
        value={String(overview.counts.waitingApproval)}
        detail="MENI לוחץ אשר / דחה / דרוש תיקון."
      />
      <StatCard
        label="חסומים"
        value={String(overview.counts.blocked)}
        detail="חסימת מדיניות, executor, קישור או תוכן."
      />
    </section>
  )
}

export function PlatformRoutingProductTable({
  overview,
  limit,
}: {
  overview: PlatformRoutingOverview
  limit?: number
}) {
  const products = typeof limit === "number" ? overview.products.slice(0, limit) : overview.products

  return (
    <Card>
      <CardHeader>
        <CardTitle>ניתוב מוצרים לפלטפורמות</CardTitle>
        <CardDescription>
          המערכת מציגה פעולה הבאה לפי נתונים אמיתיים בלבד: קישור שותף, Final Copy, publish_job ו-URL מאומת.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b text-right text-muted-foreground">
              <th className="px-3 py-2 font-medium">מוצר</th>
              <th className="px-3 py-2 font-medium">קטגוריה</th>
              <th className="px-3 py-2 font-medium">Affiliate</th>
              <th className="px-3 py-2 font-medium">פורסם</th>
              <th className="px-3 py-2 font-medium">חסומים</th>
              <th className="px-3 py-2 font-medium">פעולה הבאה</th>
            </tr>
          </thead>
          <tbody>
            {!products.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  אין מוצרים להצגה.
                </td>
              </tr>
            ) : null}
            {products.map((item) => (
              <tr key={item.product.id} className="border-b align-top">
                <td className="px-3 py-3 font-medium">{item.product.name}</td>
                <td className="px-3 py-3 text-muted-foreground">{item.product.category ?? "-"}</td>
                <td className="px-3 py-3">
                  <Badge variant={item.affiliateReady ? "default" : "destructive"}>
                    {item.affiliateReady ? "link_ready" : "לא מוכן"}
                  </Badge>
                </td>
                <td className="px-3 py-3">{item.publishedCount}</td>
                <td className="px-3 py-3">{item.blockedCount}</td>
                <td className="px-3 py-3">{item.nextActionHe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

export function PlatformRouteMatrix({
  overview,
  onlyActionable = false,
}: {
  overview: PlatformRoutingOverview
  onlyActionable?: boolean
}) {
  const products = onlyActionable
    ? overview.products.filter((product) =>
        product.routes.some((route) =>
          [
            "pending_meni_approval",
            "ready_for_executor",
            "requires_auth",
            "executor_blocked",
            "policy_blocked",
            "needs_system_fix",
            "missing_final_copy",
          ].includes(route.state),
        ),
      )
    : overview.products

  return (
    <section className="space-y-4">
      {products.map((product) => (
        <Card key={product.product.id}>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{product.product.name}</CardTitle>
                <CardDescription>{product.nextActionHe}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={product.affiliateReady ? "default" : "destructive"}>
                  {product.affiliateReady ? "מוכן affiliate" : "לא affiliate-ready"}
                </Badge>
                <Badge variant="outline">{product.publishedCount} פורסמו</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead>
                <tr className="border-b text-right text-muted-foreground">
                  <th className="px-3 py-2 font-medium">פלטפורמה</th>
                  <th className="px-3 py-2 font-medium">סטטוס</th>
                  <th className="px-3 py-2 font-medium">פעולה הבאה</th>
                  <th className="px-3 py-2 font-medium">חסם</th>
                  <th className="px-3 py-2 font-medium">URL אמיתי</th>
                </tr>
              </thead>
              <tbody>
                {product.routes.map((route) => (
                  <tr key={`${product.product.id}-${route.platform.key}`} className="border-b align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium">{route.platform.hebrewName}</div>
                      <div className="text-xs text-muted-foreground">{route.platform.contentType}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={stateVariant[route.state]}>{route.labelHe}</Badge>
                    </td>
                    <td className="px-3 py-3">{route.nextActionHe}</td>
                    <td className="px-3 py-3 text-muted-foreground">{route.blocker ?? "-"}</td>
                    <td className="px-3 py-3">{route.liveUrl ? <LiveUrl route={route} /> : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

export function PlatformRegistryTable({ overview }: { overview: PlatformRoutingOverview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>רשימת פלטפורמות מרכזית</CardTitle>
        <CardDescription>
          פלטפורמה במצב pending_setup לא מקבלת פרסום אוטומטי. Facebook נשאר pending_setup עד שיש חשבון וזרימת API אמיתית.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b text-right text-muted-foreground">
              <th className="px-3 py-2 font-medium">פלטפורמה</th>
              <th className="px-3 py-2 font-medium">מצב</th>
              <th className="px-3 py-2 font-medium">נתיב פרסום</th>
              <th className="px-3 py-2 font-medium">Affiliate</th>
              <th className="px-3 py-2 font-medium">חסם/הגדרה</th>
            </tr>
          </thead>
          <tbody>
            {overview.platforms.map((platform) => (
              <tr key={platform.key} className="border-b align-top">
                <td className="px-3 py-3">
                  <div className="font-medium">{platform.hebrewName}</div>
                  {platform.accountUrl ? (
                    <a
                      href={platform.accountUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      dir="ltr"
                    >
                      {truncate(platform.accountUrl, 48)}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <Badge variant={platform.status === "active" ? "default" : "outline"}>{platform.status}</Badge>
                </td>
                <td className="px-3 py-3">{platform.publishMode}</td>
                <td className="px-3 py-3">
                  {platform.directAffiliateLinksAllowed ? "מותר עם גילוי" : "אסור קישור ישיר"}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{platform.setupBlocker ?? platform.policySummary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

export function RoutingNavActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/dashboard/he/claude-rules" className={cn(buttonVariants({ variant: "destructive" }))}>
        🛑 כללים לקלוד
      </Link>
      <Link href="/dashboard/he/content-review" className={cn(buttonVariants())}>
        אישור פוסטים
      </Link>
      <Link href="/dashboard/he/publish-ready" className={cn(buttonVariants({ variant: "outline" }))}>
        מצב פרסום
      </Link>
      <Link href="/dashboard/he/browser-control" className={cn(buttonVariants({ variant: "outline" }))}>
        מנוע פרסום
      </Link>
    </div>
  )
}

function LiveUrl({ route }: { route: PlatformRoute }) {
  if (!route.liveUrl) return null

  return (
    <a
      href={route.liveUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-[260px] items-center gap-1 text-primary hover:underline"
      dir="ltr"
    >
      <span className="truncate">{truncate(route.liveUrl, 56)}</span>
      <ExternalLink className="size-3" />
    </a>
  )
}
