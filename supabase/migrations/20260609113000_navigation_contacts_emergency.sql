alter table public.family_memberships
  add column if not exists visible_nav_items text[];

create table if not exists public.family_contacts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  relation text,
  phone text,
  mobile text,
  email text,
  address text,
  notes text,
  favorite boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.emergency_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  type text not null check (type in ('contact', 'address', 'medical', 'info')),
  title text not null,
  primary_text text not null,
  secondary_text text,
  phone text,
  address text,
  notes text,
  priority integer not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_contacts enable row level security;
alter table public.emergency_items enable row level security;

drop policy if exists "family_contacts_member_all" on public.family_contacts;
create policy "family_contacts_member_all" on public.family_contacts for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));

drop policy if exists "emergency_items_member_all" on public.emergency_items;
create policy "emergency_items_member_all" on public.emergency_items for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));

create index if not exists idx_family_contacts_family_name on public.family_contacts(family_id, favorite desc, name);
create index if not exists idx_emergency_items_family_priority on public.emergency_items(family_id, priority, title);

do $$
begin
  alter publication supabase_realtime add table public.family_contacts;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.emergency_items;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
