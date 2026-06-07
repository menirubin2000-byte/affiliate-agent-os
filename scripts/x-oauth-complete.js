// Step 2 of X OAuth 2.0 PKCE flow.
// Takes the callback URL (or just the code), exchanges it for an access token,
// and saves the access_token + refresh_token to .env.local.

require("dotenv").config({ path: ".env.local" })
const fs = require("fs")
const path = require("path")

const CLIENT_ID = process.env.X_CLIENT_ID
const CLIENT_SECRET = process.env.X_CLIENT_SECRET
const sessionPath = path.join(__dirname, "..", ".x-oauth-pending.json")
if (!fs.existsSync(sessionPath)) {
  console.error("No pending session found. Run x-oauth-init.js first.")
  process.exit(1)
}
const session = JSON.parse(fs.readFileSync(sessionPath, "utf8"))

let arg = process.argv[2]
if (!arg) {
  console.error("usage: node scripts/x-oauth-complete.js \"<callback URL or code>\"")
  process.exit(1)
}

let code = arg
let state = null
if (arg.includes("?")) {
  const u = new URL(arg)
  code = u.searchParams.get("code")
  state = u.searchParams.get("state")
  if (state && state !== session.state) {
    console.error("State mismatch — possible CSRF. Aborting.")
    process.exit(1)
  }
}
if (!code) {
  console.error("Could not extract 'code' from input.")
  process.exit(1)
}

async function main() {
  const tokenUrl = "https://api.twitter.com/2/oauth2/token"
  const body = new URLSearchParams()
  body.set("grant_type", "authorization_code")
  body.set("code", code)
  body.set("redirect_uri", session.redirect_uri)
  body.set("code_verifier", session.code_verifier)
  body.set("client_id", CLIENT_ID)

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) {
    throw new Error(`token exchange failed: ${JSON.stringify(data)}`)
  }

  console.log("Token type:", data.token_type)
  console.log("Expires in:", data.expires_in, "seconds")
  console.log("Scopes:", data.scope)

  // Save to .env.local
  const envPath = path.join(__dirname, "..", ".env.local")
  let env = fs.readFileSync(envPath, "utf8")
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  function setEnv(key, value) {
    const line = `${key}=${value}`
    if (env.match(new RegExp(`^${key}=.*$`, "m"))) {
      env = env.replace(new RegExp(`^${key}=.*$`, "m"), line)
    } else {
      env += `\n${line}`
    }
  }

  setEnv("X_ACCESS_TOKEN", data.access_token)
  if (data.refresh_token) setEnv("X_REFRESH_TOKEN", data.refresh_token)
  setEnv("X_ACCESS_TOKEN_EXPIRES_AT", expiresAt)
  setEnv("X_API_ACCESS_READY", "true")
  fs.writeFileSync(envPath, env, "utf8")

  // Clean up session file
  fs.unlinkSync(sessionPath)

  console.log("\n.env.local updated. X is now ready to publish.")
}

main().catch((err) => { console.error("ERROR:", err.message); process.exitCode = 1 })
