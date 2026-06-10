import assert from "node:assert/strict"
import test from "node:test"

import {
  extractAmazonAsin,
  getAmazonPaApiReadiness,
  isAmazonHostedImageUrl,
  isAmazonPaApiConfigured,
} from "../lib/amazon-paapi"

test("extractAmazonAsin accepts a direct ASIN", () => {
  assert.equal(extractAmazonAsin("b0gznfjymc"), "B0GZNFJYMC")
})

test("extractAmazonAsin accepts Amazon product URLs", () => {
  assert.equal(
    extractAmazonAsin("https://www.amazon.com/dp/B0GZNFJYMC?tag=rubinqs-20"),
    "B0GZNFJYMC",
  )
  assert.equal(
    extractAmazonAsin("https://www.amazon.com/Gaming-Chair/dp/B0GZNFJYMC/ref=sr_1_1"),
    "B0GZNFJYMC",
  )
})

test("Amazon API readiness stays false without server credentials", () => {
  const env = {
    AMAZON_PAAPI_ACCESS_KEY: "",
    AMAZON_PAAPI_SECRET_KEY: "",
    AMAZON_ASSOCIATE_TAG: "",
  }

  assert.equal(isAmazonPaApiConfigured(env), false)
  assert.deepEqual(getAmazonPaApiReadiness(env), {
    configured: false,
    missing: [
      "AMAZON_PAAPI_ACCESS_KEY",
      "AMAZON_PAAPI_SECRET_KEY",
      "AMAZON_ASSOCIATE_TAG",
    ],
  })
})

test("Amazon hosted image URLs are detected so manual paste can be blocked", () => {
  assert.equal(isAmazonHostedImageUrl("https://m.media-amazon.com/images/I/example.jpg"), true)
  assert.equal(isAmazonHostedImageUrl("https://images-na.ssl-images-amazon.com/images/I/example.jpg"), true)
  assert.equal(isAmazonHostedImageUrl("https://manufacturer.example.com/images/product.jpg"), false)
})
