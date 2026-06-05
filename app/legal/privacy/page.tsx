export const metadata = {
  title: "Privacy Policy — Affiliate Agent OS",
  description: "Privacy Policy for Affiliate Agent OS content publishing platform.",
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-gray-100">
      <h1 className="mb-6 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-4 text-sm text-gray-400">Last updated: June 5, 2026</p>

      <section className="space-y-4">
        <p>
          Affiliate Agent OS ("we", "us", "the platform") is operated by Rubin Quantum Systems as a
          single-operator content publishing tool. This Privacy Policy explains what data we collect
          and how we use it.
        </p>

        <h2 className="mt-6 text-xl font-semibold">1. Data we collect</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Operator account data:</strong> credentials needed to publish to connected
            platforms (Meta, LinkedIn, X, TikTok). Stored in server environment only.
          </li>
          <li>
            <strong>Affiliate program data:</strong> product names, affiliate links, commission
            terms.
          </li>
          <li>
            <strong>Generated content:</strong> drafts, reviews, social posts, and their approval
            status.
          </li>
          <li>
            <strong>Published records:</strong> URLs and metadata of published posts, for tracking.
          </li>
          <li>
            <strong>Performance metrics:</strong> click and conversion data from affiliate networks,
            where available.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">2. How we use data</h2>
        <p>
          Data is used solely to operate the platform: generate content, request operator approval,
          publish approved content, and report performance. No data is sold or shared outside the
          operator&apos;s connected platforms.
        </p>

        <h2 className="mt-6 text-xl font-semibold">3. Third-party platforms</h2>
        <p>
          When you connect a third-party platform (Meta, LinkedIn, X, TikTok), we receive only the
          tokens and identifiers required to publish on your behalf. We do not read your private
          messages or access data unrelated to the publishing function.
        </p>

        <h2 className="mt-6 text-xl font-semibold">4. Data storage</h2>
        <p>
          Data is stored in Supabase (PostgreSQL) hosted on AWS, and the application is deployed on
          Vercel. Credentials and tokens are kept in server-side environment variables and never
          shipped to client browsers.
        </p>

        <h2 className="mt-6 text-xl font-semibold">5. Data retention</h2>
        <p>
          Drafts, published records, and performance metrics are retained for the lifetime of the
          operator account. The operator may delete records at any time.
        </p>

        <h2 className="mt-6 text-xl font-semibold">6. User rights</h2>
        <p>
          The platform is operated by a single operator (Meni Rubin). Visitors who follow published
          links are subject to the privacy policy of the destination platform. To request deletion
          of any data we hold, contact{" "}
          <a href="mailto:Rubin-Q.S@rsqs.net" className="underline">
            Rubin-Q.S@rsqs.net
          </a>
          .
        </p>

        <h2 className="mt-6 text-xl font-semibold">7. Changes</h2>
        <p>
          This policy may be updated at any time. The current version is always available at this
          URL.
        </p>

        <h2 className="mt-6 text-xl font-semibold">8. Contact</h2>
        <p>
          For privacy questions, contact{" "}
          <a href="mailto:Rubin-Q.S@rsqs.net" className="underline">
            Rubin-Q.S@rsqs.net
          </a>
          .
        </p>
      </section>
    </main>
  )
}
