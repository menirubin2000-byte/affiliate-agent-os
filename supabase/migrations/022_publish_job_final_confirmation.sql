-- Stage 59: One-click final confirmation for prepared executor drafts.
-- executor_url is a private draft/editor target. It is never a published URL.

alter table public.publish_jobs
  add column if not exists executor_url text,
  add column if not exists final_confirmed_at timestamptz;

create index if not exists idx_publish_jobs_final_confirmation
  on public.publish_jobs(status, final_confirmed_at)
  where status = 'running';

