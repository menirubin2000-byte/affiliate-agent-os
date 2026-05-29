create table if not exists public.performance_metrics (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  draft_id uuid references public.content_drafts(id) on delete set null,
  channel text not null,
  campaign_name text,
  clicks integer not null default 0 check (clicks >= 0),
  conversions integer check (conversions is null or conversions >= 0),
  revenue numeric(12,2) check (revenue is null or revenue >= 0),
  notes text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_performance_metrics_product_id
  on public.performance_metrics(product_id);

create index if not exists idx_performance_metrics_draft_id
  on public.performance_metrics(draft_id);

create index if not exists idx_performance_metrics_channel
  on public.performance_metrics(channel);

create index if not exists idx_performance_metrics_recorded_at
  on public.performance_metrics(recorded_at desc);
