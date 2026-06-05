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
}

test("Facebook stays pending setup in central platform routing", () => {
  const facebook = getPlatformRoutingDefinition("facebook_page")

  assert.equal(facebook?.status, "pending_setup")
  assert.equal(facebook?.publishMode, "official_api")
  assert.equal(facebook?.setupBlocker, "facebook_page_pending_setup")
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
      },
    ],
    publishJobs: [],
    publishedRecords: [],
  })

  const medium = overview.products[0]?.routes.find((route) => route.platform.key === "medium")

  assert.equal(medium?.state, "ready_for_executor")
  assert.equal(medium?.publishedRecordId, null)
})
