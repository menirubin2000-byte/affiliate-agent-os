# Affiliate Agent OS

Affiliate Agent OS is a local-first MVP for running a human-operated affiliate content workflow.

Today the system supports:

- manual product intake in Supabase
- Claude Code assisted / manual draft creation with deterministic fallback mode
- manual draft review, approval, and rejection
- manual performance tracking
- workflow and recommendation dashboards
- setup, staging, and trial-readiness guidance

WordPress draft queue is available as an optional feature but is not required.

It does not support live publishing, autonomous approval, autonomous queueing, or autonomous optimization.

## Current MVP shape

This is still an operator-first system. The operator remains responsible for:

- entering real Supabase credentials
- applying database migrations
- reviewing and approving content
- recording performance data
- testing on staging before any broader rollout

## Stage summary

- **Stage 1-2:** core scaffold, Supabase persistence, product creation, draft creation, approval flow
- **Stage 3:** SEO fields, structured draft templates, deterministic quality checks
- **Stage 4:** end-to-end approval workflow cleanup and filtering
- **Stage 5:** WordPress draft queue with server-side gating
- **Stage 6:** operational dashboard metrics and needs-attention views
- **Stage 7:** manual performance tracking
- **Stage 8:** deterministic recommendations
- **Stage 9:** derived workflow labels and next-action surfaces
- **Stage 10:** readiness checks, validation hardening, automated tests
- **Stage 11:** onboarding, empty states, first-run UX
- **Stage 12:** demo seed support and staged-trial handoff
- **Stage 13:** cleanup, deployment guidance, and stronger handoff documentation
- **Stage 14:** launch checklist, trial progress summary, and staging safeguards
- **Stage 17:** Claude Code assisted content mode and manual draft creation
- **Stage 18:** WordPress-free MVP stabilization — WordPress made fully optional, core workflow is Product → Draft → Approval → Performance → Recommendations
- **Stage 19:** Manual draft editor upgrade — full edit/revert flow for drafts, paste-back workflow guidance, clearer draft list actions (Edit, Copy Claude Prompt, Record Performance), quality checks on every save
- **Stage 20:** Structured Claude paste import — deterministic parser for structured Claude Code output, paste import UI on new and edit draft forms, updated prompt format, parser tests
- **Stage 21:** Draft version history and safe revisions — every create/edit saves a version snapshot, version history panel on edit page, view and restore any version, restore resets status to draft
- **Stage 22:** Review and approval workspace — dedicated review page per draft with content, product details, quality checks, approval readiness summary, version history link, and approve/reject actions
- **Stage 23:** Performance feedback loop — performance insights engine, product performance signals on products page, performance context on draft review page, actionable insight list on performance page
- **Stage 24:** Content improvement queue — persisted improvement tasks table, manual task creation, generate tasks from performance insights, duplicate prevention, status workflow (open → in progress → done/dismissed), task summary on dashboard, "Add to queue" on recommendations and insights, draft revision links on tasks
- **Stage 25:** Product workspace — dedicated `/dashboard/products/[id]` page showing product details, drafts, performance records, improvement tasks, recommendations, Claude prompt helper, and quick actions in a single operational view
- **Stage 26:** Bulk product import — paste CSV/TSV on `/dashboard/products/import`, deterministic parser with validation preview (required fields, URL format, numeric parsing, duplicate slugs), import valid rows, skip existing slugs, imported products work immediately with workspace and all workflow steps
- **Stage 27:** Campaign links and UTM builder — `campaign_links` table with UTM parameter support, deterministic UTM builder helper, `/dashboard/campaign-links` page with create form (live URL preview) and link list, campaign links in product workspace, performance records optionally linked to campaign links, campaign link insights (no performance, clicks without conversions, high performance), dashboard summary, sidebar navigation
- **Stage 28:** Bulk performance import — paste CSV/TSV on `/dashboard/performance/import`, deterministic parser with product resolution (by slug, ID, or campaign link), campaign link field inheritance (product, channel, campaign name), validation preview with valid/invalid row counts, numeric and date validation, column aliases, import valid rows as performance records, import buttons on performance page, campaign links page, and product workspace
- **Stage 29:** Reports and export center — `/dashboard/reports` with read-only operational reports (product performance, campaign performance, drafts, improvement tasks), high-level summary cards, CSV export for each report via route handlers, sidebar navigation, dashboard link. Reports are read-only and do not trigger automation or modify data.
- **Stage 30:** Saved views and filter presets — `saved_views` table (migration 010), `/dashboard/saved-views` page with recommended views (products needing drafts, approved drafts needing performance, critical tasks, campaign links with no performance, performance with no conversions, reports overview), create/delete/set-default saved views, filter links open relevant pages with query params, sidebar and dashboard integration. Views are read-only shortcuts and do not mutate operational data.
- **Stage 31:** Data Quality Center — `/dashboard/data-quality` with read-only checks for incomplete, inconsistent, duplicate, or suspicious data across products, drafts, campaign links, performance records, improvement tasks, and saved views. Findings link to manual fix pages only.
- **Stage 32:** Operator Command Center — `/dashboard/command-center` aggregates the most urgent manual next actions from data quality issues, improvement tasks, recommendations, performance insights, drafts needing review, products needing drafts, approved drafts needing performance, and campaign links with no performance.
- **Stage 33:** Single Operator Access Gate — `/dashboard/*` routes are protected by an MVP single-operator password gate using a signed httpOnly session cookie. This is not a multi-user auth or RLS system.
- **Stage 34:** Vercel staging deployment readiness — `/dashboard/system` shows Vercel staging readiness, required access-gate/Supabase env vars are documented, and the post-deploy smoke checklist is explicit.
- **Stage 35:** Deployment script and release checklist — `docs/STAGING_RELEASE_CHECKLIST.md`, `docs/STAGING_RELEASE_NOTES.md`, `scripts/preflight-staging.mjs`, `npm run preflight:staging`.
- **Stage 36:** Access gate secret setup helper — `scripts/generate-access-secret.mjs`, `npm run generate:access-secret`, improved preflight messaging for missing access-gate vars.
- **Stage 37:** Final local staging readiness — `.env.local` normalized, preflight passed, verify passed, auth smoke passed locally.
- **Stage 38:** Vercel staging deploy guidance — deployment method documented, env vars confirmed, post-deploy checklist prepared.
- **Stage 39:** Live Supabase migration fix — migrations 006–010 applied to the live Supabase database (`gbkwydsodondarccqyet`) via direct PostgreSQL connection. All 8 tables confirmed present. Live deployment verified at `https://affiliate-agent-os.vercel.app`.

