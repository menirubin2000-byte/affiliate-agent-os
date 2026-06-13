import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Accessibility Statement - Rubin-Q.S Reviews",
  description: "Accessibility statement for the Rubin-Q.S Reviews website.",
  robots: { index: true, follow: true },
}

export default function AccessibilityPage() {
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
            <li><Link href="/legal/privacy" className="hover:text-slate-950">Privacy</Link></li>
            <li><Link href="/accessibility" className="font-semibold text-slate-950">Accessibility</Link></li>
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-6 text-3xl font-bold">Accessibility Statement</h1>
        <p className="mb-4 text-sm text-slate-500">Last updated: June 2026</p>

        <section className="space-y-4 leading-7 text-slate-700">
          <p>
            Rubin-Q.S Reviews is committed to making its website accessible to all users,
            including people with disabilities. We strive to comply with WCAG 2.1 Level AA
            guidelines and the Israeli Equal Rights for Persons with Disabilities Law, 5758-1998.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">What we do</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Use semantic HTML structure with headings, lists, and landmark regions.</li>
            <li>Provide alternative text for images.</li>
            <li>Maintain sufficient color contrast ratios across the site.</li>
            <li>Ensure the site is navigable by keyboard only.</li>
            <li>Use responsive design that works on different screen sizes and devices.</li>
            <li>Include affiliate disclosures in a clearly visible format.</li>
          </ul>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">Known limitations</h2>
          <p>
            Some older content or third-party embedded elements may not fully meet accessibility
            standards. We are working to identify and resolve these issues.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">Feedback</h2>
          <p>
            If you encounter an accessibility barrier on this site, please contact us
            at{" "}
            <a href="mailto:Rubin-Q.S@rsqs.net" className="text-blue-700 underline">
              Rubin-Q.S@rsqs.net
            </a>
            . We will do our best to address the issue promptly.
          </p>

          <h2 className="mt-6 text-xl font-semibold text-slate-950">Technical details</h2>
          <p>
            This website is built with Next.js and uses server-rendered HTML. It relies on
            standard web technologies (HTML, CSS, JavaScript) and does not require plugins
            or add-ons to use.
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
