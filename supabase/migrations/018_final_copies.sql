-- Stage 55: Final Copy layer
-- Stores stable final copy records after system cleanup/validation and before manual publishing.

create table if not exists public.final_copies (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  affiliate_program_id uuid references public.affiliate_programs(id) on delete set null,
  affiliate_link text,
  source_content_id uuid not null references public.source_contents(id) on delete cascade,
  platform_adaptation_id uuid not null references public.platform_adaptations(id) on delete cascade,
  platform text not null
    check (platform in ('linkedin', 'medium', 'substack', 'tiktok', 'quora', 'reddit')),
  title text not null,
  body text not null,
  content_hash text not null,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft_internal'
    check (
      status in (
        'draft_internal',
        'needs_system_fix',
        'validated',
        'ready_for_operator_approval',
        'operator_approved',
        'operator_rejected',
        'ready_for_manual_publish',
        'published_verified'
      )
    ),
  validation_status text not null default 'blocked'
    check (validation_status in ('valid', 'blocked', 'fix_requested')),
  blocking_reasons text[] not null default '{}'::text[],
  approved_by text,
  approved_at timestamptz,
  repair_task_id uuid references public.improvement_tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform_adaptation_id, version)
);

alter table public.published_records
  add column if not exists final_copy_id uuid references public.final_copies(id) on delete set null,
  add column if not exists campaign_approval_id uuid references public.campaign_approvals(id) on delete set null;

create index if not exists idx_final_copies_product_platform
  on public.final_copies(product_id, platform);

create index if not exists idx_final_copies_adaptation_version
  on public.final_copies(platform_adaptation_id, version desc);

create index if not exists idx_final_copies_status
  on public.final_copies(status);

create index if not exists idx_final_copies_validation_status
  on public.final_copies(validation_status);

create index if not exists idx_published_records_final_copy_id
  on public.published_records(final_copy_id);

drop trigger if exists set_final_copies_updated_at on public.final_copies;
create trigger set_final_copies_updated_at
before update on public.final_copies
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.final_copies to service_role;
