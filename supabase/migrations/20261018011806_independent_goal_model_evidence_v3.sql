-- All final regulation results are research/training labels, never public Record entries.
create table public.two45_goal_results_v3 (
 fixture_id bigint primary key,league_id text not null,season text not null,
 home_id text not null,away_id text not null,home_name text,away_name text,competition text,country text,
 kickoff_at timestamptz not null,home_goals integer not null,away_goals integer not null,
 result_available_at timestamptz not null,final_status text not null default 'FT',
 source_key text not null,
 check(home_id<>away_id and home_goals>=0 and away_goals>=0 and home_goals<=30 and away_goals<=30 and result_available_at>=kickoff_at)
);
create index on public.two45_goal_results_v3(result_available_at,kickoff_at);
create table public.two45_goal_result_conflicts_v3 (
 fixture_id bigint primary key,observed_at timestamptz not null default now(),before_state jsonb not null,after_state jsonb not null
);
create table public.two45_goal_feature_history_v3 (
 id bigint generated always as identity primary key,feature_key text not null,provider_team_id text not null,
 provider_league_id text not null,season text not null,observed_at timestamptz not null,payload jsonb not null,
 unique(feature_key,observed_at)
);
create index on public.two45_goal_feature_history_v3(provider_league_id,season,provider_team_id,observed_at desc);
create table public.two45_goal_model_artifacts_v3 (
 id uuid primary key default gen_random_uuid(),artifact_key text not null unique,created_at timestamptz not null default now(),
 model_version text not null,trained_before timestamptz not null,dataset_hash text not null,
 parameters jsonb not null,validation jsonb not null,
 check(parameters->>'version'=model_version),check(coalesce((validation->>'promotionAllowed')::boolean,false)=false)
);
create index on public.two45_goal_model_artifacts_v3(model_version,trained_before desc);
create table public.two45_goal_forecasts_v3 (
 id bigint generated always as identity primary key,fixture_id bigint not null,model_id uuid not null references public.two45_goal_model_artifacts_v3(id),
 generated_at timestamptz not null,kickoff_at timestamptz not null,payload jsonb not null,
 check(generated_at<kickoff_at)
);
create index on public.two45_goal_forecasts_v3(fixture_id,generated_at desc);
alter table public.two45_goal_results_v3 enable row level security;
alter table public.two45_goal_result_conflicts_v3 enable row level security;
alter table public.two45_goal_feature_history_v3 enable row level security;
alter table public.two45_goal_model_artifacts_v3 enable row level security;
alter table public.two45_goal_forecasts_v3 enable row level security;
revoke all on public.two45_goal_results_v3,public.two45_goal_result_conflicts_v3,public.two45_goal_feature_history_v3,public.two45_goal_model_artifacts_v3,public.two45_goal_forecasts_v3 from anon,authenticated,service_role;
grant select,insert on public.two45_goal_results_v3,public.two45_goal_result_conflicts_v3,public.two45_goal_feature_history_v3,public.two45_goal_model_artifacts_v3,public.two45_goal_forecasts_v3 to service_role;
grant usage,select on sequence public.two45_goal_feature_history_v3_id_seq,public.two45_goal_forecasts_v3_id_seq to service_role;

