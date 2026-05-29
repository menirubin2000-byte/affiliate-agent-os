# Stage 46: Affiliate Signup Execution - Operation Log

**Date**: 2026-05-30
**Operator**: codex
**Status**: in-progress, blocked on human signup actions

## Objective

Continue affiliate program signup execution by recording the confirmed Writesonic pending approval state, preparing the Systeme.io signup path, and deferring ElevenLabs until Systeme.io is handled.

## Writesonic

### Confirmed State

- Program: Writesonic Affiliate Program
- Dashboard status: pending
- Dashboard message: "Your application is pending. You will receive an email if your application is approved."
- Affiliate link: not available yet
- Product activation: not changed
- Campaign link: not created

### Database Update

Updated `affiliate_programs` for Writesonic:

- `status`: `submitted`
- `approval_type`: `manual_review`
- `affiliate_link`: `null`
- `last_checked_at`: set to current run time
- `notes`: `Application submitted through Writesonic affiliate dashboard. Dashboard status: pending. Waiting for approval email. No affiliate link available yet.`

## Systeme.io

### Research Summary

Official Systeme.io materials state:

- The affiliate program is free to join.
- There is no application process.
- A free account automatically receives an affiliate ID.
- The affiliate dashboard is available at `https://systeme.io/dashboard/affiliate-dashboard`.
- Commission is listed as 60% lifetime recurring.
- Attribution is lifetime/permanent tagging, not a short cookie-only model.
- Payment setup is handled in the Systeme.io dashboard after account creation.

Sources:

- https://systeme.io/affiliate-program
- https://help.systeme.io/article/162-how-the-systeme-io-affiliate-program-works

### Browser Verification

Verified live pages:

- Program page: `https://systeme.io/affiliate-program`
- Register page: `https://systeme.io/register`
- Affiliate dashboard URL: `https://systeme.io/dashboard/affiliate-dashboard`

Observed signup/login flow:

- `https://systeme.io/register` shows an email address field and a `Continue` button.
- `https://systeme.io/register` also offers `Continue with Google`.
- `https://systeme.io/dashboard/affiliate-dashboard` redirects unauthenticated users to the login page with the affiliate dashboard as the redirect target.
- The login page requires email/password or Google login.
- On 2026-05-30, the operator reached the main Systeme.io dashboard in a separate logged-in browser session.
- Codex attempted to open `https://systeme.io/dashboard/affiliate-dashboard` from the controllable browser session, but that session was not authenticated and redirected to login.

The operator must complete:

- Email/password entry or Google login.
- Terms approval if prompted.
- Email verification if prompted.
- CAPTCHA, 2FA, or account security prompts if shown.

Codex did not enter credentials, approve terms, or bypass any verification.

### Operator Steps

1. Open `https://systeme.io/affiliate-program`.
2. Click `Start for free now`.
3. Create or approve the free account signup.
4. Open `https://systeme.io/dashboard/affiliate-dashboard`.
5. Copy the affiliate ID or affiliate link from the affiliate dashboard.
6. Return the exact affiliate link to Codex/Claude Code.

### Database Handling Rules

- Do not invent the affiliate link.
- Do not create campaign links until the real Systeme.io affiliate link is available.
- On 2026-05-30, the operator provided the Systeme.io affiliate ID copied from the logged-in affiliate dashboard:
  `sa0272930337c3024fcafe085f6b63e73bbc0e3365`
- The official affiliate page documents the URL format as `?sa=YOURID`.
- Recorded affiliate link:
  `https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365`
- Current record was updated to `link_ready`.
- `dashboard_url` was set to `https://systeme.io/dashboard/affiliate-dashboard`.

Next step requires explicit operator approval before product activation:

- Update the linked product `affiliate_url` to the Systeme.io affiliate link.
- Set the product status to `active`.
- Create the initial staging campaign link:
  - `channel`: `staging`
  - `campaign_name`: `initial_affiliate_activation`
  - `source`: `affiliate_agent_os`
  - `medium`: `manual`
  - `content`: `product_workspace`

### Activation Completed

Operator approved product activation and initial campaign link creation.

Updated linked product:

- Product: Systeme.io
- Product ID: `4564c6df-65d8-4c2b-9797-c8a64944c6c5`
- `affiliate_url`: `https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365`
- `status`: `active`

Kept affiliate program:

- Program ID: `4509e658-f0a1-4f7b-91c1-00ed4469c9b3`
- `status`: `link_ready`

Created initial campaign link:

- Campaign link ID: `36c2cc59-38b1-4c50-8bdb-6eb07e70fe89`
- Name: `Systeme.io initial affiliate activation`
- `channel`: `staging`
- `campaign_name`: `initial_affiliate_activation`
- `source`: `affiliate_agent_os`
- `medium`: `manual`
- `content`: `product_workspace`
- `base_url`: `https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365`
- `final_url`: `https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365&utm_source=affiliate_agent_os&utm_medium=manual&utm_campaign=initial_affiliate_activation&utm_content=product_workspace`

Verification:

- Final URL preserves the Systeme.io `sa` affiliate parameter.
- Final URL includes `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content`.
- Deployed product workspace loaded successfully and showed the active product, real affiliate link, and campaign link.

## ElevenLabs

ElevenLabs remains queued after Systeme.io. No ElevenLabs signup or database changes were performed in this continuation.

## Blockers

- Browser-control extension is not connected, so Codex cannot click through signup forms.
- Systeme.io requires the human operator to create or approve the free account.
- Systeme.io affiliate dashboard must be opened in the operator's logged-in browser session, or the operator must provide the displayed affiliate ID/link.
- Writesonic is pending manual review and has no affiliate link yet.
- Systeme.io affiliate link is ready and the initial approved product activation is complete.

## Verification

- `npm.cmd run verify` passed after the documentation update and the targeted lint cleanup in `tests/affiliate-programs.test.ts`.

## Safety

- No WordPress configuration was added.
- No AI provider keys were required.
- No affiliate link was invented.
- No campaign link was created without an approved/available affiliate link.
- No product was activated automatically.
