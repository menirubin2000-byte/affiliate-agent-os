import Link from "next/link"
import type { ReactNode } from "react"
import { CheckCircle2, ExternalLink, PackagePlus, Search, ShieldAlert, Truck } from "lucide-react"

import { addImpactCandidateToSystemAction } from "@/app/dashboard/he/impact-products/actions"
import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getImpactCandidateBucket,
  listImpactProductCandidates,
  summarizeImpactCandidates,
  type ImpactCandidateBucket,
} from "@/lib/impact-product-candidates-db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { ImpactProductCandidate } from "@/types/impact-product-candidate"

export const dynamic = "force-dynamic"

const bucketOptions: Array<{ key: ImpactCandidateBucket; label: string; description: string }> = [
  { key: "all", label: "כל המועמדים", description: "כל מוצרי Impact שיובאו כמועמדים לקידום." },
  { key: "top50", label: "Top 50", description: "50 המועמדים החזקים ביותר אחרי סינון דחייה." },
  { key: "recommended20", label: "Top 20 להכניס למערכת", description: "מועמדים בציון 80+ שעברו את שערי הסינון." },
  { key: "launch10", label: "10 להשקה", description: "המועמדים החזקים ביותר עם אישור Impact." },
  { key: "rejected", label: "נדחו", description: "מוצרים שלא כדאי לקדם לפי החוקים." },
  { key: "needsApproval", label: "צריך אישור מותג", description: "מועמדים טובים שעדיין חסר להם approval." },
  { key: "needsShippingCheck", label: "צריך בדיקת משלוח", description: "חסר מידע משלוח / Geo." },
]

function isBucket(value?: string): value is ImpactCandidateBucket {
  return bucketOptions.some((option) => option.key === value)
}

