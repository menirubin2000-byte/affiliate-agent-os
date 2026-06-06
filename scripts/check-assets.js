require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")
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
  const r = await c.query(`
    SELECT image_status, video_status, count(*)::int n
    FROM products
    WHERE EXISTS (
      SELECT 1 FROM affiliate_programs ap
      WHERE ap.product_id=products.id
        AND ap.status='link_ready'
        AND coalesce(ap.affiliate_link,'')<>''
    )
    GROUP BY image_status, video_status
    ORDER BY image_status, video_status
  `)
  console.log("asset status breakdown:")
  for (const x of r.rows) console.log(" ", x)
  const v = await c.query(`
    SELECT name, video_duration_seconds, video_suitable_for
    FROM products WHERE video_status='ready'
  `)
  console.log("ready videos:")
  for (const x of v.rows) console.log(" ", x)
  await c.end()
})().catch((e) => { console.error(e); process.exit(1) })
