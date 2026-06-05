// Uploads a local file to Supabase Storage and returns a public URL.
// Requires a public bucket named "media" (auto-created on first run).

require("dotenv").config({ path: ".env.local" })
const fs = require("fs")
const path = require("path")

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = "media"

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
}

async function ensureBucket() {
  // create bucket if not exists (public)
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  })
  const text = await res.text()
  if (res.ok) console.log("Created bucket:", BUCKET)
  else if (text.includes("already exists") || text.includes("Duplicate")) console.log("Bucket exists:", BUCKET)
  else console.warn("ensureBucket:", res.status, text)
}

async function uploadFile(filePath, remoteName) {
  const buf = fs.readFileSync(filePath)
  const ext = path.extname(filePath).slice(1).toLowerCase()
  const contentType = ext === "mp4" ? "video/mp4"
    : ext === "png" ? "image/png"
    : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
    : "application/octet-stream"

  const target = remoteName || path.basename(filePath)
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(target)}`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: buf,
  })

  if (!res.ok) {
    const t = await res.text()
    // try PUT if POST not allowed (file exists)
    if (res.status === 400 || t.includes("Duplicate")) {
      const putRes = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          "Content-Type": contentType,
        },
        body: buf,
      })
      if (!putRes.ok) throw new Error(`PUT failed: ${putRes.status} ${await putRes.text()}`)
    } else {
      throw new Error(`upload failed: ${res.status} ${t}`)
    }
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(target)}`
  return publicUrl
}

async function main() {
  const localPath = process.argv[2]
  const remoteName = process.argv[3]
  if (!localPath) {
    console.error("usage: node scripts/upload-to-supabase-storage.js <localFile> [remoteName]")
    process.exit(1)
  }

  await ensureBucket()
  const publicUrl = await uploadFile(localPath, remoteName)
  console.log("PUBLIC_URL:", publicUrl)
}

if (require.main === module) {
  main().catch((err) => { console.error("ERROR:", err.message); process.exitCode = 1 })
}

module.exports = { uploadFile, ensureBucket }
