import Link from "next/link"
import type { ReactNode } from "react"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProductApprovalWorkflowSummary } from "@/lib/draft-approval-workflow"
import { MENI_CONFIRM_HEBREW_TOKEN, MENI_CONFIRM_TOKEN } from "@/lib/draft-approval-workflow"
import { getDraftApprovalWorkflowProducts } from "@/lib/draft-approval-workflow-db"
import { countCharsForPlatform, getPlatformCharLimit } from "@/lib/platform-char-limits"
import { getPlatformRoutingOverview } from "@/lib/platform-routing-db"
import { classifyPublicReview, type PublicReviewKind } from "@/lib/public-review-catalog"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import type { CampaignPlatform } from "@/types/campaign-workflow"
import { cn, truncate } from "@/lib/utils"

import {
  addAllMissingPlatformPostsForProductAction,
  approveSelectedPostsAction,
  createMissingDraftsForProductAction,
  updateSelectedProductPostsBodyAction,
} from "./actions"
import { WorkTabs, type WorkProduct } from "./work-tabs"

export const dynamic = "force-dynamic"

type ApprovalSearchParams = {
  approved?: string
  error?: string
  created?: string
  skipped?: string
  approvedCount?: string
  updatedCount?: string
  platformsCreated?: string
  languagesCreated?: string
  p?: string
}

type ApprovalPostRow = {
  id: string
  product_id: string
  platform: CampaignPlatform
  language: string | null
  status: string
  body: string | null
  updated_at: string | null
  products: { name: string; category: string | null } | { name: string; category: string | null }[] | null
}

type ApprovalProductCard = ProductApprovalWorkflowSummary & {
  category: string | null
  kind: PublicReviewKind
  posts: ApprovalPostRow[]
}

const PLATFORM_OPTIONS: Array<{ key: CampaignPlatform; label: string }> = [
  { key: "facebook_page", label: "Facebook" },
  { key: "instagram_professional", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "medium", label: "Medium" },
  { key: "substack", label: "Substack" },
  { key: "pinterest", label: "Pinterest" },
  { key: "x_twitter", label: "X / Twitter" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "quora", label: "Quora" },
  { key: "reddit", label: "Reddit" },
  { key: "threads", label: "Threads" },
]

const POST_STATUSES = [
  "draft_internal",
  "validated",
  "needs_system_fix",
  "operator_rejected",
  "ready_for_operator_approval",
  "operator_approved",
  "ready_for_manual_publish",
  "published_verified",
]

const STATUS_PRIORITY: Record<string, number> = {
  ready_for_operator_approval: 0,
  needs_system_fix: 1,
  operator_rejected: 2,
  operator_approved: 3,
  ready_for_manual_publish: 4,
  validated: 5,
  draft_internal: 6,
  published_verified: 7,
}

