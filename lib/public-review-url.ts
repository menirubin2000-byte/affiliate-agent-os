export const PUBLIC_REVIEW_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://affiliate-agent-os.vercel.app"

export function buildPublicReviewUrl(productSlug: string) {
  return `${PUBLIC_REVIEW_BASE_URL}/reviews/${encodeURIComponent(productSlug)}`
}
