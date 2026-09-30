-- Two45 V55: atomic fresh-job state machine
create or replace function public.two45_claim_next_fresh_job_v55(
  p_model_version text
)
returns setof public.two45_feature_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_job public.two45_feature_jobs%rowtype;
begin
  select j.id into v_id
  from public.two45_feature_jobs j
  left join public.two45_analysis_state a
    on a.fixture_id=j.fixture_id and a.model_version=p_model_version
  where j.status in ('PENDING','READY','FAILED')
    and coalesce(a.status,'PENDING') <> 'COMPLETE'
    and (j.kickoff_at at time zone 'America/New_York')::date
        between (now() at time zone 'America/New_York')::date
            and (now() at time zone 'America/New_York')::date + 1
    and (j.status <> 'FAILED' or j.started_at is null or j.started_at <= now()-interval '2 hours')
    and (
      j.status <> 'PENDING' or coalesce(j.attempts,0)=0 or j.started_at is null
      or j.started_at <= now()-make_interval(
        mins => least(120, 5 * (2 ^ least(greatest(coalesce(j.attempts,0)-1,0),5))::int)
      )
    )
  order by
    case
      when coalesce(j.last_error,'') like '%Baseline inputs ready%' then 0
      when coalesce(j.last_error,'') like '%Baseline home input cached%' then 1
      else 2
    end,
    j.priority asc, j.requested_at asc, j.kickoff_at asc
  for update of j skip locked
  limit 1;

  if v_id is null then return; end if;

  update public.two45_feature_jobs
     set status='IN_PROGRESS', attempts=attempts+1, started_at=now(), last_error=null
   where id=v_id
  returning * into v_job;

  update public.two45_analysis_state
     set status='PROCESSING', refreshing=false, started_at=now(), updated_at=now(),
         attempts=coalesce(attempts,0)+1, last_error=null, next_retry_at=null
   where fixture_id=v_job.fixture_id and model_version=p_model_version and status <> 'COMPLETE';

  return next v_job;
  return;
end;
$$;

create or replace function public.two45_defer_claimed_job_v55(
  p_job_id uuid,
  p_fixture_id bigint,
  p_model_version text,
  p_message text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.two45_feature_jobs
     set status='PENDING', attempts=0, started_at=null, last_error=p_message
   where id=p_job_id;

  update public.two45_analysis_state
     set status='PENDING', refreshing=false, started_at=null, updated_at=now(),
         last_error=p_message, next_retry_at=null
   where fixture_id=p_fixture_id and model_version=p_model_version;

  return true;
end;
$$;
