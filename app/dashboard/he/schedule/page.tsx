import { Pause, Play, RotateCw, Zap } from "lucide-react"

import {
  pauseScheduledPublishAction,
  publishScheduledNowAction,
  rescheduleScheduledPublishAction,
  resumeScheduledPublishAction,
} from "@/app/dashboard/he/schedule/actions"
import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { listScheduledPublishQueue, summarizeScheduledPublishQueue } from "@/lib/scheduled-publish-queue-db"
import { formatDateTime } from "@/lib/utils"
import type { ScheduledPublishItem, ScheduledPublishStatus } from "@/types/scheduled-publish"

export const dynamic = "force-dynamic"

const platformLabels: Record<string, string> = {
  facebook_page: "Facebook",
  instagram_professional: "Instagram",
  linkedin: "LinkedIn",
  medium: "Medium",
  substack: "Substack",
  pinterest: "Pinterest",
  x_twitter: "X/Twitter",
  tiktok: "TikTok",
  youtube: "YouTube Shorts",
}

const statusLabels: Record<ScheduledPublishStatus, string> = {
  scheduled: "מתוזמן",
  waiting_platform_connection: "ממתין לחיבור פלטפורמה",
  waiting_media: "ממתין למדיה",
  waiting_executor: "ממתין למנוע פרסום",
  ready_to_publish: "מוכן לחלון פרסום",
  publishing: "נוצר publish job",
  published: "פורסם",
  failed: "נכשל",
  paused: "מושהה",
}

function statusVariant(status: ScheduledPublishStatus) {
  if (status === "published" || status === "ready_to_publish") return "default" as const
  if (status === "failed") return "destructive" as const
  if (status === "waiting_media" || status === "waiting_platform_connection") return "outline" as const
  return "secondary" as const
}

export default async function HebrewSchedulePage(props: {
  searchParams: Promise<{ error?: string; paused?: string; resumed?: string; rescheduled?: string; publishNow?: string }>
}) {
  const params = await props.searchParams
  const items = await listScheduledPublishQueue()
  const summary = summarizeScheduledPublishQueue(items)
  const today = items.filter((item) => isToday(item.publishAt))
  const tomorrow = items.filter((item) => isTomorrow(item.publishAt))

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <PageHeader
        eyebrow="Production Scheduler"
        title="תור תזמון פרסום"
        description="פוסטים שאושרו על ידי MENI נכנסים לכאן. publish_job נוצר רק כשהגיע זמן הפרסום והפלטפורמה מוכנה."
      />

      {params.error ? <Notice tone="error" title="שגיאה" description={params.error} /> : null}
      {params.paused ? <Notice title="התור הושהה" description="הפריט לא יתקדם לפרסום עד resume." /> : null}
      {params.resumed ? <Notice title="התור חודש" description="הפריט חזר לבדיקת סטטוס ותזמון." /> : null}
      {params.rescheduled ? <Notice title="תוזמן מחדש" description="המערכת חישבה חלון פרסום חדש לפי spacing rules." /> : null}
      {params.publishNow ? <Notice title="publish now אושר" description="נוצר publish job רק אם הפריט due/platform ready." /> : null}

      <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Metric title="סה״כ בתור" value={summary.total} />
        <Metric title="היום" value={summary.today} />
        <Metric title="מחר" value={summary.tomorrow} />
        <Metric title="ממתין חיבור" value={summary.waitingPlatformConnection} />
        <Metric title="ממתין מדיה" value={summary.waitingMedia} />
        <Metric title="נכשל" value={summary.failed} />
        <Metric title="פורסם" value={summary.published} />
        <Metric title="פרסום הבא" value={summary.nextPublishAt ? formatDateTime(summary.nextPublishAt) : "אין"} compact />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="לפי פלטפורמה" data={summary.byPlatform} />
        <Breakdown title="לפי מוצר" data={summary.byProduct} />
      </section>

      <ScheduleGroup title="מתוזמן היום" items={today} />
      <ScheduleGroup title="מתוזמן מחר" items={tomorrow} />
      <ScheduleGroup title="כל התור" items={items} />
    </div>
  )
}

function ScheduleGroup({ title, items }: { title: string; items: ScheduledPublishItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{items.length} פריטים</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">אין פריטים להצגה.</div>
        ) : null}
        {items.map((item) => <ScheduleItemCard key={item.id} item={item} />)}
      </CardContent>
    </Card>
  )
}

function ScheduleItemCard({ item }: { item: ScheduledPublishItem }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(item.status)}>{statusLabels[item.status]}</Badge>
            <Badge variant="outline">{platformLabels[item.platform] ?? item.platform}</Badge>
            <Badge variant="secondary">{item.language}</Badge>
          </div>
          <div className="text-lg font-semibold">{item.productName ?? item.productId}</div>
          <div className="text-sm text-muted-foreground">{item.finalCopyTitle ?? item.finalCopyId}</div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground">publish_at</div>
          <div className="font-medium">{formatDateTime(item.publishAt)}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Signal title="campaign link" value={item.campaignLink ? "קיים" : "אין"} />
        <Signal title="media" value={item.mediaAssetUrl ? "קיים" : "חסר"} />
        <Signal title="attempts" value={String(item.attempts)} />
      </div>

      {item.lastError ? (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {item.lastError}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {item.status === "paused" ? (
          <form action={resumeScheduledPublishAction}>
            <input type="hidden" name="id" value={item.id} />
            <Button type="submit" variant="outline"><Play className="size-4" /> Resume</Button>
          </form>
        ) : (
          <form action={pauseScheduledPublishAction}>
            <input type="hidden" name="id" value={item.id} />
            <Button type="submit" variant="outline"><Pause className="size-4" /> Pause</Button>
          </form>
        )}
        <form action={rescheduleScheduledPublishAction}>
          <input type="hidden" name="id" value={item.id} />
          <Button type="submit" variant="outline"><RotateCw className="size-4" /> Reschedule</Button>
        </form>
        <form action={publishScheduledNowAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={item.id} />
          <Input name="meni_confirmation" placeholder="MENI_CONFIRM" className="h-8 w-36" />
          <Button type="submit" variant="destructive"><Zap className="size-4" /> Publish now</Button>
        </form>
      </div>
    </div>
  )
}

function Metric({ title, value, compact = false }: { title: string; value: number | string; compact?: boolean }) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className={compact ? "text-base" : "text-3xl"}>{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 12)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? <div className="text-sm text-muted-foreground">אין נתונים.</div> : null}
        {rows.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
            <span>{platformLabels[key] ?? key}</span>
            <span className="font-semibold">{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function Signal({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 text-sm">
      <div className="text-muted-foreground">{title}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}

function Notice({ title, description, tone = "success" }: { title: string; description: string; tone?: "success" | "error" }) {
  return (
    <Card className={tone === "error" ? "border-destructive/30 bg-destructive/5" : "border-emerald-200 bg-emerald-50"}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function isToday(value: string) {
  return value.slice(0, 10) === new Date().toISOString().slice(0, 10)
}

function isTomorrow(value: string) {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return value.slice(0, 10) === tomorrow
}
