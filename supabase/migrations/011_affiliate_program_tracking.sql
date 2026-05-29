-- Stage 44: Affiliate program signup tracking
-- Tracks affiliate program applications, approval status, and links per product.

create table if not exists public.affiliate_programs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  program_name text not null,
  program_url text,
  signup_url text,
  dashboard_url text,
  network text,
  commission_summary text,
  cookie_duration text,
  approval_type text not null default 'unknown',
  status text not null default 'research_needed',
  affiliate_link text,
  notes text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint affiliate_programs_approval_type_check
    check (approval_type in ('instant', 'manual_review', 'closed', 'unknown')),
  constraint affiliate_programs_status_check
    check (status in (
      'research_needed', 'signup_needed', 'awaiting_human_approval',
      'submitted', 'approved', 'rejected', 'closed', 'link_ready'
    ))
);

create index if not exists idx_affiliate_programs_product_id on public.affiliate_programs(product_id);
create index if not exists idx_affiliate_programs_status on public.affiliate_programs(status);
create index if not exists idx_affiliate_programs_approval_type on public.affiliate_programs(approval_type);
create index if not exists idx_affiliate_programs_network on public.affiliate_programs(network);

grant select, insert, update, delete on public.affiliate_programs to service_role;
