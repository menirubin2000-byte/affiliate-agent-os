import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listDrafts, listProducts } from "@/lib/db"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn, formatDateTime, truncate } from "@/lib/utils"
import type { Draft } from "@/types/draft"
import type { Product } from "@/types/product"

import { approveDraftAction, rejectDraftAction } from "./actions"

export const dynamic = "force-dynamic"

const PLATFORM_LABEL: Record<string, string> = {
  review: "Review (Medium / Substack)",
  comparison: "Comparison",
  buying_guide: "Buying Guide",
  social_post: "LinkedIn / Social",
  tiktok_script: "TikTok",
  quora_answer: "Quora",
  reddit_post: "Reddit",
}

export default async function HebrewApprovePage(props: {
  searchParams: Promise<{ approved?: string; rejected?: string; error?: string }>
}) {
  const params = (await props.searchParams) ?? {}

  if (!isSupabaseConfigured()) {
    return (
      <div dir="rtl" className="space-y-6">
        <PageHeader eyebrow="אישור תוכן" title="ממתין לאישור" description="Supabase לא מוגדר." />
      </div>
    )
  }

  let drafts: Draft[] = []
  let products: Product[] = []
  let pageError: string | null = null

  try {
    ;[drafts, products] = await Promise.all([
      listDrafts({ status: "draft" }),
      listProducts(),
    ])
  } catch (error) {
    pageError = error instanceof Error ? error.message : "טעינה נכשלה."
  }

  const productMap = new Map(products.map((p) => [p.id, p]))

  // Group drafts by product, only show products with real affiliate links first
  // ONLY show products with REAL active affiliate links
  const REAL_AFFILIATE_DOMAINS = ["systeme.io", "try.elevenlabs.io"]

  const activeProductIds = new Set(
    products
      .filter((p) => REAL_AFFILIATE_DOMAINS.some((d) => p.affiliateUrl.includes(d)))
      .map((p) => p.id),
  )

  const relevantDrafts = drafts.filter((d) => activeProductIds.has(d.productId))

  const grouped = new Map<string, { product: Product | null; drafts: Draft[] }>()
  for (const draft of relevantDrafts) {
    const existing = grouped.get(draft.productId)
    if (existing) {
      existing.drafts.push(draft)
    } else {
      grouped.set(draft.productId, {
        product: productMap.get(draft.productId) ?? null,
        drafts: [draft],
      })
    }
  }

  const sortedGroups = [...grouped.values()]
  const totalPending = relevantDrafts.length

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        eyebrow="אישור תוכן"
        title={`${totalPending} טיוטות ממתינות לאישור`}
        description="כל טיוטה כאן בסטטוס draft. אשר כדי להתקדם לפרסום, או דחה אם צריך תיקון. אין פרסום אוטומטי."
        actions={
          <Link href="/dashboard/he" className={cn(buttonVariants({ variant: "outline" }))}>
            חזרה לדשבורד
          </Link>
        }
      />

      {params.approved ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-950">טיוטה אושרה</CardTitle>
            <CardDescription className="text-green-800">הטיוטה עברה לסטטוס approved. ניתן להתקדם לפרסום.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {params.rejected ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-950">טיוטה נדחתה</CardTitle>
            <CardDescription className="text-amber-800">הטיוטה סומנה rejected. ניתן לערוך ולהגיש מחדש.</CardDescription>
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

      {totalPending === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>אין טיוטות ממתינות</CardTitle>
            <CardDescription>כל הטיוטות אושרו או נדחו. חזור לדשבורד.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {sortedGroups.map((group) => {
        const hasRealLink = group.product?.affiliateUrl?.startsWith("http") ?? false

        return (
          <Card key={group.product?.id ?? "unknown"} className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{group.product?.name ?? "מוצר לא ידוע"}</CardTitle>
                  <CardDescription>
                    {group.drafts.length} טיוטות ממתינות · {hasRealLink ? "יש קישור שותף" : "אין קישור שותף פעיל"}
                  </CardDescription>
                </div>
                {hasRealLink ? (
                  <Badge variant="default">קישור פעיל</Badge>
                ) : (
                  <Badge variant="outline">אין קישור</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.drafts.map((draft) => (
                <div key={draft.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        {draft.title ?? `${draft.productName} ${draft.templateType.replace("_", " ")}`}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        פלטפורמה: {PLATFORM_LABEL[draft.templateType] ?? draft.templateType} · {formatDateTime(draft.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">draft</Badge>
                      <Badge variant="outline">{draft.templateType.replace("_", " ")}</Badge>
                    </div>
                  </div>

                  {/* Quality checks summary */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant={draft.qualityChecks.has_disclosure ? "default" : "destructive"}>
                      {draft.qualityChecks.has_disclosure ? "✓ disclosure" : "✗ disclosure"}
                    </Badge>
                    <Badge variant={draft.qualityChecks.has_clear_cta ? "default" : "destructive"}>
                      {draft.qualityChecks.has_clear_cta ? "✓ CTA" : "✗ CTA"}
                    </Badge>
                    <Badge variant={draft.qualityChecks.avoids_fake_claims ? "default" : "destructive"}>
                      {draft.qualityChecks.avoids_fake_claims ? "✓ no fake claims" : "✗ fake claims"}
                    </Badge>
                  </div>

                  {/* Draft body preview */}
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
                    {truncate(draft.body, 600)}
                  </pre>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 border-t pt-3">
                    <form action={approveDraftAction}>
                      <input type="hidden" name="draftId" value={draft.id} />
                      <Button type="submit" variant="default" size="sm">
                        ✓ אשר לפרסום
                      </Button>
                    </form>
                    <form action={rejectDraftAction}>
                      <input type="hidden" name="draftId" value={draft.id} />
                      <Button type="submit" variant="outline" size="sm">
                        ✗ דחה
                      </Button>
                    </form>
                    <Link
                      href={`/dashboard/drafts/${draft.id}/edit`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      ערוך
                    </Link>
                    <Link
                      href={`/dashboard/drafts/${draft.id}/review`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      צפה בפירוט
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
