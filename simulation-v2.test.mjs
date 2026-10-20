import assert from 'node:assert/strict';
import {simulateMatch,comparePricedMarkets} from './simulation-v2.mjs';
const input={homeExpectedGoals:1.9,awayExpectedGoals:1.4,simulations:20000,seed:20261020,logRateSd:.15};
const a=simulateMatch(input);assert.deepEqual(a,simulateMatch(input));assert.equal(a.promotionAllowed,false);
const sum=x=>Object.values(x).reduce((v,p)=>v+p,0);
assert(Math.abs(sum(a.markets.MATCH_RESULT)-1)<1e-12);assert(Math.abs(sum(a.markets.BTTS)-1)<1e-12);
for(const x of Object.values(a.markets))for(const p of Object.values(x))assert(p>=0&&p<=1);
for(const market of ['TOTAL_GOALS','HOME_TEAM_GOALS','AWAY_TEAM_GOALS'])for(let t=0;t<8;t++){assert(Math.abs(a.markets[market]['OVER_'+t+'_5']+a.markets[market]['UNDER_'+t+'_5']-1)<1e-12);if(t)assert(a.markets[market]['OVER_'+t+'_5']<=a.markets[market]['OVER_'+(t-1)+'_5']);}
assert.equal(comparePricedMarkets(a,[{bookmaker:'Bet365',market:'TOTAL_GOALS',selection:'OVER_2_5',odds:1.75,observedAt:'2026-10-20T19:00:00Z'},{bookmaker:'Pinnacle',market:'BTTS',selection:'YES',odds:2,observedAt:'2026-10-20T19:00:00Z'}]).length,1);
assert.throws(()=>simulateMatch({...input,homeExpectedGoals:-1}));assert.throws(()=>simulateMatch({...input,simulations:1000000}));
console.log('PASS: deterministic simulation, market coherence, shadow policy, odds filtering');
