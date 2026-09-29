-- Two45 Analysis Engine V2: canonical analysis state
create table if not exists public.two45_analysis_state (
  id uuid primary key default gen_random_uuid(),
  analysis_key text not null unique,
  fixture_id bigint not null,
  provider_match_id text not null,
  model_version text not null,
  kickoff_at timestamptz not null,
  competition text,
  home_team text not null,
  away_team text not null,
  status text not null default 'PENDING'
    check (status in ('PENDING','PROCESSING','COMPLETE','FAILED')),
  refreshing boolean not null default false,
  priority integer not null default 100,
  attempts integer not null default 0 check (attempts >= 0),
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  next_retry_at timestamptz,
  last_error text,
  result jsonb not null default '{}'::jsonb,
  options_count integer not null default 0 check (options_count >= 0),
  data_quality numeric,
  decision text,
  source_snapshot_key text,
  legacy_source boolean not null default false,
  constraint two45_analysis_state_fixture_model_unique unique (fixture_id, model_version)
);

create index if not exists two45_analysis_state_status_priority_idx
  on public.two45_analysis_state (status, priority, requested_at);
create index if not exists two45_analysis_state_kickoff_idx
  on public.two45_analysis_state (kickoff_at);
create index if not exists two45_analysis_state_fixture_idx
  on public.two45_analysis_state (fixture_id);
create index if not exists two45_analysis_state_completed_idx
  on public.two45_analysis_state (completed_at desc);

alter table public.two45_analysis_state enable row level security;

create or replace function public.two45_recover_stale_analysis(
  p_timeout_minutes integer default 5
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  update public.two45_analysis_state
  set status = case when jsonb_typeof(result)='object' and result <> '{}'::jsonb then 'COMPLETE' else 'PENDING' end,
      refreshing = false,
      started_at = null,
      next_retry_at = now(),
      last_error = coalesce(last_error, 'Recovered stale analysis lease'),
      updated_at = now()
  where (status = 'PROCESSING' or refreshing = true)
    and started_at is not null
    and started_at < now() - make_interval(mins => greatest(1,p_timeout_minutes));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

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
  select count(*)::bigint,
    count(*) filter (where status='PENDING')::bigint,
    count(*) filter (where status='PROCESSING')::bigint,
    count(*) filter (where status='COMPLETE')::bigint,
    count(*) filter (where status='FAILED')::bigint,
    count(*) filter (where refreshing)::bigint,
    min(requested_at) filter (where status='PENDING'),
    max(completed_at) filter (where status='COMPLETE')
  from public.two45_analysis_state
  where kickoff_at >= p_date::timestamptz
    and kickoff_at < (p_date + 1)::timestamptz
    and (p_model_version is null or model_version = p_model_version);
$$;
