import { evaluatePlatformMediaReadiness } from "@/lib/platform-media-rules"
import {
  PUBLISHING_SCHEDULE_POLICY_VERSION,
  planNextPublishSlot,
  type PublishedItem,
  type ScheduledPublishItem as SchedulePolicyItem,
} from "@/lib/publishing-schedule-policy"
import type { CampaignPlatform } from "@/types/campaign-workflow"
import type { ScheduledPublishStatus } from "@/types/scheduled-publish"

export const AUTO_QUEUE_PLATFORMS: CampaignPlatform[] = [
  "facebook_page",
  "instagram_professional",
  "linkedin",
  "medium",
  "substack",
  "pinterest",
  "x_twitter",
  "tiktok",
  "youtube",
]

export const PLATFORM_DAILY_CAPACITY: Record<string, { min: number; max: number }> = {
  facebook_page: { min: 2, max: 2 },
  instagram_professional: { min: 2, max: 2 },
  linkedin: { min: 2, max: 2 },
  medium: { min: 1, max: 2 },
  substack: { min: 1, max: 2 },
  pinterest: { min: 5, max: 10 },
  x_twitter: { min: 3, max: 5 },
  tiktok: { min: 1, max: 2 },
  youtube: { min: 1, max: 1 },
}

export const PLATFORM_QUEUE_PRIORITY: Record<CampaignPlatform, { priority: number; label: string; reason: string }> = {
  pinterest: {
    priority: 60,
    label: "high-volume visual discovery",
    reason: "Pinterest has the highest safe daily capacity and is strong for visual product discovery.",
  },
  x_twitter: {
    priority: 70,
    label: "fast social rotation",
    reason: "X/Twitter can run more daily posts when connected and supports fast product rotation.",
  },
  facebook_page: {
    priority: 80,
    label: "primary broad audience",
    reason: "Facebook is a primary broad-audience channel when API and media are ready.",
  },
  instagram_professional: {
    priority: 90,
    label: "visual social",
    reason: "Instagram is prioritized for strong product images and visual hooks.",
  },
  linkedin: {
    priority: 100,
    label: "professional/B2B fit",
    reason: "LinkedIn is prioritized for SaaS, work tools, and professional products.",
  },
  tiktok: {
    priority: 110,
    label: "video only",
    reason: "TikTok stays behind image channels unless a real video asset exists.",
  },
  youtube: {
    priority: 120,
    label: "video only",
    reason: "YouTube Shorts stays behind image channels unless a real video asset exists.",
  },
  medium: {
    priority: 130,
    label: "long-form review",
    reason: "Medium is lower-volume and should be used for quality long-form reviews.",
  },
  substack: {
    priority: 140,
    label: "long-form newsletter",
    reason: "Substack is lower-volume and should be used for quality long-form reviews.",
  },
  quora: {
    priority: 900,
    label: "community bridge only",
    reason: "Quora is excluded from the normal auto queue and uses public review bridge links only.",
  },
  reddit: {
    priority: 910,
    label: "community bridge only",
    reason: "Reddit is excluded from the normal auto queue and uses public review bridge links only.",
  },
  mastodon: {
    priority: 75,
    label: "open social, fast rotation",
    reason: "Mastodon has a permanent token, no approval, and supports image + link posts at good cadence.",
  },
  threads: {
    priority: 85,
    label: "Meta social reach",
    reason: "Threads (via Meta) reaches a large audience for short image + link posts once the token is connected.",
  },
}

export function isAutoQueuePlatform(platform: CampaignPlatform) {
  return AUTO_QUEUE_PLATFORMS.includes(platform)
}

export function getPlatformQueuePriority(platform: CampaignPlatform) {
  return PLATFORM_QUEUE_PRIORITY[platform]?.priority ?? 500
}

export function getPlatformQueuePriorityReason(platform: CampaignPlatform) {
  return PLATFORM_QUEUE_PRIORITY[platform]?.reason ?? "Default queue priority."
}

export function comparePlatformQueuePriority(left: CampaignPlatform, right: CampaignPlatform) {
  const priorityDiff = getPlatformQueuePriority(left) - getPlatformQueuePriority(right)
  if (priorityDiff !== 0) return priorityDiff
  return left.localeCompare(right)
}

export function planScheduledPublishTime(input: {
  productId: string
  platform: CampaignPlatform
  existingQueue: SchedulePolicyItem[]
  publishedRecords: PublishedItem[]
  now?: Date
}) {
  const existingJobs = input.existingQueue.map((item) => ({
      ...item,
      status: normalizeQueueStatusForSchedulePolicy(item.status),
    }))
  let searchFrom = input.now ?? new Date()
  const capacity = PLATFORM_DAILY_CAPACITY[input.platform]

  for (let attempt = 0; attempt < 70; attempt += 1) {
    const plan = planNextPublishSlot({
      productId: input.productId,
      platform: input.platform,
      existingJobs,
      publishedRecords: input.publishedRecords,
      now: searchFrom,
    })
    const day = plan.scheduledAt.slice(0, 10)
    const platformItemsToday = existingJobs.filter(
      (item) =>
        item.platform === input.platform &&
        item.scheduledAt &&
        item.scheduledAt.slice(0, 10) === day,
    )
    if (!capacity || platformItemsToday.length < capacity.max) return plan
    searchFrom = new Date(`${day}T00:00:00.000Z`)
    searchFrom.setUTCDate(searchFrom.getUTCDate() + 1)
  }

  return planNextPublishSlot({
    productId: input.productId,
    platform: input.platform,
    existingJobs,
    publishedRecords: input.publishedRecords,
    now: searchFrom,
  })
}

function normalizeQueueStatusForSchedulePolicy(status?: string | null) {
  if (!status) return status
  if (status === "published" || status === "failed" || status === "paused") return status
  return "approved_waiting_executor"
}

export function deriveScheduledPublishStatus(input: {
  platform: CampaignPlatform
  productMedia: Parameters<typeof evaluatePlatformMediaReadiness>[1]
  platformReady: boolean
  executorReady: boolean
  publishAt: string
  now?: Date
}): ScheduledPublishStatus {
  const media = evaluatePlatformMediaReadiness(input.platform, input.productMedia)
  if (!media.mediaReady) return "waiting_media"
  if (!input.platformReady) return "waiting_platform_connection"
  if (!input.executorReady) return "waiting_executor"
  const nowMs = (input.now ?? new Date()).getTime()
  return Date.parse(input.publishAt) <= nowMs ? "ready_to_publish" : "scheduled"
}

export function isScheduledItemDue(item: { publishAt?: string | null; publish_at?: string | null }, now = new Date()) {
  const publishAt = item.publishAt ?? item.publish_at ?? null
  return Boolean(publishAt && Date.parse(publishAt) <= now.getTime())
}

export function isQueueStatusMaterializable(status: ScheduledPublishStatus) {
  return status === "ready_to_publish" || status === "scheduled" || status === "waiting_executor"
}

export function schedulePolicyNotes(platform: CampaignPlatform) {
  const capacity = PLATFORM_DAILY_CAPACITY[platform]
  const queuePriority = PLATFORM_QUEUE_PRIORITY[platform]
  return [
    `policy=${PUBLISHING_SCHEDULE_POLICY_VERSION}`,
    `platform_priority=${getPlatformQueuePriority(platform)}`,
    queuePriority ? `platform_priority_label=${queuePriority.label}` : "platform_priority_label=default",
    capacity ? `daily_capacity=${capacity.min}-${capacity.max}` : "daily_capacity=default",
    "same_platform_gap=240m",
    "global_gap=15m",
    "rotate_products=true",
  ]
}
