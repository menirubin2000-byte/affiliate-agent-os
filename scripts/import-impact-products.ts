import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import { config } from "dotenv"

import { upsertImpactProductCandidates } from "@/lib/impact-product-candidates-db"
import {
  fetchImpactProductsFromApi,
  parseImpactProductsCsv,
  parseImpactProductsPayload,
} from "@/lib/impact-product-importer"

config({ path: ".env.local", quiet: true })

async function main() {
  const sourceFile = process.argv[2] || process.env.IMPACT_PRODUCTS_SOURCE_FILE
  const apiEndpoint = process.env.IMPACT_API_PRODUCTS_URL
  let products = []

  if (sourceFile) {
    const absolute = path.resolve(sourceFile)
    const body = await fs.readFile(absolute, "utf8")
    products = absolute.endsWith(".json")
      ? parseImpactProductsPayload(JSON.parse(body))
      : parseImpactProductsCsv(body)
  } else if (apiEndpoint) {
    products = await fetchImpactProductsFromApi({
      endpoint: apiEndpoint,
      accountSid: process.env.IMPACT_ACCOUNT_SID,
      authToken: process.env.IMPACT_AUTH_TOKEN,
      pageLimit: Number(process.env.IMPACT_API_PAGE_LIMIT || 25),
    })
  } else {
    throw new Error("Provide IMPACT_PRODUCTS_SOURCE_FILE, a file argument, or IMPACT_API_PRODUCTS_URL.")
  }

  const result = await upsertImpactProductCandidates(products)
  console.log(JSON.stringify({ scanned: products.length, ...result }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
