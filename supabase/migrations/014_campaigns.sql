-- Campaign Tracking MVP: campaigns table and draft association

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  channel text not null,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaigns_status_check check (status in ('draft', 'active', 'paused', 'archived'))
);

create index if not exists idx_campaigns_product_id on public.campaigns(product_id);
create index if not exists idx_campaigns_channel on public.campaigns(channel);
create index if not exists idx_campaigns_status on public.campaigns(status);

drop trigger if exists set_campaigns_updated_at on public.campaigns;
create trigger set_campaigns_updated_at
before update on public.campaigns
for each row
execute function public.set_updated_at();

-- Add optional campaign_id to content_drafts
alter table public.content_drafts
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

create index if not exists idx_content_drafts_campaign_id on public.content_drafts(campaign_id);

-- Grant service role access
grant select, insert, update, delete on public.campaigns to service_role;
