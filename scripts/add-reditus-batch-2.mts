// One-shot batch: add the next 4 Reditus products MENI confirmed.
//
// Uses the SAME library helpers (createProduct, createAffiliateProgram) that
// the /dashboard/products/new form uses. No raw SQL, no auto-approval, no
// publish_jobs. Just metadata so the products show up in the dashboard and
// the approval pipeline can run normally.

import { config as dotenvConfig } from "dotenv"
dotenvConfig({ path: ".env.local" })

import { createAffiliateProgram, createProduct } from "../lib/db"

interface Entry {
  name: string
  slug: string
  affiliateUrl: string
  commissionRate: number  // 0..1 decimal
  category: string
  brand: string
}

const ENTRIES: Entry[] = [
  {
    name: "Joiin",
    slug: "joiin",
    affiliateUrl:
      "https://joiin.co/?red=rubinq&utm_source=rubinq&utm_medium=revshare&utm_affiliate_network=reditus",
    commissionRate: 0.4,
    category: "Accounting / Finance Reporting",
    brand: "Joiin",
  },
  {
    name: "UptimeRobot",
    slug: "uptimerobot",
    affiliateUrl: "https://uptimerobot.com/?red=rubinq",
    commissionRate: 0.2,
    category: "Website Monitoring",
    brand: "UptimeRobot",
  },
  {
    name: "Geo Targetly",
    slug: "geo-targetly",
    affiliateUrl: "https://geotargetly.com/?red=rubinq",
    commissionRate: 0.2,
    category: "Geolocation / Personalization",
    brand: "Geo Targetly",
  },
  {
    name: "Pricefy",
    slug: "pricefy",
    affiliateUrl: "https://www.pricefy.io/?red=rubinq",
    commissionRate: 0.3,
    category: "E-commerce Pricing",
    brand: "Pricefy",
  },
]

async function main() {
  console.log(`Adding ${ENTRIES.length} Reditus products...\n`)
  const summary: Array<{ name: string; productId: string; programId: string }> = []

  for (const entry of ENTRIES) {
    try {
      const product = await createProduct({
        name: entry.name,
        slug: entry.slug,
        brand: entry.brand,
        category: entry.category,
        affiliateUrl: entry.affiliateUrl,
        price: null,
        commissionRate: entry.commissionRate,
        notes: `Reditus partner, commission ${(entry.commissionRate * 100).toFixed(0)}%.`,
        targetKeyword: null,
        secondaryKeywords: [],
        searchIntent: null,
        contentAngle: null,
        status: "active",
      })
      const program = await createAffiliateProgram({
        productId: product.id,
        programName: entry.name,
        network: "Reditus",
        commissionSummary: `${(entry.commissionRate * 100).toFixed(0)}% revshare via Reditus`,
        approvalType: "instant",
        status: "link_ready",
        affiliateLink: entry.affiliateUrl,
        notes: "Imported from Reditus Marketplace.",
      })
      console.log(`✓ ${entry.name} (product=${product.id}, program=${program.id})`)
      summary.push({ name: entry.name, productId: product.id, programId: program.id })
    } catch (err) {
      console.error(`✗ ${entry.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log(`\nDone. ${summary.length}/${ENTRIES.length} added.`)
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
