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

export function isAutoQueuePlatform(platform: CampaignPlatform) {
  return AUTO_QUEUE_PLATFORMS.includes(platform)
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
  return [
    `policy=${PUBLISHING_SCHEDULE_POLICY_VERSION}`,
    capacity ? `daily_capacity=${capacity.min}-${capacity.max}` : "daily_capacity=default",
    "same_platform_gap=240m",
    "global_gap=15m",
    "rotate_products=true",
  ]
}
