import type { CampaignPlatform } from "@/types/campaign-workflow"

export const PUBLISHING_SCHEDULE_POLICY_VERSION = "2026-06-08-v1"

export type PublishingSchedulePolicyConfig = {
  version: string
  minimumTargetPostsPerDayPerActivePlatform: number
  platformDailyTargets: Partial<Record<CampaignPlatform, number>>
  samePlatformMinimumGapMinutes: number
  globalMinimumGapMinutes: number
  rotateProducts: boolean
  oneProductPerPlatformPerDay: boolean
  noPublishingWithoutMeniApproval: true
  pinterestPinsPerDay: { min: number; max: number }
  xTwitterPostsPerDay: { min: number; max: number }
  youtubeVideosPerDay: number
  videoOnlyPlatforms: CampaignPlatform[]
  longFormPlatforms: CampaignPlatform[]
  longFormDailyCapIfQualityDrops: number
  redditQuoraManualOnly: boolean
  mediumManualBrowserOnly: boolean
  notes: string
}

export const DEFAULT_PLATFORM_DAILY_TARGETS: Record<CampaignPlatform, number> = {
  linkedin: 2,
  facebook_page: 2,
  instagram_professional: 2,
  pinterest: 5,
  x_twitter: 3,
  medium: 2,
  substack: 2,
  tiktok: 1,
  youtube: 1,
  quora: 0,
  reddit: 0,
}

export const PUBLISHING_SCHEDULE_POLICY: PublishingSchedulePolicyConfig = {
  version: PUBLISHING_SCHEDULE_POLICY_VERSION,
  minimumTargetPostsPerDayPerActivePlatform: 2,
  platformDailyTargets: DEFAULT_PLATFORM_DAILY_TARGETS,
  samePlatformMinimumGapMinutes: 4 * 60,
  globalMinimumGapMinutes: 15,
  rotateProducts: true,
  oneProductPerPlatformPerDay: true,
  noPublishingWithoutMeniApproval: true,
  pinterestPinsPerDay: { min: 5, max: 10 },
  xTwitterPostsPerDay: { min: 3, max: 5 },
  youtubeVideosPerDay: 1,
  videoOnlyPlatforms: ["tiktok", "youtube"],
  longFormPlatforms: ["medium", "substack"],
  longFormDailyCapIfQualityDrops: 1,
  redditQuoraManualOnly: true,
  mediumManualBrowserOnly: true,
  notes:
    "No publishing before MENI approval. Reddit and Quora stay manual/community-safe. Medium can use manual browser flow when extension flow is not appropriate.",
}

export type PublishingSchedulePolicy = PublishingSchedulePolicyConfig

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
  policy?: PublishingSchedulePolicy
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
  options: { longFormQualityDrops?: boolean; policy?: PublishingSchedulePolicy } = {},
): { targetMin: number; targetMax: number | null; note: string } {
  const policy = options.policy ?? PUBLISHING_SCHEDULE_POLICY
  if (platform === "pinterest") {
    return {
      targetMin: policy.pinterestPinsPerDay.min,
      targetMax: policy.pinterestPinsPerDay.max,
      note: `Pinterest may publish ${policy.pinterestPinsPerDay.min}-${policy.pinterestPinsPerDay.max} Pins/day after MENI approval.`,
    }
  }
  if (platform === "x_twitter") {
    return {
      targetMin: policy.xTwitterPostsPerDay.min,
      targetMax: policy.xTwitterPostsPerDay.max,
      note: `X/Twitter may publish ${policy.xTwitterPostsPerDay.min}-${policy.xTwitterPostsPerDay.max} posts/day when connected.`,
    }
  }
  if (platform === "youtube") {
    return {
      targetMin: policy.youtubeVideosPerDay,
      targetMax: policy.youtubeVideosPerDay,
      note: `YouTube target is ${policy.youtubeVideosPerDay}/day and still requires a real video asset plus MENI approval.`,
    }
  }
  if ((platform === "reddit" || platform === "quora") && policy.redditQuoraManualOnly) {
    return {
      targetMin: policy.platformDailyTargets[platform] ?? 0,
      targetMax: policy.platformDailyTargets[platform] ?? 0,
      note: `${platform === "reddit" ? "Reddit" : "Quora"} is manual-only; this target is advisory and never auto-posts.`,
    }
  }
  if (
    options.longFormQualityDrops &&
    (platform === "medium" || platform === "substack")
  ) {
    return {
      targetMin: 1,
      targetMax: policy.longFormDailyCapIfQualityDrops,
      note: `Medium/Substack are capped at ${policy.longFormDailyCapIfQualityDrops}/day when long-form quality drops.`,
    }
  }
  const target = policy.platformDailyTargets[platform] ?? policy.minimumTargetPostsPerDayPerActivePlatform
  return {
    targetMin: target,
    targetMax: null,
    note: `Default active-platform target is at least ${target} post${target === 1 ? "" : "s"}/day.`,
  }
}

