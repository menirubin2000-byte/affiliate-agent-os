"use client"

import { Copy } from "lucide-react"

import { Button } from "@/components/ui/button"

export function CopyPublishContent({
  title,
  content,
  link,
}: {
  title: string
  content: string
  link: string | null
}) {
  const fullPost = [title, content, link].filter(Boolean).join("\n\n")

  async function copy(value: string) {
    await navigator.clipboard.writeText(value)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => copy(title)}>
        <Copy className="size-3.5" />
        העתק כותרת
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => copy(content)}>
        <Copy className="size-3.5" />
        העתק תוכן
      </Button>
      {link ? (
        <Button type="button" variant="outline" size="sm" onClick={() => copy(link)}>
          <Copy className="size-3.5" />
          העתק קישור
        </Button>
      ) : null}
      <Button type="button" variant="outline" size="sm" onClick={() => copy(fullPost)}>
        <Copy className="size-3.5" />
        העתק פוסט מלא
      </Button>
    </div>
  )
}
