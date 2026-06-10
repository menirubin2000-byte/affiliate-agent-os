# Affiliate Agent OS - Claude Code Instructions

## 🛑 לפני כל פעולה - לפתוח ולקרוא:
**`/dashboard/he/claude-rules`** (https://affiliate-agent-os.vercel.app/dashboard/he/claude-rules)
שם רשום: אסור "אי אפשר", חובה 3 ניסיונות, בדיקת `.env.local`, ולדווח "ניסיתי X, Y, Z".

## 📡 Sandbox allowlist - מה אני יכול לקרוא דרך HTTP/fetch ישירות
לפני שאני מדווח "לא יכול להגיע ל-X" - לבדוק אם הוא ברשימה הזו:
- `linkedin.com` + `api.linkedin.com` (LinkedIn web + REST API)
- `medium.com` + `api.medium.com` (Medium web + REST API)
- `menirubin.substack.com` (Substack publish)
- `quora.com` + `he.quora.com` (Quora אנגלית + עברית)
- `reddit.com` + `www.reddit.com` + `oauth.reddit.com` (Reddit web + OAuth API)
- `db.gbkwydsodondarccqyet.supabase.co` + `supabase.co` (Supabase DB + API)

הרשימה הזו מתוחזקת ע"י MENI ב-Claude Code settings (Domain allowlist).
אם הדומיין ברשימה - אני יכול לקרוא אליו ישיר. אם לא - לבקש מ-MENI להוסיף.

## 🔥 חוק 0 — דפדפן MCP פעיל. אל תעצור. אל תשאל אישור שוב לפרסום.

**ה-Claude in Chrome extension אצל MENI מחובר ומאושר על הדומיינים הבאים:**

- `linkedin.com`
- `medium.com`
- `menirubin.substack.com`
- `he.quora.com`
- `db.gbkwydsodondarccqyet.supabase.co`

**המשמעות התפעולית:**

1. **MENI כבר נתן רשות מתמשכת לפרסם** בפלטפורמות האלה דרך ה-MCP. הרשות נשמרת ב-extension settings. **לא לבקש רשות שוב לפרסום בודד.**
2. **MENI מחובר** לחשבונות שלו בדפדפן הזה. כשאתה רואה מסך login בקריאה ראשונה - זה רק redirect ביניים. רענן/חכה וקראי שוב לפני שמסיק שאין סשן.
3. **אסור להזין סיסמה / טוקן / קוד 2FA** - הסשן כבר קיים. רק לפעול דרכו.
4. **פרסומים קודמים הצליחו דרך הזרימה הזו** - יש 10 published_records מאומתים עם URL חי. זה לא ניסיון ראשון.
5. **כשMENI אומר "פרסם" / "תעשה X מוצרים" - זה אישור explicit מספיק** לכל הפעולות בטווח שצוין. לא לעצור באמצע ולא לבקש אישור-לפי-פעולה.
6. **אם MENI לא ביקש לעצור - לא לעצור.** "תעשה 3 מוצרים תעצור דווח" = להשלים את כל 3 ואז לעצור. לא לעצור אחרי פוסט אחד.

**טעות חוזרת לתקן:** עצירה / בקשת אישור חוזרת באמצע batch של פרסום שכבר אושר. אל תחזור עליה.

## 🔁 פקודות סינכרון - לזכור פעם אחת ולא להמציא בכל פעם

אחרי כל פעולה חיצונית שמשנה DB (פרסום ב-FB/IG, החלפת תמונה, ייבוא CSV וכו'):

```
npm run sync:publish     # מושך פוסטים חדשים מ-FB Graph + IG Graph לתוך published_records
npm run sync:truth       # מרענן docs/OPERATOR_SOURCE_OF_TRUTH.md
npm run sync:review-pack # מרענן docs/POST_REVIEW_PACK.md + .json
npm run sync:images      # מסנכרן תמונות מהתיקייה המקומית ל-Supabase Storage
npm run sync:all         # מריץ publish + truth + review-pack ברצף
```

**איפה רואים מה מחובר ומה לא:**
- `/dashboard/he` - כרטיס "חיבורי פלטפורמות" מציג סטטוס פר surface (connected / api_access_not_ready / requires_reconnect / לא נרשם).
- הנתונים מגיעים מטבלת `platform_connections` בכל טעינה - לא מ-cache, לא מ-env.

## 🔴 חוק ראשון — להפעיל את התוכנה הקיימת, לא לבנות חדשה

**שם התוכנה:** Affiliate Agent OS
**תקייה:** `C:\Users\USER\Documents\אוטומציה`
**Live URL:** https://affiliate-agent-os.vercel.app/dashboard/he
**Repo:** https://github.com/menirubin2000-byte/affiliate-agent-os

התוכנה **כבר קיימת** וכוללת:
- דשבורד שלם בעברית (`/dashboard/he/...`)
- DB מלא ב-Supabase עם 21 מוצרים פעילים, 80+ final_copies, publish_jobs, performance_metrics
- workflow מסודר: `final_copy → MENI approves in UI → publish_job → executor → published_records`
- חיבורי פלטפורמות פעילים: Facebook + Instagram (טוקנים תקפים, פוסטים פורסמו)

### חוקי תפעול
1. **להוסיף מוצר** → דרך `/dashboard/products/new` בדפדפן, **לא דרך סקריפט CLI**.
2. **לאשר פוסט** → דרך `/dashboard/he/approve`, **לא דרך SQL ישיר**.
3. **לפרסם פוסט** → דרך `/dashboard/he/publish-ready` → publish_job, **לא דרך `node scripts/publish-*.js` ישיר**.
4. **כל סקריפט `publish-*.js` חוסם את עצמו** עם `safety-guard.js` (Codex אכף).
5. **אסור auto-approval.** רק MENI מאשר.
6. **אסור affiliate link ישיר ב-Quora/Reddit.**
7. **אסור פרסום טקסט ל-TikTok** — פלטפורמת וידאו.

### מה לעשות לפני שמוסיפים כל דבר חדש
1. לבדוק אם יש כבר דף בדשבורד שעושה את זה.
2. לבדוק אם יש כבר טבלה ב-DB שמייצגת את זה.
3. לבדוק אם יש כבר API route ב-`app/api/`.
4. רק אם אין → להוסיף כפיצ'ר במערכת, **לא** כסקריפט חד-פעמי.

---

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

---

## Affiliate Agent OS - Operational Context (Cached)

### Core Rule
This is a fully automated system. Claude runs everything end-to-end without stopping.

The ONLY time Claude stops and asks MENI is:
- First-time approval of a NEW post before its first publish on a platform

Everything else Claude does automatically without asking:
- Generate drafts
- Run quality checks
- Create campaign links
- Build UTM URLs
- Update dashboards
- Run verify
- Fix bugs
- Update docs
- Create migrations
- Any code change
- Any DB operation
- Any file operation

DO NOT stop to ask "should I continue?" or "click this button" or "do you want me to..."
DO NOT create buttons for the operator to click when Claude can run the action directly.
DO NOT ask permission for routine operations.
JUST DO IT AND REPORT RESULTS.

All communication in Hebrew. Code/technical identifiers stay in English.
Email for all signups: Rubin-Q.S@rsqs.net (NEVER use menirubin2000@gmail.com)

### Live Dashboard
https://affiliate-agent-os.vercel.app/dashboard/products

### Publishing Platforms & Profiles
- LinkedIn: https://www.linkedin.com/in/r-qs/
- Medium: https://medium.com/@Rubin-Q.S
- Substack: https://menirubin.substack.com
- TikTok: https://www.tiktok.com/@menirubin
- Quora: https://he.quora.com/profile/MENI-RUBIN
- Reddit: https://www.reddit.com/user/Ok_Neighborhood1699/

### Active Affiliate Links
- Systeme.io: https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365
- ElevenLabs: https://try.elevenlabs.io/bcwxftu128a9

### Published Content (Real)
Systeme.io:
- LinkedIn: https://www.linkedin.com/feed/update/urn:li:activity:7466268842743422976/
- Medium: https://medium.com/@Rubin-Q.S/systeme-io-review-free-funnel-and-email-marketing-platform-for-online-businesses-8c4f042ceaa9
- Substack: https://menirubin.substack.com/p/systemeio-review

ElevenLabs:
- LinkedIn: https://www.linkedin.com/feed/update/urn:li:activity:7466494313263284224/
- Medium: https://medium.com/@Rubin-Q.S/elevenlabs-review-is-it-worth-it-in-2026-e9f198c5c04f
- Substack: https://menirubin.substack.com/p/elevenlabs-quick-review

### Affiliate Program Statuses
| Product | Network | Status |
|---------|---------|--------|
| Systeme.io | Direct | ✅ Link active (60% lifetime recurring) |
| Semrush | Impact | ⏳ In Review - contract accepted, waiting for Semrush approval. Payout: $1-$200/sale, $10/trial |
| Monday.com | PartnerStack | ⏳ Submitted |
| ClickUp | Impact/PartnerStack | ⏳ Submitted |
| ElevenLabs | PartnerStack | ✅ Link active! 22% recurring 12mo. Link: https://try.elevenlabs.io/bcwxftu128a9 |
| Writesonic | — | ⏳ Submitted |
| Jasper AI | Direct | ⏳ Submitted, awaiting approval |
| Riverside.fm | Rewardful | ⏳ Submitted, awaiting approval |
| Webflow | PartnerStack | ❌ Rejected |

### Impact.com / Semrush Onboarding
- Account: MENI RUBIN on Impact.com
- Onboarding: 80% complete
- Blocking: Medium website verification = "Pending Manual Verification"
- LinkedIn: verified (no verification required)
- Fallback: If blocked, add Substack as media property
- Support ticket #831073 submitted about verification
- Semrush sent Contract Application email (check and sign if needed)

### Publishing Summary (as of 2026-05-31)
- Target: every product with active affiliate link → 6 platforms
- 6 publishing platforms: LinkedIn, Medium, Substack, TikTok, Quora, Reddit
- 6 posts published (across 3 platforms: LinkedIn, Medium, Substack)
- 6 posts missing (TikTok, Quora, Reddit for both products)
- Active affiliate links: 2 (Systeme.io, ElevenLabs)

Published live (real URLs exist):
- Systeme.io: LinkedIn, Medium, Substack
- ElevenLabs: LinkedIn, Medium, Substack

Not published yet (draft/approval needed):
- Systeme.io: TikTok, Quora, Reddit
- ElevenLabs: TikTok, Quora, Reddit

- No fake metrics or URLs

### System Stats (as of 2026-05-30)
- 53 products (3 are test/staging - should be cleaned)
- 151 drafts (50 products × 3 platforms)
- 8 campaign links (7 Systeme.io + 1 test)
- 51 affiliate programs tracked
- 40 products missing SEO Intent
- All drafts have quality issues (missing disclosure, CTA, meta)
- Overview page = 404 (needs fix)
- Live publishing = disabled

### Bilingual Content Rules (EN + HE)
Every product must have final_copies in TWO languages:
1. **English (en)** — for international audience. Image: `image_url` (English text/branding).
2. **Hebrew (he)** — for Israeli audience. Image: `image_url_he` (Hebrew text/branding).

Rules:
- English post → English image. Hebrew post → Hebrew image.
- If `image_url_he` is null on the product, flag it — Hebrew posts exist but image is missing.
- YouTube Shorts / TikTok / Reels: same video can serve both languages, description changes per language.
- Quora/Reddit: indirect link rule applies to BOTH languages.
- `language` field on final_copies must be set: "en" or "he".
- When creating new product content, generate BOTH languages in the same batch.

### Video Content Rules
- YouTube uploads use the YouTube Data API (OAuth required).
- Videos under 60 seconds are uploaded as Shorts (add #Shorts to title).
- Video metadata: title, description (with affiliate link + hashtags), tags.
- Same video file can be used for YouTube Shorts, TikTok, and Instagram Reels.
- `video_url` on the product points to Supabase Storage.
- `video_status` must be "ready" before creating video final_copies.
- `video_suitable_for` array indicates which platforms the video fits.

### Do NOT Do
- Do not add WordPress
- Do not add AI API keys
- Do not create fake links or fake metrics
- Do not publish without operator approval
- Do not create accounts on user's behalf
- Do not enter passwords

### Priority Products (Next After Semrush)
1. Jasper AI
2. Surfer SEO
3. Riverside.fm
4. Zapier
5. ActiveCampaign

### Next Actions
1. Generate and approve drafts for Systeme.io: TikTok, Quora, Reddit
2. Generate and approve drafts for ElevenLabs: TikTok, Quora, Reddit
3. Publish approved drafts to TikTok, Quora, Reddit (with MENI approval)
4. Check real metrics for Systeme.io and ElevenLabs published posts
5. Keep pending affiliate programs (Semrush, Monday.com, ClickUp, Jasper AI, Riverside.fm) in follow-up
6. Do not create fake metrics - only record real data from platform dashboards
7. Do not mark any post published without a real URL

### Draft Template Types
| Template | Channel | Content Type | Description |
|----------|---------|-------------|-------------|
| review | Long-form | review | Product review with structure checks |
| comparison | Long-form | review | Product comparison with tradeoffs |
| buying_guide | Long-form | review | Buying guide with criteria |
| social_post | Social | social_post | Short social media post |
| tiktok_script | TikTok | social_post | 30-60s video script with hook |
| quora_answer | Quora | social_post | Helpful answer with product mention |
| reddit_post | Reddit | social_post | Community-style post with discussion |

All drafts are saved with status "draft" and require human approval. No auto-publishing.

### Workflow
Product → Affiliate Signup → Get Link → Create Campaign Link → Generate Draft (×6 platforms) → Quality Check → Human Approval → Publish to all 6 platforms (LinkedIn, Medium, Substack, TikTok, Quora, Reddit) → Track Performance
