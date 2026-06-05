# App Structure — Affiliate Agent OS

> Static map of routes, server actions, lib modules, and infrastructure for the live app at
> https://affiliate-agent-os.vercel.app . Generated from the source tree, not from memory.

## 1. Hosting and entry

- **Framework:** Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui.
- **Deploy:** Vercel project `affiliate-agent-os` (id `prj_zo4SsU4CN8bhALSO97kmoJn7TwYy`).
- **DB:** Supabase Postgres (`gbkwydsodondarccqyet`).
- **Auth gate:** single-operator password (`APP_ACCESS_PASSWORD`) via `app/login` + middleware.

## 2. Public routes

| Path | Purpose |
| --- | --- |
| `/login` | Single-operator login form (`app/login/page.tsx`, action in `app/login/actions.ts`). |
| `/logout` | Clear session cookie (`app/logout/route.ts`). |
| `/legal/terms` | Terms of Service (Required for TikTok/Pinterest reviews). |
| `/legal/privacy` | Privacy Policy. |

## 3. English dashboard (`/dashboard/...`)

| Path | Purpose |
| --- | --- |
| `/dashboard` | English overview (legacy). |
| `/dashboard/products` | Product list. |
| `/dashboard/products/new` | Add product form. |
| `/dashboard/products/[id]` | Product detail. |
| `/dashboard/products/import` | Bulk CSV import. |
| `/dashboard/affiliate-programs` | Affiliate program list + edit. |
| `/dashboard/campaigns` | Campaigns list. |
| `/dashboard/campaigns/[id]` | Campaign detail. |
| `/dashboard/campaign-links` | UTM campaign links. |
| `/dashboard/approvals` | Generic approval queue. |
| `/dashboard/drafts` | Draft list. |
| `/dashboard/drafts/new` | New draft. |
| `/dashboard/drafts/[id]/edit` | Edit draft. |
| `/dashboard/drafts/[id]/review` | Review draft. |
| `/dashboard/drafts/[id]/versions/[versionId]` | Draft version diff. |
| `/dashboard/publishing` | Publishing queue overview. |
| `/dashboard/performance` | Performance metrics. |
| `/dashboard/performance/import` | Import performance CSV. |
| `/dashboard/improvements` | Improvement task queue. |
| `/dashboard/reports` | Reports dashboard. |
| `/dashboard/reports/export/{campaigns,drafts,improvements,products}` | CSV export routes. |
| `/dashboard/saved-views` | Saved dashboard views. |
| `/dashboard/data-quality` | Data quality warnings. |
| `/dashboard/system` | System checks. |
| `/dashboard/command-center` | Command center (legacy). |
| `/dashboard/operator` | English operator view. |

## 4. Hebrew operator dashboard (`/dashboard/he/...`)

| Path | Purpose |
| --- | --- |
| `/dashboard/he` | Main operator overview. Uses `getPlatformRoutingOverview` for live routing. |
| `/dashboard/he/operator` | Operator detail screen. |
| `/dashboard/he/campaigns` | Campaign workflow per product (eligible platforms, approvals). |
| `/dashboard/he/content-review` | Stable Final Copy review queue (Codex enforced). |
| `/dashboard/he/approve` | MENI manual approval queue. |
| `/dashboard/he/publish-ready` | Publish job state; renders `PlatformRegistryTable` so all 11 platforms (including pending_setup) are visible. |
| `/dashboard/he/browser-control` | Browser helper executor status. |
| `/dashboard/he/platform-capabilities` | Platform capability matrix. |

All Hebrew pages read the live DB through `lib/platform-routing-db.ts` and friends. No memory state.

## 5. APIs

| Path | Purpose |
| --- | --- |
| `POST /api/ai/generate` | Claude / AI provider draft generation. |
| `GET /api/auth/x/connect` | Initiate X OAuth 2.0 (PKCE). |
| `GET /api/auth/x/callback` | Complete X OAuth; saves connection state via `lib/platform-connections-db.ts`. |
| `GET /api/browser-helper/session` | Browser helper session pull. |
| `GET/POST /api/browser-helper/jobs` | Browser helper job queue. |
| `GET/POST /api/browser-helper/jobs/[id]` | Browser helper single job. |

## 6. Server actions (form mutations)

| File | Purpose |
| --- | --- |
| `app/dashboard/affiliate-programs/actions.ts` | Create / update affiliate programs. |
| `app/dashboard/approvals/actions.ts` | Approval queue actions. |
| `app/dashboard/campaign-links/actions.ts` | UTM link create / archive. |
| `app/dashboard/campaigns/actions.ts` | Campaign workflow updates. |
| `app/dashboard/drafts/actions.ts` | Draft CRUD. |
| `app/dashboard/he/approve/actions.ts` | MENI approve / reject / request fix. |
| `app/dashboard/he/campaigns/actions.ts` | Hebrew campaign decisions + adaptation sync. |
| `app/dashboard/he/content-review/actions.ts` | Final Copy review actions. |
| `app/dashboard/he/publish-ready/actions.ts` | Confirm prepared publish_job / LinkedIn official publish. |
| `app/dashboard/improvements/actions.ts` | Improvement task workflow. |
| `app/dashboard/performance/actions.ts` | Performance entry + sync. |
| `app/dashboard/performance/import/actions.ts` | Import performance CSV. |
| `app/dashboard/products/actions.ts` | Product CRUD. |
| `app/dashboard/products/import/actions.ts` | Bulk product import. |
| `app/dashboard/publishing/actions.ts` | Publishing queue actions. |
| `app/dashboard/saved-views/actions.ts` | Persisted view CRUD. |

