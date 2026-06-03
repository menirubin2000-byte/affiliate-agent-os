-- Stage 58: Executor authentication and final confirmation states
-- These states keep MENI one-click only. They do not create published records.

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
      'verified',
      'needs_system_fix',
      'failed_needs_system_fix'
    )
  );
