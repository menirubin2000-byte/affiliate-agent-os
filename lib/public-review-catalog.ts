import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"

export type PublicReviewKind = "software" | "product"

export type PublicReviewCard = {
  id: string
  name: string
  slug: string | null
  category: string | null
  image_url: string | null
  image_url_he: string | null
  content_angle: string | null
  kind: PublicReviewKind
}

type ProductRow = Omit<PublicReviewCard, "kind">

const PHYSICAL_PRODUCT_HINTS = [
  "aliexpress",
  "amazon",
  "mouse",
  "keyboard",
  "headphone",
  "headphones",
  "earbuds",
  "earphones",
  "dock",
  "ssd",
  "hard drive",
  "webcam",
  "microphone",
  "shaver",
  "toothbrush",
  "water flosser",
  "laptop stand",
  "laptop bag",
  "wifi",
  "repeater",
  "עכבר",
  "מקלדת",
  "אוזניות",
  "מיקרופון",
  "מצלמת רשת",
  "מעמד למחשב",
  "תיק למחשב",
  "כונן",
  "מגלח",
  "מברשת שיניים",
  "ציוד מחשב",
  "גאדג׳ט",
  "אביזר",
  "טעינה",
  "מטען",
  "כבל",
  "רמקול",
  "מסך",
  "תאורה",
]

export function classifyPublicReview(product: Pick<PublicReviewCard, "name" | "category">): PublicReviewKind {
  const text = `${product.name} ${product.category ?? ""}`.toLowerCase()
  return PHYSICAL_PRODUCT_HINTS.some((hint) => text.includes(hint)) ? "product" : "software"
}

export async function listPublicReviewCards(kind?: PublicReviewKind) {
  if (!isSupabaseConfigured()) return []

  const supabase = getServiceRoleSupabase()
  const { data } = await supabase
    .from("products")
    .select("id, name, slug, category, image_url, image_url_he, content_angle")
    .not("slug", "is", null)
    .order("name")

  if (!data) return []

  const { data: programs } = await supabase
    .from("affiliate_programs")
    .select("product_id")
    .eq("status", "link_ready")

  const readyIds = new Set((programs ?? []).map((program) => program.product_id))
  const cards = (data as ProductRow[])
    .filter((product) => product.slug && readyIds.has(product.id))
    .map((product) => ({ ...product, kind: classifyPublicReview(product) }))

  return kind ? cards.filter((product) => product.kind === kind) : cards
}
