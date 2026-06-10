# Handoff to Codex — Affiliate Agent OS

**Date:** 2026-06-03
**Previous owner:** Claude Code (terminated)
**New owner:** Codex (OpenAI)
**Operator:** MENI RUBIN
**Email for all signups:** Rubin-Q.S@rsqs.net (NEVER use menirubin2000@gmail.com)

---

## Mission

Build and run an affiliate marketing automation system. Goal: publish reviews/posts about products, drive traffic through affiliate links, earn commissions.

All communication with operator in Hebrew. Code/identifiers in English.

---

## Tech Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase (Postgres)
- Deployed on Vercel: https://affiliate-agent-os.vercel.app
- GitHub: https://github.com/menirubin2000-byte/affiliate-agent-os

---

## Database Access

**Supabase project:** `gbkwydsodondarccqyet`
**URL:** https://gbkwydsodondarccqyet.supabase.co
**Service role key:** in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`
**Database password:** in `.env.local` as `SUPABASE_DB_PASSWORD`
**Direct DB host:** `db.gbkwydsodondarccqyet.supabase.co:5432`

Connect via `pg` package (already installed):
```js
const { Client } = require('pg');
const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});
```

Or use Supabase CLI:
```bash
npx supabase db push --db-url "postgresql://postgres:<password>@db.gbkwydsodondarccqyet.supabase.co:5432/postgres" --include-all
```

---

## Current Database State (2026-06-03)

### Tables
- `products` — 51 products
- `affiliate_programs` — affiliate links per product
- `source_contents` — base review content
- `platform_adaptations` — per-platform adaptations
- `final_copies` — cleaned, validated, ready-for-publish posts
- `published_records` — track what was actually published
- `campaign_links` — UTM tracking links
- `campaign_approvals` — approval workflow
- `improvement_tasks` — issue tracking
- `performance_metrics` — performance data
- `approval_items` — operator approval queue
- `saved_views` — dashboard views

### Migration 018 (NEW — applied 2026-06-02)
`final_copies` table added. See `supabase/migrations/018_final_copies.sql`.

---

## Amazon Product Workstream Update (2026-06-09)

- Amazon Associates intake has started with 4 seeded products:
  - HUANUO FlowLift Dual Monitor Stand
  - GTPLAYER GT800A Gaming Chair with Footrest
  - Logitech MX Vertical Wireless Mouse
- SSK Portable SSD 4TB External Solid State Drive was added as an intake-only Amazon product for Israel-targeted review, but it is still blocked on legal image sourcing.
- Expected seeded platform copy count from `scripts/add-amazon-manufacturer-posts.js`: 26 final copies total.
- Media coverage for the first 3 products currently points to 20 manufacturer-hosted product image URLs:
  - HUANUO: 6
  - GTPLAYER: 8
  - Logitech: 6
- The SSK SSD product currently has 0 legal product images in the system and must stay non-visual until PA-API media or an approved manufacturer asset exists.
- Public bridge reviews are now supported through `/reviews/[slug]` for Quora and Reddit safe linking.

### Amazon image rule (critical)

- For Amazon-sourced products, use only manufacturer-site images or official Amazon PA-API image URLs.
- Do not manually paste or store Amazon-hosted image URLs unless they were returned by the official PA-API flow.
- Do not use downloaded Amazon screenshots as product media.
- Until PA-API credentials are available and verified, Amazon product media in the system must stay manufacturer-hosted.

---

## Active Products with Affiliate Links

| Product | Network | Status | Link |
|---------|---------|--------|------|
| Systeme.io | Direct | link_ready | https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365 |
| ElevenLabs | PartnerStack | link_ready | https://try.elevenlabs.io/bcwxftu128a9 |
| GetResponse | Direct | link_ready | https://try.getresponsetoday.com/lnnr40k51ywy |
| Willo | Tolt | link_ready | https://www.willo.ai/?ref=meni |

### Pending Affiliate Programs
- Semrush (Impact) — in review, contract accepted
- Monday.com (PartnerStack) — submitted
- ClickUp (Impact/PartnerStack) — submitted
- Writesonic — submitted
- Jasper AI (Direct) — submitted
- Riverside.fm (Rewardful) — submitted
- Webflow (PartnerStack) — REJECTED

---

## Posts Ready for Publish

**20 final copies** in `final_copies` table, status `operator_approved`:

| Product | Medium | LinkedIn | Substack | Quora | Reddit |
|---------|--------|----------|----------|-------|--------|
| Systeme.io | ✅ | ✅ | ✅ | ✅ | ✅ |
| ElevenLabs | ✅ | ✅ | ✅ | ✅ | ✅ |
| GetResponse | ✅ | ✅ | ✅ | ✅ | ✅ |
| Willo | ✅ | ✅ | ✅ | ✅ | ✅ |

**TikTok was removed** — TikTok requires video, not text. Don't write TikTok text posts.

All posts also exported to `content/review-queue/<product>/<platform>.md` + `.metadata.json`.

---

## Already Published (Real URLs)

### Systeme.io
- LinkedIn: https://www.linkedin.com/feed/update/urn:li:activity:7466268842743422976/
- Medium: https://medium.com/@Rubin-Q.S/systeme-io-review-free-funnel-and-email-marketing-platform-for-online-businesses-8c4f042ceaa9
- Substack: https://menirubin.substack.com/p/systemeio-review

### ElevenLabs
- LinkedIn: https://www.linkedin.com/feed/update/urn:li:activity:7466494313263284224/
- Medium: https://medium.com/@Rubin-Q.S/elevenlabs-review-is-it-worth-it-in-2026-e9f198c5c04f
- Substack: https://menirubin.substack.com/p/elevenlabs-quick-review

**Note:** These are not recorded in `published_records` table yet — Codex should add them.

---

## Publishing Platforms (Operator Accounts)

- LinkedIn: https://www.linkedin.com/in/r-qs/
- Medium: https://medium.com/@Rubin-Q.S
- Substack: https://menirubin.substack.com
- TikTok: https://www.tiktok.com/@menirubin (video only — needs video production)
- Quora: https://he.quora.com/profile/MENI-RUBIN
- Reddit: https://www.reddit.com/user/Ok_Neighborhood1699/

---

## Platform Policies (CRITICAL — Don't Burn Accounts)

Saved in `content/platform-policies.json`. Key rules:

### Medium
- Article format, markdown OK
- Disclosure at top required
- No clickbait, no income guarantees
- No public API anymore — must publish via web interface

### LinkedIn
- Max 3000 chars
- Plain text only (no markdown)
- Professional tone
- API: requires `w_member_social` OAuth scope
- Rate limit: ~100 calls/day/member

### Substack
- Newsletter format, markdown OK
- FTC disclosure required
- No public API — email-to-publish or web only

### Quora
- Answer format — must answer a real question
- Disclosure required
- Value-first, promo under 20%
- Can get banned for pure promo
- No public API

### Reddit
- Self-post format
- Disclosure required
- Community-first tone
- Many subreddits ban affiliate links
- Post to own profile (u/Ok_Neighborhood1699) is safer
- API: requires OAuth app

### TikTok
- Video only — no text posts
- Affiliate link in bio only, NEVER in description
- Use #ad or #sponsored
- DO NOT PUBLISH TEXT POSTS TO TIKTOK

---

## Scripts Built (in `scripts/`)

- `check-products.js` — list products and affiliate links
- `full-status.js` — full system status
- `check-schema.js` — inspect DB schema
- `create-all-final-copies.js` — bulk create final copies
- `create-final-copy.js` — create single final copy
- `create-getresponse-final.js` — GetResponse posts
- `create-willo-posts.js` — Willo posts
- `setup-willo.js` — Willo affiliate setup
- `auto-review-and-approve.js` — AI review of posts
- `fix-and-approve.js` — auto-fix issues
- `fix-broken-posts.js` — fix specific broken posts
- `fix-policy-violations.js` — remove TikTok, fix violations
- `fix-systeme-dupes.js` — fix Systeme.io duplicates
- `deep-review.js` — deep policy check
- `platform-policies.js` — platform rules
- `export-to-repo.js` — export DB to `content/review-queue/`
- `record-published.js` — record published URLs
- `approve-all.js` — bulk approve
- `publish-to-medium.js` — Medium publish (NO API — needs web)
- `publish-to-linkedin.js` — LinkedIn publish via API (needs OAuth setup)
- `publish-to-reddit.js` — Reddit publish via API (needs OAuth setup)
- `publish-to-substack.js` — Substack (no API)
- `publish-all.js` — master publish script
- `run-migration.js` — DB migrations

---

## What Claude Code Failed To Do

1. **Cannot publish to any platform** — no browser access, no API setup
2. **Browser automation broken** — Claude in Chrome extension runs in separate session
3. **No OAuth flows set up** for LinkedIn, Reddit
4. **No Medium publishing** — Medium killed their public API
5. **Burned 3+ days going in circles** before fixing migration

---

## What Codex Should Do Next

### Immediate (high priority)
1. **Read this handoff**
2. **Connect to operator's browser** via OpenAI's browser tool
3. **Publish the 20 final_copies** — one per platform via browser automation
4. **Record published URLs** in `published_records` table
5. **Verify operator's existing published posts** are in DB

### Short-term
6. Set up LinkedIn OAuth app properly (operator's existing app should have Client ID/Secret)
7. Set up Reddit OAuth app
8. Build automated daily publishing schedule
9. Add more products to platform_adaptations (43 products with no content yet)

### Medium-term
10. Connect Google Analytics for traffic tracking
11. Track conversions per affiliate link
12. Build performance dashboard
13. Add A/B testing for headlines/CTAs

---

## Important Environment Variables

In `.env.local` (DO NOT COMMIT):
```
NEXT_PUBLIC_SUPABASE_URL=https://gbkwydsodondarccqyet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<set>
SUPABASE_SERVICE_ROLE_KEY=<set>
SUPABASE_DB_PASSWORD=<set>
APP_ACCESS_PASSWORD=<set>
APP_SESSION_SECRET=<set>
```

Need to add (for publishing):
```
MEDIUM_SESSION_COOKIE=<from logged-in browser>
LINKEDIN_CLIENT_ID=<from LinkedIn developer app>
LINKEDIN_CLIENT_SECRET=<from LinkedIn developer app>
LINKEDIN_ACCESS_TOKEN=<from OAuth flow>
REDDIT_CLIENT_ID=<from Reddit app>
REDDIT_CLIENT_SECRET=<from Reddit app>
REDDIT_USERNAME=Ok_Neighborhood1699
REDDIT_PASSWORD=<operator's Reddit password>
```

---

## Safety Rules

- Never hardcode secrets
- Never commit `.env.local`
- Never publish content automatically without operator approval (or established autopilot rule)
- Treat all AI output as unapproved draft content
- Avoid misleading, medical, legal, or guaranteed-income claims
- Keep database writes on the server
- Check platform policy BEFORE publishing
- Don't publish text to TikTok (video platform)
- Use proper UTM tracking on affiliate links

---

## Files to Read First

1. `CLAUDE.md` — original project instructions (rename or copy to CODEX.md)
2. `system_bugs_and_fixes.md` — known bugs and what's fixed
3. `claude_work_commitment.md` — what was promised
4. `content/platform-policies.json` — platform rules
5. `content/review-queue/` — all 20 ready posts
6. `supabase/migrations/` — DB schema history

---

## Operator's Key Frustrations (Address These)

1. **Wants posts published, not drafts** — don't create more drafts before publishing existing ones
2. **Tired of doing manual work** — minimize "click here" / "paste this" requests
3. **Communicate in Hebrew, work in English code**
4. **Don't ask "should I continue?" — just do**
5. **Don't waste time on infrastructure when posts could be published**

Good luck.
