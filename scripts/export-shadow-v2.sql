-- Read-only export for the prospective evaluation harness. Conflicting final scores abstain.
with scores as (
 select fixture_id,min(final_home_score) final_home_score,min(final_away_score) final_away_score
 from public.two45_model_forecasts where settled and final_home_score is not null and final_away_score is not null
 group by fixture_id having count(distinct(final_home_score,final_away_score))=1
)
select s.*,f.final_home_score,f.final_away_score from public.two45_selection_shadow_v2 s left join scores f using(fixture_id)
order by s.fixture_id,s.generated_at;
