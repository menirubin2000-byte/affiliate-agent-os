// Publish a Reel (vertical video 9:16) to Instagram via Graph API.
// Requires a public https URL to the video.

require("dotenv").config({ path: ".env.local" })

const TOKEN = process.env.IG_ACCESS_TOKEN
const IG_USER_ID = process.env.IG_BUSINESS_ACCOUNT_ID
const GRAPH = "https://graph.instagram.com/v23.0"

if (!TOKEN || !IG_USER_ID) {
  throw new Error("Missing IG_ACCESS_TOKEN or IG_BUSINESS_ACCOUNT_ID in .env.local")
}

async function publishReel({ videoUrl, caption, coverUrl, shareToFeed = true }) {
  if (!videoUrl || !videoUrl.startsWith("https://")) {
    throw new Error("videoUrl must be a public https URL")
  }
  if (caption && caption.length > 2200) {
    throw new Error(`caption too long: ${caption.length}/2200`)
  }

  // 1. create reel container
  const createUrl = new URL(`${GRAPH}/${IG_USER_ID}/media`)
  createUrl.searchParams.set("media_type", "REELS")
  createUrl.searchParams.set("video_url", videoUrl)
  if (caption) createUrl.searchParams.set("caption", caption)
  if (coverUrl) createUrl.searchParams.set("cover_url", coverUrl)
  createUrl.searchParams.set("share_to_feed", String(shareToFeed))
  createUrl.searchParams.set("access_token", TOKEN)

  console.log("Creating media container...")
  const createRes = await fetch(createUrl, { method: "POST" })
  const createBody = await createRes.json()
  if (!createRes.ok || !createBody.id) {
    throw new Error(`create container failed: ${JSON.stringify(createBody)}`)
  }
  const containerId = createBody.id
  console.log("Container id:", containerId)

  // 2. poll status (video processing can take a while)
  for (let i = 0; i < 60; i++) {
    const statusUrl = new URL(`${GRAPH}/${containerId}`)
    statusUrl.searchParams.set("fields", "status_code,status")
    statusUrl.searchParams.set("access_token", TOKEN)
    const sRes = await fetch(statusUrl)
    const sBody = await sRes.json()
    const code = sBody.status_code || ""
    console.log(`  status (${i + 1}/60):`, code, sBody.status || "")
    if (code === "FINISHED") break
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(`media processing failed: ${JSON.stringify(sBody)}`)
    }
    await new Promise((r) => setTimeout(r, 5000))
  }

  // 3. publish
  console.log("Publishing...")
  const publishUrl = new URL(`${GRAPH}/${IG_USER_ID}/media_publish`)
  publishUrl.searchParams.set("creation_id", containerId)
  publishUrl.searchParams.set("access_token", TOKEN)
  const pubRes = await fetch(publishUrl, { method: "POST" })
  const pubBody = await pubRes.json()
  if (!pubRes.ok || !pubBody.id) {
    throw new Error(`publish failed: ${JSON.stringify(pubBody)}`)
  }

  // 4. permalink
  const permaUrl = new URL(`${GRAPH}/${pubBody.id}`)
  permaUrl.searchParams.set("fields", "permalink,media_type")
  permaUrl.searchParams.set("access_token", TOKEN)
  const permaRes = await fetch(permaUrl)
  const permaBody = await permaRes.json()

  return { id: pubBody.id, permalink: permaBody.permalink, media_type: permaBody.media_type }
}

async function main() {
  const videoUrl = process.argv[2]
  const captionPath = process.argv[3]
  if (!videoUrl || !captionPath) {
    console.error("usage: node scripts/publish-reel-to-instagram.js <publicVideoUrl> <captionFile>")
    process.exit(1)
  }
  const caption = require("fs").readFileSync(captionPath, "utf8").trim()
  const result = await publishReel({ videoUrl, caption })
  console.log("PUBLISHED:", JSON.stringify(result, null, 2))
}

if (require.main === module) {
  main().catch((err) => { console.error("ERROR:", err.message); process.exitCode = 1 })
}

module.exports = { publishReel }
