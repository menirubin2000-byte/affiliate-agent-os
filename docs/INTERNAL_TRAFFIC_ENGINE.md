# Internal Traffic Engine

A small additive layer that ranks the "ready for MENI approval" queue using
data Affiliate Agent OS already owns. It is opt-in by source: if no real
signal exists, the dashboard falls back to readiness ordering with a clear
banner. Nothing about the existing approval / publish_job / published_records
flow changes.

## Inputs

Read-only:

- `performance_metrics` — clicks / conversions / revenue per `(product_id, channel, recorded_at)`. Comes from affiliate-network exports (Impact / PartnerStack / Reditus) via `/dashboard/performance/import`.
- `campaign_links` — UTM-tagged tracking links per `(product_id, channel)`. The existence of an active link is itself a small priority signal because it means the loop is closed (we can actually measure traffic from this channel).

The engine touches no other table.

## Score formula

Pure function in `lib/internal-traffic-engine.ts`:

```
score = revenue * 100
      + conversions * 20
      + clicks * 1
      + (hasCampaignLink ? 5 : 0)
```

All weights come from REAL counts. There are no platform tier multipliers,
no synthetic baseline, and no inference from external systems. A row with
zero metrics and no link is dropped (no row emitted), so the snapshot only
contains `(product, platform)` pairs where some real signal exists.

## Fallback

If `getInternalTrafficSnapshot()` returns `connected: false` (no metrics,
no campaign_links for any product), the `/dashboard/he/approve` page shows:

> "Traffic Engine: אין עדיין מדדי ביצוע - מיון זמני לפי מוכנות"

The queue is then ordered by:

1. Robin Traffic Engine score (`traffic_engine_rankings`) if present
2. final_copy `updated_at` desc
3. Product name alphabetical (last-resort tie-break only)

## Priority order on the approve page

For each ready route the page now decides selection source:

| Source | Condition |
| --- | --- |
| `internal_traffic_engine` | `internalScore.score > 0` |
| `external_robin` | no internal score, but `traffic_engine_rankings` has a row for this `(product, platform)` |
| `fallback` | neither |

Each card shows the score and the underlying numbers
(clicks / conversions / revenue / hasCampaignLink). Nothing is hidden — if
you see "fallback זמני" you know there is no real signal for that row yet.

## What this does NOT change

- `approveFinalCopy`, `rejectFinalCopy`, `requestFinalCopySystemFix` — same
  server actions, same status transitions.
- `publish_jobs` are still created only after MENI approves.
- The Robin bridge (`lib/traffic-engine-db.ts`, the bridge scripts in the
  Robin repo) stays in place. It is a secondary signal source. If/when
  Robin starts writing into `traffic_engine_rankings`, those scores are
  used as the second-priority fallback below internal AAOS data.

## Tests

`tests/internal-traffic-engine.test.ts` covers the pure scoring function:
- zero signal -> zero score
- campaign_link alone -> 5
- revenue > conversions > clicks weight ordering
- monotonic in revenue
- negative input clamped
- `indexScoresByProductPlatform` keying

## How to bring the engine "online"

There is nothing to deploy. The moment real rows land in
`performance_metrics` (via CSV import at `/dashboard/performance/import`) or
in `campaign_links` (via `/dashboard/campaign-links` or the existing
`createCampaignLink` helper), the next render of the approve page picks
them up and the banner flips to "Internal Traffic Engine".
