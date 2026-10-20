const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../worker.js'),'utf8');
const c=vm.createContext({console,Date,Intl,URL,Set,Map,Response,Request,Headers,AbortSignal,TextEncoder,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout});
vm.runInContext(source.replace(/export\s*\{\s*worker_default as default\s*\};/,''),c);
(async()=>{
const now=Date.now(),asOf=new Date(now).toISOString();
const fixtures=Array.from({length:100},(_,i)=>({fixture_id:i+1,league_id:'39',season:'2026',home_id:i%2?'2':'1',away_id:i%2?'1':'2',home_goals:i%2?1:2,away_goals:i%2?1:0,kickoff_at:new Date(now-(110-i)*3600000).toISOString(),result_available_at:new Date(now-(107-i)*3600000).toISOString(),final_status:'FT'}));
const snapshots=new Map();c.getFeedSnapshot=async(_env,key)=>snapshots.get(key)||null;c.saveFeedSnapshot=async(_env,key,payload)=>snapshots.set(key,{payload});
let artifact,forecast,queries=[];c.sb=async(_env,q,opt)=>{
 queries.push(q);
 if(q.startsWith('two45_goal_model_artifacts_v3?model_version'))return artifact?[{id:'model-id',trained_before:artifact.trained_before,dataset_hash:artifact.dataset_hash}]:[];
 if(q==='rpc/two45_goal_training_data_v3')return {fixtures,features:[],truncated:false};
 if(q==='rpc/two45_goal_calibration_v3')return {trainedBefore:asOf,groups:{}};
 if(q==='rpc/two45_goal_dataset_hash_v3')return 'a'.repeat(64);
 if(q.startsWith('two45_goal_model_artifacts_v3?on_conflict')){artifact=JSON.parse(opt.body);return [{id:'model-id'}];}
 if(q==='rpc/two45_goal_context_v3')return {model_id:'model-id',model:artifact.parameters};
 if(q==='two45_goal_forecasts_v3'){forecast=JSON.parse(opt.body);return null;}
 throw Error('Unexpected query: '+q);
};
const trained=await c.refreshGoalCoreV3({});assert.equal(trained.state,'READY');assert.equal(artifact.validation.promotionAllowed,false);assert.equal(artifact.parameters.trainingFixtures,100);assert.equal(artifact.dataset_hash.length,64);
const before=queries.filter(q=>q==='rpc/two45_goal_training_data_v3'||q.startsWith('two45_goal_model_artifacts_v3?on_conflict')).length;assert.equal((await c.refreshGoalCoreV3({})).skipped,true);assert.equal(queries.filter(q=>q==='rpc/two45_goal_training_data_v3'||q.startsWith('two45_goal_model_artifacts_v3?on_conflict')).length,before,'Recently trained models must not retrain or insert an artifact');
const job={fixture_id:1000,provider_league_id:'39',season:2026,home_team_id:'1',away_team_id:'2',competition:'Premier League',kickoff_at:new Date(now+3*3600000).toISOString()};
const legacy={modelVersion:'v1.9',expectedGoals:{home:1.2,away:1.1},probabilities:{MATCH_RESULT:{HOME:.4,DRAW:.3,AWAY:.3}}},original=JSON.stringify(legacy);
const result=await c.recordGoalForecastV3({},job,legacy,[]);assert.equal(result.mode,'SHADOW');assert.equal(result.promotionAllowed,false);assert.equal(JSON.stringify(legacy),original);
assert.equal(forecast.model_id,'model-id');assert(forecast.payload.forecast.probabilities.MATCH_RESULT.HOME>0);assert(!('scoreCells' in forecast.payload.forecast));
assert.equal(forecast.payload.primary.length,0,'Missing quote/calibration cannot create a pick');
assert(queries.every(q=>!q.includes('two45_publications')&&!q.includes('two45_model_forecasts')),'Core research must not publish or rewrite legacy forecasts');
const saved=forecast;assert.equal((await c.recordGoalForecastV3({},{...job,kickoff_at:new Date(now-1).toISOString()},legacy,[])).reason,'NOT_PREMATCH');assert.equal(forecast,saved);
snapshots.clear();c.sb=async()=>{throw Error('storage offline')};const failed=await c.refreshGoalCoreV3({});assert.equal(failed.state,'FAILED');assert(Date.parse(failed.retryAfter)>Date.now());
assert.equal((await c.refreshGoalCoreV3({})).reason,'TRAINING_RETRY_BACKOFF');
console.log('PASS: history-aware frozen-config training, hash/artifact persistence, shadow inference, no legacy/publication mutation, pre-match guard and failure backoff');
})().catch(e=>{console.error(e);process.exitCode=1});
