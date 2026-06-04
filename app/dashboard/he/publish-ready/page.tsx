import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listPublishJobsForHebrewDashboard } from "@/lib/publish-jobs-db"
import {
  getLinkedInOfficialApiCapability,
  LINKEDIN_CURRENT_BLOCKING_REASON,
} from "@/lib/linkedin-official-api"
import { cn } from "@/lib/utils"
import type { PublishJobStatus } from "@/types/publish-job"

import { confirmLinkedInOfficialPublishAction, confirmPreparedPublishJobAction } from "./actions"

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
  requires_auth: "דרוש חיבור חשבון",
  pending_operator_confirmation: "ממתין לאישור פעולה סופית",
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
    status === "requires_auth" ||
    status === "needs_system_fix" ||
    status === "failed_needs_system_fix"
  ) {
    return "destructive" as const
  }
  return "secondary" as const
}

function jobStatusLabel(job: { status: PublishJobStatus; blockingReason: string | null }) {
  if (
    job.status === "blocked_executor_not_connected" &&
    job.blockingReason === LINKEDIN_CURRENT_BLOCKING_REASON
  ) {
    return "חסום - נדרש חיבור LinkedIn רשמי"
  }

  return statusLabels[job.status]
}

export default async function HebrewPublishReadyPage() {
  const jobs = await listPublishJobsForHebrewDashboard()
  const linkedinCapability = getLinkedInOfficialApiCapability()
  const hasLinkedInJobs = jobs.some((job) => job.platform === "linkedin" && job.status !== "verified")

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

      {hasLinkedInJobs ? (
        <Card className={linkedinCapability.configured ? "border-primary/30" : "border-amber-300"}>
          <CardHeader>
            <CardTitle>
              {linkedinCapability.configured
                ? "LinkedIn API רשמי מוכן"
                : "חסום - נדרש חיבור LinkedIn רשמי"}
            </CardTitle>
            <CardDescription>
              הפרסום מותר רק דרך LinkedIn Developer App עם Share on LinkedIn והרשאת w_member_social.
              אין שימוש באוטומציית דפדפן לא רשמית.
            </CardDescription>
          </CardHeader>
          {!linkedinCapability.configured ? (
            <CardContent className="space-y-2 text-sm">
              <p>סיבה: {LINKEDIN_CURRENT_BLOCKING_REASON}</p>
              <p>
                LinkedIn לא מאפשר כרגע ליצור Developer App לחשבון בגלל שאין מספיק חיבורים. המסלול הישן
                השתמש באוטומציית דפדפן לא רשמית ולכן אינו זמין לשימוש חוזר.
              </p>
              <p dir="ltr">
                Missing: {[...linkedinCapability.missingKeys, ...linkedinCapability.invalidReasons].join(", ")}
              </p>
              <p>Token storage: server environment only. לא נשמר token בדפדפן או במסד נתונים.</p>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

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
                  <Badge variant={statusVariant(job.status)}>{jobStatusLabel(job)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="text-muted-foreground">סטטוס</div>
                    <div className="mt-1 font-medium">{jobStatusLabel(job)}</div>
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
                      : job.blockingReason === LINKEDIN_CURRENT_BLOCKING_REASON
                        ? "חסום - נדרש חיבור LinkedIn רשמי"
                      : job.blockingReason === "login_required"
                        ? "דרוש חיבור לחשבון הפלטפורמה"
                      : job.blockingReason === "captcha_required"
                        ? "CAPTCHA חוסם את המנוע"
                      : job.blockingReason === "two_factor_required"
                        ? "דרוש 2FA"
                      : job.blockingReason === "passkey_required"
                        ? "דרוש Passkey"
                      : job.blockingReason === "executor_waiting_final_confirmation"
                        ? "המנוע מילא את התוכן וממתין לאישור פעולה סופית"
                      : job.blockingReason}
                  </div>
                ) : null}

                {job.status === "requires_auth" ? (
                  <Link href="/dashboard/he/browser-control" className={cn(buttonVariants({ variant: "outline" }))}>
                    חבר חשבון
                  </Link>
                ) : null}

                {job.status === "pending_operator_confirmation" ? (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-3 text-sm">
                    <p>
                      התוכן כבר מולא על ידי מנוע הפרסום. אישור הפעולה הסופית מתיר למנוע ללחוץ Publish ולאמת URL חי.
                    </p>
                    {job.platform === "medium" || job.platform === "substack" ? (
                      <form action={confirmPreparedPublishJobAction}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <Button type="submit">אשר פעולה סופית</Button>
                      </form>
                    ) : null}
                    {job.platform === "linkedin" && linkedinCapability.configured ? (
                      <form action={confirmLinkedInOfficialPublishAction}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <Button type="submit">אשר פעולה סופית</Button>
                      </form>
                    ) : null}
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
