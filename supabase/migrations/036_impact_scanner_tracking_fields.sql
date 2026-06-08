-- Impact scanner hard-gate fields.
-- Candidates remain candidates only. This migration does not create active
-- products, posts, publish jobs, or published records.

alter table public.impact_product_candidates
  add column if not exists product_url text,
  add column if not exists tracking_link text,
  add column if not exists score_reasons text[] not null default '{}',
  add column if not exists marketplace_region text,
  add column if not exists shipping_countries text[] not null default '{}',
  add column if not exists geo_notes text,
  add column if not exists needs_geo_check boolean not null default false,
  add column if not exists allowed_traffic_sources text[] not null default '{}',
  add column if not exists compliance_notes text;

update public.impact_product_candidates
set product_url = coalesce(product_url, landing_page)
where product_url is null
  and landing_page is not null;

update public.impact_product_candidates
set needs_geo_check = true
where coalesce(shipping_geo, '') = ''
  and status in ('recommended', 'maybe', 'needs_geo_check');

create index if not exists idx_impact_product_candidates_tracking_link
  on public.impact_product_candidates(tracking_link)
  where tracking_link is not null;

create index if not exists idx_impact_product_candidates_needs_geo_check
  on public.impact_product_candidates(needs_geo_check);
