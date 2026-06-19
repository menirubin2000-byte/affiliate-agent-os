import {
  DEFAULT_PLATFORM_DAILY_TARGETS,
  PUBLISHING_SCHEDULE_POLICY,
  type PublishingSchedulePolicy,
} from "@/lib/publishing-schedule-policy"
import { getServiceRoleSupabase, isSupabaseConfigured } from "@/lib/supabase/server"
import type { CampaignPlatform } from "@/types/campaign-workflow"

const SETTINGS_ID = true

type PolicySettingsRow = {
  version: string
  default_daily_target: number
  platform_daily_targets: Partial<Record<CampaignPlatform, number>> | null
  same_platform_gap_minutes: number
  global_gap_minutes: number
  youtube_target: number
  pinterest_target_min: number
  pinterest_target_max: number
  x_twitter_target_min: number
  x_twitter_target_max: number
  medium_substack_daily_cap: number
  reddit_quora_manual_only: boolean
  medium_manual_browser_only: boolean
  notes: string
  no_publishing_without_meni_approval: boolean
  updated_at?: string
}

export type PublishingSchedulePolicyFormValues = {
  defaultDailyTarget: number
  samePlatformGapMinutes: number
  globalGapMinutes: number
  youtubeTarget: number
  pinterestTargetMin: number
  pinterestTargetMax: number
  xTwitterTargetMin: number
  xTwitterTargetMax: number
  mediumSubstackDailyCap: number
  redditQuoraManualOnly: boolean
  mediumManualBrowserOnly: boolean
  notes: string
  platformDailyTargets: Partial<Record<CampaignPlatform, number>>
}

export type PublishingSchedulePolicySettings = PublishingSchedulePolicy & {
  updatedAt: string | null
}

export function defaultPublishingSchedulePolicyValues(): PublishingSchedulePolicyFormValues {
  return {
    defaultDailyTarget: PUBLISHING_SCHEDULE_POLICY.minimumTargetPostsPerDayPerActivePlatform,
    samePlatformGapMinutes: PUBLISHING_SCHEDULE_POLICY.samePlatformMinimumGapMinutes,
    globalGapMinutes: PUBLISHING_SCHEDULE_POLICY.globalMinimumGapMinutes,
    youtubeTarget: PUBLISHING_SCHEDULE_POLICY.youtubeVideosPerDay,
    pinterestTargetMin: PUBLISHING_SCHEDULE_POLICY.pinterestPinsPerDay.min,
    pinterestTargetMax: PUBLISHING_SCHEDULE_POLICY.pinterestPinsPerDay.max,
    xTwitterTargetMin: PUBLISHING_SCHEDULE_POLICY.xTwitterPostsPerDay.min,
    xTwitterTargetMax: PUBLISHING_SCHEDULE_POLICY.xTwitterPostsPerDay.max,
    mediumSubstackDailyCap: PUBLISHING_SCHEDULE_POLICY.longFormDailyCapIfQualityDrops,
    redditQuoraManualOnly: PUBLISHING_SCHEDULE_POLICY.redditQuoraManualOnly,
    mediumManualBrowserOnly: PUBLISHING_SCHEDULE_POLICY.mediumManualBrowserOnly,
    notes: PUBLISHING_SCHEDULE_POLICY.notes,
    platformDailyTargets: { ...DEFAULT_PLATFORM_DAILY_TARGETS },
  }
}

export function buildPublishingSchedulePolicy(values: PublishingSchedulePolicyFormValues): PublishingSchedulePolicy {
  const platformDailyTargets = {
    ...DEFAULT_PLATFORM_DAILY_TARGETS,
    ...values.platformDailyTargets,
    youtube: values.youtubeTarget,
    pinterest: values.pinterestTargetMin,
    x_twitter: values.xTwitterTargetMin,
  }

  return {
    ...PUBLISHING_SCHEDULE_POLICY,
    version: `operator-${new Date().toISOString().slice(0, 10)}`,
    minimumTargetPostsPerDayPerActivePlatform: values.defaultDailyTarget,
    platformDailyTargets,
    samePlatformMinimumGapMinutes: values.samePlatformGapMinutes,
    globalMinimumGapMinutes: values.globalGapMinutes,
    pinterestPinsPerDay: {
      min: values.pinterestTargetMin,
      max: values.pinterestTargetMax,
    },
    xTwitterPostsPerDay: {
      min: values.xTwitterTargetMin,
      max: values.xTwitterTargetMax,
    },
    youtubeVideosPerDay: values.youtubeTarget,
    longFormDailyCapIfQualityDrops: values.mediumSubstackDailyCap,
    redditQuoraManualOnly: values.redditQuoraManualOnly,
    mediumManualBrowserOnly: values.mediumManualBrowserOnly,
    notes: values.notes.trim(),
    noPublishingWithoutMeniApproval: true,
  }
}

