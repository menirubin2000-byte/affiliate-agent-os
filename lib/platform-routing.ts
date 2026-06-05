import type { CampaignPlatform } from "@/types/campaign-workflow"
import type { FinalCopyStatus, FinalCopyValidationStatus } from "@/types/content-review"
import type { PublishJobStatus } from "@/types/publish-job"

export type PlatformRoutingKey =
  | CampaignPlatform
  | "facebook_page"
  | "instagram_professional"
  | "pinterest"
  | "x_twitter"
  | "youtube"

export type PlatformRoutingStatus = "active" | "pending_setup" | "disabled"

export type PlatformPublishMode =
  | "official_api"
  | "browser_executor"
  | "manual_sensitive"
  | "blocked"

export interface PlatformRoutingDefinition {
  key: PlatformRoutingKey
  hebrewName: string
  englishName: string
  accountUrl: string | null
  contentType: string
  publishMode: PlatformPublishMode
  approvalRequired: boolean
  status: PlatformRoutingStatus
  directAffiliateLinksAllowed: boolean
  policySummary: string
  setupBlocker: string | null
}

export type PlatformRouteState =
  | "published_verified"
  | "ready_for_executor"
  | "pending_meni_approval"
  | "executor_blocked"
  | "policy_blocked"
  | "requires_auth"
  | "running"
  | "waiting_url_verification"
  | "needs_system_fix"
  | "missing_final_copy"
  | "missing_affiliate_link"
  | "platform_pending_setup"
  | "platform_disabled"

export interface RoutingProductInput {
  id: string
  name: string
  status: string
  category: string | null
  affiliateLink: string | null
  affiliateUrl: string | null
}

export interface RoutingAffiliateProgramInput {
  productId: string | null
  status: string
  affiliateLink: string | null
}

export interface RoutingFinalCopyInput {
  id: string
  productId: string
  platform: string
  status: FinalCopyStatus | string
  validationStatus: FinalCopyValidationStatus | string
  title: string | null
  blockingReasons: string[]
}

export interface RoutingPublishJobInput {
  id: string
  finalCopyId: string
  productId: string
  platform: string
  status: PublishJobStatus | string
  blockingReason: string | null
  liveUrl: string | null
  verifiedAt: string | null
}

export interface RoutingPublishedRecordInput {
  id: string
  finalCopyId: string | null
  productId: string
  platform: string
  liveUrl: string | null
  verificationStatus: string
  verifiedAt: string | null
}

export interface PlatformRoute {
  productId: string
  productName: string
  platform: PlatformRoutingDefinition
  state: PlatformRouteState
  labelHe: string
  blocker: string | null
  finalCopyId: string | null
  finalCopyTitle: string | null
  publishJobId: string | null
  publishedRecordId: string | null
  liveUrl: string | null
  nextActionHe: string
}

export interface ProductRoutingSummary {
  product: RoutingProductInput
  hasRealAffiliateLink: boolean
  hasLinkReadyProgram: boolean
  affiliateReady: boolean
  routes: PlatformRoute[]
  publishedCount: number
  blockedCount: number
  approvalCount: number
  executorReadyCount: number
  nextActionHe: string
}

export interface PlatformRoutingOverview {
  products: ProductRoutingSummary[]
  platforms: PlatformRoutingDefinition[]
  counts: {
    products: number
    affiliateReadyProducts: number
    publishedVerified: number
    waitingApproval: number
    readyForExecutor: number
    blocked: number
  }
}

