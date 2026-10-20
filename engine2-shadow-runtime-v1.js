// Engine 2.0 read-only shadow sweep. No provider calls and no publication writes.
async function runEngine2ShadowSweepV1(env) {
  const now=Date.now(), low=new Date(now+5*60000).toISOString(), high=new Date(now+48*3600000).toISOString();
  try {
    const metadata=arr2(await sb(env,'two45_goal_forecasts_v3?kickoff_at=gt.'+encodeURIComponent(low)+'&kickoff_at=lt.'+encodeURIComponent(high)+'&generated_at=gte.'+encodeURIComponent(new Date(now-45*60000).toISOString())+'&select=fixture_id,model_id,generated_at,kickoff_at&order=generated_at.desc&limit=36',{timeoutMs:3500}));
    const distinct=new Map();for(const row of metadata)if(!distinct.has(String(row.fixture_id)))distinct.set(String(row.fixture_id),row);
    const completed=[],failures=[];let evaluated=0;
    for(const row of distinct.values()) {
      if(evaluated>=2)break;
      const key='engine2-shadow:v1:'+row.fixture_id;
      try {
        const existing=(await getFeedSnapshot(env,key))?.payload;
        if(existing?.sourceGeneratedAt===row.generated_at&&existing?.modelId===row.model_id&&existing?.discovery?.version==='engine2-market-discovery-v1')continue;
        const forecasts=arr2(await sb(env,'two45_goal_forecasts_v3?fixture_id=eq.'+encodeURIComponent(row.fixture_id)+'&model_id=eq.'+encodeURIComponent(row.model_id)+'&generated_at=eq.'+encodeURIComponent(row.generated_at)+'&select=fixture_id,model_id,generated_at,kickoff_at,payload&limit=1',{timeoutMs:3500}));
        if(!forecasts.length)continue;
        const evaluation=engine2ShadowV1.evaluateShadowForecast(forecasts[0],{seed:Number(row.fixture_id),simulations:3000,asOf:new Date(now).toISOString()});
        const summary=evaluation.ok?{ok:true,version:evaluation.version,mode:'SHADOW',createsPicks:false,promotionAllowed:false,
          fixtureId:evaluation.fixtureId,sourceGeneratedAt:evaluation.generatedAt,modelId:evaluation.modelId,datasetHash:evaluation.datasetHash,kickoffAt:evaluation.kickoffAt,
          qualityHold:evaluation.qualityHold,rejectionReasons:evaluation.rejectionReasons,simulationVersion:evaluation.simulation.version,
          simulations:evaluation.simulation.simulations,inputs:evaluation.simulation.inputs,markets:evaluation.simulation.markets,
          topScorelines:evaluation.simulation.topScorelines,marketComparisons:evaluation.marketComparisons.slice(0,30),discovery:engine2ShadowV1.discoverEngine2Markets(evaluation)}
          :{ok:false,reason:evaluation.reason,fixtureId:row.fixture_id,modelId:row.model_id,sourceGeneratedAt:row.generated_at,mode:'SHADOW',createsPicks:false};
        await saveFeedSnapshot(env,key,summary,14*86400);
        completed.push({fixtureId:row.fixture_id,ok:summary.ok,reason:summary.reason||null});evaluated++;
      }catch(e){failures.push({fixtureId:row.fixture_id,error:safeRefreshError(e)});}
    }
    return {ok:failures.length===0,mode:'SHADOW',eligibleRecent:distinct.size,processed:completed.length,completed,failures};
  }catch(e){return {ok:false,mode:'SHADOW',processed:0,error:safeRefreshError(e)};}
}
