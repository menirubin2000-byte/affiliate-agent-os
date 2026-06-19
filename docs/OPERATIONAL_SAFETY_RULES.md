# Affiliate Agent OS Operational Safety Rules

This project is an operator-controlled affiliate publishing system. The system may generate, clean, validate, queue, and execute content, but it must not fake operator approval or fake publishing.

## Required Workflow

```text
final_copy
-> MENI approval
-> publish_job
-> executor/API/helper
-> verified live URL
-> published_record
```

## Approval Rules

- `operator_approved` means MENI approved the exact final copy.
- Generated content should use `ready_for_operator_approval` after validation.
- Policy-blocked content should use `needs_system_fix` or a blocked publish job state.
- Bulk approval scripts are blocked unless a controlled maintenance override is set.

## Publishing Rules

- Do not publish from ad-hoc scripts in normal operation.
- Direct publishing scripts are blocked unless a controlled maintenance override is set.
- Never create `published_records` without a real verified live URL.
- Never use fallback URLs as verified published URLs.
- MENI must not be assigned copy/paste/manual URL collection work.

## Platform Rules

- New platform copy must be based on an existing `final_copies` row for the same product and language when one exists.
- Do not invent a new structure or placeholder copy for a platform if usable product copy already exists.
- If no source copy exists for that product/language, report that the source is missing and get explicit approval before writing new copy.
- Placeholder instructions such as "video structure" are not valid final copy.
- Quora: no direct affiliate links.
- Reddit: verify subreddit/community rules before publish readiness.
- TikTok: video/script only, no text-post publishing.
- LinkedIn: official/API/session-safe path only.
- Substack: no MENI copy/paste fallback; keep blocked until a safe executor exists.

## Secrets

- Never commit secrets or private local operator files.
- Use environment variables and `.env.example` placeholders only.
- Do not print secrets in logs, screenshots, or reports.
