-- Stage 62: Traffic Engine rankings (external source - Robin Marketing Automation)
--
-- This table is WRITTEN by an external system ("Robin Marketing Automation" on
-- a separate machine) that owns real traffic / ranking signal (Google Search
-- Console, keyword tracker, etc.). Affiliate Agent OS READS from it to order
-- the "ready for MENI approval" queue.
--
-- Affiliate Agent OS must NEVER invent its own rankings here. If this table is
-- empty for a (product, platform) pair, the dashboard falls back to
-- updated_at ordering with a clear "Traffic Engine not connected" label.

create table if not exists public.traffic_engine_rankings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  platform text not null,
  score numeric not null,
  source text not null default 'robin_marketing_automation',
  reason text,
  keyword text,
  traffic_signal jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint traffic_engine_rankings_unique_per_source
    unique (product_id, platform, source)
);

create index if not exists idx_traffic_engine_rankings_product_platform
  on public.traffic_engine_rankings(product_id, platform);

create index if not exists idx_traffic_engine_rankings_score_desc
  on public.traffic_engine_rankings(score desc);

drop trigger if exists set_traffic_engine_rankings_updated_at on public.traffic_engine_rankings;
create trigger set_traffic_engine_rankings_updated_at
before update on public.traffic_engine_rankings
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.traffic_engine_rankings to service_role;
