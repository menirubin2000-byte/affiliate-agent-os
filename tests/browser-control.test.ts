import assert from "node:assert/strict"
import test from "node:test"

import { getPlatformPublishTarget, isValidPublishedPostUrl } from "../lib/browser-control"

test("rejects Medium editor URL as a published post URL", () => {
  assert.equal(isValidPublishedPostUrl("https://medium.com/new-story", "medium"), false)
  assert.equal(isValidPublishedPostUrl("https://medium.com/p/22595ae67b06/edit", "medium"), false)
})

test("accepts Medium article URL as a published post URL", () => {
  assert.equal(
    isValidPublishedPostUrl("https://medium.com/@Rubin-Q.S/systeme-io-review-8c4f042ceaa9", "medium"),
    true,
  )
})

test("rejects Substack home as a published post URL", () => {
  assert.equal(isValidPublishedPostUrl("https://substack.com/home", "substack"), false)
})

test("accepts Substack post URL as a published post URL", () => {
  assert.equal(isValidPublishedPostUrl("https://menirubin.substack.com/p/systemeio-review", "substack"), true)
})

test("accepts LinkedIn feed update as a published post URL", () => {
  assert.equal(
    isValidPublishedPostUrl("https://www.linkedin.com/feed/update/urn:li:activity:7466268842743422976/", "linkedin"),
    true,
  )
})

test("rejects LinkedIn feed page as a published post URL", () => {
  assert.equal(isValidPublishedPostUrl("https://www.linkedin.com/feed/", "linkedin"), false)
})

test("does not expose a generic Reddit submit target", () => {
  assert.equal(getPlatformPublishTarget("reddit"), null)
})
