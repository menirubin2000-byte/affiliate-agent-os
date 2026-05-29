"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  createSavedView,
  deleteSavedView,
  getSavedView,
  setDefaultSavedView,
} from "@/lib/db"
import { isJsonSafeFilters, isValidViewType } from "@/lib/saved-views"
import type { SavedViewType } from "@/types/saved-view"

export async function createSavedViewAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const viewType = String(formData.get("view_type") ?? "").trim()
  const filtersRaw = String(formData.get("filters") ?? "{}").trim()

  if (!name) {
    redirect("/dashboard/saved-views?error=Name+is+required")
  }

  if (!isValidViewType(viewType)) {
    redirect("/dashboard/saved-views?error=Invalid+view+type")
  }

  let filters: Record<string, string>
  try {
    filters = JSON.parse(filtersRaw)
  } catch {
    redirect("/dashboard/saved-views?error=Invalid+filter+JSON")
  }

  if (!isJsonSafeFilters(filters)) {
    redirect("/dashboard/saved-views?error=Filters+must+be+string+key-value+pairs")
  }

  try {
    await createSavedView({
      name,
      viewType: viewType as SavedViewType,
      filters,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create saved view"
    redirect(`/dashboard/saved-views?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard/saved-views")
  revalidatePath("/dashboard")
  redirect("/dashboard/saved-views?created=1")
}

export async function saveRecommendedViewAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const viewType = String(formData.get("view_type") ?? "").trim()
  const filtersRaw = String(formData.get("filters") ?? "{}").trim()

  if (!name || !isValidViewType(viewType)) {
    redirect("/dashboard/saved-views?error=Invalid+recommended+view")
  }

  let filters: Record<string, string>
  try {
    filters = JSON.parse(filtersRaw)
  } catch {
    redirect("/dashboard/saved-views?error=Invalid+filter+data")
  }

  try {
    await createSavedView({
      name,
      viewType: viewType as SavedViewType,
      filters,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save view"
    redirect(`/dashboard/saved-views?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard/saved-views")
  revalidatePath("/dashboard")
  redirect("/dashboard/saved-views?created=1")
}

export async function deleteSavedViewAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()

  if (!id) {
    redirect("/dashboard/saved-views?error=Missing+view+ID")
  }

  try {
    await deleteSavedView(id)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete view"
    redirect(`/dashboard/saved-views?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard/saved-views")
  revalidatePath("/dashboard")
  redirect("/dashboard/saved-views?deleted=1")
}

export async function setDefaultSavedViewAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()

  if (!id) {
    redirect("/dashboard/saved-views?error=Missing+view+ID")
  }

  try {
    const view = await getSavedView(id)
    if (!view) {
      redirect("/dashboard/saved-views?error=View+not+found")
    }
    await setDefaultSavedView(id, view!.viewType)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to set default"
    redirect(`/dashboard/saved-views?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard/saved-views")
  revalidatePath("/dashboard")
  redirect("/dashboard/saved-views?default_set=1")
}
