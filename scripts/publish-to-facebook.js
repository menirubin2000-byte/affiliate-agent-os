// Facebook Page publisher
// Posts to a Facebook Page using the Page Access Token.
// Supports text posts (with optional link) and photo posts.

require("dotenv").config({ path: ".env.local" })
const { requireDirectPublishOverride } = require("./safety-guard")

const TOKEN = process.env.FB_PAGE_ACCESS_TOKEN
const PAGE_ID = process.env.FB_PAGE_ID
const GRAPH = "https://graph.facebook.com/v23.0"

if (!TOKEN || !PAGE_ID) {
  throw new Error("Missing FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID in .env.local")
}

async function pageInfo() {
  const url = new URL(`${GRAPH}/${PAGE_ID}`)
  url.searchParams.set("fields", "id,name,category,fan_count,followers_count,about,link")
  url.searchParams.set("access_token", TOKEN)
  const res = await fetch(url)
  return await res.json()
}

/**
 * Publish a text post (with optional link preview) to the Page feed.
 * @param {object} args
 * @param {string} args.message  the post text
 * @param {string} [args.link]   optional URL — Facebook auto-generates a link preview
 * @returns {Promise<{id: string, permalink_url?: string}>}
 */
async function publishTextPost({ message, link }) {
  void message
  void link
  throw new Error("Text-only Facebook publishing is blocked. Use publishPhotoPost with a public image URL.")
}

/**
 * Publish a photo post (image must be a public https URL).
 */
async function publishPhotoPost({ imageUrl, caption }) {
  if (!imageUrl || !imageUrl.startsWith("https://")) {
    throw new Error("imageUrl must be a public https URL")
  }
  const url = new URL(`${GRAPH}/${PAGE_ID}/photos`)
  const body = new URLSearchParams()
  body.set("url", imageUrl)
  if (caption) body.set("caption", caption)
  body.set("access_token", TOKEN)

  const res = await fetch(url, { method: "POST", body })
  const data = await res.json()
  if (!res.ok || !data.id) throw new Error(`photo publish failed: ${JSON.stringify(data)}`)
  return data
}

async function main() {
  const cmd = process.argv[2]

  if (!cmd || cmd === "whoami") {
    const info = await pageInfo()
    console.log(JSON.stringify(info, null, 2))
    return
  }

  if (cmd === "text") {
    requireDirectPublishOverride("scripts/publish-to-facebook.js text")
    throw new Error("Text-only Facebook publishing is blocked. Use: photo <imageUrl> <captionFile>")
  }

  if (cmd === "photo") {
    requireDirectPublishOverride("scripts/publish-to-facebook.js photo")
    const imageUrl = process.argv[3]
    const captionPath = process.argv[4]
    if (!imageUrl || !captionPath) {
      console.error("usage: node scripts/publish-to-facebook.js photo <imageUrl> <captionFile>")
      process.exit(1)
    }
    const caption = require("fs").readFileSync(captionPath, "utf8").trim()
    const result = await publishPhotoPost({ imageUrl, caption })
    console.log("PUBLISHED:", JSON.stringify(result, null, 2))
    return
  }

  console.error("commands: whoami | text <messageFile> [link] | photo <imageUrl> <captionFile>")
  process.exit(1)
}

if (require.main === module) {
  main().catch((err) => {
    console.error("ERROR:", err.message)
    process.exitCode = 1
  })
}

module.exports = { publishTextPost, publishPhotoPost, pageInfo }
