# Operator Guide

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
