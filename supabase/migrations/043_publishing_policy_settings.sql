-- Editable publishing policy settings.
-- Scheduling still requires final_copies.status = operator_approved.
-- This migration does not publish, auto-post, or create published records.

create table if not exists public.publishing_schedule_policy_settings (
  id boolean primary key default true check (id),
  version text not null default '2026-06-08-v1',
  default_daily_target integer not null default 2 check (default_daily_target between 1 and 50),
  platform_daily_targets jsonb not null default '{
    "linkedin": 2,
    "facebook_page": 2,
    "instagram_professional": 2,
    "pinterest": 5,
    "x_twitter": 3,
    "medium": 2,
    "substack": 2,
    "tiktok": 1,
    "youtube": 1,
    "quora": 0,
    "reddit": 0
  }'::jsonb check (jsonb_typeof(platform_daily_targets) = 'object'),
  same_platform_gap_minutes integer not null default 240 check (same_platform_gap_minutes between 1 and 10080),
  global_gap_minutes integer not null default 15 check (global_gap_minutes between 1 and 1440),
  youtube_target integer not null default 1 check (youtube_target between 1 and 50),
  pinterest_target_min integer not null default 5 check (pinterest_target_min between 1 and 50),
  pinterest_target_max integer not null default 10 check (pinterest_target_max between 1 and 50),
  x_twitter_target_min integer not null default 3 check (x_twitter_target_min between 1 and 50),
  x_twitter_target_max integer not null default 5 check (x_twitter_target_max between 1 and 50),
  medium_substack_daily_cap integer not null default 1 check (medium_substack_daily_cap between 1 and 50),
  reddit_quora_manual_only boolean not null default true,
  medium_manual_browser_only boolean not null default true,
  notes text not null default 'No publishing before MENI approval. Reddit and Quora stay manual/community-safe. Medium can use manual browser flow when extension flow is not appropriate.',
  no_publishing_without_meni_approval boolean not null default true check (no_publishing_without_meni_approval = true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pinterest_target_min <= pinterest_target_max),
  check (x_twitter_target_min <= x_twitter_target_max),
  check (length(trim(notes)) > 0)
);

drop trigger if exists set_publishing_schedule_policy_settings_updated_at on public.publishing_schedule_policy_settings;
create trigger set_publishing_schedule_policy_settings_updated_at
before update on public.publishing_schedule_policy_settings
for each row execute function public.set_updated_at();

insert into public.publishing_schedule_policy_settings (id)
values (true)
on conflict (id) do nothing;
