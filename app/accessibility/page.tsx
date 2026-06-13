import type { Metadata } from "next"

import { PublicSiteShell } from "@/components/public-site-shell"

export const metadata: Metadata = {
  title: "הצהרת נגישות - Rubin-Q.S Reviews",
  description: "הצהרת הנגישות של אתר Rubin-Q.S Reviews.",
  robots: { index: true, follow: true },
}

export default function AccessibilityPage() {
  return (
    <PublicSiteShell active="accessibility">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold">הצהרת נגישות</h1>
        <p className="mb-4 text-sm text-slate-500">עדכון אחרון: יוני 2026</p>

        <section className="space-y-4 leading-7 text-slate-700">
          <p>
            Rubin-Q.S Reviews מחויב להנגשת האתר לכל המשתמשים, כולל אנשים עם מוגבלויות.
            אנו שואפים לעמוד בהנחיות WCAG 2.1 רמה AA ובחוק שוויון זכויות לאנשים
            עם מוגבלות, התשנ&quot;ח-1998.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">מה אנחנו עושים</h2>
          <ul className="list-disc space-y-2 pr-6">
            <li>שימוש במבנה HTML סמנטי עם כותרות, רשימות ואזורי ציון דרך.</li>
            <li>טקסט חלופי לתמונות.</li>
            <li>יחסי ניגודיות צבע מספקים בכל האתר.</li>
            <li>ניווט מלא באמצעות מקלדת בלבד.</li>
            <li>עיצוב רספונסיבי שעובד בגדלי מסך ומכשירים שונים.</li>
            <li>גילוי נאות אפיליאייט בפורמט ברור ונגיש.</li>
          </ul>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">מגבלות ידועות</h2>
          <p>
            ייתכן שתוכן ישן או אלמנטים מוטמעים של צדדים שלישיים לא עומדים במלואם
            בתקני הנגישות. אנו עובדים לזהות ולפתור בעיות אלה.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">משוב</h2>
          <p>
            אם נתקלתם במחסום נגישות באתר, אנא פנו אלינו בכתובת{" "}
            <a href="mailto:Rubin-Q.S@rsqs.net" className="text-blue-700 underline">
              Rubin-Q.S@rsqs.net
            </a>
            . נעשה כמיטב יכולתנו לטפל בבעיה בהקדם.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">פרטים טכניים</h2>
          <p>
            אתר זה נבנה עם Next.js ומשתמש ב-HTML שמרונדר בצד השרת. האתר מבוסס
            על טכנולוגיות אינטרנט סטנדרטיות (HTML, CSS, JavaScript) ולא דורש תוספים.
          </p>
        </section>
      </div>
    </PublicSiteShell>
  )
}
