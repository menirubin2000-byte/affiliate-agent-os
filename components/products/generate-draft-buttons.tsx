"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, TestTube2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { TemplateType } from "@/types/draft"

const templateOptions: Array<{ label: string; value: TemplateType }> = [
  { label: "Review", value: "review" },
  { label: "Comparison", value: "comparison" },
  { label: "Buying Guide", value: "buying_guide" },
  { label: "Social Post", value: "social_post" },
]

export function GenerateDraftButtons({ productId }: { productId: string }) {
  const router = useRouter()
  const [templateType, setTemplateType] = useState<TemplateType>("review")
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function runGeneration() {
    startTransition(async () => {
      setMessage(null)

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          template_type: templateType,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { draft_id?: string; error?: string }
        | null

      if (!response.ok) {
        setMessage(payload?.error ?? "Generation failed.")
        return
      }

      setMessage(`Created fallback ${templateType.replace("_", " ")} draft ${payload?.draft_id ?? ""}.`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2">
        <select
          value={templateType}
          onChange={(event) => setTemplateType(event.target.value as TemplateType)}
          className="flex h-9 min-w-0 rounded-md border border-input bg-background px-3 text-sm"
          disabled={isPending}
        >
          {templateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" variant="secondary" onClick={runGeneration} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <TestTube2 className="size-4" />}
          Generate fallback draft
        </Button>
      </div>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  )
}
