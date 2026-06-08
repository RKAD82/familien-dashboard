create extension if not exists "pgcrypto";

create schema if not exists app_private;

create type public.family_role as enum ('admin', 'adult', 'child');
create type public.entity_status as enum ('open', 'today', 'waiting', 'done', 'discarded');
create type public.visibility_level as enum ('family', 'adults', 'private');
create type public.notification_priority as enum ('normal', 'important', 'urgent');
create type public.delivery_channel as enum ('in_app', 'push');
create type public.delivery_status as enum ('pending', 'sent', 'read', 'failed');

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_timezone text not null default 'Europe/Berlin',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_color text not null default '#345c52',
  created_at timestamptz not null default now()
);

create table public.family_memberships (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.family_role not null,
  display_name text not null,
  active boolean not null default true,
  notification_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  color text not null,
  visibility text not null default 'family',
  type text not null default 'family',
  unique (family_id, name)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  calendar_id uuid references public.calendars(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  recurrence_rule text,
  category text not null default 'Familie',
  location text,
  notes text,
  is_important boolean not null default false,
  notify_family boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (family_id, title, starts_at)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  status public.entity_status not null default 'open',
  due_at timestamptz,
  assigned_to uuid references public.profiles(id) on delete set null,
  category text not null default 'Familie',
  recurrence_rule text,
  linked_event_id uuid references public.events(id) on delete set null,
  is_important boolean not null default false,
  notify_family boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (family_id, title)
);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  store_type text not null default 'allgemein',
  archived boolean not null default false,
  unique (family_id, title)
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  title text not null,
  quantity text,
  unit text,
  category text,
  source_label text,
  checked boolean not null default false,
  added_by uuid references public.profiles(id) on delete set null,
  checked_by uuid references public.profiles(id) on delete set null,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (list_id, title)
);

create table public.link_collections (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  unique (family_id, title)
);

create table public.links (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.link_collections(id) on delete cascade,
  title text not null,
  url text not null,
  description text,
  favorite boolean not null default false,
  visible_to uuid[],
  is_important boolean not null default false,
  notify_family boolean not null default false,
  unique (collection_id, title)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'Familie',
  visibility public.visibility_level not null default 'family',
  is_important boolean not null default false,
  notify_family boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (family_id, title)
);

create table public.waste_districts (
  id uuid primary key default gen_random_uuid(),
  municipality text not null,
  district_name text not null,
  source_label text not null,
  source_checked_at date not null,
  active boolean not null default true,
  unique (municipality, district_name)
);

create table public.waste_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  url text,
  fetched_at timestamptz,
  checksum text,
  notes text,
  unique (checksum)
);

create table public.waste_events (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references public.waste_districts(id) on delete cascade,
  date date not null,
  waste_type text not null,
  title text not null,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  source_id uuid references public.waste_sources(id) on delete set null,
  source_event_uid text not null,
  notes text,
  unique (district_id, date, waste_type)
);

create table public.waste_sorting_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color_token text not null,
  description text not null
);

create table public.waste_sorting_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.waste_sorting_categories(id) on delete cascade,
  term text not null,
  aliases text[] not null default '{}',
  description text not null,
  allowed boolean not null default true,
  warning text,
  source_note text,
  unique (category_id, term)
);

create table public.waste_locations (
  id uuid primary key default gen_random_uuid(),
  district_id uuid references public.waste_districts(id) on delete cascade,
  type text not null,
  name text not null,
  address text,
  opening_times text,
  notes text,
  unique (district_id, name)
);

create table public.activity_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  source_type text not null check (source_type in ('ical', 'rss', 'json-ld', 'manual-seed')),
  active boolean not null default true,
  last_checked_at timestamptz,
  notes text
);

create table public.activity_suggestions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  source_id uuid references public.activity_sources(id) on delete set null,
  external_id text not null,
  title text not null,
  description text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  location_name text not null,
  location_address text,
  distance_label text not null,
  category text not null,
  family_score integer not null default 0,
  price_label text not null,
  age_label text not null,
  url text,
  image_url text,
  status text not null default 'suggested',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (family_id, external_id)
);

