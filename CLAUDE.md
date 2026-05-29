# Affiliate Agent OS - Claude Code Instructions

## Product Goal
Build and maintain a small working MVP for an affiliate marketing operations tool.

The phase-1 system must:
- store affiliate products
- generate review drafts
- generate social post drafts
- keep all generated content in draft state
- require human approval before any future publishing

## Scope For This Repo
Build only:
1. Product creation
2. Product listing
3. Claude Code assisted / manual draft creation
4. Draft approval workflow
5. Performance tracking
6. Recommendations
7. Setup documentation

Optional (not required):
- WordPress draft queue (connect only when a test site is available)

Do not build yet:
- Social scheduling
- Paid ad automation
- Auth or public multi-user features
- Analytics or click tracking

## WordPress Status
WordPress is cancelled for now. Do not require WordPress credentials.
Do not ask for card, paid plan, domain, renewal, or WordPress setup.
WordPress is marked as optional/not connected throughout the app.
The core workflow is: Product → Draft → Approval → Campaign Links → Performance → Recommendations → Improvement Queue.

## Tech Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- AI provider selected by environment variable

## Safety Rules
- Never hardcode secrets
- Never commit `.env.local`
- Never publish content automatically
- Treat all AI output as unapproved draft content
- Avoid misleading, medical, legal, or guaranteed-income claims
- Keep database writes on the server

## Database Scope
Current core tables:
- `products`
- `content_drafts`
- `draft_versions`
- `publishing_jobs`
- `performance_metrics`
- `improvement_tasks`
- `campaign_links`
- `saved_views`
- `affiliate_programs`
- `approval_items`

All schema changes should stay aligned with the migrations in `supabase/migrations/` unless the user explicitly asks to expand scope.

## Operation Summary Rule
When completing a stage, update: README.md stage summary, CLAUDE.md if schema changed, docs/STAGING_RELEASE_CHECKLIST.md if migrations applied. See `docs/OPERATION_LOG_TEMPLATE.md` for the full checklist.

## Development Rules
- Prefer small server-rendered pages with client components only where interactivity is needed
- Keep data access inside `lib/db.ts`
- Keep Supabase setup inside `lib/supabase/`
- Keep UI simple and readable
- Add focused tests or verification steps when changing shared behavior

## Acceptance Standard
Before considering a task done, confirm:
- products can be created manually
- products appear in the table
- review draft generation creates 1 draft
- social draft generation creates 5 drafts
- draft approval updates status correctly
- documentation and env templates stay current
