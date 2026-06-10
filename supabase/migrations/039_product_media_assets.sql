-- Product media gallery.
-- Stores legal product media references such as manufacturer-owned image URLs,
-- uploaded assets, generated assets, or Amazon PA-API image URLs.

create table if not exists public.product_media_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source text not null default 'manufacturer'
    check (source in ('manufacturer', 'paapi', 'uploaded', 'generated')),
  url text not null,
  alt_text text,
  media_type text not null default 'image'
    check (media_type in ('image')),
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, url)
);

create index if not exists idx_product_media_assets_product_id
  on public.product_media_assets(product_id, sort_order, created_at);

create index if not exists idx_product_media_assets_primary
  on public.product_media_assets(product_id, is_primary)
  where is_primary;

drop trigger if exists set_product_media_assets_updated_at on public.product_media_assets;
create trigger set_product_media_assets_updated_at
before update on public.product_media_assets
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.product_media_assets to service_role;
