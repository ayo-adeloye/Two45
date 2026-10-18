create table public.two45_settlement_audit_v2 (
 id bigint generated always as identity primary key,
 source_table text not null, source_id text not null,
 recorded_at timestamptz not null default now(),
 before_state jsonb, after_state jsonb not null,
 baseline boolean not null default false
);
create index on public.two45_settlement_audit_v2(source_table,source_id,recorded_at);
alter table public.two45_settlement_audit_v2 enable row level security;
revoke all on public.two45_settlement_audit_v2 from anon,authenticated,service_role;
grant select,insert on public.two45_settlement_audit_v2 to service_role;
grant usage,select on sequence public.two45_settlement_audit_v2_id_seq to service_role;

create function public.two45_settlement_state_v2(row_data jsonb) returns jsonb
language sql immutable set search_path=public as $$
select jsonb_object_agg(key,value) from jsonb_each(row_data)
where key in ('id','fixture_id','market','selection','settled','outcome','result','status','actual_event','final_home_score','final_away_score','settled_at','profit_units','closing_odds','brier_score','log_loss')
$$;
create function public.two45_settlement_audit_trigger_v2() returns trigger
language plpgsql security invoker set search_path=public as $$
declare before_json jsonb; after_json jsonb;
begin
  after_json:=public.two45_settlement_state_v2(to_jsonb(new));
  if tg_op='UPDATE' then before_json:=public.two45_settlement_state_v2(to_jsonb(old)); end if;
  if before_json is distinct from after_json and
    (coalesce(after_json->>'settled','false')='true' or after_json->>'status'='SETTLED' or before_json->>'settled'='true' or before_json->>'status'='SETTLED') then
    insert into public.two45_settlement_audit_v2(source_table,source_id,before_state,after_state)
    values(tg_table_name,after_json->>'id',before_json,after_json);
  end if;
  return new;
end;
$$;
create trigger two45_forecast_settlement_audit_v2 after insert or update on public.two45_model_forecasts
for each row execute function public.two45_settlement_audit_trigger_v2();
create trigger two45_founder_settlement_audit_v2 after insert or update on public.two45_founder_picks
for each row execute function public.two45_settlement_audit_trigger_v2();
insert into public.two45_settlement_audit_v2(source_table,source_id,after_state,baseline)
select 'two45_model_forecasts',id::text,public.two45_settlement_state_v2(to_jsonb(f)),true
from public.two45_model_forecasts f where settled;
insert into public.two45_settlement_audit_v2(source_table,source_id,after_state,baseline)
select 'two45_founder_picks',id::text,public.two45_settlement_state_v2(to_jsonb(f)),true
from public.two45_founder_picks f where status='SETTLED';
