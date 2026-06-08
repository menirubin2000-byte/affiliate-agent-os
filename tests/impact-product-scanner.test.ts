import assert from "node:assert/strict"
import test from "node:test"

import { parseImpactProductsCsv, parseImpactProductsPayload } from "@/lib/impact-product-importer"
import { scoreImpactProductCandidate } from "@/lib/impact-product-scoring"

test("Impact scanner recommends approved candidates with good economics", () => {
  const result = scoreImpactProductCandidate({
    externalId: "impact-1",
    productName: "Acme AI Marketing Suite",
    brand: "Acme",
    category: "SaaS marketing software",
    payout: 30,
    payoutType: "percent",
    epc: 8,
    conversionRate: 4,
    recentSales: 30,
    imageUrl: "https://example.com/image.jpg",
    landingPage: "https://example.com/product",
    relationshipStatus: "approved",
    shippingGeo: "US, CA, UK",
  })

  assert.equal(result.status, "recommended")
  assert.equal(result.finalProductScore >= 80, true)
  assert.equal(result.rejectReasons.length, 0)
  assert.equal(result.platformFit.includes("LinkedIn"), true)
})

test("Impact scanner rejects zero-payout products", () => {
  const result = scoreImpactProductCandidate({
    externalId: "impact-2",
    productName: "Free Trial Widget",
    payout: 0,
    epc: 10,
    conversionRate: 5,
    imageUrl: "https://example.com/image.jpg",
    landingPage: "https://example.com/product",
    relationshipStatus: "approved",
    shippingGeo: "US",
  })

  assert.equal(result.status, "reject")
  assert.equal(result.rejectReasons.includes("payout_0_do_not_promote"), true)
})

test("Impact scanner routes missing image to needs_image when otherwise viable", () => {
  const result = scoreImpactProductCandidate({
    externalId: "impact-3",
    productName: "Business Automation SaaS",
    category: "Business software",
    payout: 40,
    payoutType: "percent",
    epc: 9,
    conversionRate: 5,
    recentSales: 50,
    landingPage: "https://example.com/product",
    relationshipStatus: "approved",
    shippingGeo: "Worldwide",
  })

  assert.equal(result.status, "needs_image")
  assert.equal(result.rejectReasons.includes("missing_image"), true)
})

test("Impact CSV parser maps common export fields", () => {
  const csv = [
    "Product Name,Advertiser,Price,Currency,Commission Rate,EPC,Conversion Rate,Image URL,Landing Page,Category,Relationship Status,Shipping",
    "Guideflow,Guideflow,99,USD,25%,7.5,3.2,https://example.com/img.jpg,https://example.com,Software,Approved,Worldwide",
  ].join("\n")

  const [candidate] = parseImpactProductsCsv(csv)

  assert.equal(candidate.productName, "Guideflow")
  assert.equal(candidate.advertiser, "Guideflow")
  assert.equal(candidate.payout, 25)
  assert.equal(candidate.relationshipStatus, "approved")
})

test("Impact JSON parser supports Impact-style Items payloads", () => {
  const [candidate] = parseImpactProductsPayload({
    Items: [
      {
        Id: "123",
        Name: "Shop Product",
        AdvertiserName: "Shop Co",
        DefaultPayout: "12%",
        ImageUrl: "https://example.com/shop.jpg",
        ProductUrl: "https://example.com/shop",
        Category: "Retail",
        Status: "Pending Approval",
      },
    ],
  })

  assert.equal(candidate.externalId, "123")
  assert.equal(candidate.payout, 12)
  assert.equal(candidate.relationshipStatus, "needs_brand_approval")
})
