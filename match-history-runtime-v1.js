async function runMatchHistoryCollectionV1(env,{productionBacklog=false}={}) {
 const key='match-history-v1:status',now=Date.now(),asOf=new Date(now).toISOString();
 if(productionBacklog)return {skipped:true,reason:'PRODUCTION_BACKLOG_FIRST'};
 const previous=(await getFeedSnapshot(env,key).catch(()=>null))?.payload;
 if(now-Date.parse(previous?.asOf)<5*60000)return {skipped:true,reason:'HISTORY_5M_CADENCE'};
 if(!providerBurstV69||providerBurstV69.calls>=providerBurstV69.maxCalls)return {skipped:true,reason:'PROVIDER_BUDGET_RESERVED_FOR_PRODUCTION'};
 const status={version:'two45-match-history-v1',asOf,mode:'RESEARCH_INPUTS',officialPicksCreated:0,providerCalls:0};
 try {
  const jobs=arr2(await sb(env,'two45_feature_jobs?provider_league_id=in.('+[...new Set([...TIER1_IDS,...TIER2_IDS])].join(',')+')&kickoff_at=gt.'+encodeURIComponent(asOf)+'&kickoff_at=lt.'+encodeURIComponent(new Date(now+48*3600000).toISOString())+'&select=fixture_id,home_team_id,away_team_id,provider_league_id,season,kickoff_at,competition&order=kickoff_at.asc&limit=60',{timeoutMs:3000}));
  const teams=new Map();for(const j of jobs.filter(j=>competitionTierV21(j.competition,j.provider_league_id)<=2))for(const id of [j.home_team_id,j.away_team_id]){
   if(!/^\d+$/.test(String(id)))continue;const teamKey='match-history-v1:team:'+j.provider_league_id+':'+j.season+':'+id;if(!teams.has(teamKey))teams.set(teamKey,{id:String(id),job:j,key:teamKey});
  }
  if(!teams.size){status.reason='NO_UPCOMING_TIER1_TEAMS';}
  else {
   const rows=arr2(await sb(env,'two45_feed_snapshots?snapshot_key=in.('+[...teams.keys()].map(encodeURIComponent).join(',')+')&select=snapshot_key,payload->retryAfter',{timeoutMs:3000}));
   const deferred=new Set(rows.filter(r=>Date.parse(r.retryAfter)>now).map(r=>r.snapshot_key));
   const selected=[...teams.values()].find(t=>!deferred.has(t.key));
   if(!selected)status.reason='TEAM_HISTORY_CURRENT_OR_BACKOFF';
   else {
    const {job,id}=selected;status.fixtureId=job.fixture_id;status.teamId=id;
    const input=await sb(env,'rpc/two45_match_evidence_inputs_v1',{method:'POST',timeoutMs:5000,body:JSON.stringify({p_fixture_id:job.fixture_id,p_as_of:asOf,p_odds_key:oddsKey(dateOfV19(job.kickoff_at))})});
    const available=matchEvidenceV1.cleanEvidenceResults(arr2(input?.history),job,asOf,arr2(input?.conflicts)).filter(r=>String(r.home_id)===id||String(r.away_id)===id);
    status.retainedMatchesBefore=available.length;status.historyScope='ALL_COMPETITIONS_LAST_180_DAYS';
    if(available.length>=8)status.reason='SUFFICIENT_RETAINED_HISTORY';
    else {
     status.providerCalls=1;
     const raw=await football(env,'/fixtures',{team:id,last:15});
     if(raw.errors&&Object.keys(raw.errors).length)throw Error('Historical fixtures provider returned errors');
     const observedAt=new Date().toISOString();
     const fixtures=arr2(raw.response).filter(f=>f.fixture?.status?.short==='FT'&&Date.parse(f.fixture?.date)<Date.parse(job.kickoff_at)&&[f.teams?.home?.id,f.teams?.away?.id].some(x=>String(x)===id)&&Date.parse(f.fixture?.date)+90*60000<=Date.parse(observedAt)&&[f.goals?.home,f.goals?.away].every(g=>typeof g==='number'&&Number.isInteger(g)&&g>=0&&g<=30));
     const sourceKey='match-history-v1:raw:'+job.provider_league_id+':'+job.season+':'+id+':'+observedAt;
     await archivePlayerResearchV1(env,sourceKey,{observedAt,fixtureId:job.fixture_id,teamId:id,fixtures,mode:'RESEARCH_INPUTS'});
     // Existing append-only label capture records observation time and detects conflicts.
     await sb(env,'rpc/two45_capture_goal_results_v3',{method:'POST',timeoutMs:4000,body:JSON.stringify({p_key:sourceKey,p_payload:{fixtures},p_observed_at:observedAt,p_seed:false})});
     status.acceptedFixtures=fixtures.length;status.observedAt=observedAt;status.crossCompetitionFixtures=fixtures.filter(f=>String(f.league?.id)!==String(job.provider_league_id)).length;
     if(!fixtures.length)status.reason='NO_VALID_REGULATION_RESULTS_RETURNED';
    }
    await saveFeedSnapshot(env,selected.key,{asOf,teamId:id,retryAfter:new Date(now+(status.acceptedFixtures>0?12:4)*3600000).toISOString(),status},2*86400);
   }
  }
  status.ok=true;
 }catch(e){status.ok=false;status.error=safeRefreshError(e);}
 await saveFeedSnapshot(env,key,status,365*86400);return status;
}
