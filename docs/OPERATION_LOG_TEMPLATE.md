# Operation Log Template

Copy this template for each stage or significant operation.

---

## Stage [NUMBER]: [TITLE]

**Date**: YYYY-MM-DD
**Operator**: [human / claude-code / codex]
**Status**: [in-progress / complete / blocked]

### Objective

[One-sentence description of what this stage accomplishes]

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `path/to/file` | created / modified / deleted | Brief description |

### Migration

- [ ] Migration file created: `supabase/migrations/NNN_name.sql`
- [ ] Applied to local dev
- [ ] Applied to live Supabase (script: `scripts/...`)

### Tests

- [ ] Test file: `tests/feature.test.ts`
- [ ] All tests pass: `npx tsx --test tests/feature.test.ts`
- [ ] Existing tests still pass

### Build Verification

- [ ] `npx next build` passes
- [ ] No TypeScript errors
- [ ] No new warnings

### Seed Data

- [ ] Seed script created (if applicable)
- [ ] Seed data applied to live DB

### Documentation Updates

- [ ] `README.md` updated with stage summary
- [ ] `CLAUDE.md` updated (if schema/conventions changed)
- [ ] `docs/STAGING_RELEASE_CHECKLIST.md` updated (if migration applied)

### Git

- [ ] Changes committed
- [ ] Pushed to remote

### Notes

[Any issues encountered, decisions made, or follow-up items]

---

## Example: Stage 44

**Date**: 2026-05-29
**Operator**: claude-code
**Status**: complete

### Objective

Add Affiliate Program Signup Tracker and operational documentation layer.

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `types/affiliate-program.ts` | created | Types, constants, labels |
| `lib/db.ts` | modified | Added 7 affiliate program DB functions |
| `lib/data-quality.ts` | modified | Added checkAffiliatePrograms |
| `lib/action-items.ts` | modified | Added affiliate program action items |
| `app/dashboard/affiliate-programs/page.tsx` | created | Main page with stats, filters, form+list |
| `app/dashboard/affiliate-programs/actions.ts` | created | Server actions for create, update status, update link |
| `components/affiliate-programs/affiliate-program-form.tsx` | created | Client form component |
| `components/affiliate-programs/affiliate-program-list.tsx` | created | List with status transitions |
| `components/dashboard/sidebar.tsx` | modified | Added nav entry |
| `app/dashboard/products/[id]/page.tsx` | modified | Added affiliate programs section |
| `app/dashboard/command-center/page.tsx` | modified | Added affiliate_program filter |
| `app/dashboard/data-quality/page.tsx` | modified | Added affiliate_programs to byArea |
| `app/dashboard/page.tsx` | modified | Added affiliate_programs to byArea |
| `components/dashboard/action-items-panel.tsx` | modified | Added affiliate_program label |
| `tests/affiliate-programs.test.ts` | created | 18 tests for types, DQ, action items |
| `supabase/migrations/011_affiliate_program_tracking.sql` | created | Table + indexes + grants |
| `docs/OPERATOR_RUNBOOK.md` | created | Operator daily routine guide |
| `docs/CLAUDE_CODE_OPERATIONS.md` | created | Claude Code session reference |
| `docs/CODEX_OPERATIONS.md` | created | Codex task templates |
| `docs/OPERATION_LOG_TEMPLATE.md` | created | This template |
