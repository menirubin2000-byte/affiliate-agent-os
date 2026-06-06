-- Allow the central routing model to store the newer official-API platforms.
-- This only expands allowed platform values. It does not create jobs,
-- publish posts, or create published_records.

alter table public.platform_adaptations
  drop constraint if exists platform_adaptations_platform_check;

alter table public.platform_adaptations
  add constraint platform_adaptations_platform_check
  check (
    platform in (
      'linkedin',
      'medium',
      'substack',
      'tiktok',
      'quora',
      'reddit',
      'facebook_page',
      'instagram_professional',
      'pinterest',
      'x_twitter',
      'youtube'
    )
  );

alter table public.published_records
  drop constraint if exists published_records_platform_check;

alter table public.published_records
  add constraint published_records_platform_check
  check (
    platform in (
      'linkedin',
      'medium',
      'substack',
      'tiktok',
      'quora',
      'reddit',
      'facebook_page',
      'instagram_professional',
      'pinterest',
      'x_twitter',
      'youtube'
    )
  );

alter table public.final_copies
  drop constraint if exists final_copies_platform_check;

alter table public.final_copies
  add constraint final_copies_platform_check
  check (
    platform in (
      'linkedin',
      'medium',
      'substack',
      'tiktok',
      'quora',
      'reddit',
      'facebook_page',
      'instagram_professional',
      'pinterest',
      'x_twitter',
      'youtube'
    )
  );

alter table public.publish_jobs
  drop constraint if exists publish_jobs_platform_check;

alter table public.publish_jobs
  add constraint publish_jobs_platform_check
  check (
    platform in (
      'linkedin',
      'medium',
      'substack',
      'tiktok',
      'quora',
      'reddit',
      'facebook_page',
      'instagram_professional',
      'pinterest',
      'x_twitter',
      'youtube'
    )
  );
