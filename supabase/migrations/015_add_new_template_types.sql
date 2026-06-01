-- Add tiktok_script, quora_answer, reddit_post to the template_type check constraint

alter table public.content_drafts
  drop constraint if exists content_drafts_template_type_check;

alter table public.content_drafts
  add constraint content_drafts_template_type_check
  check (template_type in ('review', 'comparison', 'buying_guide', 'social_post', 'tiktok_script', 'quora_answer', 'reddit_post'));
