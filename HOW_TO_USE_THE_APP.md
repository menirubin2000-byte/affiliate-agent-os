# איך מפעילים את המערכת — Affiliate Agent OS

**Live URL:** https://affiliate-agent-os.vercel.app/dashboard/he

האפליקציה כבר קיימת. **לא לבנות סקריפטים חד-פעמיים. להשתמש בה.**

---

## הזרימה הנכונה (Codex enforced)

```
final_copy → MENI מאשר ב-UI → publish_job → executor → URL מאומת → published_records
```

**אסור:** סקריפטים שמפרסמים ישירות מה-CLI עוקפים את ה-workflow. כל סקריפט `publish-*` חוסם את עצמו עכשיו עם `safety-guard.js` אלא אם מועבר override מפורש.

---

## דפים פעילים במערכת

| URL | מטרה |
|-----|------|
| `/dashboard/he` | בית — מצב כללי |
| `/dashboard/he/campaigns` | קמפיינים פעילים |
| `/dashboard/he/content-review` | בדיקת קופי — תיקוני המערכת |
| `/dashboard/he/approve` | אישור טיוטות מני |
| `/dashboard/he/publish-ready` | פוסטים מוכנים לפרסום |
| `/dashboard/he/browser-control` | שליטה בדפדפן |
| `/dashboard/products` | מוצרים |
| `/dashboard/affiliate-programs` | תוכניות אפיליאט |
| `/dashboard/campaign-links` | לינקים עם UTM |
| `/dashboard/publishing` | תור publish_jobs |
| `/dashboard/performance` | ביצועים |

---

## טבלאות DB מרכזיות

| טבלה | תפקיד |
|------|--------|
| `products` | קטלוג מוצרים |
| `affiliate_programs` | לינקים + רשת + עמלה לכל מוצר |
| `source_contents` | תוכן מקור (review angle) |
| `platform_adaptations` | התאמה לפלטפורמה |
| `final_copies` | קופי סופי — סטטוס: draft_internal → needs_system_fix → ready_for_operator_approval → operator_approved → ready_for_manual_publish → published_verified |
| `publish_jobs` | תור פרסום (אחרי אישור מני) |
| `published_records` | URLs חיים מאומתים |
| `platform_connections` | טוקנים לחיבור פלטפורמות |

---

## פלטפורמות במערכת

### עובדות לפרסום
- **Facebook Page** (Rubin Quantum Systems) — long-lived Page Token
- **Instagram** (@rubinmeni Business, מקושר ל-FB Page) — Reels/Image דרך FB Page Token

### תוכן יש, חיבור חסר
- **Medium** (@Rubin-Q.S) — אין API, פרסום ידני
- **LinkedIn** (in/meni-rubin-342967412) — דורש OAuth user token
- **Substack** (menirubin.substack.com) — אין API
- **X (Twitter)** (@MENIRUBINqs) — אפליקציה קיימת, ממתין ל-OAuth user token
- **Pinterest** (rubinqs0941) — App ID 1578030, Trial pending

### תוכן + וידאו, ממתין לאישור
- **TikTok** (@menirubin) — אפליקציה נוצרה, ממתין ל-demo video + review

### לא במערכת
- **Quora / Reddit** — תוכן נכתב אך **בלי affiliate link ישיר** (מדיניות הפלטפורמות)

---

## פלטפורמות לפי מוצר

**16 מוצרים פעילים × 5 פלטפורמות טקסט = 80 final_copies**

לכל מוצר יש:
- `medium.md` — מאמר ארוך עם affiliate link (status: ready_for_operator_approval)
- `linkedin.md` — פוסט קצר עם affiliate link (status: ready_for_operator_approval)
- `substack.md` — newsletter עם affiliate link (status: ready_for_operator_approval)
- `quora.md` — תשובה לשאלה, בלי link ישיר (status: needs_system_fix)
- `reddit.md` — self-post, בלי link ישיר (status: needs_system_fix)

**כל הקבצים ב-`content/review-queue/<product-slug>/`.**

חסר עדיין: facebook, instagram, tiktok, x, pinterest adaptations (תיווסף ע"י סקריפט שמייצר adapter פר-פלטפורמה).

---

## מה לעשות עכשיו

### 1. אישור פוסטים מאושרים
- כנס ל-`/dashboard/he/approve`
- בדוק את הפוסטים ב-status `ready_for_operator_approval`
- אשר / דחה / בקש תיקון

### 2. פרסום פוסטים מאושרים
- כנס ל-`/dashboard/he/publish-ready`
- לחץ "פרסם" — המערכת תיצור publish_job
- ה-executor יפעיל את האינטגרציה לפלטפורמה

### 3. הוספת מוצר חדש
- `/dashboard/products/new` — שם, אתר, תיאור
- `/dashboard/affiliate-programs` — הוסף לינק לרשת לעמלה

### 4. חיבור פלטפורמה חדשה
- `/dashboard/he/browser-control` — סטטוס חיבורים
- כל פלטפורמה דורשת אפליקציה משלה + OAuth flow פעם אחת

---

## חוקי מערכת (לא לעקוף)

1. **רק MENI מאשר.** המערכת לא מאשרת לבד.
2. **Quora/Reddit בלי לינק ישיר.** התוכן מציין את המוצר אבל בלי URL אפיליאט.
3. **כל פרסום עובר publish_job.** סקריפט CLI עוקף = סכנה.
4. **TikTok חייב וידאו אמיתי.** לא טקסט.
5. **Token storage server-only.** לא בדפדפן, לא ב-localStorage.
