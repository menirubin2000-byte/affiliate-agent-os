// Fetches all Facebook Pages the user has access to, with their Page Access Tokens.
// Then updates .env.local with the first matching page (or all of them).

require("dotenv").config({ path: ".env.local" })
const fs = require("fs")
const path = require("path")

const USER_TOKEN = process.env.META_USER_ACCESS_TOKEN
if (!USER_TOKEN) throw new Error("META_USER_ACCESS_TOKEN missing in .env.local")

const GRAPH = "https://graph.facebook.com/v23.0"

async function listPages() {
  const url = new URL(`${GRAPH}/me/accounts`)
  url.searchParams.set("fields", "id,name,access_token,category,tasks,connected_instagram_account{id,username}")
  url.searchParams.set("access_token", USER_TOKEN)
  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok) throw new Error(`me/accounts failed: ${JSON.stringify(body)}`)
  return body.data || []
}

function maskToken(t) {
  if (!t) return ""
  return t.slice(0, 8) + "..." + t.slice(-6)
}

async function main() {
  const pages = await listPages()

  if (!pages.length) {
    console.log("NO PAGES FOUND. Create a Facebook Page first at https://www.facebook.com/pages/create")
    return
  }

  console.log(`Found ${pages.length} page(s):\n`)
  for (const p of pages) {
    console.log(`  - ${p.name}`)
    console.log(`    id: ${p.id}`)
    console.log(`    category: ${p.category || "n/a"}`)
    console.log(`    page_token: ${maskToken(p.access_token)}`)
    if (p.connected_instagram_account) {
      console.log(`    instagram: @${p.connected_instagram_account.username} (id: ${p.connected_instagram_account.id})`)
    }
    console.log("")
  }

  // Write all page tokens to a private file for reference
  const dumpPath = path.join(__dirname, "..", "facebook-pages.private.json")
  fs.writeFileSync(dumpPath, JSON.stringify(pages, null, 2), "utf8")
  console.log(`Full data saved to ${dumpPath} (gitignored).`)

  // Pick the first page to wire into .env.local
  const target = pages[0]

  const envPath = path.join(__dirname, "..", ".env.local")
  let env = fs.readFileSync(envPath, "utf8")
  env = env.replace(/^FB_PAGE_ID=.*$/m, `FB_PAGE_ID=${target.id}`)
  env = env.replace(/^FB_PAGE_NAME=.*$/m, `FB_PAGE_NAME=${target.name}`)
  env = env.replace(/^FB_PAGE_ACCESS_TOKEN=.*$/m, `FB_PAGE_ACCESS_TOKEN=${target.access_token}`)
  env = env.replace(/^FB_API_ACCESS_READY=.*$/m, `FB_API_ACCESS_READY=true`)
  fs.writeFileSync(envPath, env, "utf8")
  console.log(`\nWired into .env.local: ${target.name} (${target.id})`)
}

main().catch((err) => {
  console.error("ERROR:", err.message)
  process.exitCode = 1
})
