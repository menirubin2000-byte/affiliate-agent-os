import assert from "node:assert/strict"
import test from "node:test"

import { sortRecommendations, summarizeRecommendations } from "../lib/recommendations"
import type { Recommendation } from "../types/recommendation"

const recommendations: Recommendation[] = [
  {
    id: "info-1",
    type: "product_no_recent_records",
    severity: "info",
    title: "Old record",
    description: "Info item",
    relatedEntityType: "product",
    relatedEntityKey: "p1",
    actionLabel: "Open performance",
    actionHref: "/dashboard/performance",
  },
  {
    id: "critical-1",
    type: "failed_publishing_job",
    severity: "critical",
    title: "Publishing failed",
    description: "Critical item",
    relatedEntityType: "publishing_job",
    relatedEntityKey: "j1",
    actionLabel: "Open publishing",
    actionHref: "/dashboard/publishing",
  },
  {
    id: "warning-1",
    type: "product_low_click_volume",
    severity: "warning",
    title: "Low clicks",
    description: "Warning item",
    relatedEntityType: "product",
    relatedEntityKey: "p2",
    actionLabel: "Open performance",
    actionHref: "/dashboard/performance",
  },
]

test("summarizes recommendation severities deterministically", () => {
  assert.deepEqual(summarizeRecommendations(recommendations), {
    total: 3,
    critical: 1,
    warning: 1,
    info: 1,
  })
})

test("sorts recommendations by severity before title", () => {
  const sorted = sortRecommendations(recommendations)
  assert.deepEqual(sorted.map((item) => item.id), ["critical-1", "warning-1", "info-1"])
})
