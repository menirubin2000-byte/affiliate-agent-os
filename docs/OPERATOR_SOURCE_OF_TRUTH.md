# Operator Source of Truth

_Generated: 2026-06-07T17:16:00.892Z_

Numbers come from the production routing function via `scripts/audit-via-prod.ts`.
They match `/dashboard/he` exactly.

## Operator-facing buckets

- **ממתינים לאישור MENI:** 50
- **אושר ומוכן לפרסום:** 54
- **פורסם ואומת:** 16
- **חסר campaign_link:** 0
- **חסר תמונה:** 0
- **חסר וידאו:** 0
- **חסר קופי לפלטפורמה:** 0
- **צריך תיקון מערכת:** 0
- **ידני בלבד (Quora/Reddit):** 48
- **ממתין להגדרת פלטפורמה (OAuth/setup):** 48
- **חסומים אמיתיים:** 24

## Underlying route states (raw)
- manual_only_platform: 48
- pending_meni_approval: 50
- platform_disabled: 24
- platform_pending_setup: 72
- published_verified: 16
- ready_for_executor: 54

## Guarantees enforced by code
- ✅ no_ready_without_campaign_link
- ✅ no_ready_without_media
- ✅ no_quora_reddit_in_ready
- ✅ no_published_verified_counted_as_blocked

## Routing rule recap
A route reaches "pending_meni_approval" only if ALL of:
1. Platform is active.
2. Product is link_ready with a real affiliate link.
3. Final Copy exists with validation_status='valid'.
4. Required media is present (image for paid surfaces, video for video surfaces).
5. Active campaign_link exists for paid surfaces.
6. Final Copy status ∈ {ready_for_operator_approval, validated}.
Quora/Reddit are manual_only (never auto-ready). TikTok is disabled (video gating).