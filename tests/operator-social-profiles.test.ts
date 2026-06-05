import assert from "node:assert/strict"
import test from "node:test"

import {
  getAffiliateSignupSocialLinks,
  getOperatorSocialProfile,
  PINTEREST_OPERATOR_PROFILE_URL,
} from "@/lib/operator-social-profiles"

test("Pinterest operator profile URL is stored as a known social profile", () => {
  const profile = getOperatorSocialProfile("pinterest")

  assert.equal(profile?.url, PINTEREST_OPERATOR_PROFILE_URL)
  assert.equal(profile?.profileUrlKnown, true)
  assert.equal(profile?.purpose, "operator_profile")
})

test("Pinterest profile URL is not an affiliate link, OAuth connection, or published record", () => {
  const profile = getOperatorSocialProfile("pinterest")

  assert.equal(profile?.isAffiliateLink, false)
  assert.equal(profile?.isOAuthConnection, false)
  assert.equal(profile?.isPublishedRecord, false)
})

test("affiliate signup helpers can use Pinterest as an additional social link", () => {
  const links = getAffiliateSignupSocialLinks()
  const pinterest = links.find((link) => link.platform === "pinterest")

  assert.equal(pinterest?.url, PINTEREST_OPERATOR_PROFILE_URL)
  assert.equal(pinterest?.purpose, "operator_profile")
})
