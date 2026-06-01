import Link from "next/link"
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, MonitorCog } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getBrowserControlOverview } from "@/lib/browser-control-db"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function HebrewBrowserControlPage() {
  const overview = isSupabaseConfigured()
    ? await getBrowserControlOverview()
    : {
        connected: false,
        latestSession: null,
        jobs: [],
        events: [],
        queuedCount: 0,
        blockerStatus: "Supabase לא מוגדר",
      }

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        eyebrow="Affiliate Agent OS Browser Helper"
        title="שליטה בדפדפן"
        description="תור פרסום מבוקר דרך הרחבת Chrome. ההרחבה ממלאת תוכן מאושר בלבד, עוצרת בלוגין/CAPTCHA/2FA, ולא לוחצת Publish בלי שליטה אנושית."
        actions={
          <Link
            href="/dashboard/he/publish-ready"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            פריטים מוכנים לפרסום
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="חיבור דפדפן"
          value={overview.connected ? "מחובר" : "לא מחובר"}
          detail="מבוסס על heartbeat מההרחבה."
          icon={overview.connected ? <CheckCircle2 className="size-4" /> : <MonitorCog className="size-4" />}
        />
        <StatCard
          label="פלטפורמה נוכחית"
          value={overview.latestSession?.activePlatform ?? "לא ידוע"}
          detail={overview.latestSession?.activeTabTitle ?? "אין טאב פעיל מדווח."}
          icon={<ExternalLink className="size-4" />}
        />
        <StatCard
          label="Jobs בתור"
          value={String(overview.queuedCount)}
          detail="ממתינים לפתיחה/מילוי בדפדפן."
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Blocker"
          value={overview.blockerStatus ? "קיים" : "אין"}
          detail={overview.blockerStatus ?? "לא דווח חסם כרגע."}
          icon={<AlertTriangle className="size-4" />}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>טאב פעיל</CardTitle>
          <CardDescription>
            ההרחבה קוראת רק URL, כותרת ומצב בסיסי של טפסים. היא לא קוראת סיסמאות, קוקיז או שדות תשלום.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>URL: {overview.latestSession?.activeTabUrl ?? "אין דיווח"}</p>
          <p>נראה לאחרונה: {overview.latestSession?.lastSeenAt ?? "אין"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>תור פרסום</CardTitle>
          <CardDescription>לא מסמנים published עד שיש URL אמיתי של פוסט.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!overview.jobs.length ? <p className="text-sm text-muted-foreground">אין jobs כרגע.</p> : null}
          {overview.jobs.map((job) => (
            <div key={job.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{job.title ?? "ללא כותרת"}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.productName ?? "לא משויך"} · {job.platform}
                  </p>
                </div>
                <Badge>{job.status}</Badge>
              </div>
              {job.postUrl ? (
                <a href={job.postUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary">
                  URL פוסט אמיתי
                </a>
              ) : null}
              {job.blockerReason ? (
                <p className="mt-2 text-sm text-destructive">חסם: {job.blockerReason}</p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Action log</CardTitle>
          <CardDescription>לוג פעולות של ההרחבה והתור.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!overview.events.length ? <p className="text-sm text-muted-foreground">אין אירועים עדיין.</p> : null}
          {overview.events.map((event) => (
            <div key={event.id} className="rounded-md border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{event.eventType}</span>
                <span className="text-muted-foreground">{event.createdAt}</span>
              </div>
              <p className="text-muted-foreground">{event.message}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
