export type PublicGuide = {
  slug: string
  title: string
  description: string
  category: "guide" | "comparison" | "top-picks"
}

const PUBLIC_GUIDES: PublicGuide[] = []

export function listPublicGuides() {
  return PUBLIC_GUIDES
}
