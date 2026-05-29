"use client"

import { useRef, useState } from "react"
import { ClipboardPaste } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { parseClaudeOutput } from "@/lib/claude-output-parser"
import { cn } from "@/lib/utils"

const fieldMap: Array<{ key: "title" | "metaTitle" | "metaDescription" | "targetKeyword" | "body"; name: string }> = [
  { key: "title", name: "title" },
  { key: "metaTitle", name: "metaTitle" },
  { key: "metaDescription", name: "metaDescription" },
  { key: "targetKeyword", name: "targetKeyword" },
  { key: "body", name: "body" },
]

export function StructuredPasteImport() {
  const [raw, setRaw] = useState("")
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function handleImport() {
    if (!raw.trim()) {
      setMessage({ text: "Paste structured Claude output first.", ok: false })
      return
    }

    const parsed = parseClaudeOutput(raw)
    const filled = Object.values(parsed).filter(Boolean).length

    if (filled === 0) {
      setMessage({
        text: "No fields detected. Use labels like Title:, Body:, Meta Title:, etc.",
        ok: false,
      })
      return
    }

    const form = containerRef.current?.closest("form")
    if (!form) {
      setMessage({ text: "Could not find the form. Try pasting manually.", ok: false })
      return
    }

    let applied = 0
    for (const { key, name } of fieldMap) {
      const value = parsed[key]
      if (!value) continue
      const el = form.elements.namedItem(name)
      if (el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
        el.value = value
        applied++
      }
    }

    setMessage({ text: `Imported ${applied} field${applied > 1 ? "s" : ""}. Review and save.`, ok: true })
  }

  return (
    <div ref={containerRef} className="space-y-2">
      <details className="space-y-2">
        <summary
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
          )}
        >
          <ClipboardPaste className="size-4" />
          Paste structured Claude output
        </summary>
        <div className="space-y-3 pt-2">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={10}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6"
            placeholder={"Title: ...\nMeta Title: ...\nMeta Description: ...\nTarget Keyword: ...\nBody:\n..."}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleImport}
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              Import into form
            </button>
            {message ? (
              <span className={cn("text-sm", message.ok ? "text-emerald-600" : "text-destructive")}>
                {message.text}
              </span>
            ) : null}
          </div>
        </div>
      </details>
    </div>
  )
}
