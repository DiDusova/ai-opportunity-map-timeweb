create extension if not exists pgcrypto;

create table if not exists survey_sessions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[A-Za-z0-9][A-Za-z0-9-]*$'),
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references survey_sessions(id) on delete cascade,
  phase text not null default 'before' check (phase = 'before'),
  survey_version integer not null default 2,
  interaction_level text not null,
  ai_attitude text not null,
  learning_interests text[] not null default '{}',
  work_tasks text,
  created_at timestamptz not null default now(),
  check (char_length(coalesce(work_tasks, '')) <= 2000)
);

create index if not exists survey_responses_session_phase_idx
  on survey_responses(session_id, phase, survey_version, created_at desc);

create index if not exists survey_responses_created_at_idx
  on survey_responses(created_at);

insert into survey_sessions (slug, title)
values ('demo', 'Демо-группа')
on conflict (slug) do nothing;

create or replace function cleanup_old_survey_responses()
returns void
language sql
as $$
  delete from survey_responses
  where created_at < now() - interval '30 days';
$$;
