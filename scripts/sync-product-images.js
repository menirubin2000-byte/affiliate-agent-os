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
const { execFileSync } = require("child_process")

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = "product-images"
const IMAGES_DIR = path.join(__dirname, "..", "תמונות מוצרים")

// Short-form video length limits as of 2026-06. Generous, the actual platform
// limits are larger but operator-quality content stays under these.
const SUITABILITY_LIMITS = { tiktok: 180, reels: 90, shorts: 60 }

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

function isImage(filename) {
  return /\.(png|jpe?g|webp|gif)$/i.test(filename)
}

function isVideo(filename) {
  return /\.(mp4|mov|m4v|webm)$/i.test(filename)
}

function stripVideoExt(filename) {
  return filename.replace(/\.(mp4|mov|m4v|webm)$/i, "")
}

function videoContentType(ext) {
  const e = ext.toLowerCase().replace(/^\./, "")
  if (e === "mp4" || e === "m4v") return "video/mp4"
  if (e === "mov") return "video/quicktime"
  if (e === "webm") return "video/webm"
  return "application/octet-stream"
}

function probeVideoDuration(localPath) {
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", localPath],
      { encoding: "utf8" },
    ).trim()
    const n = Number(out)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

function suitabilityFor(durationSec) {
  if (durationSec == null) {
    // Unknown duration — best-effort: assume the file may fit anywhere.
    return ["tiktok", "reels", "shorts"]
  }
  return Object.entries(SUITABILITY_LIMITS)
    .filter(([, limit]) => durationSec <= limit)
    .map(([key]) => key)
}

// Hebrew variant: a file whose name (after extension stripping) ends with
// "בעיברית" (or "-he" / "_he") is treated as the Hebrew image for the same
// product. We strip the suffix before matching, upload it as "<slug>-he.<ext>"
// and store it in products.image_url_he.
const HE_SUFFIX_PATTERNS = [/\s*בעיברית\s*$/, /[-_]he$/i]

function detectHebrewVariant(nameWithoutExt) {
  for (const pattern of HE_SUFFIX_PATTERNS) {
    if (pattern.test(nameWithoutExt)) {
      return { isHebrew: true, base: nameWithoutExt.replace(pattern, "").trim() }
    }
  }
  return { isHebrew: false, base: nameWithoutExt }
}

