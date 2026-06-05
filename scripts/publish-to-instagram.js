// Instagram Graph API publisher
// Posts a single image + caption to the linked Instagram Business account.
// IG does not support clickable links in captions — the affiliate URL stays in the bio.

require("dotenv").config({ path: ".env.local" })

const TOKEN = process.env.IG_ACCESS_TOKEN
const IG_USER_ID = process.env.IG_BUSINESS_ACCOUNT_ID
const GRAPH = "https://graph.instagram.com/v23.0"

if (!TOKEN || !IG_USER_ID) {
  throw new Error("Missing IG_ACCESS_TOKEN or IG_BUSINESS_ACCOUNT_ID in .env.local")
}

/**
 * Publish a single image post to Instagram.
 * @param {object} args
 * @param {string} args.imageUrl  public https URL to the image (jpeg/png)
 * @param {string} args.caption   caption text (<= 2200 chars), can include hashtags
 * @returns {Promise<{id: string, permalink?: string}>}
 */
async function publishImage({ imageUrl, caption }) {
  if (!imageUrl || !imageUrl.startsWith("https://")) {
    throw new Error("imageUrl must be a public https URL")
  }
  if (caption && caption.length > 2200) {
    throw new Error(`caption too long: ${caption.length}/2200`)
  }

  // 1. create media container
  const createUrl = new URL(`${GRAPH}/${IG_USER_ID}/media`)
  createUrl.searchParams.set("image_url", imageUrl)
  if (caption) createUrl.searchParams.set("caption", caption)
  createUrl.searchParams.set("access_token", TOKEN)

  const createRes = await fetch(createUrl, { method: "POST" })
  const createBody = await createRes.json()
  if (!createRes.ok || !createBody.id) {
    throw new Error(`create container failed: ${JSON.stringify(createBody)}`)
  }
  const containerId = createBody.id

  // 2. poll status (image containers should be ready quickly)
  for (let i = 0; i < 10; i++) {
    const statusUrl = new URL(`${GRAPH}/${containerId}`)
    statusUrl.searchParams.set("fields", "status_code")
    statusUrl.searchParams.set("access_token", TOKEN)
    const sRes = await fetch(statusUrl)
    const sBody = await sRes.json()
    if (sBody.status_code === "FINISHED") break
    if (sBody.status_code === "ERROR") {
      throw new Error(`media container errored: ${JSON.stringify(sBody)}`)
    }
    await new Promise((r) => setTimeout(r, 2000))
  }

  // 3. publish
  const publishUrl = new URL(`${GRAPH}/${IG_USER_ID}/media_publish`)
  publishUrl.searchParams.set("creation_id", containerId)
  publishUrl.searchParams.set("access_token", TOKEN)
  const pubRes = await fetch(publishUrl, { method: "POST" })
  const pubBody = await pubRes.json()
  if (!pubRes.ok || !pubBody.id) {
    throw new Error(`publish failed: ${JSON.stringify(pubBody)}`)
  }

  // 4. fetch permalink
  const permaUrl = new URL(`${GRAPH}/${pubBody.id}`)
  permaUrl.searchParams.set("fields", "permalink")
  permaUrl.searchParams.set("access_token", TOKEN)
  const permaRes = await fetch(permaUrl)
  const permaBody = await permaRes.json()

  return { id: pubBody.id, permalink: permaBody.permalink }
}

async function whoami() {
  const url = new URL(`${GRAPH}/${IG_USER_ID}`)
  url.searchParams.set("fields", "id,username,name,account_type,media_count,followers_count")
  url.searchParams.set("access_token", TOKEN)
  const res = await fetch(url)
  return await res.json()
}

async function main() {
  const cmd = process.argv[2]

  if (!cmd || cmd === "whoami") {
    const me = await whoami()
    console.log(JSON.stringify(me, null, 2))
    return
  }

  if (cmd === "post") {
    const imageUrl = process.argv[3]
    const captionPath = process.argv[4]
    if (!imageUrl || !captionPath) {
      console.error("usage: node scripts/publish-to-instagram.js post <imageUrl> <captionFilePath>")
      process.exit(1)
    }
    const caption = require("fs").readFileSync(captionPath, "utf8").trim()
    const result = await publishImage({ imageUrl, caption })
    console.log("PUBLISHED:", JSON.stringify(result, null, 2))
    return
  }

  console.error("unknown command. use: whoami | post")
  process.exit(1)
}

if (require.main === module) {
  main().catch((err) => {
    console.error("ERROR:", err.message)
    process.exitCode = 1
  })
}

module.exports = { publishImage, whoami }
