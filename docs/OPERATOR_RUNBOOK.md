# Operator Runbook

Quick reference for the human operator of Affiliate Agent OS.

## Daily Routine

1. **Open Command Center** (`/dashboard/command-center`)
   - Review urgent action items (critical + high priority first).
   - Each item links directly to the relevant page.

2. **Review Drafts** (`/dashboard/drafts`)
   - Check for status=draft items waiting for approval.
   - Open Review page, read content, approve or reject with notes.

3. **Affiliate Programs** (`/dashboard/affiliate-programs`)
   - Check programs in `signup_needed` status.
   - Click Signup link, complete application manually.
   - Update status to `submitted` or `awaiting_human_approval`.
   - When approved, paste the affiliate link.

4. **Performance** (`/dashboard/performance`)
   - Record or import weekly performance data.
   - Ensure each active campaign link has at least one record.

5. **Data Quality** (`/dashboard/data-quality`)
   - Review any critical or warning issues.
   - Fix missing URLs, keyword gaps, and orphan records.

## What Only the Operator Can Do

| Action | Why |
|--------|-----|
| Approve/reject drafts | Human editorial judgment |
| Sign up for affiliate programs | 2FA, CAPTCHA, identity verification |
| Enter payment details | Security policy |
| Accept terms of service | Legal responsibility |
| Provide API keys / credentials | Security boundary |
| Complete CAPTCHAs | Bot detection |
| Merge/deploy to production | Deployment authority |

## What Claude Code / Codex Handle

- Product research and data entry
- Draft generation (all AI output stays in `draft` status)
- Campaign link creation
- Performance record imports
- Data quality checks
- Improvement task creation
- Migration creation and application
- Test writing and verification

## Status Flows

### Draft Lifecycle
```
draft -> approved -> (publish queue)
draft -> rejected -> (edit) -> draft
```

### Affiliate Program Lifecycle
```
research_needed -> signup_needed -> awaiting_human_approval -> submitted -> approved -> link_ready
                                                            -> rejected -> (re-submit)
                                                            -> closed
```

### Improvement Task Lifecycle
```
open -> in_progress -> done
open -> dismissed
```

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side DB access
- `APP_ACCESS_PASSWORD` - Dashboard login password
- `APP_SESSION_SECRET` - HMAC session signing key

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 500 error on a page | Check if migration was applied. Run `node scripts/apply-remote-migrations.mjs` |
| "Supabase not configured" | Check `.env.local` has all 3 Supabase variables |
| Login fails | Verify `APP_ACCESS_PASSWORD` and `APP_SESSION_SECRET` are set |
| IPv4 connection fails | Supabase DB is IPv6-only. Use direct IPv6 or Supabase REST API |
