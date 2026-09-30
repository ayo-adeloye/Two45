-- Two45 V50 reliability: atomic queue claims + watchdog hardening
create index if not exists two45_feature_jobs_queue_idx
  on public.two45_feature_jobs (status, priority, requested_at, kickoff_at);

create index if not exists two45_analysis_state_model_status_idx
  on public.two45_analysis_state (model_version, status, kickoff_at, priority, requested_at);

create or replace function public.two45_claim_feature_job(
  p_job_id uuid,
  p_expected_status text,
  p_expected_attempts integer,
  p_expected_requested_at timestamptz
)
returns setof public.two45_feature_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.two45_feature_jobs
     set status = 'IN_PROGRESS',
         attempts = attempts + 1,
         started_at = now(),
         last_error = null
   where id = p_job_id
     and status = p_expected_status
     and attempts = p_expected_attempts
     and requested_at = p_expected_requested_at
     and status in ('PENDING','READY','FAILED')
  returning *;
end;
$$;

create or replace function public.two45_analysis_watchdog(
  p_model_version text,
  p_timeout_minutes integer default 3
)
returns table(
  recovered_analysis integer,
  recovered_jobs integer,
  pending bigint,
  processing bigint,
  complete bigint,
  failed bigint,
  last_completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a integer := 0;
  v_j integer := 0;
begin
  select public.two45_recover_stale_analysis(greatest(1,coalesce(p_timeout_minutes,3))) into v_a;

  update public.two45_feature_jobs
     set status = case when attempts >= 4 then 'FAILED' else 'PENDING' end,
         last_error = coalesce(last_error, 'watchdog recovered stale in-progress job'),
         started_at = null
   where status = 'IN_PROGRESS'
     and started_at is not null
     and started_at < now() - make_interval(mins => greatest(2,coalesce(p_timeout_minutes,3)));
  get diagnostics v_j = row_count;

  return query
  select
    v_a,
    v_j,
    count(*) filter (where a.status='PENDING')::bigint,
    count(*) filter (where a.status='PROCESSING')::bigint,
    count(*) filter (where a.status='COMPLETE')::bigint,
    count(*) filter (where a.status='FAILED')::bigint,
    max(a.completed_at) filter (where a.status='COMPLETE')
  from public.two45_analysis_state a
  where a.model_version = p_model_version;
end;
$$;
