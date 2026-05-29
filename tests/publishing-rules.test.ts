import assert from "node:assert/strict"
import test from "node:test"

import {
  assertDraftStatusTransition,
  getDraftStatusTransitionMessage,
  getPublishingEligibility,
} from "../lib/publishing-rules"

test("blocks moving a reviewed draft back to draft", () => {
  assert.equal(
    getDraftStatusTransitionMessage("approved", "draft"),
    "Drafts cannot be moved back to draft through the approval workflow.",
  )
})

test("allows only approved drafts into the publishing queue", () => {
  assert.deepEqual(getPublishingEligibility({ draftStatus: "draft", alreadySentToWordPress: false }), {
    allowed: false,
    message: "Only approved drafts can be sent to WordPress.",
  })

  assert.deepEqual(
    getPublishingEligibility({ draftStatus: "approved", alreadySentToWordPress: false }),
    {
      allowed: true,
      message: "Draft is eligible for WordPress queueing.",
    },
  )
})

test("throws for invalid approval state transitions", () => {
  assert.throws(
    () => assertDraftStatusTransition("rejected", "approved"),
    /Only drafts that are still awaiting review can be approved or rejected/,
  )
})
