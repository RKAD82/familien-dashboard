alter table public.emergency_items
  add column if not exists url text;

alter table public.emergency_items
  drop constraint if exists emergency_items_type_check;

alter table public.emergency_items
  add constraint emergency_items_type_check
  check (type in ('contact', 'address', 'medical', 'info', 'link'));
