-- practical_hint_overrides
-- Run in Supabase SQL editor before deploying /api/practical-hints.
-- Stores admin-curated answer_format_hint overrides, keyed by (session_id, problem_number).

create table if not exists practical_hint_overrides (
  id              bigserial primary key,
  session_id      text not null,
  problem_number  int  not null,
  hint_text       text not null,
  updated_at      timestamptz not null default now(),
  updated_by      text,
  unique (session_id, problem_number)
);

create index if not exists practical_hint_overrides_session_idx
  on practical_hint_overrides (session_id);

alter table practical_hint_overrides enable row level security;

-- Public read (used by the GET /api/practical-hints route).
create policy "practical_hint_overrides_select_all"
  on practical_hint_overrides
  for select
  using (true);

-- Writes are performed with the service role only; no anon insert/update/delete policies.
