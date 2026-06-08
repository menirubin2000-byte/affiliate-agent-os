-- Stage 65: Production scheduled publishing queue.
-- MENI approval creates a scheduled queue item. Publish jobs are created only
-- when the item reaches its publish window and platform/executor/media gates
-- are ready.

create table if not exists public.scheduled_publish_queue (
  id uuid primary key default gen_random_uuid(),
  final_copy_id uuid not null references public.final_copies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  platform text not null,
  language text not null default 'en',
  campaign_link text,
  media_asset_url text,
  image_asset_path text,
  video_asset_path text,
  approval_id uuid references public.campaign_approvals(id) on delete set null,
  status text not null default 'scheduled'
    check (status in (
      'scheduled',
      'waiting_platform_connection',
      'waiting_media',
      'waiting_executor',
      'ready_to_publish',
      'publishing',
      'published',
      'failed',
      'paused'
    )),
  publish_at timestamptz not null,
  priority integer not null default 100,
  attempts integer not null default 0,
  last_error text,
  published_record_id uuid references public.published_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (final_copy_id)
);

create index if not exists idx_scheduled_publish_queue_status_publish_at
  on public.scheduled_publish_queue(status, publish_at);

create index if not exists idx_scheduled_publish_queue_platform_publish_at
  on public.scheduled_publish_queue(platform, publish_at);

create index if not exists idx_scheduled_publish_queue_product_platform_publish_at
  on public.scheduled_publish_queue(product_id, platform, publish_at);

drop trigger if exists set_scheduled_publish_queue_updated_at on public.scheduled_publish_queue;
create trigger set_scheduled_publish_queue_updated_at
before update on public.scheduled_publish_queue
for each row
execute function public.set_updated_at();

grant select, insert, update, delete on public.scheduled_publish_queue to service_role;
