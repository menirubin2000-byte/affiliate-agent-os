import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy - Rubin-Q.S Reviews",
  description: "Privacy Policy for the Rubin-Q.S Reviews website.",
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Rubin-Q.S Reviews
          </Link>
          <ul className="flex items-center gap-6 text-sm font-medium text-slate-600">
            <li><Link href="/" className="hover:text-slate-950">Reviews</Link></li>
            <li><Link href="/legal/terms" className="hover:text-slate-950">Terms</Link></li>
            <li><Link href="/legal/privacy" className="font-semibold text-slate-950">Privacy</Link></li>
            <li><Link href="/accessibility" className="hover:text-slate-950">Accessibility</Link></li>
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-6 text-3xl font-bold">Privacy Policy</h1>
        <p className="mb-4 text-sm text-slate-500">Last updated: June 5, 2026</p>

        <section className="space-y-4 leading-7 text-slate-700">
          <p>
            Rubin-Q.S Reviews (&quot;we&quot;, &quot;us&quot;, &quot;the site&quot;) is
            operated by Rubin Quantum Systems. This Privacy Policy explains what data we
            collect and how we use it.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">1. Data we collect</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Standard web logs:</strong> IP address, browser type, pages visited, and
              timestamps. This data is collected automatically by our hosting provider (Vercel).
            </li>
            <li>
              <strong>Affiliate click data:</strong> when you click an affiliate link, the
              destination site may track that click through their own analytics.
            </li>
          </ul>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">2. What we do NOT collect</h2>
          <p>
            We do not use cookies for tracking visitors. We do not collect personal information
            such as names, emails, or payment details from site visitors. We do not use
            third-party analytics scripts.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">3. Affiliate links</h2>
          <p>
            Some pages contain affiliate links. When you click these links and make a purchase,
            we may earn a commission. The affiliate network (not us) tracks these transactions.
            Each page with affiliate links includes a visible disclosure.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">4. Third-party sites</h2>
          <p>
            Links on this site lead to external products and services. Those sites have their own
            privacy policies. We are not responsible for their data practices.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">5. Data storage</h2>
          <p>
            This site is hosted on Vercel. Standard server logs are retained according to
            Vercel&apos;s data retention policy.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">6. Your rights</h2>
          <p>
            If you have questions about data we may hold or wish to request deletion, contact{" "}
            <a href="mailto:Rubin-Q.S@rsqs.net" className="text-blue-700 underline">
              Rubin-Q.S@rsqs.net
            </a>
            .
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">7. Changes</h2>
          <p>
            This policy may be updated at any time. The current version is always available at
            this URL.
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
