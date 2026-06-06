# Operator Guide

## 🔥 Rule 0 — Browser MCP is pre-authorized. Do not stop. Do not ask again.

MENI's Claude in Chrome extension has standing permission for these domains:
`linkedin.com`, `medium.com`, `menirubin.substack.com`, `he.quora.com`,
`db.gbkwydsodondarccqyet.supabase.co`.

When MENI says "publish" or "do N products", that is a complete batch
authorization for those N items. Do not stop mid-batch to re-ask. The
login session is real even if the first redirect shows a login screen —
wait, re-read, then proceed. Never enter passwords/tokens.

Repeated mistake to avoid: stopping mid-publish-batch to seek a fresh
confirmation. Don't.


> One-page guide for MENI. Every claim here is verifiable in the live DB.
> Use `scripts/export-truth.js` to refresh `docs/OPERATOR_SOURCE_OF_TRUTH.md`
> whenever you want to confirm the numbers.

## Daily flow

1. Open https://affiliate-agent-os.vercel.app/dashboard/he .
2. Look at the operator dashboard cards:
   - **ממתינים לאישור MENI** — open `/dashboard/he/approve` and approve / reject / request fix.
   - **מוכן למנוע פרסום** — open `/dashboard/he/publish-ready` and confirm prepared publish jobs.
   - **חסומים** — open `/dashboard/he/content-review` to see why. These are system-side fixes,
     not operator tasks.
   - **פורסם ואומת** — read-only proof that real URLs exist in `published_records`.
3. The lower **רשימת פלטפורמות מרכזית** card shows every platform in the registry, including
   `pending_setup` blockers for Facebook, Instagram, Pinterest, X, YouTube.

## Hard rules (enforced)

- Operator decisions only via the Hebrew dashboard. Never via SQL or scripts.
- `final_copies` is the canonical content layer. Drafts are legacy.
- A post counts as published **only** when there is a `published_records` row with
  `verification_status='verified'` and a non-empty `live_url`. Anything else is in progress.
- Quora and Reddit final copies cannot contain a direct affiliate link in the body.
- TikTok cannot publish text. A video asset is required.
- Direct publishing scripts (`scripts/publish-*.js`) are guarded by
  `scripts/safety-guard.js` and will refuse to run without explicit override env vars.
  Use the dashboard instead.

## When you need real numbers

Run:

```
node scripts/export-truth.js
```

This refreshes `docs/OPERATOR_SOURCE_OF_TRUTH.md` from Supabase. It includes:

- per-table row counts,
- per-product affiliate readiness,
- per-platform `final_copies` breakdown,
- `publish_jobs` status histogram,
- the actual list of verified published records.

Trust that file over chat memory.

## Traffic Engine bridge (Robin Marketing Automation)

The "ready for MENI approval" queue on `/dashboard/he/approve` is ordered by
Traffic Engine score when one exists. The score is NOT produced inside this
repo. It comes from **Robin Marketing Automation** at
`C:\Users\USER\Documents\תוכנת פירסום רובין`, which owns the SEO / GSC /
keyword tracking signal.

Two scripts in that repo do the bridge:

- `scripts/bridge/bridge_pull.py` — Affiliate Agent OS -> Robin. Syncs
  products into Robin `projects`, target_keywords into `keyword_targets`,
  verified `published_records` URLs into `monitored_pages`. Robin learns
  what to track. Nothing is published.
- `scripts/bridge/bridge_push.py` — Robin -> Affiliate Agent OS. Aggregates
  Robin's `keyword_observations` into `(product_id, platform, score)` rows
  and UPSERTs them into Supabase `traffic_engine_rankings`. Only writes
  rows for products that actually have GSC signal; everything else stays
  on fallback.

Run both:

```
cd C:\Users\USER\Documents\תוכנת פירסום רובין
python -m scripts.bridge.bridge_run
```

Honesty rule: if `traffic_engine_rankings` is empty, the dashboard banner
says "Traffic Engine לא מחובר עדיין - fallback זמני". We never invent a
score on the Affiliate Agent OS side.
