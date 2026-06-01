import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCampaignWorkflowProducts } from "@/lib/campaign-workflow-db"
import { CAMPAIGN_PLATFORMS } from "@/lib/platform-policy"
import { cn } from "@/lib/utils"
import type { CampaignWorkflowProduct, PlatformAdaptation } from "@/types/campaign-workflow"

import {
  approveCampaignAction,
  createSourceFromApprovedDraftAction,
  syncPlatformAdaptationsAction,
} from "./actions"

export const dynamic = "force-dynamic"

const platformLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  medium: "Medium",
  substack: "Substack",
  tiktok: "TikTok",
  quora: "Quora",
  reddit: "Reddit",
}

function qualityLabel(adaptation: PlatformAdaptation) {
  if (adaptation.autoQualityStatus === "auto_quality_passed") return "עבר בדיקת איכות"
  if (adaptation.autoQualityStatus === "blocked") return "חסום בבדיקת איכות"
  return "ממתין לבדיקה"
}

function policyLabel(adaptation: PlatformAdaptation) {
  if (adaptation.policyCheckStatus === "allowed") return "מדיניות תקינה"
  if (adaptation.policyCheckStatus === "prohibited") return "אסור לפי מדיניות"
  if (adaptation.policyCheckStatus === "unclear") return "מדיניות לא ברורה"
  return "דורש בדיקה ידנית"
}

function campaignStatus(product: CampaignWorkflowProduct) {
  if (!product.hasLinkReadyProgram) return "חסום"
  if (!product.affiliateLink?.trim()) return "חסום"
  if (!product.sourceContent) return "צריך מקור תוכן"
  if (product.approvedCampaign) return "קמפיין אושר"
  if (product.eligiblePlatforms.length > 0) return "מוכן לאישור קמפיין"
  return "צריך טיפול"
}

function campaignReason(product: CampaignWorkflowProduct) {
  if (!product.hasLinkReadyProgram) return "אין תוכנית שותפים במצב link_ready."
  if (!product.affiliateLink?.trim()) return "חסר affiliate link אמיתי."
  if (!product.sourceContent) return "יש צורך ליצור Source Content מטיוטה מאושרת קיימת."
  if (product.approvedCampaign) return "הקמפיין אושר. פרסום עדיין דורש URL אמיתי לפני סימון Published."
  if (product.eligiblePlatforms.length > 0) return "יש פלטפורמות שעברו בדיקות ואפשר לאשר אותן בפעולה אחת."
  return "אין פלטפורמות כשירות כרגע. בדוק חסימות איכות/מדיניות."
}

function badgeVariant(product: CampaignWorkflowProduct) {
  const status = campaignStatus(product)
  if (status === "מוכן לאישור קמפיין" || status === "קמפיין אושר") return "default" as const
  if (status === "חסום") return "destructive" as const
  return "secondary" as const
}

function statusVariant(adaptation: PlatformAdaptation) {
  if (
    adaptation.autoQualityStatus === "auto_quality_passed" &&
    adaptation.policyCheckStatus === "allowed"
  ) {
    return "default" as const
  }
  if (adaptation.policyCheckStatus === "prohibited" || adaptation.autoQualityStatus === "blocked") {
    return "destructive" as const
  }
  return "secondary" as const
}

function missingPlatforms(product: CampaignWorkflowProduct) {
  const generated = new Set(product.adaptations.map((adaptation) => adaptation.platform))
  return CAMPAIGN_PLATFORMS.filter((platform) => !generated.has(platform))
}

