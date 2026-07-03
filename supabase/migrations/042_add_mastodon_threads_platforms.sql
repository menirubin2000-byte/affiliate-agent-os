-- Allow the central routing model to store Mastodon and Threads.
-- This ONLY expands the allowed platform values on the platform CHECK
-- constraints. It does not create jobs, publish posts, or create
-- published_records. Mirrors migration 030.

do $$
declare
  t text;
  tables text[] := array['platform_adaptations','published_records','final_copies','publish_jobs'];
begin
  foreach t in array tables loop
    execute format('alter table public.%I drop constraint if exists %I_platform_check', t, t);
    execute format($f$
      alter table public.%I
        add constraint %I_platform_check
        check (platform in (
          'linkedin','medium','substack','tiktok','quora','reddit',
          'facebook_page','instagram_professional','pinterest','x_twitter',
          'youtube','mastodon','threads'
        ))
    $f$, t, t);
  end loop;
end $$;
