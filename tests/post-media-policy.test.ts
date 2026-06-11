import assert from "node:assert/strict"
import test from "node:test"

import { evaluatePostMediaGate, requiresImageForPost, validateLanguageMediaConsistency } from "@/lib/post-media-policy"

test("visual platforms require an image before publishing", () => {
  for (const platform of ["facebook_page", "instagram_professional", "pinterest", "linkedin", "medium", "substack", "x_twitter"]) {
    const gate = evaluatePostMediaGate({ platform })
    assert.equal(gate.imageRequired, true)
    assert.equal(gate.mediaReady, false)
    assert.equal(gate.mediaStatus, "missing_image")
    assert.equal(gate.blockingReason, "image_required_for_ready")
  }
})

test("final copy media URL wins over product image", () => {
  const gate = evaluatePostMediaGate({
    platform: "facebook_page",
    finalCopy: { media_asset_url: "https://cdn.example.com/final.jpg" },
    product: { image_url: "https://cdn.example.com/product.jpg" },
  })

  assert.equal(gate.mediaReady, true)
  assert.equal(gate.imageUrl, "https://cdn.example.com/final.jpg")
  assert.equal(gate.imageSource, "final_copy.media_asset_url")
})

test("product image can satisfy visual platform gate", () => {
  const gate = evaluatePostMediaGate({
    platform: "medium",
    product: { image_url: "https://cdn.example.com/product.jpg" },
  })

  assert.equal(gate.mediaReady, true)
  assert.equal(gate.imageSource, "product.image_url")
})

test("Quora and Reddit do not use the visual image gate", () => {
  assert.equal(requiresImageForPost("quora"), false)
  assert.equal(evaluatePostMediaGate({ platform: "quora" }).mediaReady, true)
  assert.equal(evaluatePostMediaGate({ platform: "reddit" }).mediaStatus, "not_required")
})

// ---------------------------------------------------------------------------
// Language–media consistency
// ---------------------------------------------------------------------------

test("Hebrew image with English copy is blocked", () => {
  const result = validateLanguageMediaConsistency({
    language: "en",
    imageUrl: "https://cdn.example.com/he-image.jpg",
    product: {
      image_url: "https://cdn.example.com/en-image.jpg",
      image_url_he: "https://cdn.example.com/he-image.jpg",
    },
  })
  assert.equal(result.consistent, false)
  assert.equal(result.reason, "language_mismatch_media_copy")
})

test("English image with Hebrew copy is blocked", () => {
  const result = validateLanguageMediaConsistency({
    language: "he",
    imageUrl: "https://cdn.example.com/en-image.jpg",
    product: {
      image_url: "https://cdn.example.com/en-image.jpg",
      image_url_he: "https://cdn.example.com/he-image.jpg",
    },
  })
  assert.equal(result.consistent, false)
  assert.equal(result.reason, "language_mismatch_media_copy")
})

test("Hebrew image with Hebrew copy is allowed", () => {
  const result = validateLanguageMediaConsistency({
    language: "he",
    imageUrl: "https://cdn.example.com/he-image.jpg",
    product: {
      image_url: "https://cdn.example.com/en-image.jpg",
      image_url_he: "https://cdn.example.com/he-image.jpg",
    },
  })
  assert.equal(result.consistent, true)
  assert.equal(result.reason, null)
})

test("English image with English copy is allowed", () => {
  const result = validateLanguageMediaConsistency({
    language: "en",
    imageUrl: "https://cdn.example.com/en-image.jpg",
    product: {
      image_url: "https://cdn.example.com/en-image.jpg",
      image_url_he: "https://cdn.example.com/he-image.jpg",
    },
  })
  assert.equal(result.consistent, true)
  assert.equal(result.reason, null)
})

test("product with only one image passes for any language", () => {
  const result = validateLanguageMediaConsistency({
    language: "he",
    imageUrl: "https://cdn.example.com/only-image.jpg",
    product: {
      image_url: "https://cdn.example.com/only-image.jpg",
      image_url_he: null,
    },
  })
  assert.equal(result.consistent, true)
})

test("no product info passes validation", () => {
  assert.equal(validateLanguageMediaConsistency({ language: "en", imageUrl: "x.jpg", product: null }).consistent, true)
  assert.equal(validateLanguageMediaConsistency({ language: null, imageUrl: "x.jpg", product: {} }).consistent, true)
})
