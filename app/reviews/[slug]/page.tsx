import { notFound } from "next/navigation"

import { PublicSiteShell } from "@/components/public-site-shell"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type ReviewProductRow = {
  id: string
  name: string
  slug: string
  brand: string | null
  category: string | null
  notes: string | null
  target_keyword: string | null
  content_angle: string | null
  affiliate_link: string | null
  affiliate_url: string | null
  image_url: string | null
  image_url_he: string | null
}

type AffiliateProgramRow = {
  affiliate_link: string | null
  network: string | null
  commission_summary: string | null
}

type CampaignLinkRow = {
  final_url: string | null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getReviewProduct(slug)
  if (!product) return { title: "סקירה לא נמצאה" }
  return {
    title: `סקירת ${product.name} - Rubin-Q.S Reviews`,
    description: `סקירה קצרה ופרקטית של ${product.name}, כולל גילוי אפיליאייט וקישור למוצר.`,
  }
}

export default async function PublicReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getReviewProduct(slug)
  if (!product) notFound()

  const [program, campaignLink, postBody] = await Promise.all([
    getAffiliateProgram(product.id),
    getCampaignLink(product.id),
    getPostBody(product.id),
  ])
  const destinationUrl =
    campaignLink?.final_url?.trim() ||
    program?.affiliate_link?.trim() ||
    product.affiliate_link?.trim() ||
    product.affiliate_url?.trim()

  if (!destinationUrl) notFound()

  const imageUrl = product.image_url_he || product.image_url
  const review = postBody || buildShortReview(product)

  return (
    <PublicSiteShell active="home">
      <article className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              סקירה ציבורית
            </p>
            <h1 className="text-4xl font-semibold tracking-normal">סקירת {product.name}</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-700">
              {review}
            </p>
          </div>

          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <h2 className="font-semibold">גילוי אפיליאייט</h2>
            <p className="mt-1">
              הדף עשוי לכלול קישור שותפים. אם תבחרו לרכוש או להירשם דרך הקישור,
              ייתכן שתתקבל עמלה ללא עלות נוספת עבורכם.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">סיכום קצר</h2>
            <ul className="list-disc space-y-2 pr-5 text-slate-700">
              <li>{product.name} מתאים לבדיקה למי שמחפש פתרון בתחום {product.category ?? "המוצר הזה"}.</li>
              <li>לפני החלטה כדאי לבדוק התאמה לצורך, מחיר עדכני, משלוח ותנאים.</li>
              <li>זו סקירת גישור קצרה, לא הבטחה לתוצאה ולא טענה לניסיון אישי.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">למי זה יכול להתאים</h2>
            <p className="leading-7 text-slate-700">
              כדאי לבדוק את {product.name} אם הקטגוריה מתאימה לצורך שלכם ואתם רוצים
              לעבור על ההצעה הרשמית לפני החלטה. תמיד מומלץ להשוות חלופות, מחיר ותנאים
              ישירות בעמוד המוצר.
            </p>
          </section>

          <a
            href={destinationUrl}
            target="_blank"
            rel="nofollow sponsored noreferrer"
            className="inline-flex rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            לבדיקה בעמוד המוצר
          </a>
        </section>

        <aside className="space-y-4">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={`${product.name} product image`}
              className="aspect-[4/3] w-full rounded-lg border object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border bg-slate-100 p-6 text-center text-lg font-semibold">
              {product.name}
            </div>
          )}
          <div className="rounded-lg border p-4 text-sm text-slate-700">
            <div className="font-semibold text-slate-950">{product.name}</div>
            {product.brand ? <div>מותג: {product.brand}</div> : null}
            {product.category ? <div>קטגוריה: {product.category}</div> : null}
            {program?.network ? <div>רשת שותפים: {program.network}</div> : null}
          </div>
        </aside>
      </article>
    </PublicSiteShell>
  )
}

async function getReviewProduct(slug: string) {
  if (!isSupabaseConfigured()) return null
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, brand, category, notes, target_keyword, content_angle, affiliate_link, affiliate_url, image_url, image_url_he")
    .eq("slug", slug)
    .maybeSingle()

  if (error || !data) return null
  return data as ReviewProductRow
}

async function getAffiliateProgram(productId: string) {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("affiliate_programs")
    .select("affiliate_link, network, commission_summary")
    .eq("product_id", productId)
    .eq("status", "link_ready")
    .not("affiliate_link", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as AffiliateProgramRow
}

async function getCampaignLink(productId: string) {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("campaign_links")
    .select("final_url")
    .eq("product_id", productId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as CampaignLinkRow
}

async function getPostBody(productId: string) {
  const supabase = getServiceRoleSupabase()
  const { data } = await supabase
    .from("final_copies")
    .select("body")
    .eq("product_id", productId)
    .in("status", ["published", "approved", "pending_review"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.body?.trim()) return null
  return data.body.trim()
}

function looksLikeJson(text: string) {
  return /^[\s\[{"]/.test(text) && /["\]}]/.test(text) && text.includes('"')
}

function buildShortReview(product: ReviewProductRow) {
  if (product.content_angle?.trim() && !looksLikeJson(product.content_angle)) {
    return product.content_angle.trim()
  }
  if (product.notes?.trim() && !looksLikeJson(product.notes)) {
    return product.notes
      .trim()
      .split(/\n+/)[0]
      .replace(/\s+/g, " ")
      .slice(0, 220)
  }
  return `${product.name} הוא מוצר שכדאי לבדוק אם הוא מתאים לצורך, לתקציב ולתנאי הקנייה שלכם.`
}
