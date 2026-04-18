-- Supabase analytics table for /api/analytics/event and /api/admin/metrics
create table if not exists public.analytics_events (
  id text primary key,
  type text not null,
  client_id text not null,
  session_id text null,
  payload jsonb not null default '{}'::jsonb,
  path text null,
  timestamp timestamptz not null,
  user_agent text null
);

create index if not exists analytics_events_timestamp_idx
  on public.analytics_events (timestamp);

create index if not exists analytics_events_type_idx
  on public.analytics_events (type);

create index if not exists analytics_events_session_id_idx
  on public.analytics_events (session_id);

-- Optional for dashboard-heavy queries
create index if not exists analytics_events_client_id_idx
  on public.analytics_events (client_id);
