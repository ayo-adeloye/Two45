var modelReviewCacheV1=new Map();
var modelReviewHoldReceiptsV1=new Set();
function presentModelReviewV1(pick,review) {
  const match=[...review.pool,...review.holds].find(x=>String(x.fixtureId ?? x.providerMatchId)===String(pick.fixtureId ?? pick.providerMatchId) && x.market===pick.market && ticketSelectionKeyV78(x.selection)===ticketSelectionKeyV78(pick.selection));
  if(!match)return pick;
  return match.modelReview.hold ? {...pick,modelReview:match.modelReview,decision:'NO_BET',qualityHold:true,reasons:['Held for independent-model disagreement review.']} : {...pick,modelReview:match.modelReview};
}
async function reviewModelPoolV1(env,picks) {
  const now=Date.now(),ids=[...new Set(arr2(picks).filter(p=>Number(p.fixtureId ?? p.providerMatchId)>0 && Number.isFinite(Date.parse(p.kickoff ?? p.kickoffAt ?? p.kickoff_at))).map(p=>String(p.fixtureId ?? p.providerMatchId)))].sort();
  let rows=[],error=null;
  if(ids.length) {
    const key=String(supa(env).url||'')+'|'+ids.join(','),cached=modelReviewCacheV1.get(key);
    if(cached && now-cached.at<30000)rows=cached.rows;
    else try {
      rows=arr2(await sb(env,'two45_goal_forecasts_v3?fixture_id=in.('+ids.join(',')+')&generated_at=gte.'+encodeURIComponent(new Date(now-3600000).toISOString())+
        '&select=id,fixture_id,model_id,generated_at,kickoff_at,forecast:payload->forecast,context:payload->context,datasetHash:payload->>datasetHash&order=generated_at.desc,id.desc&limit=500',{timeoutMs:2500}));
      if(modelReviewCacheV1.size>=8)modelReviewCacheV1.delete(modelReviewCacheV1.keys().next().value);
      modelReviewCacheV1.set(key,{at:now,rows});
    }catch(e){error=safeRefreshError(e);}
  }
  const latest=new Map();for(const row of rows)if(!latest.has(String(row.fixture_id)))latest.set(String(row.fixture_id),row);
  // Deterministic, per-fixture simulation challenger; never originates selections.
  const simulations=new Map();
  for(const [fixtureId,row] of latest) {
    const x=row.forecast?.expectedGoals;
    if(!x||!(Number.isFinite(x.home)&&Number.isFinite(x.away)&&x.home>0&&x.away>0))continue;
    try { simulations.set(fixtureId,engine2ShadowV1.simulateMatch({homeExpectedGoals:x.home,awayExpectedGoals:x.away,seed:Number(fixtureId),simulations:3000,logRateSd:.15})); }catch(e){ /* independent review continues unchanged */ }
  }
  const reviewed=arr2(picks).map(p=>({...p,modelReview:modelReviewV1.compareModelPick(p,latest.get(String(p.fixtureId ?? p.providerMatchId)),now,simulations.get(String(p.fixtureId ?? p.providerMatchId)))}));
  const holds=reviewed.filter(p=>p.modelReview.hold);let receiptError=null;
  const pending=holds.map(p=>({pick:p,key:JSON.stringify([p.fixtureId ?? p.providerMatchId,p.market,ticketSelectionKeyV78(p.selection),p.modelReview.coreForecastId,p.sportsbookOdds,p.priceObservedAt])})).filter(x=>!modelReviewHoldReceiptsV1.has(x.key));
  if(pending.length)try {
    await sb(env,'two45_selection_shadow_v2',{method:'POST',prefer:'return=minimal',timeoutMs:2500,body:JSON.stringify(pending.map(({pick:p})=>({fixture_id:p.fixtureId ?? p.providerMatchId,kickoff_at:p.kickoff ?? p.kickoffAt ?? p.kickoff_at,generated_at:new Date(now).toISOString(),model_version:modelReviewV1.REVIEW_VERSION,
      payload:{mode:'REVIEW_HOLD',validationProtocol:modelReviewV1.REVIEW_VERSION,promotionAllowed:false,candidate:p,review:p.modelReview}})))});
    for(const x of pending){if(modelReviewHoldReceiptsV1.size>=256)modelReviewHoldReceiptsV1.delete(modelReviewHoldReceiptsV1.values().next().value);modelReviewHoldReceiptsV1.add(x.key);}
  }catch(e){receiptError=safeRefreshError(e);}
  return {pool:reviewed.filter(p=>!p.modelReview.hold),holds,summary:{...modelReviewV1.summarizeReviews(reviewed),error,receiptError}};
}
