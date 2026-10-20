// Engine 2 settlement: immutable pre-match snapshot + provider-observed final result only.
// Never converts retrospective scores into picks or changes official record.
async function runEngine2SettlementV1(env) {
 try {
  const now=Date.now(),cutoff=new Date(now-2*3600000).toISOString(),start=new Date(now-14*86400000).toISOString();
  const rows=arr2(await sb(env,'two45_feed_snapshots?snapshot_key=like.engine2-shadow:v1:*&refreshed_at=gte.'+encodeURIComponent(start)+'&select=snapshot_key,payload&order=refreshed_at.desc&limit=80',{timeoutMs:5000}));
  const pending=rows.filter(x=>x.payload?.ok&&Date.parse(x.payload.kickoffAt)<Date.parse(cutoff)).slice(0,8);
  if(!pending.length)return {ok:true,mode:'SHADOW',eligible:0,settled:0};
  const ids=pending.map(x=>Number(x.payload.fixtureId)).filter(Number.isSafeInteger).join(',');
  if(!ids)return {ok:true,mode:'SHADOW',eligible:0,settled:0};
  const finals=arr2(await sb(env,'two45_goal_results_v3?fixture_id=in.('+ids+')&final_status=eq.FT&select=fixture_id,home_goals,away_goals,result_available_at,kickoff_at&limit=20',{timeoutMs:4000}));
  const byId=new Map(finals.map(x=>[String(x.fixture_id),x])),settled=[];
  for(const item of pending) {
   const p=item.payload,result=byId.get(String(p.fixtureId));if(!result)continue;
   if(Date.parse(result.result_available_at)<=Date.parse(p.kickoffAt)||Date.parse(p.sourceGeneratedAt)>=Date.parse(p.kickoffAt)||Date.parse(result.result_available_at)>now)continue;
   const key='engine2-settled:v1:'+p.fixtureId+':'+encodeURIComponent(p.sourceGeneratedAt);
   if((await getFeedSnapshot(env,key).catch(()=>null))?.payload?.ok)continue;
   const g1=result.home_goals,g2=result.away_goals,actual=g1>g2?'HOME':g1<g2?'AWAY':'DRAW',prob=p.markets?.MATCH_RESULT;
   if(!prob||!Number.isInteger(g1)||!Number.isInteger(g2)||Object.values(prob).some(x=>!Number.isFinite(x)))continue;
   const brier=Object.entries(prob).reduce((sum,[name,value])=>sum+(value-(name===actual?1:0))**2,0);
   const logLoss=-Math.log(Math.max(1e-12,prob[actual]||0));
   const record={ok:true,version:'engine2-settlement-v1',mode:'SHADOW',createsPicks:false,promotionAllowed:false,
    fixtureId:p.fixtureId,sourceGeneratedAt:p.sourceGeneratedAt,modelId:p.modelId,kickoffAt:p.kickoffAt,
    resultAvailableAt:result.result_available_at,homeGoals:g1,awayGoals:g2,actualOutcome:actual,
    brier1x2:brier,logLoss1x2:logLoss,qualityHold:p.qualityHold,probabilities:prob};
   await saveFeedSnapshot(env,key,record,365*86400);
   settled.push({fixtureId:p.fixtureId,brier1x2:brier,logLoss1x2:logLoss});
  }
  return {ok:true,mode:'SHADOW',eligible:pending.length,finalsAvailable:finals.length,settled:settled.length,results:settled};
 }catch(e){return {ok:false,mode:'SHADOW',error:safeRefreshError(e)};}
}
