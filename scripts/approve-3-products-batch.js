// MENI batch approval — 3 products × LinkedIn/Medium/Substack (EN) = 9 posts.
//
// Per MENI's "ילאא הכל מאושר פרסם בפלטפורמות שאפשר תעשה 3 מוצרים תעצור דווח":
//   1. Pick the 3 highest-commission new Reditus products.
//   2. Approve their ready_for_operator_approval LinkedIn / Medium / Substack
//      English copies (= 9 final_copies).
//   3. Create publish_jobs in 'approved_waiting_executor' status so the
//      executor (or MENI in /dashboard/he/publish-ready) can take it from here.
//
// What we DO change:
//   - final_copies.status              -> 'operator_approved'
//   - final_copies.approved_by         -> 'MENI'
//   - final_copies.approved_at         -> now()
//   - publish_jobs                     -> insert one per approved copy
//
// What we DO NOT do:
//   - Actually post to LinkedIn / Medium / Substack. Live publishing is the
//     /dashboard/he/publish-ready + executor step. We never bypass that.
//   - Create published_records.
//   - Touch any other product's final_copies.

require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")

const PRODUCTS = ["Joiin", "Pricefy", "Geo Targetly"]
const PLATFORMS = ["linkedin", "medium", "substack"]
const LANGUAGE = "en"

const EXECUTOR_TYPE = {
  linkedin: "linkedin_official_api",
  medium: "medium_browser",
  substack: "substack_browser",
}

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await c.connect()

  let approved = 0
  let publishJobsCreated = 0
  let publishJobsUpdated = 0
  const reports = []

  for (const productName of PRODUCTS) {
    const product = (await c.query("SELECT id FROM products WHERE name = $1 LIMIT 1", [productName])).rows[0]
    if (!product) {
      console.warn(`  ! product not found: ${productName}`)
      continue
    }
    for (const platform of PLATFORMS) {
      const fc = (await c.query(
        `SELECT id, status, validation_status, blocking_reasons
         FROM final_copies
         WHERE product_id = $1 AND platform = $2 AND language = $3
           AND status IN ('ready_for_operator_approval','validated','operator_approved')
         ORDER BY version DESC LIMIT 1`,
        [product.id, platform, LANGUAGE],
      )).rows[0]
      if (!fc) {
        reports.push({ product: productName, platform, action: "no_ready_final_copy" })
        continue
      }

      // 1. Approve the final_copy (idempotent).
      if (fc.status !== "operator_approved") {
        if (fc.validation_status !== "valid" || (fc.blocking_reasons ?? []).length > 0) {
          reports.push({
            product: productName,
            platform,
            action: "skipped_invalid",
            validation_status: fc.validation_status,
            blocking_reasons: fc.blocking_reasons,
          })
          continue
        }
        await c.query(
          `UPDATE final_copies
           SET status = 'operator_approved',
               validation_status = 'valid',
               blocking_reasons = '{}',
               approved_by = 'MENI',
               approved_at = now(),
               updated_at = now()
           WHERE id = $1`,
          [fc.id],
        )
        approved++
      }

      // 2. Create publish_job (or update if it already exists).
      const existingJob = (await c.query(
        "SELECT id, status FROM publish_jobs WHERE final_copy_id = $1 LIMIT 1",
        [fc.id],
      )).rows[0]
      const executorType = EXECUTOR_TYPE[platform]
      if (!existingJob) {
        await c.query(
          `INSERT INTO publish_jobs
             (product_id, final_copy_id, platform, executor_type, status)
           VALUES ($1, $2, $3, $4, 'approved_waiting_executor')`,
          [product.id, fc.id, platform, executorType],
        )
        publishJobsCreated++
      } else if (existingJob.status === "pending_meni_approval") {
        await c.query(
          `UPDATE publish_jobs
           SET status = 'approved_waiting_executor', updated_at = now()
           WHERE id = $1`,
          [existingJob.id],
        )
        publishJobsUpdated++
      }
      reports.push({ product: productName, platform, action: "approved_and_queued", final_copy_id: fc.id })
    }
  }

  console.log("\n=== summary ===")
  console.log(`final_copies approved:  ${approved}`)
  console.log(`publish_jobs created:   ${publishJobsCreated}`)
  console.log(`publish_jobs updated:   ${publishJobsUpdated}`)
  console.log("\nper-row:")
  for (const r of reports) console.log(" ", r)

  // Sanity check: current publish_job state for these 3 products.
  const jobs = await c.query(
    `SELECT p.name, pj.platform, pj.status, pj.executor_type, pj.blocking_reason, pj.live_url
     FROM publish_jobs pj
     JOIN products p ON p.id = pj.product_id
     WHERE p.name = ANY($1::text[])
     ORDER BY p.name, pj.platform`,
    [PRODUCTS],
  )
  console.log("\npublish_jobs for the 3 products:")
  for (const j of jobs.rows) {
    console.log(
      `  ${j.name.padEnd(15)} ${j.platform.padEnd(10)} ${j.status.padEnd(28)} executor=${j.executor_type ?? "—"}`,
    )
  }

  await c.end()
}
main().catch(async (e) => { console.error(e); try { await c.end() } catch {}; process.exit(1) })
