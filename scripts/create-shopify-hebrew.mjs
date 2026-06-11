import crypto from "node:crypto"
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local" })

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const pid = "091fe26a-c5a4-44c5-acc0-fc5f109d8fdd"
const aff = "https://shopify.pxf.io/QY49QA"
const indirect = "https://www.linkedin.com/in/r-qs/"
const img_en = "https://gbkwydsodondarccqyet.supabase.co/storage/v1/object/public/product-images/shopify.png"
const video = "https://gbkwydsodondarccqyet.supabase.co/storage/v1/object/public/product-images/shopify.mp4"

// 1. Update English YouTube copy with proper Shorts metadata
const ytBody = `Affiliate disclosure: This video includes an affiliate link.

Shopify Review 2026 — Is it still the best platform to launch your online store?

In this quick review:
- Store live in hours, not weeks
- Multi-channel selling (Instagram, TikTok, Amazon, Google)
- Built-in payments and shipping
- App ecosystem with 8,000+ integrations
- Pricing from $29/mo to $299/mo

Try Shopify: ${aff}

#shopify #ecommerce #onlinestore #shopifyreview #shorts #2026`

const { error: e1 } = await s.from("final_copies").update({
  title: "Shopify Review 2026: Launch Your Store in Hours #Shorts",
  body: ytBody,
  media_asset_url: video,
  media_status: "ready",
  affiliate_link: aff,
  validation_status: "valid",
  blocking_reasons: [],
}).eq("product_id", pid).eq("platform", "youtube").eq("language", "en")
console.log("YouTube EN updated:", e1 ? e1.message : "OK")

