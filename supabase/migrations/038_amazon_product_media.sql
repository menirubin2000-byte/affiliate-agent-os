-- Stage 76: legal Amazon product media support.
--
-- Amazon products may store ASIN and affiliate links in the product catalog,
-- but Amazon-hosted image URLs must come from the official product API flow.
-- Manual fallback images should be manufacturer-owned or uploaded assets.

alter table public.products
  add column if not exists amazon_asin text,
  add column if not exists amazon_detail_page_url text,
  add column if not exists amazon_image_source text not null default 'none',
  add column if not exists amazon_image_fetched_at timestamptz,
  add column if not exists amazon_api_status text not null default 'not_checked';

alter table public.products
  drop constraint if exists products_amazon_image_source_check;
alter table public.products
  add constraint products_amazon_image_source_check
  check (amazon_image_source in ('none', 'paapi', 'manufacturer', 'uploaded'));

alter table public.products
  drop constraint if exists products_amazon_api_status_check;
alter table public.products
  add constraint products_amazon_api_status_check
  check (amazon_api_status in ('not_checked', 'ready', 'missing_api_credentials', 'api_error', 'manual_image_required'));

create index if not exists idx_products_amazon_asin on public.products(amazon_asin);
create index if not exists idx_products_amazon_api_status on public.products(amazon_api_status);

comment on column public.products.amazon_asin is
  'Amazon ASIN for products sourced from Amazon Associates.';
comment on column public.products.amazon_detail_page_url is
  'Amazon API returned detail page URL. Affiliate/campaign link remains the canonical outbound link.';
comment on column public.products.amazon_image_source is
  'none, paapi, manufacturer, or uploaded. Amazon-hosted images must use paapi.';
comment on column public.products.amazon_image_fetched_at is
  'Last successful Amazon product API media fetch timestamp.';
comment on column public.products.amazon_api_status is
  'Amazon product media readiness status. missing_api_credentials and api_error require manual manufacturer/upload fallback.';
comment on column public.products.image_url is
  'Public product image URL. For Amazon-hosted URLs this must be returned by the official product API; otherwise use manufacturer-owned or uploaded assets.';
