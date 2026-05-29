import assert from "node:assert/strict"
import test from "node:test"

import {
  createOperatorSessionToken,
  getOperatorAccessGateConfig,
  isHostedRuntime,
  isOperatorAccessGateConfigured,
  verifyOperatorPassword,
  verifyOperatorSessionToken,
} from "../lib/operator-auth"

const ENV_KEYS = ["APP_ACCESS_PASSWORD", "APP_SESSION_SECRET", "VERCEL"] as const
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

function configureGate() {
  process.env.APP_ACCESS_PASSWORD = "operator-test-password"
  process.env.APP_SESSION_SECRET = "test-session-secret-with-enough-entropy"
}

test.afterEach(restoreEnv)

test("detects missing access gate configuration", () => {
  delete process.env.APP_ACCESS_PASSWORD
  delete process.env.APP_SESSION_SECRET

  const config = getOperatorAccessGateConfig()

  assert.equal(config.configured, false)
  assert.equal(config.missingKeys.includes("APP_ACCESS_PASSWORD"), true)
  assert.equal(config.missingKeys.includes("APP_SESSION_SECRET"), true)
  assert.equal(isOperatorAccessGateConfigured(), false)
})

test("treats Vercel as a hosted runtime for access gate readiness", () => {
  process.env.VERCEL = "1"

  const config = getOperatorAccessGateConfig()

  assert.equal(config.isProduction, true)
  assert.equal(isHostedRuntime(), true)
})

test("verifies submitted password against environment password", () => {
  configureGate()

  assert.equal(verifyOperatorPassword("operator-test-password"), true)
  assert.equal(verifyOperatorPassword("wrong-password"), false)
})

test("creates and verifies signed HMAC session tokens", async () => {
  configureGate()
  const token = await createOperatorSessionToken({
    now: new Date("2026-05-29T10:00:00.000Z"),
    ttlSeconds: 60,
  })

  assert.equal(
    await verifyOperatorSessionToken(token, {
      now: new Date("2026-05-29T10:00:30.000Z"),
    }),
    true,
  )
})

test("rejects tampered tokens", async () => {
  configureGate()
  const token = await createOperatorSessionToken()
  const tampered = `${token.slice(0, -1)}x`

  assert.equal(await verifyOperatorSessionToken(tampered), false)
})

test("rejects expired tokens", async () => {
  configureGate()
  const token = await createOperatorSessionToken({
    now: new Date("2026-05-29T10:00:00.000Z"),
    ttlSeconds: 5,
  })

  assert.equal(
    await verifyOperatorSessionToken(token, {
      now: new Date("2026-05-29T10:00:06.000Z"),
    }),
    false,
  )
})
