import type {
  IntegrationName,
  IntegrationReadiness,
  IntegrationReadinessStatus,
  SystemReadiness,
} from "@/types/system"

const COMMON_PLACEHOLDERS = new Set([
  "https://example.com",
  "your_wordpress_username",
  "your_wordpress_application_password",
  "your_supabase_url",
  "your_supabase_anon_key",
  "your_supabase_service_role_key",
  "your_openai_api_key",
  "your_anthropic_api_key",
  "your_operator_password",
  "your_session_secret",
])

function normalizeEnvValue(value: string | undefined) {
  return value?.trim() ?? ""
}

export function isPlaceholderValue(value: string | undefined) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) {
    return false
  }

  if (COMMON_PLACEHOLDERS.has(normalized)) {
    return true
  }

  return (
    normalized.includes("your_") ||
    normalized.includes("replace-me") ||
    normalized.includes("changeme") ||
    normalized.includes("example.com")
  )
}

function getKeyState(name: string) {
  const value = normalizeEnvValue(process.env[name])

  if (!value) {
    return "missing" as const
  }

  if (isPlaceholderValue(value)) {
    return "placeholder" as const
  }

  return "configured" as const
}

function getReadinessStatus(states: Array<ReturnType<typeof getKeyState>>) {
  if (states.includes("missing")) {
    return "missing" as const
  }

  if (states.includes("placeholder")) {
    return "placeholder" as const
  }

  return "configured" as const
}

function createReadiness(params: {
  name: IntegrationName
  label: string
  requiredKeys: string[]
  summary: Partial<Record<IntegrationReadinessStatus, string>>
  guidance: Partial<Record<IntegrationReadinessStatus, string>>
  overrideStatus?: IntegrationReadinessStatus
}) {
  const keyStates = params.requiredKeys.map((name) => ({
    name,
    state: getKeyState(name),
  }))
  const status = params.overrideStatus ?? getReadinessStatus(keyStates.map((item) => item.state))
  const missingKeys = keyStates
    .filter((item) => item.state === "missing")
    .map((item) => item.name)
  const placeholderKeys = keyStates
    .filter((item) => item.state === "placeholder")
    .map((item) => item.name)

  return {
    name: params.name,
    label: params.label,
    status,
    summary:
      params.summary[status] ??
      `${params.label} configuration is ${status}.`,
    guidance:
      params.guidance[status] ??
      `Update ${params.requiredKeys.join(", ")} and restart the app.`,
    requiredKeys: params.requiredKeys,
    missingKeys,
    placeholderKeys,
  } satisfies IntegrationReadiness
}

export function getSupabaseReadiness() {
  return createReadiness({
    name: "supabase",
    label: "Supabase",
    requiredKeys: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
    summary: {
      configured: "Supabase environment variables are configured.",
      missing: "Supabase is not configured yet.",
      placeholder: "Supabase environment values still use placeholders.",
    },
    guidance: {
      configured: "Apply migrations and verify the target project is reachable from this app.",
      missing:
        "Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to .env.local, then restart the app.",
      placeholder:
        "Replace the placeholder Supabase values in .env.local with real project credentials, then restart the app.",
    },
  })
}

export function getAiReadiness() {
  const provider = normalizeEnvValue(process.env.AI_PROVIDER).toLowerCase()

  if (!provider) {
    return createReadiness({
      name: "ai",
      label: "Content generation",
      requiredKeys: [],
      summary: {
        configured: "Content generation mode: Claude Code assisted / fallback mode.",
      },
      guidance: {
        configured:
          "Use Claude Code or the manual draft form for real content. The in-app fallback generator remains available for test drafts.",
      },
      overrideStatus: "configured",
    })
  }

  if (provider !== "openai" && provider !== "anthropic") {
    return createReadiness({
      name: "ai",
      label: "Content generation",
      requiredKeys: [],
      summary: {
        configured:
          `Content generation mode: Claude Code assisted / fallback mode. Unsupported AI_PROVIDER "${provider}" is ignored.`,
      },
      guidance: {
        configured:
          "Use manual drafts or set AI_PROVIDER to openai or anthropic with a matching key if live in-app generation is needed later.",
      },
      overrideStatus: "configured",
    })
  }

  const keyName = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"

  if (getKeyState(keyName) !== "configured") {
    return createReadiness({
      name: "ai",
      label: "Content generation",
      requiredKeys: [],
      summary: {
        configured:
          "Content generation mode: Claude Code assisted / fallback mode.",
      },
      guidance: {
        configured:
          `Live ${provider} output is optional. Add ${keyName} only if you want the in-app generator to call that provider.`,
      },
      overrideStatus: "configured",
    })
  }

  return createReadiness({
    name: "ai",
    label: "Content generation",
    requiredKeys: ["AI_PROVIDER", keyName],
    summary: {
      configured: `${provider} is configured for optional live in-app draft generation.`,
      missing:
        "Content generation mode: Claude Code assisted / fallback mode.",
      placeholder:
        "Content generation mode: Claude Code assisted / fallback mode.",
    },
    guidance: {
      configured:
        "Live draft generation can be tested, but manual Claude Code assisted drafts remain supported.",
      missing:
        "Use Claude Code or the manual draft form for content creation.",
      placeholder:
        "Use Claude Code or the manual draft form for content creation.",
    },
  })
}

