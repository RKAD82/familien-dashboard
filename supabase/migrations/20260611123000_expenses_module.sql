create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  slug text not null,
  color text not null default '#4e6d9a',
  icon text not null default 'folder',
  sort_order integer not null default 100,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (family_id, slug)
);

create index if not exists expense_categories_family_idx on public.expense_categories (family_id, active, sort_order);

alter table public.expense_categories enable row level security;

drop policy if exists "expense_categories_member_all" on public.expense_categories;
create policy "expense_categories_member_all" on public.expense_categories for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  category_id uuid not null references public.expense_categories(id) on delete restrict,
  title text not null,
  provider_name text,
  amount_eur numeric(10, 2),
  billing_cycle text not null default 'yearly' check (billing_cycle in ('monthly', 'quarterly', 'yearly', 'one_time', 'unknown')),
  billing_note text,
  expense_year integer not null check (expense_year between 2000 and 2100),
  paid_from text,
  contract_until date,
  cancellation_notice text,
  next_review_at date,
  contact_name text,
  phone text,
  email text,
  website_url text,
  customer_number text,
  comparison_url text,
  status text not null default 'active' check (status in ('active', 'review', 'better_offer', 'cancelled', 'paused')),
  notes text,
  source_contract_id uuid unique,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists expenses_family_year_category_idx on public.expenses (family_id, expense_year, category_id);
create index if not exists expenses_family_review_idx on public.expenses (family_id, next_review_at, status);

alter table public.expenses enable row level security;

drop policy if exists "expenses_member_all" on public.expenses;
create policy "expenses_member_all" on public.expenses for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));

insert into public.expense_categories (family_id, title, slug, color, icon, sort_order)
select families.id, defaults.title, defaults.slug, defaults.color, defaults.icon, defaults.sort_order
from public.families
cross join (
  values
    ('Haushalt', 'haushalt', '#5f766e', 'home', 10),
    ('Versicherungen', 'versicherungen', '#4e6d9a', 'shield', 20),
    ('Abos', 'abos', '#8a6b47', 'repeat', 30),
    ('Mobilität', 'mobilitaet', '#6d5d90', 'car', 40),
    ('Freizeit', 'freizeit', '#8a5d71', 'sparkles', 50),
    ('Sonstiges', 'sonstiges', '#69737a', 'folder', 90)
) as defaults(title, slug, color, icon, sort_order)
on conflict (family_id, slug) do nothing;

insert into public.expenses (
  family_id,
  category_id,
  title,
  provider_name,
  amount_eur,
  billing_cycle,
  billing_note,
  expense_year,
  contract_until,
  cancellation_notice,
  next_review_at,
  contact_name,
  phone,
  email,
  website_url,
  customer_number,
  comparison_url,
  status,
  notes,
  source_contract_id,
  created_by,
  updated_at
)
select
  contracts.family_id,
  categories.id,
  contracts.product_name,
  contracts.provider_name,
  contracts.annual_cost_eur,
  'yearly',
  contracts.billing_cycle,
  coalesce(extract(year from contracts.next_review_at)::integer, extract(year from now())::integer),
  contracts.contract_until,
  contracts.cancellation_notice,
  contracts.next_review_at,
  contracts.contact_name,
  contracts.phone,
  contracts.email,
  contracts.website_url,
  contracts.customer_number,
  contracts.comparison_url,
  contracts.status,
  contracts.notes,
  contracts.id,
  contracts.created_by,
  contracts.updated_at
from public.service_contracts contracts
join public.expense_categories categories
  on categories.family_id = contracts.family_id
  and categories.slug = case
    when lower(contracts.kind) like '%versicherung%' then 'versicherungen'
    when lower(contracts.kind) in ('strom', 'gas', 'wasser', 'internet', 'mobilfunk') then 'haushalt'
    else 'sonstiges'
  end
on conflict (source_contract_id) do nothing;
