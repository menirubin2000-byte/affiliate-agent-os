"use server"

import { redirect } from "next/navigation"

import {
  createImprovementTask,
  updateImprovementTaskStatus,
  generateImprovementTasksFromInsights,
  getPerformanceInsights,
} from "@/lib/db"
import type { ImprovementTaskStatus } from "@/types/improvement-task"

export async function createImprovementTaskAction(formData: FormData) {
  const title = (formData.get("title") as string)?.trim()
  if (!title) {
    redirect("/dashboard/improvements?error=Title+is+required")
  }

  const productId = (formData.get("productId") as string)?.trim() || null
  const contentDraftId = (formData.get("contentDraftId") as string)?.trim() || null
  const description = (formData.get("description") as string)?.trim() || null
  const priority = (formData.get("priority") as string)?.trim() || "medium"
  const suggestedAction = (formData.get("suggestedAction") as string)?.trim() || null

  try {
    await createImprovementTask({
      productId,
      contentDraftId,
      sourceType: "manual",
      priority: priority as "low" | "medium" | "high" | "critical",
      title,
      description,
      suggestedAction,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create task"
    redirect(`/dashboard/improvements?error=${encodeURIComponent(message)}`)
  }

  redirect("/dashboard/improvements?created=1")
}

export async function updateTaskStatusAction(formData: FormData) {
  const taskId = formData.get("taskId") as string
  const status = formData.get("status") as ImprovementTaskStatus

  if (!taskId || !status) {
    redirect("/dashboard/improvements?error=Missing+task+ID+or+status")
  }

  try {
    await updateImprovementTaskStatus(taskId, status)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update task"
    redirect(`/dashboard/improvements?error=${encodeURIComponent(message)}`)
  }

  redirect("/dashboard/improvements")
}

export async function generateTasksFromInsightsAction() {
  try {
    const insights = await getPerformanceInsights()
    const count = await generateImprovementTasksFromInsights(insights)
    redirect(`/dashboard/improvements?generated=${count}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate tasks"
    redirect(`/dashboard/improvements?error=${encodeURIComponent(message)}`)
  }
}

export async function createTaskFromContextAction(formData: FormData) {
  const title = (formData.get("title") as string)?.trim()
  const sourceType = (formData.get("sourceType") as string)?.trim() || "recommendation"
  const productId = (formData.get("productId") as string)?.trim() || null
  const contentDraftId = (formData.get("contentDraftId") as string)?.trim() || null
  const description = (formData.get("description") as string)?.trim() || null
  const priority = (formData.get("priority") as string)?.trim() || "medium"
  const suggestedAction = (formData.get("suggestedAction") as string)?.trim() || null
  const returnTo = (formData.get("returnTo") as string)?.trim() || "/dashboard/improvements"

  if (!title) {
    redirect(`${returnTo}?error=Title+is+required`)
  }

  try {
    await createImprovementTask({
      productId,
      contentDraftId,
      sourceType: sourceType as "recommendation" | "performance_insight" | "manual" | "quality_check",
      priority: priority as "low" | "medium" | "high" | "critical",
      title,
      description,
      suggestedAction,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create task"
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`)
  }

  redirect(`${returnTo}?queued=1`)
}