create function public.two45_capture_goal_results_v3(p_key text,p_payload jsonb,p_observed_at timestamptz,p_seed boolean default false)
returns void language plpgsql security invoker set search_path=public as $$
declare x jsonb; f bigint; observed timestamptz; existing public.two45_goal_results_v3; candidate jsonb;
begin
 for x in select value from jsonb_array_elements(coalesce(p_payload->'fixtures','[]'::jsonb)) loop
  if x->'fixture'->'status'->>'short' is distinct from 'FT' or x->'goals'->>'home' is null or x->'goals'->>'away' is null or x->'league'->>'id' is null or x->'league'->>'season' is null or x->'teams'->'home'->>'id' is null or x->'teams'->'away'->>'id' is null then continue; end if;
  if (x->'goals'->>'home')::integer not between 0 and 30 or (x->'goals'->>'away')::integer not between 0 and 30 or x->'teams'->'home'->>'id'=x->'teams'->'away'->>'id' then continue; end if;
  f:=(x->'fixture'->>'id')::bigint; observed:=p_observed_at;
  if p_seed then
   select least(p_observed_at,min(settled_at)) into observed from public.two45_model_forecasts
   where fixture_id=f and settled and final_home_score=(x->'goals'->>'home')::integer and final_away_score=(x->'goals'->>'away')::integer;
   observed:=coalesce(observed,p_observed_at);
  end if;
  if observed<(x->'fixture'->>'date')::timestamptz then continue; end if;
  candidate:=jsonb_build_object('fixture_id',f,'league_id',x->'league'->>'id','season',x->'league'->>'season','home_id',x->'teams'->'home'->>'id','away_id',x->'teams'->'away'->>'id','home_goals',(x->'goals'->>'home')::integer,'away_goals',(x->'goals'->>'away')::integer);
  select * into existing from public.two45_goal_results_v3 where fixture_id=f;
  if found and (existing.league_id<>candidate->>'league_id' or existing.season<>candidate->>'season' or existing.home_id<>candidate->>'home_id' or existing.away_id<>candidate->>'away_id' or existing.home_goals<>(candidate->>'home_goals')::integer or existing.away_goals<>(candidate->>'away_goals')::integer) then
   insert into public.two45_goal_result_conflicts_v3(fixture_id,before_state,after_state) values(f,to_jsonb(existing),candidate) on conflict do nothing;
  elsif not found then
   insert into public.two45_goal_results_v3(fixture_id,league_id,season,home_id,away_id,home_name,away_name,competition,country,kickoff_at,home_goals,away_goals,result_available_at,source_key)
   values(f,x->'league'->>'id',x->'league'->>'season',x->'teams'->'home'->>'id',x->'teams'->'away'->>'id',x->'teams'->'home'->>'name',x->'teams'->'away'->>'name',x->'league'->>'name',x->'league'->>'country',(x->'fixture'->>'date')::timestamptz,(x->'goals'->>'home')::integer,(x->'goals'->>'away')::integer,observed,p_key) on conflict do nothing;
  end if;
 end loop;
