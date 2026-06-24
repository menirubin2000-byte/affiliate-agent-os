import crypto from "node:crypto"

const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

function deriveKey(secret: string) {
  return crypto.scryptSync(secret, "affiliate-agent-os", KEY_LENGTH)
}

function decodePayload(payload: string) {
  try {
    return Buffer.from(payload, "base64url")
  } catch {
    return Buffer.from(payload, "base64")
  }
}

export function getServerTokenEncryptionSecret(env: NodeJS.ProcessEnv = process.env) {
  return env.YOUTUBE_TOKEN_ENCRYPTION_KEY?.trim() || env.APP_SESSION_SECRET?.trim() || null
}

export function encryptSecret(value: string, secret: string) {
  if (!value) {
    throw new Error("Cannot encrypt an empty secret.")
  }
  if (!secret) {
    throw new Error("Missing token encryption secret.")
  }

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(secret), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url")
}

export function decryptSecret(payload: string, secret: string) {
  if (!payload) {
    throw new Error("Missing encrypted secret payload.")
  }
  if (!secret) {
    throw new Error("Missing token encryption secret.")
  }

  const buffer = decodePayload(payload)
  if (buffer.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Encrypted secret payload is malformed.")
  }

  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(secret), iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}
