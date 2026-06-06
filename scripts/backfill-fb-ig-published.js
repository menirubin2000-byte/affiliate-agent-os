// Apply migration 030 + register the FB / IG posts MENI made yesterday
// (June 5, 2026) in platform_connections + published_records. They were
// posted via Graph API by an external workflow but never written back to
// AAOS — so the dashboard thinks they don't exist.
//
// What this script does (all idempotent):
//   1. Run migration 030 (multi-provider check constraint).
//   2. UPSERT platform_connections rows for facebook_page, instagram_professional,
//      pinterest, x — based on what's actually present in .env.local.
//   3. Look up the live posts on FB Graph + IG Graph (last 7 days) and
//      INSERT one published_records row for each that isn't already there.
//   4. Try to attach each one to the matching product (Shopify / ElevenLabs)
//      by message content match.
// Does NOT publish anything new. Does NOT create publish_jobs.

require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")
const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

function tokenHash(token) {
  if (!token) return null
  return "sha256:" + crypto.createHash("sha256").update(token).digest("hex").slice(0, 32)
}

async function applyMigration() {
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "migrations", "030_platform_connections_multi_provider.sql"),
    "utf8",
  )
  await c.query(sql)
  console.log("✓ migration 030 applied")
}

async function upsertConnection(provider, opts) {
  const { status, scopes = [], token, refresh, metadata = {}, accountLabel, accountUrl } = opts
  await c.query(
    `
    INSERT INTO platform_connections
      (provider, status, connected_by, connected_at, scopes,
       token_type, access_token_hash, refresh_token_present, metadata)
    VALUES ($1, $2, 'MENI', now(), $3::text[], 'bearer', $4, $5, $6::jsonb)
    ON CONFLICT (provider) DO UPDATE
    SET status = EXCLUDED.status,
        connected_at = EXCLUDED.connected_at,
        scopes = EXCLUDED.scopes,
        access_token_hash = EXCLUDED.access_token_hash,
        refresh_token_present = EXCLUDED.refresh_token_present,
        metadata = EXCLUDED.metadata,
        updated_at = now()
    `,
    [
      provider,
      status,
      scopes,
      tokenHash(token),
      Boolean(refresh),
      JSON.stringify({ ...metadata, account_label: accountLabel ?? null, account_url: accountUrl ?? null }),
    ],
  )
  console.log(`  ✓ platform_connections: ${provider} -> ${status}`)
}

async function fetchFacebookPosts() {
  const pageId = process.env.FB_PAGE_ID
  const token = process.env.FB_PAGE_ACCESS_TOKEN
  if (!pageId || !token) return []
  const since = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)
  const r = await fetch(
    `https://graph.facebook.com/v23.0/${pageId}/posts?fields=id,message,permalink_url,created_time&limit=25&since=${since}&access_token=${token}`,
  )
  const d = await r.json()
  if (d.error) {
    console.warn("  FB error:", d.error.message)
    return []
  }
  return d.data || []
}

async function fetchInstagramPosts() {
  const igId = process.env.FB_LINKED_IG_BUSINESS_ID || process.env.IG_BUSINESS_ACCOUNT_ID
  const token = process.env.FB_PAGE_ACCESS_TOKEN
  if (!igId || !token) return []
  const r = await fetch(
    `https://graph.facebook.com/v23.0/${igId}/media?fields=id,caption,media_type,permalink,timestamp&limit=10&access_token=${token}`,
  )
  const d = await r.json()
  if (d.error) {
    console.warn("  IG error:", d.error.message)
    return []
  }
  return (d.data || []).filter((p) => {
    const ts = new Date(p.timestamp).getTime()
    return ts > Date.now() - 7 * 24 * 60 * 60 * 1000
  })
}

function detectProductFromText(text) {
  if (!text) return null
  const t = text.toLowerCase()
  if (t.includes("shopify")) return "Shopify"
  if (t.includes("elevenlabs") || t.includes("eleven labs")) return "ElevenLabs"
  if (t.includes("systeme")) return "Systeme.io"
  if (t.includes("getresponse")) return "GetResponse"
  if (t.includes("willo")) return "Willo"
  return null
}

async function upsertPublishedRecord({ productName, platform, liveUrl, verifiedAt }) {
  const product = (await c.query("SELECT id FROM products WHERE name = $1", [productName])).rows[0]
  if (!product) {
    console.warn(`  ! no product '${productName}', skipping ${liveUrl}`)
    return null
  }
  const existing = await c.query(
    "SELECT id FROM published_records WHERE live_url = $1 LIMIT 1",
    [liveUrl],
  )
  if (existing.rows.length) {
    console.log(`  · ${productName} ${platform}: already in DB (${existing.rows[0].id})`)
    return existing.rows[0].id
  }
  // published_records requires source_content_id + platform_adaptation_id.
  // For manual FB / IG posts there's no per-platform adaptation row; reuse the
  // product's existing source_content and the first existing platform_adaptation
  // for any platform (we just need a non-null FK; the live_url is the truth).
  const sc = (await c.query(
    "SELECT id FROM source_contents WHERE product_id = $1 ORDER BY updated_at DESC LIMIT 1",
    [product.id],
  )).rows[0]
  if (!sc) {
    console.warn(`  ! ${productName}: no source_content row, skipping ${liveUrl}`)
    return null
  }
  const pa = (await c.query(
    "SELECT id FROM platform_adaptations WHERE source_content_id = $1 ORDER BY updated_at DESC LIMIT 1",
    [sc.id],
  )).rows[0]
  if (!pa) {
    console.warn(`  ! ${productName}: no platform_adaptation row, skipping ${liveUrl}`)
    return null
  }
  const ins = await c.query(
    `
    INSERT INTO published_records
      (product_id, source_content_id, platform_adaptation_id, platform, live_url, verification_status, verified_at)
    VALUES ($1, $2, $3, $4, $5, 'verified', $6)
    RETURNING id
    `,
    [product.id, sc.id, pa.id, platform, liveUrl, verifiedAt],
  )
  console.log(`  ✓ ${productName} ${platform}: ${ins.rows[0].id} ${liveUrl}`)
  return ins.rows[0].id
}

