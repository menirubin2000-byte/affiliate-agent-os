import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  const { PLATFORM_ROUTING_DEFINITIONS } = await import("../lib/platform-routing")
  for (const p of PLATFORM_ROUTING_DEFINITIONS) {
    console.log(p.key.padEnd(25), p.status, p.setupBlocker ?? "")
  }
}
main()
