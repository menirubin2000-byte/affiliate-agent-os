// Publishes one approved final_copy to Facebook by product+platform,
// then records the result back to published_records.

require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")
const { publishPhotoPost } = require("./publish-to-facebook")
const { requireDirectPublishOverride } = require("./safety-guard")

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432, database: "postgres", user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  requireDirectPublishOverride("scripts/publish-final-copy-to-fb.js")

  const product = process.argv[2]
  const sourcePlatform = process.argv[3]
  if (!product || !sourcePlatform) {
    console.error("usage: node scripts/publish-final-copy-to-fb.js <product> <sourcePlatform>")
    console.error("  example: node scripts/publish-final-copy-to-fb.js ElevenLabs quora")
    process.exit(1)
  }

  await c.connect()

  const r = await c.query(
    `select fc.id, fc.title, fc.body, fc.affiliate_link, fc.product_id,
            fc.source_content_id, fc.platform_adaptation_id,
            coalesce(fc.media_asset_url, fc.image_url, fc.image_asset_path, p.image_url_he, p.image_url) as image_url
       from final_copies fc
       join products p on p.id = fc.product_id
      where p.name = $1 and fc.platform = $2 and fc.status = 'operator_approved'
      limit 1`,
    [product, sourcePlatform],
  )

  if (!r.rows.length) {
    console.error(`No approved final_copy for ${product} | ${sourcePlatform}`)
    await c.end()
    process.exit(1)
  }

  const fc = r.rows[0]
  if (!fc.image_url || !String(fc.image_url).startsWith("https://")) {
    throw new Error("Facebook final_copy publish requires a public HTTPS image_url/media_asset_url.")
  }

  // Strip markdown headers/bold for FB-friendly plain text
  let message = fc.body
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1 → $2")
    .trim()

  console.log("--- FB MESSAGE PREVIEW ---")
  console.log(message)
  console.log("--- END PREVIEW ---")
  console.log("length:", message.length)
  console.log("affiliate link:", fc.affiliate_link)
  console.log("")

  const result = await publishPhotoPost({
    imageUrl: fc.image_url,
    caption: message,
  })

  console.log("PUBLISHED:", JSON.stringify(result, null, 2))

  // record to published_records
  try {
    await c.query(
      `insert into published_records
         (product_id, source_content_id, platform_adaptation_id, platform, live_url,
          verification_status, verified_at, final_copy_id, media_asset_url, media_status, needs_media_repair)
       values ($1,$2,$3,'facebook_page',$4,'verified',now(),$5,$6,'ready',false)
       on conflict (platform, live_url) do nothing`,
      [
        fc.product_id,
        fc.source_content_id,
        fc.platform_adaptation_id,
        result.permalink_url || `https://www.facebook.com/${result.id}`,
        fc.id,
        fc.image_url,
      ],
    )
    console.log("Recorded in published_records.")
  } catch (e) {
    console.warn("WARN: could not record:", e.message)
  }

  await c.end()
}

main().catch(async (err) => {
  console.error("ERROR:", err.message)
  try { await c.end() } catch {}
  process.exit(1)
})
