create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  brand text,
  category text,
  affiliate_url text not null,
  price numeric(10,2),
  commission_rate numeric(5,2),
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  content_type text not null check (content_type in ('review', 'social_post')),
  title text,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  ai_model text,
  approval_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_drafts_product_id on public.content_drafts(product_id);
create index if not exists idx_content_drafts_status on public.content_drafts(status);

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists set_content_drafts_updated_at on public.content_drafts;
create trigger set_content_drafts_updated_at
before update on public.content_drafts
for each row
execute function public.set_updated_at();
