-- Additive publication evidence. Research forecasts and legacy summaries are retained.
create table public.two45_record_baselines (
  captured_at timestamptz primary key default now(), metrics jsonb not null, reason text not null
);
insert into public.two45_record_baselines(metrics,reason)
select to_jsonb(s),'Legacy research-count baseline before publication-only Record' from public.two45_record_summary() s;
alter table public.two45_record_baselines enable row level security;
revoke all on public.two45_record_baselines from anon,authenticated;
grant select,insert on public.two45_record_baselines to service_role;

create table public.two45_publications (
  id bigint generated always as identity primary key,
  product text not null check(product in ('ELITE_3','HIGH_CONVICTION','WEEKEND_LADDER','FOUNDER')),
  publication_key text not null,
  fixture_id bigint not null,
  market text not null,
  selection text not null,
  published_at timestamptz not null,
  kickoff_at timestamptz not null,
  evidence_key text not null,
  snapshot jsonb not null,
  unique(product,publication_key,fixture_id,market,selection),
  check(published_at < kickoff_at)
);
create index on public.two45_publications(fixture_id,market,selection);
alter table public.two45_publications enable row level security;
revoke all on public.two45_publications from anon,authenticated;
grant select,insert on public.two45_publications to service_role;
grant usage,select on sequence public.two45_publications_id_seq to service_role;

create table public.two45_selection_shadow_v2 (
 id bigint generated always as identity primary key,
 fixture_id bigint not null, kickoff_at timestamptz not null,
 generated_at timestamptz not null default now(), model_version text not null,
 payload jsonb not null
);
alter table public.two45_selection_shadow_v2 enable row level security;
revoke all on public.two45_selection_shadow_v2 from anon,authenticated;
grant select,insert on public.two45_selection_shadow_v2 to service_role;
grant usage,select on sequence public.two45_selection_shadow_v2_id_seq to service_role;
create index on public.two45_selection_shadow_v2(fixture_id,generated_at);

create function public.two45_selection_key_v2(s text) returns text language sql immutable set search_path=public as $$
select regexp_replace(upper(trim(s)), '([0-9])\.([0-9])', '\1_\2', 'g')
$$;

create function public.two45_capture_publication_v2(p_product text,p_key text,p_evidence text,p_pick jsonb,p_at timestamptz)
returns void language plpgsql security invoker set search_path=public as $$
declare k timestamptz; f bigint;
begin
  k := coalesce(p_pick->>'kickoff',p_pick->>'kickoffAt',p_pick->>'kickoff_at')::timestamptz;
  f := coalesce(p_pick->>'fixtureId',p_pick->>'providerMatchId',p_pick->>'fixture_id')::bigint;
  if p_at is null or k is null or p_at >= k or f is null or coalesce(p_pick->>'market','')='' or coalesce(p_pick->>'selection','') in ('','NO_BET') then return; end if;
  insert into public.two45_publications(product,publication_key,fixture_id,market,selection,published_at,kickoff_at,evidence_key,snapshot)
  values(p_product,p_key,f,upper(p_pick->>'market'),public.two45_selection_key_v2(p_pick->>'selection'),p_at,k,p_evidence,p_pick)
  on conflict do nothing;
