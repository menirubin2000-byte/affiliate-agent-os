"use client"

import { useMemo, useState } from "react"
import { Check, Clipboard, FileText } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Product } from "@/types/product"
import type { TemplateType } from "@/types/draft"

const templateOptions: Array<{ label: string; value: TemplateType }> = [
  { label: "Review", value: "review" },
  { label: "Comparison", value: "comparison" },
  { label: "Buying guide", value: "buying_guide" },
  { label: "Social post", value: "social_post" },
  { label: "TikTok script", value: "tiktok_script" },
  { label: "Quora answer", value: "quora_answer" },
  { label: "Reddit post", value: "reddit_post" },
]

function formatValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "N/A" : String(value)
}

function buildClaudePrompt(product: Product, templateType: TemplateType) {
  return `
Create an affiliate content draft for Affiliate Agent OS.

Return the content in this exact structured format so I can paste it directly into the app:

Title: <draft title>
Meta Title: <SEO title tag>
Meta Description: <SEO meta description>
Target Keyword: <primary keyword>
Body:
<full draft body>

Template type: ${templateType}

Product data:
- Product name: ${product.name}
- Brand: ${formatValue(product.brand)}
- Category: ${formatValue(product.category)}
- Affiliate URL: ${product.affiliateUrl}
- Price: ${formatValue(product.price)}
- Commission rate: ${formatValue(product.commissionRate)}
- Notes: ${formatValue(product.notes)}
- Target keyword: ${formatValue(product.targetKeyword)}
- Secondary keywords: ${product.secondaryKeywords.length > 0 ? product.secondaryKeywords.join(", ") : "N/A"}
- Search intent: ${formatValue(product.searchIntent)}
- Content angle: ${formatValue(product.contentAngle)}

Compliance rules:
- Include a clear affiliate disclosure in the body.
- Include a clear CTA using the affiliate URL.
- Do not invent fake reviews, testimonials, ratings, awards, certifications, discounts, prices, guarantees, or product claims.
- If information is missing, say it should be verified rather than fabricating it.
- Keep the output ready to paste into the Affiliate Agent OS manual draft form.
- Do not mark the content approved. It must remain a draft for human review.
`.trim()
}

export function ClaudePromptHelper({ product }: { product: Product }) {
  const [templateType, setTemplateType] = useState<TemplateType>("review")
  const [copied, setCopied] = useState(false)
  const prompt = useMemo(
    () => buildClaudePrompt(product, templateType),
    [product, templateType],
  )

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2">
        <select
          value={templateType}
          onChange={(event) => setTemplateType(event.target.value as TemplateType)}
          className="flex h-9 min-w-0 rounded-md border border-input bg-background px-3 text-sm"
        >
          {templateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <details className="space-y-2">
        <summary
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
          )}
        >
          <FileText className="size-4" />
          Prepare Claude prompt
        </summary>
        <div className="space-y-2">
          <textarea
            value={prompt}
            readOnly
            rows={8}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-5 text-muted-foreground"
          />
          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            onClick={copyPrompt}
          >
            {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>
      </details>
    </div>
  )
}
