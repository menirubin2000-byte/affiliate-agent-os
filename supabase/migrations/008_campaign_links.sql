-- Stage 27: Campaign links table for trackable affiliate campaign URLs

create table if not exists public.campaign_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  channel text not null,
  campaign_name text,
  source text,
  medium text,
  term text,
  content text,
  base_url text not null,
  final_url text not null,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaign_links_status_check check (status in ('active', 'archived'))
);

create index if not exists idx_campaign_links_product_id on public.campaign_links(product_id);
create index if not exists idx_campaign_links_channel on public.campaign_links(channel);
create index if not exists idx_campaign_links_status on public.campaign_links(status);
create index if not exists idx_campaign_links_campaign_name on public.campaign_links(campaign_name);

-- Grant service role access
grant select, insert, update, delete on public.campaign_links to service_role;
