// Refresh Facebook tokens using App Secret.
// 1. Exchange short-lived user token → long-lived user token (60 days)
// 2. Use long-lived user token to fetch page tokens (long-lived, no expiration)
// 3. Update .env.local

require("dotenv").config({ path: ".env.local" })
const fs = require("fs")
const path = require("path")

const APP_ID = process.env.META_APP_ID
const APP_SECRET = process.env.META_APP_SECRET
const USER_TOKEN = process.env.META_USER_ACCESS_TOKEN
const GRAPH = "https://graph.facebook.com/v23.0"

if (!APP_ID || !APP_SECRET || !USER_TOKEN) {
  throw new Error("Missing META_APP_ID, META_APP_SECRET, or META_USER_ACCESS_TOKEN")
}

async function exchangeForLongLivedUser() {
  const url = new URL(`${GRAPH}/oauth/access_token`)
  url.searchParams.set("grant_type", "fb_exchange_token")
  url.searchParams.set("client_id", APP_ID)
  url.searchParams.set("client_secret", APP_SECRET)
  url.searchParams.set("fb_exchange_token", USER_TOKEN)
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || !data.access_token) {
    throw new Error(`exchange failed: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

async function getPages(userToken) {
  const url = new URL(`${GRAPH}/me/accounts`)
  url.searchParams.set(
    "fields",
    "id,name,access_token,category,connected_instagram_account{id,username},instagram_business_account{id,username}",
  )
  url.searchParams.set("access_token", userToken)
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(`me/accounts: ${JSON.stringify(data)}`)
  return data.data || []
}

async function debugToken(token) {
  const url = new URL(`${GRAPH}/debug_token`)
  url.searchParams.set("input_token", token)
  url.searchParams.set("access_token", `${APP_ID}|${APP_SECRET}`)
  const res = await fetch(url)
  return await res.json()
}

function maskToken(t) {
  return t ? t.slice(0, 8) + "..." + t.slice(-6) : ""
}

async function main() {
  console.log("Exchanging for long-lived user token...")
  const longUserToken = await exchangeForLongLivedUser()
  console.log("  got:", maskToken(longUserToken))

  const userInfo = await debugToken(longUserToken)
  if (userInfo.data && userInfo.data.expires_at) {
    const expires = new Date(userInfo.data.expires_at * 1000)
    console.log("  expires:", expires.toISOString())
  }

  console.log("\nFetching pages with long-lived user token...")
  const pages = await getPages(longUserToken)
  console.log(`  ${pages.length} pages`)

  const target = pages.find((p) => p.id === process.env.FB_PAGE_ID) || pages[0]
  if (!target) throw new Error("no pages available")

  console.log(`\nSelected page: ${target.name} (${target.id})`)
  console.log("  page token:", maskToken(target.access_token))

  const pageInfo = await debugToken(target.access_token)
  if (pageInfo.data) {
    const expires_at = pageInfo.data.expires_at
    if (!expires_at || expires_at === 0) {
      console.log("  expires: NEVER (long-lived page token)")
    } else {
      console.log("  expires:", new Date(expires_at * 1000).toISOString())
    }
  }

  // Capture IG business account ID if linked
  let igBizId = null
  if (target.instagram_business_account?.id) {
    igBizId = target.instagram_business_account.id
    console.log(`  instagram_business_account: @${target.instagram_business_account.username} (${igBizId})`)
  }

  // Update .env.local
  const envPath = path.join(__dirname, "..", ".env.local")
  let env = fs.readFileSync(envPath, "utf8")
  env = env.replace(/^META_USER_ACCESS_TOKEN=.*$/m, `META_USER_ACCESS_TOKEN=${longUserToken}`)
  env = env.replace(/^FB_PAGE_ID=.*$/m, `FB_PAGE_ID=${target.id}`)
  env = env.replace(/^FB_PAGE_NAME=.*$/m, `FB_PAGE_NAME=${target.name}`)
  env = env.replace(/^FB_PAGE_ACCESS_TOKEN=.*$/m, `FB_PAGE_ACCESS_TOKEN=${target.access_token}`)
  env = env.replace(/^FB_API_ACCESS_READY=.*$/m, `FB_API_ACCESS_READY=true`)
  if (igBizId) {
    if (env.includes("FB_LINKED_IG_BUSINESS_ID=")) {
      env = env.replace(/^FB_LINKED_IG_BUSINESS_ID=.*$/m, `FB_LINKED_IG_BUSINESS_ID=${igBizId}`)
    } else {
      env += `\nFB_LINKED_IG_BUSINESS_ID=${igBizId}\n`
    }
  }
  fs.writeFileSync(envPath, env, "utf8")
  console.log("\n.env.local updated.")
}

main().catch((err) => { console.error("ERROR:", err.message); process.exitCode = 1 })
