import crypto from "node:crypto"

const VERSION = "v1"

function keyFromSecret(secret: string) {
  return crypto.createHash("sha256").update(secret).digest()
}

function encode(value: Buffer) {
  return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function decode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
  return Buffer.from(padded, "base64")
}

export function encryptSecret(value: string, secret: string) {
  if (!value) throw new Error("Cannot encrypt an empty secret.")
  if (!secret?.trim()) throw new Error("Missing encryption secret.")

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFromSecret(secret), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return [VERSION, encode(iv), encode(tag), encode(encrypted)].join(":")
}

export function decryptSecret(value: string, secret: string) {
  if (!value) throw new Error("Cannot decrypt an empty secret.")
  if (!secret?.trim()) throw new Error("Missing encryption secret.")

  const [version, iv, tag, encrypted, extra] = value.split(":")
  if (version !== VERSION || !iv || !tag || !encrypted || extra) {
    throw new Error("Unsupported encrypted secret format.")
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", keyFromSecret(secret), decode(iv))
  decipher.setAuthTag(decode(tag))
  return Buffer.concat([decipher.update(decode(encrypted)), decipher.final()]).toString("utf8")
}

export function getServerTokenEncryptionSecret(env: NodeJS.ProcessEnv = process.env) {
  return env.YOUTUBE_TOKEN_ENCRYPTION_KEY?.trim() || env.APP_SESSION_SECRET?.trim() || ""
}
