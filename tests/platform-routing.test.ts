import assert from "node:assert/strict"
import test from "node:test"

import {
  buildPlatformRoutingOverview,
  getPlatformRoutingDefinition,
  PLATFORM_ROUTING_DEFINITIONS,
} from "@/lib/platform-routing"

const product = {
  id: "product-1",
  name: "Ready Product",
  status: "active",
  category: "SaaS",
  affiliateLink: "https://example.com/affiliate",
  affiliateUrl: "https://example.com/affiliate",
  imageUrl: "https://example.com/image.png",
  imageUrlHe: null,
  imageStatus: "ready",
  videoUrl: null,
  videoStatus: "missing",
  videoSuitableFor: [],
}

test("Facebook stays pending setup until official API credentials are configured", () => {
  const facebook = getPlatformRoutingDefinition("facebook_page")

  assert.equal(facebook?.status, "pending_setup")
  assert.equal(facebook?.publishMode, "official_api")
  assert.equal(facebook?.setupBlocker, "facebook_page_official_api_not_configured")
})

test("central routing includes active and future platform definitions", () => {
  assert.deepEqual(
    PLATFORM_ROUTING_DEFINITIONS.map((platform) => platform.key),
    [
      "linkedin",
      "medium",
      "substack",
      "quora",
      "reddit",
      "tiktok",
      "facebook_page",
      "instagram_professional",
      "pinterest",
      "x_twitter",
      "youtube",
    ],
  )
})

test("product without a real affiliate link is blocked before publishing", () => {
  const overview = buildPlatformRoutingOverview({
    products: [{ ...product, affiliateLink: null, affiliateUrl: null }],
    affiliatePrograms: [{ productId: product.id, status: "link_ready", affiliateLink: null }],
    finalCopies: [],
    publishJobs: [],
    publishedRecords: [],
  })

  const medium = overview.products[0]?.routes.find((route) => route.platform.key === "medium")

  assert.equal(medium?.state, "missing_affiliate_link")
  assert.equal(medium?.publishedRecordId, null)
})

test("verified published route requires a real live URL", () => {
  const overview = buildPlatformRoutingOverview({
    products: [product],
    affiliatePrograms: [{ productId: product.id, status: "link_ready", affiliateLink: product.affiliateLink }],
    finalCopies: [
      {
        id: "copy-1",
        productId: product.id,
        platform: "medium",
        status: "operator_approved",
        validationStatus: "valid",
        title: "Approved copy",
        blockingReasons: [],
        language: "en" as const,
      },
    ],
    publishJobs: [],
    publishedRecords: [
      {
        id: "record-1",
        finalCopyId: "copy-1",
        productId: product.id,
        platform: "medium",
        liveUrl: "https://medium.com/@meni/real-post",
        verificationStatus: "verified",
        verifiedAt: new Date().toISOString(),
      },
    ],
  })

  const medium = overview.products[0]?.routes.find((route) => route.platform.key === "medium")

  assert.equal(medium?.state, "published_verified")
  assert.equal(medium?.liveUrl, "https://medium.com/@meni/real-post")
})

test("approved final copy without a job routes to executor work, not published", () => {
  const overview = buildPlatformRoutingOverview({
    products: [product],
    affiliatePrograms: [{ productId: product.id, status: "link_ready", affiliateLink: product.affiliateLink }],
    finalCopies: [
      {
        id: "copy-2",
        productId: product.id,
        platform: "medium",
        status: "operator_approved",
        validationStatus: "valid",
        title: "Approved copy",
        blockingReasons: [],
        language: "en" as const,
      },
    ],
    publishJobs: [],
    publishedRecords: [],
    campaignLinks: [
      {
        productId: product.id,
        source: "medium",
        finalUrl: "https://example.com/affiliate?utm_source=medium",
        status: "active",
      },
    ],
  })

  const medium = overview.products[0]?.routes.find((route) => route.platform.key === "medium")

  assert.equal(medium?.state, "ready_for_executor")
  assert.equal(medium?.publishedRecordId, null)
})

test("business READY blocks image-required platforms without a product image", () => {
  const overview = buildPlatformRoutingOverview({
    products: [{
      ...product,
      imageUrl: null,
      imageStatus: "missing",
    }],
    affiliatePrograms: [{ productId: product.id, status: "link_ready", affiliateLink: product.affiliateLink }],
    finalCopies: [
      {
        id: "copy-3",
        productId: product.id,
        platform: "medium",
        status: "ready_for_operator_approval",
        validationStatus: "valid",
        title: "Ready copy",
        blockingReasons: [],
        language: "en" as const,
      },
    ],
    publishJobs: [],
    publishedRecords: [],
  })

  const medium = overview.products[0]?.routes.find((route) => route.platform.key === "medium")

  assert.equal(medium?.state, "needs_image")
  assert.equal(medium?.mediaRequired, true)
  assert.equal(medium?.mediaReady, false)
  assert.equal(medium?.imageRequired, true)
  assert.deepEqual(medium?.mediaBlockingReasons, ["image_required_for_ready"])
})

test("missing campaign_link on a paid platform routes to needs_campaign_link, not READY", () => {
  const overview = buildPlatformRoutingOverview({
    products: [product],
    affiliatePrograms: [{ productId: product.id, status: "link_ready", affiliateLink: product.affiliateLink }],
    finalCopies: [
      {
        id: "copy-link-1",
        productId: product.id,
        platform: "linkedin",
        status: "ready_for_operator_approval",
        validationStatus: "valid",
        title: "Ready copy",
        blockingReasons: [],
        language: "en" as const,
      },
    ],
    publishJobs: [],
    publishedRecords: [],
    campaignLinks: [],
  })

  const linkedin = overview.products[0]?.routes.find((r) => r.platform.key === "linkedin")
  assert.equal(linkedin?.state, "needs_campaign_link")
  assert.equal(overview.counts.needsCampaignLink >= 1, true)
})

test("Quora bypasses campaign_link gate and uses bridge URL route state", () => {
  const overview = buildPlatformRoutingOverview({
    products: [product],
    affiliatePrograms: [{ productId: product.id, status: "link_ready", affiliateLink: product.affiliateLink }],
    finalCopies: [
      {
        id: "copy-q-1",
        productId: product.id,
        platform: "quora",
        status: "ready_for_operator_approval",
        validationStatus: "valid",
        title: "Ready copy",
        blockingReasons: [],
        language: "en" as const,
      },
    ],
    publishJobs: [],
    publishedRecords: [],
    campaignLinks: [],
  })

  const quora = overview.products[0]?.routes.find((r) => r.platform.key === "quora")
  assert.equal(quora?.state, "bridge_url_platform")
})

test("missing_final_copy is counted separately from needs_system_fix", () => {
  const overview = buildPlatformRoutingOverview({
    products: [product],
    affiliatePrograms: [{ productId: product.id, status: "link_ready", affiliateLink: product.affiliateLink }],
    finalCopies: [],
    publishJobs: [],
    publishedRecords: [],
    campaignLinks: [
      {
        productId: product.id,
        source: "medium",
        finalUrl: "https://example.com/affiliate?utm_source=medium",
        status: "active",
      },
    ],
  })

  const medium = overview.products[0]?.routes.find((r) => r.platform.key === "medium")
  assert.equal(medium?.state, "missing_final_copy")
  assert.equal(overview.counts.needsFinalCopy >= 1, true)
  // missing_final_copy must NOT show up in needs_system_fix any more.
  assert.equal(overview.counts.needsSystemFix, 0)
})