function CampaignCard({ product }: { product: CampaignWorkflowProduct }) {
  const readyCount = product.adaptations.filter(
    (adaptation) =>
      adaptation.autoQualityStatus === "auto_quality_passed" &&
      adaptation.policyCheckStatus === "allowed",
  ).length
  const approvedCount = product.adaptations.filter(
    (adaptation) => adaptation.campaignApprovalStatus === "campaign_approved",
  ).length
  const blockedCount = product.adaptations.filter(
    (adaptation) =>
      adaptation.autoQualityStatus === "blocked" ||
      adaptation.policyCheckStatus !== "allowed",
  ).length
  const missing = missingPlatforms(product)

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{product.productName}</CardTitle>
            <CardDescription className="mt-1">
              {campaignReason(product)}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={badgeVariant(product)}>{campaignStatus(product)}</Badge>
            <Badge variant="outline">מוכן: {readyCount}</Badge>
            <Badge variant="outline">מאושר: {approvedCount}</Badge>
            <Badge variant={blockedCount ? "destructive" : "secondary"}>חסום: {blockedCount}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">Affiliate link</div>
            <div className="mt-1 font-medium">{product.affiliateLink ? "קיים" : "חסר"}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">Affiliate program</div>
            <div className="mt-1 font-medium">{product.hasLinkReadyProgram ? "link_ready" : "לא מוכן"}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">Published Records</div>
            <div className="mt-1 font-medium">{product.publishedRecords.length}</div>
          </div>
        </div>

        {product.blockers.length ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            חסימות: {product.blockers.join(", ")}
          </div>
        ) : null}

        {product.sourceContent ? (
          <div className="rounded-lg border bg-muted/10 p-3 text-sm">
            {product.eligiblePlatforms.length ? (
              <span>
                פלטפורמות מוכנות לאישור קמפיין:{" "}
                {product.eligiblePlatforms.map((platform) => platformLabels[platform]).join(", ")}
              </span>
            ) : product.approvedCampaign ? (
              <span>אין פלטפורמות חדשות לאישור. הקמפיין כבר אושר, ופרסום עדיין דורש URL חי מאומת.</span>
            ) : (
              <span>אין פלטפורמות מוכנות לאישור כרגע. ראה חסימות איכות/מדיניות לכל פלטפורמה.</span>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {!product.sourceContent ? (
            <form action={createSourceFromApprovedDraftAction}>
              <input type="hidden" name="productId" value={product.productId} />
              <Button type="submit" variant="outline" disabled={!product.hasLinkReadyProgram}>
                צור Source Content מטיוטה מאושרת
              </Button>
            </form>
          ) : (
            <>
              <form action={syncPlatformAdaptationsAction}>
                <input type="hidden" name="sourceContentId" value={product.sourceContent.id} />
                <Button type="submit" variant="outline">
                  רענן התאמות ובדיקות
                </Button>
              </form>
              <form action={approveCampaignAction}>
                <input type="hidden" name="sourceContentId" value={product.sourceContent.id} />
                <Button type="submit" disabled={product.eligiblePlatforms.length === 0}>
                  אשר קמפיין מוצר - לא מפרסם
                </Button>
              </form>
            </>
          )}
        </div>

        {product.sourceContent ? (
          <div className="rounded-lg border bg-muted/20 p-4">
            <h3 className="font-semibold">Source Content</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {product.sourceContent.title} · keyword: {product.sourceContent.targetKeyword ?? "חסר"}
            </p>
          </div>
        ) : null}

        {missing.length ? (
          <div className="rounded-lg border bg-muted/10 p-3 text-sm text-muted-foreground">
            פלטפורמות שעדיין לא נוצרו: {missing.map((platform) => platformLabels[platform]).join(", ")}
          </div>
        ) : null}

        {product.adaptations.length ? (
          <div className="grid gap-3">
            {product.adaptations.map((adaptation) => (
              <div key={adaptation.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-semibold">{platformLabels[adaptation.platform]}</h3>
                    <p className="text-sm text-muted-foreground">
                      {qualityLabel(adaptation)} · {policyLabel(adaptation)} · מצב קמפיין:{" "}
                      {adaptation.campaignApprovalStatus}
                    </p>
                  </div>
                  <Badge variant={statusVariant(adaptation)}>{adaptation.autoQualityStatus}</Badge>
                </div>
                {adaptation.blockingReason ? (
                  <p className="mt-2 text-sm text-destructive">חסם: {adaptation.blockingReason}</p>
                ) : null}
                {adaptation.policyNotes ? (
                  <p className="mt-2 text-sm text-muted-foreground">{adaptation.policyNotes}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {product.approvedCampaign ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-950">
            קמפיין אושר ב-{new Date(product.approvedCampaign.approvedAt).toLocaleString("he-IL")}. פלטפורמות:{" "}
            {product.approvedCampaign.approvedPlatforms.map((platform) => platformLabels[platform]).join(", ")}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default async function HebrewCampaignsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; approved?: string; synced?: string; source?: string }>
}) {
  const params = (await searchParams) ?? {}
  let products: CampaignWorkflowProduct[] = []
  let loadError: string | null = null

  try {
    products = await getCampaignWorkflowProducts()
  } catch (error) {
    loadError = error instanceof Error ? error.message : "לא ניתן לטעון את מודל הקמפיינים."
  }

  const campaignProducts = products.filter(
    (product) => product.hasLinkReadyProgram && Boolean(product.affiliateLink?.trim()),
  )
  const blockedActiveProducts = products.filter(
    (product) =>
      product.productStatus === "active" &&
      (!product.hasLinkReadyProgram || !product.affiliateLink?.trim()),
  )

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        eyebrow="אישור קמפיין מרוכז"
        title="Campaign Approval Queue"
        description="מני מאשר קמפיין מוצר פעם אחת. המערכת מציגה מה מוכן, מה חסום, ומה חסר. פרסום אמיתי נחשב רק אחרי URL מאומת ב-Published Records."
        actions={
          <Link href="/dashboard/he/browser-control" className={cn(buttonVariants({ variant: "outline" }))}>
            שליטה בדפדפן
          </Link>
        }
      />

      {loadError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>נדרשת מיגרציה לפני שימוש במסך</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            צריך להריץ בלייב את <code>013_browser_control.sql</code> ואת{" "}
            <code>017_campaign_approval_redesign.sql</code>. עד שזה קורה, המסך לא מניח שקיים מודל
            Campaign Approval ולא מסמן שום דבר כפורסם אמיתי.
          </CardContent>
        </Card>
      ) : null}

      {params.error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>שגיאה</CardTitle>
            <CardDescription>{params.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {params.approved ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-950">הקמפיין אושר</CardTitle>
            <CardDescription className="text-green-800">
              רק פלטפורמות שעברו איכות ומדיניות סומנו כמאושרות לקמפיין. פרסום עדיין דורש URL אמיתי.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!loadError ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{campaignProducts.length}</CardTitle>
              <CardDescription>קמפיינים שדורשים תשומת לב</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{blockedActiveProducts.length}</CardTitle>
              <CardDescription>מוצרים פעילים חסומים</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                {products.reduce((count, product) => count + product.publishedRecords.length, 0)}
              </CardTitle>
              <CardDescription>Published Records מאומתים</CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      {!loadError && !products.length ? (
        <Card>
          <CardHeader>
            <CardTitle>אין קמפיינים להצגה</CardTitle>
            <CardDescription>
              צריך מוצר עם תוכנית link_ready ו-affiliate link אמיתי כדי להתחיל Campaign Approval.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!loadError && campaignProducts.length ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">קמפיינים</h2>
            <p className="text-sm text-muted-foreground">
              אלה המוצרים שיש להם affiliate program במצב link_ready ולכן הם שייכים לתור אישור קמפיין.
            </p>
          </div>
          {campaignProducts.map((product) => (
            <CampaignCard key={product.productId} product={product} />
          ))}
        </section>
      ) : null}

      {!loadError && blockedActiveProducts.length ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">פעילים אבל חסומים לפרסום אפיליאייט</h2>
            <p className="text-sm text-muted-foreground">
              מוצרים פעילים שלא נכנסים לקמפיין עד שיש תוכנית שותפים link_ready וקישור אפיליאייט אמיתי.
            </p>
          </div>
          {blockedActiveProducts.map((product) => (
            <CampaignCard key={product.productId} product={product} />
          ))}
        </section>
      ) : null}
    </div>
  )
}
