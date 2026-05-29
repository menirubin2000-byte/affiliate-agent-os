# Codex Operations Guide

Reference for Codex (background agent) tasks on Affiliate Agent OS.

## What Codex Can Do

Codex runs autonomously in a sandboxed environment. It is well suited for:

- **Code changes**: Add features, fix bugs, refactor
- **Tests**: Write and run test files
- **Migrations**: Create new SQL migration files
- **Documentation**: Update docs, add comments
- **Build verification**: Run `npx next build` to confirm no type errors

## What Codex Cannot Do

- **Network access**: Cannot reach Supabase, cannot run migration scripts against live DB
- **Browser**: Cannot open pages or take screenshots
- **Secrets**: Cannot read `.env.local` (not committed)
- **Interactive prompts**: Cannot ask the operator questions mid-task

## Task Templates

### Add a new DB-backed feature

```
Add [feature] to Affiliate Agent OS.

1. Create types/[feature].ts with TypeScript interfaces
2. Add DB helpers to lib/db.ts (list, get, create, update functions)
3. Create server actions in app/dashboard/[feature]/actions.ts
4. Create form component in components/[feature]/[feature]-form.tsx
5. Create list component in components/[feature]/[feature]-list.tsx
6. Create page in app/dashboard/[feature]/page.tsx
7. Add nav link in components/dashboard/sidebar.tsx
8. Integrate with lib/action-items.ts and lib/data-quality.ts
9. Write tests in tests/[feature].test.ts
10. Create migration in supabase/migrations/
11. Run npx next build to verify
```

### Fix a bug

```
Fix: [description of bug]

File: [path to file]
Expected: [what should happen]
Actual: [what happens now]

Run tests after fixing: npx tsx --test tests/[relevant].test.ts
Run full build: npx next build
```

### Add tests

```
Add tests for [feature] in tests/[feature].test.ts.

Follow the pattern in tests/data-quality.test.ts:
- Use node:test and node:assert/strict
- Create helper functions (makeProduct, makeDraft, etc.)
- Test edge cases and error conditions
- Run with: npx tsx --test tests/[feature].test.ts
```

## Conventions

- Server components by default, client components only for interactivity
- All DB access through `lib/db.ts`
- All form mutations through server actions with `"use server"`
- Types in `types/` directory, one file per domain
- Tests use `node:test` runner with `node:assert/strict`
- shadcn/ui components in `components/ui/`

## Platform Access Limitations

Codex runs in a sandboxed environment and **cannot** access external platforms:

- **No browser access**: Cannot open LinkedIn, Medium, or any external website.
- **No publishing**: Cannot post, publish, or share content on any platform.
- **No platform authentication**: Cannot log into any external service.
- **No live API calls**: Cannot reach Supabase or other external APIs at runtime.

Codex can prepare content for publishing (draft text, campaign links, disclosure text) but all actual publishing is handled by Claude Code sessions with browser access.

For platform operations, see:
- `docs/PLATFORM_ACCESS_MAP.md`
- `docs/PUBLISHING_POLICY.md`
- `docs/CLAUDE_CODE_OPERATIONS.md` (Platform Access section)

## Verification Checklist

Before marking a task complete:

1. `npx next build` passes (no type errors)
2. Relevant test file passes
3. No hardcoded secrets
4. No breaking changes to existing features
5. Migration file created if schema changed
