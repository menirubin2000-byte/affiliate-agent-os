-- Stage 66: per-product asset readiness for image + video.
--
-- Until now `products.image_url` was populated by the sync script but we had
-- no explicit "ready" flag. The publish workflow needs to know: does this
-- product have an image asset ready? a video asset ready? Without this,
-- /dashboard/he/approve cannot enforce the rule:
--    post + image_or_video + campaign_link + MENI approval = publish.
--
-- Non-destructive: new nullable columns only.

alter table public.products
  add column if not exists image_status text,
  add column if not exists video_url text,
  add column if not exists video_status text,
  add column if not exists video_duration_seconds numeric,
  add column if not exists video_suitable_for text[] not null default '{}'::text[],
  add column if not exists asset_synced_at timestamptz;

-- Allowed values for the two status columns: NULL (never checked), 'ready',
-- or 'missing'. Anything else is a sync-script bug.
alter table public.products
  drop constraint if exists products_image_status_check;
alter table public.products
  add constraint products_image_status_check
  check (image_status is null or image_status in ('ready', 'missing'));

alter table public.products
  drop constraint if exists products_video_status_check;
alter table public.products
  add constraint products_video_status_check
  check (video_status is null or video_status in ('ready', 'missing'));

create index if not exists idx_products_image_status on public.products(image_status);
create index if not exists idx_products_video_status on public.products(video_status);

comment on column public.products.image_status is
  'ready when image_url is populated and the file exists in Supabase Storage. missing when the product has no image yet. NULL only before the first sync run.';
comment on column public.products.video_url is
  'Public URL of the product video (e.g. Shopify launch reel). Populated by sync-product-images.js when a matching .mp4/.mov file is found.';
comment on column public.products.video_status is
  'ready when video_url is populated. missing when not. NULL before first sync.';
comment on column public.products.video_suitable_for is
  'Array of short-form video platform keys this video fits (subset of tiktok, reels, shorts). Determined by sync script from duration + format. Empty when there is no video.';
comment on column public.products.video_duration_seconds is
  'Duration of the video in seconds, read via ffprobe. NULL when no video or duration unknown.';
comment on column public.products.asset_synced_at is
  'Last time the sync script touched this product''s asset columns.';
