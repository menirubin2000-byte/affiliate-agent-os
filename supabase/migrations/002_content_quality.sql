alter table public.products
  add column if not exists target_keyword text,
  add column if not exists secondary_keywords text[] default '{}'::text[],
  add column if not exists search_intent text,
  add column if not exists content_angle text;

alter table public.content_drafts
  add column if not exists template_type text not null default 'review',
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists target_keyword text,
  add column if not exists quality_checks jsonb not null default '{}'::jsonb;

alter table public.content_drafts
  drop constraint if exists content_drafts_template_type_check;

alter table public.content_drafts
  add constraint content_drafts_template_type_check
  check (template_type in ('review', 'comparison', 'buying_guide', 'social_post'));
