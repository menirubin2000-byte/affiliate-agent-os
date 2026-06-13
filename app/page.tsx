import Link from "next/link"
import type { Metadata } from "next"

import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Rubin-Q.S Reviews — Software & Product Reviews",
  description:
    "Practical software reviews, affiliate tools, automation platforms, and marketing technology recommendations for creators and small businesses.",
  robots: { index: true, follow: true },
}

type ProductCard = {
  id: string
  name: string
  slug: string | null
  category: string | null
  image_url: string | null
  image_url_he: string | null
  content_angle: string | null
}

export default async function PublicHomePage() {
  let products: ProductCard[] = []

  if (isSupabaseConfigured()) {
    const supabase = getServiceRoleSupabase()
    const { data } = await supabase
      .from("products")
      .select("id, name, slug, category, image_url, image_url_he, content_angle")
      .not("slug", "is", null)
      .order("name")

    if (data) {
      const { data: programs } = await supabase
        .from("affiliate_programs")
        .select("product_id")
        .eq("status", "link_ready")

      const readyIds = new Set((programs ?? []).map((p) => p.product_id))
      products = (data as ProductCard[]).filter((p) => p.slug && readyIds.has(p.id))
    }
  }

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
            <li><Link href="/accessibility" className="hover:text-slate-950">Accessibility</Link></li>
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <section className="mb-10 space-y-3">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Software &amp; Product Reviews
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            Practical reviews of software tools, automation platforms, and products for creators and
            small businesses. Each review includes an affiliate disclosure.
          </p>
        </section>

        {products.length > 0 ? (
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const imageUrl = product.image_url_he || product.image_url
              return (
                <Link
                  key={product.id}
                  href={`/reviews/${product.slug}`}
                  className="group overflow-hidden rounded-lg border bg-white shadow-sm transition hover:shadow-md"
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="aspect-[16/10] w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex aspect-[16/10] w-full items-center justify-center bg-slate-100 text-lg font-semibold text-slate-400">
                      {product.name}
                    </div>
                  )}
                  <div className="p-4">
                    <h2 className="font-semibold group-hover:text-blue-700">{product.name}</h2>
                    {product.category ? (
                      <p className="mt-1 text-sm text-slate-500">{product.category}</p>
                    ) : null}
                    {product.content_angle ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                        {product.content_angle}
                      </p>
                    ) : null}
                  </div>
                </Link>
              )
            })}
          </section>
        ) : (
          <section className="rounded-lg border bg-slate-50 p-8 text-center text-slate-500">
            Reviews are being prepared. Check back soon.
          </section>
        )}
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
