update public.family_memberships
set visible_nav_items = array_append(visible_nav_items, 'import')
where visible_nav_items is not null
  and not ('import' = any(visible_nav_items));
