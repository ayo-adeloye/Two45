revoke all on public.two45_publications,public.two45_selection_shadow_v2,public.two45_record_baselines from service_role;
grant select,insert on public.two45_publications,public.two45_selection_shadow_v2,public.two45_record_baselines to service_role;

create function public.two45_record_report_v2() returns jsonb language sql stable security invoker set search_path=public as $$
with groups as (
 select market,count(*) selections,count(*) filter(where outcome='WIN') wins,count(*) filter(where outcome='LOSS') losses,
 count(*) filter(where outcome is null) pending,count(profit_units) priced_settled,sum(profit_units) profit_units
 from public.two45_public_record_v2 group by market
), totals as (
 select count(*) selections,count(*) filter(where outcome='PUSH') pushes,count(*) filter(where outcome='VOID') voids,
 count(profit_units) priced_settled,sum(profit_units) profit_units from public.two45_public_record_v2
)
select jsonb_build_object('scope','official-publication-ledger-v2','historicalCoverage','Retained publication evidence only; missing historical High Conviction publications cannot be reconstructed.',
 'staking','One unit per distinct selection. Ticket ROI must be reported separately.',
 'selections',totals.selections,'pushes',totals.pushes,'voids',totals.voids,'pricedSettled',totals.priced_settled,
 'profitUnits',totals.profit_units,'roi',totals.profit_units/nullif(totals.priced_settled,0),
 'byMarket',(select jsonb_agg(to_jsonb(groups)) from groups),
 'publicationMemberships',(select jsonb_object_agg(product,n) from (select product,count(*) n from public.two45_publications group by product) p),
 'legacyBaseline',(select metrics from public.two45_record_baselines order by captured_at limit 1)) from totals
$$;
revoke execute on function public.two45_record_report_v2() from public,anon,authenticated;
grant execute on function public.two45_record_report_v2() to service_role;

-- Founder stat outcomes come from the existing specialized settlement path; they
-- must not be inferred from football scores. Freeze identity stays in the ledger.
create view public.two45_founder_stat_results_v2 with(security_invoker=true) as
select p.id,f.result,f.profit_units,f.settled_at
from public.two45_publications p join public.two45_founder_picks f
on p.product='FOUNDER' and p.publication_key=f.id::text
where f.status='SETTLED' and f.result in ('WIN','LOSS','PUSH','VOID')
and f.market not in ('MATCH_RESULT','BTTS','HANDICAP','DOUBLE_CHANCE','TOTAL_GOALS','HOME_TEAM_GOALS','AWAY_TEAM_GOALS');
revoke all on public.two45_founder_stat_results_v2 from anon,authenticated;
grant select on public.two45_founder_stat_results_v2 to service_role;
