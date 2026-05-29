import assert from "node:assert/strict"
import test from "node:test"

import {
  getAiReadiness,
  getAccessGateReadiness,
  getSupabaseReadiness,
  getWordPressReadiness,
  isPlaceholderValue,
} from "../lib/env"

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AI_PROVIDER",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "WORDPRESS_BASE_URL",
  "WORDPRESS_USERNAME",
  "WORDPRESS_APP_PASSWORD",
  "APP_ACCESS_PASSWORD",
  "APP_SESSION_SECRET",
] as const

const originalEnv = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]]),
)

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key)

    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

test.afterEach(restoreEnv)

test("detects common placeholder values", () => {
  assert.equal(isPlaceholderValue("https://example.com"), true)
  assert.equal(isPlaceholderValue("your_wordpress_username"), true)
  assert.equal(isPlaceholderValue("sk-live-real"), false)
})

test("reports missing Supabase readiness with guidance", () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  delete process.env.SUPABASE_SERVICE_ROLE_KEY

  const readiness = getSupabaseReadiness()

  assert.equal(readiness.status, "missing")
  assert.match(readiness.guidance, /NEXT_PUBLIC_SUPABASE_URL/)
})

test("treats missing AI keys as optional Claude Code assisted mode", () => {
  process.env.AI_PROVIDER = "openai"
  delete process.env.OPENAI_API_KEY

  const readiness = getAiReadiness()

  assert.equal(readiness.status, "configured")
  assert.match(readiness.summary, /Claude Code assisted/i)
  assert.equal(readiness.missingKeys.length, 0)
})

test("reports configured WordPress readiness only with real-looking values", () => {
  process.env.WORDPRESS_BASE_URL = "https://wp.example.org"
  process.env.WORDPRESS_USERNAME = "editor"
  process.env.WORDPRESS_APP_PASSWORD = "app-password-value"

  const readiness = getWordPressReadiness()

  assert.equal(readiness.status, "configured")
  assert.equal(readiness.placeholderKeys.length, 0)
})

test("reports access gate readiness from operator env values", () => {
  process.env.APP_ACCESS_PASSWORD = "operator-password"
  process.env.APP_SESSION_SECRET = "session-secret-value"

  const readiness = getAccessGateReadiness()

  assert.equal(readiness.status, "configured")
  assert.equal(readiness.placeholderKeys.length, 0)
})
