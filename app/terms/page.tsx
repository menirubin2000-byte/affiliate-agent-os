import Link from "next/link"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Affiliate Agent OS.",
}

const updatedAt = "June 10, 2026"

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-4 border-b pb-6">
          <p className="text-sm font-medium text-muted-foreground">Affiliate Agent OS</p>
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: {updatedAt}</p>
          <nav className="flex flex-wrap gap-2" aria-label="Legal pages">
            <Link className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground" href="/terms">
              Terms of Service
            </Link>
            <Link className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted" href="/dashboard/he">
              ← חזרה לדשבורד
            </Link>
          </nav>
        </header>

        <section className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            These Terms of Service describe the basic operating terms for Affiliate Agent OS, an operator-focused system
            for affiliate workflow management, content approvals, publishing tasks, and traffic tracking.
          </p>

          <h2 className="text-xl font-semibold text-foreground">Use of the System</h2>
          <p>
            Affiliate Agent OS is intended to help an operator manage products, affiliate programs, content, approvals,
            platform readiness, publish jobs, verified published records, and metrics. The system should not be used to
            bypass platform restrictions, publish spam, create fake reviews, or publish content without required human
            approval.
          </p>

          <h2 className="text-xl font-semibold text-foreground">Affiliate Disclosure</h2>
          <p>
            Content that includes affiliate links or commercial recommendations should include clear affiliate disclosure
            and follow the rules of the relevant platform, affiliate program, and applicable advertising guidance.
          </p>

          <h2 className="text-xl font-semibold text-foreground">Publishing Controls</h2>
          <p>
            Publishing and sensitive actions should remain gated behind explicit operator approval. A draft, approval, or
            publish attempt is not a verified published record until a live URL or equivalent live proof has been
            verified.
          </p>

          <h2 className="text-xl font-semibold text-foreground">External Platforms</h2>
          <p>
            External platforms may change their APIs, policies, approval requirements, and publishing capabilities. The
            operator is responsible for maintaining valid accounts, permissions, disclosures, and platform compliance.
          </p>

          <h2 className="text-xl font-semibold text-foreground">No Guaranteed Results</h2>
          <p>
            Affiliate Agent OS may help organize traffic and publishing operations, but it does not guarantee views,
            clicks, conversions, commissions, revenue, or platform approval.
          </p>
        </section>
      </div>
    </main>
  )
}
