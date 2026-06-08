import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getLinkedInOfficialApiCapability,
  LINKEDIN_CURRENT_BLOCKING_REASON,
} from "@/lib/linkedin-official-api"
import { getPlatformRoutingOverview } from "@/lib/platform-routing-db"
import { listPublishJobsForHebrewDashboard } from "@/lib/publish-jobs-db"
import { cn, formatDateTime } from "@/lib/utils"
import type { PublishJobStatus } from "@/types/publish-job"

import { PlatformRegistryTable, PlatformRoutingStats, RoutingNavActions } from "../platform-routing-view"
import { confirmLinkedInOfficialPublishAction, confirmPreparedPublishJobAction } from "./actions"

export const dynamic = "force-dynamic"

const platformLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  medium: "Medium",
  substack: "Substack",
  tiktok: "TikTok",
  quora: "Quora",
  reddit: "Reddit",
  facebook_page: "Facebook Page",
  instagram_professional: "Instagram Business",
  pinterest: "Pinterest",
  x_twitter: "X / Twitter",
  youtube: "YouTube",
}

const statusLabels: Record<PublishJobStatus, string> = {
  pending_meni_approval: "ממתין לאישור MENI",
  approved_waiting_executor: "מאושר וממתין למנוע פרסום",
  blocked_executor_not_connected: "חסום - מנוע פרסום לא מחובר",
  blocked_policy: "חסום - מדיניות פלטפורמה",
  requires_auth: "דרוש חיבור חשבון",
  pending_operator_confirmation: "ממתין לאישור פעולה סופית",
  waiting_media: "דורש תמונה לפני פרסום",
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

function isScheduledJobDue(job: { scheduledAt: string | null }) {
  return !job.scheduledAt || Date.parse(job.scheduledAt) <= Date.now()
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

function blockerLabel(reason: string) {
  const labels: Record<string, string> = {
    executor_not_connected: "מנוע פרסום לא מחובר",
    login_required: "דרוש חיבור לחשבון הפלטפורמה",
    captcha_required: "CAPTCHA חוסם את מנוע הפרסום",
    two_factor_required: "דרוש 2FA",
    passkey_required: "דרוש Passkey",
    executor_waiting_final_confirmation: "המנוע מילא תוכן וממתין לאישור פעולה סופית",
    substack_editor_automation_timeout: "Substack חסום בגלל timeout בעורך",
    reddit_direct_tracking_links_prohibited: "Reddit לא מאפשר affiliate/campaign/direct tracking link בגוף הפוסט",
    bridge_url_required: "Quora/Reddit דורשים public_review_url או bridge_url בלבד",
    quora_no_direct_affiliate_links: "Quora לא מאפשר קישור אפיליאייט ישיר",
  }

  return labels[reason] ?? reason
}

export default async function HebrewPublishReadyPage() {
  const [jobs, overview] = await Promise.all([
    listPublishJobsForHebrewDashboard(),
    getPlatformRoutingOverview(),
  ])
  const linkedinCapability = getLinkedInOfficialApiCapability()
  const hasLinkedInJobs = jobs.some((job) => job.platform === "linkedin" && job.status !== "verified")

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <PageHeader
        eyebrow="ביצוע פרסום"
        title="מצב פרסום"
        description="המסך הזה לא נותן למני משימות העתקה, הדבקה, פתיחת פלטפורמה או הכנסת URL. הוא מציג רק מצב ביצוע, חסימות וכפתור אישור פעולה סופית כשמנוע הפרסום מוכן."
        actions={<RoutingNavActions />}
      />

      <PlatformRoutingStats overview={overview} />

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>כלל עבודה</CardTitle>
          <CardDescription>
            MENI מאשר בלבד. אם אין executor או API בטוח, הפריט נשאר חסום ומוצג עם סיבה. Published Record נוצר רק אחרי URL חי מאומת.
          </CardDescription>
        </CardHeader>
      </Card>

      <PlatformRegistryTable overview={overview} />

      {hasLinkedInJobs ? (
        <Card className={linkedinCapability.configured ? "border-primary/30" : "border-amber-300"}>
          <CardHeader>
            <CardTitle>
              {linkedinCapability.configured
                ? "LinkedIn API רשמי מוכן"
                : "חסום - נדרש חיבור LinkedIn רשמי"}
            </CardTitle>
            <CardDescription>
              LinkedIn נשאר official API only. אין שימוש באוטומציית דפדפן לא רשמית ואין משימת העתקה/הדבקה ל-MENI.
            </CardDescription>
          </CardHeader>
          {!linkedinCapability.configured ? (
            <CardContent className="space-y-2 text-sm">
              <p>סיבה: {LINKEDIN_CURRENT_BLOCKING_REASON}</p>
              <p dir="ltr">
                Missing: {[...linkedinCapability.missingKeys, ...linkedinCapability.invalidReasons].join(", ")}
              </p>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      {!jobs.length ? (
        <Card>
          <CardHeader>
            <CardTitle>אין publish jobs כרגע</CardTitle>
            <CardDescription>
              אחרי אישור MENI הפריט נכנס לתור תזמון. כאן יוצגו רק פריטים שהגיע זמן הפרסום שלהם והפכו ל-publish_job.
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
                    <div className="mt-1 font-medium">{job.liveUrl ? "קיים" : "אין עדיין"}</div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="text-muted-foreground">זמן פרסום מתוכנן</div>
                    <div className="mt-1 font-medium">
                      {job.scheduledAt ? formatDateTime(job.scheduledAt) : "לא נקבע"}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="text-muted-foreground">מדיניות תזמון</div>
                    <div className="mt-1 font-medium">{job.schedulePolicyVersion ?? "לא נקבעה"}</div>
                  </div>
                </div>

                {job.scheduleNotes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {job.scheduleNotes.map((note) => (
                      <Badge key={note} variant="outline">
                        {note}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {job.blockingReason ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    חסימה: {blockerLabel(job.blockingReason)}
                  </div>
                ) : null}

                {job.status === "requires_auth" ? (
                  <Link href="/dashboard/he/browser-control" className={cn(buttonVariants({ variant: "outline" }))}>
                    חבר מנוע פרסום
                  </Link>
                ) : null}

                {job.status === "pending_operator_confirmation" ? (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-3 text-sm">
                    <p>
                      {isScheduledJobDue(job)
                        ? "מנוע הפרסום מוכן לפעולה סופית. MENI מאשר פעולה בלבד; אין העתקה, אין הדבקה ואין טיפול URL."
                        : "הפריט מאושר אך עוד לא הגיע זמן הפרסום לפי מדיניות התזמון."}
                    </p>
                    {isScheduledJobDue(job) && (job.platform === "medium" || job.platform === "substack") ? (
                      <form action={confirmPreparedPublishJobAction}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <Button type="submit">אשר פעולה סופית</Button>
                      </form>
                    ) : null}
                    {isScheduledJobDue(job) && job.platform === "linkedin" && linkedinCapability.configured ? (
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