async function main() {
  await c.connect()

  console.log("\n=== 1. apply migration 030 ===")
  await applyMigration()

  console.log("\n=== 2. platform_connections ===")
  if (process.env.FB_PAGE_ACCESS_TOKEN) {
    await upsertConnection("facebook_page", {
      status: "connected",
      scopes: ["pages_manage_posts", "pages_read_engagement", "publish_video"],
      token: process.env.FB_PAGE_ACCESS_TOKEN,
      refresh: false,
      accountLabel: process.env.FB_PAGE_NAME,
      accountUrl: process.env.FB_PAGE_ID
        ? `https://www.facebook.com/${process.env.FB_PAGE_ID}`
        : null,
      metadata: { fb_page_id: process.env.FB_PAGE_ID, meta_app_id: process.env.META_APP_ID },
    })
  }
  if (process.env.FB_LINKED_IG_BUSINESS_ID) {
    await upsertConnection("instagram_professional", {
      status: "connected",
      scopes: ["instagram_basic", "instagram_content_publish"],
      token: process.env.FB_PAGE_ACCESS_TOKEN,
      refresh: false,
      accountLabel: process.env.IG_USERNAME,
      accountUrl: process.env.IG_USERNAME ? `https://www.instagram.com/${process.env.IG_USERNAME}` : null,
      metadata: { ig_business_id: process.env.FB_LINKED_IG_BUSINESS_ID },
    })
  }
  if (process.env.PINTEREST_ACCESS_TOKEN) {
    const status = (process.env.PINTEREST_API_ACCESS_READY === "true") ? "connected" : "api_access_not_ready"
    await upsertConnection("pinterest", {
      status,
      scopes: (process.env.PINTEREST_OAUTH_SCOPES || "boards:read,pins:read,pins:write").split(/[,\s]+/),
      token: process.env.PINTEREST_ACCESS_TOKEN,
      refresh: false,
      metadata: { trial_status: process.env.PINTEREST_TRIAL_STATUS },
    })
  }
  if (process.env.X_CLIENT_ID) {
    const status = process.env.X_API_ACCESS_READY === "true" ? "connected" : "api_access_not_ready"
    await upsertConnection("x", {
      status,
      scopes: (process.env.X_OAUTH_SCOPES || "tweet.read,tweet.write,users.read").split(/[,\s]+/),
      accountLabel: process.env.X_USERNAME,
      accountUrl: process.env.X_PROFILE_URL,
      metadata: { x_client_id: process.env.X_CLIENT_ID },
    })
  }

  console.log("\n=== 3. published_records from FB / IG (last 7 days) ===")
  const fbPosts = await fetchFacebookPosts()
  console.log(`  fetched ${fbPosts.length} FB posts`)
  for (const p of fbPosts) {
    const product = detectProductFromText(p.message)
    if (!product) {
      console.log(`  ? FB ${p.created_time}: no product match - ${p.permalink_url}`)
      continue
    }
    await upsertPublishedRecord({
      productName: product,
      platform: "facebook_page",
      liveUrl: p.permalink_url || `https://www.facebook.com/${p.id}`,
      verifiedAt: p.created_time,
    })
  }
  const igPosts = await fetchInstagramPosts()
  console.log(`  fetched ${igPosts.length} IG posts (last 7 days)`)
  for (const p of igPosts) {
    const product = detectProductFromText(p.caption)
    if (!product) {
      console.log(`  ? IG ${p.timestamp}: no product match - ${p.permalink}`)
      continue
    }
    await upsertPublishedRecord({
      productName: product,
      platform: "instagram_professional",
      liveUrl: p.permalink,
      verifiedAt: p.timestamp,
    })
  }

  console.log("\n=== summary ===")
  const summary = await c.query(
    `SELECT provider, status FROM platform_connections ORDER BY provider`,
  )
  console.log("platform_connections:")
  for (const r of summary.rows) console.log(`  ${r.provider}: ${r.status}`)

  const pubs = await c.query(
    `SELECT platform, count(*)::int n FROM published_records GROUP BY platform ORDER BY platform`,
  )
  console.log("\npublished_records:")
  for (const r of pubs.rows) console.log(`  ${r.platform}: ${r.n}`)

  await c.end()
}
main().catch(async (e) => { console.error(e); try { await c.end() } catch {}; process.exit(1) })
