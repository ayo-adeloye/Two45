-- Read-only diagnostic for Bet365 quote starvation.
-- Date-specific fixture snapshot. No picks published by this query.
with rows as (
 select jsonb_array_elements(payload->'response') as x
 from public.two45_feed_snapshots
 where snapshot_key='odds:2026-10-20'
), stats as (
 select (x->>'observedAt')::timestamptz as observed_at,
        (x->>'providerUpdatedAt')::timestamptz as provider_updated_at,
        exists(select 1 from jsonb_array_elements(coalesce(x->'bookmakers','[]'::jsonb)) b
          where regexp_replace(lower(b->>'name'),'[^a-z0-9]','','g')='bet365') as bet365_present
 from rows
)
select now() as sampled_at, count(*) total,
 count(*) filter(where bet365_present) as bet365_rows,
 count(*) filter(where observed_at <=now() and observed_at>=now()-interval '30 minutes') as recently_observed,
 count(*) filter(where provider_updated_at<=now() and provider_updated_at>=now()-interval '30 minutes') as recently_provider_updated,
 count(*) filter(where bet365_present and observed_at>=provider_updated_at and observed_at<=now()
  and observed_at>=now()-interval '30 minutes' and provider_updated_at>=now()-interval '30 minutes') as eligible_by_timestamp
from stats;
