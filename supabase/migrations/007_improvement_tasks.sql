create table if not exists public.improvement_tasks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  content_draft_id uuid references public.content_drafts(id) on delete set null,
  source_type text not null,
  priority text not null default 'medium',
  status text not null default 'open',
  title text not null,
  description text,
  suggested_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint improvement_tasks_source_type_check
    check (source_type in ('recommendation', 'performance_insight', 'manual', 'quality_check')),
  constraint improvement_tasks_priority_check
    check (priority in ('low', 'medium', 'high', 'critical')),
  constraint improvement_tasks_status_check
    check (status in ('open', 'in_progress', 'done', 'dismissed'))
);

create index if not exists idx_improvement_tasks_product_id on public.improvement_tasks(product_id);
create index if not exists idx_improvement_tasks_content_draft_id on public.improvement_tasks(content_draft_id);
create index if not exists idx_improvement_tasks_status on public.improvement_tasks(status);
create index if not exists idx_improvement_tasks_priority on public.improvement_tasks(priority);
create index if not exists idx_improvement_tasks_source_type on public.improvement_tasks(source_type);

grant select, insert, update, delete on public.improvement_tasks to service_role;