export const PLATFORM_ROUTING_DEFINITIONS: PlatformRoutingDefinition[] = [
  {
    key: "linkedin",
    hebrewName: "LinkedIn",
    englishName: "LinkedIn",
    accountUrl: "https://www.linkedin.com/feed/",
    contentType: "פוסט מקצועי",
    publishMode: "official_api",
    approvalRequired: true,
    status: "pending_setup",
    directAffiliateLinksAllowed: true,
    policySummary: "נדרש חיבור API רשמי. אין אוטומציית דפדפן לא רשמית.",
    setupBlocker: "linkedin_official_api_not_configured",
  },
  {
    key: "medium",
    hebrewName: "Medium",
    englishName: "Medium",
    accountUrl: "https://medium.com/",
    contentType: "מאמר",
    publishMode: "browser_executor",
    approvalRequired: true,
    status: "active",
    directAffiliateLinksAllowed: true,
    policySummary: "מותר עם גילוי שותפים ותוכן בעל ערך.",
    setupBlocker: null,
  },
  {
    key: "substack",
    hebrewName: "Substack",
    englishName: "Substack",
    accountUrl: "https://substack.com/home",
    contentType: "מאמר / ניוזלטר",
    publishMode: "browser_executor",
    approvalRequired: true,
    status: "active",
    directAffiliateLinksAllowed: true,
    policySummary: "נדרש תוכן אמיתי עם ערך, לא פרסומת בלבד.",
    setupBlocker: null,
  },
  {
    key: "quora",
    hebrewName: "Quora",
    englishName: "Quora",
    accountUrl: "https://www.quora.com/",
    contentType: "תשובה חינוכית",
    publishMode: "manual_sensitive",
    approvalRequired: true,
    status: "pending_setup",
    directAffiliateLinksAllowed: false,
    policySummary: "אסור קישור אפיליאייט ישיר. רק תשובה מועילה וקישור חיצוני בטוח אם מתאים.",
    setupBlocker: "quora_no_direct_affiliate_links",
  },
  {
    key: "reddit",
    hebrewName: "Reddit",
    englishName: "Reddit",
    accountUrl: "https://www.reddit.com/",
    contentType: "דיון קהילתי",
    publishMode: "manual_sensitive",
    approvalRequired: true,
    status: "pending_setup",
    directAffiliateLinksAllowed: false,
    policySummary: "נדרש אימות חוקים לפי subreddit. לא מפרסמים affiliate-heavy.",
    setupBlocker: "reddit_community_rules_not_verified",
  },
  {
    key: "tiktok",
    hebrewName: "TikTok",
    englishName: "TikTok",
    accountUrl: "https://www.tiktok.com/",
    contentType: "וידאו בלבד",
    publishMode: "blocked",
    approvalRequired: true,
    status: "disabled",
    directAffiliateLinksAllowed: true,
    policySummary: "לא מפרסמים טקסט. נדרש וידאו וגילוי מסחרי.",
    setupBlocker: "video_asset_required",
  },
  {
    key: "facebook_page",
    hebrewName: "Facebook Page",
    englishName: "Facebook Page",
    accountUrl: null,
    contentType: "פוסט עמוד",
    publishMode: "official_api",
    approvalRequired: true,
    status: "pending_setup",
    directAffiliateLinksAllowed: true,
    policySummary: "ממתין לחשבון/עמוד וחיבור Graph API רשמי.",
    setupBlocker: "facebook_page_pending_setup",
  },
  {
    key: "instagram_professional",
    hebrewName: "Instagram Business",
    englishName: "Instagram Business/Creator",
    accountUrl: null,
    contentType: "תמונה / ריל",
    publishMode: "official_api",
    approvalRequired: true,
    status: "pending_setup",
    directAffiliateLinksAllowed: true,
    policySummary: "נדרש חשבון מקצועי וחיבור Meta רשמי.",
    setupBlocker: "instagram_api_not_connected",
  },
  {
    key: "pinterest",
    hebrewName: "Pinterest",
    englishName: "Pinterest",
    accountUrl: "https://www.pinterest.com/rubinqs0941/?actingBusinessId=1143633036534323486",
    contentType: "Pin",
    publishMode: "official_api",
    approvalRequired: true,
    status: "pending_setup",
    directAffiliateLinksAllowed: true,
    policySummary: "פרופיל ידוע, אבל API/OAuth עדיין לא מחובר.",
    setupBlocker: "pinterest_api_not_connected",
  },
  {
    key: "x_twitter",
    hebrewName: "X / Twitter",
    englishName: "X / Twitter",
    accountUrl: "https://x.com/MENIRUBINqs",
    contentType: "פוסט קצר",
    publishMode: "official_api",
    approvalRequired: true,
    status: "pending_setup",
    directAffiliateLinksAllowed: true,
    policySummary: "נדרש OAuth רשמי ו-X API access ready.",
    setupBlocker: "x_api_access_not_ready",
  },
  {
    key: "youtube",
    hebrewName: "YouTube",
    englishName: "YouTube",
    accountUrl: null,
    contentType: "וידאו",
    publishMode: "official_api",
    approvalRequired: true,
    status: "pending_setup",
    directAffiliateLinksAllowed: true,
    policySummary: "נדרש וידאו, OAuth והרשאות YouTube Data API.",
    setupBlocker: "youtube_video_and_api_required",
  },
]

