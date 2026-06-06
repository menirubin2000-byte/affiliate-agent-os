# Performance Metrics — Real-only Import

Affiliate Agent OS only stores `performance_metrics` rows that came from a
real external source. There is no auto-fill, no demo seed, and no
"approximate" mode. The Internal Traffic Engine reads from this table; if
the table is empty for a product, the dashboard tells MENI honestly.

## Supported sources

Adapters in `lib/performance-source-adapters.ts`. Each one declares the
columns it requires; the operator picks which source they're importing and
the adapter validates the CSV before anything is inserted.

| Source key | Label | Required columns |
| --- | --- | --- |
| `impact` | Impact.com | Action Date, Campaign, Clicks, Actions, Payout |
| `partnerstack` | PartnerStack | Date, Program, Clicks, Conversions, Commission |
| `reditus` | Reditus | date, program_name, clicks, conversions, commission |
| `systeme_io` | Systeme.io | Date, Clicks, Sales, Commission |
| `elevenlabs` | ElevenLabs Partner | Date, Clicks, Signups, Revenue |
| `medium` | Medium per-article stats | Title, Views, Reads |
| `substack` | Substack per-post stats | Post, Opens, Clicks |
| `linkedin` | LinkedIn per-post analytics | Post, Impressions, Clicks |

The adapter writes the `source` column itself (migration 025). The operator
cannot set it manually.

## What gets dropped

- Rows with `clicks=0 AND conversions=0 AND revenue=0` — no signal, no row.
- Rows whose `productHint` does not match any product by slug or name.
- Rows with non-numeric counts (reported back as a parse error).

A run that finds no matching products returns `inserted=0` so MENI can see
exactly what was rejected.

## Where to use it

`/dashboard/he/traffic-metrics`:
- Top stats: total rows, total clicks, total conversions, total revenue.
- Breakdown by source.
- Breakdown by product × channel.
- Current top picks from the Internal Traffic Engine.
- Import form: source dropdown + CSV textarea + submit.

The English `/dashboard/performance/import` page is unchanged and still
works for the generic CSV format.

## Wiring to the Internal Traffic Engine

When `performance_metrics` has rows for a product, the next render of
`/dashboard/he/approve` will pick them up automatically via
`getInternalTrafficSnapshot()`. The banner flips from "fallback זמני" to
"Internal Traffic Engine". No deployment needed.

## Migration

`supabase/migrations/025_performance_metrics_source.sql` adds a nullable
`source text` column + index. Non-destructive. Applied via
`scripts/apply-migration-025.js`.

## Tests

`tests/performance-source-adapters.test.ts` — 11 tests:
- All 8 sources registered
- Impact / PartnerStack / Medium / Substack / LinkedIn happy-path parsing
- Missing required column fails the import
- All-zero rows are dropped
- Currency / comma numbers are parsed
- One bad numeric row reported, others survive
