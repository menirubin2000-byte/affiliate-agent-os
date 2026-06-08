import dotenv from "dotenv"
import { Client } from "pg"

dotenv.config({ path: ".env.local", quiet: true })

const VISUAL_PLATFORMS = [
  "facebook_page",
  "instagram_professional",
  "pinterest",
  "linkedin",
  "medium",
  "substack",
  "x_twitter",
]

const client = new Client({
  host: process.env.SUPABASE_DB_HOST ?? "db.gbkwydsodondarccqyet.supabase.co",
  port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
  database: process.env.SUPABASE_DB_NAME ?? "postgres",
  user: process.env.SUPABASE_DB_USER ?? "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

async function ensureSchema() {
  await client.query(`
    alter table public.final_copies
      add column if not exists image_url text,
      add column if not exists media_asset_url text,
      add column if not exists image_asset_path text,
      add column if not exists media_status text default 'unknown',
      add column if not exists needs_media_repair boolean not null default false
  `)
  await client.query(`
    alter table public.published_records
      add column if not exists media_asset_url text,
      add column if not exists media_status text default 'unknown',
      add column if not exists needs_media_repair boolean not null default false
  `)
  await client.query(`
    alter table public.publish_jobs
      drop constraint if exists publish_jobs_status_check
  `)
  await client.query(`
    alter table public.publish_jobs
      add constraint publish_jobs_status_check
      check (
        status in (
          'pending_meni_approval',
          'approved_waiting_executor',
          'blocked_executor_not_connected',
          'blocked_policy',
          'requires_auth',
          'pending_operator_confirmation',
          'running',
          'waiting_url_verification',
          'waiting_media',
          'verified',
          'needs_system_fix',
          'failed_needs_system_fix'
        )
      )
  `)
}

async function repairFinalCopies() {
  const result = await client.query(`
    update final_copies fc
       set media_asset_url = coalesce(fc.media_asset_url, fc.image_url, fc.image_asset_path, p.image_url_he, p.image_url),
           image_url = coalesce(fc.image_url, p.image_url_he, p.image_url),
           image_asset_path = coalesce(fc.image_asset_path, p.image_url_he, p.image_url),
           media_status = case
             when coalesce(fc.media_asset_url, fc.image_url, fc.image_asset_path, p.image_url_he, p.image_url) is null
               then 'missing_image'
             else 'ready'
           end,
           needs_media_repair = coalesce(fc.media_asset_url, fc.image_url, fc.image_asset_path, p.image_url_he, p.image_url) is null,
           blocking_reasons = case
             when coalesce(fc.media_asset_url, fc.image_url, fc.image_asset_path, p.image_url_he, p.image_url) is null
              and not ('image_required_for_ready' = any(fc.blocking_reasons))
               then fc.blocking_reasons || array['image_required_for_ready']::text[]
             else array_remove(fc.blocking_reasons, 'image_required_for_ready')
           end,
           updated_at = now()
      from products p
     where p.id = fc.product_id
       and fc.platform = any($1)
       and fc.status in ('validated', 'ready_for_operator_approval', 'operator_approved', 'ready_for_manual_publish', 'published_verified')
  `, [VISUAL_PLATFORMS])
  return result.rowCount ?? 0
}

async function repairScheduledQueue() {
  const exists = await client.query("select to_regclass('public.scheduled_publish_queue') as table_name")
  if (!exists.rows[0]?.table_name) return 0
  const result = await client.query(`
    update scheduled_publish_queue spq
       set media_asset_url = coalesce(spq.media_asset_url, spq.image_asset_path, fc.media_asset_url, fc.image_url, fc.image_asset_path, p.image_url_he, p.image_url),
           image_asset_path = coalesce(spq.image_asset_path, fc.image_asset_path, fc.image_url, p.image_url_he, p.image_url),
           status = case
             when coalesce(spq.media_asset_url, spq.image_asset_path, fc.media_asset_url, fc.image_url, fc.image_asset_path, p.image_url_he, p.image_url) is null
               then 'waiting_media'
             when spq.status = 'waiting_media'
               then 'scheduled'
             else spq.status
           end,
           last_error = case
             when coalesce(spq.media_asset_url, spq.image_asset_path, fc.media_asset_url, fc.image_url, fc.image_asset_path, p.image_url_he, p.image_url) is null
               then 'image_required_for_ready'
             else null
           end,
           updated_at = now()
      from final_copies fc
      join products p on p.id = fc.product_id
     where fc.id = spq.final_copy_id
       and spq.platform = any($1)
       and spq.status in ('scheduled', 'waiting_platform_connection', 'waiting_media', 'waiting_executor', 'ready_to_publish', 'publishing')
  `, [VISUAL_PLATFORMS])
  return result.rowCount ?? 0
}

async function repairPublishJobs() {
  const result = await client.query(`
    update publish_jobs pj
       set status = case
             when coalesce(fc.media_asset_url, fc.image_url, fc.image_asset_path, p.image_url_he, p.image_url) is null
               then 'waiting_media'
             when pj.status = 'waiting_media'
               then 'approved_waiting_executor'
             else pj.status
           end,
           blocking_reason = case
             when coalesce(fc.media_asset_url, fc.image_url, fc.image_asset_path, p.image_url_he, p.image_url) is null
               then 'image_required_for_ready'
             when pj.blocking_reason = 'image_required_for_ready'
               then null
             else pj.blocking_reason
           end,
           updated_at = now()
      from final_copies fc
      join products p on p.id = fc.product_id
     where fc.id = pj.final_copy_id
       and pj.platform = any($1)
       and pj.status in ('pending_meni_approval', 'approved_waiting_executor', 'pending_operator_confirmation', 'running', 'waiting_url_verification', 'waiting_media')
  `, [VISUAL_PLATFORMS])
  return result.rowCount ?? 0
}

async function flagPublishedRecords() {
  const result = await client.query(`
    update published_records pr
       set media_status = case
             when coalesce(pr.media_asset_url, '') = '' then 'missing_image'
             else 'ready'
           end,
           needs_media_repair = coalesce(pr.media_asset_url, '') = '',
           updated_at = now()
      from products p
     where p.id = pr.product_id
       and pr.platform = any($1)
       and pr.verification_status = 'verified'
       and coalesce(pr.live_url, '') <> ''
  `, [VISUAL_PLATFORMS])
  return result.rowCount ?? 0
}

async function main() {
  if (!process.env.SUPABASE_DB_PASSWORD) throw new Error("Missing SUPABASE_DB_PASSWORD.")
  await client.connect()
  try {
    await ensureSchema()
    const finalCopies = await repairFinalCopies()
    const scheduledQueue = await repairScheduledQueue()
    const publishJobs = await repairPublishJobs()
    const publishedRecords = await flagPublishedRecords()
    console.log(JSON.stringify({
      repaired_final_copies: finalCopies,
      repaired_scheduled_queue: scheduledQueue,
      repaired_publish_jobs: publishJobs,
      checked_published_records: publishedRecords,
      published_repair_policy: "attach image and update/repost only after MENI approval",
      published_no_new_posts: true,
    }, null, 2))
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