end;
$$;
revoke execute on function public.two45_capture_goal_results_v3(text,jsonb,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.two45_capture_goal_results_v3(text,jsonb,timestamptz,boolean) to service_role;

create function public.two45_goal_result_trigger_v3() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.snapshot_key like 'fixtures:%' then perform public.two45_capture_goal_results_v3(new.snapshot_key,new.payload,new.refreshed_at,false); end if;
 return new;
end;
$$;
create trigger two45_goal_results_capture_v3 after insert or update on public.two45_feed_snapshots for each row execute function public.two45_goal_result_trigger_v3();
select public.two45_capture_goal_results_v3(snapshot_key,payload,refreshed_at,true) from public.two45_feed_snapshots where snapshot_key like 'fixtures:%' order by refreshed_at;

create function public.two45_goal_feature_payload_v3(f public.two45_team_feature_snapshots) returns jsonb language sql immutable set search_path=public as $$
select jsonb_build_object('id',f.id,'feature_key',f.feature_key,'provider_team_id',f.provider_team_id,'provider_league_id',f.provider_league_id,'season',f.season,'as_of',f.as_of,'sample_size',f.sample_size,'cutoff_date',f.source_meta->>'cutoff','played',f.raw_features#>'{fixtures,played}','goals_for',f.raw_features#>'{goals,for,total}','goals_against',f.raw_features#>'{goals,against,total}')
$$;
create function public.two45_goal_feature_trigger_v3() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.provider_team_id is null or new.provider_league_id is null or new.season is null or new.as_of is null then return new; end if;
 insert into public.two45_goal_feature_history_v3(feature_key,provider_team_id,provider_league_id,season,observed_at,payload)
 values(new.feature_key,new.provider_team_id,new.provider_league_id,new.season::text,new.as_of,public.two45_goal_feature_payload_v3(new)) on conflict do nothing;
 return new;
end;
$$;
create trigger two45_goal_features_capture_v3 after insert or update on public.two45_team_feature_snapshots for each row execute function public.two45_goal_feature_trigger_v3();
insert into public.two45_goal_feature_history_v3(feature_key,provider_team_id,provider_league_id,season,observed_at,payload)
select feature_key,provider_team_id,provider_league_id,season::text,as_of,public.two45_goal_feature_payload_v3(f) from public.two45_team_feature_snapshots f where provider_team_id is not null and provider_league_id is not null and season is not null and as_of is not null on conflict do nothing;

create function public.two45_goal_training_data_v3(p_as_of timestamptz) returns jsonb language sql stable security invoker set search_path=public as $$
with results as (
 select r.* from public.two45_goal_results_v3 r where result_available_at<p_as_of and kickoff_at<p_as_of and kickoff_at>=p_as_of-interval '365 days'
 and not exists(select 1 from public.two45_goal_result_conflicts_v3 c where c.fixture_id=r.fixture_id and c.observed_at<p_as_of)
 order by kickoff_at desc,fixture_id limit 20001
), features as (
 select payload from public.two45_goal_feature_history_v3 where observed_at<p_as_of and observed_at>=p_as_of-interval '395 days' order by observed_at,id limit 50001
)
select jsonb_build_object('fixtures',coalesce((select jsonb_agg(to_jsonb(r) order by kickoff_at,fixture_id) from results r),'[]'::jsonb),
'features',coalesce((select jsonb_agg(payload) from features),'[]'::jsonb),'truncated',(select count(*)>20000 from results) or (select count(*)>50000 from features))
$$;
revoke execute on function public.two45_goal_training_data_v3(timestamptz) from public,anon,authenticated;
grant execute on function public.two45_goal_training_data_v3(timestamptz) to service_role;

create function public.two45_goal_context_v3(p_league text,p_season text,p_home text,p_away text,p_as_of timestamptz,p_kickoff timestamptz)
returns jsonb language sql stable security invoker set search_path=public as $$
with model as (
 select * from public.two45_goal_model_artifacts_v3 where trained_before<=p_as_of and model_version='two45-independent-core-v3.1' order by trained_before desc limit 1
), home_feature as (
 select payload from public.two45_goal_feature_history_v3 where provider_league_id=p_league and season=p_season and provider_team_id=p_home and observed_at<=p_as_of and payload->>'cutoff_date'<(p_kickoff at time zone 'UTC')::date::text order by observed_at desc,id desc limit 1
), away_feature as (
 select payload from public.two45_goal_feature_history_v3 where provider_league_id=p_league and season=p_season and provider_team_id=p_away and observed_at<=p_as_of and payload->>'cutoff_date'<(p_kickoff at time zone 'UTC')::date::text order by observed_at desc,id desc limit 1
)
select jsonb_build_object('model_id',id,'dataset_hash',dataset_hash,
 'model',(parameters-'teams'-'leagues')||jsonb_build_object('leagues',jsonb_build_object(p_league||':'||p_season,parameters->'leagues'->(p_league||':'||p_season)),'teams',jsonb_build_object(p_league||':'||p_season||':'||p_home,parameters->'teams'->(p_league||':'||p_season||':'||p_home),p_league||':'||p_season||':'||p_away,parameters->'teams'->(p_league||':'||p_season||':'||p_away))),
 'home_feature',(select payload from home_feature),'away_feature',(select payload from away_feature)) from model
$$;
revoke execute on function public.two45_goal_context_v3(text,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.two45_goal_context_v3(text,text,text,text,timestamptz,timestamptz) to service_role;
