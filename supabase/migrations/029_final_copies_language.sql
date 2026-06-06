-- Stage 67: language tag on final_copies. Non-destructive.
--
-- Rule MENI set: a Hebrew post must be paired with the Hebrew image variant
-- (products.image_url_he). The dashboard reads this column to pick the right
-- image at render time. No row is reassigned automatically — existing copies
-- default to 'en' until someone explicitly creates a 'he' version.

alter table public.final_copies
  add column if not exists language text not null default 'en';

alter table public.final_copies
  drop constraint if exists final_copies_language_check;
alter table public.final_copies
  add constraint final_copies_language_check
  check (language in ('en', 'he'));

create index if not exists idx_final_copies_language on public.final_copies(language);

comment on column public.final_copies.language is
  'BCP-47-ish language code for the copy body. Only en or he today. The dashboard pairs language=he with products.image_url_he.';
