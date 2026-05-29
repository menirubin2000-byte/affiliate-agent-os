export const OPERATOR_SESSION_COOKIE = "affiliate_agent_os_session"

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 8
const ACCESS_PASSWORD_ENV_KEY = "APP_ACCESS_PASSWORD"
const SESSION_SECRET_ENV_KEY = "APP_SESSION_SECRET"

function normalizeSecret(value: string | undefined) {
  return value?.trim() ?? ""
}

function getRuntimeEnvValue(key: string) {
  return process.env[key]
}

function isPlaceholderSecret(value: string | undefined) {
  const normalized = normalizeSecret(value).toLowerCase()
  if (!normalized) return false

  return (
    normalized.includes("your_") ||
    normalized.includes("replace-me") ||
    normalized.includes("changeme") ||
    normalized.includes("example") ||
    normalized === "password" ||
    normalized === "secret"
  )
}

export function isHostedRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1"
}

function base64UrlEncode(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")
  const binary = atob(padded)
  return new Uint8Array(Array.from(binary, (char) => char.charCodeAt(0)))
}

function decodeUtf8(value: Uint8Array) {
  return new TextDecoder().decode(value)
}

async function signPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  return base64UrlEncode(new Uint8Array(signature))
}

export function getOperatorAccessGateConfig() {
  const password = normalizeSecret(getRuntimeEnvValue(ACCESS_PASSWORD_ENV_KEY))
  const sessionSecret = normalizeSecret(getRuntimeEnvValue(SESSION_SECRET_ENV_KEY))
  const missingKeys = [
    !password ? ACCESS_PASSWORD_ENV_KEY : null,
    !sessionSecret ? SESSION_SECRET_ENV_KEY : null,
  ].filter((key): key is string => key !== null)
  const placeholderKeys = [
    isPlaceholderSecret(password) ? ACCESS_PASSWORD_ENV_KEY : null,
    isPlaceholderSecret(sessionSecret) ? SESSION_SECRET_ENV_KEY : null,
  ].filter((key): key is string => key !== null)

  return {
    configured: missingKeys.length === 0 && placeholderKeys.length === 0,
    missingKeys,
    placeholderKeys,
    isProduction: isHostedRuntime(),
  }
}

export function isOperatorAccessGateConfigured() {
  return getOperatorAccessGateConfig().configured
}

export function verifyOperatorPassword(password: string) {
  const expected = normalizeSecret(getRuntimeEnvValue(ACCESS_PASSWORD_ENV_KEY))
  if (!isOperatorAccessGateConfigured()) return false
  return password === expected
}

export async function createOperatorSessionToken(options?: {
  now?: Date
  ttlSeconds?: number
}) {
  const sessionSecret = normalizeSecret(getRuntimeEnvValue(SESSION_SECRET_ENV_KEY))
  if (!isOperatorAccessGateConfigured()) {
    throw new Error("Operator access gate is not configured.")
  }

  const now = options?.now ?? new Date()
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS
  const payload = base64UrlEncode(
    JSON.stringify({
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(now.getTime() / 1000) + ttlSeconds,
    }),
  )
  const signature = await signPayload(payload, sessionSecret)
  return `${payload}.${signature}`
}

export async function verifyOperatorSessionToken(
  token: string | undefined | null,
  options?: { now?: Date },
) {
  const sessionSecret = normalizeSecret(getRuntimeEnvValue(SESSION_SECRET_ENV_KEY))
  if (!token || !isOperatorAccessGateConfigured()) return false

  const [payload, signature, extra] = token.split(".")
  if (!payload || !signature || extra) return false

  const expectedSignature = await signPayload(payload, sessionSecret)
  if (signature !== expectedSignature) return false

  try {
    const parsed = JSON.parse(decodeUtf8(base64UrlDecode(payload))) as {
      exp?: unknown
    }
    const exp = typeof parsed.exp === "number" ? parsed.exp : 0
    const nowSeconds = Math.floor((options?.now ?? new Date()).getTime() / 1000)
    return exp > nowSeconds
  } catch {
    return false
  }
}

export function getOperatorSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEFAULT_SESSION_TTL_SECONDS,
  }
}

export function getExpiredOperatorSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  }
}