// 2. Create all Hebrew copies
const copies = [
  {
    platform: "linkedin",
    title: "Shopify: עדיין הפלטפורמה הטובה ביותר לחנות אונליין ב-2026",
    body: `*גילוי נאות: פוסט זה מכיל קישור שותפים.*

חושבים לפתוח חנות אונליין?

Shopify עדיין מובילה למוכרים עצמאיים ועסקים קטנים, והנה למה:
- חנות פעילה תוך שעות, בלי שרתים לנהל
- מכירה רב-ערוצית: Instagram, TikTok, Amazon, Google
- מערכת אפליקציות ענקית עם 8,000+ אינטגרציות
- תשלומים ומשלוחים מובנים
- מחיר: $29-$299 לחודש

למי זה מתאים:
מי שרוצה למכור מוצרים פיזיים או דיגיטליים בלי להתעסק בתשתיות טכניות.

למי פחות:
אם אתם צריכים התאמה אישית עמוקה ברמת הקוד, WooCommerce או Medusa עשויים להתאים יותר.

נסו את Shopify: ${aff}`,
  },
  {
    platform: "medium",
    title: "סקירת Shopify 2026: האם זו עדיין הפלטפורמה הנכונה לחנות אונליין?",
    body: `*גילוי נאות: מאמר זה מכיל קישור שותפים. אם תירשמו דרך הקישור, ייתכן שאקבל עמלה ללא עלות נוספת עבורכם.*

## מה זה Shopify

Shopify היא פלטפורמת מסחר אלקטרוני מתארחת שמאפשרת לכל אחד לפתוח חנות אונליין בלי לנהל שרתים, אינטגרציות תשלום או אירוח.

## למה Shopify

אם אתם רוצים חנות אונליין פעילה תוך שעות ולא שבועות, Shopify עדיין מנצחת. הפלטפורמה מטפלת בכל התשתית — אתם רק מוסיפים מוצרים ומתחילים למכור.

## מה אני אוהב

- **הקמה מהירה**: מהרשמה לחנות פעילה תוך שעות
- **מכירה רב-ערוצית**: Instagram, TikTok Shop, Amazon, Google Shopping
- **אפליקציות**: 8,000+ אינטגרציות בחנות האפליקציות
- **תשלומים מובנים**: Shopify Payments בלי צד שלישי
- **משלוחים**: תעריפי משלוח מוזלים + הדפסת תוויות

## מה פחות

- **עמלות עסקה**: 0.5%-2% אם לא משתמשים ב-Shopify Payments
- **התאמה אישית מוגבלת**: Liquid (שפת התבניות) פחות גמישה מקוד מלא
- **מחיר עולה**: עם אפליקציות וערכות נושא פרימיום, העלויות מצטברות

## תמחור

| תוכנית | מחיר חודשי | מתאים ל- |
|---------|-----------|----------|
| Basic | $29 | מתחילים ומוכרים בודדים |
| Shopify | $79 | עסקים צומחים |
| Advanced | $299 | עסקים גדולים עם דיווח מתקדם |

## שורה תחתונה

Shopify היא הבחירה הכי בטוחה למי שרוצה חנות אונליין פשוטה שעובדת. לא הכי זולה, לא הכי גמישה, אבל הכי מהירה מרעיון למכירה ראשונה.

נסו את Shopify: ${aff}`,
  },
  {
    platform: "substack",
    title: "סקירת Shopify: מבט מעשי על פלטפורמת המסחר האלקטרוני המובילה",
    body: `*גילוי נאות: מאמר זה מכיל קישור שותפים. אם תירשמו דרך הקישור, ייתכן שאקבל עמלה ללא עלות נוספת עבורכם.*

## למה Shopify

אם אתם רוצים חנות אונליין פעילה תוך שעות ולא שבועות, Shopify עדיין הבחירה הברורה. הפלטפורמה מטפלת בכל התשתית — אתם רק מוסיפים מוצרים ומתחילים למכור.

## היתרונות

- חנות פעילה תוך שעות, לא שבועות
- מכירה ב-Instagram, TikTok, Amazon, Google מאותו מקום
- 8,000+ אפליקציות ואינטגרציות
- תשלומים ומשלוחים מובנים
- מחיר מ-$29/חודש

## החסרונות

- עמלות עסקה אם לא משתמשים ב-Shopify Payments
- התאמה אישית ברמת הקוד מוגבלת
- העלות עולה עם תוספים

## שורה תחתונה

Shopify היא הדרך הכי מהירה מרעיון לחנות פעילה. לא הכי זולה ולא הכי גמישה, אבל הכי אמינה.

נסו את Shopify: ${aff}`,
  },
  {
    platform: "facebook_page",
    title: "Shopify — סקירה מעשית",
    body: `גילוי נאות: פוסט זה מכיל קישור שותפים.

חושבים לפתוח חנות אונליין?

Shopify עדיין הבחירה הכי פופולרית ב-2026:
- חנות פעילה תוך שעות
- מכירה ב-Instagram, TikTok, Amazon
- 8,000+ אפליקציות
- תשלומים ומשלוחים מובנים

מחיר: מ-$29/חודש

מתאים למי שרוצה למכור בלי להתעסק בטכנולוגיה.

נסו: ${aff}`,
  },
  {
    platform: "instagram_professional",
    title: "Shopify — סקירה ב-2026",
    body: `גילוי נאות: פוסט זה מכיל קישור שותפים.

Shopify ב-2026 — עדיין שווה?

- חנות פעילה תוך שעות
- מכירה ב-Instagram, TikTok, Amazon
- 8,000+ אפליקציות
- תשלומים מובנים
- מ-$29/חודש

הדרך הכי מהירה מרעיון לחנות.

קישור בביו

#shopify #ecommerce #onlinestore #2026`,
  },
  {
    platform: "x_twitter",
    title: "Shopify — סקירה קצרה",
    body: `גילוי נאות: קישור שותפים.

Shopify ב-2026: חנות אונליין תוך שעות, מכירה ב-Instagram/TikTok/Amazon, 8K+ אפליקציות, מ-$29/חודש.

הכי מהיר מרעיון למכירה ראשונה.

${aff}`,
  },
  {
    platform: "quora",
    title: "מה הפלטפורמה הכי טובה לפתיחת חנות אונליין ב-2026?",
    body: `גילוי נאות: ייתכן שאקבל עמלה אם תירשמו אחרי קריאת הסקירה המלאה שלי (לא כאן — Quora לא מאפשרת קישורי שותפים ישירים).

תשובה ישירה: Shopify שווה בדיקה למקרה שתיארת.

למה Shopify:
- חנות פעילה תוך שעות, בלי ידע טכני
- מכירה רב-ערוצית: Instagram, TikTok, Amazon, Google
- 8,000+ אפליקציות ואינטגרציות
- תשלומים ומשלוחים מובנים
- מ-$29/חודש

חסרונות:
- עמלות עסקה אם לא משתמשים ב-Shopify Payments
- התאמה אישית מוגבלת
- העלות עולה עם תוספים

הסקירה המלאה שלי עם כל הפרטים: ${indirect}`,
  },
  {
    platform: "reddit",
    title: "בדקתי את Shopify לחנות חדשה — מה גיליתי",
    body: `גילוי נאות: ייתכן שאקבל עמלה אם תירשמו. אין קישור שותפים ישיר כאן לפי מדיניות הקהילה.

סקירה מהירה של Shopify.

מה עובד טוב:
- חנות פעילה תוך שעות
- מכירה ב-Instagram, TikTok, Amazon מאותו מקום
- 8,000+ אפליקציות
- תשלומים ומשלוחים מובנים

מה פחות:
- עמלות עסקה (0.5%-2%) אם לא משתמשים ב-Shopify Payments
- Liquid פחות גמיש מקוד פתוח
- מחיר מצטבר עם תוספים

מחיר: $29-$299/חודש

שורה תחתונה: הכי מהיר מרעיון לחנות. לא הכי זול, לא הכי גמיש, אבל עובד.

הסקירה המלאה שלי: ${indirect}`,
  },
  {
    platform: "youtube",
    title: "סקירת Shopify 2026: חנות אונליין תוך שעות #Shorts",
    body: `גילוי נאות: סרטון זה מכיל קישור שותפים.

סקירת Shopify 2026 — האם זו עדיין הפלטפורמה הטובה ביותר לחנות אונליין?

בסקירה הקצרה הזו:
- חנות פעילה תוך שעות
- מכירה רב-ערוצית (Instagram, TikTok, Amazon, Google)
- תשלומים ומשלוחים מובנים
- 8,000+ אפליקציות
- מחיר מ-$29/חודש

נסו את Shopify: ${aff}

#shopify #ecommerce #shorts #2026`,
  },
  {
    platform: "tiktok",
    title: "Shopify — סקריפט 16 שניות",
    body: `גילוי נאות: פוסט זה מכיל קישור שותפים.

[Hook] חושבים לפתוח חנות אונליין?

[Mid] Shopify = חנות פעילה תוך שעות.
מכירה ב-Instagram, TikTok, Amazon מאותו מקום.
8,000+ אפליקציות. תשלומים מובנים.
מ-$29/חודש.

[CTA] קישור בביו.

#shopify #ecommerce #2026`,
  },
  {
    platform: "pinterest",
    title: "Shopify | סקירה 2026",
    body: `גילוי נאות: פין זה מכיל קישור שותפים.

Shopify: הדרך הכי מהירה לפתוח חנות אונליין ב-2026.

- חנות פעילה תוך שעות
- מכירה ב-Instagram, TikTok, Amazon
- 8,000+ אפליקציות
- תשלומים ומשלוחים מובנים
- מ-$29/חודש

נסו: ${aff}`,
  },
]