// Default-visible platforms when includePendingSetupPlatforms is false.
// All 11 platforms in the registry are routable; the new platforms
// (facebook_page, instagram_professional, pinterest, x_twitter, youtube)
// were previously filtered out which made the hebrew dashboards look
// like they only support 6 surfaces.
const ROUTED_CORE_PLATFORMS = new Set<PlatformRoutingKey>([
  "linkedin",
  "medium",
  "substack",
  "tiktok",
  "quora",
  "reddit",
  "facebook_page",
  "instagram_professional",
  "pinterest",
  "x_twitter",
  "youtube",
])

export function getPlatformRoutingDefinition(platform: string) {
  return PLATFORM_ROUTING_DEFINITIONS.find((item) => item.key === platform) ?? null
}

export function buildPlatformRoutingOverview(input: {
  products: RoutingProductInput[]
  affiliatePrograms: RoutingAffiliateProgramInput[]
  finalCopies: RoutingFinalCopyInput[]
  publishJobs: RoutingPublishJobInput[]
  publishedRecords: RoutingPublishedRecordInput[]
  includePendingSetupPlatforms?: boolean
}): PlatformRoutingOverview {
  const platforms = input.includePendingSetupPlatforms
    ? PLATFORM_ROUTING_DEFINITIONS
    : PLATFORM_ROUTING_DEFINITIONS.filter((platform) => ROUTED_CORE_PLATFORMS.has(platform.key))

  const products = input.products
    .map((product) => buildProductRoutingSummary(product, platforms, input))
    .sort((a, b) => sortProductsByAction(a, b))

  return {
    products,
    platforms,
    counts: {
      products: products.length,
      affiliateReadyProducts: products.filter((product) => product.affiliateReady).length,
      publishedVerified: products.reduce((sum, product) => sum + product.publishedCount, 0),
      waitingApproval: products.reduce((sum, product) => sum + product.approvalCount, 0),
      readyForExecutor: products.reduce((sum, product) => sum + product.executorReadyCount, 0),
      blocked: products.reduce((sum, product) => sum + product.blockedCount, 0),
    },
  }
}

