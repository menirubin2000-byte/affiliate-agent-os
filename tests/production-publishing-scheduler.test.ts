import assert from "node:assert/strict"
import test from "node:test"

import {
  comparePlatformQueuePriority,
  deriveScheduledPublishStatus,
  getPlatformQueuePriority,
  isAutoQueuePlatform,
  isScheduledItemDue,
  planScheduledPublishTime,
  schedulePolicyNotes,
} from "@/lib/production-publishing-scheduler"

const now = new Date("2026-06-08T08:00:00.000Z")

test("scheduler spaces same platform by 4 hours", () => {
  const plan = planScheduledPublishTime({
    productId: "p2",
    platform: "facebook_page",
    now,
    existingQueue: [
      {
        productId: "p1",
        platform: "facebook_page",
        scheduledAt: "2026-06-08T08:15:00.000Z",
        status: "scheduled",
      },
    ],
    publishedRecords: [],
  })

  assert.equal(Date.parse(plan.scheduledAt) >= Date.parse("2026-06-08T12:15:00.000Z"), true)
})

test("scheduler spaces global posts by 15 minutes", () => {
  const plan = planScheduledPublishTime({
    productId: "p2",
    platform: "linkedin",
    now,
    existingQueue: [
      {
        productId: "p1",
        platform: "medium",
        scheduledAt: "2026-06-08T08:15:00.000Z",
        status: "scheduled",
      },
    ],
    publishedRecords: [],
  })

  assert.equal(Date.parse(plan.scheduledAt) >= Date.parse("2026-06-08T08:30:00.000Z"), true)
})

test("scheduler does not post same product twice on same platform in one day", () => {
  const plan = planScheduledPublishTime({
    productId: "p1",
    platform: "facebook_page",
    now,
    existingQueue: [
      {
        productId: "p1",
        platform: "facebook_page",
        scheduledAt: "2026-06-08T09:00:00.000Z",
        status: "scheduled",
      },
    ],
    publishedRecords: [],
  })

  assert.equal(plan.scheduledAt.startsWith("2026-06-09"), true)
})

test("scheduler respects default daily capacity per platform", () => {
  const plan = planScheduledPublishTime({
    productId: "p3",
    platform: "medium",
    now,
    existingQueue: [
      {
        productId: "p1",
        platform: "medium",
        scheduledAt: "2026-06-08T08:15:00.000Z",
        status: "scheduled",
      },
      {
        productId: "p2",
        platform: "medium",
        scheduledAt: "2026-06-08T12:15:00.000Z",
        status: "scheduled",
      },
    ],
    publishedRecords: [],
  })

  assert.equal(plan.scheduledAt.startsWith("2026-06-09"), true)
})

test("publish job is materializable only when publish_at is due", () => {
  assert.equal(isScheduledItemDue({ publishAt: "2026-06-08T07:59:00.000Z" }, now), true)
  assert.equal(isScheduledItemDue({ publishAt: "2026-06-08T08:01:00.000Z" }, now), false)
})

test("status routes missing media and platform connection to waiting states", () => {
  assert.equal(
    deriveScheduledPublishStatus({
      platform: "facebook_page",
      productMedia: null,
      platformReady: true,
      executorReady: true,
      publishAt: "2026-06-08T08:00:00.000Z",
      now,
    }),
    "waiting_media",
  )
  assert.equal(
    deriveScheduledPublishStatus({
      platform: "facebook_page",
      productMedia: { image_url: "https://example.com/a.jpg", image_url_he: null, image_status: "ready", video_url: null, video_status: null, video_suitable_for: null },
      platformReady: false,
      executorReady: false,
      publishAt: "2026-06-08T08:00:00.000Z",
      now,
    }),
    "waiting_platform_connection",
  )
})

test("Quora and Reddit stay out of the normal auto queue", () => {
  assert.equal(isAutoQueuePlatform("quora"), false)
  assert.equal(isAutoQueuePlatform("reddit"), false)
})

test("platform queue priority routes high-capacity visual platforms first", () => {
  assert.equal(getPlatformQueuePriority("pinterest") < getPlatformQueuePriority("medium"), true)
  assert.equal(getPlatformQueuePriority("x_twitter") < getPlatformQueuePriority("substack"), true)
  assert.equal(comparePlatformQueuePriority("pinterest", "linkedin") < 0, true)
  assert.equal(comparePlatformQueuePriority("medium", "pinterest") > 0, true)
})

test("schedule policy notes include platform priority", () => {
  const notes = schedulePolicyNotes("pinterest")

  assert.ok(notes.includes("platform_priority=60"))
  assert.ok(notes.some((note) => note.startsWith("platform_priority_label=")))
})
