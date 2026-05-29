"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createProduct } from "@/lib/db"
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
  const slug = slugify(String(formData.get("slug") ?? "").trim())
  const affiliateUrl = String(formData.get("affiliate_url") ?? "").trim()
  const status = String(formData.get("status") ?? "active") as ProductStatus

  try {
    assertIntegrationConfigured("supabase")

    if (!name || !slug || !affiliateUrl) {
      throw new Error("Product name, slug, and affiliate URL are required.")
    }

    if (!isValidStatus(status)) {
      throw new Error("Product status must be active or inactive.")
    }

    assertValidHttpUrl(affiliateUrl)

    await createProduct({
      name,
      slug,
      brand: String(formData.get("brand") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create product."

    redirect(`/dashboard/products/new?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/products")
  redirect("/dashboard/products?created=1")
}
