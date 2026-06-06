-- Stage 65: Hebrew-language product image variant. Optional, in addition to
-- the English/default image_url from migration 026. Non-destructive.

alter table public.products
  add column if not exists image_url_he text;

comment on column public.products.image_url_he is
  'Public URL of the Hebrew variant of the product image. Filename convention: "<Product Name> בעיברית.png". Populated by sync-product-images.js. NULL when no Hebrew variant exists.';
