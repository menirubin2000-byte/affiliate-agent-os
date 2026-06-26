import Link from "next/link"
import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { countCharsForPlatform, getPlatformCharLimit } from "@/lib/platform-char-limits"
import { MENI_CONFIRM_HEBREW_TOKEN, MENI_CONFIRM_TOKEN } from "@/lib/draft-approval-workflow"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import type { CampaignPlatform } from "@/types/campaign-workflow"
import { cn } from "@/lib/utils"

import {
  approveAllReadyPostsForProductAction,
  approveFinalCopyAction,
  createMissingDraftsForProductAction,
  deleteProductVideoAction,
  updateFinalCopyBodyAction,
  uploadProductImageAction,
} from "./actions"
import { VideoUploadClient } from "./preview/[id]/video-upload-client"

export const dynamic = "force-dynamic"

const PLATFORMS: Array<{ key: CampaignPlatform; label: string }> = [
  { key: "facebook_page", label: "Facebook" },
  { key: "instagram_professional", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "medium", label: "Medium" },
  { key: "substack", label: "Substack" },
  { key: "pinterest", label: "Pinterest" },
  { key: "x_twitter", label: "X / Twitter" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "quora", label: "Quora" },
  { key: "reddit", label: "Reddit" },
  { key: "threads", label: "Threads" },
]

type PostRow = {
  id: string
  platform: CampaignPlatform
  language: string | null
  status: string
  body: string | null
}

function statusLabel(status: string) {
  const m: Record<string, string> = {
    ready_for_operator_approval: "מוכן לאישור",
    operator_approved: "מאושר ✓",
    ready_for_manual_publish: "מוכן לפרסום",
    published_verified: "פורסם",
    needs_system_fix: "צריך תיקון",
    operator_rejected: "נדחה",
    validated: "מאומת",
    draft_internal: "טיוטה",
  }
  return m[status] ?? "אין טיוטה"
}

function PostEditor({ post, label }: { post: PostRow | undefined; label: string }) {
  if (!post) {
    return (
      <div className="rounded-lg border border-dashed bg-background/40 p-3 text-xs text-muted-foreground">
        {label}: אין טיוטה. השתמש ב&quot;הוסף פלטפורמות חסרות&quot; למעלה.
      </div>
    )
  }
  const limit = getPlatformCharLimit(post.platform)
  const count = countCharsForPlatform(post.platform, post.body ?? "")
  // No edit lock: every post is always editable, including published ones.
  // MENI does not want to be blocked from editing his own posts.
  const editable = true
  return (
    <form className="space-y-2 rounded-lg border bg-background/60 p-3">
      <input type="hidden" name="finalCopyId" value={post.id} />
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="flex items-center gap-2">
          <Badge variant={post.status === "operator_approved" ? "default" : "outline"}>{statusLabel(post.status)}</Badge>
          <span className="text-muted-foreground">{limit === null ? `${count} תווים` : `${count}/${limit}`}</span>
        </span>
      </div>
      <textarea
        name="body"
        defaultValue={post.body ?? ""}
        dir="auto"
        disabled={!editable}
        className="min-h-[220px] w-full rounded-md border bg-muted/20 p-3 text-sm leading-relaxed"
      />
      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" variant="outline" formAction={updateFinalCopyBodyAction}>
            שמור
          </Button>
          <Button type="submit" size="sm" formAction={approveFinalCopyAction}>
            ✓ אשר
          </Button>
        </div>
      ) : null}
    </form>
  )
}

export async function ProductDetailPage({ productId, backHref }: { productId: string; backHref: string }) {
  if (!isSupabaseConfigured()) return notFound()
  const supabase = getServiceRoleSupabase()

  const { data: product } = await supabase
    .from("products")
    .select("id, name, image_url, image_url_he, video_url, video_status")
    .eq("id", productId)
    .single()
  if (!product) return notFound()

  const { data: postsData } = await supabase
    .from("final_copies")
    .select("id, platform, language, status, body")
    .eq("product_id", productId)
    .order("updated_at", { ascending: false })
  const posts = (postsData ?? []) as PostRow[]

  const he = (key: CampaignPlatform) => posts.find((p) => p.platform === key && (p.language ?? "he") === "he")
  const en = (key: CampaignPlatform) => posts.find((p) => p.platform === key && p.language === "en")
  const readyCount = posts.filter((p) => p.status === "ready_for_operator_approval").length
  const approvedCount = posts.filter((p) => p.status === "operator_approved").length

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-sm text-muted-foreground">מוכנים לאישור: {readyCount} · מאושרים: {approvedCount}</p>
        </div>
        <Link href={backHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          חזרה לרשימת המוצרים
        </Link>
      </div>

      {/* media */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-lg border p-3">
          <h2 className="text-sm font-semibold">תמונה</h2>
          {product.image_url_he || product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={(product.image_url_he || product.image_url) as string} alt={product.name} className="max-h-64 w-auto rounded object-contain" />
          ) : (
            <p className="text-xs text-muted-foreground">אין תמונה</p>
          )}
          <form action={uploadProductImageAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="language" value="he" />
            <input type="file" name="image" accept="image/*" required className="text-xs" />
            <Button type="submit" size="sm" variant="outline">העלה תמונה</Button>
          </form>
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <h2 className="text-sm font-semibold">וידאו</h2>
          {product.video_url ? (
            <>
              <video src={product.video_url} controls className="max-h-64 w-full rounded" />
              <form action={deleteProductVideoAction}>
                <input type="hidden" name="productId" value={product.id} />
                <Button type="submit" size="sm" variant="destructive">מחק וידאו</Button>
              </form>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">אין וידאו</p>
          )}
          <VideoUploadClient productId={product.id} />
        </div>
      </div>

      {/* bulk actions */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-3">
        <form action={createMissingDraftsForProductAction}>
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="redirectTo" value={backHref + "/" + product.id} />
          <Button type="submit" size="sm" variant="secondary">הוסף פלטפורמות חסרות</Button>
        </form>
        <form action={approveAllReadyPostsForProductAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="productId" value={product.id} />
          <label className="grid gap-1 text-xs text-muted-foreground">
            אישור מני
            <input name="confirmation" placeholder={`${MENI_CONFIRM_HEBREW_TOKEN} / ${MENI_CONFIRM_TOKEN}`} className="h-9 rounded-md border bg-background px-3 text-sm text-foreground" />
          </label>
          <Button type="submit" size="sm">✓ אשר את כל המוכנים ({readyCount})</Button>
        </form>
      </div>

      {/* platforms */}
      <div className="grid gap-4 lg:grid-cols-2">
        {PLATFORMS.map((pl) => (
          <div key={pl.key} className="space-y-2 rounded-xl border p-3">
            <h3 className="font-semibold">{pl.label}</h3>
            <PostEditor post={he(pl.key)} label="עברית" />
            <PostEditor post={en(pl.key)} label="English" />
          </div>
        ))}
      </div>
    </div>
  )
}
