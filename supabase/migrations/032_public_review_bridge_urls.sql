-- Stage 63: Public review bridge URL for manual/community platforms.
-- Quora and Reddit post bodies must not carry affiliate_link or campaign_link
-- directly. They may link only to the public review bridge page.

alter table public.final_copies
  add column if not exists public_review_url text;

create index if not exists idx_final_copies_public_review_url
  on public.final_copies(public_review_url)
  where public_review_url is not null;
