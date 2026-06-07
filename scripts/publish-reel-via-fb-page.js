// Publish an Instagram Reel via the FB Page Token + linked IG Business Account.
// Uses graph.facebook.com (not graph.instagram.com) so the page-token scopes apply.

require("dotenv").config({ path: ".env.local" })
const { requireDirectPublishOverride } = require("./safety-guard")

const TOKEN = process.env.FB_PAGE_ACCESS_TOKEN
const IG_USER_ID = process.env.FB_LINKED_IG_BUSINESS_ID || process.env.IG_BUSINESS_ACCOUNT_ID
const GRAPH = "https://graph.facebook.com/v23.0"

if (!TOKEN || !IG_USER_ID) {
  throw new Error("Missing FB_PAGE_ACCESS_TOKEN or FB_LINKED_IG_BUSINESS_ID in .env.local")
}

async function publishReel({ videoUrl, caption, shareToFeed = true }) {
  if (!videoUrl || !videoUrl.startsWith("https://")) {
    throw new Error("videoUrl must be a public https URL")
  }
  if (caption && caption.length > 2200) {
    throw new Error(`caption too long: ${caption.length}/2200`)
  }

  const createUrl = new URL(`${GRAPH}/${IG_USER_ID}/media`)
  createUrl.searchParams.set("media_type", "REELS")
  createUrl.searchParams.set("video_url", videoUrl)
  if (caption) createUrl.searchParams.set("caption", caption)
  createUrl.searchParams.set("share_to_feed", String(shareToFeed))
  createUrl.searchParams.set("access_token", TOKEN)

  console.log("Creating Reel container...")
  const createRes = await fetch(createUrl, { method: "POST" })
  const createBody = await createRes.json()
  if (!createRes.ok || !createBody.id) {
    throw new Error(`create container failed: ${JSON.stringify(createBody)}`)
  }
  const containerId = createBody.id
  console.log("Container id:", containerId)

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

  console.log("Publishing...")
  const publishUrl = new URL(`${GRAPH}/${IG_USER_ID}/media_publish`)
  publishUrl.searchParams.set("creation_id", containerId)
  publishUrl.searchParams.set("access_token", TOKEN)
  const pubRes = await fetch(publishUrl, { method: "POST" })
  const pubBody = await pubRes.json()
  if (!pubRes.ok || !pubBody.id) {
    throw new Error(`publish failed: ${JSON.stringify(pubBody)}`)
  }

  const permaUrl = new URL(`${GRAPH}/${pubBody.id}`)
  permaUrl.searchParams.set("fields", "permalink,media_type,shortcode")
  permaUrl.searchParams.set("access_token", TOKEN)
  const permaRes = await fetch(permaUrl)
  const permaBody = await permaRes.json()

  return { id: pubBody.id, ...permaBody }
}

async function main() {
  requireDirectPublishOverride("scripts/publish-reel-via-fb-page.js")

  const videoUrl = process.argv[2]
  const captionPath = process.argv[3]
  if (!videoUrl || !captionPath) {
    console.error("usage: node scripts/publish-reel-via-fb-page.js <publicVideoUrl> <captionFile>")
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
