import Link from "next/link"
import type { Metadata } from "next"

import { PublicSiteShell } from "@/components/public-site-shell"
import { listPublicReviewCards } from "@/lib/public-review-catalog"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Rubin-Q.S Reviews - סקירות תוכנות ומוצרים",
  description:
    "סקירות פרקטיות בעברית של תוכנות, כלי אוטומציה, מוצרי עבודה ומוצרי טכנולוגיה עם גילוי אפיליאייט.",
  robots: { index: true, follow: true },
}

export default async function PublicHomePage() {
  const reviews = await listPublicReviewCards()
  const softwareCount = reviews.filter((review) => review.kind === "software").length
  const productCount = reviews.filter((review) => review.kind === "product").length

  return (
    <PublicSiteShell active="home">
      <section className="mb-10 space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          סקירות אפיליאייט בעברית
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
          סקירות תוכנות ומוצרים, מחולקות לשני דפים ברורים
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-600">
          בחר אם אתה רוצה לראות כלי תוכנה ודיגיטל, או מוצרים פיזיים כמו ציוד עבודה,
          מקלדות, עכברים וגאדג׳טים. כל סקירה כוללת גילוי אפיליאייט.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <CategoryCard
          href="/software"
          eyebrow="Software"
          title="תוכנות וכלים דיגיטליים"
          description="כלי SaaS, אוטומציה, שיווק, וידאו, מכירות, אימייל וכלים לעסק."
          count={softwareCount}
        />
        <CategoryCard
          href="/products"
          eyebrow="Products"
          title="מוצרים פיזיים וגאדג׳טים"
          description="מוצרים מ-AliExpress, Amazon וחנויות שותפים: ציוד מחשב, אביזרים, אוזניות ועוד."
          count={productCount}
        />
      </section>
    </PublicSiteShell>
  )
}

function CategoryCard({
  href,
  eyebrow,
  title,
  description,
  count,
}: {
  href: string
  eyebrow: string
  title: string
  description: string
  count: number
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">{eyebrow}</div>
      <h2 className="mt-3 text-2xl font-bold group-hover:text-blue-700">{title}</h2>
      <p className="mt-3 min-h-16 leading-7 text-slate-600">{description}</p>
      <div className="mt-6 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
        הצג {count} סקירות
      </div>
    </Link>
  )
}
