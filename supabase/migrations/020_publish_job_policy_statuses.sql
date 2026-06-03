-- Stage 57: Explicit publish job block statuses
-- Publishing can be blocked by platform policy or by a required system fix.
-- These statuses do not create published records and do not assign manual work to MENI.

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
      'running',
      'waiting_url_verification',
      'verified',
      'needs_system_fix',
      'failed_needs_system_fix'
    )
  );

create index if not exists idx_publish_jobs_blocking_reason
  on public.publish_jobs(blocking_reason);
