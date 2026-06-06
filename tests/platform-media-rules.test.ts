import assert from "node:assert/strict"
import test from "node:test"

import {
  evaluatePlatformMediaReadiness,
  getPlatformMediaRule,
} from "@/lib/platform-media-rules"

test("image platforms require product image for AAOS READY", () => {
  const medium = evaluatePlatformMediaReadiness("medium", {
    imageStatus: "missing",
    imageUrl: null,
    imageUrlHe: null,
  })

  assert.equal(medium.mediaRequired, true)
  assert.equal(medium.imageRequired, true)
  assert.equal(medium.videoRequired, false)
  assert.equal(medium.publishMediaMode, "image")
  assert.equal(medium.mediaReady, false)
  assert.deepEqual(medium.blockingReasons, ["image_required_for_ready"])
})

test("video platforms require product video for AAOS READY", () => {
  const youtube = evaluatePlatformMediaReadiness("youtube", {
    videoStatus: "missing",
    videoUrl: null,
  })

  assert.equal(youtube.mediaRequired, true)
  assert.equal(youtube.imageRequired, false)
  assert.equal(youtube.videoRequired, true)
  assert.equal(youtube.publishMediaMode, "video")
  assert.equal(youtube.mediaReady, false)
  assert.deepEqual(youtube.blockingReasons, ["video_required_for_ready"])
})

test("Quora and Reddit are manual-only and never automatic READY", () => {
  for (const platform of ["quora", "reddit"]) {
    const rule = getPlatformMediaRule(platform)
    const readiness = evaluatePlatformMediaReadiness(platform, {
      imageStatus: "ready",
      videoStatus: "ready",
    })

    assert.equal(rule.publishMediaMode, "manual_only")
    assert.equal(readiness.mediaReady, false)
    assert.deepEqual(readiness.blockingReasons, ["manual_platform_not_auto_ready"])
  }
})
