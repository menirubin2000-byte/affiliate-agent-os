-- Stage 62+: Traffic Ops layer.
-- Sits between traffic_engine_rankings and publish_jobs.
-- Flow: ranking → traffic_task → asset ready → MENI approval → publish_job.

-- 1. traffic_tasks — operational work items derived from traffic rankings.
create table if not exists public.traffic_tasks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  platform text not null
    check (platform in (
      'linkedin','medium','substack','facebook_page',
      'instagram_professional','pinterest','x_twitter',
      'tiktok','youtube','quora','reddit'
    )),
  task_type text not null default 'publish_content'
    check (task_type in (
      'publish_content','create_asset','refresh_content',
      'boost_performing','expand_platform','bridge_post'
    )),
  status text not null default 'pending'
    check (status in (
      'pending','asset_needed','asset_ready','in_review',
      'approved','publish_job_created','completed','skipped'
    )),
  priority integer not null default 100,
  traffic_score numeric,
  ranking_id uuid,
  final_copy_id uuid references public.final_copies(id) on delete set null,
  publish_job_id uuid references public.publish_jobs(id) on delete set null,
  blocking_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, platform, task_type, status)
);

create index if not exists idx_traffic_tasks_status
  on public.traffic_tasks(status);
create index if not exists idx_traffic_tasks_product_platform
  on public.traffic_tasks(product_id, platform);
create index if not exists idx_traffic_tasks_priority
  on public.traffic_tasks(priority asc, traffic_score desc nulls last);

drop trigger if exists set_traffic_tasks_updated_at on public.traffic_tasks;
create trigger set_traffic_tasks_updated_at
before update on public.traffic_tasks
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.traffic_tasks to service_role;

-- 2. traffic_assets — media assets required before a task can become a publish_job.
create table if not exists public.traffic_assets (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.traffic_tasks(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  platform text not null,
  asset_type text not null default 'image'
    check (asset_type in ('image','video','carousel','gif','document')),
  status text not null default 'needed'
    check (status in ('needed','in_progress','ready','rejected','not_applicable')),
  asset_url text,
  thumbnail_url text,
  source_description text,
  blocking_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_traffic_assets_task
  on public.traffic_assets(task_id);
create index if not exists idx_traffic_assets_status
  on public.traffic_assets(status);

drop trigger if exists set_traffic_assets_updated_at on public.traffic_assets;
create trigger set_traffic_assets_updated_at
before update on public.traffic_assets
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.traffic_assets to service_role;

-- 3. traffic_reviews — MENI approval gate before a traffic_task creates a publish_job.
create table if not exists public.traffic_reviews (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.traffic_tasks(id) on delete cascade,
  reviewer text not null default 'meni',
  decision text not null default 'pending'
    check (decision in ('pending','approved','rejected','deferred')),
  reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, reviewer)
);

create index if not exists idx_traffic_reviews_decision
  on public.traffic_reviews(decision);
create index if not exists idx_traffic_reviews_task
  on public.traffic_reviews(task_id);

drop trigger if exists set_traffic_reviews_updated_at on public.traffic_reviews;
create trigger set_traffic_reviews_updated_at
before update on public.traffic_reviews
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.traffic_reviews to service_role;
