import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listPublishJobsForHebrewDashboard } from "@/lib/publish-jobs-db"
import { cn } from "@/lib/utils"
import type { PublishJobStatus } from "@/types/publish-job"

export const dynamic = "force-dynamic"

const platformLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  medium: "Medium",
  substack: "Substack",
  tiktok: "TikTok",
  quora: "Quora",
  reddit: "Reddit",
}

const statusLabels: Record<PublishJobStatus, string> = {
  pending_meni_approval: "ממתין לאישור מני",
  approved_waiting_executor: "מאושר וממתין למנוע פרסום",
  blocked_executor_not_connected: "חסום - מנוע פרסום לא מחובר",
  blocked_policy: "חסום - מדיניות פלטפורמה",
  running: "בביצוע",
  waiting_url_verification: "ממתין לאימות URL",
  verified: "פורסם ואומת",
  needs_system_fix: "דרוש תיקון מערכת",
  failed_needs_system_fix: "נכשל - דרוש תיקון מערכת",
}

function statusVariant(status: PublishJobStatus) {
  if (status === "verified") return "default" as const
  if (
    status === "blocked_executor_not_connected" ||
    status === "blocked_policy" ||
    status === "needs_system_fix" ||
    status === "failed_needs_system_fix"
  ) {
    return "destructive" as const
  }
  return "secondary" as const
}

export default async function HebrewPublishReadyPage() {
  const jobs = await listPublishJobsForHebrewDashboard()

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        eyebrow="ביצוע פרסום"
        title="סטטוס פרסום"
        description="MENI לא מעתיק, לא פותח פלטפורמות, ולא מדביק URL מהמסך הזה. אחרי אישור, המערכת יוצרת publish job. אם אין מנוע פרסום מחובר, הפריט נחסם."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/he/content-review" className={cn(buttonVariants())}>
              אישור פוסטים
            </Link>
            <Link href="/dashboard/he/campaigns" className={cn(buttonVariants({ variant: "outline" }))}>
              קמפיינים
            </Link>
          </div>
        }
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>כלל עבודה</CardTitle>
          <CardDescription>
            הפעולות היחידות של MENI הן אשר, דחה, או דרוש תיקון במסך אישור הפוסטים. כל ביצוע פרסום עובר דרך publish job ומנוע פרסום. בלי מנוע מחובר אין משימה למני.
          </CardDescription>
        </CardHeader>
      </Card>

      {!jobs.length ? (
        <Card>
          <CardHeader>
            <CardTitle>אין jobs לפרסום כרגע</CardTitle>
            <CardDescription>
              אחרי ש-MENI יאשר final copy, המערכת תיצור publish job ותציג כאן אם הוא ממתין למנוע פרסום, חסום, בביצוע או פורסם ואומת.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {jobs.length ? (
        <section className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} className="border-border/70">
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle>
                      {job.productName ?? "מוצר"} · {platformLabels[job.platform] ?? job.platform}
                    </CardTitle>
                    <CardDescription>
                      {job.finalCopyTitle ?? "Final copy"} · executor: {job.executorType}
                    </CardDescription>
                  </div>
                  <Badge variant={statusVariant(job.status)}>{statusLabels[job.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="text-muted-foreground">סטטוס</div>
                    <div className="mt-1 font-medium">{statusLabels[job.status]}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="text-muted-foreground">מנוע פרסום</div>
                    <div className="mt-1 font-medium">{job.executorType}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="text-muted-foreground">URL חי</div>
                    <div className="mt-1 font-medium">{job.liveUrl ? "קיים" : "עדיין אין"}</div>
                  </div>
                </div>

                {job.blockingReason ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    חסימה: {job.blockingReason === "executor_not_connected"
                      ? "מנוע פרסום לא מחובר"
                      : job.blockingReason}
                  </div>
                ) : null}

                {job.liveUrl ? (
                  <a
                    href={job.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline"
                    dir="ltr"
                  >
                    {job.liveUrl}
                  </a>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  )
}
