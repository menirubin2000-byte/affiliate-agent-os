// Publish a local video file to Facebook Page via Graph API.
// Uses the simple /me/videos endpoint (single upload).
// For long videos consider the resumable upload protocol instead.

require("dotenv").config({ path: ".env.local" })
const fs = require("fs")
const path = require("path")

const TOKEN = process.env.FB_PAGE_ACCESS_TOKEN
const PAGE_ID = process.env.FB_PAGE_ID
const GRAPH = "https://graph.facebook.com/v23.0"

if (!TOKEN || !PAGE_ID) {
  throw new Error("Missing FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID in .env.local")
}

async function publishVideo({ filePath, description, title }) {
  const stat = fs.statSync(filePath)
  console.log(`Uploading ${path.basename(filePath)} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`)

  const form = new FormData()
  const buf = fs.readFileSync(filePath)
  const blob = new Blob([buf], { type: "video/mp4" })
  form.append("source", blob, path.basename(filePath))
  if (description) form.append("description", description)
  if (title) form.append("title", title)
  form.append("access_token", TOKEN)

  const res = await fetch(`${GRAPH}/${PAGE_ID}/videos`, { method: "POST", body: form })
  const data = await res.json()
  if (!res.ok || !data.id) {
    throw new Error(`video upload failed: ${JSON.stringify(data)}`)
  }
  console.log("Video posted, id:", data.id)

  // try to fetch permalink (may need a moment to process)
  await new Promise((r) => setTimeout(r, 3000))
  const permaUrl = new URL(`${GRAPH}/${data.id}`)
  permaUrl.searchParams.set("fields", "permalink_url,status")
  permaUrl.searchParams.set("access_token", TOKEN)
  const pRes = await fetch(permaUrl)
  const pBody = await pRes.json()

  return { id: data.id, permalink_url: pBody.permalink_url, status: pBody.status }
}

async function main() {
  const videoPath = process.argv[2]
  const captionPath = process.argv[3]
  const title = process.argv[4] || "Launch your store with Shopify"
  if (!videoPath || !captionPath) {
    console.error("usage: node scripts/publish-video-to-facebook.js <videoFile> <captionFile> [title]")
    process.exit(1)
  }
  if (!fs.existsSync(videoPath)) throw new Error(`video not found: ${videoPath}`)
  if (!fs.existsSync(captionPath)) throw new Error(`caption file not found: ${captionPath}`)

  const description = fs.readFileSync(captionPath, "utf8").trim()

  const result = await publishVideo({ filePath: videoPath, description, title })
  console.log("PUBLISHED:", JSON.stringify(result, null, 2))
}

if (require.main === module) {
  main().catch((err) => {
    console.error("ERROR:", err.message)
    process.exitCode = 1
  })
}

module.exports = { publishVideo }
