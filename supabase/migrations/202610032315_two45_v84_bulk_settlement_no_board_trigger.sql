create or replace function public.two45_sync_forecast_to_board()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if coalesce(current_setting('two45.skip_board_refresh', true), '') = 'on' then
    return coalesce(new, old);
  end if;

  perform public.two45_refresh_independent_board(
    (coalesce(new.kickoff_at, old.kickoff_at) at time zone 'America/New_York')::date
  );
  return coalesce(new, old);
end;
$function$;

create or replace function public.two45_settle_open_forecasts()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_total integer := 0;
  v_n integer := 0;
begin
  perform set_config('two45.skip_board_refresh', 'on', true);

  for r in
    with finished as (
      select distinct on ((x->'fixture'->>'id'))
        (x->'fixture'->>'id') as provider_match_id,
        (x->'goals'->>'home')::integer as home_score,
        (x->'goals'->>'away')::integer as away_score,
        s.refreshed_at
      from public.two45_feed_snapshots s
      cross join lateral jsonb_array_elements(
        case
          when jsonb_typeof(s.payload->'fixtures') = 'array' then s.payload->'fixtures'
          else '[]'::jsonb
        end
      ) x
      where s.snapshot_key like 'fixtures:%'
        and (x->'fixture'->'status'->>'short') in ('FT','AET','PEN')
        and x->'goals'->>'home' is not null
        and x->'goals'->>'away' is not null
      order by (x->'fixture'->>'id'), s.refreshed_at desc
    )
    select f.provider_match_id, f.home_score, f.away_score
    from finished f
    where exists (
      select 1
      from public.two45_model_forecasts mf
      where mf.provider_match_id = f.provider_match_id
        and mf.settled = false
    )
  loop
    select public.two45_settle_model_forecasts(
      r.provider_match_id,
      r.home_score,
      r.away_score,
      null
    ) into v_n;
    v_total := v_total + coalesce(v_n, 0);
  end loop;

  return v_total;
end;
$function$;
