create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  category text not null default 'Inventar',
  location text not null default 'Haus',
  purchase_date date,
  warranty_until date,
  value_eur numeric(10, 2),
  serial_number text,
  document_url text,
  condition text not null default 'ok' check (condition in ('ok', 'watch', 'repair', 'replace')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists inventory_items_family_idx on public.inventory_items (family_id, category, location);

alter table public.inventory_items enable row level security;

drop policy if exists "inventory_items_member_all" on public.inventory_items;
create policy "inventory_items_member_all" on public.inventory_items for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));

create table if not exists public.service_contracts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  kind text not null default 'Versicherung',
  provider_name text not null,
  product_name text not null,
  contact_name text,
  phone text,
  email text,
  website_url text,
  customer_number text,
  annual_cost_eur numeric(10, 2),
  billing_cycle text,
  contract_until date,
  cancellation_notice text,
  next_review_at date,
  comparison_url text,
  status text not null default 'active' check (status in ('active', 'review', 'better_offer', 'cancelled')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists service_contracts_family_review_idx on public.service_contracts (family_id, next_review_at, status);

alter table public.service_contracts enable row level security;

drop policy if exists "service_contracts_member_all" on public.service_contracts;
create policy "service_contracts_member_all" on public.service_contracts for all to authenticated
using (app_private.is_family_member(family_id))
with check (app_private.is_family_member(family_id));
