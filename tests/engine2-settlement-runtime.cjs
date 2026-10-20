const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../engine2-settlement-runtime-v1.js'),'utf8');
(async()=>{
 const now=Date.now(),iso=n=>new Date(n).toISOString(),fixtureId=616161;
 const p={ok:true,fixtureId,sourceGeneratedAt:iso(now-5*3600000),kickoffAt:iso(now-4*3600000),modelId:'model-1',qualityHold:false,markets:{MATCH_RESULT:{HOME:.6,DRAW:.2,AWAY:.2}}};
 const rows=[{snapshot_key:'engine2-shadow:v1:'+fixtureId,payload:p}],saved=new Map(),writes=[];
 const context=vm.createContext({Date,Map,Number,Math,JSON,encodeURIComponent,arr2:x=>Array.isArray(x)?x:[],safeRefreshError:e=>String(e.message),sb:async(e,q)=>{
  if(q.startsWith('two45_feed_snapshots?'))return rows;
  if(q.startsWith('two45_goal_results_v3?'))return [{fixture_id:fixtureId,home_goals:2,away_goals:1,final_status:'FT',result_available_at:iso(now-2*3600000),kickoff_at:p.kickoffAt}];
  throw Error('Unexpected read '+q);
 },getFeedSnapshot:async(e,key)=>saved.get(key)||null,saveFeedSnapshot:async(e,key,payload)=>{writes.push(key);saved.set(key,{payload});}});
 vm.runInContext(source,context);
 const first=await context.runEngine2SettlementV1({});
 assert.equal(first.ok,true);assert.equal(first.settled,1);
 const recorded=[...saved.values()][0].payload;assert.equal(recorded.actualOutcome,'HOME');assert(Math.abs(recorded.brier1x2-.24)<1e-12);assert(Math.abs(recorded.logLoss1x2+Math.log(.6))<1e-12);
 const second=await context.runEngine2SettlementV1({});assert.equal(second.settled,0);assert.equal(writes.length,1);assert(writes[0].startsWith('engine2-settled:v1:'));
 context.sb=async(e,q)=>q.startsWith('two45_feed_snapshots?')?rows:[{fixture_id:fixtureId,home_goals:2,away_goals:1,result_available_at:iso(now-6*3600000)}];
 saved.clear();writes.length=0;
 const invalid=await context.runEngine2SettlementV1({});assert.equal(invalid.settled,0);assert.equal(writes.length,0);
 console.log('PASS: immutable shadow scoring, timing safety, idempotency, no publication writes');
})().catch(e=>{console.error(e);process.exitCode=1});