## Current MVP mode: WordPress-free operation

The system operates fully without WordPress. No WordPress credentials, card, domain, paid plan, or renewal is needed.

Core workflow:

1. **Product** — create and manage affiliate products in Supabase
2. **Draft** — create content with Claude Code, manual entry, or fallback test generation
3. **Approval** — human review and approval of all drafts
4. **Performance** — manual tracking of clicks, conversions, and revenue
5. **Recommendations** — deterministic advisory layer based on workflow and performance data

WordPress is available as an optional feature on the Publishing page. It is not connected by default and does not block any part of the workflow.

## What is production-like today

- server-side Supabase access patterns
- guarded approval and publishing transitions
- deterministic fallbacks when integrations are missing
- automated tests for core deterministic logic
- clear operational dashboard flows for a single operator

## What is still intentionally MVP/manual

- no multi-user authentication, roles, or permissions
- no RLS-based public deployment hardening
- no automatic publishing to WordPress
- no social platform integrations
- no ad platform integrations
- no autonomous recommendation execution
- no click tracking scripts or external analytics ingestion

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Claude Code assisted/manual content generation, with optional OpenAI or Anthropic live generation later
- WordPress REST API with Application Passwords (optional, not required)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create the local env file:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

3. Fill in real values in `.env.local`.

4. Apply Supabase migrations.

5. Start the app:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Environment variables

`.env.example` is the source of truth for required configuration.

Required or commonly used values:

