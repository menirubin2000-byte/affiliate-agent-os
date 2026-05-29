import assert from "node:assert/strict"
import test from "node:test"

import type { DraftChangeSource, DraftVersion } from "../types/draft-version"

function computeNextVersionNumber(versions: Array<{ versionNumber: number }>): number {
  if (versions.length === 0) return 1
  const max = versions.reduce((m, v) => Math.max(m, v.versionNumber), 0)
  return max + 1
}

function validateRestoreGuard(params: {
  draftId: string
  version: DraftVersion | null
}): string | null {
  if (!params.version) return "Version not found."
  if (params.version.contentDraftId !== params.draftId) return "Version does not belong to this draft."
  return null
}

const validChangeSource: DraftChangeSource[] = [
  "manual",
  "structured_paste",
  "fallback_generation",
  "system",
]

test("next version number is 1 for empty version list", () => {
  assert.equal(computeNextVersionNumber([]), 1)
})

test("next version number increments from max", () => {
  const versions = [
    { versionNumber: 1 },
    { versionNumber: 2 },
    { versionNumber: 3 },
  ]
  assert.equal(computeNextVersionNumber(versions), 4)
})

test("next version number handles gaps", () => {
  const versions = [
    { versionNumber: 1 },
    { versionNumber: 5 },
  ]
  assert.equal(computeNextVersionNumber(versions), 6)
})

test("restore guard rejects null version", () => {
  const error = validateRestoreGuard({ draftId: "draft-1", version: null })
  assert.equal(error, "Version not found.")
})

test("restore guard rejects version from different draft", () => {
  const version: DraftVersion = {
    id: "v-1",
    contentDraftId: "draft-2",
    versionNumber: 1,
    title: "Test",
    body: "Body",
    metaTitle: null,
    metaDescription: null,
    targetKeyword: null,
    qualityChecks: {
      has_disclosure: false,
      has_clear_cta: false,
      has_target_keyword: false,
      has_meta_title: false,
      has_meta_description: false,
      avoids_fake_claims: false,
      has_required_structure: false,
    },
    changeSource: "manual",
    changeNotes: null,
    createdAt: "2025-01-01T00:00:00.000Z",
  }

  const error = validateRestoreGuard({ draftId: "draft-1", version })
  assert.equal(error, "Version does not belong to this draft.")
})

test("restore guard passes for matching draft", () => {
  const version: DraftVersion = {
    id: "v-1",
    contentDraftId: "draft-1",
    versionNumber: 1,
    title: "Test",
    body: "Body",
    metaTitle: null,
    metaDescription: null,
    targetKeyword: null,
    qualityChecks: {
      has_disclosure: false,
      has_clear_cta: false,
      has_target_keyword: false,
      has_meta_title: false,
      has_meta_description: false,
      avoids_fake_claims: false,
      has_required_structure: false,
    },
    changeSource: "manual",
    changeNotes: null,
    createdAt: "2025-01-01T00:00:00.000Z",
  }

  const error = validateRestoreGuard({ draftId: "draft-1", version })
  assert.equal(error, null)
})

test("valid change sources match expected values", () => {
  assert.deepEqual(validChangeSource, [
    "manual",
    "structured_paste",
    "fallback_generation",
    "system",
  ])
})

test("DraftVersion type has all expected fields", () => {
  const version: DraftVersion = {
    id: "v-1",
    contentDraftId: "draft-1",
    versionNumber: 1,
    title: "Title",
    body: "Body text",
    metaTitle: "Meta",
    metaDescription: "Description",
    targetKeyword: "keyword",
    qualityChecks: {
      has_disclosure: true,
      has_clear_cta: true,
      has_target_keyword: true,
      has_meta_title: true,
      has_meta_description: true,
      avoids_fake_claims: true,
      has_required_structure: true,
    },
    changeSource: "structured_paste",
    changeNotes: "Pasted from Claude Code",
    createdAt: "2025-06-01T12:00:00.000Z",
  }

  assert.equal(version.id, "v-1")
  assert.equal(version.versionNumber, 1)
  assert.equal(version.changeSource, "structured_paste")
  assert.equal(version.changeNotes, "Pasted from Claude Code")
  assert.equal(version.qualityChecks.has_disclosure, true)
})
