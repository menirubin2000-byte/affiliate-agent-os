-- Stage 54: Campaign-level approval workflow
-- Keeps publishing advisory/manual until a real platform URL is captured.

alter table public.products
  add column if not exists affiliate_link text;

update public.products
set affiliate_link = affiliate_url
where affiliate_link is null
  and affiliate_url is not null
  and affiliate_url <> '';

create table if not exists public.source_contents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  campaign_name text not null,
  angle text,
  title text not null,
  body text not null,
  target_keyword text,
  content_hash text not null,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  quality_checks jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, content_hash)
);

create table if not exists public.platform_adaptations (
  id uuid primary key default gen_random_uuid(),
  source_content_id uuid not null references public.source_contents(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  platform text not null
    check (platform in ('linkedin', 'medium', 'substack', 'tiktok', 'quora', 'reddit')),
  title text not null,
  body text not null,
  campaign_link_id uuid references public.campaign_links(id) on delete set null,
  campaign_link_url text,
  content_hash text not null,
  quality_checks jsonb not null default '{}'::jsonb,
  auto_quality_status text not null default 'pending'
    check (auto_quality_status in ('pending', 'auto_quality_passed', 'blocked')),
  blocking_reason text,
  policy_check_status text not null default 'requires_manual_verification'
    check (policy_check_status in ('allowed', 'prohibited', 'unclear', 'requires_manual_verification')),
  policy_checked_at timestamptz,
  policy_source_url text,
  policy_notes text,
  publish_mode text not null default 'browser_helper'
    check (publish_mode in ('api', 'browser_helper', 'manual', 'prohibited')),
  manual_fallback_required boolean not null default true,
  output_verification_required boolean not null default true,
  campaign_approval_status text not null default 'not_requested'
    check (campaign_approval_status in ('not_requested', 'campaign_approved', 'excluded', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_content_id, platform, content_hash)
);

create table if not exists public.campaign_approvals (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source_content_id uuid not null references public.source_contents(id) on delete cascade,
  status text not null default 'approved'
    check (status in ('approved', 'rejected', 'cancelled')),
  approved_platforms text[] not null default '{}'::text[],
  excluded_platforms jsonb not null default '{}'::jsonb,
  approved_by text default 'MENI',
  approval_notes text,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.published_records (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source_content_id uuid not null references public.source_contents(id) on delete cascade,
  platform_adaptation_id uuid not null references public.platform_adaptations(id) on delete cascade,
  browser_job_id uuid references public.browser_jobs(id) on delete set null,
  platform text not null
    check (platform in ('linkedin', 'medium', 'substack', 'tiktok', 'quora', 'reddit')),
  live_url text not null,
  verification_status text not null default 'verified'
    check (verification_status in ('verified', 'failed')),
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, live_url)
);

alter table public.browser_jobs
  alter column approval_item_id drop not null,
  add column if not exists source_content_id uuid references public.source_contents(id) on delete set null,
  add column if not exists platform_adaptation_id uuid references public.platform_adaptations(id) on delete set null;

alter table public.performance_metrics
  add column if not exists published_record_id uuid references public.published_records(id) on delete set null;

create index if not exists idx_source_contents_product_id on public.source_contents(product_id);
create index if not exists idx_platform_adaptations_product_id on public.platform_adaptations(product_id);
create index if not exists idx_platform_adaptations_source_platform on public.platform_adaptations(source_content_id, platform);
create index if not exists idx_platform_adaptations_approval_status on public.platform_adaptations(campaign_approval_status);
create index if not exists idx_campaign_approvals_product_source on public.campaign_approvals(product_id, source_content_id);
create index if not exists idx_published_records_product_id on public.published_records(product_id);
create index if not exists idx_published_records_platform on public.published_records(platform);
create index if not exists idx_browser_jobs_platform_adaptation_id on public.browser_jobs(platform_adaptation_id);
create index if not exists idx_performance_metrics_published_record_id on public.performance_metrics(published_record_id);

drop trigger if exists set_source_contents_updated_at on public.source_contents;
create trigger set_source_contents_updated_at
before update on public.source_contents
for each row execute function public.set_updated_at();

drop trigger if exists set_platform_adaptations_updated_at on public.platform_adaptations;
create trigger set_platform_adaptations_updated_at
before update on public.platform_adaptations
for each row execute function public.set_updated_at();

drop trigger if exists set_campaign_approvals_updated_at on public.campaign_approvals;
create trigger set_campaign_approvals_updated_at
before update on public.campaign_approvals
for each row execute function public.set_updated_at();

drop trigger if exists set_published_records_updated_at on public.published_records;
create trigger set_published_records_updated_at
before update on public.published_records
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.source_contents to service_role;
grant select, insert, update, delete on public.platform_adaptations to service_role;
grant select, insert, update, delete on public.campaign_approvals to service_role;
grant select, insert, update, delete on public.published_records to service_role;