| Variable | Purpose | Required for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | real product, draft, publishing, and performance persistence |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key | browser-side Supabase client setup |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side privileged Supabase access | server actions, dashboard queries, publishing queue |
| `APP_ACCESS_PASSWORD` | single-operator dashboard password | hosted dashboard access gate |
| `APP_SESSION_SECRET` | HMAC secret for signed session cookies | hosted dashboard access gate |
| `AI_PROVIDER` | optional `openai` or `anthropic` | optional live in-app generation only |
| `OPENAI_API_KEY` | optional OpenAI API key | optional live generation when `AI_PROVIDER=openai` |
| `ANTHROPIC_API_KEY` | optional Anthropic API key | optional live generation when `AI_PROVIDER=anthropic` |
| `WORDPRESS_BASE_URL` | WordPress site base URL | optional WordPress draft queue |
| `WORDPRESS_USERNAME` | WordPress username | optional WordPress draft queue |
| `WORDPRESS_APP_PASSWORD` | WordPress Application Password | optional WordPress draft queue |

Notes:

- if AI keys are missing, the app stays usable in Claude Code assisted/manual mode with deterministic fallback test drafts
- if WordPress keys are missing, pages still render and queue actions fail with guidance
- if access gate values are missing in local development, the app shows setup guidance; hosted deployments must set them before dashboard use
- `.env.local` must never be committed
- `.env*` is ignored in `.gitignore`

## Access gate secrets

Generate a strong session secret with:

```bash
npm run generate:access-secret
```

The helper prints a new `APP_SESSION_SECRET` once and suggests a strong `APP_ACCESS_PASSWORD` format. Choose the operator password yourself.

Paste both values into:

- `.env.local` for local staging checks
- Vercel Project Settings -> Environment Variables for staging/preview

Use the same variable names in both places:

- `APP_ACCESS_PASSWORD`
- `APP_SESSION_SECRET`

Do not share these values. Do not commit `.env.local`. The helper does not write secrets to files automatically.

## Database migrations

Apply these migrations in order:

1. [supabase/migrations/001_init.sql](/C:/Users/USER/Documents/אוטומציה/supabase/migrations/001_init.sql)
2. [supabase/migrations/002_content_quality.sql](/C:/Users/USER/Documents/אוטומציה/supabase/migrations/002_content_quality.sql)
3. [supabase/migrations/003_wordpress_queue.sql](/C:/Users/USER/Documents/אוטומציה/supabase/migrations/003_wordpress_queue.sql)
4. [supabase/migrations/004_performance_metrics.sql](/C:/Users/USER/Documents/אוטומציה/supabase/migrations/004_performance_metrics.sql)
5. [supabase/migrations/005_service_role_api_grants.sql](/C:/Users/USER/Documents/אוטומציה/supabase/migrations/005_service_role_api_grants.sql)
6. [supabase/migrations/006_draft_versions.sql](/C:/Users/USER/Documents/אוטומציה/supabase/migrations/006_draft_versions.sql)
7. [supabase/migrations/007_improvement_tasks.sql](/C:/Users/USER/Documents/אוטומציה/supabase/migrations/007_improvement_tasks.sql)
8. [supabase/migrations/008_campaign_links.sql](/C:/Users/USER/Documents/אוטומציה/supabase/migrations/008_campaign_links.sql)
9. [supabase/migrations/009_performance_campaign_link.sql](/C:/Users/USER/Documents/אוטומציה/supabase/migrations/009_performance_campaign_link.sql)
10. [supabase/migrations/010_saved_views.sql](/C:/Users/USER/Documents/אוטומציה/supabase/migrations/010_saved_views.sql)

Use either:

- Supabase SQL Editor
- Supabase CLI in your normal workflow

## Demo seed

Optional sample data lives in [supabase/seed.sql](/C:/Users/USER/Documents/אוטומציה/supabase/seed.sql).

Use it when you need:

- meaningful dashboard metrics fast
- recommendations and workflow states to appear immediately
- a local or staging walkthrough before entering real records

Do not run it automatically. Apply it manually after migrations.

