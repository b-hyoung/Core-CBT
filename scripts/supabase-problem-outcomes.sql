-- Supabase table for per-problem results extracted from finish_exam events.
-- Used by /test/high-wrong to aggregate wrong rates across all users.

create table if not exists public.problem_outcomes (
  id text primary key,
  event_id text not null,
  client_id text not null,
  session_id text null,
  source_session_id text not null,
  source_problem_number integer not null,
  local_problem_number integer null,
  selected_answer text null,
  correct_answer text null,
  is_correct boolean not null default false,
  is_unknown boolean not null default false,
  timestamp timestamptz not null
);

create index if not exists problem_outcomes_timestamp_idx
  on public.problem_outcomes (timestamp);

create index if not exists problem_outcomes_event_id_idx
  on public.problem_outcomes (event_id);

create index if not exists problem_outcomes_client_id_idx
  on public.problem_outcomes (client_id);

create index if not exists problem_outcomes_source_key_idx
  on public.problem_outcomes (source_session_id, source_problem_number);

create index if not exists problem_outcomes_source_session_idx
  on public.problem_outcomes (source_session_id);

