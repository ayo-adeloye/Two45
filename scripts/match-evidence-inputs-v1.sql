-- Server-side projection prevents downloading the whole daily odds feed.
create index if not exists two45_goal_results_home_evidence_v1 on public.two45_goal_results_v3(home_id,kickoff_at desc);
create index if not exists two45_goal_results_away_evidence_v1 on public.two45_goal_results_v3(away_id,kickoff_at desc);
create or replace function public.two45_match_evidence_inputs_v1(p_fixture_id bigint,p_as_of timestamptz,p_odds_key text)
returns jsonb language sql stable security invoker set search_path=public as $$
with j as materialized (
 select fixture_id,home_team_id::text home_id,away_team_id::text away_id,kickoff_at
 from public.two45_feature_jobs where fixture_id=p_fixture_id
 and kickoff_at>p_as_of and kickoff_at<p_as_of+interval '72 hours'
 order by requested_at desc limit 1
), history as materialized (
 select r.fixture_id,r.home_id,r.away_id,r.league_id,r.season,r.kickoff_at,r.result_available_at,r.home_goals,r.away_goals,r.final_status
 from public.two45_goal_results_v3 r cross join j
 where (r.home_id in (j.home_id,j.away_id) or r.away_id in (j.home_id,j.away_id))
 and r.kickoff_at>=p_as_of-interval '180 days' and r.kickoff_at<p_as_of and r.result_available_at<=p_as_of
 order by r.kickoff_at desc,r.fixture_id desc limit 160
), analysis as (
 select payload from public.two45_feed_snapshots where snapshot_key='model-analysis:'||p_fixture_id
), prices as (
 select v.quote_row from public.two45_feed_snapshots s
 cross join lateral jsonb_array_elements(coalesce(s.payload->'response','[]'::jsonb)) v(quote_row)
 where s.snapshot_key in ('fixture-odds:'||p_fixture_id,p_odds_key)
 and v.quote_row->'fixture'->>'id'=p_fixture_id::text
)
select jsonb_build_object(
 'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.kickoff_at desc,h.fixture_id desc) from history h),'[]'::jsonb),
 'conflicts',coalesce((select jsonb_agg(c.fixture_id) from public.two45_goal_result_conflicts_v3 c join history h using(fixture_id) where c.observed_at<=p_as_of),'[]'::jsonb),
 'prices',jsonb_build_object('response',coalesce((select jsonb_agg(quote_row) from prices),'[]'::jsonb)),
 'analysis',(select jsonb_build_object('forecast',payload->'forecast','analysis',jsonb_build_object(
  'modelVersion',payload->'analysis'->'modelVersion','generatedAt',payload->'analysis'->'generatedAt',
  'probabilities',payload->'analysis'->'probabilities','expectedGoals',payload->'analysis'->'expectedGoals',
  'intelligence',jsonb_build_object('availability',jsonb_build_object(
   'generatedAt',payload->'analysis'->'intelligence'->'availability'->'generatedAt',
   'lineupsConfirmed',payload->'analysis'->'intelligence'->'availability'->'lineupsConfirmed',
   'injuries',payload->'analysis'->'intelligence'->'availability'->'injuries',
   'injuriesError',payload->'analysis'->'intelligence'->'availability'->'injuriesError')))) from analysis),
 'core',(select jsonb_build_object('id',id,'fixture_id',fixture_id,'model_id',model_id,'generated_at',generated_at,'kickoff_at',kickoff_at,
  'forecast',payload->'forecast','context',payload->'context','datasetHash',payload->>'datasetHash')
  from public.two45_goal_forecasts_v3 where fixture_id=p_fixture_id and generated_at<=p_as_of order by generated_at desc,id desc limit 1)
) from j
$$;
revoke execute on function public.two45_match_evidence_inputs_v1(bigint,timestamptz,text) from public,anon,authenticated;
grant execute on function public.two45_match_evidence_inputs_v1(bigint,timestamptz,text) to service_role;
