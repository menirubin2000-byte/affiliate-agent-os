import assert from "node:assert/strict"
import test from "node:test"

import {
  PERFORMANCE_SOURCE_ADAPTERS,
  getSourceAdapter,
  parseCsvForSource,
} from "../lib/performance-source-adapters"

test("getSourceAdapter throws on unknown key", () => {
  assert.throws(() => getSourceAdapter("not_a_source" as never))
})

test("all 8 sources are registered", () => {
  const keys = Object.keys(PERFORMANCE_SOURCE_ADAPTERS).sort()
  assert.deepEqual(keys, [
    "elevenlabs",
    "impact",
    "linkedin",
    "medium",
    "partnerstack",
    "reditus",
    "substack",
    "systeme_io",
  ])
})

test("Impact CSV parses clicks/actions/payout correctly", () => {
  const csv = [
    "Action Date,Campaign,Clicks,Actions,Payout,Sub Id 1",
    "2026-05-01,Semrush Affiliate,120,4,$80.00,linkedin_post_2026_05",
    "2026-05-02,Semrush Affiliate,50,1,$10.00,medium_article",
  ].join("\n")
  const out = parseCsvForSource(csv, "impact")
  assert.equal(out.errors.length, 0)
  assert.equal(out.rows.length, 2)
  assert.equal(out.rows[0].channel, "impact")
  assert.equal(out.rows[0].clicks, 120)
  assert.equal(out.rows[0].conversions, 4)
  assert.equal(out.rows[0].revenue, 80)
  assert.equal(out.rows[0].productHint, "Semrush Affiliate")
})

test("missing required column fails the whole import", () => {
  const csv = ["Action Date,Campaign,Clicks", "2026-05-01,X,1"].join("\n")
  const out = parseCsvForSource(csv, "impact")
  assert.equal(out.rows.length, 0)
  assert.equal(out.errors.length, 1)
  assert.match(out.errors[0].message, /Actions/)
  assert.match(out.errors[0].message, /Payout/)
})

test("Empty / all-zero rows are dropped — no synthetic metrics", () => {
  const csv = [
    "Action Date,Campaign,Clicks,Actions,Payout",
    "2026-05-01,Real Campaign,5,1,$2.50",
    "2026-05-02,Empty Campaign,0,0,$0.00",
    "2026-05-03,Empty Campaign,,,",
  ].join("\n")
  const out = parseCsvForSource(csv, "impact")
  assert.equal(out.errors.length, 0)
  assert.equal(out.rows.length, 1, "only the row with real signal survives")
  assert.equal(out.rows[0].clicks, 5)
})

test("Numbers with currency symbols and commas are parsed", () => {
  const csv = [
    "Action Date,Campaign,Clicks,Actions,Payout",
    "2026-05-01,Big,\"1,250\",10,\"$1,234.56\"",
  ].join("\n")
  const out = parseCsvForSource(csv, "impact")
  assert.equal(out.errors.length, 0)
  assert.equal(out.rows[0].clicks, 1250)
  assert.equal(out.rows[0].revenue, 1234.56)
})

test("Invalid numeric row is reported, others survive", () => {
  const csv = [
    "Action Date,Campaign,Clicks,Actions,Payout",
    "2026-05-01,Good,10,1,$5.00",
    "2026-05-02,Bad,not-a-number,1,$5.00",
  ].join("\n")
  const out = parseCsvForSource(csv, "impact")
  assert.equal(out.rows.length, 1)
  assert.equal(out.errors.length, 1)
  assert.equal(out.errors[0].rowIndex, 2)
})

test("PartnerStack adapter normalizes Commission as revenue", () => {
  const csv = [
    "Date,Program,Clicks,Conversions,Commission",
    "2026-05-01,Monday.com,40,2,$22.00",
  ].join("\n")
  const out = parseCsvForSource(csv, "partnerstack")
  assert.equal(out.errors.length, 0)
  assert.equal(out.rows[0].channel, "partnerstack")
  assert.equal(out.rows[0].clicks, 40)
  assert.equal(out.rows[0].conversions, 2)
  assert.equal(out.rows[0].revenue, 22)
  assert.equal(out.rows[0].productHint, "Monday.com")
})

test("Medium adapter prefers Reads over Views for clicks", () => {
  const csv = [
    "Title,Views,Reads",
    "ElevenLabs Review,500,210",
  ].join("\n")
  const out = parseCsvForSource(csv, "medium")
  assert.equal(out.errors.length, 0)
  assert.equal(out.rows[0].clicks, 210)
  assert.equal(out.rows[0].revenue, null)
  assert.equal(out.rows[0].conversions, null)
})

test("Substack adapter accepts Opens and Clicks, revenue stays null", () => {
  const csv = [
    "Post,Opens,Clicks",
    "Systeme.io quick review,330,28",
  ].join("\n")
  const out = parseCsvForSource(csv, "substack")
  assert.equal(out.errors.length, 0)
  assert.equal(out.rows[0].channel, "substack")
  assert.equal(out.rows[0].clicks, 28)
  assert.equal(out.rows[0].revenue, null)
})

test("LinkedIn adapter normalizes per-post impressions/clicks", () => {
  const csv = [
    "Post,Impressions,Clicks",
    "Systeme.io review post,1500,42",
  ].join("\n")
  const out = parseCsvForSource(csv, "linkedin")
  assert.equal(out.errors.length, 0)
  assert.equal(out.rows[0].channel, "linkedin")
  assert.equal(out.rows[0].clicks, 42)
})
