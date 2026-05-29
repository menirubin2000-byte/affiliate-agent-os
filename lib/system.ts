import {
  getAccessGateReadiness,
  getAiReadiness,
  getSystemReadiness,
  isDeployedRuntime,
  isLiveAiConfigured,
} from "@/lib/env"
import { getServiceRoleSupabase } from "@/lib/supabase/server"
import { getDashboardSummary, getPerformanceSummary, getRecommendationSummary } from "@/lib/db"
import type {
  DemoDataStatus,
  IntegrationStatusDetail,
  LaunchChecklist,
  LaunchChecklistStatus,
  LaunchChecklistStep,
  OnboardingChecklist,
  OnboardingStep,
  OnboardingStepStatus,
  OperatorExperience,
  OperatorModeSummary,
  SystemStatus,
  TrialProgress,
  TrialHandoff,
  VerificationChecklist,
} from "@/types/system"

async function getSupabaseStatus() {
  const readiness = getSystemReadiness().integrations.find((item) => item.name === "supabase")!

  if (readiness.status !== "configured") {
    return {
      ...readiness,
      checkStatus: "blocked",
      checkMessage: readiness.guidance,
    } satisfies IntegrationStatusDetail
  }

  try {
    const client = getServiceRoleSupabase()
    const { error } = await client
      .from("products")
      .select("id", { head: true, count: "exact" })
      .limit(1)

    if (error) {
      return {
        ...readiness,
        checkStatus: "error",
        checkMessage: `Supabase responded, but the products table check failed: ${error.message}`,
      } satisfies IntegrationStatusDetail
    }

    return {
      ...readiness,
      checkStatus: "ready",
      checkMessage: "Supabase credentials are configured and the products table is reachable.",
    } satisfies IntegrationStatusDetail
  } catch (error) {
    return {
      ...readiness,
      checkStatus: "error",
      checkMessage:
        error instanceof Error
          ? `Supabase check failed: ${error.message}`
          : "Supabase check failed for an unknown reason.",
    } satisfies IntegrationStatusDetail
  }
}

