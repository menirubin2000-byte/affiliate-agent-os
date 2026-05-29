create table if not exists public.draft_versions (
  id uuid primary key default gen_random_uuid(),
  content_draft_id uuid not null references public.content_drafts(id) on delete cascade,
  version_number integer not null,
  title text,
  body text not null,
  meta_title text,
  meta_description text,
  target_keyword text,
  quality_checks jsonb not null default '{}'::jsonb,
  change_source text not null default 'manual',
  change_notes text,
  created_at timestamptz not null default now(),

  constraint draft_versions_change_source_check
    check (change_source in ('manual', 'structured_paste', 'fallback_generation', 'system'))
);

create index if not exists idx_draft_versions_content_draft_id on public.draft_versions(content_draft_id);
create index if not exists idx_draft_versions_created_at on public.draft_versions(created_at);
create index if not exists idx_draft_versions_version_number on public.draft_versions(content_draft_id, version_number);