create table public.activity_agent_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,
  sources_checked integer not null default 0,
  items_found integer not null default 0,
  items_saved integer not null default 0,
  error_summary text
);

create table public.recipe_preferences (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade unique,
  default_difficulty text not null default 'leicht',
  vegetarian_mode text not null default 'mixed',
  servings_default integer not null default 4,
  max_prep_minutes integer not null default 45,
  excluded_ingredients text[] not null default '{}',
  preferred_tags text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text not null,
  source_type text not null default 'seed',
  source_url text,
  is_vegetarian boolean not null default false,
  difficulty text not null,
  prep_minutes integer not null,
  cook_minutes integer not null,
  servings integer not null,
  tags text[] not null default '{}',
  visibility text not null default 'family',
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, title)
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  quantity text not null,
  unit text not null,
  note text,
  shopping_category text not null,
  optional boolean not null default false,
  sort_order integer not null default 0,
  unique (recipe_id, name)
);

create table public.recipe_suggestions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  suggestion_week text not null,
  rank integer not null,
  reason text not null,
  status text not null default 'suggested',
  generated_by text not null default 'seed-generator',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (family_id, recipe_id, suggestion_week)
);

create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  device_label text not null,
  platform text,
  browser text,
  last_seen_at timestamptz not null default now(),
  push_enabled boolean not null default false
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid not null references public.user_devices(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  type text not null,
  title text not null,
  body text not null,
  target_type text not null,
  target_id uuid,
  priority public.notification_priority not null default 'normal',
  created_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid references public.user_devices(id) on delete set null,
  channel public.delivery_channel not null default 'in_app',
  status public.delivery_status not null default 'pending',
  sent_at timestamptz,
  read_at timestamptz,
  error text,
  unique (notification_id, user_id, channel)
);

create or replace function app_private.is_family_member(check_family_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = check_family_id
      and fm.user_id = check_user_id
      and fm.active = true
  );
$$;

create or replace function app_private.is_family_admin(check_family_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = check_family_id
      and fm.user_id = check_user_id
      and fm.active = true
      and fm.role = 'admin'
  );
$$;

create or replace function public.create_family_notification(
  p_family_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_target_type text,
  p_target_id uuid,
  p_priority public.notification_priority default 'important'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_notification_id uuid;
begin
  if not app_private.is_family_member(p_family_id, auth.uid()) then
    raise exception 'not allowed';
  end if;

  insert into public.notifications (family_id, created_by, type, title, body, target_type, target_id, priority)
  values (p_family_id, auth.uid(), p_type, left(p_title, 120), left(p_body, 240), p_target_type, p_target_id, p_priority)
  returning id into new_notification_id;

  insert into public.notification_deliveries (notification_id, user_id, channel, status)
  select new_notification_id, fm.user_id, 'in_app', 'pending'
  from public.family_memberships fm
  where fm.family_id = p_family_id
    and fm.active = true;

  return new_notification_id;
end;
$$;

grant usage on schema app_private to authenticated;
grant execute on function app_private.is_family_member(uuid, uuid) to authenticated;
grant execute on function app_private.is_family_admin(uuid, uuid) to authenticated;
grant execute on function public.create_family_notification(uuid, text, text, text, text, uuid, public.notification_priority) to authenticated;

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.family_memberships enable row level security;
alter table public.calendars enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
alter table public.link_collections enable row level security;
alter table public.links enable row level security;
alter table public.notes enable row level security;
alter table public.waste_districts enable row level security;
alter table public.waste_sources enable row level security;
alter table public.waste_events enable row level security;
alter table public.waste_sorting_categories enable row level security;
alter table public.waste_sorting_items enable row level security;
alter table public.waste_locations enable row level security;
alter table public.activity_sources enable row level security;
alter table public.activity_suggestions enable row level security;
alter table public.activity_agent_runs enable row level security;
alter table public.recipe_preferences enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_suggestions enable row level security;
alter table public.user_devices enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;

create policy "families_select_member" on public.families for select to authenticated
using (app_private.is_family_member(id));

create policy "profiles_select_family" on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.family_memberships me
    join public.family_memberships other_member on other_member.family_id = me.family_id
    where me.user_id = (select auth.uid())
      and me.active = true
      and other_member.user_id = profiles.id
      and other_member.active = true
  )
);

