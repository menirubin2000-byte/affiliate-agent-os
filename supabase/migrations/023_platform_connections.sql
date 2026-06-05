-- Stage 61: Safe platform connection state
-- Stores connection metadata only. No posts, publish jobs, or published records are created here.

create table if not exists public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  status text not null default 'not_connected',
  connected_by text,
  connected_at timestamptz,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  token_type text,
  access_token_hash text,
  refresh_token_present boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_connections_provider_check
    check (provider in ('x')),
  constraint platform_connections_status_check
    check (status in ('not_connected', 'connected', 'requires_reconnect', 'api_access_not_ready')),
  constraint platform_connections_unique_provider
    unique (provider)
);

create index if not exists idx_platform_connections_provider_status
  on public.platform_connections(provider, status);

drop trigger if exists set_platform_connections_updated_at on public.platform_connections;
create trigger set_platform_connections_updated_at
before update on public.platform_connections
for each row execute function public.set_updated_at();

grant select, insert, update on public.platform_connections to service_role;
