import assert from "node:assert/strict"
import test from "node:test"

import { buildYouTubeDistributionWorkflowView } from "../lib/youtube-distribution-workflow"
import type { CampaignLink } from "../types/campaign-link"
import type { PerformanceMetric } from "../types/performance"
import type { Product } from "../types/product"
import type { YouTubeDistributionWorkflow } from "../types/youtube-distribution-workflow"

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    name: "Acme SEO Suite",
    slug: "acme-seo-suite",
    brand: "Acme",
    category: "SEO software",
    affiliateLink: "https://example.com/ref/acme",
    affiliateUrl: "https://example.com/ref/acme",
    price: 99,
    commissionRate: 30,
    notes: "lean teams that need a quick evaluation before buying",
    targetKeyword: "acme seo suite review",
    secondaryKeywords: ["seo review", "seo workflow"],
    searchIntent: "Commercial investigation",
    contentAngle: "Practical evaluation for small teams",
    status: "active",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
    ...overrides,
  }
}

function makeLink(overrides: Partial<CampaignLink> = {}): CampaignLink {
  return {
    id: "link-1",
    productId: "product-1",
    productName: "Acme SEO Suite",
    name: "YouTube description CTA",
    channel: "youtube",
    campaignName: "acme-youtube",
    source: "youtube",
    medium: "video",
    term: null,
    content: null,
    baseUrl: "https://example.com/ref/acme",
    finalUrl: "https://example.com/ref/acme?utm_source=youtube&utm_medium=video&utm_campaign=acme-youtube",
    notes: null,
    status: "active",
    createdAt: "2026-06-11T00:00:00.000Z",
    updatedAt: "2026-06-11T00:00:00.000Z",
    ...overrides,
  }
}

function makeMetric(overrides: Partial<PerformanceMetric> = {}): PerformanceMetric {
  return {
    id: "metric-1",
    productId: "product-1",
    productName: "Acme SEO Suite",
    productSlug: "acme-seo-suite",
    draftId: null,
    draftTitle: null,
    draftTemplateType: null,
    campaignLinkId: "link-1",
    channel: "youtube",
    campaignName: "acme-youtube",
    clicks: 12,
    conversions: 2,
    revenue: 99,
    notes: null,
    recordedAt: "2026-06-12T00:00:00.000Z",
    createdAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  }
}

function makeWorkflow(overrides: Partial<YouTubeDistributionWorkflow> = {}): YouTubeDistributionWorkflow {
  return {
    id: "workflow-1",
    productId: "product-1",
    status: "published_youtube",
    youtubePostingMethod: "browser",
    redditPostingMethod: "browser",
    quoraPostingMethod: "browser",
    mediumPostingMethod: "manual",
    youtubeVideoIdea: "Video idea",
    youtubeTitle: "YouTube title",
    thumbnailAngle: "Thumbnail angle",
    shortScript: "Short script",
    longVideoOutline: "Long outline",
    descriptionWithDisclosure: "Description with disclosure",
    pinnedCommentText: "Pinned comment",
    redditVariantA: "Reddit A",
    redditVariantB: "Reddit B",
    quoraVariantA: "Quora A",
    quoraVariantB: "Quora B",
    mediumVariant: "Medium variant",
    recommendedCta: "CTA",
    youtubeUrl: "https://www.youtube.com/watch?v=abc123",
    redditSharedUrl: null,
    quoraSharedUrl: null,
    mediumSharedUrl: null,
    youtubeViews: 300,
    campaignLinkId: "link-1",
    campaignLinkUrl: "https://example.com/ref/acme?utm_source=youtube&utm_medium=video&utm_campaign=acme-youtube",
    notes: null,
    createdAt: "2026-06-11T00:00:00.000Z",
    updatedAt: "2026-06-11T00:00:00.000Z",
    ...overrides,
  }
}

test("buildYouTubeDistributionWorkflowView uses saved workflow and scoped campaign-link tracking", () => {
  const view = buildYouTubeDistributionWorkflowView({
    product: makeProduct(),
    workflow: makeWorkflow(),
    campaignLinks: [makeLink()],
    records: [
      makeMetric({ id: "m1", channel: "youtube", clicks: 20, conversions: 3, revenue: 120 }),
      makeMetric({ id: "m2", channel: "reddit", clicks: 5, conversions: 1, revenue: 50 }),
      makeMetric({ id: "m3", campaignLinkId: "other-link", channel: "youtube", clicks: 99, conversions: 0, revenue: 0 }),
    ],
  })

  assert.equal(view.statusLabel, "Published on YouTube")
  assert.equal(view.totalClicks, 25)
  assert.equal(view.totalConversions, 4)
  assert.ok(view.nextAction.includes("Reddit"))
  assert.equal(view.values.campaignLinkId, "link-1")
})

test("buildYouTubeDistributionWorkflowView falls back to suggested YouTube-first copy", () => {
  const view = buildYouTubeDistributionWorkflowView({
    product: makeProduct(),
    workflow: null,
    campaignLinks: [],
    records: [],
  })

  assert.equal(view.statusLabel, "Not saved yet")
  assert.ok(view.values.youtubeTitle.toLowerCase().includes("review"))
  assert.ok(view.values.descriptionWithDisclosure.includes("Affiliate disclosure"))
  assert.ok(view.values.recommendedCta.includes("tracked link"))
  assert.ok(view.nextAction.includes("Save the YouTube-first plan"))
})

test("buildYouTubeDistributionWorkflowView moves to tracking when URLs are present", () => {
  const view = buildYouTubeDistributionWorkflowView({
    product: makeProduct(),
    workflow: makeWorkflow({
      status: "tracking",
      redditSharedUrl: "https://reddit.com/r/test/123",
      quoraSharedUrl: "https://www.quora.com/test-answer",
      mediumSharedUrl: "https://medium.com/@demo/test",
    }),
    campaignLinks: [makeLink()],
    records: [makeMetric()],
  })

  assert.equal(view.statusLabel, "Tracking")
  assert.ok(view.nextAction.includes("Review the tracked results"))
  assert.equal(view.performanceByChannel.find((item) => item.channel === "youtube")?.clicks, 12)
})
