-- Stage 56: Publish jobs for one-click operator approval
-- MENI approves final copy. The system creates an execution job.
-- No published record is created until a live URL is verified.

create table if not exists public.publish_jobs (
  id uuid primary key default gen_random_uuid(),
  final_copy_id uuid not null references public.final_copies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  platform text not null
    check (platform in ('linkedin', 'medium', 'substack', 'tiktok', 'quora', 'reddit')),
  status text not null default 'pending_meni_approval'
    check (
      status in (
        'pending_meni_approval',
        'approved_waiting_executor',
        'blocked_executor_not_connected',
        'running',
        'waiting_url_verification',
        'verified',
        'failed_needs_system_fix'
      )
    ),
  executor_type text not null default 'browser_helper',
  blocking_reason text,
  approval_id uuid references public.campaign_approvals(id) on delete set null,
  live_url text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (final_copy_id)
);

create index if not exists idx_publish_jobs_final_copy_id
  on public.publish_jobs(final_copy_id);

create index if not exists idx_publish_jobs_product_platform
  on public.publish_jobs(product_id, platform);

create index if not exists idx_publish_jobs_status
  on public.publish_jobs(status);

drop trigger if exists set_publish_jobs_updated_at on public.publish_jobs;
create trigger set_publish_jobs_updated_at
before update on public.publish_jobs
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.publish_jobs to service_role;
