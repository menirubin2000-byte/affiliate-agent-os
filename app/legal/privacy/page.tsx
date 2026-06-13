import type { Metadata } from "next"

import { PublicSiteShell } from "@/components/public-site-shell"

export const metadata: Metadata = {
  title: "מדיניות פרטיות - Rubin-Q.S Reviews",
  description: "מדיניות הפרטיות של אתר Rubin-Q.S Reviews.",
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return (
    <PublicSiteShell active="privacy">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold">מדיניות פרטיות</h1>
        <p className="mb-4 text-sm text-slate-500">עדכון אחרון: יוני 2026</p>

        <section className="space-y-4 leading-7 text-slate-700">
          <p>
            Rubin-Q.S Reviews (&quot;אנחנו&quot;, &quot;האתר&quot;) מופעל על ידי
            Rubin Quantum Systems. מדיניות פרטיות זו מסבירה אילו נתונים אנו אוספים
            וכיצד אנו משתמשים בהם.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">1. מידע שאנו אוספים</h2>
          <ul className="list-disc space-y-1 pr-6">
            <li>
              <strong>לוגים סטנדרטיים:</strong> כתובת IP, סוג דפדפן, דפים שנצפו וחותמות
              זמן. מידע זה נאסף אוטומטית על ידי ספק האירוח שלנו (Vercel).
            </li>
            <li>
              <strong>נתוני קליקים על קישורי שותפים:</strong> כאשר לוחצים על קישור שותפים,
              אתר היעד עשוי לעקוב אחר הקליק באמצעות הניתוח שלו.
            </li>
          </ul>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">2. מה אנחנו לא אוספים</h2>
          <p>
            אנו לא משתמשים בעוגיות למעקב. אנו לא אוספים מידע אישי כגון שמות, כתובות
            אימייל או פרטי תשלום ממבקרי האתר. אנו לא משתמשים בסקריפטים של ניתוח צד שלישי.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">3. קישורי שותפים</h2>
          <p>
            חלק מהדפים מכילים קישורי שותפים. כאשר לוחצים על קישורים אלה ומבצעים רכישה,
            ייתכן שנקבל עמלה. רשת השותפים (לא אנחנו) עוקבת אחר עסקאות אלה. כל דף
            עם קישורי שותפים כולל גילוי נאות.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">4. אתרים חיצוניים</h2>
          <p>
            קישורים באתר מובילים למוצרים ושירותים חיצוניים. לאתרים אלה יש מדיניות
            פרטיות משלהם. אנו לא אחראים לפרקטיקות הנתונים שלהם.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">5. אחסון נתונים</h2>
          <p>
            האתר מאוחסן ב-Vercel. לוגים סטנדרטיים נשמרים בהתאם למדיניות שמירת הנתונים
            של Vercel.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">6. הזכויות שלכם</h2>
          <p>
            אם יש לכם שאלות לגבי מידע שאנו עשויים להחזיק, או אם ברצונכם לבקש מחיקה,
            פנו אלינו בכתובת{" "}
            <a href="mailto:Rubin-Q.S@rsqs.net" className="text-blue-700 underline">
              Rubin-Q.S@rsqs.net
            </a>
            .
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">7. שינויים</h2>
          <p>
            מדיניות זו עשויה להתעדכן בכל עת. הגרסה הנוכחית תמיד זמינה בכתובת זו.
          </p>
        </section>
      </div>
    </PublicSiteShell>
  )
}
