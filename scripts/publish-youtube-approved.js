require("dotenv").config({ path: ".env.local" })

const crypto = require("node:crypto")
const { createClient } = require("@supabase/supabase-js")
const { requireDirectPublishOverride } = require("./safety-guard")

requireDirectPublishOverride("publish-youtube-approved.js")

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET
const ENCRYPTION_SECRET = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY || process.env.APP_SESSION_SECRET
const LIMIT = Number(process.env.YOUTUBE_PUBLISH_LIMIT || "6")
const PRIVACY_STATUS = process.env.YOUTUBE_PRIVACY_STATUS || "public"

if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Missing Supabase env.")
if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("Missing YouTube OAuth client env.")
if (!ENCRYPTION_SECRET) throw new Error("Missing YOUTUBE_TOKEN_ENCRYPTION_KEY or APP_SESSION_SECRET.")

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function decode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
  return Buffer.from(padded, "base64")
}

function encode(value) {
  return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function keyFromSecret(secret) {
  return crypto.createHash("sha256").update(secret).digest()
}

function decryptSecret(value, secret) {
  const [version, iv, tag, encrypted, extra] = String(value || "").split(":")
  if (version !== "v1" || !iv || !tag || !encrypted || extra) {
    throw new Error("Unsupported encrypted secret format.")
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyFromSecret(secret), decode(iv))
  decipher.setAuthTag(decode(tag))
  return Buffer.concat([decipher.update(decode(encrypted)), decipher.final()]).toString("utf8")
}

function encryptSecret(value, secret) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFromSecret(secret), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  return ["v1", encode(iv), encode(cipher.getAuthTag()), encode(encrypted)].join(":")
}

function related(value) {
  return Array.isArray(value) ? value[0] : value
}

function youtubeLiveUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`
}

function cleanTitle(value, fallback) {
  const title = String(value || fallback || "Product review").replace(/\s+/g, " ").trim()
  return title.length <= 100 ? title : `${title.slice(0, 97).trim()}...`
}

function cleanDescription(value) {
  return String(value || "").trim().slice(0, 4900)
}

async function getYouTubeConnection() {
  const { data, error } = await sb
    .from("platform_connections")
    .select("id, status, metadata")
    .eq("provider", "youtube")
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error("youtube_connection_missing")
  const metadata = data.metadata || {}
  if (metadata.publishing_enabled !== true) throw new Error("youtube_publishing_not_enabled")
  if (!metadata.encrypted_refresh_token) throw new Error("youtube_encrypted_refresh_token_missing")
  return data
}

async function refreshAccessToken(connection) {
  const metadata = connection.metadata || {}
  const refreshToken = decryptSecret(metadata.encrypted_refresh_token, ENCRYPTION_SECRET)
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  })

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  const token = await response.json()
  if (!response.ok || !token.access_token) {
    throw new Error(`youtube_refresh_failed_${response.status}: ${JSON.stringify(token).slice(0, 500)}`)
  }

  const expiresAt = new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString()
  await sb
    .from("platform_connections")
    .update({
      expires_at: expiresAt,
      access_token_hash: crypto.createHash("sha256").update(token.access_token).digest("hex"),
      metadata: {
        ...metadata,
        encrypted_access_token: encryptSecret(token.access_token, ENCRYPTION_SECRET),
        token_expires_at: expiresAt,
        raw_token_stored: false,
        encrypted_token_stored: true,
        publishing_enabled: true,
      },
    })
    .eq("id", connection.id)

  return token.access_token
}

async function listCandidates() {
  const { data, error } = await sb
    .from("final_copies")
    .select(
      "id, product_id, source_content_id, platform_adaptation_id, platform, language, status, validation_status, title, body, published_records(id), products(name, video_url, video_status)",
    )
    .eq("platform", "youtube")
    .eq("status", "operator_approved")
    .eq("validation_status", "valid")
    .order("updated_at", { ascending: false })
    .limit(50)
  if (error) throw error

  return (data || [])
    .filter((row) => !row.published_records?.length)
    .filter((row) => {
      const product = related(row.products)
      return product?.video_url && product.video_status === "ready"
    })
    .slice(0, LIMIT)
}

async function ensureJob(row, status, reason = null, liveUrl = null) {
  const { data, error } = await sb
    .from("publish_jobs")
    .upsert({
      final_copy_id: row.id,
      product_id: row.product_id,
      platform: "youtube",
      status,
      executor_type: "youtube_data_api",
      blocking_reason: reason,
      live_url: liveUrl,
      verified_at: status === "verified" ? new Date().toISOString() : null,
    }, { onConflict: "final_copy_id" })
    .select("id, status, blocking_reason, live_url")
    .single()
  if (error) throw error
  return data
}

async function fetchVideoBuffer(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`video_fetch_failed_${response.status}`)
  const contentType = response.headers.get("content-type") || "video/mp4"
  const buffer = Buffer.from(await response.arrayBuffer())
  if (!buffer.length) throw new Error("video_file_empty")
  return { buffer, contentType }
}

async function uploadVideo(accessToken, row) {
  const product = related(row.products)
  const title = cleanTitle(row.title, product?.name)
  const description = cleanDescription(row.body)
  const { buffer, contentType } = await fetchVideoBuffer(product.video_url)

  const startUrl = new URL("https://www.googleapis.com/upload/youtube/v3/videos")
  startUrl.searchParams.set("uploadType", "resumable")
  startUrl.searchParams.set("part", "snippet,status")
  startUrl.searchParams.set("notifySubscribers", "false")

  const start = await fetch(startUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": contentType,
      "X-Upload-Content-Length": String(buffer.length),
    },
    body: JSON.stringify({
      snippet: {
        title,
        description,
        categoryId: "28",
        defaultLanguage: row.language === "he" ? "he" : "en",
      },
      status: {
        privacyStatus: PRIVACY_STATUS,
        selfDeclaredMadeForKids: false,
      },
    }),
  })

  if (!start.ok) {
    throw new Error(`youtube_upload_start_failed_${start.status}: ${(await start.text()).slice(0, 700)}`)
  }
  const location = start.headers.get("location")
  if (!location) throw new Error("youtube_upload_location_missing")

  const upload = await fetch(location, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
    },
    body: buffer,
  })
  const result = await upload.json().catch(async () => ({ raw: await upload.text() }))
  if (!upload.ok || !result.id) {
    throw new Error(`youtube_upload_failed_${upload.status}: ${JSON.stringify(result).slice(0, 700)}`)
  }
  return { videoId: result.id, liveUrl: youtubeLiveUrl(result.id), title }
}

async function markVerified(row, job, liveUrl) {
  const { data: record, error: recordError } = await sb
    .from("published_records")
    .upsert({
      product_id: row.product_id,
      source_content_id: row.source_content_id,
      platform_adaptation_id: row.platform_adaptation_id,
      platform: "youtube",
      live_url: liveUrl,
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      final_copy_id: row.id,
      media_asset_url: related(row.products)?.video_url ?? null,
      media_status: "ready",
      needs_media_repair: false,
    }, { onConflict: "platform,live_url" })
    .select("id")
    .single()
  if (recordError) throw recordError

  await sb.from("final_copies").update({
    status: "published_verified",
    media_status: "ready",
    needs_media_repair: false,
  }).eq("id", row.id)

  await sb.from("publish_jobs").update({
    status: "verified",
    blocking_reason: null,
    live_url: liveUrl,
    verified_at: new Date().toISOString(),
  }).eq("id", job.id)

  await sb.from("scheduled_publish_queue").update({
    status: "published",
    published_record_id: record.id,
    last_error: null,
  }).eq("final_copy_id", row.id)
}

async function main() {
  const connection = await getYouTubeConnection()
  const accessToken = await refreshAccessToken(connection)
  const candidates = await listCandidates()
  const results = []

  for (const row of candidates) {
    const product = related(row.products)?.name || row.product_id
    let job = null
    try {
      job = await ensureJob(row, "running")
      const uploaded = await uploadVideo(accessToken, row)
      await markVerified(row, job, uploaded.liveUrl)
      results.push({
        platform: "youtube",
        product,
        final_copy_id: row.id,
        language: row.language,
        new_status: "published_verified",
        publish_job_id: job.id,
        publish_job_status: "verified",
        live_url: uploaded.liveUrl,
        blocker: "",
      })
    } catch (error) {
      const blocker = error instanceof Error ? error.message : String(error)
      try {
        job = await ensureJob(row, "needs_system_fix", blocker.slice(0, 900))
      } catch {}
      results.push({
        platform: "youtube",
        product,
        final_copy_id: row.id,
        language: row.language,
        new_status: row.status,
        publish_job_id: job?.id || "",
        publish_job_status: job?.status || "error",
        live_url: "",
        blocker,
      })
    }
  }

  console.log(JSON.stringify({ requested: LIMIT, attempted: results.length, results }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
