#!/usr/bin/env node
/**
 * Stage 44: Apply migration 011 (affiliate_programs table) and seed
 * affiliate program records for the 10 Stage 43 imported products.
 *
 * Usage:
 *   node scripts/stage44-migrate-and-seed.mjs <DB_PASSWORD>
 */

import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_REF = "gbkwydsodondarccqyet"

const password = process.argv[2]
if (!password) {
  console.error("Usage: node scripts/stage44-migrate-and-seed.mjs <DB_PASSWORD>")
  process.exit(1)
}

const migrationsDir = join(__dirname, "..", "supabase", "migrations")

async function main() {
  console.log("Connecting to Supabase PostgreSQL...")

  const client = new pg.Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log("Connected.\n")

    // 1. Apply migration 011
    const migrationFile = "011_affiliate_program_tracking.sql"
    const sql = readFileSync(join(migrationsDir, migrationFile), "utf8")
    console.log(`Running ${migrationFile}...`)
    await client.query(sql)
    console.log(`  ${migrationFile} done.\n`)

    // 2. Verify table exists
    const { rows: tables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'affiliate_programs'
    `)
    if (tables.length === 0) {
      console.error("affiliate_programs table not found after migration!")
      process.exit(1)
    }
    console.log("affiliate_programs table confirmed.\n")

    // 3. Get the Stage 43 products to link affiliate programs
    const { rows: products } = await client.query(`
      SELECT id, name FROM public.products ORDER BY created_at DESC LIMIT 20
    `)
    console.log(`Found ${products.length} products. Mapping to affiliate programs...\n`)

    // Product name -> affiliate program data mapping
    const programData = [
      {
        productName: "Jasper AI",
        programName: "Jasper AI Partner Program",
        programUrl: "https://www.jasper.ai/partners",
        signupUrl: "https://www.jasper.ai/partners",
        network: "Direct / Impact",
        commissionSummary: "30% recurring commission",
        cookieDuration: "30 days",
        approvalType: "manual_review",
        status: "signup_needed",
      },
      {
        productName: "Surfer SEO",
        programName: "Surfer SEO Affiliate Program",
        programUrl: "https://surferseo.com/affiliate-program",
        signupUrl: "https://surferseo.com/affiliate-program",
        network: "Direct",
        commissionSummary: "25% recurring commission",
        cookieDuration: "60 days",
        approvalType: "manual_review",
        status: "signup_needed",
      },
      {
        productName: "Notion",
        programName: "Notion Affiliate Program",
        programUrl: "https://www.notion.so/affiliates",
        signupUrl: "https://www.notion.so/affiliates",
        network: "Direct / Impact",
        commissionSummary: "50% first-year commission",
        cookieDuration: "90 days",
        approvalType: "manual_review",
        status: "research_needed",
      },
      {
        productName: "Loom",
        programName: "Loom Affiliate Program",
        programUrl: "https://www.loom.com/partners",
        signupUrl: "https://www.loom.com/partners",
        network: "Direct",
        commissionSummary: "20% recurring commission",
        cookieDuration: "30 days",
        approvalType: "unknown",
        status: "research_needed",
      },
      {
        productName: "Grammarly",
        programName: "Grammarly Affiliate Program",
        programUrl: "https://www.grammarly.com/affiliates",
        signupUrl: "https://www.grammarly.com/affiliates",
        network: "ShareASale / CJ",
        commissionSummary: "$20 per Premium signup, $0.20 per free signup",
        cookieDuration: "90 days",
        approvalType: "manual_review",
        status: "signup_needed",
      },
      {
        productName: "Canva",
        programName: "Canva Affiliate Program",
        programUrl: "https://www.canva.com/affiliates",
        signupUrl: "https://www.canva.com/affiliates",
        network: "Impact",
        commissionSummary: "Up to 80% first purchase, 15% recurring",
        cookieDuration: "30 days",
        approvalType: "manual_review",
        status: "signup_needed",
      },
      {
        productName: "Descript",
        programName: "Descript Affiliate Program",
        programUrl: "https://www.descript.com/affiliates",
        signupUrl: "https://www.descript.com/affiliates",
        network: "Direct / PartnerStack",
        commissionSummary: "30% recurring commission",
        cookieDuration: "30 days",
        approvalType: "manual_review",
        status: "research_needed",
      },
      {
        productName: "Ahrefs",
        programName: "Ahrefs Affiliate Program",
        programUrl: "https://ahrefs.com/affiliates",
        signupUrl: "https://ahrefs.com/affiliates",
        network: "Direct",
        commissionSummary: "Closed (referral rewards only)",
        cookieDuration: "N/A",
        approvalType: "closed",
        status: "research_needed",
      },
      {
        productName: "Zapier",
        programName: "Zapier Affiliate Program",
        programUrl: "https://zapier.com/platform/partner-program",
        signupUrl: "https://zapier.com/platform/partner-program",
        network: "Direct / Impact",
        commissionSummary: "Up to $100 per referral",
        cookieDuration: "90 days",
        approvalType: "manual_review",
        status: "signup_needed",
      },
      {
        productName: "Riverside",
        programName: "Riverside.fm Affiliate Program",
        programUrl: "https://riverside.fm/affiliates",
        signupUrl: "https://riverside.fm/affiliates",
        network: "Direct / PartnerStack",
        commissionSummary: "30% recurring commission",
        cookieDuration: "30 days",
        approvalType: "manual_review",
        status: "signup_needed",
      },
    ]

    let seeded = 0
    for (const prog of programData) {
      // Find product by name
      const product = products.find(
        (p) => p.name.toLowerCase() === prog.productName.toLowerCase(),
      )
      const productId = product ? product.id : null

      // Check if already exists
      const { rows: existing } = await client.query(
        `SELECT id FROM public.affiliate_programs WHERE program_name = $1 LIMIT 1`,
        [prog.programName],
      )
      if (existing.length > 0) {
        console.log(`  Skip: "${prog.programName}" already exists.`)
        continue
      }

      await client.query(
        `INSERT INTO public.affiliate_programs
          (product_id, program_name, program_url, signup_url, network,
           commission_summary, cookie_duration, approval_type, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          productId,
          prog.programName,
          prog.programUrl,
          prog.signupUrl,
          prog.network,
          prog.commissionSummary,
          prog.cookieDuration,
          prog.approvalType,
          prog.status,
        ],
      )
      console.log(`  Seeded: "${prog.programName}" (${prog.status})${productId ? ` -> ${product.name}` : ""}`)
      seeded++
    }

    console.log(`\nSeeded ${seeded} affiliate program records.`)

    // 4. Final count
    const { rows: countRows } = await client.query(
      `SELECT count(*)::int as count FROM public.affiliate_programs`,
    )
    console.log(`Total affiliate programs in DB: ${countRows[0].count}`)

    console.log("\nStage 44 migration and seed complete.")
  } catch (err) {
    console.error("Error:", err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
