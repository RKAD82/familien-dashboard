create extension if not exists "pgcrypto";

-- Bestehender Primaerschluessel bleibt unveraendert: primary key (family_id, user_id)
alter table public.family_memberships
  add column if not exists id uuid not null default gen_random_uuid();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'family_memberships_id_unique'
      and conrelid = 'public.family_memberships'::regclass
  ) then
    alter table public.family_memberships
      add constraint family_memberships_id_unique unique (id);
  end if;
end $$;

alter table public.events
  add column if not exists assignee_membership_id uuid,
  add column if not exists bring_membership_id uuid,
  add column if not exists pickup_membership_id uuid;

alter table public.tasks
  add column if not exists assignee_membership_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_assignee_membership_id_fkey'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_assignee_membership_id_fkey
      foreign key (assignee_membership_id)
      references public.family_memberships(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_bring_membership_id_fkey'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_bring_membership_id_fkey
      foreign key (bring_membership_id)
      references public.family_memberships(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_pickup_membership_id_fkey'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_pickup_membership_id_fkey
      foreign key (pickup_membership_id)
      references public.family_memberships(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_assignee_membership_id_fkey'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_assignee_membership_id_fkey
      foreign key (assignee_membership_id)
      references public.family_memberships(id)
      on delete set null;
  end if;
end $$;
