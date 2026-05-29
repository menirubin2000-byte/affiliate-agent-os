import { randomBytes } from "node:crypto"

const sessionSecret = randomBytes(48).toString("base64url")
const passwordPattern = "Use a long unique passphrase, for example: 5+ unrelated words + numbers + symbols."

console.log("Affiliate Agent OS access gate secret helper")
console.log("")
console.log("Generated APP_SESSION_SECRET:")
console.log(sessionSecret)
console.log("")
console.log("Choose APP_ACCESS_PASSWORD yourself.")
console.log(passwordPattern)
console.log("")
console.log("Paste both values into:")
console.log("- .env.local for local staging checks")
console.log("- Vercel Project Settings -> Environment Variables for staging/preview")
console.log("")
console.log("Do not share these values. Do not commit .env.local. This helper does not write secrets to files.")
