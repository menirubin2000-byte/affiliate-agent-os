-- Stage 30: Saved views and filter presets
-- Stores named filter presets the operator can quickly recall.

create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  view_type text not null,
  filters jsonb not null default '{}'::jsonb,
  sort jsonb default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_views_type_check check (
    view_type in ('products', 'drafts', 'performance', 'campaign_links', 'improvements', 'reports')
  )
);

create index if not exists idx_saved_views_view_type on public.saved_views(view_type);
create index if not exists idx_saved_views_is_default on public.saved_views(is_default);
create index if not exists idx_saved_views_created_at on public.saved_views(created_at);

-- Grant service role access
grant select, insert, update, delete on public.saved_views to service_role;