async function getWordPressStatus() {
  const readiness = getSystemReadiness().integrations.find((item) => item.name === "wordpress")!

  if (readiness.status !== "configured") {
    return {
      ...readiness,
      checkStatus: "fallback",
      checkMessage: "WordPress is optional and not connected. The core workflow does not require it.",
    } satisfies IntegrationStatusDetail
  }

  const baseUrl = process.env.WORDPRESS_BASE_URL!.trim().replace(/\/+$/, "")
  const username = process.env.WORDPRESS_USERNAME!.trim()
  const appPassword = process.env.WORDPRESS_APP_PASSWORD!.trim()
  const authToken = Buffer.from(`${username}:${appPassword}`, "utf8").toString("base64")

  try {
    const response = await fetch(`${baseUrl}/wp-json/wp/v2/users/me?context=edit`, {
      headers: {
        Authorization: `Basic ${authToken}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      return {
        ...readiness,
        checkStatus: "ready",
        checkMessage: "WordPress credentials are valid for authenticated API access.",
      } satisfies IntegrationStatusDetail
    }

    if (response.status === 401 || response.status === 403) {
      return {
        ...readiness,
        checkStatus: "error",
        checkMessage:
          "WordPress responded, but the configured credentials were rejected. Verify the username and Application Password.",
      } satisfies IntegrationStatusDetail
    }

    return {
      ...readiness,
      checkStatus: "error",
      checkMessage: `WordPress readiness check failed with HTTP ${response.status}.`,
    } satisfies IntegrationStatusDetail
  } catch (error) {
    return {
      ...readiness,
      checkStatus: "error",
      checkMessage:
        error instanceof Error
          ? `WordPress check failed: ${error.message}`
          : "WordPress check failed for an unknown reason.",
    } satisfies IntegrationStatusDetail
  }
}

function getAiStatus() {
  const readiness = getAiReadiness()

  if (isLiveAiConfigured()) {
    return {
      ...readiness,
      checkStatus: "ready",
      checkMessage:
        "Optional live in-app AI generation is configured. Claude Code assisted and manual draft workflows remain available.",
    } satisfies IntegrationStatusDetail
  }

  return {
    ...readiness,
    checkStatus: "fallback",
    checkMessage:
      "Content generation mode: Claude Code assisted / fallback mode. Missing AI API keys do not block staging readiness.",
  } satisfies IntegrationStatusDetail
}

function getAccessGateStatus() {
  const readiness = getAccessGateReadiness()

  if (readiness.status === "configured") {
    return {
      ...readiness,
      checkStatus: "ready",
      checkMessage:
        "Dashboard routes are protected by a signed, httpOnly single-operator session cookie.",
    } satisfies IntegrationStatusDetail
  }

  return {
    ...readiness,
    checkStatus: isDeployedRuntime() ? "blocked" : "fallback",
    checkMessage:
      isDeployedRuntime()
        ? "Production deployments must set APP_ACCESS_PASSWORD and APP_SESSION_SECRET before dashboard access is allowed."
        : "Local development can continue, but set APP_ACCESS_PASSWORD and APP_SESSION_SECRET before any hosted deployment.",
  } satisfies IntegrationStatusDetail
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const summary = getSystemReadiness()
  const [supabase, wordpress] = await Promise.all([
    getSupabaseStatus(),
    getWordPressStatus(),
  ])
  const ai = getAiStatus()
  const accessGate = getAccessGateStatus()

  return {
    integrations: [supabase, accessGate, ai, wordpress],
    configuredCount: summary.configuredCount,
    blockingCount: summary.blockingCount,
  }
}

async function getDemoDataStatus(systemStatus: SystemStatus): Promise<DemoDataStatus> {
  const supabase = systemStatus.integrations.find((item) => item.name === "supabase")

  if (!supabase || supabase.checkStatus !== "ready") {
    return {
      isLoaded: false,
      productCount: 0,
      draftCount: 0,
      publishingJobCount: 0,
      performanceRecordCount: 0,
      title: "No demo data detected",
      description:
        "Demo data can only be checked after Supabase is configured and reachable.",
      actionLabel: "Review system checks",
      actionHref: "/dashboard/system",
    }
  }

  try {
    const client = getServiceRoleSupabase()
    const [productsResult, draftsResult, jobsResult, performanceResult] = await Promise.all([
      client
        .from("products")
        .select("id", { count: "exact", head: true })
        .or("slug.like.demo-*,notes.ilike.*[demo-seed]*"),
      client
        .from("content_drafts")
        .select("id", { count: "exact", head: true })
        .or("title.ilike.*[demo-seed]*,body.ilike.*[demo-seed]*"),
      client
        .from("publishing_jobs")
        .select("id", { count: "exact", head: true })
        .or("wordpress_post_id.ilike.demo-*,error_message.ilike.*[demo-seed]*"),
      client
        .from("performance_metrics")
        .select("id", { count: "exact", head: true })
        .or("campaign_name.ilike.demo-*,notes.ilike.*[demo-seed]*"),
    ])

    const productCount = productsResult.count ?? 0
    const draftCount = draftsResult.count ?? 0
    const publishingJobCount = jobsResult.count ?? 0
    const performanceRecordCount = performanceResult.count ?? 0
    const isLoaded =
      productCount + draftCount + publishingJobCount + performanceRecordCount > 0

    return {
      isLoaded,
      productCount,
      draftCount,
      publishingJobCount,
      performanceRecordCount,
      title: isLoaded ? "Demo data detected" : "No demo data detected",
      description: isLoaded
        ? "Seeded demo records are present. Treat the current dataset as demo or staging data until you remove or replace it."
        : "No seeded demo records were detected in the current Supabase project.",
      actionLabel: isLoaded ? "Use staging checklist" : "Review seed instructions",
      actionHref: "/dashboard/system",
    }
  } catch {
    return {
      isLoaded: false,
      productCount: 0,
      draftCount: 0,
      publishingJobCount: 0,
      performanceRecordCount: 0,
      title: "Demo data check unavailable",
      description:
        "The app could not verify whether demo data is present in the current Supabase project.",
      actionLabel: "Review system checks",
      actionHref: "/dashboard/system",
    }
  }
}

function createOnboardingStep(params: {
  id: string
  title: string
  description: string
  status: OnboardingStepStatus
  actionLabel: string
  actionHref: string
  detail: string
}): OnboardingStep {
  return params
}

function createLaunchStep(params: {
  id: string
  title: string
  description: string
  status: LaunchChecklistStatus
  actionLabel: string
  actionHref: string
  detail: string
}): LaunchChecklistStep {
  return params
}

export function buildOnboardingChecklist(params: {
  systemStatus: SystemStatus
  totalProducts: number
  totalDrafts: number
  approvedDrafts: number
  totalPublishingJobs: number
  totalPerformanceRecords: number
}): OnboardingChecklist {
  const supabase = params.systemStatus.integrations.find((item) => item.name === "supabase")!
  const wordpress = params.systemStatus.integrations.find((item) => item.name === "wordpress")!

  const supabaseConfigured = supabase.checkStatus === "ready" || supabase.status === "configured"

  const environmentStatus: OnboardingStepStatus =
    supabaseConfigured
      ? "complete"
      : params.systemStatus.configuredCount > 0
        ? "in_progress"
        : "blocked"

  const migrationsStatus: OnboardingStepStatus =
    supabase.checkStatus === "ready"
      ? "complete"
      : supabase.checkStatus === "blocked"
        ? "blocked"
        : "in_progress"

  const firstProductStatus: OnboardingStepStatus =
    params.totalProducts > 0
      ? "complete"
      : supabase.checkStatus === "ready"
        ? "not_started"
        : "blocked"

  const firstDraftStatus: OnboardingStepStatus =
    params.totalDrafts > 0
      ? "complete"
      : params.totalProducts > 0
        ? "in_progress"
        : supabase.checkStatus === "ready"
          ? "blocked"
          : "blocked"

  const firstApprovalStatus: OnboardingStepStatus =
    params.approvedDrafts > 0
      ? "complete"
      : params.totalDrafts > 0
        ? "in_progress"
        : "blocked"

  const firstWordPressStatus: OnboardingStepStatus =
    params.totalPublishingJobs > 0
      ? "complete"
      : wordpress.checkStatus === "ready" && params.approvedDrafts > 0
        ? "in_progress"
        : "not_started"

  const firstPerformanceStatus: OnboardingStepStatus =
    params.totalPerformanceRecords > 0
      ? "complete"
      : params.totalProducts > 0
        ? "in_progress"
        : "blocked"

  const steps = [
    createOnboardingStep({
      id: "configure_environment",
      title: "Configure environment values",
      description: "Set the required Supabase environment keys. AI API keys and WordPress are optional.",
      status: environmentStatus,
      actionLabel: "Open system checks",
      actionHref: "/dashboard/system",
      detail:
        environmentStatus === "complete"
          ? "Required Supabase values are present. WordPress and AI keys are optional."
          : "Use the system page to see what is missing, placeholder, or still blocked.",
    }),
    createOnboardingStep({
      id: "apply_migrations",
      title: "Apply Supabase migrations",
      description: "Confirm the database schema is available before writing products or drafts.",
      status: migrationsStatus,
      actionLabel: "Review setup checklist",
      actionHref: "/dashboard/system",
      detail:
        migrationsStatus === "complete"
          ? "Supabase is reachable and the products table check succeeded."
          : "Until Supabase is reachable, product and draft persistence will stay blocked.",
    }),
    createOnboardingStep({
      id: "add_first_product",
      title: "Add first product",
      description: "Create the first affiliate product to start the workflow.",
      status: firstProductStatus,
      actionLabel: "Add first product",
      actionHref: "/dashboard/products/new",
      detail:
        firstProductStatus === "complete"
          ? `${params.totalProducts} product record(s) exist in Supabase.`
          : "No products have been added yet.",
    }),
    createOnboardingStep({
      id: "generate_first_draft",
      title: "Create first draft",
      description: "Use Claude Code, manual entry, or the fallback generator to create the first draft.",
      status: firstDraftStatus,
      actionLabel: "Create manual draft",
      actionHref: "/dashboard/drafts/new",
      detail:
        params.totalDrafts > 0
          ? `${params.totalDrafts} draft(s) already exist.`
          : "Create content with Claude Code, the manual draft form, or the fallback test generator.",
    }),
    createOnboardingStep({
      id: "approve_first_draft",
      title: "Approve first draft",
      description: "Review generated content and manually approve the first draft.",
      status: firstApprovalStatus,
      actionLabel: "Review drafts",
      actionHref: "/dashboard/drafts",
      detail:
        params.approvedDrafts > 0
          ? `${params.approvedDrafts} approved draft(s) are available.`
          : params.totalDrafts > 0
            ? "Drafts exist, but none have been approved yet."
            : "You need at least one generated draft before approval can start.",
    }),
    createOnboardingStep({
      id: "queue_first_wordpress_draft",
      title: "Queue first WordPress draft (optional)",
      description: "Optional: send an approved draft to WordPress as a draft post. WordPress is not required.",
      status: firstWordPressStatus,
      actionLabel: "Open publishing queue",
      actionHref: "/dashboard/publishing",
      detail:
        params.totalPublishingJobs > 0
          ? `${params.totalPublishingJobs} WordPress queue job(s) already exist.`
          : wordpress.checkStatus === "ready"
            ? "WordPress is connected. Queue an approved draft when ready."
            : "WordPress is not connected. This step is optional — skip it to continue.",
    }),
    createOnboardingStep({
      id: "record_first_performance",
      title: "Add first performance record",
      description: "Capture the first manual clicks, conversions, or revenue record.",
      status: firstPerformanceStatus,
      actionLabel: "Record performance",
      actionHref: "/dashboard/performance",
      detail:
        params.totalPerformanceRecords > 0
          ? `${params.totalPerformanceRecords} performance record(s) exist.`
          : "No performance data has been recorded yet.",
    }),
  ]

  return {
    steps,
    completedCount: steps.filter((step) => step.status === "complete").length,
    totalCount: steps.length,
    blockingCount: steps.filter((step) => step.status === "blocked").length,
  }
}

export function buildVerificationChecklist(params: {
  systemStatus: SystemStatus
  totalProducts: number
  totalDrafts: number
  approvedDrafts: number
  totalPublishingJobs: number
  totalPerformanceRecords: number
  totalRecommendations: number
  demoData: DemoDataStatus
}): VerificationChecklist {
  const supabase = params.systemStatus.integrations.find((item) => item.name === "supabase")!
  const wordpress = params.systemStatus.integrations.find((item) => item.name === "wordpress")!
  const hasRealEnvironment = params.systemStatus.blockingCount === 0

  const steps = [
    createOnboardingStep({
      id: "verify_env_configured",
      title: "Environment configured",
      description: "Confirm required Supabase keys are present. WordPress and AI API keys are optional.",
      status: hasRealEnvironment ? "complete" : params.systemStatus.configuredCount > 0 ? "in_progress" : "blocked",
      actionLabel: "Open system checks",
      actionHref: "/dashboard/system",
      detail: hasRealEnvironment
        ? "Required Supabase credentials are configured. Content generation runs through Claude Code/manual mode. WordPress is optional."
        : "Supabase credentials still need real values or a valid connection check.",
    }),
    createOnboardingStep({
      id: "verify_migrations_applied",
      title: "Migrations applied",
      description: "Confirm the Supabase schema is available for live writes.",
      status: supabase.checkStatus === "ready" ? "complete" : supabase.checkStatus === "error" ? "in_progress" : "blocked",
      actionLabel: "Review migration steps",
      actionHref: "/dashboard/system",
      detail: supabase.checkStatus === "ready"
        ? "Supabase is reachable and the products table responded."
        : "Run migrations before relying on live product, draft, and performance writes.",
    }),
    createOnboardingStep({
      id: "verify_supabase_connected",
      title: "Supabase connected",
      description: "Exercise the live Supabase-backed product workflow.",
      status: params.totalProducts > 0 ? "complete" : supabase.checkStatus === "ready" ? "in_progress" : "blocked",
      actionLabel: "Add first product",
      actionHref: "/dashboard/products/new",
      detail: params.totalProducts > 0
        ? `${params.totalProducts} product record(s) are available in the current project.`
        : "No product record has been created in the current dataset yet.",
    }),
    createOnboardingStep({
      id: "verify_ai_generation",
      title: "Content draft created",
      description: "Create a draft through Claude Code/manual entry or the fallback test generator.",
      status: params.totalDrafts > 0
        ? "complete"
        : params.demoData.isLoaded
          ? "in_progress"
          : params.totalProducts > 0
            ? "in_progress"
            : "blocked",
      actionLabel: "Create manual draft",
      actionHref: "/dashboard/drafts/new",
      detail:
        params.totalDrafts > 0
          ? `${params.totalDrafts} draft record(s) exist.`
          : "Create a product, then use Claude Code or the manual form to create a draft.",
    }),
    createOnboardingStep({
      id: "verify_approval",
      title: "Approval tested",
      description: "Approve at least one draft through the human review flow.",
      status: params.approvedDrafts > 0 ? "complete" : params.totalDrafts > 0 ? "in_progress" : "blocked",
      actionLabel: "Review drafts",
      actionHref: "/dashboard/drafts",
      detail:
        params.approvedDrafts > 0
          ? `${params.approvedDrafts} approved draft(s) are available.`
          : "No approved draft exists yet in the current dataset.",
    }),
    createOnboardingStep({
      id: "verify_wordpress_queue",
      title: "WordPress draft queue tested (optional)",
      description: "Optional: send an approved draft to WordPress draft mode on a test site. WordPress is not required.",
      status: wordpress.checkStatus === "ready" && params.totalPublishingJobs > 0
        ? "complete"
        : wordpress.checkStatus === "ready" && params.approvedDrafts > 0
          ? "in_progress"
          : "not_started",
      actionLabel: "Open publishing queue",
      actionHref: "/dashboard/publishing",
      detail:
        wordpress.checkStatus === "ready" && params.totalPublishingJobs > 0
          ? `${params.totalPublishingJobs} publishing job(s) exist in the current dataset.`
          : "WordPress is optional. Skip this step if you are not connecting WordPress.",
    }),
    createOnboardingStep({
      id: "verify_performance_record",
      title: "Performance record tested",
      description: "Create at least one manual performance record.",
      status: params.totalPerformanceRecords > 0 ? "complete" : params.totalProducts > 0 ? "in_progress" : "blocked",
      actionLabel: "Record performance",
      actionHref: "/dashboard/performance#record-performance",
      detail:
        params.totalPerformanceRecords > 0
          ? `${params.totalPerformanceRecords} performance record(s) exist.`
          : "No performance record exists yet in the current dataset.",
    }),
    createOnboardingStep({
      id: "verify_recommendations_visible",
      title: "Recommendations visible",
      description: "Confirm the recommendations layer has enough live or demo data to surface guidance.",
      status: params.totalRecommendations > 0 ? "complete" : params.totalDrafts > 0 || params.totalPerformanceRecords > 0 ? "in_progress" : "blocked",
      actionLabel: "Open dashboard",
      actionHref: "/dashboard",
      detail:
        params.totalRecommendations > 0
          ? `${params.totalRecommendations} recommendation(s) are visible.`
          : "Add more workflow and performance data before expecting recommendation coverage.",
    }),
  ]

  return {
    steps,
    completedCount: steps.filter((step) => step.status === "complete").length,
    totalCount: steps.length,
    blockingCount: steps.filter((step) => step.status === "blocked").length,
  }
}

export function buildLaunchChecklist(params: {
  systemStatus: SystemStatus
  totalProducts: number
  totalDrafts: number
  approvedDrafts: number
  totalPublishingJobs: number
  totalPerformanceRecords: number
  totalRecommendations: number
  demoData: DemoDataStatus
}): LaunchChecklist {
  const supabase = params.systemStatus.integrations.find((item) => item.name === "supabase")!
  const wordpress = params.systemStatus.integrations.find((item) => item.name === "wordpress")!
  const envConfigured = params.systemStatus.blockingCount === 0
  const supabaseReady = supabase.checkStatus === "ready"
  const wordpressReady = wordpress.checkStatus === "ready"

  const steps = [
    createLaunchStep({
      id: "launch_env_values",
      title: "Env values added",
      description: "Required Supabase values are present. WordPress and AI API keys are optional.",
      status: envConfigured ? "complete" : "blocked",
      actionLabel: "Open system checks",
      actionHref: "/dashboard/system",
      detail: envConfigured
        ? "Supabase is configured. Claude Code assisted content mode is available. WordPress is optional."
        : "Supabase credentials still need real values.",
    }),
    createLaunchStep({
      id: "launch_supabase_reachable",
      title: "Supabase reachable",
      description: "The app can reach Supabase through the server-side client.",
      status: supabaseReady ? "complete" : "blocked",
      actionLabel: "Review Supabase setup",
      actionHref: "/dashboard/system",
      detail: supabaseReady
        ? "Supabase is reachable from the app."
        : "Supabase must be reachable before the first staging workflow can run.",
    }),
    createLaunchStep({
      id: "launch_migrations_applied",
      title: "Migrations applied",
      description: "The current database schema is available for products, drafts, queue jobs, and performance records.",
      status: supabaseReady ? "complete" : "blocked",
      actionLabel: "Review migration steps",
      actionHref: "/dashboard/system",
      detail: supabaseReady
        ? "The products table check succeeded, which confirms the base schema is reachable."
        : "Apply migrations 001 through 004 before testing live writes.",
    }),
    createLaunchStep({
      id: "launch_demo_seed_status",
      title: "Demo seed status reviewed",
      description: "Demo records are either absent or intentionally understood before trial data is evaluated.",
      status: params.demoData.isLoaded ? "blocked" : supabaseReady ? "complete" : "not_started",
      actionLabel: "Review seed guidance",
      actionHref: "/dashboard/system",
      detail: params.demoData.isLoaded
        ? "Demo data is present. Remove it before treating this as a real staging trial dataset."
        : supabaseReady
          ? "No seeded demo records were detected."
          : "Demo status can be checked after Supabase is reachable.",
    }),
    createLaunchStep({
      id: "launch_first_product",
      title: "First product created",
      description: "At least one product exists in Supabase.",
      status: params.totalProducts > 0 ? "complete" : supabaseReady ? "ready" : "blocked",
      actionLabel: "Add product",
      actionHref: "/dashboard/products/new",
      detail:
        params.totalProducts > 0
          ? `${params.totalProducts} product record(s) exist.`
          : "Create one real product to start the trial workflow.",
    }),
    createLaunchStep({
      id: "launch_first_draft",
      title: "First draft created",
      description: "At least one manual, Claude Code assisted, or fallback draft exists for operator review.",
      status: params.totalDrafts > 0 ? "complete" : params.totalProducts > 0 ? "ready" : "blocked",
      actionLabel: "Generate draft",
      actionHref: "/dashboard/drafts/new",
      detail:
        params.totalDrafts > 0
          ? `${params.totalDrafts} draft record(s) exist.`
          : params.totalProducts > 0
            ? "Create a manual draft from Claude Code output, or use the fallback generator from the products page."
            : "Create a product before generating drafts.",
    }),
    createLaunchStep({
      id: "launch_first_approval",
      title: "First draft approved",
      description: "At least one draft has passed human review.",
      status: params.approvedDrafts > 0 ? "complete" : params.totalDrafts > 0 ? "ready" : "blocked",
      actionLabel: "Review drafts",
      actionHref: "/dashboard/drafts",
      detail:
        params.approvedDrafts > 0
          ? `${params.approvedDrafts} approved draft(s) exist.`
          : params.totalDrafts > 0
            ? "Approve one draft manually after review."
            : "Generate a draft before approval can start.",
    }),
    createLaunchStep({
      id: "launch_wordpress_queue",
      title: "First WordPress draft queued (optional)",
      description: "Optional: send an approved draft to WordPress draft mode. WordPress is not required.",
      status:
        params.totalPublishingJobs > 0
          ? "complete"
          : params.approvedDrafts > 0 && wordpressReady
            ? "ready"
            : "not_started",
      actionLabel: "Open publishing queue",
      actionHref: "/dashboard/publishing",
      detail:
        params.totalPublishingJobs > 0
          ? `${params.totalPublishingJobs} WordPress queue job(s) exist.`
          : wordpressReady
            ? "WordPress is connected. Queue an approved draft when ready."
            : "WordPress is not connected. This step is optional — skip it.",
    }),
    createLaunchStep({
      id: "launch_performance_record",
      title: "First performance record added",
      description: "At least one manual performance outcome has been recorded.",
      status:
        params.totalPerformanceRecords > 0
          ? "complete"
          : params.totalProducts > 0
            ? "ready"
            : "blocked",
      actionLabel: "Record performance",
      actionHref: "/dashboard/performance#record-performance",
      detail:
        params.totalPerformanceRecords > 0
          ? `${params.totalPerformanceRecords} performance record(s) exist.`
          : "Add one manual record after the first staged content check.",
    }),
    createLaunchStep({
      id: "launch_recommendations_visible",
      title: "Recommendations visible",
      description: "The advisory layer has enough data to surface workflow guidance.",
      status:
        params.totalRecommendations > 0
          ? "complete"
          : params.totalDrafts > 0 || params.totalPerformanceRecords > 0
            ? "ready"
            : "blocked",
      actionLabel: "View recommendations",
      actionHref: "/dashboard",
      detail:
        params.totalRecommendations > 0
          ? `${params.totalRecommendations} recommendation(s) are visible.`
          : "More workflow data may be needed before recommendations appear.",
    }),
  ]

  return {
    steps,
    completedCount: steps.filter((step) => step.status === "complete").length,
    readyCount: steps.filter((step) => step.status === "ready").length,
    totalCount: steps.length,
    blockingCount: steps.filter((step) => step.status === "blocked").length,
  }
}

export function buildTrialProgress(launchChecklist: LaunchChecklist): TrialProgress {
  const workflowStepIds = new Set([
    "launch_first_product",
    "launch_first_draft",
    "launch_first_approval",
    "launch_performance_record",
  ])
  const workflowSteps = launchChecklist.steps.filter((step) => workflowStepIds.has(step.id))
  const completedWorkflowSteps = workflowSteps.filter((step) => step.status === "complete").length
  const nextStep =
    launchChecklist.steps.find((step) => step.status === "ready") ??
    launchChecklist.steps.find((step) => step.status === "blocked") ??
    launchChecklist.steps.find((step) => step.status === "not_started")

  return {
    completedWorkflowSteps,
    totalWorkflowSteps: workflowSteps.length,
    percentComplete:
      workflowSteps.length > 0
        ? Math.round((completedWorkflowSteps / workflowSteps.length) * 100)
        : 0,
    nextActionLabel: nextStep?.actionLabel ?? "Open dashboard",
    nextActionHref: nextStep?.actionHref ?? "/dashboard",
    summary:
      completedWorkflowSteps === workflowSteps.length
        ? "The first staging workflow has completed its core persisted steps."
        : `${completedWorkflowSteps} of ${workflowSteps.length} core workflow steps are complete.`,
  }
}

export function buildOperatorModeSummary(systemStatus: SystemStatus): OperatorModeSummary {
  const supabase = systemStatus.integrations.find((item) => item.name === "supabase")!

  if (supabase.checkStatus !== "ready") {
    return {
      mode: "setup",
      title: "Setup mode",
      description:
        "Supabase is not fully ready yet, so the app can render but core persistence is still blocked.",
      actionLabel: "Finish setup",
      actionHref: "/dashboard/system",
    }
  }

  return {
    mode: "ready",
    title: "Operator-ready",
    description:
      "Supabase and Claude Code assisted content flows are ready. WordPress is optional and can be connected later.",
    actionLabel: "Open system checks",
    actionHref: "/dashboard/system",
  }
}

export function buildTrialHandoff(params: {
  systemStatus: SystemStatus
  verificationChecklist: VerificationChecklist
  demoData: DemoDataStatus
}): TrialHandoff {
  const ready =
    params.systemStatus.blockingCount === 0 &&
    params.verificationChecklist.blockingCount === 0 &&
    !params.demoData.isLoaded

  return {
    ready,
    title: ready ? "Ready for staged trial" : "Not ready for staged trial yet",
    description: ready
      ? "Core integrations are configured and the checklist no longer shows blocked verification steps."
      : params.demoData.isLoaded
        ? "Demo data is still present or key verification steps are still blocked. Use a staging dataset or remove demo records before a real trial."
        : "Finish the remaining blocked verification steps before treating this environment as trial-ready.",
    actionLabel: ready ? "Run trial workflow" : "Review trial checklist",
    actionHref: "/dashboard/system",
    testOrder: [
      "Confirm Supabase environment values and migrations.",
      "Create or verify a real product record in Supabase.",
      "Create a draft using Claude Code, manual entry, or the fallback test generator.",
      "Approve one draft through the review flow.",
      "Record one manual performance entry.",
      "Review dashboard recommendations and workflow status surfaces.",
      "(Optional) Connect WordPress and queue one approved draft as a draft post.",
    ],
    stagingNotes: [
      "WordPress is optional and not connected by default. Connect it only when you have a test site ready.",
      "Do not treat seeded demo data as production-like truth. Replace or remove it before evaluating real outcomes.",
      "Claude Code assisted and manual draft creation are the current content workflow. Live AI API keys are optional.",
    ],
  }
}

export async function getOperatorExperience(): Promise<OperatorExperience> {
  const systemStatus = await getSystemStatus()
  const blockers: string[] = []

  let totalProducts = 0
  let totalDrafts = 0
  let approvedDrafts = 0
  let totalPublishingJobs = 0
  let totalPerformanceRecords = 0
  let totalRecommendations = 0
  const demoData = await getDemoDataStatus(systemStatus)

  if (systemStatus.integrations.find((item) => item.name === "supabase")?.checkStatus === "ready") {
    try {
      const [dashboardSummary, performanceSummary, recommendationSummary] = await Promise.all([
        getDashboardSummary(),
        getPerformanceSummary(),
        getRecommendationSummary(),
      ])

      totalProducts = dashboardSummary.totalProducts
      totalDrafts = dashboardSummary.totalDrafts
      approvedDrafts = dashboardSummary.draftsByStatus.approved
      totalPublishingJobs = dashboardSummary.totalPublishingJobs
      totalPerformanceRecords = performanceSummary.totalRecords
      totalRecommendations = recommendationSummary.total
    } catch (error) {
      blockers.push(
        error instanceof Error
          ? `Supabase workflow data: ${error.message}`
          : "Supabase workflow data could not be loaded.",
      )
    }
  }

  const checklist = buildOnboardingChecklist({
    systemStatus,
    totalProducts,
    totalDrafts,
    approvedDrafts,
    totalPublishingJobs,
    totalPerformanceRecords,
  })
  const verificationChecklist = buildVerificationChecklist({
    systemStatus,
    totalProducts,
    totalDrafts,
    approvedDrafts,
    totalPublishingJobs,
    totalPerformanceRecords,
    totalRecommendations,
    demoData,
  })
  const trialHandoff = buildTrialHandoff({
    systemStatus,
    verificationChecklist,
    demoData,
  })
  const launchChecklist = buildLaunchChecklist({
    systemStatus,
    totalProducts,
    totalDrafts,
    approvedDrafts,
    totalPublishingJobs,
    totalPerformanceRecords,
    totalRecommendations,
    demoData,
  })
  const trialProgress = buildTrialProgress(launchChecklist)

  blockers.push(
    ...(demoData.isLoaded
      ? [
          "Demo data: Seeded demo records are present. Remove or replace them before treating this environment as a real trial dataset.",
        ]
      : []),
    ...systemStatus.integrations
      .filter((integration) => integration.checkStatus === "blocked" || integration.checkStatus === "error")
      .map((integration) => `${integration.label}: ${integration.checkMessage}`),
    ...checklist.steps
      .filter((step) => step.status === "blocked")
      .slice(0, 3)
      .map((step) => `${step.title}: ${step.detail}`),
    ...verificationChecklist.steps
      .filter((step) => step.status === "blocked")
      .slice(0, 3)
      .map((step) => `${step.title}: ${step.detail}`),
  )

  return {
    systemStatus,
    checklist,
    verificationChecklist,
    launchChecklist,
    trialProgress,
    demoData,
    trialHandoff,
    blockers,
    mode: buildOperatorModeSummary(systemStatus),
  }
}
