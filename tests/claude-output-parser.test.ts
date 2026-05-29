import assert from "node:assert/strict"
import test from "node:test"

import { parseClaudeOutput } from "../lib/claude-output-parser"

test("parses full structured output", () => {
  const input = `Title: Best Widget Review
Meta Title: Best Widget Review 2025
Meta Description: An honest look at the best widget on the market.
Target Keyword: best widget
Body:
This is the body of the draft.

It has multiple paragraphs.

And a third one.`

  const result = parseClaudeOutput(input)

  assert.equal(result.title, "Best Widget Review")
  assert.equal(result.metaTitle, "Best Widget Review 2025")
  assert.equal(result.metaDescription, "An honest look at the best widget on the market.")
  assert.equal(result.targetKeyword, "best widget")
  assert.ok(result.body?.includes("This is the body of the draft."))
  assert.ok(result.body?.includes("And a third one."))
})

test("handles alternative labels", () => {
  const input = `SEO Title: My SEO Title
SEO Description: My SEO description here.
Keyword: primary keyword
Content:
Some body content here.`

  const result = parseClaudeOutput(input)

  assert.equal(result.metaTitle, "My SEO Title")
  assert.equal(result.metaDescription, "My SEO description here.")
  assert.equal(result.targetKeyword, "primary keyword")
  assert.equal(result.body, "Some body content here.")
  assert.equal(result.title, null)
})

test("handles underscore labels", () => {
  const input = `Title: Test Draft
meta_title: underscore meta
meta_description: underscore desc
target_keyword: underscore keyword
Body:
Underscore body.`

  const result = parseClaudeOutput(input)

  assert.equal(result.title, "Test Draft")
  assert.equal(result.metaTitle, "underscore meta")
  assert.equal(result.metaDescription, "underscore desc")
  assert.equal(result.targetKeyword, "underscore keyword")
  assert.equal(result.body, "Underscore body.")
})

test("missing optional fields return null", () => {
  const input = `Body:
Just a body with no other fields.`

  const result = parseClaudeOutput(input)

  assert.equal(result.title, null)
  assert.equal(result.metaTitle, null)
  assert.equal(result.metaDescription, null)
  assert.equal(result.targetKeyword, null)
  assert.equal(result.body, "Just a body with no other fields.")
})

test("body with multiple paragraphs preserved", () => {
  const input = `Title: Multi-paragraph test
Body:
First paragraph.

Second paragraph with details.

Third paragraph conclusion.`

  const result = parseClaudeOutput(input)

  assert.equal(result.title, "Multi-paragraph test")
  assert.ok(result.body?.includes("First paragraph."))
  assert.ok(result.body?.includes("Second paragraph with details."))
  assert.ok(result.body?.includes("Third paragraph conclusion."))
})

test("unknown text does not crash", () => {
  const input = "This is just some random text without any labels."

  const result = parseClaudeOutput(input)

  assert.equal(result.title, null)
  assert.equal(result.metaTitle, null)
  assert.equal(result.metaDescription, null)
  assert.equal(result.targetKeyword, null)
  assert.equal(result.body, null)
})

test("empty string does not crash", () => {
  const result = parseClaudeOutput("")

  assert.equal(result.title, null)
  assert.equal(result.body, null)
})

test("handles Windows-style line endings", () => {
  const input = "Title: CRLF test\r\nBody:\r\nLine one.\r\nLine two."

  const result = parseClaudeOutput(input)

  assert.equal(result.title, "CRLF test")
  assert.ok(result.body?.includes("Line one."))
  assert.ok(result.body?.includes("Line two."))
})
