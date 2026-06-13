import Link from "next/link"

import type { PublicReviewCard } from "@/lib/public-review-catalog"

export function PublicReviewGrid({
  reviews,
  emptyText,
}: {
  reviews: PublicReviewCard[]
  emptyText: string
}) {
  if (reviews.length === 0) {
    return (
      <section className="rounded-lg border bg-slate-50 p-8 text-center text-slate-500">
        {emptyText}
      </section>
    )
  }

  return (
    <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((product) => {
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
              <div className="flex aspect-[16/10] w-full items-center justify-center bg-slate-100 p-4 text-center text-lg font-semibold text-slate-400">
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
  )
}
