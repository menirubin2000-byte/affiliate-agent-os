import Link from "next/link"
import type { Metadata } from "next"

import { PublicSiteShell } from "@/components/public-site-shell"
import { listPublicGuides } from "@/lib/public-guides"

export const metadata: Metadata = {
  title: "Guides - Rubin-Q.S Reviews",
  description: "Public buying guides and comparison articles for affiliate products and software.",
}

export default function GuidesIndexPage() {
  const guides = listPublicGuides()

  return (
    <PublicSiteShell active="guides">
      <section className="mb-10 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Guides</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-600">
          Comparison articles and roundup posts for visitors who want a faster shortlist before opening a full review.
        </p>
      </section>

      <section className="grid gap-6">
        {guides.map((guide) => (
          <article key={guide.slug} className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Guide</p>
              <h2 className="text-2xl font-bold tracking-tight">{guide.title}</h2>
              <p className="text-lg text-slate-600">{guide.hebrewTitle}</p>
              <p className="max-w-3xl leading-7 text-slate-700">{guide.description}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/guides/${guide.slug}`}
                className="inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Read in English
              </Link>
              <Link
                href={`/guides/he/${guide.slug}`}
                className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
              >
                לקריאה בעברית
              </Link>
            </div>
          </article>
        ))}
      </section>
    </PublicSiteShell>
  )
}
