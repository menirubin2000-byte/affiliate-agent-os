"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  createAffiliateProgram,
  createProduct,
  listAffiliateProgramsForProduct,
  listProducts,
  updateAffiliateProgramLink,
} from "@/lib/db"
import { assertIntegrationConfigured } from "@/lib/env"
import { slugify } from "@/lib/utils"
import type { ProductStatus } from "@/types/product"

function parseOptionalNumber(value: FormDataEntryValue | null, fieldLabel: string) {
  if (typeof value !== "string" || value.trim() === "") {
    return null
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldLabel} must be a valid number.`)
  }

  return parsed
}

function parseSecondaryKeywords(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return []
  }

  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

function isValidStatus(value: string): value is ProductStatus {
  return value === "active" || value === "inactive"
}

const GENERIC_SINGLE_WORD_SLUGS = new Set([
  "ai",
  "aliexpress",
  "amazon",
  "electronics",
  "gaming",
  "headphone",
  "headphones",
  "product",
  "products",
  "software",
  "tool",
  "tools",
])

function chooseSlug(name: string, requestedSlug: string) {
  const generatedSlug = slugify(name)
  const normalizedRequestedSlug = slugify(requestedSlug)

  if (!requestedSlug.trim() || normalizedRequestedSlug === "product") {
    return generatedSlug
  }

  const requestedParts = normalizedRequestedSlug.split("-").filter(Boolean)
  const generatedParts = generatedSlug.split("-").filter(Boolean)

  if (
    requestedParts.length <= 1 &&
    generatedParts.length >= 3 &&
    GENERIC_SINGLE_WORD_SLUGS.has(normalizedRequestedSlug)
  ) {
    return generatedSlug
  }

  return normalizedRequestedSlug
}

async function buildUniqueSlug(baseSlug: string) {
  const products = await listProducts()
  const existingSlugs = new Set(products.map((product) => product.slug))

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug
  }

  let suffix = 2
  let candidate = `${baseSlug}-${suffix}`

  while (existingSlugs.has(candidate)) {
    suffix += 1
    candidate = `${baseSlug}-${suffix}`
  }

  return candidate
}

function inferAffiliateNetwork(affiliateUrl: string) {
  try {
    const hostname = new URL(affiliateUrl).hostname.toLowerCase()

    if (hostname.includes("aliexpress.com")) return "AliExpress"
    if (hostname.includes("amzn.to") || hostname.includes("amazon.")) return "Amazon"
    if (hostname.includes("impact.com")) return "Impact"
    if (hostname.includes("partnerstack.com")) return "PartnerStack"
  } catch {
    return null
  }

  return null
}

function assertValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value)

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error()
    }
  } catch {
    throw new Error("Affiliate URL must be a valid http or https URL.")
  }
}

export async function createProductAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const requestedSlug = String(formData.get("slug") ?? "").trim()
  const affiliateUrl = String(formData.get("affiliate_url") ?? "").trim()
  const status = String(formData.get("status") ?? "active") as ProductStatus

  try {
    assertIntegrationConfigured("supabase")

    if (!name || !affiliateUrl) {
      throw new Error("Product name and affiliate URL are required.")
    }

    if (!isValidStatus(status)) {
      throw new Error("Product status must be active or inactive.")
    }

    assertValidHttpUrl(affiliateUrl)

    const slug = await buildUniqueSlug(chooseSlug(name, requestedSlug))
    const commissionRateInput = String(formData.get("commission_rate") ?? "").trim()
    const product = await createProduct({
      name,
      slug,
      brand: String(formData.get("brand") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      affiliateLink: affiliateUrl,
      affiliateUrl,
      price: parseOptionalNumber(formData.get("price"), "Price"),
      commissionRate: parseOptionalNumber(formData.get("commission_rate"), "Commission rate"),
      notes: String(formData.get("notes") ?? "").trim() || null,
      targetKeyword: String(formData.get("target_keyword") ?? "").trim() || null,
      secondaryKeywords: parseSecondaryKeywords(formData.get("secondary_keywords")),
      searchIntent: String(formData.get("search_intent") ?? "").trim() || null,
      contentAngle: String(formData.get("content_angle") ?? "").trim() || null,
      status,
    })

    const existingPrograms = await listAffiliateProgramsForProduct(product.id)
    const firstProgram = existingPrograms[0]

    if (firstProgram) {
      await updateAffiliateProgramLink(firstProgram.id, affiliateUrl)
    } else {
      await createAffiliateProgram({
        productId: product.id,
        programName: `${name} Affiliate Program`,
        programUrl: affiliateUrl,
        network: inferAffiliateNetwork(affiliateUrl),
        commissionSummary: commissionRateInput ? `${commissionRateInput}%` : null,
        approvalType: "instant",
        status: "link_ready",
        affiliateLink: affiliateUrl,
        notes: "Created automatically from Add product form.",
      })
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create product."

    redirect(`/dashboard/products/new?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/products")
  redirect("/dashboard/products?created=1")
}
