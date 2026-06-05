export const metadata = {
  title: "Terms of Service - Affiliate Agent OS",
  description: "Terms of Service for Affiliate Agent OS content publishing platform.",
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-gray-100">
      <h1 className="mb-6 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-4 text-sm text-gray-400">Last updated: June 5, 2026</p>

      <section className="space-y-4">
        <p>
          Affiliate Agent OS (&quot;we&quot;, &quot;us&quot;, &quot;the platform&quot;) is a
          content publishing tool operated by Rubin Quantum Systems for use by its single operator.
          By accessing or using this platform, you agree to these Terms of Service.
        </p>

        <h2 className="mt-6 text-xl font-semibold">1. Purpose</h2>
        <p>
          The platform helps the operator generate, review, approve, and publish affiliate marketing
          content to connected social media accounts.
        </p>

        <h2 className="mt-6 text-xl font-semibold">2. Acceptable use</h2>
        <p>
          Content published through the platform must comply with the policies of each destination
          platform, applicable law, and affiliate disclosure requirements. The operator remains the
          human approval point before publication.
        </p>

        <h2 className="mt-6 text-xl font-semibold">3. Affiliate disclosure</h2>
        <p>
          Affiliate content published through the platform should include a clear disclosure when the
          author may earn a commission from included links.
        </p>

        <h2 className="mt-6 text-xl font-semibold">4. Third-party platforms</h2>
        <p>
          The platform may integrate with third-party platforms and infrastructure providers. Use of
          those services is governed by their respective terms.
        </p>

        <h2 className="mt-6 text-xl font-semibold">5. No warranty</h2>
        <p>
          The platform is provided &quot;as is&quot; without warranty of any kind. We are not
          liable for consequential or indirect damages.
        </p>

        <h2 className="mt-6 text-xl font-semibold">6. Changes</h2>
        <p>
          These terms may be updated at any time. The current version is always available at this
          URL.
        </p>

        <h2 className="mt-6 text-xl font-semibold">7. Contact</h2>
        <p>
          For questions, contact the operator at{" "}
          <a href="mailto:Rubin-Q.S@rsqs.net" className="underline">
            Rubin-Q.S@rsqs.net
          </a>
          .
        </p>
      </section>
    </main>
  )
}
