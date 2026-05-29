# Affiliate Agent OS - Staging Release Notes

## Release Scope

This staging MVP is an operator dashboard for managing affiliate content workflows from product intake through draft review, campaign tracking, reporting, and advisory recommendations.

## Included

- Manual product creation and product workspace views
- Bulk product import
- Manual draft creation
- Deterministic fallback draft generation
- Claude Code prompt helper workflow
- Draft review, approval, rejection, editing, and version history
- Draft quality checks
- Campaign links and UTM helpers
- Manual performance records and bulk performance import
- Reports and CSV exports
- Saved views
- Recommendations and performance insights
- Improvement queue
- Data Quality Center
- Operator Command Center
- System readiness and launch checklist
- Single-operator access gate for `/dashboard/*`
- Vercel staging readiness guidance

## Intentionally Excluded

- Multi-user authentication
- Supabase RLS production hardening
- Autonomous AI content operations
- Automatic draft approval
- Automatic WordPress queueing
- Live WordPress publishing
- Ad platform integrations
- Revenue or click tracking integrations beyond manual/imported metrics
- Background optimization jobs

## WordPress

WordPress remains optional. If WordPress credentials are configured, the app can send approved drafts to WordPress as WordPress draft posts only. There is no live publish path.

Use a WordPress test site for the first staging trial.

## AI

AI API keys are optional. The current recommended workflow is Claude Code assisted/manual content creation. The in-app fallback generator remains available for testing and does not block staging readiness.

## Access Gate

The dashboard is protected by a single-operator access gate using:

- `APP_ACCESS_PASSWORD`
- `APP_SESSION_SECRET`

This is an MVP access gate, not a full multi-user auth system.

## Safety Position

The release is manual/operator-controlled:

- no auto-publish
- no auto-approve
- no auto-generate requirements
- no auto-fix
- no autonomous remediation

The operator remains responsible for reviewing content, approvals, credentials, and any external publishing step.
