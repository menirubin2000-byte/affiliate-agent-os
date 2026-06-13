-- Stage 64: Operator-editable public review body.
-- The public review page (/reviews/[slug]) shows this text when present,
-- overriding the auto-generated final_copies / content_angle fallback.
-- This column is the ONLY place the operator edits public review text.
-- final_copies (published posts) are never touched by the review editor.

alter table public.products
  add column if not exists public_review text;