## 7. Library modules

### Source of truth

| Module | Role |
| --- | --- |
| `lib/platform-routing.ts` | Pure routing logic. `ROUTED_CORE_PLATFORMS` lists all 11 surfaces; `buildPlatformRoutingOverview` computes states per product × platform. |
| `lib/platform-routing-db.ts` | Live DB loader. Reads `products`, `affiliate_programs`, `final_copies`, `publish_jobs`, `published_records` and feeds them to `buildPlatformRoutingOverview` with `includePendingSetupPlatforms: true`. |
| `lib/db.ts` | High-level data access (products, programs, drafts, performance). |
| `lib/supabase/server.ts` | Service-role Supabase client + `isSupabaseConfigured`. |
| `lib/supabase/client.ts` | Browser anon client (legacy, rarely used). |

### Domain

| Module | Role |
| --- | --- |
| `lib/campaign-workflow.ts` / `campaign-workflow-db.ts` | Campaign approval state machine. |
| `lib/content-review.ts` / `content-review-db.ts` | Stable Final Copy generation + review queue. |
| `lib/publish-jobs-db.ts` | Publish job queue access (`listPublishJobsForHebrewDashboard`). |
| `lib/publishing-rules.ts` | Per-platform publishing rules. |
| `lib/platform-policy.ts` | Affiliate disclosure / disallowed phrases. |
| `lib/platform-capabilities.ts` | Platform capability registry (browser executor vs official API). |
| `lib/platform-connections.ts` / `platform-connections-db.ts` | Stored OAuth / token state per platform. |
| `lib/linkedin-official-api.ts` / `linkedin-publisher.ts` | LinkedIn safe API path. |
| `lib/x-official-api.ts` | X / Twitter capability check. |
| `lib/browser-control.ts` / `browser-control-db.ts` | Browser helper executor protocol. |
| `lib/quality.ts` | Quality checks for drafts. |
| `lib/improvement-tasks.ts` | Improvement queue. |
| `lib/performance-insights.ts` / `performance-import-parser.ts` | Performance ingestion. |
| `lib/recommendations.ts` | Product recommendation engine. |
| `lib/action-items.ts` | Operator action items aggregator. |
| `lib/saved-views.ts` | Dashboard saved views. |
| `lib/ai.ts` / `claude-output-parser.ts` | AI provider + structured parse. |
| `lib/data-quality.ts` | Data quality warnings. |
| `lib/csv-export.ts` | CSV export helpers. |
| `lib/utm-builder.ts` | UTM link builder. |
| `lib/operator-auth.ts` / `approval-identity.ts` | Operator identity + access checks. |
| `lib/operator-social-profiles.ts` | Operator profile URLs per platform. |
| `lib/system.ts` | System status checks. |
| `lib/env.ts` | Env readiness summary. |
| `lib/utils.ts` | Generic utilities. |
| `lib/workflow.ts` | Workflow helpers. |
| `lib/wordpress.ts` | WordPress (optional / disabled). |

## 8. Scripts (operator-only utilities)

- `scripts/export-truth.js` — generates `docs/OPERATOR_SOURCE_OF_TRUTH.md` from live DB.
- `scripts/safety-guard.js` — required override gate for any direct publish or bulk approval script.
- `scripts/list-active-products.js` — list products with affiliate links.
- `scripts/list-approved.js` — list approved final copies.
- `scripts/full-status.js`, `scripts/check-schema.js`, `scripts/check-products.js` — DB inspection helpers.
- `scripts/publish-*.js` — direct publisher fallback. Gated behind safety-guard so operators cannot
  accidentally bypass MENI approval.
- `scripts/refresh-fb-tokens.js` — refresh Meta tokens after manual OAuth.
- `scripts/upload-to-supabase-storage.js` — upload assets to public bucket.
- `scripts/add-*.js` / `scripts/create-*.js` — one-off content generators (kept for traceability).

> Operator rule: never bypass the dashboard. Scripts are for emergency or audit only.

## 9. Database migrations

Located in `supabase/migrations/`:

```
001_init.sql                       — products, content_drafts
002_content_quality.sql            — quality fields on drafts/products
003_wordpress_queue.sql            — wordpress publishing queue (legacy)
004_performance_metrics.sql        — performance_metrics
005_service_role_api_grants.sql    — service_role grants (re-run after schema changes)
006_draft_versions.sql             — draft_versions
007_improvement_tasks.sql          — improvement_tasks
008_campaign_links.sql             — campaign_links
009_performance_campaign_link.sql  — campaign_link_id on performance_metrics
010_saved_views.sql                — saved_views
011_affiliate_program_tracking.sql — affiliate_programs
012_approval_items.sql             — approval_items
013_browser_control.sql            — browser_sessions, browser_jobs, browser_events
014_campaigns.sql                  — campaigns, campaign_approvals, source_contents, platform_adaptations
015_add_new_template_types.sql     — tiktok_script, quora_answer, reddit_post template types
016_platform_neutral_publishing.sql— platform_neutral publishing fields
017_campaign_approval_redesign.sql — campaign_approval state redesign
018_final_copies.sql               — final_copies (stable copy layer)
019_publish_jobs.sql               — publish_jobs queue
020_publish_job_policy_statuses.sql— blocked_policy / needs_system_fix / failed states
021_publish_executor_statuses.sql  — executor states (browser helper)
022_publish_job_final_confirmation.sql — pending_operator_confirmation + verified
023_platform_connections.sql       — platform_connections (X / others)
```

See `docs/DATA_MODEL.md` for the column-level shape of each table.
