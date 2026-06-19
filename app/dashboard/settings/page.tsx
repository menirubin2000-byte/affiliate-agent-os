import Link from "next/link"

import {
  resetPublishingPolicySettingsAction,
  savePublishingPolicySettingsAction,
} from "@/app/dashboard/settings/actions"
import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getCurrentPublishingSchedulePolicy } from "@/lib/publishing-schedule-policy-db"
import {
  getPlatformDailyPolicy,
  listPublishingScheduleRules,
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

const editablePlatformTargets: Array<{ platform: CampaignPlatform; label: string }> = [
  { platform: "linkedin", label: "LinkedIn" },
  { platform: "facebook_page", label: "Facebook Page" },
  { platform: "instagram_professional", label: "Instagram Business" },
  { platform: "medium", label: "Medium" },
  { platform: "substack", label: "Substack" },
  { platform: "tiktok", label: "TikTok" },
  { platform: "reddit", label: "Reddit advisory" },
  { platform: "quora", label: "Quora advisory" },
]

const platformTargetFieldNames: Record<CampaignPlatform, string> = {
  linkedin: "target_linkedin",
  facebook_page: "target_facebook_page",
  instagram_professional: "target_instagram_professional",
  pinterest: "target_pinterest",
  x_twitter: "target_x_twitter",
  medium: "target_medium",
  substack: "target_substack",
  tiktok: "target_tiktok",
  youtube: "target_youtube",
  quora: "target_quora",
  reddit: "target_reddit",
}

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string; error?: string; saved?: string; reset?: string }>
}) {
  const params = (await searchParams) ?? {}
  const policy = await getCurrentPublishingSchedulePolicy()
  const editing = params.mode === "edit"

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Publishing Policy Settings"
        description="Editable operational policy used when MENI-approved final copy becomes a scheduled publish job."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/he/publish-ready" className={cn(buttonVariants({ variant: "outline" }))}>
              Open publishing queue
            </Link>
            {editing ? (
              <Link href="/dashboard/settings" className={cn(buttonVariants({ variant: "ghost" }))}>
                Cancel
              </Link>
            ) : (
              <Link href="/dashboard/settings?mode=edit" className={cn(buttonVariants({ variant: "default" }))}>
                Edit policy
              </Link>
            )}
          </div>
        }
      />

      {params.error ? <Notice tone="error" title="Settings not saved" description={params.error} /> : null}
      {params.saved ? <Notice title="Policy saved" description="Publishing policy settings were updated. Scheduling still requires MENI approval before any publish job can run." /> : null}
      {params.reset ? <Notice title="Policy reset" description="Publishing policy settings were restored to the current safe defaults." /> : null}

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <span>Policy version</span>
            <Badge variant="default">{policy.version}</Badge>
            <Badge variant="outline">MENI approval required</Badge>
          </CardTitle>
          <CardDescription>
            No publishing is allowed before MENI approval. This policy schedules approved jobs only; it does not publish, auto-post, scrape, or create published records.
            {policy.updatedAt ? ` Last updated: ${policy.updatedAt}` : ""}
          </CardDescription>
        </CardHeader>
      </Card>

      {editing ? <PolicyEditForm policy={policy} /> : null}

      <section className="grid gap-3 md:grid-cols-3">
        <PolicyMetric
          title="Default daily target"
          value={`${policy.minimumTargetPostsPerDayPerActivePlatform}/day`}
          detail="Per active platform"
        />
        <PolicyMetric
          title="Same platform gap"
          value={`${policy.samePlatformMinimumGapMinutes}m`}
          detail="No two posts on the same platform at the same time"
        />
        <PolicyMetric
          title="Global gap"
          value={`${policy.globalMinimumGapMinutes}m`}
          detail="Between any two scheduled posts"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
          <CardDescription>Hard gates and operating targets for the scheduler.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {listPublishingScheduleRules(policy).map((rule) => (
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
              const dailyPolicy = getPlatformDailyPolicy(item.platform, {
                longFormQualityDrops: item.platform === "medium" || item.platform === "substack",
                policy: policy,
              })
              return (
                <div key={item.platform} className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.label}</span>
                    <Badge variant="outline">
                      {dailyPolicy.targetMax === null
                        ? `${dailyPolicy.targetMin}+/day`
                        : `${dailyPolicy.targetMin}-${dailyPolicy.targetMax}/day`}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{dailyPolicy.note}</p>
                  {dailyPolicy.note.includes("video asset") ? (
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

function PolicyEditForm({ policy }: { policy: Awaited<ReturnType<typeof getCurrentPublishingSchedulePolicy>> }) {
  return (
    <div className="space-y-4">
      <form action={savePublishingPolicySettingsAction}>
        <Card>
          <CardHeader>
            <CardTitle>Edit publishing policy</CardTitle>
            <CardDescription>
              Changes affect scheduling rules only. They do not approve content, publish content, or enable auto-posting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <NumberField
                id="default_daily_target"
                name="default_daily_target"
                label="Default daily target"
                defaultValue={policy.minimumTargetPostsPerDayPerActivePlatform}
              />
              <NumberField
                id="same_platform_gap_minutes"
                name="same_platform_gap_minutes"
                label="Same-platform gap minutes"
                defaultValue={policy.samePlatformMinimumGapMinutes}
              />
              <NumberField
                id="global_gap_minutes"
                name="global_gap_minutes"
                label="Global gap minutes"
                defaultValue={policy.globalMinimumGapMinutes}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <NumberField id="youtube_target" name="youtube_target" label="YouTube target" defaultValue={policy.youtubeVideosPerDay} />
              <NumberField id="pinterest_target_min" name="pinterest_target_min" label="Pinterest min" defaultValue={policy.pinterestPinsPerDay.min} />
              <NumberField id="pinterest_target_max" name="pinterest_target_max" label="Pinterest max" defaultValue={policy.pinterestPinsPerDay.max} />
              <NumberField id="x_twitter_target_min" name="x_twitter_target_min" label="X/Twitter min" defaultValue={policy.xTwitterPostsPerDay.min} />
              <NumberField id="x_twitter_target_max" name="x_twitter_target_max" label="X/Twitter max" defaultValue={policy.xTwitterPostsPerDay.max} />
              <NumberField
                id="medium_substack_daily_cap"
                name="medium_substack_daily_cap"
                label="Medium/Substack cap"
                defaultValue={policy.longFormDailyCapIfQualityDrops}
              />
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="font-medium">Per-platform daily targets</h3>
                <p className="text-sm text-muted-foreground">
                  Advisory targets for scheduling. Reddit and Quora remain manual/community-safe and are not auto-posted.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {editablePlatformTargets.map((item) => (
                  <NumberField
                    key={item.platform}
                    id={platformTargetFieldNames[item.platform]}
                    name={platformTargetFieldNames[item.platform]}
                    label={item.label}
                    defaultValue={policy.platformDailyTargets[item.platform] ?? 0}
                    min={0}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <CheckboxField
                id="reddit_quora_manual_only"
                name="reddit_quora_manual_only"
                label="Reddit/Quora manual-only"
                defaultChecked={policy.redditQuoraManualOnly}
              />
              <CheckboxField
                id="medium_manual_browser_only"
                name="medium_manual_browser_only"
                label="Medium manual-browser-only"
                defaultChecked={policy.mediumManualBrowserOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes/rules text</Label>
              <Textarea id="notes" name="notes" defaultValue={policy.notes} rows={6} required />
            </div>

            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              MENI approval gate is locked on. Saving settings cannot set final copy to operator-approved and cannot create publish jobs.
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="meni_confirmation">MENI confirmation</Label>
                <Input id="meni_confirmation" name="meni_confirmation" placeholder="MENI_CONFIRM" required />
              </div>
              <Button type="submit">Save policy</Button>
              <Link href="/dashboard/settings" className={cn(buttonVariants({ variant: "outline" }))}>
                Cancel
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>

      <form action={resetPublishingPolicySettingsAction}>
        <Card>
          <CardHeader>
            <CardTitle>Reset to default</CardTitle>
            <CardDescription>Restores the current safe default policy values.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="reset_meni_confirmation">MENI confirmation</Label>
              <Input id="reset_meni_confirmation" name="meni_confirmation" placeholder="MENI_CONFIRM" required />
            </div>
            <Button type="submit" variant="destructive">Reset to default</Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

function NumberField({
  id,
  name,
  label,
  defaultValue,
  min = 1,
}: {
  id: string
  name: string
  label: string
  defaultValue: number
  min?: number
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type="number" min={min} step={1} defaultValue={defaultValue} required />
    </div>
  )
}

function CheckboxField({
  id,
  name,
  label,
  defaultChecked,
}: {
  id: string
  name: string
  label: string
  defaultChecked: boolean
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3 text-sm font-medium">
      <input id={id} name={name} type="checkbox" defaultChecked={defaultChecked} className="size-4" />
      {label}
    </label>
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
