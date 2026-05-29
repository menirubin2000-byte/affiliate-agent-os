create table if not exists public.publishing_jobs (
  id uuid primary key default gen_random_uuid(),
  content_draft_id uuid not null references public.content_drafts(id) on delete cascade,
  target_platform text not null default 'wordpress',
  status text not null default 'pending',
  wordpress_post_id text,
  wordpress_post_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publishing_jobs_target_platform_check
    check (target_platform in ('wordpress')),
  constraint publishing_jobs_status_check
    check (status in ('pending', 'sent_to_wordpress', 'failed'))
);

create index if not exists idx_publishing_jobs_content_draft_id
  on public.publishing_jobs(content_draft_id);

create index if not exists idx_publishing_jobs_status
  on public.publishing_jobs(status);

create index if not exists idx_publishing_jobs_target_platform
  on public.publishing_jobs(target_platform);

drop trigger if exists set_publishing_jobs_updated_at on public.publishing_jobs;
create trigger set_publishing_jobs_updated_at
before update on public.publishing_jobs
for each row
execute function public.set_updated_at();
