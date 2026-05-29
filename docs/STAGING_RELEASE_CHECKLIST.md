# Affiliate Agent OS - Staging Release Checklist

Use this checklist before the first Vercel staging deployment. Keep the release staging-first and operator-controlled.

## Required Vercel Env Vars

Set these in Vercel Project Settings -> Environment Variables before deploying:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ACCESS_PASSWORD`
- `APP_SESSION_SECRET`

Do not commit real values. The access-gate values must exist before the Vercel build/deploy starts.

## Optional Env Vars

These can stay blank for the current staging release:

- `WORDPRESS_BASE_URL`
- `WORDPRESS_USERNAME`
- `WORDPRESS_APP_PASSWORD`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `AI_PROVIDER`

WordPress is optional. AI API keys are optional because the app supports Claude Code assisted/manual content mode.

## Supabase Migrations Checklist

All migrations have been applied to the live Supabase project (`gbkwydsodondarccqyet`):

1. ✅ `supabase/migrations/001_init.sql`
2. ✅ `supabase/migrations/002_content_quality.sql`
3. ✅ `supabase/migrations/003_wordpress_queue.sql`
4. ✅ `supabase/migrations/004_performance_metrics.sql`
5. ✅ `supabase/migrations/005_service_role_api_grants.sql`
6. ✅ `supabase/migrations/006_draft_versions.sql`
7. ✅ `supabase/migrations/007_improvement_tasks.sql`
8. ✅ `supabase/migrations/008_campaign_links.sql`
9. ✅ `supabase/migrations/009_performance_campaign_link.sql`
10. ✅ `supabase/migrations/010_saved_views.sql`
11. ✅ `supabase/migrations/011_affiliate_program_tracking.sql`
12. ✅ `supabase/migrations/012_approval_items.sql`

All 10 tables confirmed present: `products`, `content_drafts`, `draft_versions`, `publishing_jobs`, `performance_metrics`, `improvement_tasks`, `campaign_links`, `saved_views`, `affiliate_programs`, `approval_items`.

To re-apply missing migrations on a fresh Supabase project:

```bash
node scripts/apply-remote-migrations.mjs <DB_PASSWORD>
```

Optional demo data:

- `supabase/seed.sql`

Do not seed demo data into a real production-like dataset unless you intentionally want sample records.

## Pre-Deploy Local Checks

Run:

```bash
npm run preflight:staging
```

The preflight checks:

- required staging env keys exist locally or in `process.env`
- `.env.local` is ignored by git
- migrations are present
- obvious secret patterns are not present in source/docs
- `npm run verify` passes

If preflight reports setup items, fix them before deploying.

## Vercel Deployment Steps

1. Import or connect the repo in Vercel.
2. Configure the required staging env vars.
3. Keep WordPress env vars blank unless using a WordPress test site.
4. Keep AI keys blank unless intentionally testing live in-app AI.
5. Deploy to a Vercel Preview or staging project first.
6. Do not route public production traffic to the staging release.

## Post-Deploy Smoke Checks

1. Open the deployed URL.
2. Open `/dashboard` and confirm it redirects to `/login`.
3. Log in with `APP_ACCESS_PASSWORD`.
4. Confirm `/dashboard` loads.
5. Confirm `/dashboard/system` shows Supabase ready.
6. Confirm `/dashboard/command-center` loads.
7. Confirm `/dashboard/products` loads.
8. Confirm `/dashboard/reports` loads.
9. Create a product.
10. Create a manual draft or fallback test draft.
11. Approve the draft.
12. Add a performance record.
13. Confirm recommendations and command center items update.
14. Confirm logout works.
15. Confirm unauthenticated `/dashboard/reports/export/products` redirects to `/login`.

WordPress smoke is optional. If configured, use only a WordPress test site and confirm created posts remain `draft`.

## Rollback Notes

- Vercel can roll back to the previous successful deployment from the Deployments tab.
- If environment values are wrong, update them in Vercel and redeploy.
- If a migration was applied to the wrong Supabase project, stop testing and inspect the database before making more changes.
- Do not delete user data as part of rollback unless the operator explicitly approves it.

## Known MVP Limitations

- Single-operator access gate only; no multi-user auth or RLS refactor yet.
- WordPress is optional and draft-only when configured.
- AI API keys are optional; Claude Code/manual draft creation is supported.
- No automatic publishing.
- No automatic approval.
- No automatic optimization or remediation.
- Data quality, recommendations, and command center actions are advisory only.