function buildProductRoutingSummary(
  product: RoutingProductInput,
  platforms: PlatformRoutingDefinition[],
  input: {
    affiliatePrograms: RoutingAffiliateProgramInput[]
    finalCopies: RoutingFinalCopyInput[]
    publishJobs: RoutingPublishJobInput[]
    publishedRecords: RoutingPublishedRecordInput[]
  },
): ProductRoutingSummary {
  const productPrograms = input.affiliatePrograms.filter((program) => program.productId === product.id)
  const programLink = productPrograms.find((program) => program.status === "link_ready" && program.affiliateLink)?.affiliateLink
  const hasRealAffiliateLink = Boolean((product.affiliateLink ?? product.affiliateUrl ?? programLink ?? "").trim())
  const hasLinkReadyProgram = productPrograms.some((program) => program.status === "link_ready")
  const affiliateReady = hasRealAffiliateLink && hasLinkReadyProgram

  const routes = platforms.map((platform) =>
    buildPlatformRoute({
      product,
      platform,
      affiliateReady,
      hasRealAffiliateLink,
      finalCopies: input.finalCopies.filter((copy) => copy.productId === product.id && copy.platform === platform.key),
      publishJobs: input.publishJobs.filter((job) => job.productId === product.id && job.platform === platform.key),
      publishedRecords: input.publishedRecords.filter(
        (record) => record.productId === product.id && record.platform === platform.key,
      ),
    }),
  )

  const publishedCount = routes.filter((route) => route.state === "published_verified").length
  const blockedCount = routes.filter((route) =>
    [
      "executor_blocked",
      "policy_blocked",
      "needs_system_fix",
      "missing_affiliate_link",
      "platform_pending_setup",
      "platform_disabled",
      "missing_final_copy",
    ].includes(route.state),
  ).length
  const approvalCount = routes.filter((route) => route.state === "pending_meni_approval").length
  const executorReadyCount = routes.filter((route) =>
    ["ready_for_executor", "requires_auth", "waiting_url_verification", "running"].includes(route.state),
  ).length

  return {
    product,
    hasRealAffiliateLink,
    hasLinkReadyProgram,
    affiliateReady,
    routes,
    publishedCount,
    blockedCount,
    approvalCount,
    executorReadyCount,
    nextActionHe: buildProductNextAction({ affiliateReady, routes }),
  }
}

function buildPlatformRoute(input: {
  product: RoutingProductInput
  platform: PlatformRoutingDefinition
  affiliateReady: boolean
  hasRealAffiliateLink: boolean
  finalCopies: RoutingFinalCopyInput[]
  publishJobs: RoutingPublishJobInput[]
  publishedRecords: RoutingPublishedRecordInput[]
}): PlatformRoute {
  const publishedRecord = input.publishedRecords.find((record) =>
    record.verificationStatus === "verified" && Boolean(record.liveUrl?.trim()),
  )
  const latestFinalCopy = input.finalCopies[0] ?? null
  const publishJob = findLatestPublishJob(input.publishJobs, latestFinalCopy?.id)

  if (publishedRecord) {
    return route(input, {
      state: "published_verified",
      labelHe: "פורסם ואומת",
      blocker: null,
      finalCopy: latestFinalCopy,
      publishJob,
      publishedRecord,
      nextActionHe: "מעקב ביצועים אמיתיים בלבד",
    })
  }

  if (publishJob) {
    return routeFromPublishJob(input, latestFinalCopy, publishJob)
  }

  if (input.platform.status === "disabled") {
    return route(input, {
      state: "platform_disabled",
      labelHe: "כבוי",
      blocker: input.platform.setupBlocker,
      finalCopy: latestFinalCopy,
      publishJob,
      publishedRecord: null,
      nextActionHe: "לא לפרסם בפלטפורמה זו",
    })
  }

  if (input.platform.status === "pending_setup") {
    return route(input, {
      state: "platform_pending_setup",
      labelHe: "ממתין להגדרה",
      blocker: input.platform.setupBlocker,
      finalCopy: latestFinalCopy,
      publishJob,
      publishedRecord: null,
      nextActionHe: "לחבר נתיב רשמי או להשאיר חסום",
    })
  }

  if (!input.affiliateReady || !input.hasRealAffiliateLink) {
    return route(input, {
      state: "missing_affiliate_link",
      labelHe: "חסר קישור שותף אמיתי",
      blocker: "missing_real_affiliate_link_or_link_ready_program",
      finalCopy: latestFinalCopy,
      publishJob,
      publishedRecord: null,
      nextActionHe: "לא לפרסם עד שיש affiliate link ו-link_ready",
    })
  }

  if (!latestFinalCopy) {
    return route(input, {
      state: "missing_final_copy",
      labelHe: "חסר Final Copy",
      blocker: "missing_final_copy",
      finalCopy: null,
      publishJob,
      publishedRecord: null,
      nextActionHe: "המערכת צריכה ליצור Final Copy",
    })
  }

  if (latestFinalCopy.validationStatus !== "valid" || latestFinalCopy.status === "needs_system_fix") {
    return route(input, {
      state: "needs_system_fix",
      labelHe: "דרוש תיקון מערכת",
      blocker: latestFinalCopy.blockingReasons.join(", ") || "final_copy_invalid",
      finalCopy: latestFinalCopy,
      publishJob,
      publishedRecord: null,
      nextActionHe: "לתקן במערכת, לא אצל MENI",
    })
  }

  if (latestFinalCopy.status === "ready_for_operator_approval" || latestFinalCopy.status === "validated") {
    return route(input, {
      state: "pending_meni_approval",
      labelHe: "ממתין לאישור MENI",
      blocker: null,
      finalCopy: latestFinalCopy,
      publishJob,
      publishedRecord: null,
      nextActionHe: "MENI לוחץ אשר / דחה / דרוש תיקון",
    })
  }

  if (latestFinalCopy.status === "operator_approved" || latestFinalCopy.status === "ready_for_manual_publish") {
    return route(input, {
      state: "ready_for_executor",
      labelHe: "מאושר ומוכן למנוע פרסום",
      blocker: null,
      finalCopy: latestFinalCopy,
      publishJob,
      publishedRecord: null,
      nextActionHe: "ליצור או להפעיל publish_job",
    })
  }

  return route(input, {
    state: "needs_system_fix",
    labelHe: "סטטוס לא מטופל",
    blocker: `unsupported_final_copy_status:${latestFinalCopy.status}`,
    finalCopy: latestFinalCopy,
    publishJob,
    publishedRecord: null,
    nextActionHe: "דרוש תיקון מערכת",
  })
}

