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

## Approval Board

### Where to see approvals
Open `/dashboard/approvals` to see all pending actions Claude has proposed. The sidebar shows a red badge with the count of items waiting for your decision.

### Approval flow
1. Claude proposes an action (publish, activate, create link, etc.)
2. The action appears on the Approval Board with full details
3. Review: product, platform, content preview, campaign link, disclosure status
4. Choose one:
   - **Approve** — Claude may proceed with the action
   - **Reject** — Claude will not proceed
   - **Needs changes** — Claude will revise and resubmit
5. Add optional notes to explain your decision

### Exact approval phrases
When Claude asks for permission in chat (not on the board), reply with:
- **"Approved"** — general approval
- **"Approved to publish"** — specific publishing approval
- **"No"** or **"Reject"** — do not proceed

## Platform Publishing Workflow

### Before first publish on any platform
1. Log into the platform in the Chrome browser that has the Claude extension.
2. Verify Claude can see the browser via the Chrome MCP connection.
3. Review the content Claude has prepared.
4. Complete the pre-posting checklist Claude presents.

### Approval phrases
When Claude asks for permission to publish, reply with one of:
- **"Approved"** — Claude proceeds with the action.
- **"Approved to publish"** — Claude posts/publishes the content.
- **"No"** or **"Not yet"** — Claude stops and waits for further instructions.

### What to do when Claude stops for authentication
Claude will stop and ask you to handle:
- **Login page**: Enter your credentials manually.
- **CAPTCHA**: Complete the challenge manually.
- **2FA / MFA**: Enter the code from your authenticator.
- **Email verification**: Check your email and click the link.
- **Security prompt**: Review and approve the platform's security check.

After you complete the authentication step, tell Claude "Done" or "Continue" and it will resume.

### After publishing
- Claude will capture the post URL and record it in a publish log.
- Claude will create a tracking task for performance review.
- You will need to check real metrics (clicks, conversions) after 48-72 hours.
- Do not ask Claude to enter fake metrics — only record real observed values.

### Reference docs
- `docs/PLATFORM_ACCESS_MAP.md` — which platforms, what Claude can do
- `docs/PUBLISHING_POLICY.md` — content rules, disclosure requirements
- `docs/PLATFORM_SETUP_CHECKLIST.md` — per-platform setup steps
- `docs/PLATFORM_PUBLISH_LOG_TEMPLATE.md` — log template for each action

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 500 error on a page | Check if migration was applied. Run `node scripts/apply-remote-migrations.mjs` |
| "Supabase not configured" | Check `.env.local` has all 3 Supabase variables |
| Login fails | Verify `APP_ACCESS_PASSWORD` and `APP_SESSION_SECRET` are set |
| IPv4 connection fails | Supabase DB is IPv6-only. Use direct IPv6 or Supabase REST API |
