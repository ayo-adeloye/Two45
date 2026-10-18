create or replace view public.two45_public_record_v2 with(security_invoker=true) as
with first_publication as (
 select distinct on(fixture_id,market,selection) * from public.two45_publications
 order by fixture_id,market,selection,published_at,id
), scores as (
 select fixture_id,min(final_home_score) h,min(final_away_score) a,max(settled_at) settled_at
 from public.two45_model_forecasts where settled and final_home_score is not null and final_away_score is not null
 group by fixture_id having count(distinct (final_home_score,final_away_score))=1
), graded as (
 select p.*,s.h,s.a,coalesce(s.settled_at,f.settled_at) settled_at,coalesce(public.two45_grade_publication_v2(p.market,p.selection,s.h,s.a),case when p.market in ('AWAY_CARDS','HOME_CARDS','TOTAL_CARDS') and f.status='SETTLED' and f.result in ('WIN','LOSS','PUSH','VOID') then f.result end) outcome,
 coalesce((p.snapshot->>'sportsbookOdds')::numeric,(p.snapshot->>'published_odds')::numeric,(p.snapshot->>'_ticketOdds')::numeric) sportsbook_odds
 from first_publication p left join scores s using(fixture_id) left join public.two45_founder_picks f on p.product='FOUNDER' and p.publication_key=f.id::text and p.fixture_id=f.fixture_id and p.market=f.market and p.selection=public.two45_selection_key_v2(f.selection)
)
select id,fixture_id,kickoff_at,coalesce(snapshot->>'league',snapshot->>'competition') competition,
coalesce(snapshot->>'home',snapshot->>'home_team') home_team,coalesce(snapshot->>'away',snapshot->>'away_team') away_team,
market,selection,sportsbook_odds,case when coalesce(snapshot->>'probability','') ~ '^[0-9.]+$' then (snapshot->>'probability')::numeric end probability,
outcome,h final_home_score,a final_away_score,settled_at,published_at created_at,product,evidence_key,
case when outcome='WIN' and sportsbook_odds>1 then sportsbook_odds-1 when outcome='LOSS' and sportsbook_odds>1 then -1 when outcome in ('PUSH','VOID') then 0 end profit_units
from graded;
