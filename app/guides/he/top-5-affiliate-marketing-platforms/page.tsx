import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PublicGuideArticle } from "@/components/public-guide-article"
import { getPublicGuide } from "@/lib/public-guides"

const guide = getPublicGuide("top-5-affiliate-marketing-platforms")

export const metadata: Metadata = guide
  ? {
      title: `${guide.locales.he.title} - Rubin-Q.S Reviews`,
      description: guide.locales.he.description,
    }
  : {}

export default function TopAffiliatePlatformsGuideHebrewPage() {
  if (!guide) notFound()
  return <PublicGuideArticle guide={guide} locale="he" />
}
