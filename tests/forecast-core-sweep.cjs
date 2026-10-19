const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../worker.js'),'utf8');
const c=vm.createContext({console,Date,Intl,URL,Set,Map,Response,Request,Headers,AbortSignal,setTimeout,clearTimeout});
vm.runInContext(source.replace(/export\s*\{\s*worker_default as default\s*\};/,''),c);
(async()=>{
 const jobs=Array.from({length:5},(_,i)=>({fixture_id:i+1,kickoff_at:new Date(Date.now()+3*3600000).toISOString()})),queries=[],calls=[];
 c.sb=async(_e,q)=>{queries.push(q);if(q.startsWith('two45_feature_jobs?'))return jobs;if(q.startsWith('two45_goal_forecasts_v3?'))return [{fixture_id:1}];if(q.startsWith('two45_analysis_state?'))return [{fixture_id:4}];throw Error(q);};
 c.getFeedSnapshot=async()=>null;c.existingForecast=async()=>null;
 c.recordGoalForecastV3=async(_env,job,legacy,quotes)=>{calls.push({job,legacy,quotes});return {mode:'SHADOW',promotionAllowed:false};};
 c.football=c.providerFetchV18=async()=>{throw Error('Must not call provider');};
 const result=await c.runGoalCoreSweepV3({});
 assert.equal(result.ok,true);assert.equal(result.processed,2);assert.equal(calls[0].job.fixture_id,4,'Official candidates should receive independent comparison first');assert.equal(calls[1].job.fixture_id,2);
 assert.equal(Object.keys(calls[0].legacy).length,0,'Missing legacy analysis must not prevent independent inference');
 assert.equal(calls[0].quotes.length,0,'Missing prices remain missing');
 assert(queries[0].includes('kickoff_at=gt.')&&queries[0].includes('kickoff_at=lt.')&&queries[0].includes('limit=60'));
 assert(queries[1].includes('generated_at=gte.'));
 c.sb=async()=>{throw Error('offline');};assert.equal((await c.runGoalCoreSweepV3({})).ok,false);
 console.log('PASS: bounded independent cron inference, no legacy/provider dependency, recent-observation exclusion, no fabricated prices and visible storage failure');
})().catch(e=>{console.error(e);process.exitCode=1});
