import Link from "next/link"
import type { ReactNode } from "react"
import { ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getOperatorActionItems,
  listAffiliatePrograms,
  listApprovalItems,
  listCampaignLinks,
  listDrafts,
  listPerformanceMetrics,
  listProducts,
} from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn, formatDateTime, truncate } from "@/lib/utils"
import {
  APPROVAL_ITEM_STATUS_LABELS,
  APPROVAL_ITEM_TYPE_LABELS,
  type ApprovalItem,
} from "@/types/approval-item"
import {
  PROGRAM_STATUS_LABELS,
  type AffiliateProgram,
} from "@/types/affiliate-program"
import type { CampaignLink } from "@/types/campaign-link"
import type { Draft } from "@/types/draft"
import type { PerformanceMetric } from "@/types/performance"
import type { Product } from "@/types/product"

export const dynamic = "force-dynamic"

function yesNo(value: boolean) {
  return value ? "כן" : "לא"
}

function statusVariant(status: string) {
  if (status === "approved" || status === "link_ready" || status === "published") {
    return "default" as const
  }
  if (status === "rejected" || status === "closed" || status === "critical") {
    return "destructive" as const
  }
  return "secondary" as const
}

function priorityVariant(priority: string) {
  if (priority === "critical" || priority === "high") return "destructive" as const
  if (priority === "medium") return "secondary" as const
  return "outline" as const
}

function formatMoney(value: number | null) {
  if (value === null) return "-"
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
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

function latestRecord(records: PerformanceMetric[]) {
  return records.reduce<PerformanceMetric | null>((latest, record) => {
    if (!latest) return record
    return new Date(record.recordedAt) > new Date(latest.recordedAt) ? record : latest
  }, null)
}

function getNextAction(params: {
  product: Product
  programs: AffiliateProgram[]
  drafts: Draft[]
  links: CampaignLink[]
  records: PerformanceMetric[]
}) {
  if (!params.product.affiliateUrl.trim()) return "להוסיף קישור שותף"
  if (params.programs.length === 0) return "להוסיף תוכנית שותפים"
  if (!params.drafts.some((draft) => draft.status === "approved")) return "להכין או לאשר תוכן"
  if (params.links.length === 0) return "להכין קישורי קמפיין"
  if (params.records.length === 0) return "להזין ביצועים אחרי שיתוף אמיתי"
  return "לבדוק ביצועים והמלצות"
}

const TEMPLATE_FOR_PLATFORM: Record<string, string> = {
  linkedin: "social_post",
  medium: "review",
  substack: "review",
  tiktok: "tiktok_script",
  quora: "quora_answer",
  reddit: "reddit_post",
}

type PlatformStatus =
  | { state: "published"; url: string }
  | { state: "ready"; label: string }
  | { state: "needs_approval"; label: string }
  | { state: "no_draft"; label: string }

function getPlatformStatus(
  platform: string,
  drafts: Draft[],
  links: CampaignLink[],
  approvals: ApprovalItem[],
): PlatformStatus {
  const published = approvals.find(
    (item) => item.status === "published" && item.platform?.toLowerCase() === platform,
  )
  if (published?.campaignLinkUrl) {
    return { state: "published", url: published.campaignLinkUrl }
  }

  const templateType = TEMPLATE_FOR_PLATFORM[platform] ?? "social_post"
  const matchingDrafts = drafts.filter(
    (d) => d.templateType === templateType || d.templateType === "social_post",
  )
  const approved = matchingDrafts.find((d) => d.status === "approved")
  if (approved) {
    const waiting = approvals.find(
      (item) => item.status === "waiting_approval" && item.platform?.toLowerCase() === platform,
    )
    if (waiting) return { state: "needs_approval", label: "צריך אישור" }
    return { state: "ready", label: "מוכן לפרסום" }
  }

  const pending = matchingDrafts.find((d) => d.status === "draft")
  if (pending) return { state: "needs_approval", label: "צריך אישור" }

  return { state: "no_draft", label: "אין טיוטה" }
}

function PlatformStatusCell({ status }: { status: PlatformStatus }) {
  if (status.state === "published") {
    return (
      <a
        href={status.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm"
        dir="ltr"
      >
        <Badge variant="default">פורסם</Badge>
        <ExternalLink className="size-3" />
      </a>
    )
  }

  if (status.state === "ready") {
    return <Badge variant="secondary">{status.label}</Badge>
  }

  if (status.state === "needs_approval") {
    return <Badge variant="outline">{status.label}</Badge>
  }

  return <span className="text-xs text-muted-foreground">{status.label}</span>
}

function ExternalUrl({ url }: { url: string | null }) {
  if (!url) return <span className="text-muted-foreground">אין</span>

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-[220px] items-center gap-1 text-primary hover:underline"
      dir="ltr"
    >
      <span className="truncate">{truncate(url, 54)}</span>
      <ExternalLink className="size-3" />
    </a>
  )
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card id={id} className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">{children}</div>
      </CardContent>
    </Card>
  )
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-6 text-center text-sm text-muted-foreground">
        {text}
      </td>
    </tr>
  )
}

