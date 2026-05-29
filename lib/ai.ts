import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"

import { getAiReadiness } from "@/lib/env"
import type { ContentType, DraftCreateInput, TemplateType } from "@/types/draft"
import type { Product } from "@/types/product"

interface GenerationResult {
  aiModel: string
  draft: DraftCreateInput
}

let anthropicClient: Anthropic | null = null
let openAiClient: OpenAI | null = null

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    const readiness = getAiReadiness()
    throw new Error(`${readiness.summary} ${readiness.guidance}`)
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey })
  }

  return anthropicClient
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    const readiness = getAiReadiness()
    throw new Error(`${readiness.summary} ${readiness.guidance}`)
  }

  if (!openAiClient) {
    openAiClient = new OpenAI({ apiKey })
  }

  return openAiClient
}

function formatKeywordList(keywords: string[]) {
  return keywords.length > 0 ? keywords.join(", ") : "N/A"
}

function buildProductSummary(product: Product, templateType: TemplateType) {
  return [
    `Template type: ${templateType}`,
    `Product name: ${product.name}`,
    `Brand: ${product.brand ?? "N/A"}`,
    `Category: ${product.category ?? "N/A"}`,
    `Affiliate URL: ${product.affiliateUrl}`,
    `Price: ${product.price ?? "Unknown"}`,
    `Commission rate: ${product.commissionRate ?? "Unknown"}`,
    `Notes: ${product.notes ?? "N/A"}`,
    `Target keyword: ${product.targetKeyword ?? "N/A"}`,
    `Secondary keywords: ${formatKeywordList(product.secondaryKeywords)}`,
    `Search intent: ${product.searchIntent ?? "N/A"}`,
    `Content angle: ${product.contentAngle ?? "N/A"}`,
  ].join("\n")
}

function buildPrompt(product: Product, templateType: TemplateType) {
  return `
You are writing affiliate marketing drafts for an internal approval workflow.
Return only valid JSON with this exact shape:
{
  "title": "string",
  "body": "string",
  "meta_title": "string",
  "meta_description": "string",
  "target_keyword": "string"
}

Rules:
- Write in English.
- Base the draft only on the provided product data.
- Never invent fake product claims, reviews, ratings, testimonials, awards, certifications, discounts, or prices.
- If a detail is missing, say it should be verified rather than fabricating it.
- Always include a clear affiliate disclosure in the body.
- Always include a CTA with the affiliate URL.
- Use the target keyword naturally when one is available.
- Keep the output in draft form for human review.

Template guidance:
- review: include overview, who it is for, who it is not for, and a careful CTA.
- comparison: include how it compares, tradeoffs, best fit, and a careful CTA.
- buying_guide: include what to look for, who should consider it, and a careful CTA.
- social_post: write a concise post with disclosure and CTA.

${buildProductSummary(product, templateType)}
`.trim()
}

function parseDraftPayload(rawText: string) {
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const jsonText =
    fencedMatch?.[1]?.trim() ??
    rawText.slice(rawText.indexOf("{"), rawText.lastIndexOf("}") + 1).trim()

  const parsed = JSON.parse(jsonText) as {
    title?: string
    body?: string
    meta_title?: string
    meta_description?: string
    target_keyword?: string
  }

  const body = parsed.body?.trim()

  if (!body) {
    throw new Error("AI draft is missing body content.")
  }

  return {
    title: parsed.title?.trim() || null,
    body,
    metaTitle: parsed.meta_title?.trim() || null,
    metaDescription: parsed.meta_description?.trim() || null,
    targetKeyword: parsed.target_keyword?.trim() || null,
  }
}

