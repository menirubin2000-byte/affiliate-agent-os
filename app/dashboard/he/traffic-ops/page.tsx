import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getTrafficOpsSummary, getTrafficTasks } from "@/lib/traffic-ops-db"
import type { TrafficTask, TrafficTaskStatus } from "@/types/traffic-ops"

import { approveTrafficReviewAction, rejectTrafficReviewAction, skipTrafficTaskAction } from "./actions"

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

const statusLabels: Record<TrafficTaskStatus, string> = {
  pending: "ממתין",
  asset_needed: "דורש אסט",
  asset_ready: "אסט מוכן",
  in_review: "בביקורת",
  approved: "מאושר",
  publish_job_created: "נוצר publish_job",
  completed: "הושלם",
  skipped: "דולג",
}

const taskTypeLabels: Record<string, string> = {
  publish_content: "פרסום תוכן",
  create_asset: "יצירת אסט",
  refresh_content: "ריענון תוכן",
  boost_performing: "הגברת ביצועים",
  expand_platform: "הרחבת פלטפורמה",
  bridge_post: "פוסט גשר",
}

function statusVariant(status: TrafficTaskStatus) {
  if (status === "completed") return "default" as const
  if (status === "approved" || status === "publish_job_created") return "default" as const
  if (status === "skipped") return "outline" as const
  if (status === "asset_needed") return "destructive" as const
  return "secondary" as const
}

function SummaryCards({ summary }: { summary: Awaited<ReturnType<typeof getTrafficOpsSummary>> }) {
  const items = [
    { label: "סה״כ", value: summary.total },
    { label: "ממתין", value: summary.pending },
    { label: "דורש אסט", value: summary.assetNeeded },
    { label: "אסט מוכן", value: summary.assetReady },
    { label: "בביקורת", value: summary.inReview },
    { label: "מאושר", value: summary.approved },
    { label: "publish_job", value: summary.publishJobCreated },
    { label: "הושלם", value: summary.completed },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{item.value}</div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function PlatformBreakdown({ byPlatform }: { byPlatform: Record<string, number> }) {
  const entries = Object.entries(byPlatform).sort(([, a], [, b]) => b - a)
  if (!entries.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>פילוח לפי פלטפורמה</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {entries.map(([platform, count]) => (
            <Badge key={platform} variant="secondary">
              {platformLabels[platform] ?? platform}: {count}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TaskCard({ task }: { task: TrafficTask }) {
  const showApproval = task.status === "in_review" && task.reviewDecision === "pending"
  const showAssetWarning = task.status === "asset_needed"

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>
              {task.productName ?? "מוצר"} · {platformLabels[task.platform] ?? task.platform}
            </CardTitle>
            <CardDescription>
              {taskTypeLabels[task.taskType] ?? task.taskType} · ניקוד: {task.trafficScore ?? "—"} · עדיפות: {task.priority}
            </CardDescription>
          </div>
          <Badge variant={statusVariant(task.status)}>{statusLabels[task.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="text-muted-foreground">סטטוס</div>
            <div className="mt-1 font-medium">{statusLabels[task.status]}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="text-muted-foreground">אסט</div>
            <div className="mt-1 font-medium">{task.assetStatus ?? "לא נדרש"}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="text-muted-foreground">ביקורת</div>
            <div className="mt-1 font-medium">{task.reviewDecision ?? "לא הוגש"}</div>
          </div>
        </div>

        {task.blockingReason ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            חסימה: {task.blockingReason}
          </div>
        ) : null}

        {showAssetWarning ? (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-950">
            משימה זו דורשת אסט מדיה לפני שניתן להמשיך. אם נדרש וידאו (YouTube/TikTok) — יש להכין חיצונית. Claude לא יוצר וידאו.
          </div>
        ) : null}

        {showApproval ? (
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <p className="text-sm">משימה זו ממתינה לאישור MENI. אין auto-approval.</p>
            <div className="flex gap-2">
              <form action={approveTrafficReviewAction}>
                <input type="hidden" name="reviewId" value={task.id} />
                <input type="hidden" name="taskId" value={task.id} />
                <Button type="submit" size="sm">אשר</Button>
              </form>
              <form action={rejectTrafficReviewAction}>
                <input type="hidden" name="reviewId" value={task.id} />
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="reason" value="" />
                <Button type="submit" variant="destructive" size="sm">דחה</Button>
              </form>
            </div>
          </div>
        ) : null}

        {task.status === "pending" || task.status === "asset_needed" ? (
          <form action={skipTrafficTaskAction}>
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="reason" value="" />
            <Button type="submit" variant="ghost" size="sm">דלג</Button>
          </form>
        ) : null}

        {task.notes ? (
          <div className="text-sm text-muted-foreground">{task.notes}</div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default async function TrafficOpsPage() {
  const [summary, tasks] = await Promise.all([
    getTrafficOpsSummary(),
    getTrafficTasks(),
  ])

  const activeTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "skipped")
  const completedTasks = tasks.filter((t) => t.status === "completed" || t.status === "skipped")

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <PageHeader
        eyebrow="תפעול תנועה"
        title="Traffic Ops"
        description="שכבת העבודה התפעולית בין דירוג התנועה לבין יצירת publish_job. כאן רואים מה צריך אסט, מה מחכה לאישור MENI, ומה מוכן לפרסום."
      />

      <SummaryCards summary={summary} />

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>כלל עבודה</CardTitle>
          <CardDescription>
            זרימה: traffic ranking → traffic task → אסט מוכן → אישור MENI → publish_job → published_record מאומת → מטריקות.
            אין publish_job בלי אישור MENI. אין מטריקות בלי published_record מאומת. Claude לא יוצר וידאו.
          </CardDescription>
        </CardHeader>
      </Card>

      <PlatformBreakdown byPlatform={summary.byPlatform} />

      {!activeTasks.length ? (
        <Card>
          <CardHeader>
            <CardTitle>אין משימות פעילות</CardTitle>
            <CardDescription>
              כשה-traffic engine מזהה הזדמנויות פרסום חדשות, הן יופיעו כאן כמשימות עם סטטוס, אסטים נדרשים, וממתינות לאישור.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {activeTasks.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">משימות פעילות ({activeTasks.length})</h2>
          {activeTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </section>
      ) : null}

      {completedTasks.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">הושלמו / דולגו ({completedTasks.length})</h2>
          {completedTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </section>
      ) : null}
    </div>
  )
}