export function isLiveAiConfigured() {
  const provider = normalizeEnvValue(process.env.AI_PROVIDER).toLowerCase()

  if (provider === "openai") {
    return getKeyState("OPENAI_API_KEY") === "configured"
  }

  if (provider === "anthropic") {
    return getKeyState("ANTHROPIC_API_KEY") === "configured"
  }

  return false
}

export function getWordPressReadiness() {
  return createReadiness({
    name: "wordpress",
    label: "WordPress",
    requiredKeys: [
      "WORDPRESS_BASE_URL",
      "WORDPRESS_USERNAME",
      "WORDPRESS_APP_PASSWORD",
    ],
    summary: {
      configured: "WordPress credentials are configured for optional draft-post handoff.",
      missing: "WordPress is optional and not connected. This does not block the core workflow.",
      placeholder: "WordPress credentials still use placeholder values. WordPress is optional.",
    },
    guidance: {
      configured:
        "WordPress is connected. You can queue approved drafts as WordPress draft posts.",
      missing:
        "WordPress is not required. Connect it later by adding WORDPRESS_BASE_URL, WORDPRESS_USERNAME, and WORDPRESS_APP_PASSWORD to .env.local.",
      placeholder:
        "WordPress is optional. Replace the placeholders or leave them blank to skip WordPress.",
    },
  })
}

export function isDeployedRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1"
}

export function getAccessGateReadiness() {
  return createReadiness({
    name: "access_gate",
    label: "Operator access gate",
    requiredKeys: [
      "APP_ACCESS_PASSWORD",
      "APP_SESSION_SECRET",
    ],
    summary: {
      configured: "Operator access gate is configured.",
      missing:
        isDeployedRuntime()
          ? "Operator access gate is missing required production values."
          : "Operator access gate is not configured yet.",
      placeholder: "Operator access gate values still use placeholders.",
    },
    guidance: {
      configured:
        "Dashboard routes are protected by a signed single-operator session cookie.",
      missing:
        "Add APP_ACCESS_PASSWORD and APP_SESSION_SECRET to .env.local or hosting env vars. Use strong values and restart the app.",
      placeholder:
        "Replace placeholder APP_ACCESS_PASSWORD and APP_SESSION_SECRET values with strong private values before deployment.",
    },
  })
}

export function getIntegrationReadiness(name: IntegrationName) {
  switch (name) {
    case "supabase":
      return getSupabaseReadiness()
    case "access_gate":
      return getAccessGateReadiness()
    case "ai":
      return getAiReadiness()
    case "wordpress":
      return getWordPressReadiness()
  }
}

export function getSystemReadiness(): SystemReadiness {
  const integrations = [
    getSupabaseReadiness(),
    getAccessGateReadiness(),
    getAiReadiness(),
    getWordPressReadiness(),
  ]

  return {
    integrations,
    configuredCount: integrations.filter((item) => item.status === "configured").length,
    blockingCount: integrations.filter(
      (item) =>
        (item.name === "supabase" && item.status !== "configured") ||
        (item.name === "access_gate" &&
          item.status !== "configured" &&
          isDeployedRuntime()),
    ).length,
  }
}

export function assertIntegrationConfigured(name: IntegrationName) {
  const readiness = getIntegrationReadiness(name)

  if (readiness.status !== "configured") {
    throw new Error(`${readiness.summary} ${readiness.guidance}`)
  }
}