create policy "profiles_update_self" on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "memberships_select_member" on public.family_memberships for select to authenticated
using (app_private.is_family_member(family_id));

create policy "family_admin_writes_memberships" on public.family_memberships for all to authenticated
using (app_private.is_family_admin(family_id))
with check (app_private.is_family_admin(family_id));

create policy "calendar_member_all" on public.calendars for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));

create policy "events_member_all" on public.events for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));

create policy "tasks_member_all" on public.tasks for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));

create policy "shopping_lists_member_all" on public.shopping_lists for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));

create policy "shopping_items_member_all" on public.shopping_items for all to authenticated
using (
  exists (
    select 1 from public.shopping_lists sl
    where sl.id = shopping_items.list_id and app_private.is_family_member(sl.family_id)
  )
)
with check (
  exists (
    select 1 from public.shopping_lists sl
    where sl.id = shopping_items.list_id and app_private.is_family_member(sl.family_id)
  )
);

create policy "link_collections_member_all" on public.link_collections for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));

create policy "links_member_all" on public.links for all to authenticated
using (
  exists (
    select 1 from public.link_collections lc
    where lc.id = links.collection_id and app_private.is_family_member(lc.family_id)
  )
)
with check (
  exists (
    select 1 from public.link_collections lc
    where lc.id = links.collection_id and app_private.is_family_member(lc.family_id)
  )
);

create policy "notes_member_all" on public.notes for all to authenticated
using (
  app_private.is_family_member(family_id)
  and (visibility <> 'adults' or app_private.is_family_admin(family_id) or exists (
    select 1 from public.family_memberships fm
    where fm.family_id = notes.family_id
      and fm.user_id = (select auth.uid())
      and fm.role in ('admin', 'adult')
      and fm.active = true
  ))
)
with check (app_private.is_family_member(family_id));

create policy "waste_districts_read_members" on public.waste_districts for select to authenticated using (true);
create policy "waste_sources_read_members" on public.waste_sources for select to authenticated using (true);
create policy "waste_events_read_members" on public.waste_events for select to authenticated using (true);
create policy "waste_sorting_categories_read_members" on public.waste_sorting_categories for select to authenticated using (true);
create policy "waste_sorting_items_read_members" on public.waste_sorting_items for select to authenticated using (true);
create policy "waste_locations_read_members" on public.waste_locations for select to authenticated using (true);

create policy "activity_sources_read_members" on public.activity_sources for select to authenticated using (true);
create policy "activity_suggestions_member_all" on public.activity_suggestions for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));
create policy "activity_agent_runs_admin_read" on public.activity_agent_runs for select to authenticated using (true);

create policy "recipe_preferences_member_all" on public.recipe_preferences for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));
create policy "recipes_member_all" on public.recipes for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));
create policy "recipe_ingredients_member_all" on public.recipe_ingredients for all to authenticated
using (
  exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id and app_private.is_family_member(r.family_id))
)
with check (
  exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id and app_private.is_family_member(r.family_id))
);
create policy "recipe_suggestions_member_all" on public.recipe_suggestions for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));

create policy "user_devices_self_all" on public.user_devices for all to authenticated
using (user_id = (select auth.uid()) and app_private.is_family_member(family_id))
with check (user_id = (select auth.uid()) and app_private.is_family_member(family_id));

create policy "push_subscriptions_self_all" on public.push_subscriptions for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "notifications_member_select" on public.notifications for select to authenticated
using (app_private.is_family_member(family_id));

create policy "notification_deliveries_self_all" on public.notification_deliveries for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create index idx_events_family_starts on public.events(family_id, starts_at);
create index idx_tasks_family_due on public.tasks(family_id, due_at);
create index idx_shopping_items_list on public.shopping_items(list_id, checked, sort_order);
create index idx_waste_events_date on public.waste_events(district_id, date);
create index idx_notifications_family on public.notifications(family_id, created_at desc);
create index idx_notification_deliveries_user on public.notification_deliveries(user_id, status, sent_at desc);

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.shopping_lists;
alter publication supabase_realtime add table public.shopping_items;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.notification_deliveries;
