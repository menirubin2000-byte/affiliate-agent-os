// Sync product images from the local folder to Supabase Storage and update
// products.image_url. Idempotent — safe to re-run after MENI adds more images.
//
// Folder: C:\Users\USER\Documents\אוטומציה\תמונות מוצרים\
//   filename without extension is matched against products.name (case-insensitive,
//   space/underscore/dash-normalized). Unmatched files are reported, not uploaded.

require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")
const fs = require("fs")
const path = require("path")

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = "product-images"
const IMAGES_DIR = path.join(__dirname, "..", "תמונות מוצרים")

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
}

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

// Normalize a string to a comparison key — lowercase, strip spaces / dashes /
// underscores / dots. Used for BOTH product names and filenames (after the
// extension is removed first by the caller). Stripping dots means
// "Systeme.io" and "systemeio" collide, which is what we want.
function normalizeName(s) {
  return s.toLowerCase().replace(/[\s_\-.]+/g, "")
}

function stripImageExt(filename) {
  return filename.replace(/\.(png|jpe?g|webp|gif)$/i, "")
}

function contentTypeFor(ext) {
  const e = ext.toLowerCase().replace(/^\./, "")
  if (e === "png") return "image/png"
  if (e === "jpg" || e === "jpeg") return "image/jpeg"
  if (e === "webp") return "image/webp"
  if (e === "gif") return "image/gif"
  return "application/octet-stream"
}

async function ensureBucket() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  })
  const text = await res.text()
  if (res.ok) console.log(`Created bucket: ${BUCKET}`)
  else if (text.includes("already exists") || text.includes("Duplicate")) console.log(`Bucket ${BUCKET} already exists`)
  else throw new Error(`Bucket creation failed: ${res.status} ${text}`)
}

async function uploadImage(localPath, remoteName) {
  const buf = fs.readFileSync(localPath)
  const ext = path.extname(localPath)
  const ct = contentTypeFor(ext)
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(remoteName)}`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": ct,
      "x-upsert": "true",
    },
    body: buf,
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Upload ${remoteName} failed: ${res.status} ${t}`)
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(remoteName)}`
}

async function main() {
  if (!fs.existsSync(IMAGES_DIR)) {
    throw new Error(`Images folder not found: ${IMAGES_DIR}`)
  }
  await c.connect()
  await ensureBucket()

  const files = fs
    .readdirSync(IMAGES_DIR)
    .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
  console.log(`Found ${files.length} image files`)

  // Accept any product that has at least one link_ready affiliate_program —
  // status='inactive' (e.g. Shopify) can still have a real image.
  const products = (await c.query(`
    SELECT p.id, p.name, p.slug
    FROM products p
    WHERE EXISTS (
      SELECT 1 FROM affiliate_programs ap
      WHERE ap.product_id = p.id
        AND ap.status = 'link_ready'
        AND coalesce(ap.affiliate_link, '') <> ''
    )
  `)).rows
  console.log(`Real (link_ready) products in DB: ${products.length}`)

  // build name index
  const byNormalized = new Map()
  for (const p of products) byNormalized.set(normalizeName(p.name), p)

  let uploaded = 0
  let unchanged = 0
  let unmatched = 0
  const misses = []

  for (const file of files) {
    const baseNorm = normalizeName(stripImageExt(file))
    const product = byNormalized.get(baseNorm)
    if (!product) {
      misses.push(file)
      unmatched++
      continue
    }
    const ext = path.extname(file).toLowerCase()
    const remoteName = `${product.slug}${ext}`
    const localPath = path.join(IMAGES_DIR, file)
    const publicUrl = await uploadImage(localPath, remoteName)
    const upd = await c.query(
      `UPDATE products
       SET image_url = $1, updated_at = now()
       WHERE id = $2 AND coalesce(image_url, '') <> $1
       RETURNING id`,
      [publicUrl, product.id],
    )
    if (upd.rows.length > 0) {
      uploaded++
      console.log(`  ✓ ${product.name.padEnd(18)} <- ${file}`)
    } else {
      unchanged++
      console.log(`  · ${product.name.padEnd(18)} unchanged`)
    }
  }

  console.log("\n=== summary ===")
  console.log(`uploaded/updated: ${uploaded}`)
  console.log(`unchanged:        ${unchanged}`)
  console.log(`unmatched files:  ${unmatched}`)
  if (misses.length > 0) {
    console.log("\nFiles that didn't match any active product (rename to product name to fix):")
    for (const m of misses) console.log(`  ${m}`)
  }

  // products with no image yet
  const missing = (await c.query(`
    SELECT p.name FROM products p
    WHERE coalesce(p.image_url, '') = ''
      AND EXISTS (
        SELECT 1 FROM affiliate_programs ap
        WHERE ap.product_id = p.id
          AND ap.status='link_ready'
          AND coalesce(ap.affiliate_link,'') <> ''
      )
    ORDER BY p.name
  `)).rows
  if (missing.length > 0) {
    console.log("\nActive link_ready products STILL missing an image:")
    for (const r of missing) console.log(`  - ${r.name}`)
  }

  await c.end()
}
main().catch(async (e) => { console.error(e); try { await c.end() } catch {}; process.exit(1) })
