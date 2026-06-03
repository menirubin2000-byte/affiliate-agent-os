import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  getFinalCopyValidation,
  getOrCreateSystemeIoMediumFinalCopy,
} from "@/lib/content-review-db"
import { cn } from "@/lib/utils"

import {
  approveFinalCopyAction,
  rejectFinalCopyAction,
  requestFinalCopyFixAction,
} from "./actions"

export const dynamic = "force-dynamic"

const checkLabels: Record<string, string> = {
  disclosureAtTop: "גילוי אפיליאייט בראש הפוסט",
  oneCtaOnly: "CTA אחד בלבד",
  affiliateLinkExists: "קישור אפיליאייט קיים",
  noDuplicateUrl: "אין URL כפול",
  noInternalNotes: "אין הערות פנימיות",
  noPersonalExperienceClaim: "אין טענת ניסיון אישי",
  noIncomeOrGuaranteeClaim: "אין טענת הכנסה או הבטחה",
}

export default async function HebrewContentReviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; approved?: string; rejected?: string; fix?: string }>
}) {
  const params = (await searchParams) ?? {}
  let finalCopy = null
  let validation = null
  let loadError: string | null = null

  try {
    finalCopy = await getOrCreateSystemeIoMediumFinalCopy()
    validation = finalCopy ? await getFinalCopyValidation(finalCopy) : null
  } catch (error) {
    loadError = error instanceof Error ? error.message : "לא ניתן לטעון את Content Review Workbench."
  }

  const canApprove =
    Boolean(finalCopy) &&
    validation?.validationStatus === "valid" &&
    finalCopy?.status !== "ready_for_manual_publish"

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        eyebrow="בדיקת קופי סופי"
        title="Content Review Workbench"
        description="מסך אחד לקופי הסופי של Systeme.io Medium. הטקסט נשמר כמועמד יציב, לא נוצר מחדש ברענון, ולא מסמן Published בלי URL אמיתי."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/he/publish-ready" className={cn(buttonVariants({ variant: "outline" }))}>
              מוכן לפרסום
            </Link>
            <Link href="/dashboard/he/campaigns" className={cn(buttonVariants({ variant: "outline" }))}>
              קמפיינים
            </Link>
          </div>
        }
      />

      {loadError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>נדרש תיקון לפני שימוש</CardTitle>
            <CardDescription className="text-destructive">{loadError}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            אם השגיאה היא טבלה חסרה, צריך להריץ את המיגרציה <code>018_final_copies.sql</code> ב-Supabase.
          </CardContent>
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

      {params.approved ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-950">הקופי הסופי אושר לפרסום ידני</CardTitle>
            <CardDescription className="text-green-800">
              זה לא Published. אחרי פרסום ידני ב-Medium צריך להדביק URL אמיתי ולאמת אותו.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {params.rejected ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-950">הקופי נדחה</CardTitle>
            <CardDescription className="text-amber-800">
              המערכת לא תשלח את הגרסה הזו לפרסום ידני. צריך להכין גרסה חדשה לפני המשך.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {params.fix ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-950">נפתחה משימת תיקון</CardTitle>
            <CardDescription className="text-amber-800">
              הקופי לא אושר. נוצרה משימת תיקון כדי להכין גרסה מתוקנת בהמשך.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!loadError && !finalCopy ? (
        <Card>
          <CardHeader>
            <CardTitle>אין מועמד קופי סופי</CardTitle>
            <CardDescription>
              צריך campaign-approved platform adaptation עבור Systeme.io Medium לפני יצירת Workbench.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {finalCopy && validation ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>תצוגת פוסט סופי</CardTitle>
                  <CardDescription>
                    {finalCopy.productName ?? "Systeme.io"} · Medium · גרסה {finalCopy.version}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={validation.validationStatus === "valid" ? "default" : "destructive"}>
                    {validation.validationStatus === "valid" ? "עבר בדיקות" : "חסום"}
                  </Badge>
                  <Badge variant={finalCopy.status === "ready_for_manual_publish" ? "default" : "outline"}>
                    {finalCopy.status === "ready_for_manual_publish" ? "אושר לפרסום ידני" : "ממתין לאישור MENI"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Title</div>
                <h2 dir="ltr" className="mt-1 text-2xl font-semibold">
                  {finalCopy.title}
                </h2>
              </div>

              <Separator />

              {validation.validationStatus === "valid" ? (
                <>
                  <pre dir="ltr" className="max-h-[720px] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-6">
                    {finalCopy.body}
                  </pre>

                </>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  הקופי הסופי חסום. המערכת לא מציגה טקסט גולמי ל-MENI לתיקון ידני. ראה חסימות ובקש תיקון מערכת.
                </div>
              )}
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>בדיקות שעברו</CardTitle>
                <CardDescription>בדיקה דטרמיניסטית לפני אישור לפרסום ידני.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(validation.checks).map(([key, passed]) => (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-lg border p-2 text-sm">
                    <span>{checkLabels[key] ?? key}</span>
                    <Badge variant={passed ? "default" : "destructive"}>{passed ? "עבר" : "חסום"}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>חסימות</CardTitle>
                <CardDescription>קופי לא תקין לא ניתן לאישור.</CardDescription>
              </CardHeader>
              <CardContent>
                {validation.blockingReasons.length ? (
                  <ul className="list-inside list-disc space-y-1 text-sm text-destructive">
                    {validation.blockingReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">אין חסימות.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>גרסה ומקור</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>status: {finalCopy.status}</p>
                <p>version: {finalCopy.version}</p>
                <p>content hash: {finalCopy.contentHash}</p>
                <p>source: {finalCopy.sourceContentId}</p>
                <p>adaptation: {finalCopy.platformAdaptationId}</p>
                {finalCopy.repairTaskId ? <p>repair task: {finalCopy.repairTaskId}</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>פעולות MENI</CardTitle>
                <CardDescription>MENI לא עורך את האנגלית ידנית. רק מאשר או מבקש תיקון.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <form action={approveFinalCopyAction}>
                  <input type="hidden" name="finalCopyId" value={finalCopy.id} />
                  <Button type="submit" disabled={!canApprove} className="w-full">
                    אשר לפרסום ידני
                  </Button>
                </form>
                <form action={rejectFinalCopyAction}>
                  <input type="hidden" name="finalCopyId" value={finalCopy.id} />
                  <Button type="submit" variant="outline" className="w-full">
                    דחה
                  </Button>
                </form>
                <form action={requestFinalCopyFixAction}>
                  <input type="hidden" name="finalCopyId" value={finalCopy.id} />
                  <Button type="submit" variant="outline" className="w-full">
                    דרוש תיקון
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground">
                  אישור כאן לא מפרסם, לא יוצר Browser Job, ולא יוצר Published Record.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
