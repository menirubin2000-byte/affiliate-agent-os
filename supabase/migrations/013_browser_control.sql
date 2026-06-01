-- Stage 53: Browser helper control queue
-- Read/write is still server-side only. The helper stores no passwords,
-- cookies, secrets, payment fields, or browser credentials.

create table if not exists browser_sessions (
  id uuid primary key default gen_random_uuid(),
  helper_name text not null default 'Affiliate Agent OS Browser Helper',
  extension_instance_id text,
  status text not null default 'disconnected'
    check (status in ('connected', 'disconnected', 'blocked')),
  active_tab_url text,
  active_tab_title text,
  active_platform text,
  blocker_status text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists browser_jobs (
  id uuid primary key default gen_random_uuid(),
  approval_item_id uuid not null references approval_items(id) on delete cascade,
  browser_session_id uuid references browser_sessions(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  platform text not null,
  status text not null default 'queued'
    check (status in ('queued', 'opened', 'filled', 'waiting_user', 'published', 'blocked', 'failed')),
  target_url text,
  post_url text,
  title text,
  content text not null,
  campaign_link_url text,
  disclosure_present boolean not null default false,
  blocker_reason text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists browser_events (
  id uuid primary key default gen_random_uuid(),
  browser_job_id uuid references browser_jobs(id) on delete cascade,
  browser_session_id uuid references browser_sessions(id) on delete set null,
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists browser_sessions_status_idx on browser_sessions(status);
create index if not exists browser_sessions_last_seen_at_idx on browser_sessions(last_seen_at desc);
create index if not exists browser_jobs_status_idx on browser_jobs(status);
create index if not exists browser_jobs_platform_idx on browser_jobs(platform);
create index if not exists browser_jobs_approval_item_id_idx on browser_jobs(approval_item_id);
create index if not exists browser_events_browser_job_id_idx on browser_events(browser_job_id);
create index if not exists browser_events_created_at_idx on browser_events(created_at desc);

drop trigger if exists set_browser_sessions_updated_at on browser_sessions;
create trigger set_browser_sessions_updated_at
before update on browser_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_browser_jobs_updated_at on browser_jobs;
create trigger set_browser_jobs_updated_at
before update on browser_jobs
for each row execute function public.set_updated_at();

grant all on browser_sessions to service_role;
grant all on browser_jobs to service_role;
grant all on browser_events to service_role;
