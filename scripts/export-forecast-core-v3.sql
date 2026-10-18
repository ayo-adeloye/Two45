-- Feed this read-only export into scripts/evaluate-shadow-v2.mjs.
select f.fixture_id,f.kickoff_at,f.generated_at,r.home_goals final_home_score,r.away_goals final_away_score,
f.payload||jsonb_build_object('legacyResearchDecision',f.payload->'legacy'->'decision') payload
from public.two45_goal_forecasts_v3 f left join public.two45_goal_results_v3 r using(fixture_id)
where not exists(select 1 from public.two45_goal_result_conflicts_v3 c where c.fixture_id=f.fixture_id)
order by f.fixture_id,f.generated_at;
