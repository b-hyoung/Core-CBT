-- docs/setup/comment-edits-schema.sql

create table if not exists comment_edits (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  session_key text not null,
  problem_number int not null,
  original_comment text not null,
  proposed_comment text not null,
  final_comment text,
  editor_user_id text not null,
  editor_display_name text not null,
  is_anonymous boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'merged')),
  discord_message_id text,
  discord_channel_id text,
  admin_note text,
  pr_number int,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  merged_at timestamptz
);

create index if not exists comment_edits_problem_idx
  on comment_edits (subject, session_key, problem_number, status);

create index if not exists comment_edits_round_idx
  on comment_edits (status, pr_number)
  where status = 'approved' and pr_number is null;

create index if not exists comment_edits_ratelimit_idx
  on comment_edits (editor_user_id, subject, session_key, problem_number, created_at desc);

create table if not exists comment_contributors (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  session_key text not null,
  problem_number int not null,
  display_name text not null,
  is_anonymous boolean not null,
  edit_id uuid not null references comment_edits(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists comment_contributors_problem_idx
  on comment_contributors (subject, session_key, problem_number, created_at);
