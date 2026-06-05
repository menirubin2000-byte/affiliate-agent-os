import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getPlatformRoutingOverview } from "@/lib/platform-routing-db"
import type { PlatformRoute } from "@/lib/platform-routing"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import {
  getTrafficEngineSnapshot,
  indexRankingsByProductPlatform,
  type TrafficEngineRanking,
} from "@/lib/traffic-engine-db"
import { cn, truncate } from "@/lib/utils"

import {
  approveFinalCopyAction,
  rejectFinalCopyAction,
  requestFinalCopyFixAction,
} from "./actions"

export const dynamic = "force-dynamic"

const TOP_LIMIT = 6
const MAX_PER_PRODUCT = 2

type FinalCopyDetail = {
  body: string
  validationStatus: string
  blockingReasons: string[]
  updatedAt: string | null
}

type AffiliateProgramSummary = {
  network: string | null
  status: string | null
  affiliateLink: string | null
}

type CampaignLinkSummary = {
  finalUrl: string | null
  name: string | null
}

type ReadyCandidate = {
  route: PlatformRoute
  detail: FinalCopyDetail
  program: AffiliateProgramSummary | null
  campaignLink: CampaignLinkSummary | null
  ranking: TrafficEngineRanking | null
  selectionReason: string
  selectionSource: "traffic_engine" | "fallback"
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

  let pageError: string | null = null
  let readyRoutes: PlatformRoute[] = []
  let needsFixRoutes: PlatformRoute[] = []
  let publishedRoutes: PlatformRoute[] = []
  let platformBlockedRoutes: PlatformRoute[] = []
  let legacyDraftsCount = 0
  let topCandidates: ReadyCandidate[] = []
  let trafficConnected = false
  let trafficError: string | null = null

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

    legacyDraftsCount = await countLegacyDrafts()

    const trafficSnapshot = await getTrafficEngineSnapshot()
    trafficConnected = trafficSnapshot.connected
    trafficError = trafficSnapshot.connectionError
    const rankingIndex = indexRankingsByProductPlatform(trafficSnapshot.rankings)

    if (readyRoutes.length > 0) {
      const finalCopyIds = readyRoutes.map((r) => r.finalCopyId!).filter(Boolean)
      const productIds = Array.from(new Set(readyRoutes.map((r) => r.productId)))
      const [details, programs, links] = await Promise.all([
        loadFinalCopyDetails(finalCopyIds),
        loadAffiliateProgramSummaries(productIds),
        loadCampaignLinks(productIds),
      ])

      topCandidates = pickTopCandidates({
        readyRoutes,
        details,
        programs,
        links,
        rankingIndex,
        trafficConnected,
        limit: TOP_LIMIT,
        maxPerProduct: MAX_PER_PRODUCT,
      })
    }
  } catch (error) {
    pageError = error instanceof Error ? error.message : "טעינת תור האישור נכשלה."
  }

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <PageHeader
        eyebrow="אישור תוכן"
        title="תור אישור MENI - מסונן"
        description={`${readyRoutes.length} פוסטים עברו את כל הסינונים. המערכת מציגה למני רק את ${TOP_LIMIT} הראשונים לפי מקור עדיפות (Traffic Engine אם מחובר, או fallback אם לא).`}
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
              סומן needs_system_fix ונוצרה משימת improvement. תיקון קוד/דטה - לא משימה למני.
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
      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>שגיאה בטעינה</CardTitle>
            <CardDescription className="text-destructive">{pageError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <TrafficEngineBanner connected={trafficConnected} connectionError={trafficError} />

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <CountBadge title="מוכן לאישור MENI" value={readyRoutes.length} tone="primary" />
        <CountBadge title="צריך תיקון מערכת" value={needsFixRoutes.length} tone="amber" />
        <CountBadge title="חסום פלטפורמה" value={platformBlockedRoutes.length} tone="muted" />
        <CountBadge title="כבר פורסם ואומת" value={publishedRoutes.length} tone="green" />
        <CountBadge title="טיוטות ישנות (legacy)" value={legacyDraftsCount} tone="muted" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>1. מוכן לאישור MENI ({TOP_LIMIT} הראשונים)</CardTitle>
          <CardDescription>
            עברו: יש קישור שותף אמיתי + link_ready, Final Copy תקין, אין כפילות עם published_records, הפלטפורמה פעילה.
            הסדר {trafficConnected ? "מ-Traffic Engine (Robin)" : "fallback זמני - לפי readiness / updated_at"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {topCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              אין פריטים מוכנים לאישור כרגע. אם קיימות טיוטות במערכת - הן בסטטוס אחר (תיקון, חסום, או כבר פורסם).
            </p>
          ) : (
            topCandidates.map((candidate) => <ReadyRouteCard key={candidate.route.finalCopyId} candidate={candidate} />)
          )}
          {readyRoutes.length > TOP_LIMIT ? (
            <p className="text-sm text-muted-foreground">
              עוד {readyRoutes.length - TOP_LIMIT} פוסטים בתור. אחרי שתסיים את ה-{TOP_LIMIT} שלמעלה - רענן את הדף.
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
            הפלטפורמה לא מחוברת או המדיניות שלה לא תומכת באישור. דרוש OAuth / חוקי קהילה / תיקון מדיניות - לא משימה למני.
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
            רשומות בטבלת content_drafts הישנה (לפני מעבר ל-final_copies). לא בלולאת האישור החדשה. נשמרות להיסטוריה.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            סה״כ טיוטות ישנות: <strong>{legacyDraftsCount}</strong>
          </p>
          <p className="text-muted-foreground">
            ניתן לצפות בהן ב-/dashboard/drafts אך אין צורך לאשר אותן ידנית. הזרימה החדשה היא final_copies בלבד.
          </p>
          <Link href="/dashboard/drafts" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            פתח רשימת drafts ישנה
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

function TrafficEngineBanner({
  connected,
  connectionError,
}: {
  connected: boolean
  connectionError: string | null
}) {
  if (connected) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="default">Traffic Engine</Badge>
            <span>נבחר על ידי Traffic Engine (Robin Marketing Automation)</span>
          </CardTitle>
          <CardDescription>
            הסדר של 6 הראשונים מגיע מ-Robin (GSC + keyword tracker). אם score לא קיים לזוג (product, platform) -
            הפריט יורד לסוף הרשימה ולא נכנס לטופ 6.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }
  return (
    <Card className="border-amber-300 bg-amber-50/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="outline">fallback זמני</Badge>
          <span>Traffic Engine לא מחובר עדיין</span>
        </CardTitle>
        <CardDescription>
          המיון כאן לא דירוג תנועה אמיתי - הוא לפי readiness ואז updated_at של ה-Final Copy. ה-Traffic Engine הקבוע
          (Robin Marketing Automation) צריך לכתוב לטבלה <code>traffic_engine_rankings</code> ב-Supabase כדי שהסדר יבוא
          ממנו. {connectionError ? <em>(מצב: {connectionError})</em> : null}
        </CardDescription>
      </CardHeader>
    </Card>
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

function ReadyRouteCard({ candidate }: { candidate: ReadyCandidate }) {
  const { route, detail, program, campaignLink, ranking, selectionReason, selectionSource } = candidate
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
          {selectionSource === "traffic_engine" ? (
            <Badge variant="default">נבחר על ידי Traffic Engine</Badge>
          ) : (
            <Badge variant="outline">fallback זמני</Badge>
          )}
          <Badge variant="secondary">{route.platform.contentType}</Badge>
        </div>
      </div>

      <dl className="grid gap-2 text-sm md:grid-cols-2">
        <FieldRow
          label="מצב affiliate_program"
          value={program?.status ? `${program.status}${program.network ? ` · ${program.network}` : ""}` : "לא מצאתי program"}
          ok={program?.status === "link_ready"}
        />
        <FieldRow
          label="affiliate link אמיתי"
          value={program?.affiliateLink || "—"}
          ok={Boolean(program?.affiliateLink)}
          mono
        />
        <FieldRow
          label="campaign link UTM"
          value={campaignLink?.finalUrl || "אין campaign link מוכן"}
          ok={Boolean(campaignLink?.finalUrl)}
          mono
        />
        <FieldRow
          label="validation_status"
          value={detail.validationStatus}
          ok={detail.validationStatus === "valid"}
        />
      </dl>

      {detail.blockingReasons.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {detail.blockingReasons.map((reason) => (
            <Badge variant="destructive" key={reason}>
              {reason}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="rounded border bg-muted/30 p-3 text-sm">
        <p className="font-medium">למה הוא נבחר עכשיו</p>
        <p className="text-muted-foreground">{selectionReason}</p>
        {ranking ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Traffic Engine score: {ranking.score}
            {ranking.keyword ? ` · keyword: ${ranking.keyword}` : ""}
            {ranking.reason ? ` · ${ranking.reason}` : ""}
            {" · "}
            מקור: {ranking.source}
          </p>
        ) : null}
      </div>

      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded border bg-muted/30 p-3 text-sm">
        {truncate(detail.body || "אין תוכן זמין.", 800)}
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

function FieldRow({ label, value, ok, mono = false }: { label: string; value: string; ok: boolean; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <dt className="min-w-32 text-muted-foreground">{label}:</dt>
      <dd className={cn("flex-1 break-all", mono && "font-mono text-xs", ok ? "" : "text-amber-700")}>{value}</dd>
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

function pickTopCandidates(input: {
  readyRoutes: PlatformRoute[]
  details: Map<string, FinalCopyDetail>
  programs: Map<string, AffiliateProgramSummary>
  links: Map<string, CampaignLinkSummary>
  rankingIndex: Map<string, TrafficEngineRanking>
  trafficConnected: boolean
  limit: number
  maxPerProduct: number
}): ReadyCandidate[] {
  const candidates = input.readyRoutes
    .map((route): ReadyCandidate => {
      const detail = input.details.get(route.finalCopyId ?? "") ?? {
        body: "",
        validationStatus: "unknown",
        blockingReasons: [],
        updatedAt: null,
      }
      const program = input.programs.get(route.productId) ?? null
      const campaignLink = input.links.get(route.productId) ?? null
      const ranking = input.rankingIndex.get(`${route.productId}::${route.platform.key}`) ?? null
      let selectionReason: string
      let selectionSource: "traffic_engine" | "fallback"
      if (ranking) {
        selectionSource = "traffic_engine"
        selectionReason = ranking.reason
          ? `Traffic Engine score ${ranking.score} (${ranking.reason})`
          : `Traffic Engine score ${ranking.score}`
      } else if (input.trafficConnected) {
        selectionSource = "fallback"
        selectionReason =
          "Traffic Engine מחובר אבל אין דירוג לזוג (מוצר, פלטפורמה) הזה - הצגה לפי readiness כ-fallback."
      } else {
        selectionSource = "fallback"
        selectionReason =
          "Traffic Engine לא מחובר עדיין - fallback לפי readiness (link_ready + validation valid) ו-updated_at."
      }
      return { route, detail, program, campaignLink, ranking, selectionReason, selectionSource }
    })
    // Hard filter: must have a real affiliate link from a link_ready program.
    .filter((c) => Boolean(c.program?.affiliateLink) && c.program?.status === "link_ready")

  candidates.sort((a, b) => {
    const aScore = a.ranking?.score ?? -Infinity
    const bScore = b.ranking?.score ?? -Infinity
    if (aScore !== bScore) return bScore - aScore
    const aDate = a.detail.updatedAt ? Date.parse(a.detail.updatedAt) : 0
    const bDate = b.detail.updatedAt ? Date.parse(b.detail.updatedAt) : 0
    if (bDate !== aDate) return bDate - aDate
    return a.route.productName.localeCompare(b.route.productName)
  })

  const out: ReadyCandidate[] = []
  const perProduct = new Map<string, number>()
  for (const candidate of candidates) {
    const used = perProduct.get(candidate.route.productId) ?? 0
    if (used >= input.maxPerProduct) continue
    out.push(candidate)
    perProduct.set(candidate.route.productId, used + 1)
    if (out.length >= input.limit) break
  }
  return out
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

async function loadFinalCopyDetails(ids: string[]): Promise<Map<string, FinalCopyDetail>> {
  const map = new Map<string, FinalCopyDetail>()
  if (ids.length === 0) return map
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("final_copies")
    .select("id, body, validation_status, blocking_reasons, updated_at")
    .in("id", ids)
  if (error || !data) return map
  for (const row of data as Array<{
    id: string
    body: string | null
    validation_status: string | null
    blocking_reasons: unknown
    updated_at: string | null
  }>) {
    map.set(row.id, {
      body: row.body ?? "",
      validationStatus: row.validation_status ?? "unknown",
      blockingReasons: Array.isArray(row.blocking_reasons) ? (row.blocking_reasons as string[]) : [],
      updatedAt: row.updated_at,
    })
  }
  return map
}

async function loadAffiliateProgramSummaries(productIds: string[]): Promise<Map<string, AffiliateProgramSummary>> {
  const map = new Map<string, AffiliateProgramSummary>()
  if (productIds.length === 0) return map
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("affiliate_programs")
    .select("product_id, status, affiliate_link, network, updated_at")
    .in("product_id", productIds)
    .order("updated_at", { ascending: false })
  if (error || !data) return map
  for (const row of data as Array<{
    product_id: string
    status: string | null
    affiliate_link: string | null
    network: string | null
  }>) {
    // First non-null link_ready row wins; otherwise the latest row.
    const existing = map.get(row.product_id)
    if (existing && existing.status === "link_ready") continue
    map.set(row.product_id, {
      network: row.network,
      status: row.status,
      affiliateLink: row.affiliate_link,
    })
  }
  return map
}

async function loadCampaignLinks(productIds: string[]): Promise<Map<string, CampaignLinkSummary>> {
  const map = new Map<string, CampaignLinkSummary>()
  if (productIds.length === 0) return map
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("campaign_links")
    .select("product_id, final_url, name, updated_at")
    .in("product_id", productIds)
    .order("updated_at", { ascending: false })
  if (error || !data) return map
  for (const row of data as Array<{
    product_id: string
    final_url: string | null
    name: string | null
  }>) {
    if (map.has(row.product_id)) continue
    map.set(row.product_id, { finalUrl: row.final_url, name: row.name })
  }
  return map
}
