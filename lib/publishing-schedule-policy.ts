import type { CampaignPlatform } from "@/types/campaign-workflow"

export const PUBLISHING_SCHEDULE_POLICY_VERSION = "2026-06-08-v1"

export const PUBLISHING_SCHEDULE_POLICY = {
  version: PUBLISHING_SCHEDULE_POLICY_VERSION,
  minimumTargetPostsPerDayPerActivePlatform: 2,
  samePlatformMinimumGapMinutes: 4 * 60,
  globalMinimumGapMinutes: 15,
  rotateProducts: true,
  oneProductPerPlatformPerDay: true,
  noPublishingWithoutMeniApproval: true,
  pinterestPinsPerDay: { min: 5, max: 10 },
  xTwitterPostsPerDay: { min: 3, max: 5 },
  videoOnlyPlatforms: ["tiktok", "youtube"] satisfies CampaignPlatform[],
  longFormPlatforms: ["medium", "substack"] satisfies CampaignPlatform[],
  longFormDailyCapIfQualityDrops: 1,
} as const

export type PublishingSchedulePolicy = typeof PUBLISHING_SCHEDULE_POLICY

export type ScheduleStatus =
  | "approved_waiting_executor"
  | "pending_operator_confirmation"
  | "running"
  | "waiting_url_verification"
  | "verified"

export type ScheduledPublishItem = {
  productId: string
  platform: CampaignPlatform
  scheduledAt: string | null
  status?: ScheduleStatus | string | null
}

export type PublishedItem = {
  productId: string
  platform: CampaignPlatform
  publishedAt: string | null
}

export type SchedulePlanInput = {
  productId: string
  platform: CampaignPlatform
  now?: Date
  existingJobs?: ScheduledPublishItem[]
  publishedRecords?: PublishedItem[]
  longFormQualityDrops?: boolean
}

export type SchedulePlan = {
  scheduledAt: string
  policyVersion: string
  reasons: string[]
}

const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS
const SCHEDULE_TIME_ZONE = "Asia/Jerusalem"

const ACTIVE_SCHEDULE_STATUSES = new Set<string>([
  "approved_waiting_executor",
  "pending_operator_confirmation",
  "running",
  "waiting_url_verification",
])

export function platformRequiresVideo(platform: CampaignPlatform): boolean {
  return PUBLISHING_SCHEDULE_POLICY.videoOnlyPlatforms.includes(platform as "tiktok" | "youtube")
}

export function getPlatformDailyPolicy(
  platform: CampaignPlatform,
  options: { longFormQualityDrops?: boolean } = {},
): { targetMin: number; targetMax: number | null; note: string } {
  if (platform === "pinterest") {
    return {
      targetMin: PUBLISHING_SCHEDULE_POLICY.pinterestPinsPerDay.min,
      targetMax: PUBLISHING_SCHEDULE_POLICY.pinterestPinsPerDay.max,
      note: "Pinterest may publish 5-10 Pins/day after MENI approval.",
    }
  }
  if (platform === "x_twitter") {
    return {
      targetMin: PUBLISHING_SCHEDULE_POLICY.xTwitterPostsPerDay.min,
      targetMax: PUBLISHING_SCHEDULE_POLICY.xTwitterPostsPerDay.max,
      note: "X/Twitter may publish 3-5 posts/day when connected.",
    }
  }
  if (
    options.longFormQualityDrops &&
    (platform === "medium" || platform === "substack")
  ) {
    return {
      targetMin: 1,
      targetMax: PUBLISHING_SCHEDULE_POLICY.longFormDailyCapIfQualityDrops,
      note: "Medium/Substack are capped at 1/day when long-form quality drops.",
    }
  }
  return {
    targetMin: PUBLISHING_SCHEDULE_POLICY.minimumTargetPostsPerDayPerActivePlatform,
    targetMax: null,
    note: "Default active-platform target is at least 2 posts/day.",
  }
}

export function listPublishingScheduleRules(): Array<{ title: string; description: string }> {
  return [
    {
      title: "Minimum target",
      description: "2 posts per day per active platform.",
    },
    {
      title: "Same-platform spacing",
      description: "Never schedule two items on the same platform at the same time; keep at least 4 hours between posts on the same platform.",
    },
    {
      title: "Global spacing",
      description: "Keep at least 15 minutes between any two posts across all platforms.",
    },
    {
      title: "Product rotation",
      description: "Rotate products and do not publish the same product twice on the same platform in one day.",
    },
    {
      title: "Platform targets",
      description: "Pinterest: 5-10 Pins/day. X/Twitter: 3-5/day when connected. Medium/Substack can cap at 1/day if long-form quality drops.",
    },
    {
      title: "Media and approval gates",
      description: "TikTok/YouTube only if video exists. No publishing job can be scheduled before MENI approval.",
    },
  ]
}

