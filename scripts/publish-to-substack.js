require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")

// Substack does not expose a safe general-purpose publishing API for this app.
// This script reports eligible items as executor-blocked. It must not turn
// publishing into a MENI copy/paste/manual URL collection task.

async function main() {
  const db = new Client({
    host: "db.gbkwydsodondarccqyet.supabase.co",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  })

  await db.connect()

  const copies = await db.query(`
    SELECT fc.id, fc.title, p.name as product
    FROM final_copies fc
    JOIN products p ON fc.product_id = p.id
    LEFT JOIN published_records pr ON pr.final_copy_id = fc.id
    WHERE fc.platform = 'substack'
      AND fc.status = 'operator_approved'
      AND pr.id IS NULL
  `)

  console.log("Substack posts blocked by executor:", copies.rows.length)
  console.log("Reason: substack_official_executor_not_connected")
  console.log("MENI action: none. Do not assign copy/paste publishing work.")
  console.log("")

  for (const copy of copies.rows) {
    console.log("---")
    console.log("Product:", copy.product)
    console.log("Title:", copy.title)
    console.log("Status: blocked_executor_not_connected")
  }

  await db.end()
}

main().catch((e) => {
  console.error("ERROR:", e.message)
  process.exit(1)
})
