create or replace function public.two45_refresh_independent_board(p_date date)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_key text := 'model-board:' || to_char(p_date, 'YYYY-MM-DD');
  v_payload jsonb;
  v_forecasts jsonb;
  v_games jsonb;
  v_model_version text;
  v_forecast_count integer := 0;
begin
  select payload into v_payload
  from public.two45_feed_snapshots
  where snapshot_key = v_key
  limit 1;

  if v_payload is null then return; end if;

  select f.model_version into v_model_version
  from public.two45_model_forecasts f
  where (f.kickoff_at at time zone 'America/New_York')::date = p_date
  order by f.created_at desc
  limit 1;

  v_model_version := coalesce(
    v_model_version,
    v_payload->'independentModel'->>'version',
    'two45-independent-v1.7'
  );

  with latest as (
    select distinct on (f.fixture_id) f.*
    from public.two45_model_forecasts_enriched f
    where (f.kickoff_at at time zone 'America/New_York')::date = p_date
      and f.model_version = v_model_version
    order by f.fixture_id, f.created_at desc
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'fixtureId', f.fixture_id,
        'providerMatchId', f.provider_match_id,
        'home', f.home_team,
        'away', f.away_team,
        'league', f.competition,
        'kickoff', f.kickoff_at,
        'modelVersion', f.model_version,
        'decision', f.decision,
        'two45View', f.two45_view,
        'modelConfidence', f.model_confidence,
        'marketValue', f.market_value,
        'market', f.market,
        'selection', f.selection,
        'probability', round((f.probability * 100)::numeric, 1),
        'fairOdds', f.fair_odds,
        'bookmaker', f.sportsbook,
        'sportsbookOdds', f.sportsbook_odds,
        'valueEdgePct', case when f.value_edge is null then null else round((f.value_edge * 100)::numeric, 1) end,
        'dataQuality', round((f.data_quality * 100)::numeric, 1),
        'confidenceTier', f.confidence_tier,
        'reasons', f.reasons,
        'createdAt', f.created_at,
        'settled', f.settled,
        'outcome', f.outcome
      )
      order by f.kickoff_at, f.created_at
    ),
    '[]'::jsonb
  ) into v_forecasts
  from latest f;

  v_forecast_count := jsonb_array_length(v_forecasts);

  select coalesce(
    jsonb_agg(
      case
        when mf.id is null then g
        else g || jsonb_build_object(
          'independentModel',
          jsonb_build_object(
            'version', mf.model_version,
            'decision', mf.decision,
            'two45View', mf.two45_view,
            'modelConfidence', mf.model_confidence,
            'marketValue', mf.market_value,
            'market', mf.market,
            'selection', mf.selection,
            'probability', round((mf.probability * 100)::numeric, 1),
            'fairOdds', mf.fair_odds,
            'sportsbookOdds', mf.sportsbook_odds,
            'valueEdgePct', case when mf.value_edge is null then null else round((mf.value_edge * 100)::numeric, 1) end,
            'dataQuality', round((mf.data_quality * 100)::numeric, 1),
            'confidenceTier', mf.confidence_tier,
            'reasons', mf.reasons,
            'settled', mf.settled,
            'outcome', mf.outcome
          )
        )
      end
      order by ord
    ),
    '[]'::jsonb
  ) into v_games
  from jsonb_array_elements(coalesce(v_payload->'games','[]'::jsonb))
       with ordinality as x(g, ord)
  left join lateral (
    select f.*
    from public.two45_model_forecasts_enriched f
    where f.fixture_id::text = coalesce(
            g->>'id',
            g->'fixture'->>'id',
            g->>'fixtureId'
          )
      and f.model_version = v_model_version
    order by f.created_at desc
    limit 1
  ) mf on true;

  update public.two45_feed_snapshots
  set payload =
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(v_payload, '{games}', v_games, true),
              '{independentForecasts}', v_forecasts, true
            ),
            '{analyzedCount}', to_jsonb(v_forecast_count), true
          ),
          '{updatedAt}', to_jsonb(now()), true
        ),
        '{independentModel}',
        jsonb_build_object(
          'version', v_model_version,
          'updatedAt', now(),
          'forecastCount', v_forecast_count,
          'qualifiedValuePicks', (
            select count(*)
            from (
              select distinct on (f.fixture_id) f.*
              from public.two45_model_forecasts_enriched f
              where (f.kickoff_at at time zone 'America/New_York')::date = p_date
                and f.model_version = v_model_version
              order by f.fixture_id, f.created_at desc
            ) f
            where f.two45_view = 'QUALIFIED_VALUE_PICK'
          ),
          'strongModelViews', (
            select count(*)
            from (
              select distinct on (f.fixture_id) f.*
              from public.two45_model_forecasts_enriched f
              where (f.kickoff_at at time zone 'America/New_York')::date = p_date
                and f.model_version = v_model_version
              order by f.fixture_id, f.created_at desc
            ) f
            where f.two45_view = 'STRONG_MODEL_VIEW_NO_VALUE_PICK'
          )
        ),
        true
      ),
      refreshed_at = now()
  where snapshot_key = v_key;
end;
$function$;
