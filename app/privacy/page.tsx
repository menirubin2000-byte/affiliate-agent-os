import Link from "next/link"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Affiliate Agent OS.",
}

const updatedAt = "June 10, 2026"

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-4 border-b pb-6">
          <p className="text-sm font-medium text-muted-foreground">Affiliate Agent OS</p>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {updatedAt}</p>
          <nav className="flex flex-wrap gap-2" aria-label="Legal pages">
            <Link className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted" href="/terms">
              Terms of Service
            </Link>
          </nav>
        </header>

        <section className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            Affiliate Agent OS is an operator-focused software system for managing affiliate marketing workflows,
            content approvals, publishing tasks, platform readiness, and traffic tracking. This Privacy Policy explains
            what information may be processed when using the service.
          </p>

          <h2 className="text-xl font-semibold text-foreground">Information We Process</h2>
          <p>
            The system may store product records, affiliate program details, affiliate links, source content, draft
            versions, approvals, publish jobs, published URLs, campaign links, and performance metrics entered by the
            operator or generated through approved workflows.
          </p>

          <h2 className="text-xl font-semibold text-foreground">Platform Connections</h2>
          <p>
            When the operator connects an external platform, the system may store connection metadata required to show
            connection status and publishing readiness. Secrets, tokens, and credentials must be stored server-side only
            and must not be exposed in public pages, client-side code, or committed files.
          </p>

          <h2 className="text-xl font-semibold text-foreground">How Information Is Used</h2>
          <p>
            Information is used to organize affiliate operations, prepare content for human review, manage approval
            states, track publishing status, verify live published records, and measure performance only after a live URL
            has been verified.
          </p>

          <h2 className="text-xl font-semibold text-foreground">Human Approval</h2>
          <p>
            Affiliate Agent OS is designed with human approval controls. Publishing and sensitive actions should remain
            gated behind explicit operator approval and platform policy checks.
          </p>

          <h2 className="text-xl font-semibold text-foreground">Contact</h2>
          <p>
            For privacy questions, contact the operator of Affiliate Agent OS through the official website or connected
            operator profile.
          </p>
        </section>
      </div>
    </main>
  )
}
