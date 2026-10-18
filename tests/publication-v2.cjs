const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../worker.js'),'utf8');
const c=vm.createContext({console,Date,Intl,URL,Set,Map,Response,Request,Headers,AbortSignal,setTimeout,clearTimeout});
vm.runInContext(source.replace(/export\s*\{\s*worker_default as default\s*\};/,''),c);
(async()=>{
let query;c.sb=async(e,q)=>{query=q;return [{id:1,fixture_id:10,product:'ELITE_3',outcome:'WIN',final_home_score:0,final_away_score:0}]};
let history=await c.recordHistoryV20({},50);assert(query.startsWith('two45_public_record_v2?'));assert.equal(history.rows[0].source,'ELITE_3');assert.equal(history.rows[0].score,'0-0');
c.sb=async()=>{throw Error('offline')};await assert.rejects(()=>c.recordSummaryV20({}),/offline/);
const pick={probability:.76,dataQuality:.9,valueEdge:.0095,valueEdgePct:.95,competitionTier:1,sportsbookOdds:1.5,market:'TOTAL_GOALS',selection:'OVER_1_5'};
assert(c.publishedReasonV81(pick).includes('edge 0.9%')||c.publishedReasonV81(pick).includes('edge 1.0%'));
assert.equal(c.eliteConfidenceScoreV102(pick),c.eliteConfidenceScoreV102({...pick,valueEdgePct:undefined}));
assert(c.eliteRejectionReasonsV2({...pick,probability:.3}).includes('PROBABILITY_FLOOR'));
assert.equal(c.selectionV2.VERSION,'two45-independent-v2-shadow');
console.log('PASS: publication-only query, 0-0 scores, failure visibility, explicit edge units, reason codes, shadow bundle');
})().catch(e=>{console.error(e);process.exitCode=1});