export async function ApprovalCategoryPage({
  kind,
  searchParams,
}: {
  kind: PublicReviewKind
  searchParams: ApprovalSearchParams
}) {
  const categoryLabel = kind === "software" ? "תוכנות" : "מוצרים"
  const otherKind = kind === "software" ? "product" : "software"
  const otherCategoryLabel = otherKind === "software" ? "תוכנות" : "מוצרים"
  const basePath = `/dashboard/he/approve/${kind === "software" ? "software" : "products"}`

  if (!isSupabaseConfigured()) {
    return (
      <div dir="rtl" className="space-y-6 text-right">
        <PageHeader
          eyebrow="אישור טיוטות"
          title={`אישור ${categoryLabel}`}
          description="Supabase לא מוגדר. אי אפשר להציג את דף האישור."
          actions={
            <Link href="/dashboard/he/approve" className={cn(buttonVariants({ variant: "outline" }))}>
              חזרה לבחירת קטגוריה
            </Link>
          }
        />
      </div>
    )
  }

  const [workflowRows, overview, finalCopiesResult] = await Promise.all([
    getDraftApprovalWorkflowProducts(),
    getPlatformRoutingOverview(),
    getServiceRoleSupabase()
      .from("final_copies")
      .select("id, product_id, platform, language, status, body, updated_at, products(name, category)")
      .in("status", POST_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(5000),
  ])

  if (finalCopiesResult.error) {
    throw new Error(finalCopiesResult.error.message)
  }

  const productMeta = new Map(
    overview.products.map((item) => {
      const reviewKind = classifyPublicReview({
        name: item.product.name,
        category: item.product.category,
      })
      return [item.product.id, { category: item.product.category, kind: reviewKind }] as const
    }),
  )

  const postsByProduct = new Map<string, ApprovalPostRow[]>()
  for (const post of (finalCopiesResult.data ?? []) as ApprovalPostRow[]) {
    const existing = postsByProduct.get(post.product_id) ?? []
    existing.push(post)
    postsByProduct.set(post.product_id, existing)
  }

  const products = workflowRows
    .map((row): ApprovalProductCard => {
      const meta = productMeta.get(row.productId)
      const inferredKind = classifyPublicReview({ name: row.productName, category: meta?.category ?? null })
      return {
        ...row,
        category: meta?.category ?? null,
        kind: meta?.kind ?? inferredKind,
        posts: postsByProduct.get(row.productId) ?? [],
      }
    })
    .filter((row) => row.kind === kind)

  const totals = products.reduce(
    (acc, product) => {
      acc.products += 1
      acc.ready += product.pendingApprovalCount
      acc.approved += product.approvedCount
      acc.missing += getMissingPlatformCount(product.posts)
      return acc
    },
    { products: 0, ready: 0, approved: 0, missing: 0 },
  )

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <PageHeader
        eyebrow="אישור טיוטות"
        title={`אישור ${categoryLabel}`}
        description={`לחיצה על מוצר פותחת את דף המוצר עם כל 12 הפלטפורמות לעריכה ואישור.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/he/approve" className={cn(buttonVariants({ variant: "outline" }))}>
              בחירת קטגוריה
            </Link>
            <Link href={`/dashboard/he/approve/${otherKind === "software" ? "software" : "products"}`} className={cn(buttonVariants({ variant: "outline" }))}>
              מעבר ל{otherCategoryLabel}
            </Link>
          </div>
        }
      />

      <FeedbackBanner params={searchParams} />
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard title={`${categoryLabel} פעילים`} value={totals.products} />
        <SummaryCard title="מוכנים לאישור" value={totals.ready} />
        <SummaryCard title="מאושרים" value={totals.approved} />
        <SummaryCard title="פלטפורמות חסרות" value={totals.missing} />
      </section>

      {products.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>אין פריטים להצגה</CardTitle>
            <CardDescription>לא נמצאו {categoryLabel} פעילים במערכת.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <WorkTabs
          basePath={basePath}
          initialProductId={searchParams.p}
          products={products.map(
            (product): WorkProduct => ({
              productId: product.productId,
              productName: product.productName,
              readyCount: product.pendingApprovalCount,
              posts: product.posts.map((post) => ({
                id: post.id,
                platform: post.platform,
                language: post.language,
                status: post.status,
                body: post.body,
              })),
            }),
          )}
        />
      )}
    </div>
  )
}

function ProductApprovalCardView({
  product,
  basePath,
  categoryLabel,
}: {
  product: ApprovalProductCard
  basePath: string
  categoryLabel: string
}) {
  const defaultText = getDefaultEditText(product.posts)
  const hasReadyPosts = product.posts.some((post) => post.status === "ready_for_operator_approval")
  const hasEditablePosts = product.posts.some((post) => post.status !== "published_verified")

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">{product.productName}</CardTitle>
              <Badge variant="outline">{categoryLabel}</Badge>
              {product.category ? <Badge variant="secondary">{product.category}</Badge> : null}
              <Badge variant={product.hasAffiliateUrl ? "default" : "destructive"}>
                affiliate {product.hasAffiliateUrl ? "ready" : "missing"}
              </Badge>
            </div>
            <CardDescription>{product.nextAction}</CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            {product.previewFinalCopyId ? (
              <Link
                href={`/dashboard/he/approve/preview/${product.previewFinalCopyId}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                פתח טיוטה אחרונה
              </Link>
            ) : null}
            <Link
              href={`/dashboard/products/${product.productId}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              פתח סביבת מוצר
            </Link>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-7">
          <MetricCell label="טיוטות" value={product.finalCopiesCount} />
          <MetricCell label="ממתין לאישור" value={product.pendingApprovalCount} />
          <MetricCell label="מאושר" value={product.approvedCount} />
          <MetricCell label="חסום/נדחה" value={product.blockedCount} />
          <MetricCell label="חסר עברית" value={product.missingHebrewContent} />
          <MetricCell label="חסר אנגלית" value={product.missingEnglishContent} />
          <MetricCell label="פלטפורמות חסרות" value={getMissingPlatformCount(product.posts)} />
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-3">
          <form action={createMissingDraftsForProductAction} className="flex">
            <input type="hidden" name="productId" value={product.productId} />
            <input type="hidden" name="redirectTo" value={basePath} />
            <Button type="submit" size="sm" disabled={product.finalCopiesCount > 0 && product.missingEnglishContent === 0}>
              צור טיוטות חסרות
            </Button>
          </form>

          <form action={addAllMissingPlatformPostsForProductAction} className="flex">
            <input type="hidden" name="productId" value={product.productId} />
            <input type="hidden" name="redirectTo" value={basePath} />
            <Button type="submit" size="sm" variant="secondary">
              השלם את כל מה שחסר
            </Button>
          </form>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form className="space-y-4">
          <input type="hidden" name="productId" value={product.productId} />
          <input type="hidden" name="redirectTo" value={basePath} />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {PLATFORM_OPTIONS.map((platform) => {
              const platformPosts = product.posts.filter((post) => post.platform === platform.key)
              const visiblePost = pickVisiblePost(platformPosts)
              return (
                <PlatformDraftCard
                  key={platform.key}
                  platform={platform}
                  visiblePost={visiblePost}
                  allPlatformPosts={platformPosts}
                />
              )
            })}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold">טקסט לפלטפורמות המסומנות</label>
            <textarea
              name="body"
              defaultValue={defaultText}
              dir="auto"
              className="min-h-[180px] w-full rounded-lg border bg-background p-4 text-sm leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              סמן פלטפורמות שיש להן טיוטה, שנה כאן את הטקסט, ואז שמור למסומנות בלבד או אשר את המסומנות.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-3">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              אישור מני
              <input
                name="confirmation"
                placeholder={`${MENI_CONFIRM_HEBREW_TOKEN} / ${MENI_CONFIRM_TOKEN}`}
                className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
              />
            </label>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              formAction={updateSelectedProductPostsBodyAction}
              disabled={!hasEditablePosts}
            >
              שמור למסומנות
            </Button>
            <Button
              type="submit"
              size="sm"
              formAction={approveSelectedPostsAction}
              disabled={!hasReadyPosts}
            >
              אשר מסומנות
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function PlatformDraftCard({
  platform,
  visiblePost,
  allPlatformPosts,
}: {
  platform: { key: CampaignPlatform; label: string }
  visiblePost: ApprovalPostRow | null
  allPlatformPosts: ApprovalPostRow[]
}) {
  const charLimit = getPlatformCharLimit(platform.key)
  const charCount = visiblePost ? countCharsForPlatform(platform.key, visiblePost.body ?? "") : 0
  const selectable = Boolean(visiblePost && visiblePost.status !== "published_verified")
  const readyForApproval = visiblePost?.status === "ready_for_operator_approval"
  const hasHebrew = allPlatformPosts.some((post) => normalizeLanguage(post.language) === "he")
  const hasEnglish = allPlatformPosts.some((post) => normalizeLanguage(post.language) === "en")

  return (
    <div className={cn("rounded-xl border p-4", statusCardClassName(visiblePost?.status ?? "missing"))}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{platform.label}</h3>
            <Badge variant={readyForApproval ? "default" : "outline"}>{statusLabel(visiblePost?.status ?? "missing")}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{languageCoverageLabel(hasHebrew, hasEnglish)}</p>
        </div>
        {selectable ? (
          <input
            type="checkbox"
            name="finalCopyIds"
            value={visiblePost?.id}
            className="mt-1 h-4 w-4 rounded border border-border"
          />
        ) : (
          <div className="mt-1 h-4 w-4 rounded border border-dashed border-muted-foreground/40" />
        )}
      </div>

      {visiblePost ? (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{languageLabel(visiblePost.language)}</span>
            <span>·</span>
            <span>{charLimitLabel(charLimit, charCount)}</span>
          </div>
          <p className="min-h-[88px] whitespace-pre-wrap rounded-lg bg-background/70 p-3 text-sm leading-relaxed">
            {truncate((visiblePost.body ?? "").trim() || "אין טקסט בטיוטה הזו.", 220)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/dashboard/he/approve/preview/${visiblePost.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
            >
              פתח עריכה מלאה
            </Link>
          </div>
        </>
      ) : (
        <div className="space-y-2 rounded-lg border border-dashed bg-background/60 p-3 text-sm text-muted-foreground">
          <p>אין טיוטה כרגע לפלטפורמה הזו.</p>
          <p>{charLimitHint(charLimit)}</p>
        </div>
      )}
    </div>
  )
}

function FeedbackBanner({ params }: { params: ApprovalSearchParams }) {
  if (params.error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle>שגיאה</CardTitle>
          <CardDescription className="text-destructive">{params.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (params.approved === "selected_posts_updated") {
    return (
      <SuccessBanner>
        עודכנו {params.updatedCount ?? 0} פלטפורמות מסומנות{Number(params.skipped ?? 0) > 0 ? `, ודולגו ${params.skipped} שלא ניתנות לעריכה.` : "."}
      </SuccessBanner>
    )
  }

  if (params.approved === "selected_posts_approved") {
    return (
      <SuccessBanner>
        אושרו {params.approvedCount ?? 0} פלטפורמות מסומנות{Number(params.skipped ?? 0) > 0 ? `, ודולגו ${params.skipped} שלא היו מוכנות לאישור.` : "."}
      </SuccessBanner>
    )
  }

  if (params.approved === "selected_platforms_added") {
    return (
      <SuccessBanner>
        נוספו {params.created ?? 0} פלטפורמות חדשות{Number(params.skipped ?? 0) > 0 ? `, ודולגו ${params.skipped} שכבר היו קיימות.` : "."}
      </SuccessBanner>
    )
  }

  if (params.approved === "product_drafts_created") {
    return <SuccessBanner>נוצרו טיוטות חסרות למוצר.</SuccessBanner>
  }

  if (params.approved === "product_languages_created") {
    return <SuccessBanner>נוצרו גרסאות שפה חסרות למוצר.</SuccessBanner>
  }

  if (params.approved === "product_missing_completed") {
    return (
      <SuccessBanner>
        הושלמו {params.created ?? 0} פריטים חסרים למוצר: {params.platformsCreated ?? 0} פלטפורמות/טיוטות באנגלית
        {" "}ו-{params.languagesCreated ?? 0} גרסאות שפה חסרות
        {Number(params.skipped ?? 0) > 0 ? `, ודולגו ${params.skipped} פריטים שלא היה אפשר להשלים אוטומטית.` : "."}
      </SuccessBanner>
    )
  }

  if (params.approved === "product_missing_already_complete") {
    return <SuccessBanner>לא נמצא חוסר נוסף למוצר. כל הפלטפורמות והשפות כבר קיימות.</SuccessBanner>
  }

  return null
}

function SuccessBanner({ children }: { children: ReactNode }) {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="text-green-950">בוצע בהצלחה</CardTitle>
        <CardDescription className="text-green-800">{children}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background/70 p-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  )
}

function normalizeLanguage(language: string | null | undefined) {
  return language === "he" ? "he" : "en"
}

function languageLabel(language: string | null | undefined) {
  return normalizeLanguage(language) === "he" ? "עברית" : "English"
}

function languageCoverageLabel(hasHebrew: boolean, hasEnglish: boolean) {
  if (hasHebrew && hasEnglish) return "קיים: עברית + EN"
  if (hasHebrew) return "קיים: עברית"
  if (hasEnglish) return "קיים: EN"
  return "אין טיוטה"
}

function charLimitLabel(limit: number | null, count: number) {
  if (limit === null) return "ללא הגבלה"
  return `${count}/${limit} תווים`
}

function charLimitHint(limit: number | null) {
  if (limit === null) return "אין מגבלת תווים קשיחה לפלטפורמה הזו."
  return `מותר עד ${limit} תווים בפוסט הזה.`
}

function getMissingPlatformCount(posts: ApprovalPostRow[]) {
  const existing = new Set(posts.map((post) => post.platform))
  return PLATFORM_OPTIONS.filter((platform) => !existing.has(platform.key)).length
}

function getDefaultEditText(posts: ApprovalPostRow[]) {
  const visible = pickVisiblePost(posts)
  return visible?.body ?? ""
}

function pickVisiblePost(posts: ApprovalPostRow[]) {
  const sorted = [...posts].sort((a, b) => {
    const languageDelta = Number(normalizeLanguage(a.language) !== "he") - Number(normalizeLanguage(b.language) !== "he")
    if (languageDelta !== 0) return languageDelta

    const statusDelta = (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99)
    if (statusDelta !== 0) return statusDelta

    const aDate = a.updated_at ? Date.parse(a.updated_at) : 0
    const bDate = b.updated_at ? Date.parse(b.updated_at) : 0
    return bDate - aDate
  })

  return sorted[0] ?? null
}

function statusLabel(status: string) {
  switch (status) {
    case "ready_for_operator_approval":
      return "מוכן לאישור"
    case "operator_approved":
      return "מאושר"
    case "ready_for_manual_publish":
      return "מוכן לפרסום ידני"
    case "published_verified":
      return "פורסם"
    case "needs_system_fix":
      return "צריך תיקון"
    case "operator_rejected":
      return "נדחה"
    case "validated":
      return "מאומת"
    case "draft_internal":
      return "טיוטה"
    default:
      return "אין טיוטה"
  }
}

function statusCardClassName(status: string) {
  switch (status) {
    case "ready_for_operator_approval":
      return "border-blue-300 bg-blue-50/70"
    case "operator_approved":
    case "ready_for_manual_publish":
      return "border-emerald-300 bg-emerald-50/70"
    case "published_verified":
      return "border-slate-300 bg-slate-50/70"
    case "needs_system_fix":
    case "operator_rejected":
      return "border-amber-300 bg-amber-50/70"
    default:
      return "border-border bg-card"
  }
}


