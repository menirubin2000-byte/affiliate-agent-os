import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service - Rubin-Q.S Reviews",
  description: "Terms of Service for the Rubin-Q.S Reviews website.",
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Rubin-Q.S Reviews
          </Link>
          <ul className="flex items-center gap-6 text-sm font-medium text-slate-600">
            <li><Link href="/" className="hover:text-slate-950">Reviews</Link></li>
            <li><Link href="/legal/terms" className="font-semibold text-slate-950">Terms</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-slate-950">Privacy</Link></li>
            <li><Link href="/accessibility" className="hover:text-slate-950">Accessibility</Link></li>
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-6 text-3xl font-bold">Terms of Service</h1>
        <p className="mb-4 text-sm text-slate-500">Last updated: June 5, 2026</p>

        <section className="space-y-4 leading-7 text-slate-700">
          <p>
            Rubin-Q.S Reviews (&quot;we&quot;, &quot;us&quot;, &quot;the site&quot;) is a
            review and content site operated by Rubin Quantum Systems.
            By accessing or using this site, you agree to these Terms of Service.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">1. Purpose</h2>
          <p>
            This site publishes practical software reviews, product comparisons, and
            recommendations for creators and small businesses.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">2. Affiliate disclosure</h2>
          <p>
            Some pages on this site contain affiliate links. If you click through and make a
            purchase, we may earn a commission at no extra cost to you. Every page with affiliate
            links includes a visible disclosure.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">3. Content accuracy</h2>
          <p>
            We strive to provide accurate and up-to-date information. However, product features,
            pricing, and availability may change. Always verify details on the official product
            page before making a purchase.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">4. Third-party links</h2>
          <p>
            This site links to third-party products and services. We are not responsible for the
            content, policies, or practices of those external sites.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">5. No warranty</h2>
          <p>
            This site and its content are provided &quot;as is&quot; without warranty of any kind.
            We are not liable for any damages arising from the use of this site.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">6. Changes</h2>
          <p>
            These terms may be updated at any time. The current version is always available at
            this URL.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">7. Contact</h2>
          <p>
            For questions, contact us at{" "}
            <a href="mailto:Rubin-Q.S@rsqs.net" className="text-blue-700 underline">
              Rubin-Q.S@rsqs.net
            </a>
            .
          </p>
        </section>
      </main>

      <footer className="border-t bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Rubin Quantum Systems. All rights reserved.</p>
          <ul className="flex gap-6">
            <li><Link href="/legal/terms" className="hover:text-slate-950">Terms of Service</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-slate-950">Privacy Policy</Link></li>
            <li><Link href="/accessibility" className="hover:text-slate-950">Accessibility</Link></li>
          </ul>
        </div>
      </footer>
    </div>
  )
}
