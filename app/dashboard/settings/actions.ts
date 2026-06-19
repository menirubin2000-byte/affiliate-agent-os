"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  resetPublishingSchedulePolicySettings,
  savePublishingSchedulePolicySettings,
  type PublishingSchedulePolicyFormValues,
} from "@/lib/publishing-schedule-policy-db"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import type { CampaignPlatform } from "@/types/campaign-workflow"

const platformFields: Array<[CampaignPlatform, string]> = [
  ["linkedin", "target_linkedin"],
  ["facebook_page", "target_facebook_page"],
  ["instagram_professional", "target_instagram_professional"],
  ["medium", "target_medium"],
  ["substack", "target_substack"],
  ["tiktok", "target_tiktok"],
  ["reddit", "target_reddit"],
  ["quora", "target_quora"],
]

function fail(reason: string): never {
  redirect(`/dashboard/settings?mode=edit&error=${encodeURIComponent(reason)}`)
}

function requireSupabase() {
  if (!isSupabaseConfigured()) fail("Supabase is not configured, so settings cannot be saved.")
}

function requireMeniConfirmation(formData: FormData) {
  const confirmation = String(formData.get("meni_confirmation") ?? "").trim()
  if (confirmation !== "MENI_CONFIRM") fail("Saving policy settings requires MENI_CONFIRM.")
}

function readRequiredInteger(formData: FormData, key: string) {
  const value = Number(String(formData.get(key) ?? "").trim())
  if (!Number.isInteger(value)) throw new Error(`${key} must be a whole number.`)
  return value
}

function readPolicyValues(formData: FormData): PublishingSchedulePolicyFormValues {
  const platformDailyTargets: PublishingSchedulePolicyFormValues["platformDailyTargets"] = {}
  for (const [platform, key] of platformFields) {
    platformDailyTargets[platform] = readRequiredInteger(formData, key)
  }

  return {
    defaultDailyTarget: readRequiredInteger(formData, "default_daily_target"),
    samePlatformGapMinutes: readRequiredInteger(formData, "same_platform_gap_minutes"),
    globalGapMinutes: readRequiredInteger(formData, "global_gap_minutes"),
    youtubeTarget: readRequiredInteger(formData, "youtube_target"),
    pinterestTargetMin: readRequiredInteger(formData, "pinterest_target_min"),
    pinterestTargetMax: readRequiredInteger(formData, "pinterest_target_max"),
    xTwitterTargetMin: readRequiredInteger(formData, "x_twitter_target_min"),
    xTwitterTargetMax: readRequiredInteger(formData, "x_twitter_target_max"),
    mediumSubstackDailyCap: readRequiredInteger(formData, "medium_substack_daily_cap"),
    redditQuoraManualOnly: formData.get("reddit_quora_manual_only") === "on",
    mediumManualBrowserOnly: formData.get("medium_manual_browser_only") === "on",
    notes: String(formData.get("notes") ?? ""),
    platformDailyTargets,
  }
}

export async function savePublishingPolicySettingsAction(formData: FormData) {
  requireSupabase()
  requireMeniConfirmation(formData)

  try {
    await savePublishingSchedulePolicySettings(readPolicyValues(formData))
  } catch (error) {
    fail(error instanceof Error ? error.message : "Unable to save publishing policy settings.")
  }

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard/command-center")
  revalidatePath("/dashboard/he/schedule")
  redirect("/dashboard/settings?saved=1")
}

export async function resetPublishingPolicySettingsAction(formData: FormData) {
  requireSupabase()
  requireMeniConfirmation(formData)

  try {
    await resetPublishingSchedulePolicySettings()
  } catch (error) {
    fail(error instanceof Error ? error.message : "Unable to reset publishing policy settings.")
  }

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard/command-center")
  revalidatePath("/dashboard/he/schedule")
  redirect("/dashboard/settings?reset=1")
}
