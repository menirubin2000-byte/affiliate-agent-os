// Step 1 of X OAuth 2.0 PKCE flow.
// Generates a PKCE code_verifier + code_challenge, prints the authorization URL,
// and writes a pending session to .x-oauth-pending.json for the callback step.

require("dotenv").config({ path: ".env.local" })
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

const CLIENT_ID = process.env.X_CLIENT_ID
const REDIRECT_URI = process.env.X_REDIRECT_URI || "https://affiliate-agent-os.vercel.app/api/auth/x/callback"
const SCOPES = process.env.X_OAUTH_SCOPES || "tweet.write tweet.read users.read offline.access"

if (!CLIENT_ID) throw new Error("Missing X_CLIENT_ID in .env.local")

function base64url(buf) {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

const codeVerifier = base64url(crypto.randomBytes(48))
const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest())
const state = base64url(crypto.randomBytes(16))

const url = new URL("https://twitter.com/i/oauth2/authorize")
url.searchParams.set("response_type", "code")
url.searchParams.set("client_id", CLIENT_ID)
url.searchParams.set("redirect_uri", REDIRECT_URI)
url.searchParams.set("scope", SCOPES)
url.searchParams.set("state", state)
url.searchParams.set("code_challenge", codeChallenge)
url.searchParams.set("code_challenge_method", "S256")

const session = {
  state,
  code_verifier: codeVerifier,
  code_challenge: codeChallenge,
  redirect_uri: REDIRECT_URI,
  scopes: SCOPES,
  created_at: new Date().toISOString(),
}
fs.writeFileSync(path.join(__dirname, "..", ".x-oauth-pending.json"), JSON.stringify(session, null, 2))

console.log("=== X OAuth 2.0 — open this URL in your browser ===")
console.log(url.toString())
console.log("")
console.log("After authorizing you will be redirected to:")
console.log("  " + REDIRECT_URI + "?state=" + state + "&code=...")
console.log("")
console.log("The redirect may show an error page — that's OK.")
console.log("Copy the full URL from the address bar (it contains code=) and run:")
console.log("  node scripts/x-oauth-complete.js \"<full callback URL>\"")