function contentTypeFor(ext) {
  const e = ext.toLowerCase().replace(/^\./, "")
  if (e === "png") return "image/png"
  if (e === "jpg" || e === "jpeg") return "image/jpeg"
  if (e === "webp") return "image/webp"
  if (e === "gif") return "image/gif"
  if (e === "mp4" || e === "m4v") return "video/mp4"
  if (e === "mov") return "video/quicktime"
  if (e === "webm") return "video/webm"
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

  const allFiles = fs.readdirSync(IMAGES_DIR)
  const imageFiles = allFiles.filter((f) => isImage(f))
  const videoFiles = allFiles.filter((f) => isVideo(f))
  console.log(`Found ${imageFiles.length} image files, ${videoFiles.length} video files`)

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
  let uploadedHe = 0
  let unchanged = 0
  let unmatched = 0
  const misses = []

  for (const file of imageFiles) {
    const noExt = stripImageExt(file)
    const variant = detectHebrewVariant(noExt)
    const baseNorm = normalizeName(variant.base)
    const product = byNormalized.get(baseNorm)
    if (!product) {
      misses.push(file)
      unmatched++
      continue
    }
    const ext = path.extname(file).toLowerCase()
    const remoteName = variant.isHebrew ? `${product.slug}-he${ext}` : `${product.slug}${ext}`
    const localPath = path.join(IMAGES_DIR, file)
    const publicUrl = await uploadImage(localPath, remoteName)
    const column = variant.isHebrew ? "image_url_he" : "image_url"
    const upd = await c.query(
      `UPDATE products
       SET ${column} = $1, updated_at = now()
       WHERE id = $2 AND coalesce(${column}, '') <> $1
       RETURNING id`,
      [publicUrl, product.id],
    )
    if (upd.rows.length > 0) {
      if (variant.isHebrew) {
        uploadedHe++
        console.log(`  ✓ ${product.name.padEnd(18)} (HE) <- ${file}`)
      } else {
        uploaded++
        console.log(`  ✓ ${product.name.padEnd(18)}      <- ${file}`)
      }
    } else {
      unchanged++
      console.log(`  · ${product.name.padEnd(18)} ${variant.isHebrew ? "(HE)" : "    "} unchanged`)
    }
  }

  // ---------------- VIDEOS ----------------
  // Prefer a non-suffixed canonical file like "Shopify.mp4". Variants like
  // "Shopify1.mp4" are skipped if the canonical one was already uploaded.
  let videosUploaded = 0
  let videosUnchanged = 0
  let videosUnmatched = 0
  const videoMisses = []
  const seenVideoProduct = new Set()

  // Sort: shorter base name first, so "Shopify.mp4" wins over "Shopify1.mp4".
  const videoFilesSorted = [...videoFiles].sort(
    (a, b) => stripVideoExt(a).length - stripVideoExt(b).length || a.localeCompare(b),
  )
  const MAX_VIDEO_BYTES = 50 * 1024 * 1024 // Supabase default object limit
  // Sort ascending by file size so the SMALLEST candidate per product is tried
  // first. A 57 MB Shopify.mp4 would fail (>50MB), but a 3.2 MB Shopify1.mp4
  // succeeds — that becomes the canonical one for the product.
  const videoFilesBySize = [...videoFiles].sort(
    (a, b) =>
      fs.statSync(path.join(IMAGES_DIR, a)).size - fs.statSync(path.join(IMAGES_DIR, b)).size,
  )
  for (const file of videoFilesBySize) {
    const noExt = stripVideoExt(file)
    const baseNorm = normalizeName(noExt.replace(/\d+$/, ""))  // strip trailing digit so Shopify1 -> shopify
    const product = byNormalized.get(baseNorm) ?? byNormalized.get(normalizeName(noExt))
    if (!product) {
      videoMisses.push(file)
      videosUnmatched++
      continue
    }
    if (seenVideoProduct.has(product.id)) {
      console.log(`  · ${product.name.padEnd(18)} (VIDEO) skipped extra variant ${file}`)
      continue
    }
    const localPath = path.join(IMAGES_DIR, file)
    const sizeBytes = fs.statSync(localPath).size
    if (sizeBytes > MAX_VIDEO_BYTES) {
      console.log(
        `  ⚠ ${product.name.padEnd(18)} (VIDEO) ${file} is ${(sizeBytes / 1024 / 1024).toFixed(1)}MB > 50MB limit, skipping. Compress with ffmpeg first.`,
      )
      videoMisses.push(`${file} (too large: ${(sizeBytes / 1024 / 1024).toFixed(1)}MB)`)
      continue
    }
    seenVideoProduct.add(product.id)
    const ext = path.extname(file).toLowerCase()
    const remoteName = `${product.slug}${ext}`
    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(remoteName)}`
    const buf = fs.readFileSync(localPath)
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "Content-Type": videoContentType(ext),
        "x-upsert": "true",
      },
      body: buf,
    })
    if (!res.ok) {
      const t = await res.text()
      console.log(`  ⚠ ${product.name.padEnd(18)} (VIDEO) upload failed ${res.status}: ${t.slice(0, 80)}`)
      videoMisses.push(`${file} (upload error ${res.status})`)
      seenVideoProduct.delete(product.id)
      continue
    }
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(remoteName)}`
    const duration = probeVideoDuration(localPath)
    const suitable = suitabilityFor(duration)
    const upd = await c.query(
      `UPDATE products
       SET video_url = $1,
           video_status = 'ready',
           video_duration_seconds = $2::numeric,
           video_suitable_for = $3::text[],
           asset_synced_at = now(),
           updated_at = now()
       WHERE id = $4
       RETURNING id`,
      [publicUrl, duration, suitable, product.id],
    )
    if (upd.rows.length > 0) {
      videosUploaded++
      console.log(
        `  ✓ ${product.name.padEnd(18)} (VIDEO ${duration != null ? duration.toFixed(1) + "s" : "?dur"}) <- ${file} [${suitable.join(",") || "no platforms"}]`,
      )
    } else {
      videosUnchanged++
    }
  }

  // ---------------- ASSET STATUS PASS ----------------
  // For every real (link_ready) product, stamp image_status / video_status.
  await c.query(`
    UPDATE products SET
      image_status = CASE WHEN coalesce(image_url, '') <> '' THEN 'ready' ELSE 'missing' END,
      video_status = CASE WHEN coalesce(video_url, '') <> '' THEN 'ready' ELSE coalesce(video_status, 'missing') END,
      asset_synced_at = now()
    WHERE EXISTS (
      SELECT 1 FROM affiliate_programs ap
      WHERE ap.product_id = products.id
        AND ap.status='link_ready'
        AND coalesce(ap.affiliate_link,'') <> ''
    )
  `)

  console.log("\n=== summary ===")
  console.log(`images uploaded:  ${uploaded}  (HE: ${uploadedHe})`)
  console.log(`images unchanged: ${unchanged}`)
  console.log(`images unmatched: ${unmatched}`)
  console.log(`videos uploaded:  ${videosUploaded}`)
  console.log(`videos unchanged: ${videosUnchanged}`)
  console.log(`videos unmatched: ${videosUnmatched}`)
  if (misses.length > 0) {
    console.log("\nImage files that didn't match a product:")
    for (const m of misses) console.log(`  ${m}`)
  }
  if (videoMisses.length > 0) {
    console.log("\nVideo files that didn't match a product:")
    for (const m of videoMisses) console.log(`  ${m}`)
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
