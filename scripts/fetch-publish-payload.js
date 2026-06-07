// Read-only: fetch the title + body + image_url + campaign_link.final_url for
// the 9 approved publish_jobs of Joiin / Pricefy / Geo Targetly. Used by the
// browser publisher to know what to paste.
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
  const product = process.argv[2]
  const platform = process.argv[3]
  if (!product || !platform) {
    console.error("usage: node scripts/fetch-publish-payload.js <product> <platform>")
    process.exit(1)
  }
  const r = await c.query(
    `SELECT
       p.name AS product, fc.platform, fc.title, fc.body, fc.affiliate_link,
       p.image_url, p.image_url_he,
       (SELECT cl.final_url FROM campaign_links cl
        WHERE cl.product_id = fc.product_id AND cl.source = fc.platform
              AND coalesce(cl.content,'') = fc.language || '_v' || fc.version
        ORDER BY cl.updated_at DESC LIMIT 1) AS campaign_url,
       pj.id AS publish_job_id, pj.status AS publish_job_status
     FROM final_copies fc
     JOIN products p ON p.id = fc.product_id
     JOIN publish_jobs pj ON pj.final_copy_id = fc.id
     WHERE p.name = $1 AND fc.platform = $2 AND fc.language = 'en'
       AND fc.status = 'operator_approved'
     LIMIT 1`,
    [product, platform],
  )
  if (!r.rows.length) { console.error("not found"); process.exit(2) }
  const row = r.rows[0]
  console.log(JSON.stringify({
    product: row.product,
    platform: row.platform,
    title: row.title,
    body: row.body,
    affiliate_link: row.affiliate_link,
    campaign_url: row.campaign_url,
    image_url: row.image_url,
    publish_job_id: row.publish_job_id,
    publish_job_status: row.publish_job_status,
  }, null, 2))
  await c.end()
})().catch(e => { console.error(e); process.exit(1) })
