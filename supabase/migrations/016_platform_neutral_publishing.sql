-- ============================================================
-- Migration 016: Platform-neutral publishing
--
-- Adds:
--   - publishing_jobs.published_url (platform-neutral URL)
--   - publishing_jobs.external_post_id (platform-neutral ID)
--   - publishing_jobs.target_platform expanded to support 6 platforms
--   - publishing_jobs.status expanded to support "sent"
--   - content_drafts.status expanded to support needs_review and needs_changes
--
-- MUST BE RUN MANUALLY in the Supabase SQL Editor.
-- ============================================================

-- 1. Add platform-neutral columns to publishing_jobs
alter table public.publishing_jobs
  add column if not exists published_url text,
  add column if not exists external_post_id text;

-- 2. Update target_platform constraint to allow 6 platforms + wordpress (legacy)
alter table public.publishing_jobs
  drop constraint if exists publishing_jobs_target_platform_check;

alter table public.publishing_jobs
  add constraint publishing_jobs_target_platform_check
  check (target_platform in (
    'wordpress',
    'linkedin',
    'medium',
    'substack',
    'tiktok',
    'quora',
    'reddit'
  ));

-- 3. Update status constraint to allow platform-neutral 'sent' alongside legacy 'sent_to_wordpress'
alter table public.publishing_jobs
  drop constraint if exists publishing_jobs_status_check;

alter table public.publishing_jobs
  add constraint publishing_jobs_status_check
  check (status in ('pending', 'sent', 'sent_to_wordpress', 'failed'));

-- 4. Expand content_drafts.status to support full approval workflow
alter table public.content_drafts
  drop constraint if exists content_drafts_status_check;

alter table public.content_drafts
  add constraint content_drafts_status_check
  check (status in ('draft', 'needs_review', 'approved', 'needs_changes', 'rejected'));

-- 5. Backfill published_url and external_post_id from existing wordpress columns
update public.publishing_jobs
  set published_url = wordpress_post_url
  where published_url is null and wordpress_post_url is not null;

update public.publishing_jobs
  set external_post_id = wordpress_post_id
  where external_post_id is null and wordpress_post_id is not null;

-- 6. Index for fast lookups by platform + draft
create index if not exists idx_publishing_jobs_platform_draft
  on public.publishing_jobs(target_platform, content_draft_id);

-- 7. Index for finding all published rows (where publishedUrl exists)
create index if not exists idx_publishing_jobs_published_url_not_null
  on public.publishing_jobs(content_draft_id)
  where published_url is not null;