Seeded records are clearly marked with `demo-*` values or `[demo-seed]` notes.

### Remove demo data

```sql
delete from public.products
where slug like 'demo-%' or notes ilike '%[demo-seed]%';
```

Because related tables use cascade behavior, removing demo products also removes their linked drafts, publishing jobs, and performance records.

## Operator workflow

Normal operating loop:

1. add product
2. prepare content with Claude Code or create a manual draft
3. review and approve or reject
4. record performance
5. review dashboard recommendations and workflow states
6. (optional) queue approved draft to WordPress as a draft post when WordPress is connected

## Claude Code assisted content mode

AI API keys are optional in the current MVP.

The intended content workflow is:

1. open `/dashboard/products`
2. use `Prepare Claude prompt` on a product
3. run that prompt in Claude Code or another external operator workflow
4. open `/dashboard/drafts/new` (paste-back workflow guidance is shown on the page)
5. paste the generated content into the manual draft form
6. save it as a draft — quality checks run automatically on save
7. edit the draft from `/dashboard/drafts` using the Edit link if needed
8. review and approve it manually from `/dashboard/drafts`

Manual drafts are saved with `status = draft`. They are never auto-approved, never auto-queued, and never auto-published.

### Structured paste import

The Claude prompt helper asks Claude Code to return content in a structured format:

```
Title: ...
Meta Title: ...
Meta Description: ...
Target Keyword: ...
Body:
...
```

On `/dashboard/drafts/new` and `/dashboard/drafts/[id]/edit`, use the "Paste structured Claude output" button to paste the full response. The app parses it deterministically (no AI) and fills the form fields. Missing fields are left unchanged. The parser also recognizes alternative labels like `SEO Title`, `Keyword`, `Content`, and underscore variants.

Approval is still required after saving.

The products page still includes `Generate fallback draft` for testing the app workflow without live AI credentials. Treat those drafts as test content unless a human rewrites and approves them.

### Review and approval workspace

Each draft has a dedicated review page at `/dashboard/drafts/[id]/review` that shows:

- full draft content (title, body, meta fields, target keyword)
- product details (name, brand, affiliate URL)
- quality checklist with pass/review badges
- approval readiness summary (ready / needs review / not ready)
- version history summary with link to full history
- approve/reject form with approval notes

The approval readiness summary is deterministic and informational only. It flags missing disclosure, CTA, meta fields, and structure issues but never auto-approves. The "Review" button is the primary action for drafts on the drafts list.

## Draft behavior

Supported template types:

- `review`
- `comparison`
- `buying_guide`
- `social_post`

Generated drafts persist:

- `status`
- `template_type`
- `meta_title`
- `meta_description`
- `target_keyword`
- `quality_checks`

Quality checks are advisory only. They never auto-approve or auto-publish.

### Version history

Every draft create and edit saves a version snapshot in `draft_versions`. This includes:

- manual draft creation
- structured paste import saves
- fallback generation
- draft edits
- version restores (saved as `change_source = system`)

Approve/reject status changes do not create new versions unless content fields changed.

On `/dashboard/drafts/[id]/edit`, the version history panel shows all versions with their source and timestamp. Each version can be viewed at `/dashboard/drafts/[id]/versions/[versionId]` and restored. Restoring a version:

- sets the draft content to the version's snapshot
- sets the draft status back to `draft`
- creates a new version entry with `change_source = system`
- does not affect performance records
- requires re-approval before any further workflow steps

## WordPress queue behavior (optional)

WordPress is optional and not required for the core MVP workflow. When connected, the app only allows approved drafts into the publishing queue.

WordPress handoff rules:

- draft status in Affiliate Agent OS must already be `approved`
- rejected or unapproved drafts are blocked
- WordPress posts are created with `status = draft` only
- draft status inside Affiliate Agent OS is not changed automatically by queueing
- failed jobs are stored with error details

This project has no live publish path.

## Performance tracking

Performance records are manual in this MVP.

Each record can capture:

- product
- optional draft
- channel
- campaign name
- clicks
- conversions
- revenue
- notes
- recorded timestamp