export function validatePublishingSchedulePolicyValues(values: PublishingSchedulePolicyFormValues): string[] {
  const errors: string[] = []
  const positiveFields: Array<[string, number]> = [
    ["default daily target", values.defaultDailyTarget],
    ["same-platform gap", values.samePlatformGapMinutes],
    ["global gap", values.globalGapMinutes],
    ["YouTube target", values.youtubeTarget],
    ["Pinterest min target", values.pinterestTargetMin],
    ["Pinterest max target", values.pinterestTargetMax],
    ["X/Twitter min target", values.xTwitterTargetMin],
    ["X/Twitter max target", values.xTwitterTargetMax],
    ["Medium/Substack cap", values.mediumSubstackDailyCap],
  ]

  for (const [label, value] of positiveFields) {
    if (!Number.isInteger(value) || value < 1) errors.push(`${label} must be a positive whole number.`)
  }

  for (const [platform, value] of Object.entries(values.platformDailyTargets)) {
    if (!Number.isInteger(value) || value < 0) errors.push(`${platform} target must be zero or a positive whole number.`)
  }

  if (values.pinterestTargetMin > values.pinterestTargetMax) {
    errors.push("Pinterest min target cannot be greater than Pinterest max target.")
  }

  if (values.xTwitterTargetMin > values.xTwitterTargetMax) {
    errors.push("X/Twitter min target cannot be greater than X/Twitter max target.")
  }

  if (!values.notes.trim()) errors.push("Notes/rules text is required.")
  if (values.notes.length > 4000) errors.push("Notes/rules text must stay under 4000 characters.")

  return errors
}

export async function getCurrentPublishingSchedulePolicy(): Promise<PublishingSchedulePolicySettings> {
  if (!isSupabaseConfigured()) return { ...PUBLISHING_SCHEDULE_POLICY, updatedAt: null }

  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("publishing_schedule_policy_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .maybeSingle()

  if (error?.message.includes("publishing_schedule_policy_settings")) {
    return { ...PUBLISHING_SCHEDULE_POLICY, updatedAt: null }
  }
  if (error) throw new Error(`Unable to load publishing policy settings: ${error.message}`)
  if (!data) return { ...PUBLISHING_SCHEDULE_POLICY, updatedAt: null }

  return mapRowToPolicy(data as PolicySettingsRow)
}

export async function savePublishingSchedulePolicySettings(values: PublishingSchedulePolicyFormValues) {
  const errors = validatePublishingSchedulePolicyValues(values)
  if (errors.length > 0) throw new Error(errors.join(" "))

  const policy = buildPublishingSchedulePolicy(values)
  const supabase = getServiceRoleSupabase()
  const { error } = await supabase
    .from("publishing_schedule_policy_settings")
    .upsert({
      id: SETTINGS_ID,
      version: policy.version,
      default_daily_target: policy.minimumTargetPostsPerDayPerActivePlatform,
      platform_daily_targets: policy.platformDailyTargets,
      same_platform_gap_minutes: policy.samePlatformMinimumGapMinutes,
      global_gap_minutes: policy.globalMinimumGapMinutes,
      youtube_target: policy.youtubeVideosPerDay,
      pinterest_target_min: policy.pinterestPinsPerDay.min,
      pinterest_target_max: policy.pinterestPinsPerDay.max,
      x_twitter_target_min: policy.xTwitterPostsPerDay.min,
      x_twitter_target_max: policy.xTwitterPostsPerDay.max,
      medium_substack_daily_cap: policy.longFormDailyCapIfQualityDrops,
      reddit_quora_manual_only: policy.redditQuoraManualOnly,
      medium_manual_browser_only: policy.mediumManualBrowserOnly,
      notes: policy.notes,
      no_publishing_without_meni_approval: true,
    }, { onConflict: "id" })

  if (error) throw new Error(`Unable to save publishing policy settings: ${error.message}`)
}

export async function resetPublishingSchedulePolicySettings() {
  await savePublishingSchedulePolicySettings(defaultPublishingSchedulePolicyValues())
}

function mapRowToPolicy(row: PolicySettingsRow): PublishingSchedulePolicySettings {
  const values: PublishingSchedulePolicyFormValues = {
    defaultDailyTarget: row.default_daily_target,
    samePlatformGapMinutes: row.same_platform_gap_minutes,
    globalGapMinutes: row.global_gap_minutes,
    youtubeTarget: row.youtube_target,
    pinterestTargetMin: row.pinterest_target_min,
    pinterestTargetMax: row.pinterest_target_max,
    xTwitterTargetMin: row.x_twitter_target_min,
    xTwitterTargetMax: row.x_twitter_target_max,
    mediumSubstackDailyCap: row.medium_substack_daily_cap,
    redditQuoraManualOnly: row.reddit_quora_manual_only,
    mediumManualBrowserOnly: row.medium_manual_browser_only,
    notes: row.notes,
    platformDailyTargets: row.platform_daily_targets ?? DEFAULT_PLATFORM_DAILY_TARGETS,
  }
  const policy = buildPublishingSchedulePolicy(values)

  return {
    ...policy,
    version: row.version,
    noPublishingWithoutMeniApproval: true,
    updatedAt: row.updated_at ?? null,
  }
}
