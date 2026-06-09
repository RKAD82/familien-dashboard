create extension if not exists pg_cron with schema extensions;

create or replace function public.refresh_activity_content(p_family_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_family record;
  v_sources_checked integer := 0;
  v_items_found integer := 0;
  v_items_archived integer := 0;
  v_items_active integer := 0;
  v_total_runs integer := 0;
  v_total_archived integer := 0;
begin
  select count(*) into v_sources_checked
  from public.activity_sources
  where active = true;

  update public.activity_sources
  set last_checked_at = now()
  where active = true;

  for v_family in
    select id
    from public.families
    where p_family_id is null or id = p_family_id
  loop
    select count(*) into v_items_found
    from public.activity_suggestions
    where family_id = v_family.id;

    update public.activity_suggestions
    set status = 'archived'
    where family_id = v_family.id
      and status = 'suggested'
      and (
        (expires_at is not null and expires_at < now())
        or (starts_at is not null and starts_at < now())
      );

    get diagnostics v_items_archived = row_count;

    select count(*) into v_items_active
    from public.activity_suggestions
    where family_id = v_family.id
      and status <> 'archived';

    insert into public.activity_agent_runs (
      family_id,
      run_type,
      status,
      finished_at,
      sources_checked,
      items_found,
      items_saved,
      error_summary
    )
    values (
      v_family.id,
      'activities',
      'ok',
      now(),
      v_sources_checked,
      v_items_found,
      v_items_active,
      case when v_items_archived > 0 then v_items_archived || ' alte Vorschläge archiviert.' else null end
    );

    v_total_runs := v_total_runs + 1;
    v_total_archived := v_total_archived + v_items_archived;
  end loop;

  return jsonb_build_object(
    'status', 'ok',
    'run_type', 'activities',
    'families', v_total_runs,
    'sources_checked', v_sources_checked,
    'archived', v_total_archived
  );
end;
$$;

create or replace function public.refresh_recipe_content(p_family_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_family record;
  v_week text := to_char(current_date, 'IYYY-"W"IW');
  v_items_found integer := 0;
  v_items_saved integer := 0;
  v_total_runs integer := 0;
  v_total_saved integer := 0;
begin
  for v_family in
    select id
    from public.families
    where p_family_id is null or id = p_family_id
  loop
    select count(*) into v_items_found
    from public.recipes
    where family_id = v_family.id
      and status = 'active';

    update public.recipe_suggestions
    set status = 'archived'
    where family_id = v_family.id
      and suggestion_week = v_week
      and status <> 'archived';

    with vegetarian as (
      select id, title, is_vegetarian, updated_at
      from public.recipes
      where family_id = v_family.id
        and status = 'active'
        and is_vegetarian = true
      order by updated_at desc, title
      limit 2
    ),
    selected as (
      select id, title, is_vegetarian, updated_at, 1 as bucket
      from vegetarian
      union all
      select id, title, is_vegetarian, updated_at, 2 as bucket
      from public.recipes
      where family_id = v_family.id
        and status = 'active'
        and id not in (select id from vegetarian)
    ),
    limited as (
      select id, is_vegetarian, row_number() over (order by bucket, updated_at desc, title)::integer as rank
      from selected
      order by bucket, updated_at desc, title
      limit 5
    ),
    upserted as (
      insert into public.recipe_suggestions (
        family_id,
        recipe_id,
        suggestion_week,
        rank,
        reason,
        status,
        generated_by,
        expires_at
      )
      select
        v_family.id,
        id,
        v_week,
        rank,
        case when is_vegetarian then 'Vegetarische Mindestabdeckung' else 'Abwechslung für die Woche' end,
        'suggested',
        'seed-generator',
        now() + interval '14 days'
      from limited
      on conflict (family_id, recipe_id, suggestion_week)
      do update set
        rank = excluded.rank,
        reason = excluded.reason,
        status = 'suggested',
        generated_by = excluded.generated_by,
        expires_at = excluded.expires_at
      returning 1
    )
    select count(*) into v_items_saved from upserted;

    insert into public.activity_agent_runs (
      family_id,
      run_type,
      status,
      finished_at,
      sources_checked,
      items_found,
      items_saved,
      error_summary
    )
    values (
      v_family.id,
      'recipes',
      'ok',
      now(),
      v_items_found,
      v_items_found,
      v_items_saved,
      null
    );

    v_total_runs := v_total_runs + 1;
    v_total_saved := v_total_saved + v_items_saved;
  end loop;

  return jsonb_build_object(
    'status', 'ok',
    'run_type', 'recipes',
    'week', v_week,
    'families', v_total_runs,
    'suggestions', v_total_saved
  );
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'family-dashboard-refresh-activities') then
    perform cron.unschedule('family-dashboard-refresh-activities');
  end if;
exception
  when undefined_function or undefined_table then null;
end $$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'family-dashboard-refresh-recipes') then
    perform cron.unschedule('family-dashboard-refresh-recipes');
  end if;
exception
  when undefined_function or undefined_table then null;
end $$;

select cron.schedule(
  'family-dashboard-refresh-activities',
  '10 5 * * *',
  'select public.refresh_activity_content();'
);

select cron.schedule(
  'family-dashboard-refresh-recipes',
  '20 5 * * 1',
  'select public.refresh_recipe_content();'
);
