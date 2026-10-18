-- Immutable revision identity must refer to the retained history row, not its mutable source row.
create or replace function public.two45_goal_training_data_v3(p_as_of timestamptz) returns jsonb language sql stable security invoker set search_path=public as $$
with results as (
 select r.* from public.two45_goal_results_v3 r where result_available_at<p_as_of and kickoff_at<p_as_of and kickoff_at>=p_as_of-interval '365 days'
 and not exists(select 1 from public.two45_goal_result_conflicts_v3 c where c.fixture_id=r.fixture_id and c.observed_at<p_as_of)
 order by kickoff_at desc,fixture_id limit 20001
), features as (
 select payload||jsonb_build_object('source_snapshot_id',payload->>'id','id','goal-feature:'||id) payload from public.two45_goal_feature_history_v3
 where observed_at<p_as_of and observed_at>=p_as_of-interval '395 days' order by observed_at,id limit 50001
)
select jsonb_build_object('fixtures',coalesce((select jsonb_agg(to_jsonb(r) order by kickoff_at,fixture_id) from results r),'[]'::jsonb),
'features',coalesce((select jsonb_agg(payload) from features),'[]'::jsonb),'truncated',(select count(*)>20000 from results) or (select count(*)>50000 from features))
$$;

create or replace function public.two45_goal_context_v3(p_league text,p_season text,p_home text,p_away text,p_as_of timestamptz,p_kickoff timestamptz)
returns jsonb language sql stable security invoker set search_path=public as $$
with model as (
 select * from public.two45_goal_model_artifacts_v3 where trained_before<=p_as_of and model_version='two45-independent-core-v3.1' order by trained_before desc limit 1
), home_feature as (
 select payload||jsonb_build_object('source_snapshot_id',payload->>'id','id','goal-feature:'||id) payload from public.two45_goal_feature_history_v3
 where provider_league_id=p_league and season=p_season and provider_team_id=p_home and observed_at<=p_as_of and payload->>'cutoff_date'<(p_kickoff at time zone 'UTC')::date::text order by observed_at desc,id desc limit 1
), away_feature as (
 select payload||jsonb_build_object('source_snapshot_id',payload->>'id','id','goal-feature:'||id) payload from public.two45_goal_feature_history_v3
 where provider_league_id=p_league and season=p_season and provider_team_id=p_away and observed_at<=p_as_of and payload->>'cutoff_date'<(p_kickoff at time zone 'UTC')::date::text order by observed_at desc,id desc limit 1
)
select jsonb_build_object('model_id',id,'dataset_hash',dataset_hash,
 'model',(parameters-'teams'-'leagues')||jsonb_build_object('leagues',jsonb_build_object(p_league||':'||p_season,parameters->'leagues'->(p_league||':'||p_season)),'teams',jsonb_build_object(p_league||':'||p_season||':'||p_home,parameters->'teams'->(p_league||':'||p_season||':'||p_home),p_league||':'||p_season||':'||p_away,parameters->'teams'->(p_league||':'||p_season||':'||p_away))),
 'home_feature',(select payload from home_feature),'away_feature',(select payload from away_feature)) from model
$$;

create function public.two45_goal_calibration_v3(p_as_of timestamptz) returns jsonb language sql stable security invoker set search_path=public as $$
with frozen as (
 select distinct on(f.fixture_id) f.* from public.two45_goal_forecasts_v3 f
 where generated_at<=kickoff_at-interval '1 hour' and generated_at<p_as_of
 order by fixture_id,generated_at desc
), events as (
 select 'two45-independent-core-v3.1'||'|'||m.key||'|'||s.key key,(s.value#>>'{}')::numeric p,
 public.two45_grade_publication_v2(m.key,s.key,r.home_goals,r.away_goals) outcome
 from frozen f join public.two45_goal_results_v3 r using(fixture_id)
 cross join lateral jsonb_each(f.payload->'forecast'->'probabilities') m
 cross join lateral jsonb_each(m.value) s
 where r.result_available_at<p_as_of and not exists(select 1 from public.two45_goal_result_conflicts_v3 c where c.fixture_id=r.fixture_id and c.observed_at<p_as_of)
), counts as (
 select key,count(*) n,count(*) filter(where outcome='WIN') wins,sum(p) sum_p from events where outcome in ('WIN','LOSS') and p>0 and p<1 group by key
)
select jsonb_build_object('version','selection-v2','trainedBefore',p_as_of,'minSample',60,'groups',
 coalesce((select jsonb_object_agg(key,jsonb_build_object('n',n,'wins',wins,'sumP',sum_p,'offset',(wins-sum_p)/(n+100.0),'ready',n>=60,'uncertainty',sqrt(.25/(n+1.0)))) from counts),'{}'::jsonb))
$$;
revoke execute on function public.two45_goal_calibration_v3(timestamptz) from public,anon,authenticated;
grant execute on function public.two45_goal_calibration_v3(timestamptz) to service_role;

create function public.two45_goal_status_v3() returns jsonb language sql stable security invoker set search_path=public as $$
select jsonb_build_object('mode','SHADOW','promotionAllowed',false,
 'latestArtifact',(select jsonb_build_object('id',id,'version',model_version,'trainedBefore',trained_before,'trainingFixtures',parameters->'trainingFixtures','datasetHash',dataset_hash) from public.two45_goal_model_artifacts_v3 order by trained_before desc limit 1),
 'forecasts',(select count(*) from public.two45_goal_forecasts_v3),'lastForecastAt',(select max(generated_at) from public.two45_goal_forecasts_v3),
 'resultConflicts',(select count(*) from public.two45_goal_result_conflicts_v3),
 'recentRejections',(select jsonb_object_agg(reason,n) from (select reason,count(*) n from (select payload from public.two45_goal_forecasts_v3 order by generated_at desc limit 100) f cross join lateral jsonb_array_elements_text(f.payload->'forecast'->'rejectionReasons') reason group by reason) r))
$$;
revoke execute on function public.two45_goal_status_v3() from public,anon,authenticated;
grant execute on function public.two45_goal_status_v3() to service_role;
