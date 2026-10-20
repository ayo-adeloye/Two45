-- SHADOW-ONLY: apply only in a coordinated v3.2 rollout AFTER historical paired validation.
-- Team coefficients now use season:team, preserving distinct season-specific league baselines.
create or replace function public.two45_goal_context_v3(
 p_league text,p_season text,p_home text,p_away text,
 p_as_of timestamptz,p_kickoff timestamptz
) returns jsonb language sql stable set search_path to 'public' as $function$
with model as (
 select * from public.two45_goal_model_artifacts_v3
 where trained_before<=p_as_of and model_version='two45-independent-core-v3.2'
 order by trained_before desc limit 1
), home_feature as (
 select payload||jsonb_build_object('source_snapshot_id',payload->>'id','id','goal-feature:'||id) payload
 from public.two45_goal_feature_history_v3
 where provider_league_id=p_league and season=p_season and provider_team_id=p_home
 and observed_at<=p_as_of and payload->>'cutoff_date'<(p_kickoff at time zone 'UTC')::date::text
 order by observed_at desc,id desc limit 1
), away_feature as (
 select payload||jsonb_build_object('source_snapshot_id',payload->>'id','id','goal-feature:'||id) payload
 from public.two45_goal_feature_history_v3
 where provider_league_id=p_league and season=p_season and provider_team_id=p_away
 and observed_at<=p_as_of and payload->>'cutoff_date'<(p_kickoff at time zone 'UTC')::date::text
 order by observed_at desc,id desc limit 1
)
select jsonb_build_object(
 'model_id',id,'dataset_hash',dataset_hash,
 'model',(parameters-'teams'-'leagues')||jsonb_build_object(
  'leagues',jsonb_build_object(p_league||':'||p_season,parameters->'leagues'->(p_league||':'||p_season)),
  'teams',jsonb_build_object(
   p_season||':'||p_home,parameters->'teams'->(p_season||':'||p_home),
   p_season||':'||p_away,parameters->'teams'->(p_season||':'||p_away)
  )),
 'home_feature',(select payload from home_feature),
 'away_feature',(select payload from away_feature)
) from model
$function$;
