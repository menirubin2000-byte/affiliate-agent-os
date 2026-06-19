import Link from "next/link"

import { PublicSiteShell } from "@/components/public-site-shell"
import type { GuideLocale, PublicGuide } from "@/lib/public-guides"

export function PublicGuideArticle({
  guide,
  locale,
}: {
  guide: PublicGuide
  locale: GuideLocale
}) {
  const content = guide.locales[locale]
  const alternateLocale = locale === "en" ? "he" : "en"
  const alternateHref = alternateLocale === "en" ? `/guides/${guide.slug}` : `/guides/he/${guide.slug}`
  const articleDir = locale === "he" ? "rtl" : "ltr"
  const articleAlign = locale === "he" ? "text-right" : "text-left"

  return (
    <PublicSiteShell active="guides">
      <article className="mx-auto max-w-4xl space-y-8">
        <header dir={articleDir} className={`space-y-5 ${articleAlign}`}>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
              {content.eyebrow}
            </span>
            <span>{content.readTime}</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{content.title}</h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">{content.description}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={alternateHref}
              className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              {content.sectionLabels.switchLanguage}
            </Link>
            <Link
              href="/guides"
              className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              {locale === "he" ? "חזרה למדריכים" : "Back to guides"}
            </Link>
          </div>
        </header>

        <section
          dir={articleDir}
          className={`rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950 ${articleAlign}`}
        >
          {content.disclosure}
        </section>

        <section dir={articleDir} className={`space-y-5 text-lg leading-8 text-slate-700 ${articleAlign}`}>
          {content.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>

        <section dir={articleDir} className="space-y-6">
          {content.sections.map((section, index) => (
            <article key={section.name} className={`rounded-2xl border bg-white p-6 shadow-sm ${articleAlign}`}>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
                {index + 1}. {section.name}
              </p>
              <div className="mt-4 space-y-4 leading-7 text-slate-700">
                <p>{section.summary}</p>
                <p>
                  <strong className="text-slate-950">{content.sectionLabels.keyFeatures}:</strong>{" "}
                  {section.keyFeatures}
                </p>
                <p>
                  <strong className="text-slate-950">{content.sectionLabels.whyWeChooseIt}:</strong>{" "}
                  {section.whyWeChooseIt}
                </p>
                {section.affiliateNote ? (
                  <p>
                    <strong className="text-slate-950">{content.sectionLabels.note}:</strong>{" "}
                    {section.affiliateNote} -{" "}
                    <a
                      href={guide.affiliateUrl}
                      target="_blank"
                      rel="nofollow sponsored noreferrer"
                      className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4"
                    >
                      {guide.affiliateUrl}
                    </a>
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </section>

        <section dir={articleDir} className={`rounded-2xl border bg-slate-50 p-6 ${articleAlign}`}>
          <h2 className="text-2xl font-semibold text-slate-950">
            {locale === "he" ? "סיכום" : "Conclusion"}
          </h2>
          <p className="mt-4 leading-8 text-slate-700">{content.conclusion}</p>
        </section>

        <section dir={articleDir} className={`rounded-2xl border bg-white p-6 shadow-sm ${articleAlign}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === "he" ? "קישורים שימושיים" : "Useful Links"}
              </p>
              <p className="text-slate-700">
                {locale === "he"
                  ? "המאמר נשאר כמו שנתת, ורק הלינק של Reditus חובר ליעד הנכון."
                  : "The article body stays as provided, and the Reditus placeholder now points to the correct destination."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/reviews/${guide.relatedReviewSlug}`}
                className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
              >
                {content.sectionLabels.relatedReview}
              </Link>
              <a
                href={guide.affiliateUrl}
                target="_blank"
                rel="nofollow sponsored noreferrer"
                className="inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {content.sectionLabels.affiliateLink}
              </a>
            </div>
          </div>
        </section>
      </article>
    </PublicSiteShell>
  )
}
