-- Stage 64: Impact marketplace product candidates.
-- These rows are candidates only. They are not active products and do not
-- create publish jobs.

create table if not exists public.impact_product_candidates (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'impact',
  external_id text not null,
  product_name text not null,
  brand text,
  advertiser text,
  price numeric(12,2),
  currency text,
  payout numeric(10,2),
  payout_type text,
  commission_summary text,
  epc numeric(10,2),
  conversion_rate numeric(10,4),
  recent_sales integer,
  availability text,
  in_stock boolean,
  image_url text,
  landing_page text,
  category text,
  labels text[] not null default '{}',
  relationship_status text not null default 'unknown'
    check (relationship_status in ('approved', 'not_approved', 'needs_brand_approval', 'unknown')),
  shipping_geo text,
  platform_fit text[] not null default '{}',
  commission_score integer not null default 0,
  demand_score integer not null default 0,
  epc_score integer not null default 0,
  conversion_score integer not null default 0,
  image_quality_score integer not null default 0,
  platform_fit_score integer not null default 0,
  shipping_score integer not null default 0,
  risk_score integer not null default 0,
  final_product_score integer not null default 0,
  status text not null default 'reject'
    check (status in (
      'recommended', 'maybe', 'reject', 'needs_image',
      'needs_brand_approval', 'needs_geo_check', 'added_to_system'
    )),
  reject_reasons text[] not null default '{}',
  why_good text[] not null default '{}',
  missing_approval text,
  added_product_id uuid references public.products(id) on delete set null,
  raw_data jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint impact_product_candidates_source_external_unique unique (source, external_id)
);

create index if not exists idx_impact_product_candidates_score
  on public.impact_product_candidates(final_product_score desc);

create index if not exists idx_impact_product_candidates_status
  on public.impact_product_candidates(status);

create index if not exists idx_impact_product_candidates_relationship
  on public.impact_product_candidates(relationship_status);

create index if not exists idx_impact_product_candidates_category
  on public.impact_product_candidates(category);

drop trigger if exists set_impact_product_candidates_updated_at on public.impact_product_candidates;
create trigger set_impact_product_candidates_updated_at
before update on public.impact_product_candidates
for each row
execute function public.set_updated_at();

grant select, insert, update, delete on public.impact_product_candidates to service_role;