function getFallbackBody(product: Product, templateType: TemplateType) {
  const keywordLine = product.targetKeyword
    ? `Target keyword: ${product.targetKeyword}.`
    : "Keyword strategy should be verified before publishing."

  if (templateType === "comparison") {
    return [
      `${product.name} can be compared against similar ${product.category ?? "solutions"} when the buyer wants a direct fit and simpler evaluation criteria.`,
      "",
      "How it compares:",
      "- Brand context should be verified from the official product page.",
      "- Pricing and commission details should be confirmed before publication.",
      "- This draft avoids unsupported claims and is meant for human review.",
      "",
      "Best fit:",
      "- Buyers comparing options for the same problem space.",
      "",
      "Affiliate disclosure: This draft may include affiliate links, and a commission may be earned at no extra cost to the buyer.",
      `CTA: Visit ${product.affiliateUrl} to review the official product details before making a decision.`,
      keywordLine,
    ].join("\n")
  }

  if (templateType === "buying_guide") {
    return [
      `${product.name} may be relevant in a buying guide for people evaluating ${product.category ?? "this category"} with a practical, lower-risk approach.`,
      "",
      "What to look for:",
      "- Current pricing and packaging",
      "- Whether the feature set matches the buyer's use case",
      "- Whether the vendor information is complete enough to support a recommendation",
      "",
      "Best for:",
      "- Buyers who need a shortlist and clear next-step guidance.",
      "",
      "Affiliate disclosure: This draft may include affiliate links, and a commission may be earned at no extra cost to the buyer.",
      `CTA: Review the official product page here: ${product.affiliateUrl}`,
      keywordLine,
    ].join("\n")
  }

  if (templateType === "social_post") {
    return [
      `${product.name} is worth a closer look for people evaluating ${product.category ?? "this category"} and wanting a more direct option.`,
      "Affiliate disclosure: This post may include affiliate links, and a commission may be earned at no extra cost to the buyer.",
      `CTA: Visit ${product.affiliateUrl} to verify the current offer and product details.`,
      keywordLine,
    ].join("\n")
  }

  return [
    `${product.name} is positioned for buyers looking at ${product.category ?? "this category"} without overcomplicating the decision.`,
    "",
    "Who it is for:",
    "- Buyers who want a direct fit for the stated use case.",
    "",
    "Who it is not for:",
    "- Buyers who need guarantees or unsupported claims that the available product data does not justify.",
    "",
    "Affiliate disclosure: This draft may include affiliate links, and a commission may be earned at no extra cost to the buyer.",
    `CTA: Visit ${product.affiliateUrl} to verify pricing, features, and current terms.`,
    keywordLine,
  ].join("\n")
}

function createStubDraft(product: Product, templateType: TemplateType): DraftCreateInput {
  const keyword = product.targetKeyword ?? `${product.name} review`

  return {
    title:
      templateType === "social_post"
        ? `${product.name} social draft`
        : `${product.name} ${templateType.replace("_", " ")} draft`,
    body: getFallbackBody(product, templateType),
    metaTitle: `${product.name} ${templateType.replace("_", " ")} | ${keyword}`.slice(0, 60),
    metaDescription: `Draft content for ${product.name}. Verify product details, pricing, and fit before publishing.`.slice(
      0,
      155,
    ),
    targetKeyword: keyword,
  }
}

async function generateWithAnthropic(product: Product, templateType: TemplateType) {
  const client = getAnthropicClient()
  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1800,
    messages: [
      {
        role: "user",
        content: buildPrompt(product, templateType),
      },
    ],
  })

  const rawText = message.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n")

  return {
    aiModel: "claude-opus-4-6",
    draft: parseDraftPayload(rawText),
  }
}

async function generateWithOpenAI(product: Product, templateType: TemplateType) {
  const client = getOpenAIClient()
  const response = await client.responses.create({
    model: "gpt-5.2",
    input: buildPrompt(product, templateType),
  })

  return {
    aiModel: "gpt-5.2",
    draft: parseDraftPayload(response.output_text),
  }
}

export function getContentTypeForTemplate(templateType: TemplateType): ContentType {
  return templateType === "social_post" ? "social_post" : "review"
}

export async function generateDraftForProduct(
  product: Product,
  templateType: TemplateType,
): Promise<GenerationResult> {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase()
  const readiness = getAiReadiness()

  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    try {
      return await generateWithAnthropic(product, templateType)
    } catch {
      return {
        aiModel: "stub-fallback",
        draft: createStubDraft(product, templateType),
      }
    }
  }

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    try {
      return await generateWithOpenAI(product, templateType)
    } catch {
      return {
        aiModel: "stub-fallback",
        draft: createStubDraft(product, templateType),
      }
    }
  }

  return {
    aiModel: readiness.status === "configured" ? "stub-fallback" : "stub",
    draft: createStubDraft(product, templateType),
  }
}
