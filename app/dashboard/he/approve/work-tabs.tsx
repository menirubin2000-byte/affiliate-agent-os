"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { countCharsForPlatform, getPlatformCharLimit } from "@/lib/platform-char-limits"
import { MENI_CONFIRM_HEBREW_TOKEN, MENI_CONFIRM_TOKEN } from "@/lib/draft-approval-workflow"
import { cn } from "@/lib/utils"

import {
  approveSelectedPostsAction,
  createMissingDraftsForProductAction,
  updateSelectedProductPostsBodyAction,
} from "./actions"

const PLATFORMS: Array<{ key: string; label: string }> = [
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

export type WorkPost = {
  id: string
  platform: string
  language: string | null
  status: string
  body: string | null
}

export type WorkProduct = {
  productId: string
  productName: string
  posts: WorkPost[]
  readyCount: number
}

function statusLabel(status: string) {
  const m: Record<string, string> = {
    ready_for_operator_approval: "מוכן לאישור",
    operator_approved: "מאושר",
    ready_for_manual_publish: "מוכן לפרסום",
    published_verified: "פורסם",
    needs_system_fix: "צריך תיקון",
    operator_rejected: "נדחה",
    validated: "מאומת",
    draft_internal: "טיוטה",
  }
  return m[status] ?? "אין טיוטה"
}

function PostBox({ post }: { post: WorkPost | undefined }) {
  if (!post) {
    return (
      <div className="rounded-lg border border-dashed bg-background/50 p-3 text-xs text-muted-foreground">
        אין טיוטה
      </div>
    )
  }
  const editable = post.status !== "published_verified"
  const limit = getPlatformCharLimit(post.platform as never)
  const count = countCharsForPlatform(post.platform as never, post.body ?? "")
  return (
    <div className="rounded-lg border bg-background/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {editable ? (
            <input type="checkbox" name="finalCopyIds" value={post.id} className="h-4 w-4" />
          ) : null}
          <Badge variant={post.status === "ready_for_operator_approval" ? "default" : "outline"}>
            {statusLabel(post.status)}
          </Badge>
        </div>
        <span className="text-muted-foreground">{limit === null ? "ללא הגבלה" : `${count}/${limit}`}</span>
      </div>
      <p className="max-h-40 overflow-auto whitespace-pre-wrap text-sm leading-relaxed">
        {(post.body ?? "").trim() || "— ריק —"}
      </p>
    </div>
  )
}

export function WorkTabs({
  products,
  basePath,
  initialProductId,
}: {
  products: WorkProduct[]
  basePath: string
  initialProductId?: string
}) {
  const router = useRouter()
  const [activeId, setActiveId] = useState(initialProductId || products[0]?.productId || "")
  const active = products.find((p) => p.productId === activeId) ?? products[0]
  if (!active) return <p className="text-muted-foreground">אין מוצרים להצגה.</p>

  const heByPlatform = (key: string) =>
    active.posts.find((p) => p.platform === key && (p.language ?? "he") === "he")
  const enByPlatform = (key: string) =>
    active.posts.find((p) => p.platform === key && p.language === "en")

  const redirectTo = `${basePath}?p=${active.productId}`

  return (
    <div className="space-y-4">
      {/* tab bar */}
      <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/20 p-2">
        {products.map((p) => (
          <button
            key={p.productId}
            type="button"
            onClick={() => {
              setActiveId(p.productId)
              router.replace(`${basePath}?p=${p.productId}`)
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition",
              p.productId === active.productId
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted",
            )}
          >
            {p.productName}
            {p.readyCount > 0 ? (
              <span className="ms-1 rounded-full bg-blue-500/20 px-1.5 text-xs">{p.readyCount}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* active product panel */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{active.productName}</h2>
          <form action={createMissingDraftsForProductAction}>
            <input type="hidden" name="productId" value={active.productId} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <Button type="submit" size="sm" variant="secondary">צור טיוטות חסרות</Button>
          </form>
        </div>

        <form className="space-y-4">
          <input type="hidden" name="productId" value={active.productId} />
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div className="grid gap-3 lg:grid-cols-2">
            {PLATFORMS.map((pl) => (
              <div key={pl.key} className="rounded-xl border p-3">
                <div className="mb-2 font-semibold">{pl.label}</div>
                <div className="grid gap-2">
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">עברית</div>
                    <PostBox post={heByPlatform(pl.key)} />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">English</div>
                    <PostBox post={enByPlatform(pl.key)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold">טקסט לפלטפורמות המסומנות (עריכה של כמה ביחד)</label>
            <textarea
              name="body"
              dir="auto"
              className="min-h-[160px] w-full rounded-lg border bg-background p-3 text-sm"
              placeholder="סמן פוסטים למעלה, הדבק/ערוך כאן את הטקסט, ושמור למסומנות."
            />
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-3">
            <label className="grid gap-1 text-xs text-muted-foreground">
              אישור מני
              <input
                name="confirmation"
                placeholder={`${MENI_CONFIRM_HEBREW_TOKEN} / ${MENI_CONFIRM_TOKEN}`}
                className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
              />
            </label>
            <Button type="submit" size="sm" variant="outline" formAction={updateSelectedProductPostsBodyAction}>
              שמור למסומנות
            </Button>
            <Button type="submit" size="sm" formAction={approveSelectedPostsAction}>
              אשר מסומנות
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
