import assert from "node:assert/strict"
import test from "node:test"

import {
  computeTrafficScore,
  indexScoresByProductPlatform,
  type InternalTrafficScore,
} from "../lib/internal-traffic-engine-scoring"

test("computeTrafficScore returns 0 when no signal at all", () => {
  const score = computeTrafficScore({
    revenue: 0,
    conversions: 0,
    clicks: 0,
    hasCampaignLink: false,
  })
  assert.equal(score, 0)
})

test("computeTrafficScore awards 5 for a wired campaign_link even with zero metrics", () => {
  const score = computeTrafficScore({
    revenue: 0,
    conversions: 0,
    clicks: 0,
    hasCampaignLink: true,
  })
  assert.equal(score, 5)
})

test("computeTrafficScore weights revenue heaviest, then conversions, then clicks", () => {
  // revenue $1 should outrank 1 conversion which should outrank 1 click.
  const revenue = computeTrafficScore({ revenue: 1, conversions: 0, clicks: 0, hasCampaignLink: false })
  const conv = computeTrafficScore({ revenue: 0, conversions: 1, clicks: 0, hasCampaignLink: false })
  const click = computeTrafficScore({ revenue: 0, conversions: 0, clicks: 1, hasCampaignLink: false })
  assert.equal(revenue, 100)
  assert.equal(conv, 20)
  assert.equal(click, 1)
  assert.ok(revenue > conv && conv > click)
})

test("computeTrafficScore is monotonic in revenue", () => {
  const a = computeTrafficScore({ revenue: 5, conversions: 0, clicks: 0, hasCampaignLink: false })
  const b = computeTrafficScore({ revenue: 10, conversions: 0, clicks: 0, hasCampaignLink: false })
  assert.ok(b > a)
})

test("computeTrafficScore clamps negative input to zero", () => {
  // Defensive: a corrupt row should not produce a negative score.
  const score = computeTrafficScore({
    revenue: -100,
    conversions: -1,
    clicks: -5,
    hasCampaignLink: false,
  })
  assert.equal(score, 0)
})

test("indexScoresByProductPlatform builds a key per (product, platform)", () => {
  const scores: InternalTrafficScore[] = [
    {
      productId: "p1",
      platform: "linkedin",
      score: 100,
      clicks: 10,
      conversions: 1,
      revenue: 0,
      hasCampaignLink: true,
      reason: "test",
    },
    {
      productId: "p1",
      platform: "medium",
      score: 5,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      hasCampaignLink: true,
      reason: "test",
    },
    {
      productId: "p2",
      platform: "linkedin",
      score: 200,
      clicks: 20,
      conversions: 2,
      revenue: 0,
      hasCampaignLink: false,
      reason: "test",
    },
  ]
  const index = indexScoresByProductPlatform(scores)
  assert.equal(index.size, 3)
  assert.equal(index.get("p1::linkedin")?.score, 100)
  assert.equal(index.get("p1::medium")?.score, 5)
  assert.equal(index.get("p2::linkedin")?.score, 200)
  assert.equal(index.get("p2::medium"), undefined)
})
