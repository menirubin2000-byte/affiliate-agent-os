import { config } from "dotenv"
config({ path: "D:/אוטומציה/.env.local" })
import { TwitterApi } from "twitter-api-v2"

const appKey = process.env.X_CONSUMER_KEY?.trim()
const appSecret = process.env.X_CONSUMER_SECRET?.trim()
const accessToken = process.env.X_ACCESS_TOKEN?.trim()
const accessSecret = process.env.X_ACCESS_TOKEN_SECRET?.trim()

console.log("appKey:", appKey)
console.log("appSecret:", appSecret?.substring(0, 8) + "...")
console.log("accessToken:", accessToken)
console.log("accessSecret:", accessSecret?.substring(0, 8) + "...")

const client = new TwitterApi({ appKey, appSecret, accessToken, accessSecret })

try {
  const me = await client.v2.me()
  console.log("SUCCESS:", JSON.stringify(me))
} catch (e) {
  console.log("Error status:", e.code)
  console.log("Error message:", e.message)
  if (e.data) console.log("Error data:", JSON.stringify(e.data))
  if (e.rateLimit) console.log("Rate limit:", JSON.stringify(e.rateLimit))

  // Try v1.1 as fallback
  try {
    const me1 = await client.v1.verifyCredentials()
    console.log("v1.1 SUCCESS:", JSON.stringify(me1))
  } catch (e2) {
    console.log("v1.1 also failed:", e2.code, e2.message)
    if (e2.data) console.log("v1.1 data:", JSON.stringify(e2.data))
  }
}
