import Link from "next/link"
import { notFound } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import {
  approveFinalCopyAction,
  rejectFinalCopyAction,
  requestFinalCopyFixAction,
} from "../../actions"

export const dynamic = "force-dynamic"

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!isSupabaseConfigured()) return notFound()

  const supabase = getServiceRoleSupabase()

  const { data: fc } = await supabase
    .from("final_copies")
    .select(`
      id, body, platform, language, status,
      validation_status, blocking_reasons, affiliate_link,
      product_id,
      products (name, image_url, image_url_he, slug)
    `)
    .eq("id", id)
    .single()

  if (!fc) return notFound()

  const productRaw = fc.products as unknown as { name: string; image_url: string | null; image_url_he: string | null; slug: string | null } | { name: string; image_url: string | null; image_url_he: string | null; slug: string | null }[] | null
  const product = Array.isArray(productRaw) ? productRaw[0] ?? null : productRaw

  const imageUrl = fc.language === "he"
    ? (product?.image_url_he ?? product?.image_url)
    : (product?.image_url ?? product?.image_url_he)

  const { data: program } = await supabase
    .from("affiliate_programs")
    .select("network, status, affiliate_link")
    .eq("product_id", fc.product_id)
    .eq("status", "link_ready")
    .limit(1)
    .maybeSingle()

  const { data: campaignLink } = await supabase
    .from("campaign_links")
    .select("final_url, name")
    .eq("product_id", fc.product_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const platformNames: Record<string, string> = {
    facebook_page: "Facebook",
    instagram_professional: "Instagram",
    x_twitter: "X / Twitter",
    linkedin: "LinkedIn",
    medium: "Medium",
    substack: "Substack",
    pinterest: "Pinterest",
    youtube: "YouTube",
    tiktok: "TikTok",
    reddit: "Reddit",
    quora: "Quora",
  }

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6 p-6 text-right">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">תצוגה מקדימה</h1>
        <Link
          href="/dashboard/he/approve"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          חזרה לתור אישור
        </Link>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
        <p><strong>מוצר:</strong> {product?.name ?? "לא ידוע"}</p>
        <p><strong>פלטפורמה:</strong> {platformNames[fc.platform] ?? fc.platform}</p>
        <p><strong>שפה:</strong> {fc.language === "he" ? "עברית" : "English"}</p>
        <p><strong>סטטוס:</strong> {fc.status}</p>
        <p><strong>ולידציה:</strong> {fc.validation_status ?? "לא נבדק"}</p>
        {program ? (
          <p><strong>תוכנית שותפים:</strong> {program.network} · {program.status} · {program.affiliate_link}</p>
        ) : null}
        {campaignLink?.final_url ? (
          <p><strong>קישור UTM:</strong> <span className="font-mono text-xs break-all">{campaignLink.final_url}</span></p>
        ) : null}
      </div>

      {imageUrl ? (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">תמונה</h2>
          <div className="rounded-lg border overflow-hidden bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={product?.name ?? "product image"}
              className="mx-auto max-h-[500px] w-auto object-contain"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          אין תמונה למוצר הזה
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">טקסט הפוסט</h2>
        <div className="rounded-lg border bg-muted/20 p-4">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed" dir="auto">
            {fc.body || "אין תוכן"}
          </pre>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border bg-card p-4">
        <form action={approveFinalCopyAction}>
          <input type="hidden" name="finalCopyId" value={fc.id} />
          <Button type="submit" size="lg">
            ✓ אשר לפרסום
          </Button>
        </form>
        <form action={rejectFinalCopyAction}>
          <input type="hidden" name="finalCopyId" value={fc.id} />
          <Button type="submit" variant="outline" size="lg">
            ✗ דחה
          </Button>
        </form>
        <form action={requestFinalCopyFixAction}>
          <input type="hidden" name="finalCopyId" value={fc.id} />
          <Button type="submit" variant="ghost" size="lg">
            דרוש תיקון מערכת
          </Button>
        </form>
      </div>
    </div>
  )
}
