# Platform Access Map

Reference for how Claude Code accesses and operates each external platform. The human operator approves sensitive actions; Claude handles everything else.

**Last updated**: 2026-05-30

## Access Modes

| Mode | Description | Who acts |
|------|-------------|----------|
| **A. Browser session** | Human logs in once. Claude uses the authenticated session via Chrome extension. Human handles CAPTCHA, 2FA, email verification, password prompts. | Claude operates, human authenticates |
| **B. API/env** | Secrets stored in `.env.local` or Vercel env vars. Claude uses programmatic access. Never prints secrets. | Claude operates |
| **C. Manual approval gate** | Claude prepares the action, shows it to the operator, and waits for explicit "Approved" or "Approved to publish" before proceeding. | Claude prepares, human approves, Claude executes |

## Core Platforms

| Platform | Purpose | URL | Account status | Login status | Access method | Claude allowed actions | Human approval required for | Publish allowed | Notes |
|----------|---------|-----|---------------|-------------|--------------|----------------------|---------------------------|----------------|-------|
| Affiliate Agent OS (staging) | Dashboard, product/draft/campaign management | Vercel deployment URL | Active | API/env access | B | Full CRUD on all tables, draft creation, campaign link creation, data quality checks | Draft approval, product activation | N/A (internal) | Service role key grants full access |
| LinkedIn | Post distribution, professional network sharing | linkedin.com | Operator account | Human logs in | A + C | Prepare post text, paste into composer, add first comment, capture post URL | "Approved to publish" before clicking Post | Yes (after approval) | Stop for login/CAPTCHA/2FA |
| Medium | Article distribution, long-form content | medium.com | Operator account | Human logs in | A + C | Prepare article, paste content, set tags, save as draft | "Approved to publish" before clicking Publish | Yes (after approval) | Affiliate links allowed with disclosure |
| Systeme.io affiliate dashboard | Affiliate link management, stats | systeme.io | Active (affiliate link obtained) | Human logs in | A | Inspect dashboard, copy affiliate link, read stats | Account creation, 2FA | No (dashboard only) | Affiliate link already in DB |
| GitHub | Source code, issues, PRs | github.com | Active | CLI auth (gh) | B | Commit, push, create PRs, manage issues | Force push, branch deletion, release creation | N/A (code) | Use gh CLI, not browser |
| Vercel | Deployment, env vars | vercel.com | Active | Human logs in | A + B | View deployments, check build logs | Env var changes, production deploy, domain changes | N/A (infra) | Prefer CLI for non-sensitive ops |
| Supabase | Database, migrations | supabase.co | Active | API/env access | B | Full CRUD, run migrations, query data | Schema-breaking changes, project deletion | N/A (data) | Service role key, IPv6 for direct PG |

## Optional Future Platforms

| Platform | Purpose | URL | Account status | Login status | Access method | Claude allowed actions | Human approval required for | Publish allowed | Notes |
|----------|---------|-----|---------------|-------------|--------------|----------------------|---------------------------|----------------|-------|
| Substack / Beehiiv | Newsletter distribution | substack.com / beehiiv.com | Not created | N/A | A + C | Prepare draft, paste content | Account creation, "Approved to publish" | Yes (after approval) | Only if operator creates account |
| Reddit | Community engagement, value-first posts | reddit.com | Not created | N/A | A + C | Check subreddit rules, prepare post/comment | Account creation, "Approved to publish", subreddit rule compliance | Yes (after approval) | No link dumping, no spam, check each subreddit's self-promo rules |
| Quora | Q&A engagement, helpful answers | quora.com | Not created | N/A | A + C | Research questions, prepare answers | Account creation, "Approved to publish" | Yes (after approval) | Disclosure required, no spam answers |
| X / Twitter | Short-form social sharing | x.com | Not created | N/A | A + C | Prepare tweet/thread, paste text | Account creation, "Approved to publish" | Yes (after approval) | Character limits apply, disclosure in thread |
| Google Drive / Docs | Content collaboration, templates | drive.google.com | Operator account | Human logs in | A | Read documents, prepare content | Sharing permissions, file deletion | No (internal docs) | Never modify sharing/permissions |
| YouTube | Description links, community posts | youtube.com | Not created | N/A | A + C | Prepare description text, community post | Account creation, "Approved to publish" | Yes (after approval) | Only if operator has YouTube channel |

## Connection Status Summary

| Platform | Ready to operate | Blocker |
|----------|-----------------|---------|
| Affiliate Agent OS | Yes | None |
| LinkedIn | Pending | Human must log in via Chrome extension browser |
| Medium | Pending | Human must log in via Chrome extension browser |
| Systeme.io | Yes (read-only) | Human handles login/2FA for dashboard access |
| GitHub | Yes | None |
| Vercel | Yes | None |
| Supabase | Yes | None |
| Substack / Beehiiv | Not started | Operator must create account first |
| Reddit | Not started | Operator must create account first |
| Quora | Not started | Operator must create account first |
| X / Twitter | Not started | Operator must create account first |
