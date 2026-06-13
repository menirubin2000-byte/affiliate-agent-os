import type { Metadata } from "next"

import { PublicSiteShell } from "@/components/public-site-shell"
import { PublicReviewGrid } from "@/components/public-review-grid"
import { listPublicReviewCards } from "@/lib/public-review-catalog"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "סקירות מוצרים וגאדג׳טים - Rubin-Q.S Reviews",
  description: "סקירות בעברית של מוצרים פיזיים, ציוד מחשב, גאדג׳טים ומוצרי AliExpress ו-Amazon.",
}

export default async function ProductReviewsPage() {
  const reviews = await listPublicReviewCards("product")

  return (
    <PublicSiteShell active="products">
      <section className="mb-10 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          סקירות מוצרים וגאדג׳טים
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-600">
          מוצרים פיזיים, ציוד מחשב, מקלדות, עכברים, אוזניות, אביזרי עבודה וגאדג׳טים. כל סקירה כוללת גילוי אפיליאייט.
        </p>
      </section>

      <PublicReviewGrid reviews={reviews} emptyText="סקירות מוצרים עדיין בהכנה." />
    </PublicSiteShell>
  )
}
