-- Stage 64: per-product image URL. Non-destructive (nullable text).
-- Populated by scripts/sync-product-images.js which uploads local files from
-- the תמונות מוצרים/ folder to Supabase Storage and stores the public URL here.

alter table public.products
  add column if not exists image_url text;

comment on column public.products.image_url is
  'Public URL of the product image. Set by sync-product-images.js after upload to Supabase Storage. NULL means no image uploaded yet.';