end;
$$;
revoke execute on function public.two45_capture_publication_v2(text,text,text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.two45_capture_publication_v2(text,text,text,jsonb,timestamptz) to service_role;

create function public.two45_capture_ticket_v2(p_key text,p_payload jsonb) returns void
language plpgsql security invoker set search_path=public as $$
declare p jsonb:=p_payload; t jsonb; leg jsonb; entry record;
begin
  if p_key like 'ticket-lock-history:%' then p:=p_payload->'payload'; end if;
  if p->>'type'='daily' and p->'ticket'->>'locked'='true' then
    t:=p->'ticket';
    for leg in select value from jsonb_array_elements(t->'legs') loop
      perform public.two45_capture_publication_v2('ELITE_3',coalesce(p->>'date',p_key)||':'||(t->>'lockedAt'),p_key,leg,(t->>'lockedAt')::timestamptz);
    end loop;
  elsif p->>'type'='weekend' then
    for entry in select * from jsonb_each(p->'tickets') loop
      t:=entry.value;
      if t->>'locked'='true' then
        for leg in select value from jsonb_array_elements(t->'legs') loop
          perform public.two45_capture_publication_v2('WEEKEND_LADDER',(p->>'saturday')||':'||entry.key||':'||(t->>'lockedAt'),p_key,leg,(t->>'lockedAt')::timestamptz);
        end loop;
      end if;
    end loop;
  end if;
end;
$$;
revoke execute on function public.two45_capture_ticket_v2(text,jsonb) from public,anon,authenticated;
grant execute on function public.two45_capture_ticket_v2(text,jsonb) to service_role;

create function public.two45_publication_snapshot_trigger_v2() returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.snapshot_key like 'ticket-lock:%' or new.snapshot_key like 'ticket-lock-history:%' then
    perform public.two45_capture_ticket_v2(new.snapshot_key,new.payload);
  end if;
  return new;
end;
$$;
create trigger two45_publication_snapshot_v2 after insert or update on public.two45_feed_snapshots
for each row execute function public.two45_publication_snapshot_trigger_v2();

-- Only retained immutable ticket evidence can establish historical publication.
select public.two45_capture_ticket_v2(snapshot_key,payload) from public.two45_feed_snapshots
where snapshot_key like 'ticket-lock:%' or snapshot_key like 'ticket-lock-history:%';

create function public.two45_founder_publication_trigger_v2() returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.status in ('PUBLISHED','SETTLED') then
    perform public.two45_capture_publication_v2('FOUNDER',new.id::text,'two45_founder_picks:'||new.id,to_jsonb(new),new.created_at);
  end if;
  return new;
end;
$$;
create trigger two45_founder_publication_v2 after insert or update on public.two45_founder_picks
for each row execute function public.two45_founder_publication_trigger_v2();
select public.two45_capture_publication_v2('FOUNDER',id::text,'two45_founder_picks:'||id,to_jsonb(f),created_at)
from public.two45_founder_picks f where status in ('PUBLISHED','SETTLED');

-- Independently grade score markets using the stored exact line; conflicting scores abstain.
create function public.two45_grade_publication_v2(m text,s text,h integer,a integer) returns text
language plpgsql immutable set search_path=public as $$
declare v numeric; line numeric; parts text[];
begin
  if h is null or a is null or h<0 or a<0 then return null; end if;
  if m='DOUBLE_CHANCE' then
    if s in ('HOME_OR_DRAW','HOME_DRAW') then return case when h>=a then 'WIN' else 'LOSS' end;
    elsif s in ('DRAW_OR_AWAY','DRAW_AWAY') then return case when a>=h then 'WIN' else 'LOSS' end;
    elsif s in ('HOME_OR_AWAY','HOME_AWAY') then return case when h<>a then 'WIN' else 'LOSS' end; end if;
  elsif m='HANDICAP' then
    parts:=regexp_match(s,'^(HOME|AWAY)_(PLUS|MINUS)_([0-9]+(?:_[0-9]+)?)$');
    if parts is null then return null; end if;
    line:=replace(parts[3],'_','.')::numeric;
    if mod(line*100,50)<>0 then return null; end if;
    v:=(case when parts[1]='HOME' then h-a else a-h end)+(case when parts[2]='PLUS' then line else -line end);
    return case when v>0 then 'WIN' when v=0 then 'PUSH' else 'LOSS' end;
  elsif m in ('TOTAL_GOALS','HOME_TEAM_GOALS','AWAY_TEAM_GOALS') then
    parts:=regexp_match(s,'^(OVER|UNDER)_([0-9]+(?:_[0-9]+)?)$');
    if parts is null then return null; end if;
    line:=replace(parts[2],'_','.')::numeric;
    if mod(line*100,50)<>0 then return null; end if;
    v:=(case m when 'TOTAL_GOALS' then h+a when 'HOME_TEAM_GOALS' then h else a end)-line;
    if parts[1]='UNDER' then v:=-v; end if;
    return case when v>0 then 'WIN' when v=0 then 'PUSH' else 'LOSS' end;
  elsif m in ('MATCH_RESULT','BTTS') then
    return public.two45_grade_forecast_outcome(m,s,h,a);
  end if;
  return null;
end;
$$;

create view public.two45_public_record_v2 with(security_invoker=true) as
with first_publication as (
 select distinct on(fixture_id,market,selection) * from public.two45_publications
 order by fixture_id,market,selection,published_at,id
), scores as (
 select fixture_id,min(final_home_score) h,min(final_away_score) a,max(settled_at) settled_at
 from public.two45_model_forecasts where settled and final_home_score is not null and final_away_score is not null
 group by fixture_id having count(distinct (final_home_score,final_away_score))=1
), graded as (
 select p.*,s.h,s.a,s.settled_at,public.two45_grade_publication_v2(p.market,p.selection,s.h,s.a) outcome,
 coalesce((p.snapshot->>'sportsbookOdds')::numeric,(p.snapshot->>'published_odds')::numeric,(p.snapshot->>'_ticketOdds')::numeric) sportsbook_odds
 from first_publication p left join scores s using(fixture_id)
)
select id,fixture_id,kickoff_at,coalesce(snapshot->>'league',snapshot->>'competition') competition,
coalesce(snapshot->>'home',snapshot->>'home_team') home_team,coalesce(snapshot->>'away',snapshot->>'away_team') away_team,
market,selection,sportsbook_odds,case when coalesce(snapshot->>'probability','') ~ '^[0-9.]+$' then (snapshot->>'probability')::numeric end probability,
outcome,h final_home_score,a final_away_score,settled_at,published_at created_at,product,evidence_key,
case when outcome='WIN' and sportsbook_odds>1 then sportsbook_odds-1 when outcome='LOSS' and sportsbook_odds>1 then -1 when outcome in ('PUSH','VOID') then 0 end profit_units
from graded;
revoke all on public.two45_public_record_v2 from anon,authenticated;
grant select on public.two45_public_record_v2 to service_role;

create or replace function public.two45_record_summary()
returns table(published_picks bigint,settled_picks bigint,wins bigint,losses bigint,hit_rate numeric,net_units numeric,pending_picks bigint)
language sql stable security invoker set search_path=public as $$
select count(*),count(*) filter(where outcome is not null),count(*) filter(where outcome='WIN'),count(*) filter(where outcome='LOSS'),
round(100.0*count(*) filter(where outcome='WIN')/nullif(count(*) filter(where outcome in ('WIN','LOSS')),0),1),
round(coalesce(sum(profit_units),0),2),count(*) filter(where outcome is null) from public.two45_public_record_v2
$$;
revoke execute on function public.two45_record_summary() from public,anon,authenticated;
grant execute on function public.two45_record_summary() to service_role;

-- Deployment assertions: failed assertions roll back the entire migration.
do $$ begin
 if public.two45_grade_publication_v2('HANDICAP','HOME_PLUS_0_5',0,1)<>'LOSS' or
 public.two45_grade_publication_v2('TOTAL_GOALS','OVER_2_5',2,1)<>'WIN' or
 public.two45_grade_publication_v2('TOTAL_GOALS','UNDER_2',1,1)<>'PUSH' or
 public.two45_grade_publication_v2('DOUBLE_CHANCE','HOME_OR_DRAW',1,1)<>'WIN' then raise exception 'Publication grading regression'; end if;
end $$;
