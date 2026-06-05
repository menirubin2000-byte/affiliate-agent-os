<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:affiliate-agent-os-safety-rules -->
# Affiliate Agent OS Safety Rules

These rules are mandatory for every agent working in this repository.

## MENI approval is required

- Never set `final_copies.status = 'operator_approved'` unless MENI explicitly approved that exact final copy.
- Generated content may become `ready_for_operator_approval` only after deterministic cleanup and validation.
- Blocked or policy-sensitive content must become `needs_system_fix` or a blocked publish job, not approved.
- Do not create new approvals, publish jobs, or published records to make a dashboard look cleaner.

## Publishing is not a script shortcut

- Do not publish directly from ad-hoc scripts unless the script is intentionally run with the repository safety override.
- The normal flow is:
  `final_copy -> MENI approval -> publish_job -> executor/API/helper -> verified live URL -> published_record`.
- Never create `published_records` without a real, verified live URL.
- Never use fallback/fake URLs as verified published records.
- MENI must not be assigned copy/paste/manual URL collection work.

## Platform policy rules

- Quora must not contain direct affiliate links.
- Reddit requires subreddit/community rule verification before publish readiness. Do not post affiliate-heavy content.
- TikTok is video/script only; do not publish text as TikTok.
- LinkedIn must use official/API/session-safe publishing only. Do not use prohibited browser automation.
- Browser Helper/executor must stop at login, CAPTCHA, 2FA, passkeys, payment, or legal acceptance.

## Secrets

- Do not commit secrets, tokens, passwords, private keys, or local operator files.
- Use environment variables and `.env.example` placeholders only.
- Do not print secrets in logs or reports.
<!-- END:affiliate-agent-os-safety-rules -->
