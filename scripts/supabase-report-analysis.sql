-- Supabase table for n8n cbt-report-handler workflow analysis results.
-- Service Role Key 사용 전제 — RLS off.
create table if not exists public.report_analysis (
  report_id text primary key,
  origin_session_id text not null,
  origin_problem_number int not null,
  verdict text not null check (verdict in ('valid_fix','invalid_report','needs_human')),
  target_field text null check (target_field in ('comment','answer','problem')),
  target_file text null,
  confidence numeric(3,2) null,
  reasoning text null,
  new_value jsonb null,
  pr_number int null,
  pr_url text null,
  pr_state text null check (pr_state in ('open','closed','merged','skipped','dry_run')),
  slack_thread_ts text null,
  dify_workflow_run_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists report_analysis_verdict_idx
  on public.report_analysis (verdict);

create index if not exists report_analysis_origin_idx
  on public.report_analysis (origin_session_id, origin_problem_number);

create index if not exists report_analysis_created_at_idx
  on public.report_analysis (created_at);

create index if not exists report_analysis_pr_state_idx
  on public.report_analysis (pr_state);

create or replace function public.report_analysis_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists report_analysis_set_updated_at on public.report_analysis;
create trigger report_analysis_set_updated_at
  before update on public.report_analysis
  for each row
  execute function public.report_analysis_set_updated_at();
