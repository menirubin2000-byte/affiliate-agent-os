import Link from "next/link"
import { ExternalLink, Send } from "lucide-react"

import { CopyPublishContent } from "@/components/browser-control/copy-publish-content"
import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getPostApprovalState, listBrowserJobs, listPublishApprovalItems } from "@/lib/browser-control-db"
import { listCampaignManualPublishItems } from "@/lib/campaign-workflow-db"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { ApprovalItem } from "@/types/approval-item"

import {
  approvePublishItemAction,
  markFinalCopyPublishedUrlAction,
  markPublishedUrlAction,
  queueBrowserPublishJobAction,
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

function statusVariant(status: ApprovalItem["status"]) {
  if (status === "approved" || status === "published") return "default" as const
  if (status === "rejected" || status === "needs_changes") return "destructive" as const
  return "secondary" as const
}

export default async function HebrewPublishReadyPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; published?: string; approved?: string }>
}) {
  const params = (await searchParams) ?? {}
  const [items, jobs, campaignPublishItems] = isSupabaseConfigured()
    ? await Promise.all([listPublishApprovalItems(), listBrowserJobs(80), listCampaignManualPublishItems()])
    : [[], [], []]

  const jobsByApproval = new Map(jobs.map((job) => [job.approvalItemId, job]))

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        eyebrow="פרסום מבוקר"
        title="מוכן לפרסום"
        description="המסך החדש מתחיל מאישור קמפיין מרוכז. פרסום מסומן Published רק אחרי שיש URL אמיתי מהפלטפורמה."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/he/campaigns" className={cn(buttonVariants())}>
              אישור קמפיינים
            </Link>
            <Link href="/dashboard/he/browser-control" className={cn(buttonVariants({ variant: "outline" }))}>
              שליטה בדפדפן
            </Link>
          </div>
        }
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>הכלל החדש</CardTitle>
          <CardDescription>
            מוצר עם affiliate link אמיתי ותוכן שעבר בדיקות נכנס לאישור קמפיין אחד. לא מאשרים אותו פוסט שוב, ולא מפרסמים בלי URL אמיתי.
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

      {params.approved ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-950">הפוסט אושר</CardTitle>
            <CardDescription className="text-green-800">
              אותו פוסט לא יבקש אישור חוזר כל עוד התוכן והקישור לא השתנו.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {params.published ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-950">URL נשמר</CardTitle>
            <CardDescription className="text-green-800">
              הפריט סומן published רק אחרי שנשמר קישור פוסט אמיתי.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {campaignPublishItems.length ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">מוכן לפרסום ידני מאישור קמפיין</h2>
            <p className="text-sm text-muted-foreground">
              אלה פריטים שעברו אישור קמפיין של MENI. הם לא Published, לא נוצר להם URL, ולא נוצר Browser Job.
            </p>
          </div>

          {campaignPublishItems.map((item) => (
            <Card key={item.platformAdaptationId} className="border-primary/30">
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle>{item.productName} · {platformLabels[item.platform] ?? item.platform}</CardTitle>
                    <CardDescription>
                      מוכן לפרסום ידני · אושר על ידי MENI ב-{new Date(item.approvedAt).toLocaleString("he-IL")}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">campaign approved</Badge>
                    <Badge variant={item.publishedRecordUrl ? "default" : "outline"}>
                      {item.publishedRecordUrl ? "URL מאומת קיים" : "לא פורסם"}
                    </Badge>
                    {item.disclosurePresent ? <Badge variant="outline">Disclosure קיים</Badge> : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <div className="font-medium">Traceability</div>
                  <div className="mt-1 text-muted-foreground">
                    approval: {item.approvalId ?? "final-copy approval"} · source: {item.sourceContentId} · adaptation: {item.platformAdaptationId}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    source title: {item.sourceTitle}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    content hash: {item.sourceContentHash}
                  </div>
                </div>

                {item.policyNotes ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    בדיקת מדיניות: {item.policyNotes}
                    {item.policySourceUrl ? (
                      <>
                        {" "}
                        <a href={item.policySourceUrl} target="_blank" rel="noreferrer" className="underline">
                          מקור
                        </a>
                      </>
                    ) : null}
                  </div>
                ) : null}

                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
                  {item.body}
                </pre>

                {item.campaignLinkUrl ? (
                  <a
                    href={item.campaignLinkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary"
                  >
                    קישור קמפיין
                    <ExternalLink className="size-3.5" />
                  </a>
                ) : null}

                <CopyPublishContent title={item.title} content={item.body} link={item.campaignLinkUrl} />

                <div className="rounded-lg border bg-muted/10 p-3 text-sm">
                  פעולה נדרשת מ-MENI: לפתוח את הפלטפורמה, לפרסם ידנית, ואז להדביק URL אמיתי. רק אחרי אימות URL ייווצר Published Record.
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-end">
                  <form action={markFinalCopyPublishedUrlAction} className="flex flex-1 flex-col gap-2 md:flex-row md:items-end">
                    <input type="hidden" name="finalCopyId" value={item.finalCopyId ?? ""} />
                    <label className="flex-1 text-sm">
                      <span className="mb-1 block text-muted-foreground">URL אמיתי אחרי פרסום ידני</span>
                      <Input
                        name="postUrl"
                        placeholder={
                          item.platform === "linkedin"
                            ? "https://www.linkedin.com/feed/update/..."
                            : item.platform === "medium"
                              ? "https://medium.com/@Rubin-Q.S/..."
                              : "https://menirubin.substack.com/p/..."
                        }
                      />
                    </label>
                    <Button type="submit" variant="outline">
                      שמור URL אמיתי
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {!items.length && !campaignPublishItems.length ? (
        <Card>
          <CardHeader>
            <CardTitle>אין כרגע פריטי פרסום ישנים</CardTitle>
            <CardDescription>
              עבור ל&quot;קמפיינים&quot; כדי ליצור מקור תוכן, התאמות לפלטפורמות ואישור קמפיין מרוכז.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="space-y-4">
        {items.map((item) => {
          const job = jobsByApproval.get(item.id)
          const canApprove = item.status === "waiting_approval"
          const canQueue = item.status === "approved"
          const canSaveUrl = item.status === "approved"

          return (
            <Card key={item.id} className="border-border/70">
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>
                      מוצר: {item.productName ?? "לא משויך"} · פלטפורמה: {item.platform ?? "לא ידוע"} · {getPostApprovalState(item)}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusVariant(item.status)}>{getPostApprovalState(item)}</Badge>
                    {job ? <Badge variant="outline">job: {job.status}</Badge> : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
                  {item.contentPreview ?? "אין תוכן"}
                </pre>

                {item.campaignLinkUrl ? (
                  <a
                    href={item.campaignLinkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary"
                  >
                    קישור קמפיין
                    <ExternalLink className="size-3.5" />
                  </a>
                ) : null}

                <CopyPublishContent
                  title={item.title}
                  content={item.contentPreview ?? ""}
                  link={item.campaignLinkUrl}
                />

                <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-end">
                  {canApprove ? (
                    <form action={approvePublishItemAction}>
                      <input type="hidden" name="approvalItemId" value={item.id} />
                      <Button type="submit" variant="outline">אשר פעם אחת</Button>
                    </form>
                  ) : null}

                  {canQueue ? (
                    <form action={queueBrowserPublishJobAction}>
                      <input type="hidden" name="approvalItemId" value={item.id} />
                      <Button type="submit">
                        <Send className="size-4" />
                        שלח ל-Browser Helper
                      </Button>
                    </form>
                  ) : null}

                  {canSaveUrl ? (
                    <form action={markPublishedUrlAction} className="flex flex-1 flex-col gap-2 md:flex-row md:items-end">
                      <input type="hidden" name="approvalItemId" value={item.id} />
                      <label className="flex-1 text-sm">
                        <span className="mb-1 block text-muted-foreground">URL אמיתי אחרי פרסום</span>
                        <Input name="postUrl" placeholder="https://www.linkedin.com/feed/update/..." />
                      </label>
                      <Button type="submit" variant="outline">
                        שמור URL וסמן published
                      </Button>
                    </form>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
