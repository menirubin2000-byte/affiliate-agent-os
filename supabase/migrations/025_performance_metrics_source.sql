-- Stage 63: Track which external network/platform every performance metric
-- came from. Non-destructive: nullable column, no existing rows touched.
--
-- The dashboard at /dashboard/he/traffic-metrics breaks the queue down by
-- this column so MENI can see which source is actually delivering signal.
-- The Internal Traffic Engine reads aggregated counts from here.

alter table public.performance_metrics
  add column if not exists source text;

create index if not exists idx_performance_metrics_source
  on public.performance_metrics(source);

comment on column public.performance_metrics.source is
  'External network or platform the metric came from (e.g. impact, partnerstack, reditus, systeme_io, elevenlabs, medium, substack, linkedin). NULL for historical rows imported before this column existed. Never set by the UI to a synthetic value — only the per-source CSV adapters write it.';
