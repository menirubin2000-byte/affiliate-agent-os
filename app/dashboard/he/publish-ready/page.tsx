import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { CopyPublishContent } from "@/components/browser-control/copy-publish-content"
import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { listCampaignManualPublishItems } from "@/lib/campaign-workflow-db"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

import { markFinalCopyPublishedUrlAction } from "./actions"

export const dynamic = "force-dynamic"

const platformLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  medium: "Medium",
  substack: "Substack",
  tiktok: "TikTok",
  quora: "Quora",
  reddit: "Reddit",
}

const platformPublishUrls: Record<string, string> = {
  linkedin: "https://www.linkedin.com/feed/",
  medium: "https://medium.com/new-story",
  substack: "https://substack.com/home",
}

const platformUrlPlaceholders: Record<string, string> = {
  linkedin: "https://www.linkedin.com/feed/update/...",
  medium: "https://medium.com/@Rubin-Q.S/...",
  substack: "https://menirubin.substack.com/p/...",
}

export default async function HebrewPublishReadyPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; published?: string }>
}) {
  const params = (await searchParams) ?? {}
  const publishItems = isSupabaseConfigured() ? await listCampaignManualPublishItems() : []

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        eyebrow="פרסום מבוקר"
        title="חבילות מוכנות לפרסום"
        description="המערכת מכינה final copy, בודקת אותו, מכניסה קישור וגילוי, ומציגה רק חבילה מוכנה או חסימה. אין כאן תיקון אנגלית, אין טיוטות גולמיות, ואין Published בלי URL אמיתי."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/he/campaigns" className={cn(buttonVariants())}>
              אישור קמפיינים
            </Link>
            <Link href="/dashboard/he/content-review" className={cn(buttonVariants({ variant: "outline" }))}>
              בדיקת קופי סופי
            </Link>
          </div>
        }
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>חלוקת עבודה נכונה</CardTitle>
          <CardDescription>
            המערכת מסדרת כותרת, גוף, CTA, disclosure וקישורים. MENI לא מסדר פוסטים. אם פרסום ידני נדרש בגלל פלטפורמה, החבילה כבר מוכנה במלואה, והמערכת תשמור Published Record רק אחרי URL חי ומאומת.
          </CardDescription>
        </CardHeader>
      </Card>

      {params.error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>שגיאה</CardTitle>
            <CardDescription className="text-destructive">{params.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {params.published ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-950">URL אמיתי נשמר</CardTitle>
            <CardDescription className="text-green-800">
              נוצר Published Record רק אחרי שהמערכת קיבלה URL שמתאים לפלטפורמה.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!publishItems.length ? (
        <Card>
          <CardHeader>
            <CardTitle>אין כרגע חבילות מוכנות לפרסום</CardTitle>
            <CardDescription>
              אם מוצר חסום, הוא צריך להופיע במסך הקמפיינים עם סיבה ברורה. אם יש final copy תקין ומאושר, הוא יופיע כאן כחבילת פרסום אחת.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {publishItems.length ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">מוכן לפרסום ידני</h2>
            <p className="text-sm text-muted-foreground">
              כל פריט כאן הוא חבילת פרסום מלאה. אין אישור חוזר, אין עריכה ידנית, ואין סימון פורסם בלי URL אמיתי.
            </p>
          </div>

          {publishItems.map((item) => (
            <Card key={item.finalCopyId ?? item.platformAdaptationId} className="border-primary/30">
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle>
                      {item.productName} · {platformLabels[item.platform] ?? item.platform}
                    </CardTitle>
                    <CardDescription>
                      final copy v{item.finalCopyVersion ?? 1} · אושר לפרסום ידני · עדיין לא Published
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">final copy תקין</Badge>
                    <Badge variant="outline">campaign approved</Badge>
                    <Badge variant="outline">URL חסר</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="text-muted-foreground">כותרת</div>
                    <div className="mt-1 font-medium" dir="ltr">{item.title}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="text-muted-foreground">מקור</div>
                    <div className="mt-1 font-medium">source + adaptation קיימים</div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="text-muted-foreground">סטטוס</div>
                    <div className="mt-1 font-medium">מוכן, לא פורסם</div>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <div className="font-medium">מה המערכת כבר עשתה</div>
                  <div className="mt-1 text-muted-foreground">
                    ניקתה את הטקסט, שמרה גרסה יציבה, בדקה disclosure/CTA/link, ושמרה traceability ל-source content ול-platform adaptation.
                  </div>
                </div>

                {item.policyNotes ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    בדיקת מדיניות: {item.policyNotes}
                  </div>
                ) : null}

                <details className="rounded-lg border bg-muted/10 p-3">
                  <summary className="cursor-pointer text-sm font-medium">הצג חבילת פרסום מוכנה</summary>
                  <pre dir="ltr" className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border bg-background p-3 text-sm">
                    {[item.title, item.body, item.campaignLinkUrl].filter(Boolean).join("\n\n")}
                  </pre>
                </details>

                <div className="flex flex-wrap gap-2">
                  <CopyPublishContent title={item.title} content={item.body} link={item.campaignLinkUrl} />
                  {platformPublishUrls[item.platform] ? (
                    <a
                      href={platformPublishUrls[item.platform]}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      פתח פלטפורמה
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : null}
                  {item.campaignLinkUrl ? (
                    <a
                      href={item.campaignLinkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      בדוק קישור קמפיין
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : null}
                </div>

                <div className="rounded-lg border bg-muted/10 p-3 text-sm">
                  Published Record לא נוצר כאן מראש. אחרי שקיים URL חי מהפלטפורמה, המערכת מאמתת אותו ושומרת אותו.
                </div>

                <form action={markFinalCopyPublishedUrlAction} className="flex flex-col gap-2 md:flex-row md:items-end">
                  <input type="hidden" name="finalCopyId" value={item.finalCopyId ?? ""} />
                  <label className="flex-1 text-sm">
                    <span className="mb-1 block text-muted-foreground">URL חי מהפלטפורמה</span>
                    <Input
                      name="postUrl"
                      placeholder={platformUrlPlaceholders[item.platform] ?? "https://..."}
                    />
                  </label>
                  <Button type="submit" variant="outline">
                    שמור URL ואמת פרסום
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  )
}
