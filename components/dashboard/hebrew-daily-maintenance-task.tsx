import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn, formatDateTime, truncate } from "@/lib/utils"
import type { ApprovalItem } from "@/types/approval-item"
import type { AffiliateProgram } from "@/types/affiliate-program"
import type { CampaignLink } from "@/types/campaign-link"
import type { Draft, QualityChecks } from "@/types/draft"
import type { PerformanceMetric } from "@/types/performance"
import type { Product } from "@/types/product"

const REQUIRED_DISTRIBUTION_CHANNELS = [
  "linkedin",
  "medium",
  "substack",
  "tiktok",
  "quora",
  "reddit",
]

function money(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

function todayKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value)
}

function groupByProductId<T extends { productId: string | null }>(items: T[]) {
  const grouped = new Map<string, T[]>()
  for (const item of items) {
    if (!item.productId) continue
    grouped.set(item.productId, [...(grouped.get(item.productId) ?? []), item])
  }
  return grouped
}

function normalizeQualityChecks(value: QualityChecks | string | null | undefined): QualityChecks | null {
  if (!value) return null
  if (typeof value !== "string") return value

  try {
    return JSON.parse(value) as QualityChecks
  } catch {
    return null
  }
}

function qualityPasses(draft: Draft) {
  const checks = normalizeQualityChecks(draft.qualityChecks)
  if (!checks) return false

  return (
    checks.has_disclosure &&
    checks.has_clear_cta &&
    checks.has_target_keyword &&
    checks.has_meta_title &&
    checks.has_meta_description &&
    checks.avoids_fake_claims &&
    checks.has_required_structure
  )
}

function latestRecord(records: PerformanceMetric[]) {
  return records.reduce<PerformanceMetric | null>((latest, record) => {
    if (!latest) return record
    return new Date(record.recordedAt) > new Date(latest.recordedAt) ? record : latest
  }, null)
}