These records feed dashboard summaries and deterministic recommendations.

## Recommendations and workflow states

Recommendations are deterministic and advisory-only.

Examples:

- products with no drafts
- approved drafts not yet queued
- failed WordPress jobs
- weak quality checks
- low click volume
- products with clicks but no conversions
- stale content/performance coverage gaps

Workflow labels are derived, not stored:

- `needs_draft`
- `draft_ready`
- `awaiting_approval`
- `approved_not_queued`
- `queued_to_wordpress`
- `wordpress_failed`
- `published_draft_pending_performance`
- `performance_tracked`

## Data Quality Center

`/dashboard/data-quality` is a read-only operator view for finding data issues before exports, reviews, or trial runs.

It detects issues such as:

- products missing affiliate URLs, target keywords, categories, drafts, or campaign links
- invalid affiliate URLs and suspicious or duplicate slugs
- inactive products that still have active campaign links
- drafts missing title/body, approved drafts with weak quality checks, missing meta fields, missing version history, or rejected drafts without notes
- campaign links with invalid final URLs, missing UTM source/medium/campaign, no performance records, or archived links referenced by newer performance records
- performance contradictions such as clicks below conversions, conversions without revenue, revenue without conversions, negative values, missing channel/campaign, future dates, or missing product linkage
- stale or incomplete improvement tasks
- saved views with unsupported types, invalid filter shapes, or too many defaults per view type

The Data Quality Center does not fix records automatically. Every finding links to a manual workspace such as products, draft edit/review, campaign links, performance, improvements, saved views, or reports.

It does not require WordPress or AI API keys.

## Operator Command Center

`/dashboard/command-center` is the central advisory surface for deciding what to do next.

It aggregates action items from:

- Data Quality Center findings
- open improvement tasks
- deterministic recommendations
- performance insights
- drafts waiting for review
- active products with no drafts
- approved drafts with no performance records
- active campaign links with no performance records

Every action item is normalized into a shared shape with:

- source
- priority: `info`, `low`, `medium`, `high`, or `critical`
- title and description
- related entity
- manual action label and link

The list is sorted with critical/high items first, then older open items first. Obvious duplicates are removed when multiple advisory systems point to the same manual action.

The dashboard shows the top urgent command-center items and links to the filtered critical-action view at `/dashboard/command-center?priority=critical`.

The command center is advisory-only. It does not auto-fix data, auto-generate drafts, auto-approve content, auto-optimize campaigns, queue WordPress jobs, or publish anything.

WordPress and AI API keys are not required.

## Single Operator Access Gate

Stage 33 adds a simple access gate for the dashboard so a hosted deployment is not publicly open.

Required variables:

- `APP_ACCESS_PASSWORD`
- `APP_SESSION_SECRET`

Local setup:

1. Add both values to `.env.local`.
2. Use strong private values.
3. Restart the dev server.
4. Open `/login`, enter the operator password, then continue to `/dashboard`.

Deployment setup:

1. Set both values in the hosting provider environment.
2. Do not commit real values to the repo.
3. Deploy to staging first.
4. Confirm `/dashboard` redirects to `/login` before login.
5. Confirm logout clears access.

Limitations:

- this is a single-operator MVP gate
- it is not a full multi-user authentication system
- it does not add Supabase RLS policies
- it does not replace production-grade identity, authorization, audit logging, or role management
- it does not add autonomous behavior

## Runbook

