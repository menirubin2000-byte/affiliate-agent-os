import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const TITLE = "כללים לקלוד - חובה לקרוא לפני הפעלה"
const SUBTITLE =
  "הדף הזה הוא דף הכניסה של קלוד למערכת. לפני כל פעולה (פרסום, אישור, סקריפט) - קלוד חייב לקרוא את הכללים כאן."
const FORBID_LIST = [
  `אסור להגיד "אי אפשר" / "תעשה ידני" / "הסשן לא מחובר" עד שעברתי על הצ׳קליסט הזה.`,
  `קרא שוב את CLAUDE.md של הפרויקט. ה-Rule 0 שלו אומר ש-MCP מאושר. cookies של MENI נטענים בקריאה ראשונה - מסך login הוא redirect ביניים.`,
  `נסה לפחות 3 דרכים שונות לפני שאתה מדווח כשלון: refresh, tab חדש, navigate שונה, גישת API במקום דפדפן, סקריפט בשרת.`,
  `בדוק את .env.local - אם יש token / API key רלוונטי, השתמש בו דרך ה-API במקום ה-UI (MEDIUM_INTEGRATION_TOKEN, FB_PAGE_ACCESS_TOKEN, X_CLIENT_ID וכו').`,
  `אם MENI אישר batch (למשל "תעשה 3 מוצרים") - להשלים את כולם. אסור לעצור באמצע כדי לבקש אישור-לפי-פעולה.`,
  `אם עדיין נתקעת - דווח "ניסיתי X, Y, Z" - לא "אי אפשר". תצרף את הפלט המדויק של כל ניסיון.`,
]
const ALLOWED = [
  "פרסום ב-LinkedIn / Medium / Substack / Quora / Facebook Page / Instagram Business / Pinterest דרך MCP / API.",
  "קריאה וכתיבה ל-Supabase דרך service-role.",
  "הרצת סקריפטים ב-scripts/ שמסונכרנים ל-npm run sync:*.",
  "commit + push לרפו (גם פעולות כתיבה).",
]

// Claude Code sandbox allowlist - MENI maintains this in Claude Code settings.
// Whenever I think 'I can't reach X' - I check this list first.
const SANDBOX_DOMAINS = [
  { domain: "api.linkedin.com", use: "LinkedIn REST API (פרסום ישיר)" },
  { domain: "linkedin.com", use: "LinkedIn web" },
  { domain: "api.medium.com", use: "Medium REST API (פרסום עם MEDIUM_INTEGRATION_TOKEN)" },
  { domain: "medium.com", use: "Medium web" },
  { domain: "menirubin.substack.com", use: "Substack publish endpoint" },
  { domain: "quora.com", use: "Quora (אנגלית)" },
  { domain: "he.quora.com", use: "Quora בעברית" },
  { domain: "reddit.com", use: "Reddit web" },
  { domain: "www.reddit.com", use: "Reddit posts/feed" },
  { domain: "oauth.reddit.com", use: "Reddit OAuth API (פרסום עם token)" },
  { domain: "db.gbkwydsodondarccqyet.supabase.co", use: "Supabase DB (קריאה/כתיבה דרך service-role)" },
  { domain: "supabase.co", use: "Supabase API" },
]
const BILINGUAL_RULES = [
  "כל מוצר חייב final_copies בשתי שפות: אנגלית (en) + עברית (he).",
  "פוסט באנגלית → תמונה באנגלית (image_url). פוסט בעברית → תמונה בעברית (image_url_he).",
  "אנגלית ועברית הם מסלולים עצמאיים. לעולם לא לעכב אנגלית בגלל שחסרה תמונה/סרטון בעברית.",
  "אם image_url_he ריק — עברית מחכה, אנגלית יוצאת מיד.",
  "YouTube Shorts / TikTok / Reels: אותו סרטון, תיאור משתנה לפי שפה.",
  "Quora/Reddit: חוק הקישור העקיף חל על שתי השפות.",
  "שדה language ב-final_copies חייב להיות en או he.",
  "בייצור תוכן למוצר חדש — ליצור שתי שפות באותו batch.",
]
const VIDEO_RULES = [
  "YouTube uploads דרך YouTube Data API (OAuth נדרש).",
  "סרטונים מתחת ל-60 שניות עולים כ-Shorts (להוסיף #Shorts לכותרת).",
  "מטאדאטא של סרטון: כותרת, תיאור (עם affiliate link + hashtags), תגיות.",
  "אותו קובץ וידאו משמש ל-YouTube Shorts, TikTok ו-Instagram Reels.",
  "video_status חייב להיות ready לפני יצירת final_copies לוידאו.",
]
const FORBIDDEN = [
  "להזין סיסמה / טוקן / קוד 2FA לתוך UI.",
  "auto-approval. רק MENI מאשר final_copy -> operator_approved.",
  "פרסום לפני שיש operator_approved + image_status=ready (במקום שצריך).",
  "אפיליאייט-לינק ישיר ב-Quora/Reddit.",
  "טקסט ל-TikTok / YouTube (וידאו בלבד).",
]