export default async function HebrewImpactProductsPage(props: {
  searchParams: Promise<{ bucket?: string; error?: string; added?: string }>
}) {
  const searchParams = await props.searchParams
  const bucket = isBucket(searchParams.bucket) ? searchParams.bucket : "top50"

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    return (
      <div dir="rtl" className="space-y-6 text-right">
        <PageHeader
          eyebrow="Impact scanner"
          title="מועמדים לקידום מ-Impact"
          description="סריקת מוצרים נשמרת כמועמדים בלבד, לא כמוצרים פעילים."
        />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>Supabase לא מוגדר</CardTitle>
            <CardDescription>{readiness.summary} {readiness.guidance}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  let candidates: ImpactProductCandidate[] = []
  let pageError: string | null = searchParams.error ?? null
  try {
    candidates = await listImpactProductCandidates()
  } catch (error) {
    pageError = error instanceof Error ? error.message : "Unable to load Impact candidates."
  }

  const summary = summarizeImpactCandidates(candidates)
  const visibleCandidates = getImpactCandidateBucket(candidates, bucket)
  const activeBucket = bucketOptions.find((option) => option.key === bucket) ?? bucketOptions[1]

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <PageHeader
        eyebrow="Impact Product Scanner"
        title="מועמדים לקידום מ-Impact"
        description="ייבוא וסינון אוטומטי של מוצרי Impact כמועמדים לקידום בלבד. שום דבר כאן לא מפרסם, לא יוצר פוסטים ולא מאשר תוכן."
      />

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>שגיאה</CardTitle>
            <CardDescription className="text-destructive">{pageError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.added ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle>המועמד נוסף למערכת</CardTitle>
            <CardDescription>
              המועמד נשמר כ- inactive ותוכנית השותפים נשמרה לבדיקה. לא נוצרו פוסטים ולא נוצר פרסום.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-9">
        <MetricCard title="כל המועמדים" value={summary.total} />
        <MetricCard title="Top 50" value={summary.top50} />
        <MetricCard title="Top 20 למערכת" value={summary.recommended20} />
        <MetricCard title="10 להשקה" value={summary.launch10} />
        <MetricCard title="נדחו" value={summary.rejected} tone="danger" />
        <MetricCard title="חסר tracking" value={summary.missingTracking} tone="danger" />
        <MetricCard title="חסר תמונה" value={summary.missingImage} tone="danger" />
        <MetricCard title="צריך אישור" value={summary.needsApproval} tone="warning" />
        <MetricCard title="בדיקת משלוח" value={summary.needsShippingCheck} tone="warning" />
      </section>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>חוקי סינון</CardTitle>
          <CardDescription>
            payout 0 = לא לקדם. חסר image = לא לקדם. חסר tracking link = לא לקדם. חסר landing page = דחייה.
            לא approved = צריך אישור מותג. shipping לא ידוע = צריך Geo check.
            ציון 80+ מומלץ, 60-79 אולי, מתחת 60 נדחה.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>תצוגה: {activeBucket.label}</CardTitle>
          <CardDescription>{activeBucket.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {bucketOptions.map((option) => (
              <Link
                key={option.key}
                href={`/dashboard/he/impact-products?bucket=${option.key}`}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition",
                  bucket === option.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4">
        {visibleCandidates.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>אין מועמדים להצגה</CardTitle>
              <CardDescription>
                הרץ `npm run impact:import -- path/to/export.csv` או הגדר `IMPACT_API_PRODUCTS_URL`.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
        {visibleCandidates.map((candidate, index) => (
          <ImpactCandidateCard key={candidate.id} candidate={candidate} rank={index + 1} />
        ))}
      </section>
    </div>
  )
}

function ImpactCandidateCard({ candidate, rank }: { candidate: ImpactProductCandidate; rank: number }) {
  const canAdd =
    candidate.status !== "reject" &&
    candidate.status !== "added_to_system" &&
    Boolean(candidate.landingPage) &&
    Boolean(candidate.trackingLink)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {candidate.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={candidate.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Search className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">#{rank}</Badge>
                <StatusBadge candidate={candidate} />
                <Badge variant="secondary">Score {candidate.finalProductScore}</Badge>
              </div>
              <CardTitle className="text-xl">{candidate.productName}</CardTitle>
              <CardDescription>
                {candidate.brand ?? candidate.advertiser ?? "Impact advertiser"} · {candidate.category ?? "ללא קטגוריה"}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {candidate.productUrl ? (
              <Link
                href={candidate.productUrl}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <ExternalLink className="size-4" />
                Product page
              </Link>
            ) : null}
            {canAdd ? (
              <form action={addImpactCandidateToSystemAction}>
                <input type="hidden" name="candidate_id" value={candidate.id} />
                <Button type="submit">
                  <PackagePlus className="size-4" />
                  Add to system
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Signal title="עמלה צפויה" value={candidate.commissionSummary || formatCommission(candidate)} />
          <Signal title="EPC" value={formatNullable(candidate.epc)} />
          <Signal title="Conversion" value={candidate.conversionRate !== null ? `${candidate.conversionRate}%` : "לא ידוע"} />
          <Signal title="Shipping / Geo" value={candidate.shippingGeo ?? "צריך בדיקה"} />
          <Signal title="Tracking" value={candidate.trackingLink ? "קיים" : "חסר - לא לקדם"} />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Score title="Commission" value={candidate.commissionScore} />
          <Score title="Demand" value={candidate.demandScore} />
          <Score title="EPC" value={candidate.epcScore} />
          <Score title="Conversion" value={candidate.conversionScore} />
          <Score title="Image" value={candidate.imageQualityScore} />
          <Score title="Platform fit" value={candidate.platformFitScore} />
          <Score title="Shipping" value={candidate.shippingScore} />
          <Score title="Risk" value={candidate.riskScore} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <InfoBlock
            icon={<CheckCircle2 className="size-4" />}
            title="סיבות ציון"
            items={candidate.scoreReasons.length > 0 ? candidate.scoreReasons : candidate.whyGood.length > 0 ? candidate.whyGood : ["אין מספיק אותות חיוביים עדיין."]}
          />
          <InfoBlock
            icon={<Search className="size-4" />}
            title="Platform fit"
            items={candidate.platformFit.length > 0 ? candidate.platformFit : ["צריך בדיקת התאמה."]}
          />
          <InfoBlock
            icon={candidate.missingApproval ? <ShieldAlert className="size-4" /> : <Truck className="size-4" />}
            title="סיכונים / חסרים"
            items={[
              ...(candidate.missingApproval ? [candidate.missingApproval] : []),
              ...(candidate.rejectReasons.length > 0 ? candidate.rejectReasons : []),
              ...(candidate.shippingGeo ? [] : ["unknown shipping - needs geo check"]),
            ]}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCard({ title, value, tone = "default" }: { title: string; value: number; tone?: "default" | "warning" | "danger" }) {
  return (
    <Card className={cn(
      tone === "warning" && "border-amber-200 bg-amber-50",
      tone === "danger" && "border-destructive/30 bg-destructive/5",
    )}>
      <CardHeader className="space-y-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function StatusBadge({ candidate }: { candidate: ImpactProductCandidate }) {
  if (candidate.status === "recommended") return <Badge>מומלץ</Badge>
  if (candidate.status === "maybe") return <Badge variant="secondary">אולי</Badge>
  if (candidate.status === "needs_brand_approval") return <Badge variant="outline">צריך אישור מותג</Badge>
  if (candidate.status === "needs_geo_check") return <Badge variant="outline">צריך Geo check</Badge>
  if (candidate.status === "needs_image") return <Badge variant="outline">צריך תמונה</Badge>
  if (candidate.status === "added_to_system") return <Badge variant="secondary">נוסף למערכת</Badge>
  return <Badge variant="destructive">נדחה</Badge>
}

function Signal({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}

function Score({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span>{title}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

function InfoBlock({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 font-medium">
        {icon}
        {title}
      </div>
      <ul className="mt-3 list-disc space-y-1 pr-5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function formatCommission(candidate: ImpactProductCandidate) {
  if (candidate.payout === null) return "לא ידוע"
  return candidate.payoutType === "amount" ? `$${candidate.payout}` : `${candidate.payout}%`
}

function formatNullable(value: number | null) {
  return value === null ? "לא ידוע" : String(value)
}
