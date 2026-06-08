"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { addImpactCandidateToSystem } from "@/lib/impact-product-candidates-db"

export async function addImpactCandidateToSystemAction(formData: FormData) {
  const candidateId = String(formData.get("candidate_id") ?? "").trim()

  try {
    if (!candidateId) throw new Error("Missing Impact candidate id.")
    await addImpactCandidateToSystem(candidateId)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add Impact candidate."
    redirect(`/dashboard/he/impact-products?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard/he/impact-products")
  revalidatePath("/dashboard/products")
  redirect("/dashboard/he/impact-products?added=1")
}