// כלל הקישור העקיף — חוק תפעולי קבוע
// בכל פלטפורמה שלא מותר בה affiliate link ישיר (Quora, Reddit, ועוד כל קהילה
// שאוסרת promotion), הקישור בגוף הפוסט הוא לפלטפורמה אחרת של MENI:
// LinkedIn / Facebook Page / Substack / Medium. שם נמצא הקישור האמיתי.
// אסור: affiliate link ישיר בגוף.
// מותר: linkedin.com/in/r-qs/ או menirubin.substack.com/p/... וכו'.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const INDIRECT_LINK_RULE = [
  "Quora / Reddit / כל קהילה שאוסרת affiliate ישיר → קישור לפלטפורמה אחרת של MENI (LinkedIn, FB Page, Substack, Medium).",
  "שם נמצא הקישור האמיתי. ככה הקהילה לא חוסמת ו-MENI עדיין מקבל את התנועה.",
  "הקופי המוכן ב-DB לא מכיל affiliate link — הוא מכיל קישור עקיף לפי הפלטפורמה.",
]
const PROOF_LINE =
  "קראתי את /dashboard/he/claude-rules. ניסיתי 3 דרכים לפני שאני מדווח כשלון. בדקתי .env.local. לא אעצור באמצע batch שאושר."

export default function ClaudeRulesPage() {
  return (
    <div dir="rtl" className="space-y-6 text-right">
      <PageHeader
        eyebrow="קלוד"
        title={TITLE}
        description={SUBTITLE}
        actions={
          <Link href="/dashboard/he" className={cn(buttonVariants({ variant: "outline" }))}>
            חזרה לדשבורד
          </Link>
        }
      />

      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">🛑 חובה לקרוא לפני כל פרסום / פעולה</CardTitle>
          <CardDescription>{FORBID_LIST[0]}</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-base">
            {FORBID_LIST.slice(1).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>מה מותר לעשות אוטומטית</CardTitle>
          <CardDescription>MENI נתן רשות מתמשכת לפעולות הבאות. אין צורך לשאול שוב לפני כל אחת.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {ALLOWED.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>📡 Sandbox Allowlist - הדומיינים שאני מורשה לגשת אליהם</CardTitle>
          <CardDescription>
            לפני שאני מדווח &quot;לא יכול להגיע ל-X&quot; - אני בודק כאן. אם הדומיין ברשימה - אני יכול לקרוא אליו דרך
            HTTP/fetch ישירות. הרשימה מתוחזקת ע&quot;י MENI ב-Claude Code settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {SANDBOX_DOMAINS.map((d) => (
              <li key={d.domain} className="flex flex-wrap items-baseline gap-2 rounded border bg-background px-2 py-1">
                <code className="text-xs">{d.domain}</code>
                <span className="text-muted-foreground">{d.use}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>תוכן דו-לשוני (EN + HE)</CardTitle>
          <CardDescription>כל מוצר חייב פוסטים בשתי שפות. תמונה תואמת שפה.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {BILINGUAL_RULES.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>כללי וידאו (YouTube / TikTok / Reels)</CardTitle>
          <CardDescription>סרטונים מתחת ל-60 שניות עולים כ-Shorts.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {VIDEO_RULES.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>מה אסור</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {FORBIDDEN.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>הצהרת קריאה</CardTitle>
          <CardDescription>
            כשקלוד מתחיל סשן וחושב לפרסם / לאשר - הוא צריך להכריז על השורה הזו. אם לא הכריז - MENI יודע שלא קרא ויכול
            לעצור.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded border bg-background p-3 font-mono text-sm">{`✓ ${PROOF_LINE}`}</div>
        </CardContent>
      </Card>
    </div>
  )
}
