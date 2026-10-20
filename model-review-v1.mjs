export const REVIEW_VERSION='two45-independent-review-v1';
const canonical=s=>String(s||'').trim().toUpperCase().replace(/(\d)\.(\d)/g,'$1_$2');
const numeric=x=>x==null||x===''||!Number.isFinite(Number(x))?null:Number(x);
const probability=x=>{const n=numeric(x);return n==null?null:n>1?n/100:n;};

// A conservative evidence-review policy, not fitted calibration or model promotion.
export function compareModelPick(pick,row,now=Date.now(),simulation=null) {
 const payload=row?.payload||row||{},forecast=payload.forecast||{},context=payload.context||{};
 const market=String(pick.market||'').toUpperCase(),selection=canonical(pick.selection),legacy=probability(pick.probability);
 const core=probability(forecast.probabilities?.[market]?.[selection]),odds=numeric(pick.sportsbookOdds ?? pick.odds);
 const base={version:REVIEW_VERSION,fixtureId:pick.fixtureId ?? pick.providerMatchId,market,selection,
  coreForecastId:row?.id||null,coreModelId:row?.model_id||null,coreGeneratedAt:row?.generated_at||null,
  legacyProbability:legacy,independentProbability:core,odds,independentEV:core!=null&&odds>1?core*odds-1:null,
  coreValidated:false,confidenceBoost:0,policy:'REVIEW_ONLY_NO_NEW_PICKS',hold:false};
 const unreviewed=reason=>({...base,status:'UNREVIEWED',reason});
 if(!row)return unreviewed('INDEPENDENT_FORECAST_MISSING');
 const kickoff=Date.parse(pick.kickoff ?? pick.kickoffAt ?? pick.kickoff_at),generated=Date.parse(row.generated_at);
 if(String(row.fixture_id)!==String(base.fixtureId)||Date.parse(row.kickoff_at)!==kickoff)return unreviewed('FIXTURE_IDENTITY_MISMATCH');
 if(!(generated<=now && now-generated<=3600000 && now<kickoff))return unreviewed('STALE_OR_NON_PREMATCH_COMPARISON');
 if(forecast.modelVersion!=='two45-independent-core-v3.1'||!/^[a-f0-9]{64}$/.test(payload.datasetHash||''))return unreviewed('INDEPENDENT_PROVENANCE_MISSING');
 const trained=Date.parse(forecast.trainedBefore),features=Date.parse(context.featureAsOf);
 if(!(trained<=generated && now-trained<=7*86400000 && features<=generated && now-features<=86400000))return unreviewed('STALE_OR_FUTURE_MODEL_INPUTS');
 if(forecast.qualityHold || !(forecast.dataQuality>=.75 && context.sampleSize>=8 && forecast.evidence?.leagueEffectiveMatches>=20))return unreviewed('INSUFFICIENT_INDEPENDENT_EVIDENCE');
 if(!(legacy>0&&legacy<1&&core>0&&core<1&&odds>1))return unreviewed('EXACT_MARKET_PROBABILITY_OR_PRICE_MISSING');
 const observed=Date.parse(pick.priceObservedAt),updated=Date.parse(pick.providerUpdatedAt);
 if(!(updated<=observed&&observed<=now&&now-observed<=1800000&&now-updated<=1800000))return unreviewed('FRESH_EXACT_PRICE_EVIDENCE_MISSING');
 const difference=legacy-core,ev=base.independentEV;
 // Material negative-value disagreement sends an already-qualified legacy candidate back for review.
 if(difference>=.10 && ev<=-.05)return {...base,status:'HOLD',reason:'MATERIAL_INDEPENDENT_DISAGREEMENT',hold:true};
 const sim=probability(simulation?.markets?.[market]?.[selection]);
 if(sim!=null && sim>=0 && sim<=1 && Number.isFinite(simulation?.monteCarloStandardErrorUpperBound)){
  const simEV=sim*odds-1;
  // Engine 2 may challenge a qualified legacy pick but never approve a missing/unsupported candidate.
  if(simEV<=-.05 && core-sim>=.08)return {...base,status:'HOLD',reason:'ENGINE2_SIMULATION_MATERIAL_NEGATIVE_VALUE',hold:true,simulationProbability:sim,simulationEV:simEV,simulationVersion:simulation.version};
 }
 if(ev>=.03 && Math.abs(difference)<.10)return {...base,status:'SUPPORTS',reason:'SAME_MARKET_POSITIVE_VALUE_ABOVE_3PCT_EV_FLOOR'};
 return {...base,status:'DIFFERS',reason:'REVIEW_DIFFERENCE_WITHOUT_STRONG_HOLD'};
}

export function summarizeReviews(rows) {
 const counts={SUPPORTS:0,DIFFERS:0,HOLD:0,UNREVIEWED:0};
 for(const row of rows)counts[row.modelReview?.status||'UNREVIEWED']++;
 return {version:REVIEW_VERSION,mode:'CONSERVATIVE_REVIEW',coreValidated:false,counts};
}
