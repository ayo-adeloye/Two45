const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Date,Intl,URL,Set,Map,Response,Request,Headers,AbortSignal,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../worker.js'),'utf8').replace(/export\s*\{\s*worker_default as default\s*\};/,''),c);
const now=Date.now(),kickoff=new Date(now-86400000).toISOString(),at=new Date(Date.parse(kickoff)-7200000).toISOString();
const candidate={fixtureId:1,eligible:true,market:'TOTAL_GOALS',selection:'OVER_2_5',probability:.7,rawProbability:.68,marketProbability:.6,odds:1.8};
const base={id:1,fixture_id:1,generated_at:at,kickoff_at:kickoff,primary:[candidate],candidates:[candidate],protocol:'independent-v2-migration-20261018',legacy:{probabilities:{TOTAL_GOALS:{OVER_2_5:.65}},decision:{decision:'PICK',market:'TOTAL_GOALS',selection:'OVER_2_5'}}};
let archived=[],saved=[],conflicted=false;
c.getFeedSnapshot=async()=>null;c.archivePlayerResearchV1=async(_,key,payload)=>archived.push({key,payload});c.saveFeedSnapshot=async(_,key,payload)=>saved.push({key,payload});
c.sb=async(_,path)=>path.startsWith('two45_goal_forecasts')?[base,{...base,id:2,generated_at:new Date(Date.parse(kickoff)-300000).toISOString(),primary:[{...candidate,probability:.99}]}]:path.startsWith('two45_goal_results')?[{fixture_id:1,home_goals:2,away_goals:1}]:conflicted?[{fixture_id:1}]:[];
(async()=>{
 let r=await c.runModelValidationV1({});assert.equal(r.report.candidate.n,1);assert(Math.abs(r.report.candidate.brier-.09)<1e-9,'A late forecast cannot replace the frozen one-hour snapshot');assert.equal(r.report.promotion.allowed,false);assert.equal(r.report.candidate.priced,1);assert(Math.abs(r.report.candidate.roi-.8)<1e-9);assert.equal(archived.length,1);assert.equal(r.truncated,false);
 conflicted=true;r=await c.runModelValidationV1({});assert.equal(r.excludedConflicts,1);assert.equal(r.report.candidate.n,0);
 c.getFeedSnapshot=async()=>({payload:{asOf:new Date().toISOString()}});r=await c.runModelValidationV1({});assert.equal(r.skipped,true);
 console.log('PASS: routine frozen forecast scoring, exact snapshot ROI, conflict exclusion, archived reports and no automatic promotion');
})().catch(e=>{console.error(e);process.exitCode=1;});
