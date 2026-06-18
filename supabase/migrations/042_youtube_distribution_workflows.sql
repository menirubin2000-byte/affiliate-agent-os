create table if not exists public.youtube_distribution_workflows (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  status text not null default 'scripted',
  youtube_posting_method text not null default 'browser',
  reddit_posting_method text not null default 'browser',
  quora_posting_method text not null default 'browser',
  medium_posting_method text not null default 'manual',
  youtube_video_idea text,
  youtube_title text,
  thumbnail_angle text,
  short_script text,
  long_video_outline text,
  description_with_disclosure text,
  pinned_comment_text text,
  reddit_variant_a text,
  reddit_variant_b text,
  quora_variant_a text,
  quora_variant_b text,
  medium_variant text,
  recommended_cta text,
  youtube_url text,
  reddit_shared_url text,
  quora_shared_url text,
  medium_shared_url text,
  youtube_views integer,
  campaign_link_id uuid references public.campaign_links(id) on delete set null,
  campaign_link_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint youtube_distribution_workflows_status_check
    check (status in ('scripted', 'published_youtube', 'shared_reddit', 'shared_quora', 'shared_medium', 'tracking')),
  constraint youtube_distribution_workflows_youtube_method_check
    check (youtube_posting_method in ('extension', 'browser', 'manual')),
  constraint youtube_distribution_workflows_reddit_method_check
    check (reddit_posting_method in ('extension', 'browser', 'manual')),
  constraint youtube_distribution_workflows_quora_method_check
    check (quora_posting_method in ('extension', 'browser', 'manual')),
  constraint youtube_distribution_workflows_medium_method_check
    check (medium_posting_method in ('extension', 'browser', 'manual')),
  constraint youtube_distribution_workflows_youtube_views_check
    check (youtube_views is null or youtube_views >= 0)
);

create index if not exists idx_youtube_distribution_workflows_status
  on public.youtube_distribution_workflows(status);

create index if not exists idx_youtube_distribution_workflows_campaign_link_id
  on public.youtube_distribution_workflows(campaign_link_id);

drop trigger if exists set_youtube_distribution_workflows_updated_at on public.youtube_distribution_workflows;
create trigger set_youtube_distribution_workflows_updated_at
before update on public.youtube_distribution_workflows
for each row
execute function public.set_updated_at();

grant select, insert, update, delete on public.youtube_distribution_workflows to service_role;