export function listPublishingScheduleRules(
  policy: PublishingSchedulePolicy = PUBLISHING_SCHEDULE_POLICY,
): Array<{ title: string; description: string }> {
  return [
    {
      title: "Minimum target",
      description: `${policy.minimumTargetPostsPerDayPerActivePlatform} posts per day per active platform by default.`,
    },
    {
      title: "Same-platform spacing",
      description: `Never schedule two items on the same platform at the same time; keep at least ${policy.samePlatformMinimumGapMinutes} minutes between posts on the same platform.`,
    },
    {
      title: "Global spacing",
      description: `Keep at least ${policy.globalMinimumGapMinutes} minutes between any two posts across all platforms.`,
    },
    {
      title: "Product rotation",
      description: "Rotate products and do not publish the same product twice on the same platform in one day.",
    },
    {
      title: "Platform queue priority",
      description: "Route scheduled items by platform priority before materializing publish jobs: high-capacity visual channels first, long-form channels later, and Quora/Reddit outside the normal auto queue.",
    },
    {
      title: "Platform targets",
      description: `Pinterest: ${policy.pinterestPinsPerDay.min}-${policy.pinterestPinsPerDay.max} Pins/day. X/Twitter: ${policy.xTwitterPostsPerDay.min}-${policy.xTwitterPostsPerDay.max}/day. YouTube: ${policy.youtubeVideosPerDay}/day. Medium/Substack can cap at ${policy.longFormDailyCapIfQualityDrops}/day if long-form quality drops.`,
    },
    {
      title: "Media and approval gates",
      description: "TikTok/YouTube only if video exists. No publishing job can be scheduled before MENI approval.",
    },
  ]
}

export function planNextPublishSlot(input: SchedulePlanInput): SchedulePlan {
  const policy = input.policy ?? PUBLISHING_SCHEDULE_POLICY
  const now = input.now ?? new Date()
  const dailyPolicy = getPlatformDailyPolicy(input.platform, {
    longFormQualityDrops: input.longFormQualityDrops,
    policy,
  })
  const activeJobs = (input.existingJobs ?? []).filter((job) =>
    job.scheduledAt && (!job.status || ACTIVE_SCHEDULE_STATUSES.has(job.status)),
  )
  const publishedRecords = (input.publishedRecords ?? []).filter((record) => record.publishedAt)
  const reasons = [
    `policy=${policy.version}`,
    `daily_target_min=${dailyPolicy.targetMin}`,
  ]
  if (dailyPolicy.targetMax !== null) reasons.push(`daily_target_max=${dailyPolicy.targetMax}`)

  let candidate = roundUpToMinute(new Date(now.getTime() + policy.globalMinimumGapMinutes * MINUTE_MS))
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
          policy.samePlatformMinimumGapMinutes * MINUTE_MS,
    )
    if (samePlatformConflict?.scheduledAt) {
      candidate = roundUpToMinute(
        new Date(new Date(samePlatformConflict.scheduledAt).getTime() + policy.samePlatformMinimumGapMinutes * MINUTE_MS),
      )
      reasons.push(
        policy.samePlatformMinimumGapMinutes === 240
          ? "same_platform_gap_4h"
          : `same_platform_gap_${policy.samePlatformMinimumGapMinutes}m`,
      )
      continue
    }

    const globalConflict = activeJobs.find(
      (job) =>
        job.scheduledAt &&
        Math.abs(new Date(job.scheduledAt).getTime() - candidate.getTime()) <
          policy.globalMinimumGapMinutes * MINUTE_MS,
    )
    if (globalConflict?.scheduledAt) {
      candidate = roundUpToMinute(
        new Date(new Date(globalConflict.scheduledAt).getTime() + policy.globalMinimumGapMinutes * MINUTE_MS),
      )
      reasons.push(`global_gap_${policy.globalMinimumGapMinutes}m`)
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
