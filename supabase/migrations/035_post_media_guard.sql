-- Stage 66b: hard media guard for visual-platform publishing.
-- No visual-platform post may be approved, scheduled, queued, or verified
-- without an attached image/media URL.

alter table public.final_copies
  add column if not exists image_url text,
  add column if not exists media_asset_url text,
  add column if not exists image_asset_path text,
  add column if not exists media_status text default 'unknown',
  add column if not exists needs_media_repair boolean not null default false;

alter table public.published_records
  add column if not exists media_asset_url text,
  add column if not exists media_status text default 'unknown',
  add column if not exists needs_media_repair boolean not null default false;

alter table public.publish_jobs
  drop constraint if exists publish_jobs_status_check;

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
  );

create index if not exists idx_final_copies_media_status
  on public.final_copies(media_status);

create index if not exists idx_published_records_media_repair
  on public.published_records(needs_media_repair, media_status);