export function HebrewDailyMaintenanceTask({
  products,
  drafts,
  programs,
  campaignLinks,
  performance,
  approvals,
}: {
  products: Product[]
  drafts: Draft[]
  programs: AffiliateProgram[]
  campaignLinks: CampaignLink[]
  performance: PerformanceMetric[]
  approvals: ApprovalItem[]
}) {
  const draftsByProduct = groupByProductId(drafts)
  const programsByProduct = groupByProductId(programs)
  const linksByProduct = groupByProductId(campaignLinks)
  const performanceByProduct = groupByProductId(performance)
  const approvalsByProduct = groupByProductId(approvals)
  const today = todayKey(new Date())

  const readyProducts = products.filter((product) => {
    const productPrograms = programsByProduct.get(product.id) ?? []
    const productDrafts = draftsByProduct.get(product.id) ?? []
    const productLinks = linksByProduct.get(product.id) ?? []

    return (
      product.status === "active" &&
      Boolean(product.affiliateUrl.trim()) &&
      productPrograms.some((program) => program.status === "link_ready" && program.affiliateLink) &&
      productDrafts.some((draft) => draft.status === "approved" && qualityPasses(draft)) &&
      productLinks.length > 0
    )
  })

  const waitingAffiliatePrograms = programs.filter((program) =>
    ["awaiting_human_approval", "submitted", "approved"].includes(program.status),
  )

  const todayPublished = approvals.filter(
    (item) => item.status === "published" && item.resolvedAt && todayKey(new Date(item.resolvedAt)) === today,
  )

  const missingPostLinks = products.flatMap((product) => {
    const productPrograms = programsByProduct.get(product.id) ?? []
    const hasReadyProgram = productPrograms.some(
      (program) => program.status === "link_ready" && program.affiliateLink,
    )
    if (!hasReadyProgram) return []

    const productLinks = linksByProduct.get(product.id) ?? []
    const productApprovals = approvalsByProduct.get(product.id) ?? []

    return REQUIRED_DISTRIBUTION_CHANNELS.flatMap((channel) => {
      const hasCampaignLink = productLinks.some((link) => link.channel.toLowerCase() === channel)
      const publishedApproval = productApprovals.find(
        (approval) => approval.status === "published" && approval.platform?.toLowerCase() === channel,
      )
      const hasPublishedUrl = Boolean(publishedApproval?.operatorNotes?.match(/https?:\/\/\S+/))

      if (!hasCampaignLink) {
        return [{ product: product.name, channel, reason: "חסר קישור קמפיין" }]
      }

      if (publishedApproval && !hasPublishedUrl) {
        return [{ product: product.name, channel, reason: "פורסם אבל חסר URL פוסט אמיתי" }]
      }

      return []
    })
  })

  const totals = performance.reduce(
    (sum, record) => ({
      clicks: sum.clicks + record.clicks,
      leads: sum.leads + (record.conversions ?? 0),
      sales: sum.sales + (record.conversions ?? 0),
      revenue: sum.revenue + (record.revenue ?? 0),
    }),
    { clicks: 0, leads: 0, sales: 0, revenue: 0 },
  )

  const blockedItems = products.flatMap((product) => {
    const productPrograms = programsByProduct.get(product.id) ?? []
    const productDrafts = draftsByProduct.get(product.id) ?? []
    const productLinks = linksByProduct.get(product.id) ?? []
    const productPerformance = performanceByProduct.get(product.id) ?? []
    const reasons: string[] = []

    if (!product.affiliateUrl.trim()) reasons.push("חסר affiliate link")
    if (productPrograms.length === 0) reasons.push("אין תוכנית שותפים")
    if (productPrograms.some((program) => program.status === "submitted")) {
      reasons.push("אישור affiliate עדיין בהמתנה")
    }
    if (!productDrafts.some((draft) => draft.status === "approved" && qualityPasses(draft))) {
      reasons.push("אין טיוטה מאושרת שעוברת quality")
    }
    if (productLinks.length === 0) reasons.push("אין קישורי קמפיין")
    if (productPerformance.length === 0 && productDrafts.some((draft) => draft.status === "approved")) {
      reasons.push("אין performance אחרי תוכן מאושר")
    }

    return reasons.map((reason) => ({ product: product.name, reason }))
  })

  const latestPerformance = latestRecord(performance)

  return (
    <Card id="daily-maintenance" dir="rtl" className="border-primary/30 bg-primary/5 text-right shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              משימה יומית קבועה
            </p>
            <CardTitle className="mt-2">בדיקת Affiliate Agent OS יומית</CardTitle>
            <CardDescription className="mt-2">
              שעה קבועה: 21:00 כל יום. מוצג בתוך התוכנה בלבד; אין התראות חיצוניות ואין פעולה אוטומטית.
            </CardDescription>
          </div>
          <Badge variant="secondary">21:00</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-3">
            <div className="text-xs text-muted-foreground">מוכנים לפרסום</div>
            <div className="mt-1 text-2xl font-semibold">{readyProducts.length}</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-xs text-muted-foreground">פרסומים היום</div>
            <div className="mt-1 text-2xl font-semibold">{todayPublished.length}</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-xs text-muted-foreground">קליקים אמיתיים</div>
            <div className="mt-1 text-2xl font-semibold">{totals.clicks}</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-xs text-muted-foreground">הכנסות</div>
            <div className="mt-1 text-2xl font-semibold">{money(totals.revenue)}</div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">מוצרים מוכנים לפרסום</h3>
            {readyProducts.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">אין כרגע מוצר שעומד בכל התנאים לפרסום ידני.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {readyProducts.slice(0, 6).map((product) => (
                  <li key={product.id}>
                    <Link href={`/dashboard/products/${product.id}`} className="text-primary hover:underline">
                      {product.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">אישורי affiliate שמחכים</h3>
            {waitingAffiliatePrograms.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">אין אישורי affiliate שמחכים כרגע.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {waitingAffiliatePrograms.slice(0, 6).map((program) => (
                  <li key={program.id}>
                    <span className="font-medium">{program.productName ?? program.programName}</span>
                    <span className="text-muted-foreground"> - {program.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">פרסומים שבוצעו היום</h3>
            {todayPublished.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">לא נרשם פרסום אמיתי היום.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {todayPublished.map((item) => (
                  <li key={item.id}>
                    <span className="font-medium">{item.productName ?? "ללא מוצר"}</span>
                    <span className="text-muted-foreground"> - {item.platform ?? "ללא פלטפורמה"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">קישורי פוסטים חסרים</h3>
            {missingPostLinks.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">לא זוהו קישורים חסרים בערוצי ההפצה.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {missingPostLinks.slice(0, 8).map((item) => (
                  <li key={`${item.product}-${item.channel}-${item.reason}`}>
                    <span className="font-medium">{item.product}</span>
                    <span className="text-muted-foreground"> - {item.channel}: {item.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">נתוני performance אמיתיים</h3>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Clicks</dt>
                <dd className="font-medium">{totals.clicks}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Leads</dt>
                <dd className="font-medium">{totals.leads}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sales</dt>
                <dd className="font-medium">{totals.sales}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Revenue</dt>
                <dd className="font-medium">{money(totals.revenue)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              עדכון אחרון: {latestPerformance ? formatDateTime(latestPerformance.recordedAt) : "אין נתונים עדיין"}.
              Leads/Sales נקראים כרגע משדה conversions עד שתתווסף הפרדה מלאה.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">משימות חסומות</h3>
            {blockedItems.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">אין חסימות קריטיות מזוהות כרגע.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {blockedItems.slice(0, 8).map((item) => (
                  <li key={`${item.product}-${item.reason}`}>
                    <span className="font-medium">{item.product}</span>
                    <span className="text-muted-foreground"> - {truncate(item.reason, 90)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/he#products" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            מוצרים
          </Link>
          <Link href="/dashboard/approvals" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            אישורים
          </Link>
          <Link href="/dashboard/performance" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Performance
          </Link>
          <Link href="/dashboard/he/operator" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
            מסך תחזוקה יומי
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
