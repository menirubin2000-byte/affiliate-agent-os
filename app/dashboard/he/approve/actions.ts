"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  approveFinalCopy,
  rejectFinalCopy,
  requestFinalCopySystemFix,
} from "@/lib/content-review-db"
import { assertIntegrationConfigured } from "@/lib/env"
import { getServiceRoleSupabase } from "@/lib/supabase/server"

function fail(reason: string): never {
  redirect(`/dashboard/he/approve?error=${encodeURIComponent(reason)}`)
}

export async function approveFinalCopyAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  if (!finalCopyId) fail("missing_final_copy_id")

  try {
    assertIntegrationConfigured("supabase")
    await approveFinalCopy(finalCopyId)
  } catch (error) {
    fail(error instanceof Error ? error.message : "approve_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/he/schedule")
  revalidatePath("/dashboard/he/publish-ready")
  revalidatePath("/dashboard/he/content-review")
  redirect("/dashboard/he/approve?approved=1")
}

export async function rejectFinalCopyAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  if (!finalCopyId) fail("missing_final_copy_id")

  try {
    assertIntegrationConfigured("supabase")
    await rejectFinalCopy(finalCopyId)
  } catch (error) {
    fail(error instanceof Error ? error.message : "reject_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/he/content-review")
  redirect("/dashboard/he/approve?rejected=1")
}

export async function requestFinalCopyFixAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  if (!finalCopyId) fail("missing_final_copy_id")

  try {
    assertIntegrationConfigured("supabase")
    await requestFinalCopySystemFix(finalCopyId)
  } catch (error) {
    fail(error instanceof Error ? error.message : "fix_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/he/content-review")
  revalidatePath("/dashboard/improvements")
  redirect("/dashboard/he/approve?fix=1")
}

export async function deleteFinalCopyAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  if (!finalCopyId) fail("missing_final_copy_id")

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const { data: fc } = await supabase
      .from("final_copies")
      .select("status")
      .eq("id", finalCopyId)
      .single()
    if (fc?.status === "published_verified") fail("cannot_delete_published_post")
    const { error } = await supabase.from("final_copies").delete().eq("id", finalCopyId)
    if (error) fail(error.message)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "delete_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he/approve")
  redirect("/dashboard/he/approve?approved=post_deleted")
}

export async function deleteProductAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim()
  if (!productId) fail("missing_product_id")

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const { error } = await supabase.from("products").delete().eq("id", productId)
    if (error) fail(error.message)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "delete_product_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he/approve")
  revalidatePath("/dashboard/products")
  redirect("/dashboard/he/approve?approved=product_deleted")
}

export async function updateFinalCopyBodyAction(formData: FormData) {
  const finalCopyId = String(formData.get("finalCopyId") ?? "").trim()
  const body = String(formData.get("body") ?? "")
  if (!finalCopyId) fail("missing_final_copy_id")

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const { data: fc } = await supabase
      .from("final_copies")
      .select("status")
      .eq("id", finalCopyId)
      .single()
    if (fc?.status === "published_verified") fail("cannot_edit_published_post")
    const { error } = await supabase
      .from("final_copies")
      .update({ body })
      .eq("id", finalCopyId)
    if (error) fail(error.message)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "update_failed")
  }

  revalidatePath("/dashboard/he/approve")
  redirect(`/dashboard/he/approve/preview/${finalCopyId}?approved=body_updated`)
}

export async function uploadProductImageAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim()
  const language = String(formData.get("language") ?? "en")
  const file = formData.get("image") as File | null
  if (!productId || !file || file.size === 0) fail("missing_image")

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const ext = file.name.split(".").pop() ?? "png"
    const path = `product-images/${productId}/${language}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, buffer, { contentType: file.type, upsert: true })
    if (uploadError) fail(uploadError.message)
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path)
    const col = language === "he" ? "image_url_he" : "image_url"
    const { error } = await supabase
      .from("products")
      .update({ [col]: urlData.publicUrl, asset_synced_at: new Date().toISOString() })
      .eq("id", productId)
    if (error) fail(error.message)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "upload_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he/approve")
  redirect(`/dashboard/he/approve?approved=image_uploaded`)
}

export async function uploadProductVideoAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim()
  const file = formData.get("video") as File | null
  if (!productId || !file || file.size === 0) fail("missing_video")

  try {
    assertIntegrationConfigured("supabase")
    const supabase = getServiceRoleSupabase()
    const ext = file.name.split(".").pop() ?? "mp4"
    const path = `product-videos/${productId}/video.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, buffer, { contentType: file.type, upsert: true })
    if (uploadError) fail(uploadError.message)
    const { data: urlData } = supabase.storage.from("media").getPublicUrl(path)
    const { error } = await supabase
      .from("products")
      .update({ video_url: urlData.publicUrl, video_status: "ready", asset_synced_at: new Date().toISOString() })
      .eq("id", productId)
    if (error) fail(error.message)
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
    fail(error instanceof Error ? error.message : "video_upload_failed")
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/he/approve")
  redirect(`/dashboard/he/approve?approved=video_uploaded`)
}
