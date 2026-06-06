// @ts-nocheck
// Verify every ready_for_operator_approval LinkedIn / Medium / Substack
// final_copy actually passes the lib validator (not a copy of it).
import { config as dotenvConfig } from "dotenv"
dotenvConfig({ path: ".env.local" })

import { Client } from "pg"
import { validateFinalMediumArticle } from "../lib/content-review"

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

;(async () => {
  await c.connect()
  const r = await c.query(
    `SELECT fc.id, p.name AS product, fc.platform, fc.language, fc.body, fc.affiliate_link
     FROM final_copies fc
     JOIN products p ON p.id = fc.product_id
     WHERE fc.status='ready_for_operator_approval'
       AND fc.platform IN ('linkedin','medium','substack')`,
  )
  let pass = 0
  const failures: Array<{ id: string; product: string; platform: string; lang: string; reasons: string[] }> = []
  for (const row of r.rows) {
    const v = validateFinalMediumArticle({ body: row.body, finalAffiliateLink: row.affiliate_link })
    if (v.validationStatus === "valid") pass++
    else
      failures.push({
        id: row.id,
        product: row.product,
        platform: row.platform,
        lang: row.language,
        reasons: v.blockingReasons,
      })
  }
  console.log(`valid: ${pass}/${r.rows.length}`)
  if (failures.length > 0) {
    console.log(`failures (first 5):`)
    for (const f of failures.slice(0, 5)) console.log(" ", f)
  }
  await c.end()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
