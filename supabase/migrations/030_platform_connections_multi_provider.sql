-- Stage 68: Extend platform_connections to all 11 publishing surfaces.
-- The original migration (023) hard-locked provider='x' because only X was
-- in scope. We now have working tokens for facebook_page, instagram_professional,
-- and pinterest in .env.local; record their state in the DB so the operator
-- dashboard can show them honestly.

alter table public.platform_connections
  drop constraint if exists platform_connections_provider_check;

alter table public.platform_connections
  add constraint platform_connections_provider_check
  check (provider in (
    'x',
    'linkedin',
    'medium',
    'substack',
    'facebook_page',
    'instagram_professional',
    'pinterest',
    'youtube',
    'quora',
    'reddit',
    'tiktok'
  ));
