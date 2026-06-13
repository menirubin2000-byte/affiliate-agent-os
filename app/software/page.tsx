import type { Metadata } from "next"

import { PublicSiteShell } from "@/components/public-site-shell"
import { PublicReviewGrid } from "@/components/public-review-grid"
import { listPublicReviewCards } from "@/lib/public-review-catalog"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "סקירות תוכנות וכלים דיגיטליים - Rubin-Q.S Reviews",
  description: "סקירות בעברית של תוכנות, כלי SaaS, אוטומציה, שיווק, וידאו ומכירות.",
}

export default async function SoftwareReviewsPage() {
  const reviews = await listPublicReviewCards("software")

  return (
    <PublicSiteShell active="software">
      <section className="mb-10 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          סקירות תוכנות וכלים דיגיטליים
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-600">
          כלי SaaS, אוטומציה, שיווק, מכירות, וידאו, אימייל וכלים לעסק. כל סקירה כוללת גילוי אפיליאייט.
        </p>
      </section>

      <PublicReviewGrid reviews={reviews} emptyText="סקירות תוכנה עדיין בהכנה." />
    </PublicSiteShell>
  )
}
