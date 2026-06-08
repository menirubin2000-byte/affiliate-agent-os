import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getPlatformDailyPolicy,
  listPublishingScheduleRules,
  PUBLISHING_SCHEDULE_POLICY,
} from "@/lib/publishing-schedule-policy"
import { cn } from "@/lib/utils"
import type { CampaignPlatform } from "@/types/campaign-workflow"

export const dynamic = "force-dynamic"

const activePlatforms: Array<{ platform: CampaignPlatform; label: string }> = [
  { platform: "linkedin", label: "LinkedIn" },
  { platform: "facebook_page", label: "Facebook Page" },
  { platform: "instagram_professional", label: "Instagram Business" },
  { platform: "pinterest", label: "Pinterest" },
  { platform: "x_twitter", label: "X / Twitter" },
  { platform: "medium", label: "Medium" },
  { platform: "substack", label: "Substack" },
  { platform: "tiktok", label: "TikTok" },
  { platform: "youtube", label: "YouTube" },
]

export default function DashboardSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Publishing Schedule Policy"
        description="Read-only operational policy used when MENI-approved final copy becomes a publish job."
        actions={
          <Link href="/dashboard/he/publish-ready" className={cn(buttonVariants({ variant: "outline" }))}>
            Open publishing queue
          </Link>
        }
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <span>Policy version</span>
            <Badge variant="default">{PUBLISHING_SCHEDULE_POLICY.version}</Badge>
          </CardTitle>
          <CardDescription>
            No publishing is allowed before MENI approval. This policy schedules approved jobs only; it does not publish or create published records.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-3 md:grid-cols-3">
        <PolicyMetric
          title="Default daily target"
          value={`${PUBLISHING_SCHEDULE_POLICY.minimumTargetPostsPerDayPerActivePlatform}/day`}
          detail="Per active platform"
        />
        <PolicyMetric
          title="Same platform gap"
          value="4h"
          detail="No two posts on the same platform at the same time"
        />
        <PolicyMetric
          title="Global gap"
          value="15m"
          detail="Between any two scheduled posts"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
          <CardDescription>Hard gates and operating targets for the scheduler.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {listPublishingScheduleRules().map((rule) => (
            <div key={rule.title} className="rounded-lg border bg-muted/20 p-3">
              <div className="font-medium">{rule.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform Daily Targets</CardTitle>
          <CardDescription>Targets are used for planning; platform connection and media readiness still decide whether a job can run.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {activePlatforms.map((item) => {
              const policy = getPlatformDailyPolicy(item.platform, {
                longFormQualityDrops: item.platform === "medium" || item.platform === "substack",
              })
              return (
                <div key={item.platform} className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.label}</span>
                    <Badge variant="outline">
                      {policy.targetMax === null
                        ? `${policy.targetMin}+/day`
                        : `${policy.targetMin}-${policy.targetMax}/day`}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{policy.note}</p>
                  {PUBLISHING_SCHEDULE_POLICY.videoOnlyPlatforms.includes(item.platform as "tiktok" | "youtube") ? (
                    <p className="mt-1 text-muted-foreground">Requires ready video before scheduling can execute.</p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PolicyMetric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardHeader>
    </Card>
  )
}
