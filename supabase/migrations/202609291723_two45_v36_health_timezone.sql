-- Two45 V36: align analysis-health day boundaries with the app timezone.
create or replace function public.two45_analysis_health(
  p_date date,
  p_model_version text default null
)
returns table(
  fixtures_total bigint,
  pending bigint,
  processing bigint,
  complete bigint,
  failed bigint,
  refreshing bigint,
  oldest_pending timestamptz,
  last_completed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    count(*) filter (where status='PENDING')::bigint,
    count(*) filter (where status='PROCESSING')::bigint,
    count(*) filter (where status='COMPLETE')::bigint,
    count(*) filter (where status='FAILED')::bigint,
    count(*) filter (where refreshing)::bigint,
    min(requested_at) filter (where status='PENDING'),
    max(completed_at) filter (where status='COMPLETE')
  from public.two45_analysis_state
  where kickoff_at >= (p_date::timestamp at time zone 'America/New_York')
    and kickoff_at < ((p_date + 1)::timestamp at time zone 'America/New_York')
    and (p_model_version is null or model_version = p_model_version);
$$;
