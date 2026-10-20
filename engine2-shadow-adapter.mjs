import {simulateMatch,comparePricedMarkets,SIMULATION_VERSION} from './simulation-v2.mjs';
export const SHADOW_ADAPTER_VERSION='two45-engine2-shadow-adapter-v1';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function evaluateShadowForecast(row,{seed=undefined,simulations=20000,logRateSd=.15,asOf=undefined}={}){
 const fixture=row?.payload?.fixture,forecast=row?.payload?.forecast;
 const kickoff=Date.parse(row?.kickoff_at||fixture?.kickoff_at),generated=Date.parse(row?.generated_at);
 if(!Number.isFinite(generated)||!Number.isFinite(kickoff)||generated>=kickoff)return {ok:false,reason:'NOT_PREMATCH',createsPicks:false};
 if(asOf!==undefined&&(!Number.isFinite(Date.parse(asOf))||generated>Date.parse(asOf)))return {ok:false,reason:'FORECAST_NOT_YET_AVAILABLE',createsPicks:false};
 const h=forecast?.expectedGoals?.home,a=forecast?.expectedGoals?.away;
 if(!finite(h)||!finite(a)||h<=0||a<=0)return {ok:false,reason:'EXPECTED_GOALS_UNAVAILABLE',createsPicks:false};
 const fixtureId=Number(row.fixture_id??fixture?.fixture_id);
 if(!Number.isSafeInteger(fixtureId)||fixtureId<=0)return {ok:false,reason:'INVALID_FIXTURE_ID',createsPicks:false};
 const actualSeed=seed??fixtureId,simulation=simulateMatch({homeExpectedGoals:h,awayExpectedGoals:a,seed:actualSeed,simulations,logRateSd});
 const observations=(row.payload?.quotes||[]).filter(q=>q.observedAt&&Date.parse(q.observedAt)<=generated&&q.providerUpdatedAt&&Date.parse(q.providerUpdatedAt)<=Date.parse(q.observedAt));
 const marketComparisons=comparePricedMarkets(simulation,observations).map(x=>({...x,preMatch:true}));
 return {ok:true,version:SHADOW_ADAPTER_VERSION,sourceVersion:SIMULATION_VERSION,fixtureId,generatedAt:row.generated_at,kickoffAt:row.kickoff_at,modelId:row.model_id,datasetHash:row.payload?.datasetHash||null,mode:'SHADOW',createsPicks:false,promotionAllowed:false,qualityHold:Boolean(forecast.qualityHold),rejectionReasons:forecast.rejectionReasons||[],simulation,marketComparisons};
}
export function scoreShadowOutcome(shadow,{homeGoals,awayGoals,resultAvailableAt}={}){
 if(!shadow?.ok||!Number.isInteger(homeGoals)||!Number.isInteger(awayGoals)||homeGoals<0||awayGoals<0||!Number.isFinite(Date.parse(resultAvailableAt))||Date.parse(resultAvailableAt)<=Date.parse(shadow.kickoffAt))return {ok:false,reason:'INVALID_OR_UNAVAILABLE_SETTLEMENT'};
 const outcome=homeGoals>awayGoals?'HOME':homeGoals<awayGoals?'AWAY':'DRAW',p=shadow.simulation.markets.MATCH_RESULT[outcome];
 const markets=shadow.marketComparisons.map(c=>{const win=c.market==='MATCH_RESULT'?c.selection===outcome:c.market==='BTTS'?(c.selection==='YES')===(homeGoals>0&&awayGoals>0):c.market==='TOTAL_GOALS'?c.selection.startsWith('OVER_')?(homeGoals+awayGoals)>Number(c.selection.match(/_(\\d+)_(\\d+)$/)?.slice(1).join('.')||NaN):(homeGoals+awayGoals)<Number(c.selection.match(/_(\\d+)_(\\d+)$/)?.slice(1).join('.')||NaN):null;return {...c,won:win};});
 return {ok:true,fixtureId:shadow.fixtureId,marketOutcome:outcome,homeGoals,awayGoals,brier1x2:Object.entries(shadow.simulation.markets.MATCH_RESULT).reduce((s,[key,v])=>s+(v-(key===outcome?1:0))**2,0),logLoss1x2:-Math.log(Math.max(p,1e-12)),markets};
}