export function planNextPublishSlot(input: SchedulePlanInput): SchedulePlan {
  const now = input.now ?? new Date()
  const dailyPolicy = getPlatformDailyPolicy(input.platform, {
    longFormQualityDrops: input.longFormQualityDrops,
  })
  const activeJobs = (input.existingJobs ?? []).filter((job) =>
    job.scheduledAt && (!job.status || ACTIVE_SCHEDULE_STATUSES.has(job.status)),
  )
  const publishedRecords = (input.publishedRecords ?? []).filter((record) => record.publishedAt)
  const reasons = [
    `policy=${PUBLISHING_SCHEDULE_POLICY_VERSION}`,
    `daily_target_min=${dailyPolicy.targetMin}`,
  ]
  if (dailyPolicy.targetMax !== null) reasons.push(`daily_target_max=${dailyPolicy.targetMax}`)

  let candidate = roundUpToMinute(new Date(now.getTime() + PUBLISHING_SCHEDULE_POLICY.globalMinimumGapMinutes * MINUTE_MS))
  const searchLimit = new Date(now.getTime() + 45 * DAY_MS)

  while (candidate <= searchLimit) {
    const dayKey = getDayKey(candidate)
    const platformItemsToday = activeJobs.filter(
      (job) => job.platform === input.platform && job.scheduledAt && getDayKey(new Date(job.scheduledAt)) === dayKey,
    )

    if (
      dailyPolicy.targetMax !== null &&
      platformItemsToday.length >= dailyPolicy.targetMax
    ) {
      candidate = nextLocalDay(candidate)
      continue
    }

    const sameProductSamePlatformToday =
      platformItemsToday.some((job) => job.productId === input.productId) ||
      publishedRecords.some(
        (record) =>
          record.productId === input.productId &&
          record.platform === input.platform &&
          record.publishedAt &&
          getDayKey(new Date(record.publishedAt)) === dayKey,
      )
    if (sameProductSamePlatformToday) {
      candidate = nextLocalDay(candidate)
      reasons.push("rotated_product_same_platform_next_day")
      continue
    }

    const samePlatformConflict = activeJobs.find(
      (job) =>
        job.platform === input.platform &&
        job.scheduledAt &&
        Math.abs(new Date(job.scheduledAt).getTime() - candidate.getTime()) <
          PUBLISHING_SCHEDULE_POLICY.samePlatformMinimumGapMinutes * MINUTE_MS,
    )
    if (samePlatformConflict?.scheduledAt) {
      candidate = roundUpToMinute(
        new Date(new Date(samePlatformConflict.scheduledAt).getTime() + PUBLISHING_SCHEDULE_POLICY.samePlatformMinimumGapMinutes * MINUTE_MS),
      )
      reasons.push("same_platform_gap_4h")
      continue
    }

    const globalConflict = activeJobs.find(
      (job) =>
        job.scheduledAt &&
        Math.abs(new Date(job.scheduledAt).getTime() - candidate.getTime()) <
          PUBLISHING_SCHEDULE_POLICY.globalMinimumGapMinutes * MINUTE_MS,
    )
    if (globalConflict?.scheduledAt) {
      candidate = roundUpToMinute(
        new Date(new Date(globalConflict.scheduledAt).getTime() + PUBLISHING_SCHEDULE_POLICY.globalMinimumGapMinutes * MINUTE_MS),
      )
      reasons.push("global_gap_15m")
      continue
    }

    return {
      scheduledAt: candidate.toISOString(),
      policyVersion: PUBLISHING_SCHEDULE_POLICY_VERSION,
      reasons: Array.from(new Set(reasons)),
    }
  }

  throw new Error("Unable to find a publish schedule slot within 45 days.")
}

function roundUpToMinute(value: Date): Date {
  const ms = value.getTime()
  return new Date(Math.ceil(ms / MINUTE_MS) * MINUTE_MS)
}

function getDayKey(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHEDULE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value)
}

function nextLocalDay(value: Date): Date {
  return roundUpToMinute(new Date(value.getTime() + DAY_MS))
}
