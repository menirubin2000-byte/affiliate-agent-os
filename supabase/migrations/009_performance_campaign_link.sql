-- Stage 27: Add campaign_link_id to performance_metrics

alter table public.performance_metrics
  add column if not exists campaign_link_id uuid references public.campaign_links(id) on delete set null;

create index if not exists idx_performance_metrics_campaign_link_id on public.performance_metrics(campaign_link_id);
