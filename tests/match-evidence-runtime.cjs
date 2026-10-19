const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Date,Intl,URL,Set,Map,Response,Request,Headers,AbortSignal,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../worker.js'),'utf8').replace(/export\s*\{\s*worker_default as default\s*\};/,''),c);
const now=Date.now(),asOf=new Date(now).toISOString(),job={fixture_id:99,home_team_id:'1',away_team_id:'2',provider_league_id:135,season:2026,kickoff_at:new Date(now+86400000).toISOString(),home_team:'Home QA',away_team:'Away QA'};
const row={fixture_id:1,home_id:'1',away_id:'3',league_id:135,season:2026,kickoff_at:new Date(now-4*86400000).toISOString(),result_available_at:new Date(now-3*86400000).toISOString(),home_goals:2,away_goals:0,final_status:'FT'};
let cache=null,writes=[],conflictFailure=false;
c.getFeedSnapshot=async(_,key)=>key==='match-evidence-v1:99'?cache:key==='model-analysis:99'?{payload:{analysis:{generatedAt:asOf,probabilities:{TOTAL_GOALS:{OVER_1_5:.8,UNDER_3_5:.75}},expectedGoals:{home:1.5,away:1}},forecast:{fixtureId:99,decision:'NO_BET',probability:0,alternatives:[]}}}:null;
c.sb=async(_,path,opts)=>{assert(!opts?.method||opts.method==='GET','Evidence cannot publish or mutate official tables');if(path.startsWith('two45_feature_jobs'))return [job];if(path.startsWith('two45_goal_results'))return [row];if(path.startsWith('two45_goal_result_conflicts')){if(conflictFailure)throw Error('conflict store unavailable');return [];}if(path.startsWith('two45_goal_forecasts'))return [];return [];};
c.saveFeedSnapshot=async(_,key,payload)=>{assert(key.startsWith('match-evidence-v1:'));writes.push(payload);cache={payload};};
c.football=async()=>{throw Error('Provider calls forbidden in evidence review');};
for(const tier of [1,2])for(const [market,selection] of [['MATCH_RESULT','HOME'],['BTTS','YES'],['TOTAL_GOALS','OVER_1_5'],['TOTAL_GOALS','OVER_2_5'],['TOTAL_GOALS','UNDER_4_5'],['HANDICAP','HOME_PLUS_1_5'],['HANDICAP','HOME_PLUS_0_5'],['DOUBLE_CHANCE','HOME_OR_DRAW']]){
 const policy=c.matchEvidenceV1.eliteEvidenceRequirements(tier,market,selection),base={competitionTier:tier,market,selection,probability:policy.probability,dataQuality:1,sportsbookOdds:2,valueEdge:.1};
 assert(!c.eliteRejectionReasonsV2(base).includes('PROBABILITY_FLOOR'));
 assert(c.eliteRejectionReasonsV2({...base,probability:policy.probability-.00001}).includes('PROBABILITY_FLOOR'),'Displayed thresholds must match actual product gates');
}
(async()=>{
 let r=await c.getMatchEvidenceV1({},99);assert.equal(r.historyFixtures,1);assert.equal(r.markets.length,1,'Market families are compared without duplicate fixture selections');assert.equal(r.markets[0].eliteEligible,false);assert.equal(r.markets[0].exactPrice,null);assert.equal(r.createsPicks,false);assert.equal(writes.length,1);
 await c.getMatchEvidenceV1({},99);assert.equal(writes.length,1,'Fresh dossiers should be cached');
 conflictFailure=true;r=await c.getMatchEvidenceV1({},99,{force:true});assert.equal(r.historyFixtures,0);assert(r.sourceErrors.some(x=>x.includes('conflict store unavailable')));
 await assert.rejects(c.getMatchEvidenceV1({},'99)malicious'),/valid fixture/);
 c.authenticatedUser=async()=>({id:'qa-founder'});c.founderAuthorizedV95=async()=>true;c.founderFixtureV99=async()=>job;
 c.analyzeFixtureOnDemand=async()=>({httpStatus:200,body:{status:'READY',forecast:{fixtureId:99,decision:'PICK',market:'TOTAL_GOALS',selection:'OVER_1_5',probability:90,dataQuality:90,sportsbookOdds:1.5,valueEdgePct:20}}});
 c.getMatchEvidenceV1=async()=>({markets:[{primary:true,modelReview:{hold:true}}]});c.evaluateBoardV19=async()=>{};c.ensureTicketLocksV70=async()=>{};
 const reviewWrites=[];c.sb=async(_,path,opts)=>{assert(path.startsWith('two45_founder_elite_suggestions'));reviewWrites.push(JSON.parse(opts.body));return [];};
 const founder=await c.founderSuggestEliteV95(new Request('https://qa.test',{method:'POST',body:JSON.stringify({fixtureId:99})}),{});
 assert.equal(founder.body.status,'REJECTED');assert.equal(founder.body.review.eliteQualified,false);assert.equal(reviewWrites.at(-1).status,'REJECTED','Saved founder review must match the independent review hold');
 console.log('PASS: provider-free detailed research, bounded reads, no invented price/qualification, conflict-store failure, caching and official-write isolation');
})().catch(e=>{console.error(e);process.exitCode=1;});
