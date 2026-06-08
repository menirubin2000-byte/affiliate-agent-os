-- Stage 62: Publish schedule policy metadata.
-- Scheduling remains gated by final_copies.status = operator_approved.
-- No live publish or published_record is created by this migration.

alter table public.publish_jobs
  add column if not exists scheduled_at timestamptz,
  add column if not exists schedule_policy_version text,
  add column if not exists schedule_notes text[] not null default '{}';

create index if not exists idx_publish_jobs_scheduled_platform
  on public.publish_jobs(platform, scheduled_at)
  where scheduled_at is not null;

create index if not exists idx_publish_jobs_scheduled_product_platform
  on public.publish_jobs(product_id, platform, scheduled_at)
  where scheduled_at is not null;