const sourceContentId = "eb6683db-3158-4ad6-aa01-ec5e5831845f"
const adaptationIds = {
  facebook_page: "69a4061a-d61e-4508-8aa4-41244e53e8a8",
  instagram_professional: "2fa7a912-7984-4f56-8eda-40462d91c5f0",
  linkedin: "2820fdb8-199b-4bc3-9cca-a29100a884bd",
  medium: "bdd876e0-025e-4330-9dab-d87a495bb0d2",
  pinterest: "d2d620d6-3dff-408a-9634-08bab251e509",
  quora: "b4949a53-6b8d-4fdf-96d5-81a609f75afa",
  reddit: "ae3cac7d-1457-4722-b283-31bfc7777db6",
  substack: "cd3996a8-ff42-4e98-a3d9-39f0c7f6922f",
  tiktok: "49b08ea5-689d-4a7f-ae51-a6937a9edc87",
  x_twitter: "410c644a-7609-4c67-86a4-96684e035a32",
  youtube: "8c5225ec-25c3-41ea-beec-be1b1e2fc8e2",
}

const rows = copies.map((c) => ({
  product_id: pid,
  content_hash: crypto.randomUUID(),
  platform: c.platform,
  title: c.title,
  body: c.body,
  language: "he",
  status: "ready_for_operator_approval",
  validation_status: "valid",
  blocking_reasons: [],
  version: 2,
  source_content_id: sourceContentId,
  platform_adaptation_id: adaptationIds[c.platform],
  affiliate_link: c.platform === "quora" || c.platform === "reddit" ? null : aff,
  image_url: img_en,
  media_asset_url: c.platform === "youtube" || c.platform === "tiktok" ? video : img_en,
  media_status: "ready",
  needs_media_repair: false,
}))

const { data: inserted, error: e2 } = await s.from("final_copies").insert(rows).select("id, platform")
if (e2) {
  console.log("Insert error:", e2.message)
} else {
  console.log(`Hebrew copies created: ${inserted.length}`)
  for (const r of inserted) {
    console.log(` - ${r.platform} ${r.id}`)
  }
}