export default async function HebrewOperatorHomePage() {
  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    return (
      <div dir="rtl" className="space-y-6 text-right">
        <h1 className="text-2xl font-semibold">דשבורד מפעיל</h1>
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Supabase לא מוגדר</CardTitle>
            <CardDescription className="text-destructive/80">
              {readiness.summary} {readiness.guidance}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  let products: Product[] = []
  let drafts: Draft[] = []
  let programs: AffiliateProgram[] = []
  let links: CampaignLink[] = []
  let performance: PerformanceMetric[] = []
  let approvals: ApprovalItem[] = []
  let actions: Awaited<ReturnType<typeof getOperatorActionItems>> = []
  let pageError: string | null = null

  try {
    ;[products, drafts, programs, links, performance, approvals, actions] = await Promise.all([
      listProducts(),
      listDrafts(),
      listAffiliatePrograms(),
      listCampaignLinks(),
      listPerformanceMetrics(),
      listApprovalItems(),
      getOperatorActionItems({ limit: 5 }),
    ])
  } catch (error) {
    pageError = error instanceof Error ? error.message : "טעינת הנתונים נכשלה."
  }

  const draftsByProduct = groupByProductId(drafts)
  const programsByProduct = groupByProductId(programs)
  const linksByProduct = groupByProductId(links)
  const performanceByProduct = groupByProductId(performance)
  const approvalsByProduct = groupByProductId(approvals)
  const pendingApprovals = approvals.filter((item) => item.status === "waiting_approval")
  const rejectedApprovals = approvals.filter((item) => item.status === "rejected")
  const rejectedDrafts = drafts.filter((draft) => draft.status === "rejected")
  const publishedApprovals = approvals.filter((item) => item.status === "published")

  return (
    <div dir="rtl" className="space-y-8 text-right">
      <header className="space-y-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Affiliate Agent OS
          </p>
          <h1 className="mt-2 text-3xl font-semibold">דשבורד מפעיל יומי</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            מסך אחד למוצרים, תוכניות שותפים, הפצה ידנית, אישורים וביצועים. הנתונים כאן נקראים מהמסד בלבד; אין פרסום אוטומטי ואין יצירת מטריקות מזויפות.
          </p>
        </div>

        <nav className="flex flex-wrap gap-2">
          {[
            ["#products", "מוצרים"],
            ["#programs", "תוכניות שותפים"],
            ["#published", "מה פורסם"],
            ["#where", "6 פלטפורמות"],
            ["#pending", "מחכה לאישור"],
            ["#rejected", "נדחה"],
            ["#actions", "פעולה עכשיו"],
            ["#performance", "נתונים אמיתיים"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>שגיאה בטעינת הדשבורד</CardTitle>
            <CardDescription className="text-destructive/80">{pageError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Section
        id="actions"
        title="מה צריך פעולה עכשיו"
        description="חמש הפעולות החשובות ביותר כרגע מתוך Command Center."
      >
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b text-right text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">עדיפות</th>
              <th className="px-3 py-2">מקור</th>
              <th className="px-3 py-2">פעולה</th>
              <th className="px-3 py-2">הסבר</th>
              <th className="px-3 py-2">פתיחה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {actions.length === 0 ? (
              <EmptyRow colSpan={5} text="אין פעולות דחופות כרגע." />
            ) : (
              actions.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">
                    <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{item.source.replace(/_/g, " ")}</td>
                  <td className="px-3 py-3 font-medium">{item.title}</td>
                  <td className="px-3 py-3 text-muted-foreground">{item.description}</td>
                  <td className="px-3 py-3">
                    <Link
                      href={item.actionHref}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      לפתוח
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Section>

      <Section
        id="products"
        title="מוצרים"
        description="מצב המוצרים, קישורי השותף, תוכן מוכן והפעולה הבאה."
      >
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b text-right text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">שם מוצר</th>
              <th className="px-3 py-2">קטגוריה</th>
              <th className="px-3 py-2">סטטוס שותפים</th>
              <th className="px-3 py-2">יש קישור שותף</th>
              <th className="px-3 py-2">תוכן מוכן</th>
              <th className="px-3 py-2">פורסם (מתוך 6)</th>
              <th className="px-3 py-2">הפעולה הבאה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {products.length === 0 ? (
              <EmptyRow colSpan={7} text="אין מוצרים עדיין." />
            ) : (
              products.map((product) => {
                const productDrafts = draftsByProduct.get(product.id) ?? []
                const productPrograms = programsByProduct.get(product.id) ?? []
                const productLinks = linksByProduct.get(product.id) ?? []
                const productPerformance = performanceByProduct.get(product.id) ?? []
                const publishedPlatforms = (approvalsByProduct.get(product.id) ?? [])
                  .filter((item) => item.status === "published" && item.platform)
                  .map((item) => item.platform)
                const contentReady = productDrafts.some((draft) => draft.status === "approved")
                const programStatus =
                  productPrograms.length > 0
                    ? productPrograms.map((program) => PROGRAM_STATUS_LABELS[program.status]).join(", ")
                    : "אין תוכנית"

                return (
                  <tr key={product.id}>
                    <td className="px-3 py-3">
                      <Link href={`/dashboard/products/${product.id}`} className="font-medium text-primary hover:underline">
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{product.category ?? "אין"}</td>
                    <td className="px-3 py-3">{programStatus}</td>
                    <td className="px-3 py-3">{yesNo(Boolean(product.affiliateUrl.trim()))}</td>
                    <td className="px-3 py-3">{yesNo(contentReady)}</td>
                    <td className="px-3 py-3">{publishedPlatforms.length > 0 ? `${publishedPlatforms.length}/6 (${publishedPlatforms.join(", ")})` : "0/6"}</td>
                    <td className="px-3 py-3">
                      {getNextAction({
                        product,
                        programs: productPrograms,
                        drafts: productDrafts,
                        links: productLinks,
                        records: productPerformance,
                      })}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </Section>

      <Section
        id="programs"
        title="תוכניות שותפים"
        description="סטטוס הרשמה, אישור וקישור מוכן לכל תוכנית."
      >
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b text-right text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">מוצר</th>
              <th className="px-3 py-2">סטטוס תוכנית</th>
              <th className="px-3 py-2">רשת</th>
              <th className="px-3 py-2">הרשמה</th>
              <th className="px-3 py-2">דשבורד</th>
              <th className="px-3 py-2">הערות</th>
              <th className="px-3 py-2">פעולה אנושית הבאה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {programs.length === 0 ? (
              <EmptyRow colSpan={7} text="אין תוכניות שותפים עדיין." />
            ) : (
              programs.map((program) => (
                <tr key={program.id}>
                  <td className="px-3 py-3">{program.productName ?? "לא משויך"}</td>
                  <td className="px-3 py-3">
                    <Badge variant={statusVariant(program.status)}>
                      {PROGRAM_STATUS_LABELS[program.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{program.network ?? "אין"}</td>
                  <td className="px-3 py-3"><ExternalUrl url={program.signupUrl} /></td>
                  <td className="px-3 py-3"><ExternalUrl url={program.dashboardUrl} /></td>
                  <td className="px-3 py-3 text-muted-foreground">{program.notes ? truncate(program.notes, 120) : "אין"}</td>
                  <td className="px-3 py-3">{program.status === "link_ready" ? "להשתמש בקמפיינים" : "לבדוק ולהתקדם ידנית"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Section>

      <Section
        id="published"
        title="מה פורסם"
        description="רק רשומות שמסומנות כ־published במערכת. קישורי קמפיין מוכנים לא נספרים כפרסום."
      >
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b text-right text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">מוצר</th>
              <th className="px-3 py-2">פלטפורמה</th>
              <th className="px-3 py-2">פעולה</th>
              <th className="px-3 py-2">קישור</th>
              <th className="px-3 py-2">תאריך</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {publishedApprovals.length === 0 ? (
              <EmptyRow colSpan={5} text="אין פרסומים שמסומנים כפורסמו." />
            ) : (
              publishedApprovals.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">{item.productName ?? "לא משויך"}</td>
                  <td className="px-3 py-3">{item.platform ?? "אין"}</td>
                  <td className="px-3 py-3">{APPROVAL_ITEM_TYPE_LABELS[item.approvalType]}</td>
                  <td className="px-3 py-3"><ExternalUrl url={item.campaignLinkUrl} /></td>
                  <td className="px-3 py-3">{item.resolvedAt ? formatDateTime(item.resolvedAt) : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Section>

      <Section
        id="where"
        title="סטטוס פרסום — 6 פלטפורמות"
        description="כל מוצר עם קישור שותף פעיל צריך פוסט ב-6 פלטפורמות. פורסם = יש URL אמיתי. מוכן = יש טיוטה מאושרת. צריך אישור = יש טיוטה שממתינה."
      >
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b text-right text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">מוצר</th>
              <th className="px-3 py-2">LinkedIn</th>
              <th className="px-3 py-2">Medium</th>
              <th className="px-3 py-2">Substack</th>
              <th className="px-3 py-2">TikTok</th>
              <th className="px-3 py-2">Quora</th>
              <th className="px-3 py-2">Reddit</th>
              <th className="px-3 py-2">גילוי שותפים</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {products.length === 0 ? (
              <EmptyRow colSpan={8} text="אין מוצרים להצגה." />
            ) : (
              products.map((product) => {
                const productApprovals = approvalsByProduct.get(product.id) ?? []
                const productLinks = linksByProduct.get(product.id) ?? []
                const productDrafts = draftsByProduct.get(product.id) ?? []
                const approvedDraft = productDrafts.find((draft) => draft.status === "approved")

                return (
                  <tr key={product.id}>
                    <td className="px-3 py-3 font-medium">{product.name}</td>
                    {["linkedin", "medium", "substack", "tiktok", "quora", "reddit"].map((platform) => (
                      <td key={platform} className="px-3 py-3">
                        <PlatformStatusCell
                          status={getPlatformStatus(platform, productDrafts, productLinks, productApprovals)}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      {approvedDraft?.qualityChecks.has_disclosure ? "קיים בתוכן המאושר" : "צריך בדיקה"}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </Section>

      <Section
        id="pending"
        title="מה מחכה לאישור"
        description="פריטים שממתינים להחלטה אנושית. אין כאן אישור אוטומטי."
      >
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b text-right text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">מוצר</th>
              <th className="px-3 py-2">פלטפורמה</th>
              <th className="px-3 py-2">פעולה</th>
              <th className="px-3 py-2">סטטוס</th>
              <th className="px-3 py-2">פתיחה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {pendingApprovals.length === 0 ? (
              <EmptyRow colSpan={5} text="אין פריטים שמחכים לאישור." />
            ) : (
              pendingApprovals.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">{item.productName ?? "לא משויך"}</td>
                  <td className="px-3 py-3">{item.platform ?? "אין"}</td>
                  <td className="px-3 py-3">{item.title}</td>
                  <td className="px-3 py-3">
                    <Badge variant="secondary">{APPROVAL_ITEM_STATUS_LABELS[item.status]}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Link href="/dashboard/approvals" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                      לפתוח אישורים
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Section>

      <Section
        id="rejected"
        title="מה נדחה"
        description="טיוטות ופעולות שנדחו במערכת."
      >
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b text-right text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">סוג</th>
              <th className="px-3 py-2">מוצר</th>
              <th className="px-3 py-2">כותרת</th>
              <th className="px-3 py-2">הערות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {rejectedApprovals.length === 0 && rejectedDrafts.length === 0 ? (
              <EmptyRow colSpan={4} text="אין פריטים דחויים." />
            ) : (
              <>
                {rejectedApprovals.map((item) => (
                  <tr key={`approval-${item.id}`}>
                    <td className="px-3 py-3">אישור</td>
                    <td className="px-3 py-3">{item.productName ?? "לא משויך"}</td>
                    <td className="px-3 py-3">{item.title}</td>
                    <td className="px-3 py-3 text-muted-foreground">{item.operatorNotes ?? "אין"}</td>
                  </tr>
                ))}
                {rejectedDrafts.map((draft) => (
                  <tr key={`draft-${draft.id}`}>
                    <td className="px-3 py-3">טיוטה</td>
                    <td className="px-3 py-3">{draft.productName}</td>
                    <td className="px-3 py-3">{draft.title ?? "ללא כותרת"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{draft.approvalNotes ?? "אין"}</td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </Section>

      <Section
        id="performance"
        title="נתונים אמיתיים בלבד"
        description="רק ביצועים שנרשמו ידנית ממקור אמיתי. אין יצירת תנועה או הכנסות מזויפות."
      >
        <table className="w-full min-w-[920px] text-sm">
          <thead className="border-b text-right text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">מוצר</th>
              <th className="px-3 py-2">פלטפורמה</th>
              <th className="px-3 py-2">קליקים</th>
              <th className="px-3 py-2">המרות</th>
              <th className="px-3 py-2">הכנסה</th>
              <th className="px-3 py-2">נבדק לאחרונה</th>
              <th className="px-3 py-2">הערות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {products.length === 0 ? (
              <EmptyRow colSpan={7} text="אין מוצרים למדידה." />
            ) : (
              products.map((product) => {
                const productRecords = performanceByProduct.get(product.id) ?? []
                const latest = latestRecord(productRecords)
                const clicks = productRecords.reduce((sum, record) => sum + record.clicks, 0)
                const conversions = productRecords.reduce((sum, record) => sum + (record.conversions ?? 0), 0)
                const revenue = productRecords.reduce((sum, record) => sum + (record.revenue ?? 0), 0)
                const platforms = Array.from(new Set(productRecords.map((record) => record.channel))).join(", ")

                return (
                  <tr key={product.id}>
                    <td className="px-3 py-3 font-medium">{product.name}</td>
                    <td className="px-3 py-3">{platforms || "אין נתונים"}</td>
                    <td className="px-3 py-3">{clicks}</td>
                    <td className="px-3 py-3">{conversions}</td>
                    <td className="px-3 py-3">{formatMoney(productRecords.length > 0 ? revenue : null)}</td>
                    <td className="px-3 py-3">{latest ? formatDateTime(latest.recordedAt) : "אין"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{latest?.notes ? truncate(latest.notes, 100) : "אין"}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </Section>
    </div>
  )
}
