-- Stage 68: Platform-priority routing for the scheduled publishing queue.
-- Lower priority numbers move earlier in the queue when multiple items are due.

update public.scheduled_publish_queue
set priority = case platform
  when 'pinterest' then 60
  when 'x_twitter' then 70
  when 'facebook_page' then 80
  when 'instagram_professional' then 90
  when 'linkedin' then 100
  when 'tiktok' then 110
  when 'youtube' then 120
  when 'medium' then 130
  when 'substack' then 140
  when 'quora' then 900
  when 'reddit' then 910
  else 500
end
where status in (
  'scheduled',
  'waiting_platform_connection',
  'waiting_media',
  'waiting_executor',
  'ready_to_publish',
  'publishing',
  'paused'
);

create index if not exists idx_scheduled_publish_queue_priority_publish_at
  on public.scheduled_publish_queue(priority, publish_at);