function routeFromPublishJob(
  input: {
    product: RoutingProductInput
    platform: PlatformRoutingDefinition
  },
  finalCopy: RoutingFinalCopyInput | null,
  publishJob: RoutingPublishJobInput,
): PlatformRoute {
  const jobMap: Partial<Record<string, { state: PlatformRouteState; labelHe: string; nextActionHe: string }>> = {
    pending_meni_approval: {
      state: "pending_meni_approval",
      labelHe: "ממתין לאישור MENI",
      nextActionHe: "MENI לוחץ אשר / דחה / דרוש תיקון",
    },
    approved_waiting_executor: {
      state: "ready_for_executor",
      labelHe: "מאושר וממתין למנוע פרסום",
      nextActionHe: "המנוע צריך לבצע או לדווח חסימה",
    },
    blocked_executor_not_connected: {
      state: "executor_blocked",
      labelHe: "חסום - מנוע פרסום לא מחובר",
      nextActionHe: "לחבר executor רשמי; לא להעביר עבודה למני",
    },
    blocked_policy: {
      state: "policy_blocked",
      labelHe: "חסום מדיניות",
      nextActionHe: "לא לפרסם עד שהמדיניות נפתרת",
    },
    requires_auth: {
      state: "requires_auth",
      labelHe: "נדרש חיבור חשבון",
      nextActionHe: "MENI מחבר חשבון בלבד",
    },
    pending_operator_confirmation: {
      state: "ready_for_executor",
      labelHe: "ממתין לאישור פעולה סופית",
      nextActionHe: "MENI מאשר פעולה סופית בלבד",
    },
    running: {
      state: "running",
      labelHe: "בביצוע",
      nextActionHe: "להמתין לתוצאת executor",
    },
    waiting_url_verification: {
      state: "waiting_url_verification",
      labelHe: "ממתין לאימות URL",
      nextActionHe: "לא ליצור published_record בלי URL מאומת",
    },
    verified: {
      state: "published_verified",
      labelHe: "פורסם ואומת",
      nextActionHe: "מעקב ביצועים אמיתיים בלבד",
    },
    needs_system_fix: {
      state: "needs_system_fix",
      labelHe: "דרוש תיקון מערכת",
      nextActionHe: "לתקן במערכת, לא אצל MENI",
    },
    failed_needs_system_fix: {
      state: "needs_system_fix",
      labelHe: "נכשל - דרוש תיקון מערכת",
      nextActionHe: "לתקן במערכת, לא אצל MENI",
    },
  }
  const mapped = jobMap[publishJob.status] ?? {
    state: "needs_system_fix" as const,
    labelHe: "סטטוס לא מוכר",
    nextActionHe: "דרוש תיקון מערכת",
  }

  return route(input, {
    ...mapped,
    blocker: publishJob.blockingReason,
    finalCopy,
    publishJob,
    publishedRecord: null,
  })
}

