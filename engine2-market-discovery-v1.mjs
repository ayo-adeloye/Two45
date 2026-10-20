export const ENGINE2_DISCOVERY_VERSION='engine2-market-discovery-v1';
const canonical=s=>String(s||'').trim().toUpperCase().replace(/(\d)\.(\d)/g,'$1_$2');
export function discoverEngine2Markets(shadow,{minEV=.03,maxQuoteAgeMinutes=30,minProbability=.35}={}){
 if(!shadow?.ok||shadow?.mode!=='SHADOW'||!shadow.simulation||!Number.isFinite(Date.parse(shadow.generatedAt))||!Number.isFinite(Date.parse(shadow.kickoffAt)))return {version:ENGINE2_DISCOVERY_VERSION,status:'BLOCKED',reason:'INVALID_SHADOW_FORECAST',candidates:[],createsPicks:false,promotionAllowed:false};
 const generated=Date.parse(shadow.generatedAt),kickoff=Date.parse(shadow.kickoffAt);
 if(!(generated<kickoff)||shadow.qualityHold)return {version:ENGINE2_DISCOVERY_VERSION,status:'BLOCKED',reason:shadow.qualityHold?'INDEPENDENT_QUALITY_HOLD':'NOT_PREMATCH',candidates:[],createsPicks:false,promotionAllowed:false};
 const candidates=[],rejected={};
 for(const q of shadow.marketComparisons||[]){
  const observed=Date.parse(q.observedAt),p=shadow.simulation.markets?.[q.market]?.[canonical(q.selection)];
  let reason=null;
  if(q.bookmaker!=='Bet365'||!Number.isFinite(q.odds)||q.odds<=1)reason='EXACT_BET365_QUOTE_REQUIRED';
  else if(!Number.isFinite(observed)||observed>generated||generated-observed>maxQuoteAgeMinutes*60000||observed>=kickoff)reason='QUOTE_NOT_FRESH_PREMATCH';
  else if(!Number.isFinite(p)||p<=0||p>=1)reason='MARKET_PROBABILITY_UNAVAILABLE';
  else if(p<minProbability)reason='PROBABILITY_BELOW_FLOOR';
  else if(p*q.odds-1<minEV)reason='NO_POSITIVE_VALUE';
  if(reason){rejected[reason]=(rejected[reason]||0)+1;continue;}
  candidates.push({fixtureId:shadow.fixtureId,market:q.market,selection:canonical(q.selection),odds:q.odds,probability:p,estimatedEV:p*q.odds-1,observedAt:q.observedAt,sourceGeneratedAt:shadow.generatedAt,mode:'SHADOW',createsPicks:false});
 }
 candidates.sort((a,b)=>b.estimatedEV-a.estimatedEV||b.probability-a.probability);
 return {version:ENGINE2_DISCOVERY_VERSION,status:candidates.length?'CANDIDATES':'NO_ELIGIBLE_MARKET',candidates:candidates.slice(0,12),rejected,considered:(shadow.marketComparisons||[]).length,createsPicks:false,promotionAllowed:false};
}
