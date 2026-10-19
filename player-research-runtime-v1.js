async function runPlayerResearchV1(env,{productionBacklog=false}={}) {
  const key='player-research-v1:status',now=Date.now(),stamp=new Date(now).toISOString();
  const previous=(await getFeedSnapshot(env,key).catch(()=>null))?.payload;
  if(now-Date.parse(previous?.asOf)<15*60000)return {skipped:true,reason:'RESEARCH_15M_CADENCE'};
  const status={version:playerPropsV1.PLAYER_RESEARCH_VERSION,asOf:stamp,mode:'RESEARCH_ONLY',promotionAllowed:false,
    markets:playerPropsV1.PLAYER_MARKETS,officialPicksCreated:0,providerCalls:0,
    blockers:['PLAYER_HISTORY_ACCUMULATING','EXACT_PLAYER_ID_PRICE_MAPPING_REQUIRED','BOOKMAKER_PLAYER_SETTLEMENT_RULES_REQUIRED','PLAYER_CHRONOLOGICAL_VALIDATION_REQUIRED']};
  try {
    // Archive raw player prices with original timestamps; names are never guessed into player IDs.
    let rawMarkets=0;
    for(const date of [...new Set([easternDate(),tomorrowEasternDate()])]) {
      const snapshot=(await getFeedSnapshot(env,oddsKey(date)))?.payload;
      const fixtures=arr2(snapshot?.response).map(r=>({...r,bookmakers:arr2(r.bookmakers).filter(b=>String(b.name).replace(/[^a-z0-9]/gi,'').toLowerCase()==='bet365').map(b=>({...b,bets:arr2(b.bets).filter(m=>playerPropsV1.isPlayerMarket(m.name))})).filter(b=>b.bets.length)})).filter(r=>r.bookmakers.length);
      rawMarkets+=fixtures.reduce((n,r)=>n+r.bookmakers.reduce((s,b)=>s+b.bets.length,0),0);
      if(fixtures.length)await archivePlayerResearchV1(env,'player-research-v1:quotes:'+stamp+':'+date,{asOf:stamp,fixtures,mode:'RESEARCH_ONLY'});
    }
    status.rawPlayerMarkets=rawMarkets;
    if(!rawMarkets)status.blockers.push('NO_RETAINED_BET365_PLAYER_MARKETS');
    // One settled fixture per run, only with spare provider capacity, after production work.
    if(productionBacklog)status.collectionDeferred='PRODUCTION_BACKLOG_FIRST';
    else if(!providerBurstV69||providerBurstV69.calls>=providerBurstV69.maxCalls)status.collectionDeferred='PROVIDER_BUDGET_RESERVED_FOR_PRODUCTION';
    else {
      const finals=arr2(await sb(env,'two45_goal_results_v3?kickoff_at=gte.'+encodeURIComponent(new Date(now-7*86400000).toISOString())+'&final_status=eq.FT&select=fixture_id,league_id,kickoff_at,competition&order=kickoff_at.desc&limit=50',{timeoutMs:3000}));
      const eligible=finals.filter(f=>competitionTierV21(f.competition,f.league_id)===1);
      const keys=eligible.map(f=>'player-research-v1:stats:'+f.fixture_id);
      const retained=keys.length?arr2(await sb(env,'two45_feed_snapshots?snapshot_key=in.('+keys.map(encodeURIComponent).join(',')+')&select=snapshot_key',{timeoutMs:3000})):[];
      const seen=new Set(retained.map(r=>r.snapshot_key));
      const selected=eligible.find(f=>!seen.has('player-research-v1:stats:'+f.fixture_id));
      status.collectionWindowCandidates=eligible.length;
      if(selected) {
        const raw=await football(env,'/fixtures/players',{fixture:selected.fixture_id});status.providerCalls=1;
        if(raw.errors&&Object.keys(raw.errors).length)throw Error('Player statistics provider returned errors');
        const observedAt=new Date().toISOString(),rows=playerPropsV1.normalizePlayerStats(raw.response,selected,observedAt);
        if(!rows.length)throw Error('No unambiguous player statistics available; retry later');
        await archivePlayerResearchV1(env,'player-research-v1:stats:'+selected.fixture_id,{fixture:selected,observedAt,rows,source:'/fixtures/players',mode:'RESEARCH_ONLY'});
        status.collectedFixtureId=selected.fixture_id;status.playerRows=rows.length;
        status.completeStatRows=rows.filter(r=>r.shotsOnTarget!==null&&r.goals!==null&&r.assists!==null).length;
      }else status.collectionDeferred='NO_UNCOLLECTED_TIER1_FINAL_IN_WINDOW';
    }
    status.ok=true;
  }catch(e){status.ok=false;status.error=safeRefreshError(e);}
  await saveFeedSnapshot(env,key,status,365*86400);return status;
}
async function archivePlayerResearchV1(env,key,payload) {
  // Existing feed storage, immutable first observation; no publication/Record writes.
  await sb(env,'two45_feed_snapshots?on_conflict=snapshot_key',{method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',body:JSON.stringify({snapshot_key:key,payload,refreshed_at:new Date().toISOString(),expires_at:new Date(Date.now()+3650*86400000).toISOString(),request_count:0})});
}