function route(
  input: {
    product: RoutingProductInput
    platform: PlatformRoutingDefinition
  },
  state: {
    state: PlatformRouteState
    labelHe: string
    blocker: string | null
    finalCopy: RoutingFinalCopyInput | null
    publishJob: RoutingPublishJobInput | null
    publishedRecord: RoutingPublishedRecordInput | null
    nextActionHe: string
  },
): PlatformRoute {
  return {
    productId: input.product.id,
    productName: input.product.name,
    platform: input.platform,
    state: state.state,
    labelHe: state.labelHe,
    blocker: state.blocker,
    finalCopyId: state.finalCopy?.id ?? null,
    finalCopyTitle: state.finalCopy?.title ?? null,
    publishJobId: state.publishJob?.id ?? null,
    publishedRecordId: state.publishedRecord?.id ?? null,
    liveUrl: state.publishedRecord?.liveUrl ?? state.publishJob?.liveUrl ?? null,
    nextActionHe: state.nextActionHe,
  }
}

function findLatestPublishJob(
  jobs: RoutingPublishJobInput[],
  finalCopyId: string | null | undefined,
) {
  const matching = finalCopyId ? jobs.filter((job) => job.finalCopyId === finalCopyId) : jobs
  return matching[0] ?? jobs[0] ?? null
}

function buildProductNextAction(input: { affiliateReady: boolean; routes: PlatformRoute[] }) {
  if (!input.affiliateReady) return "חסר link_ready או קישור שותף אמיתי"
  if (input.routes.some((route) => route.state === "pending_meni_approval")) return "ממתין לאישור MENI"
  if (input.routes.some((route) => route.state === "ready_for_executor")) return "מוכן למנוע פרסום"
  if (input.routes.some((route) => route.state === "requires_auth")) return "נדרש חיבור חשבון"
  if (input.routes.some((route) => route.state === "running")) return "בביצוע"
  if (input.routes.some((route) => route.state === "waiting_url_verification")) return "ממתין לאימות URL"
  if (input.routes.some((route) => route.state === "missing_final_copy")) return "המערכת צריכה ליצור Final Copy"
  if (input.routes.some((route) => route.state === "executor_blocked")) return "חסום - מנוע פרסום לא מחובר"
  if (input.routes.some((route) => route.state === "policy_blocked")) return "חסום מדיניות"
  if (input.routes.some((route) => route.state === "published_verified")) return "פורסם - לעקוב אחרי ביצועים אמיתיים"
  return "אין פעולה"
}

function sortProductsByAction(a: ProductRoutingSummary, b: ProductRoutingSummary) {
  const score = (product: ProductRoutingSummary) => {
    if (!product.affiliateReady) return 70
    if (product.approvalCount > 0) return 10
    if (product.executorReadyCount > 0) return 20
    if (product.blockedCount > 0) return 50
    return 90
  }
  return score(a) - score(b) || a.product.name.localeCompare(b.product.name)
}
