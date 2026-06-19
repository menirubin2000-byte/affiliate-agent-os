import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_PLATFORM_DAILY_TARGETS,
  getPlatformDailyPolicy,
  planNextPublishSlot,
  PUBLISHING_SCHEDULE_POLICY,
} from "@/lib/publishing-schedule-policy"
import {
  buildPublishingSchedulePolicy,
  validatePublishingSchedulePolicyValues,
} from "@/lib/publishing-schedule-policy-db"

test("publishing schedule keeps global 15 minute gap", () => {
  const now = new Date("2026-06-08T08:00:00.000Z")
  const plan = planNextPublishSlot({
    productId: "product-b",
    platform: "facebook_page",
    now,
    existingJobs: [
      {
        productId: "product-a",
        platform: "linkedin",
        scheduledAt: "2026-06-08T08:15:00.000Z",
        status: "approved_waiting_executor",
      },
    ],
  })

  assert.equal(plan.scheduledAt, "2026-06-08T08:30:00.000Z")
  assert.ok(plan.reasons.includes("global_gap_15m"))
})

test("publishing schedule keeps four hours between same-platform posts", () => {
  const now = new Date("2026-06-08T08:00:00.000Z")
  const plan = planNextPublishSlot({
    productId: "product-b",
    platform: "facebook_page",
    now,
    existingJobs: [
      {
        productId: "product-a",
        platform: "facebook_page",
        scheduledAt: "2026-06-08T08:30:00.000Z",
        status: "approved_waiting_executor",
      },
    ],
  })

  assert.equal(plan.scheduledAt, "2026-06-08T12:30:00.000Z")
  assert.ok(plan.reasons.includes("same_platform_gap_4h"))
})

test("publishing schedule rotates same product on same platform to next day", () => {
  const now = new Date("2026-06-08T08:00:00.000Z")
  const plan = planNextPublishSlot({
    productId: "product-a",
    platform: "instagram_professional",
    now,
    existingJobs: [
      {
        productId: "product-a",
        platform: "instagram_professional",
        scheduledAt: "2026-06-08T09:00:00.000Z",
        status: "approved_waiting_executor",
      },
    ],
  })

  assert.equal(plan.scheduledAt, "2026-06-09T08:15:00.000Z")
  assert.ok(plan.reasons.includes("rotated_product_same_platform_next_day"))
})

test("publishing schedule exposes platform daily targets", () => {
  assert.deepEqual(getPlatformDailyPolicy("pinterest"), {
    targetMin: PUBLISHING_SCHEDULE_POLICY.pinterestPinsPerDay.min,
    targetMax: PUBLISHING_SCHEDULE_POLICY.pinterestPinsPerDay.max,
    note: "Pinterest may publish 5-10 Pins/day after MENI approval.",
  })
  assert.equal(getPlatformDailyPolicy("x_twitter").targetMax, 5)
  assert.equal(getPlatformDailyPolicy("medium", { longFormQualityDrops: true }).targetMax, 1)
  assert.equal(getPlatformDailyPolicy("linkedin").targetMin, 2)
})

test("publishing schedule accepts editable policy overrides", () => {
  const policy = buildPublishingSchedulePolicy({
    defaultDailyTarget: 3,
    samePlatformGapMinutes: 90,
    globalGapMinutes: 20,
    youtubeTarget: 2,
    pinterestTargetMin: 6,
    pinterestTargetMax: 8,
    xTwitterTargetMin: 4,
    xTwitterTargetMax: 6,
    mediumSubstackDailyCap: 1,
    redditQuoraManualOnly: true,
    mediumManualBrowserOnly: true,
    notes: "MENI approval remains required.",
    platformDailyTargets: {
      ...DEFAULT_PLATFORM_DAILY_TARGETS,
      linkedin: 3,
    },
  })

  const plan = planNextPublishSlot({
    productId: "product-b",
    platform: "linkedin",
    now: new Date("2026-06-08T08:00:00.000Z"),
    existingJobs: [
      {
        productId: "product-a",
        platform: "linkedin",
        scheduledAt: "2026-06-08T08:30:00.000Z",
        status: "approved_waiting_executor",
      },
    ],
    policy,
  })

  assert.equal(plan.scheduledAt, "2026-06-08T10:00:00.000Z")
  assert.ok(plan.reasons.includes("same_platform_gap_90m"))
  assert.equal(getPlatformDailyPolicy("youtube", { policy }).targetMax, 2)
})

test("publishing policy settings validation rejects invalid numbers and missing notes", () => {
  const errors = validatePublishingSchedulePolicyValues({
    defaultDailyTarget: 0,
    samePlatformGapMinutes: 15,
    globalGapMinutes: 15,
    youtubeTarget: 1,
    pinterestTargetMin: 10,
    pinterestTargetMax: 5,
    xTwitterTargetMin: 3,
    xTwitterTargetMax: 5,
    mediumSubstackDailyCap: 1,
    redditQuoraManualOnly: true,
    mediumManualBrowserOnly: true,
    notes: "",
    platformDailyTargets: DEFAULT_PLATFORM_DAILY_TARGETS,
  })

  assert.ok(errors.some((error) => error.includes("default daily target")))
  assert.ok(errors.some((error) => error.includes("Pinterest min target")))
  assert.ok(errors.some((error) => error.includes("Notes/rules text")))
})
