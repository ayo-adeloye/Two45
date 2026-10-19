async function getMatchEvidenceV1(env,fixtureId,{force=false}={}) {
 if(!Number.isSafeInteger(Number(fixtureId))||Number(fixtureId)<=0)throw Error('A valid fixture is required');
 fixtureId=Number(fixtureId);const key='match-evidence-v1:'+fixtureId,now=Date.now(),asOf=new Date(now).toISOString();
 const cached=await getFeedSnapshot(env,key).catch(()=>null);
 const cachedAge=now-Date.parse(cached?.payload?.asOf),cachedPricesCurrent=arr2(cached?.payload?.markets).every(m=>!m.exactPrice||[m.exactPrice.observedAt,m.exactPrice.providerUpdatedAt].every(t=>Date.parse(t)<=now&&now-Date.parse(t)<=30*60000));
 if(!force&&cached?.payload?.version===matchEvidenceV1.EVIDENCE_VERSION&&cachedAge>=0&&cachedAge<5*60000&&Date.parse(cached.payload.kickoff)>now&&cachedPricesCurrent)return cached.payload;
 const jobs=arr2(await sb(env,'two45_feature_jobs?fixture_id=eq.'+fixtureId+'&select=fixture_id,home_team_id,away_team_id,provider_league_id,season,kickoff_at,home_team,away_team,competition&order=requested_at.desc&limit=1',{timeoutMs:2500}));
 const job=jobs[0];if(!job||!(Date.parse(job.kickoff_at)>now&&Date.parse(job.kickoff_at)<now+72*3600000))return null;
 const ids=[job.home_team_id,job.away_team_id].map(String);if(ids.some(x=>!/^\d+$/.test(x)))throw Error('Canonical team identities unavailable');
 const sourceErrors=[];
 const read=async(label,fn)=>{try{return await fn();}catch(e){sourceErrors.push(label+': '+safeRefreshError(e));return null;}};
 const settled=await Promise.allSettled([
  read('history',()=>sb(env,'two45_goal_results_v3?or=(home_id.in.('+ids.join(',')+'),away_id.in.('+ids.join(',')+'))&kickoff_at=gte.'+encodeURIComponent(new Date(now-180*86400000).toISOString())+'&kickoff_at=lt.'+encodeURIComponent(asOf)+'&result_available_at=lte.'+encodeURIComponent(asOf)+'&select=fixture_id,home_id,away_id,league_id,season,kickoff_at,result_available_at,home_goals,away_goals,final_status&order=kickoff_at.desc,fixture_id.desc&limit=160',{timeoutMs:3000})),
  read('analysis',()=>getFeedSnapshot(env,'model-analysis:'+fixtureId)),
  read('direct price',()=>getFeedSnapshot(env,'fixture-odds:'+fixtureId)),
  read('daily prices',()=>getFeedSnapshot(env,oddsKey(dateOfV19(job.kickoff_at)))),
  read('independent model',()=>sb(env,'two45_goal_forecasts_v3?fixture_id=eq.'+fixtureId+'&select=id,fixture_id,model_id,generated_at,kickoff_at,forecast:payload->forecast,context:payload->context,datasetHash:payload->>datasetHash&order=generated_at.desc,id.desc&limit=1',{timeoutMs:2500}))
 ]);
 const values=settled.map(r=>r.status==='fulfilled'?r.value:null),history=arr2(values[0]),saved=values[1]?.payload||{},analysis=saved.analysis||{},forecast=saved.forecast||{},core=arr2(values[4])[0];
 const historyIds=history.map(r=>Number(r.fixture_id)).filter(Number.isSafeInteger);
 const conflictRows=historyIds.length?await read('result conflicts',()=>sb(env,'two45_goal_result_conflicts_v3?fixture_id=in.('+historyIds.join(',')+')&observed_at=lte.'+encodeURIComponent(asOf)+'&select=fixture_id',{timeoutMs:2500})):[];
 // A failed conflict read invalidates history rather than silently treating it as clean.
 const validHistory=conflictRows===null?[]:history;
 const priceRows=[values[2]?.payload,values[3]?.payload].flatMap(p=>arr2(p?.response)).filter(r=>String(r.fixture?.id)===String(fixtureId)).sort((a,b)=>(Date.parse(b.observedAt)||0)-(Date.parse(a.observedAt)||0));
 const prices={response:priceRows.slice(0,1)},known=[forecast,...arr2(forecast.alternatives)],seen=new Set(),candidates=[];
 for(const row of flatten(analysis.probabilities||{})) {
  if(!['MATCH_RESULT','TOTAL_GOALS','BTTS','DOUBLE_CHANCE','HANDICAP','HOME_TEAM_GOALS','AWAY_TEAM_GOALS'].includes(row.market))continue;
  const prior=known.find(x=>x.market===row.market&&ticketSelectionKeyV78(x.selection)===ticketSelectionKeyV78(row.selection));
  const exactPrice=exactBet365QuoteV78(prices,fixtureId,row.market,row.selection);
  const pick={...forecast,...row,competitionTier:competitionTierV21(job.competition,job.provider_league_id),sportsbookOdds:exactPrice?.odds??null,valueEdge:exactPrice?row.probability-1/exactPrice.odds:null,valueEdgePct:exactPrice?(row.probability-1/exactPrice.odds)*100:null,priceObservedAt:exactPrice?.observedAt,providerUpdatedAt:exactPrice?.providerUpdatedAt};
  const clearedExistingGate=forecast.decision==='PICK'&&Boolean(prior)&&(prior===forecast||String(prior.lane)==='STRONG');
  const modelReview=modelReviewV1.compareModelPick(pick,core,now),gateReasons=eliteRejectionReasonsV2(pick);
  if(!clearedExistingGate)gateReasons.unshift('EXISTING_MODEL_GATE_NOT_CLEARED');
  if(!exactPrice)gateReasons.push('EXACT_PRICE_NOT_VERIFIED');
  if(modelReview.hold)gateReasons.push('INDEPENDENT_REVIEW_HOLD');
  candidates.push({...row,dataQuality:forecast.dataQuality!=null?ticketNormV70(forecast.dataQuality,0):null,confidenceScore:eliteConfidenceScoreV102(pick),requirements:matchEvidenceV1.eliteEvidenceRequirements(pick.competitionTier,row.market,ticketSelectionKeyV78(row.selection)),primary:forecast.decision==='PICK'&&prior===forecast,exactPrice,modelReview,clearedExistingGate,eliteEligible:!gateReasons.length,gateReasons});
 }
 // Compare the best available line per market family; research does not generate another ticket.
 candidates.sort((a,b)=>Number(b.primary)-Number(a.primary)||Number(b.eliteEligible)-Number(a.eliteEligible)||Number(b.clearedExistingGate)-Number(a.clearedExistingGate)||Number(Boolean(b.exactPrice))-Number(Boolean(a.exactPrice))||((b.exactPrice?b.probability*b.exactPrice.odds-1:-Infinity)-(a.exactPrice?a.probability*a.exactPrice.odds-1:-Infinity))||b.probability-a.probability);
 const diverse=candidates.filter(c=>{if(seen.has(c.market))return false;seen.add(c.market);return true;}).slice(0,7);
 const result=matchEvidenceV1.buildMatchEvidence({job,asOf,results:validHistory,conflicts:arr2(conflictRows).map(r=>r.fixture_id),analysis,candidates:diverse,availability:analysis.intelligence?.availability||{},sourceErrors,truncated:history.length>=160});
 result.homeName=job.home_team;result.awayName=job.away_team;
 if(!analysis.generatedAt)result.risks.unshift('A completed model analysis is not available yet; no market probability is inferred.');
 else if(now-Date.parse(analysis.generatedAt)>6*3600000)result.risks.unshift('The retained model analysis is over six hours old and needs reassessment.');
 await saveFeedSnapshot(env,key,result,86400);return result;
}
async function runMatchEvidenceSweepV1(env) {
 const now=Date.now(),jobs=arr2(await sb(env,'two45_feature_jobs?provider_league_id=in.('+[...TIER1_IDS].join(',')+')&kickoff_at=gt.'+encodeURIComponent(new Date(now).toISOString())+'&kickoff_at=lt.'+encodeURIComponent(new Date(now+48*3600000).toISOString())+'&select=fixture_id,provider_league_id,competition,kickoff_at&order=kickoff_at.asc&limit=60',{timeoutMs:2500}));
 const ids=jobs.filter(j=>competitionTierV21(j.competition,j.provider_league_id)===1).map(j=>Number(j.fixture_id)).filter(Number.isSafeInteger);
 if(!ids.length)return {processed:0};
 const existing=arr2(await sb(env,'two45_feed_snapshots?snapshot_key=in.('+ids.map(id=>'match-evidence-v1:'+id).map(encodeURIComponent).join(',')+')&select=snapshot_key,refreshed_at',{timeoutMs:2500}));
 const fresh=new Set(existing.filter(r=>now-Date.parse(r.refreshed_at)<30*60000).map(r=>r.snapshot_key));
 const id=ids.find(id=>!fresh.has('match-evidence-v1:'+id));if(!id)return {processed:0,reason:'EVIDENCE_CURRENT'};
 const evidence=await getMatchEvidenceV1(env,id,{force:true});return {processed:evidence?1:0,fixtureId:id,historyFixtures:evidence?.historyFixtures??0};
}
