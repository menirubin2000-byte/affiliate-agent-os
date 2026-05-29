# Claude Code Operations Guide

Reference for Claude Code sessions working on Affiliate Agent OS.

## Architecture

- **Framework**: Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL) with service role key for server access
- **Pattern**: types -> lib/db.ts helpers -> components -> page + actions -> tests

## Core Tables

| Table | Purpose |
|-------|---------|
| `products` | Affiliate products with SEO metadata |
| `content_drafts` | AI-generated or manual content drafts |
| `draft_versions` | Version history for drafts |
| `publishing_jobs` | Future publishing queue (not yet active) |
| `performance_metrics` | Click/conversion/revenue tracking |
| `improvement_tasks` | Actionable improvement items |
| `campaign_links` | Trackable UTM-tagged affiliate URLs |
| `saved_views` | User-saved filter configurations |
| `affiliate_programs` | Program signup tracking and status |

## File Conventions

### Adding a new feature

1. Create types in `types/<feature>.ts`
2. Add DB helpers to `lib/db.ts` (row interface, SELECT constant, map function, CRUD functions)
3. Create server actions in `app/dashboard/<feature>/actions.ts` ("use server")
4. Create client components in `components/<feature>/`
5. Create page in `app/dashboard/<feature>/page.tsx` (server component)
6. Add sidebar link in `components/dashboard/sidebar.tsx`
7. Integrate with Command Center (`lib/action-items.ts`) and Data Quality (`lib/data-quality.ts`)
8. Write tests in `tests/<feature>.test.ts`
9. Create migration in `supabase/migrations/`
10. Update this doc and CLAUDE.md

### Server actions pattern
```typescript
"use server"
import { assertIntegrationConfigured } from "@/lib/env"
// Extract from FormData, validate, call lib/db, revalidatePath, redirect
```

### Page pattern
```typescript
export const dynamic = "force-dynamic"
// Server component: fetch data with Promise.all, pass to client components
```

## Safety Rules

- **Never** hardcode secrets or commit `.env.local`
- **Never** auto-publish content. All AI output = draft status
- **Never** skip human approval steps
- **Always** use `assertIntegrationConfigured("supabase")` in server actions
- **Always** validate FormData inputs server-side
- **Always** revalidatePath after mutations
- PostgreSQL arrays use `{a,b,c}` format, not comma-separated strings
- `content_drafts` requires both `content_type` and `template_type` (NOT NULL)

## Testing

```bash
npx tsx --test tests/<file>.test.ts   # Run one test file
npx tsx --test tests/                  # Run all tests
npx next build                         # Full build + type check
```

## Database Access

- Direct PostgreSQL: IPv6 only (`db.gbkwydsodondarccqyet.supabase.co`)
- Supabase REST API: Works from any network
- Migration scripts: `scripts/apply-remote-migrations.mjs`
- Service role key grants full CRUD on all public tables

## Operation Summary Rule

When completing a stage, update:
- `README.md` stage summary
- `CLAUDE.md` if schema or conventions changed
- `docs/STAGING_RELEASE_CHECKLIST.md` if migrations applied
- Git commit with stage number in message
