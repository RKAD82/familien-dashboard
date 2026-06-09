alter table public.family_memberships
  add column if not exists login_name text;

create unique index if not exists idx_family_memberships_family_login_name
  on public.family_memberships(family_id, lower(login_name))
  where login_name is not null;

alter table public.shopping_lists
  add column if not exists is_template boolean not null default false;

create index if not exists idx_shopping_lists_family_template
  on public.shopping_lists(family_id, is_template, archived, title);
