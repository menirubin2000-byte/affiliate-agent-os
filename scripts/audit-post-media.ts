import dotenv from "dotenv"
import { Client } from "pg"

dotenv.config({ path: ".env.local", quiet: true })

type Row = Record<string, unknown>

const VISUAL_PLATFORMS = new Set([
  "facebook_page",
  "instagram_professional",
  "pinterest",
  "linkedin",
  "medium",
  "substack",
  "x_twitter",
])

const client = new Client({
  host: process.env.SUPABASE_DB_HOST ?? "db.gbkwydsodondarccqyet.supabase.co",
  port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
  database: process.env.SUPABASE_DB_NAME ?? "postgres",
  user: process.env.SUPABASE_DB_USER ?? "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function imageSource(row: Row) {
  const sources = [
    ["final_copy.media_asset_url", text(row.final_copy_media_asset_url)],
    ["final_copy.image_url", text(row.final_copy_image_url)],
    ["final_copy.image_asset_path", text(row.final_copy_image_asset_path)],
    ["product.image_url_he", text(row.product_image_url_he)],
    ["product.image_url", text(row.product_image_url)],
  ] as const
  return sources.find(([, value]) => value)
}

function toFinding(scope: string, row: Row) {
  const source = imageSource(row)
  return {
    scope,
    product_name: text(row.product_name) || "(unknown product)",
    platform: text(row.platform),
    final_copy_id: text(row.final_copy_id) || null,
    status: text(row.status) || null,
    has_image: Boolean(source),
    image_source: source?.[0] ?? null,
    missing_reason: source ? null : "needs_image_generation_or_media_upload",
    record_id: text(row.id) || null,
    live_url: text(row.live_url) || null,
  }
}

function toPublishedFinding(row: Row) {
  const mediaAsset = text(row.published_media_asset_url)
  return {
    scope: "published_records",
    product_name: text(row.product_name) || "(unknown product)",
    platform: text(row.platform),
    final_copy_id: text(row.final_copy_id) || null,
    status: text(row.status) || null,
    has_image: Boolean(mediaAsset),
    image_source: mediaAsset ? "published_records.media_asset_url" : null,
    missing_reason: mediaAsset ? null : "published_record_has_no_media_asset",
    record_id: text(row.id) || null,
    live_url: text(row.live_url) || null,
  }
}

async function hasColumn(table: string, column: string) {
  const result = await client.query(
    `select exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = $1 and column_name = $2
     ) as exists`,
    [table, column],
  )
  return Boolean(result.rows[0]?.exists)
}

async function finalCopyColumns(prefix = "fc") {
  const hasImageUrl = await hasColumn("final_copies", "image_url")
  const hasMediaAssetUrl = await hasColumn("final_copies", "media_asset_url")
  const hasImageAssetPath = await hasColumn("final_copies", "image_asset_path")
  return {
    imageUrl: hasImageUrl ? `${prefix}.image_url` : "null",
    mediaAssetUrl: hasMediaAssetUrl ? `${prefix}.media_asset_url` : "null",
    imageAssetPath: hasImageAssetPath ? `${prefix}.image_asset_path` : "null",
  }
}

async function publishedRecordColumns(prefix = "pr") {
  const hasMediaAssetUrl = await hasColumn("published_records", "media_asset_url")
  return {
    mediaAssetUrl: hasMediaAssetUrl ? `${prefix}.media_asset_url` : "null",
  }
}

async function auditFinalCopies() {
  const cols = await finalCopyColumns()
  const result = await client.query(`
    select
      fc.id,
      fc.id as final_copy_id,
      p.name as product_name,
      fc.platform,
      fc.status,
      ${cols.mediaAssetUrl} as final_copy_media_asset_url,
      ${cols.imageUrl} as final_copy_image_url,
      ${cols.imageAssetPath} as final_copy_image_asset_path,
      p.image_url as product_image_url,
      p.image_url_he as product_image_url_he,
      null::text as live_url
    from final_copies fc
    join products p on p.id = fc.product_id
    where fc.platform = any($1)
      and fc.status in ('validated', 'ready_for_operator_approval', 'operator_approved', 'ready_for_manual_publish', 'published_verified')
    order by p.name, fc.platform
  `, [Array.from(VISUAL_PLATFORMS)])
  return result.rows.map((row) => toFinding("final_copies", row))
}

async function auditApprovalItems() {
  const result = await client.query(`
    select
      ai.id,
      null::uuid as final_copy_id,
      p.name as product_name,
      ai.platform,
      ai.status,
      null::text as final_copy_media_asset_url,
      null::text as final_copy_image_url,
      null::text as final_copy_image_asset_path,
      p.image_url as product_image_url,
      p.image_url_he as product_image_url_he,
      null::text as live_url
    from approval_items ai
    left join products p on p.id = ai.product_id
    where ai.platform = any($1)
      and ai.approval_type like 'publish_%'
      and ai.status in ('waiting_approval', 'approved')
    order by p.name, ai.platform
  `, [Array.from(VISUAL_PLATFORMS)])
  return result.rows.map((row) => toFinding("approval_items", row))
}

async function auditPublishJobs() {
  const cols = await finalCopyColumns()
  const result = await client.query(`
    select
      pj.id,
      pj.final_copy_id,
      p.name as product_name,
      pj.platform,
      pj.status,
      ${cols.mediaAssetUrl} as final_copy_media_asset_url,
      ${cols.imageUrl} as final_copy_image_url,
      ${cols.imageAssetPath} as final_copy_image_asset_path,
      p.image_url as product_image_url,
      p.image_url_he as product_image_url_he,
      pj.live_url
    from publish_jobs pj
    join final_copies fc on fc.id = pj.final_copy_id
    join products p on p.id = pj.product_id
    where pj.platform = any($1)
      and pj.status in ('pending_meni_approval', 'approved_waiting_executor', 'pending_operator_confirmation', 'running', 'waiting_url_verification', 'waiting_media')
    order by p.name, pj.platform
  `, [Array.from(VISUAL_PLATFORMS)])
  return result.rows.map((row) => toFinding("publish_jobs", row))
}

async function auditScheduledQueue() {
  const exists = await client.query("select to_regclass('public.scheduled_publish_queue') as table_name")
  if (!exists.rows[0]?.table_name) return []
  const result = await client.query(`
    select
      spq.id,
      spq.final_copy_id,
      p.name as product_name,
      spq.platform,
      spq.status,
      spq.media_asset_url as final_copy_media_asset_url,
      null::text as final_copy_image_url,
      spq.image_asset_path as final_copy_image_asset_path,
      p.image_url as product_image_url,
      p.image_url_he as product_image_url_he,
      null::text as live_url
    from scheduled_publish_queue spq
    join products p on p.id = spq.product_id
    where spq.platform = any($1)
      and spq.status in ('scheduled', 'waiting_platform_connection', 'waiting_media', 'waiting_executor', 'ready_to_publish', 'publishing')
    order by p.name, spq.platform
  `, [Array.from(VISUAL_PLATFORMS)])
  return result.rows.map((row) => toFinding("scheduled_publish_queue", row))
}

async function auditPublishedRecords() {
  const cols = await publishedRecordColumns()
  const result = await client.query(`
    select
      pr.id,
      pr.final_copy_id,
      p.name as product_name,
      pr.platform,
      pr.verification_status as status,
      ${cols.mediaAssetUrl} as published_media_asset_url,
      p.image_url as product_image_url,
      p.image_url_he as product_image_url_he,
      pr.live_url
    from published_records pr
    left join final_copies fc on fc.id = pr.final_copy_id
    join products p on p.id = pr.product_id
    where pr.platform = any($1)
      and pr.verification_status = 'verified'
      and coalesce(pr.live_url, '') <> ''
    order by p.name, pr.platform
  `, [Array.from(VISUAL_PLATFORMS)])
  return result.rows.map((row) => toPublishedFinding(row))
}

async function main() {
  if (!process.env.SUPABASE_DB_PASSWORD) throw new Error("Missing SUPABASE_DB_PASSWORD.")
  await client.connect()
  try {
    const sections = []
    sections.push(await auditFinalCopies())
    sections.push(await auditApprovalItems())
    sections.push(await auditPublishJobs())
    sections.push(await auditScheduledQueue())
    sections.push(await auditPublishedRecords())
    const all = sections.flat()
    const missing = all.filter((row) => !row.has_image)
    const publishedMissingImage = all.filter((row) => row.scope === "published_records" && !row.has_image)
    const summary = {
      total_checked: all.length,
      missing_images: missing.length,
      published_missing_image: publishedMissingImage,
      by_scope: all.reduce<Record<string, { checked: number; missing: number }>>((acc, row) => {
        acc[row.scope] ??= { checked: 0, missing: 0 }
        acc[row.scope].checked += 1
        if (!row.has_image) acc[row.scope].missing += 1
        return acc
      }, {}),
      missing,
    }
    console.log(JSON.stringify(summary, null, 2))
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
