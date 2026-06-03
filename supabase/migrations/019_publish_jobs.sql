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

with executor_state as (
  select exists (
    select 1
    from public.browser_sessions
    where status = 'connected'
      and last_seen_at >= now() - interval '10 minutes'
  ) as is_connected
),
approved_final_copies as (
  select
    final_copies.id as final_copy_id,
    final_copies.product_id,
    final_copies.platform,
    (
      select campaign_approvals.id
      from public.campaign_approvals
      where campaign_approvals.product_id = final_copies.product_id
        and campaign_approvals.status = 'approved'
        and final_copies.platform = any(campaign_approvals.approved_platforms)
      order by campaign_approvals.approved_at desc nulls last, campaign_approvals.updated_at desc
      limit 1
    ) as approval_id
  from public.final_copies
  where final_copies.status in ('operator_approved', 'ready_for_manual_publish')
    and final_copies.validation_status = 'valid'
)
insert into public.publish_jobs (
  final_copy_id,
  product_id,
  platform,
  status,
  executor_type,
  blocking_reason,
  approval_id
)
select
  approved_final_copies.final_copy_id,
  approved_final_copies.product_id,
  approved_final_copies.platform,
  case
    when executor_state.is_connected then 'approved_waiting_executor'
    else 'blocked_executor_not_connected'
  end,
  'browser_helper',
  case
    when executor_state.is_connected then null
    else 'executor_not_connected'
  end,
  approved_final_copies.approval_id
from approved_final_copies
cross join executor_state
on conflict (final_copy_id) do update
set
  product_id = excluded.product_id,
  platform = excluded.platform,
  status = case
    when public.publish_jobs.status in ('verified', 'running', 'waiting_url_verification') then public.publish_jobs.status
    else excluded.status
  end,
  executor_type = excluded.executor_type,
  blocking_reason = case
    when public.publish_jobs.status in ('verified', 'running', 'waiting_url_verification') then public.publish_jobs.blocking_reason
    else excluded.blocking_reason
  end,
  approval_id = excluded.approval_id,
  updated_at = now();
