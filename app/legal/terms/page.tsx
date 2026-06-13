import type { Metadata } from "next"

import { PublicSiteShell } from "@/components/public-site-shell"

export const metadata: Metadata = {
  title: "תנאי שימוש - Rubin-Q.S Reviews",
  description: "תנאי השימוש באתר Rubin-Q.S Reviews.",
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <PublicSiteShell active="terms">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold">תנאי שימוש</h1>
        <p className="mb-4 text-sm text-slate-500">עדכון אחרון: יוני 2026</p>

        <section className="space-y-4 leading-7 text-slate-700">
          <p>
            Rubin-Q.S Reviews (&quot;אנחנו&quot;, &quot;האתר&quot;) הוא אתר סקירות ותוכן
            שמופעל על ידי Rubin Quantum Systems. שימוש באתר מהווה הסכמה לתנאים אלה.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">1. מטרת האתר</h2>
          <p>
            האתר מפרסם סקירות פרקטיות של תוכנות, מוצרים, השוואות וכלים שימושיים
            לעסקים קטנים ויוצרי תוכן.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">2. גילוי אפיליאייט</h2>
          <p>
            חלק מהדפים באתר מכילים קישורי שותפים (affiliate links). אם תלחצו ותבצעו
            רכישה, ייתכן שנקבל עמלה ללא עלות נוספת עבורכם. כל דף עם קישורי שותפים
            כולל גילוי נאות מפורש.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">3. דיוק התוכן</h2>
          <p>
            אנו שואפים לספק מידע מדויק ועדכני. עם זאת, תכונות מוצר, מחירים וזמינות
            עשויים להשתנות. תמיד בדקו את הפרטים בעמוד הרשמי של המוצר לפני רכישה.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">4. קישורים חיצוניים</h2>
          <p>
            האתר מקשר למוצרים ושירותים של צדדים שלישיים. אנו לא אחראים לתוכן,
            למדיניות או לפרקטיקות של אתרים חיצוניים אלה.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">5. הגבלת אחריות</h2>
          <p>
            האתר והתוכן שלו מסופקים &quot;כמו שהם&quot; (as is) ללא אחריות מכל סוג.
            אנו לא אחראים לנזקים הנובעים מהשימוש באתר.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">6. שינויים</h2>
          <p>
            תנאים אלה עשויים להתעדכן בכל עת. הגרסה הנוכחית תמיד זמינה בכתובת זו.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">7. יצירת קשר</h2>
          <p>
            לשאלות, פנו אלינו בכתובת{" "}
            <a href="mailto:Rubin-Q.S@rsqs.net" className="text-blue-700 underline">
              Rubin-Q.S@rsqs.net
            </a>
            .
          </p>
        </section>
      </div>
    </PublicSiteShell>
  )
}