Useful scripts:

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run verify
```

`npm run verify` runs the main pre-handoff checks in sequence.

## Staging trial checklist

Use `/dashboard/system` as the operator-facing source of truth for setup and trial readiness.

Before a real staged trial:

1. confirm required Supabase values are real and not placeholders
2. confirm migrations are applied
3. confirm Supabase is reachable
4. create one real product
5. create one draft with Claude Code/manual entry, or use fallback generation for UI testing
6. approve one draft manually
7. add one manual performance record
8. confirm recommendations and workflow labels are visible
9. confirm demo data is absent or intentionally understood
10. (optional) queue one WordPress draft on a test site if WordPress is connected

## Stage 14 launch checklist

The app now includes a launch checklist on `/dashboard` and `/dashboard/system`.

It tracks these items from real configuration and persisted data where possible:

- env values added
- Supabase reachable
- migrations applied
- optional demo seed status reviewed
- first product created
- first draft created
- first draft approved
- first WordPress draft queued (optional)
- first performance record added
- recommendations visible

Statuses mean:

- `Not started`: the app cannot check the item yet
- `Ready`: the prerequisite exists and the operator can take the next action
- `Blocked`: configuration, data, or an external system is missing
- `Complete`: the app sees the required state in configuration or Supabase

Exact staged-trial order:

1. Open `/dashboard/system`.
   Success: Supabase readiness is not blocked, or the page clearly says which env value or migration is missing.
2. Confirm migrations 001 through 004 are applied.
   Success: the Supabase table reachability check succeeds. If API access returns `permission denied`, apply migration 005 as well.
3. Confirm demo seed status.
   Success: no demo data is present for a real trial, or demo data is intentionally being used for UI review only.
4. Add one real product from `/dashboard/products/new`.
   Success: the product appears on `/dashboard/products`.
5. Create one draft from `/dashboard/drafts/new`, or generate a fallback test draft from `/dashboard/products`.
   Success: the draft appears on `/dashboard/drafts` with `status = draft`.
6. Review and approve one draft from `/dashboard/drafts`.
   Success: the draft status changes to `approved` and remains approved after refresh.
7. (Optional) Queue one approved draft from `/dashboard/publishing` if WordPress is connected.
   Success: a `publishing_jobs` row is created and the WordPress post is created as a draft on a test site.
8. Add one performance record from `/dashboard/performance`.
   Success: dashboard performance metrics and trial progress update.
9. Review recommendations on `/dashboard`.
   Success: the advisory layer shows either actionable recommendations or a clear empty state.

If a step is blocked:

- missing Supabase values: update `.env.local` or hosted env vars, then restart/redeploy
- Supabase reachable but schema errors: apply migrations in order
- AI unavailable: continue with Claude Code assisted/manual draft creation; live AI keys are optional
- WordPress unavailable: this is expected in the current MVP mode. WordPress is optional. Connect it only when you have a test site ready
- demo data present: remove it before evaluating real trial outcomes

Staging safeguards remain unchanged:

- no production publish path exists
- approvals remain human-only
- recommendations never auto-edit or auto-trigger actions
- if WordPress is connected later, use a test site and draft posts only

## Vercel staging deployment

This repo is ready for a first hosted deployment, but keep it staging-first.

### Required Vercel env vars

Configure these in Vercel Project Settings -> Environment Variables for the staging/preview environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ACCESS_PASSWORD`
- `APP_SESSION_SECRET`

`APP_ACCESS_PASSWORD` and `APP_SESSION_SECRET` protect the dashboard. Do not commit real values to the repo.

### Optional Vercel env vars

These can stay blank for the current WordPress-free, Claude Code assisted workflow:

- `WORDPRESS_BASE_URL`
- `WORDPRESS_USERNAME`
- `WORDPRESS_APP_PASSWORD`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `AI_PROVIDER`

WordPress is not required. AI API keys are not required.

### How to deploy to Vercel

1. Push the repo to a Git provider connected to Vercel, or import it directly in Vercel.
2. Set the required env vars above for the staging/preview deployment.
3. Use the default Next.js build command: `npm run build`.
4. Deploy to a staging/preview URL first.
5. Do not point real public traffic at the app until the smoke checklist passes.

The access-gate values must be present before the Vercel build/deploy starts so route protection and login actions use the same password and session secret.

### Vercel staging readiness in the app

Open `/dashboard/system` after logging in. The Vercel staging readiness card checks:

- Access gate configured
- Supabase configured and reachable
- WordPress optional
- AI API keys optional
- Ready for Vercel staging: yes/no

### Post-deploy smoke checklist

After the first Vercel staging deploy:

