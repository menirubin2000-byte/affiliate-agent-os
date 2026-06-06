export const PINTEREST_CURRENT_BLOCKING_REASON = "pinterest_official_api_not_configured"
export const PINTEREST_BOARD_BLOCKING_REASON = "pinterest_board_not_configured"
export const PINTEREST_API_ACCESS_BLOCKING_REASON = "pinterest_api_access_not_ready"

const PINTEREST_CONNECTION_ENV_KEYS = ["PINTEREST_ACCESS_TOKEN"] as const
const PINTEREST_PUBLISH_ENV_KEYS = ["PINTEREST_ACCESS_TOKEN", "PINTEREST_BOARD_ID"] as const

export type PinterestRequiredEnvKey =
  | (typeof PINTEREST_CONNECTION_ENV_KEYS)[number]
  | (typeof PINTEREST_PUBLISH_ENV_KEYS)[number]

export type PinterestOfficialApiCapability = {
  connected: boolean
  publishReady: boolean
  tokenStorage: "server_environment"
  publishEndpoint: string
  missingKeys: string[]
  invalidReasons: string[]
  blockingReason: string | null
}

function value(env: NodeJS.ProcessEnv, key: string) {
  return env[key]?.trim() ?? ""
}

function apiAccessReady(env: NodeJS.ProcessEnv) {
  return value(env, "PINTEREST_API_ACCESS_READY").toLowerCase() === "true"
}

export function getPinterestOfficialApiCapability(
  env: NodeJS.ProcessEnv = process.env,
): PinterestOfficialApiCapability {
  const missingKeys = PINTEREST_PUBLISH_ENV_KEYS.filter((key) => !value(env, key))
  const invalidReasons: string[] = []

  if (!apiAccessReady(env)) {
    invalidReasons.push(PINTEREST_API_ACCESS_BLOCKING_REASON)
  }

  const connected =
    PINTEREST_CONNECTION_ENV_KEYS.every((key) => Boolean(value(env, key))) &&
    apiAccessReady(env)

  const publishReady = connected && missingKeys.length === 0 && invalidReasons.length === 0

  let blockingReason: string | null = null
  if (!connected) {
    blockingReason = PINTEREST_CURRENT_BLOCKING_REASON
  } else if (missingKeys.includes("PINTEREST_BOARD_ID")) {
    blockingReason = PINTEREST_BOARD_BLOCKING_REASON
  } else if (!publishReady) {
    blockingReason = PINTEREST_CURRENT_BLOCKING_REASON
  }

  return {
    connected,
    publishReady,
    tokenStorage: "server_environment",
    publishEndpoint: "https://api.pinterest.com/v5/pins",
    missingKeys,
    invalidReasons,
    blockingReason,
  }
}
