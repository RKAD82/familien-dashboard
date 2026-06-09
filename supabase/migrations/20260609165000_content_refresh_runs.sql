alter table public.activity_agent_runs
  add column if not exists family_id uuid references public.families(id) on delete cascade,
  add column if not exists run_type text not null default 'activities';

create index if not exists idx_activity_agent_runs_family_started
  on public.activity_agent_runs(family_id, run_type, started_at desc);