1. Open the deployed URL.
2. Open `/dashboard` and confirm it redirects to `/login`.
3. Log in with `APP_ACCESS_PASSWORD`.
4. Confirm `/dashboard` loads.
5. Confirm `/dashboard/system` shows Supabase ready.
6. Confirm `/dashboard/command-center` loads.
7. Confirm `/dashboard/products` loads.
8. Confirm `/dashboard/reports` loads.
9. Confirm logout works.
10. Confirm unauthenticated `/dashboard/reports/export/products` redirects to `/login`.

### Middleware warning

Next 16 may warn that the `middleware.ts` file convention is deprecated in favor of `proxy`. The current middleware builds successfully and protects dashboard routes. This warning is acceptable for the MVP staging deployment and can be migrated later as a small follow-up once the staging flow is verified.

## Live staging deployment

The app is deployed and running at:

```
https://affiliate-agent-os.vercel.app
```

All 10 migrations (001–010) are applied to the live Supabase database. All 8 tables are confirmed present and accessible via REST API.

Supabase project ref: `gbkwydsodondarccqyet`

### Applied migration helper

To apply missing migrations to a remote Supabase database:

```bash
node scripts/apply-remote-migrations.mjs <DB_PASSWORD>
```

The script connects via PostgreSQL, runs migrations 006–010, re-runs grants, and verifies all tables. It is idempotent and safe to re-run.

## First staging release

Before the first Vercel staging deployment, review:

- [docs/STAGING_RELEASE_CHECKLIST.md](/C:/Users/USER/Documents/אוטומציה/docs/STAGING_RELEASE_CHECKLIST.md)
- [docs/STAGING_RELEASE_NOTES.md](/C:/Users/USER/Documents/אוטומציה/docs/STAGING_RELEASE_NOTES.md)

Run the non-destructive staging preflight:

```bash
npm run preflight:staging
```

This does not deploy the app. It checks required staging env keys, git safety for `.env.local`, migration files, obvious committed secret patterns, and `npm run verify`.

## Deployment notes

This repo is ready for a first hosted deployment, but keep it staging-first.

### Recommended first deployment shape

- deploy to Vercel or an equivalent Next.js host
- point it at a staging Supabase project or a carefully controlled real project
- keep the existing noindex default and manual workflow controls
- WordPress is optional — connect it later if needed

### Required env vars for hosting

At minimum, configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ACCESS_PASSWORD`
- `APP_SESSION_SECRET`

For optional live in-app AI testing, also configure:

- `AI_PROVIDER`
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`

For optional WordPress queue testing, also configure:

- `WORDPRESS_BASE_URL`
- `WORDPRESS_USERNAME`
- `WORDPRESS_APP_PASSWORD`

WordPress is not required. The system works fully without it.

### Post-deploy smoke checks

After the first deploy:

1. open `/dashboard/system`
2. confirm unauthenticated access redirects to `/login`
3. log in with the configured operator password
4. confirm setup status is rendered and readable
5. create a product
6. create a manual draft or generate a fallback test draft
7. approve the draft
8. add a performance record
9. verify dashboard summaries update
10. (optional) queue an approved draft to WordPress if connected

## Missing integration behavior

The app is designed to fail cleanly when configuration is incomplete:

- pages still render
- setup blockers remain visible
- AI can fall back to deterministic local content
- WordPress queueing stops with guidance instead of a raw crash
- Supabase-backed operations return setup-oriented errors when blocked

## Handoff summary

For an operator:

- the core workflow is usable: Product → Draft → Approval → Performance → Recommendations
- approvals are manual
- WordPress is optional and not required
- performance tracking is manual
- setup and trial-readiness are visible in the UI

For a developer:

- the codebase is organized by dashboard route, server helpers, and typed models
- deterministic logic has test coverage
- deployment assumptions are explicit
- demo data and staging verification are documented

## Remaining rough edges that are acceptable for this MVP

- no auth or RLS policy layer for public multi-user deployment
- no background jobs or retry workers
- no external analytics integrations
- no automated content refresh loop
- no live production publishing path
- some flows still depend on real external systems to verify end to end

Those are acceptable for the current human-operated MVP and should be handled after the first staged trial proves the workflow.
