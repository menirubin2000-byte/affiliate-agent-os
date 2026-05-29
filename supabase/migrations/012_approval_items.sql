-- Stage 52: Approval Items
-- Operator approval board for tracking Claude-proposed actions that need human approval.

create table if not exists public.approval_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  approval_type text not null
    constraint approval_items_type_check check (
      approval_type in (
        'activate_product',
        'approve_draft',
        'publish_linkedin',
        'publish_medium',
        'create_campaign_link',
        'mark_link_ready',
        'record_performance',
        'create_task'
      )
    ),
  platform text,
  title text not null,
  description text,
  content_preview text,
  campaign_link_url text,
  disclosure_present boolean not null default false,
  status text not null default 'waiting_approval'
    constraint approval_items_status_check check (
      status in (
        'waiting_approval',
        'approved',
        'rejected',
        'published',
        'needs_changes'
      )
    ),
  operator_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_approval_items_product_id on public.approval_items(product_id);
create index if not exists idx_approval_items_status on public.approval_items(status);
create index if not exists idx_approval_items_approval_type on public.approval_items(approval_type);

grant select, insert, update, delete on public.approval_items to service_role;
