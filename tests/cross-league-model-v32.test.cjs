const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','worker.js'),'utf8');
const start=source.indexOf('var forecastCoreV3 = (() => {'),end=source.indexOf('// END GENERATED FORECAST CORE V3',start);
const ctx={Date,Math,Number,String,Map,Set,JSON,Error,RegExp,Array,Object,Infinity};vm.createContext(ctx);
vm.runInContext(source.slice(start,end)+';globalThis.core=forecastCoreV3',ctx);
const core=ctx.core;
test('cross-competition core is versioned and retains per-league baselines',()=>{assert.equal(core.CORE_VERSION,'two45-independent-core-v3.2');assert.match(source,/const leagueKey=f=>/);});
test('same team shares strength across leagues within one season',()=>{
const f1={fixture_id:1,league_id:'140',season:'2026',home_id:'172',away_id:'530',home_goals:2,away_goals:1,final_status:'FT',kickoff_at:'2026-09-01T10:00:00Z',result_available_at:'2026-09-01T12:00:00Z'};
const f2={...f1,fixture_id:2,league_id:'2',home_goals:1,away_goals:1,kickoff_at:'2026-09-12T10:00:00Z',result_available_at:'2026-09-12T12:00:00Z'};
const m=core.fitGoalModel([f1,f2],'2026-10-20T09:00:00Z',{iterations:10});
assert.equal(m.teams['2026:172'].n,2);assert.equal(m.teams['2026:530'].n,2);
assert.equal(m.teams['140:2026:172'],undefined);assert.equal(m.leagues['140:2026'].n,1);assert.equal(m.leagues['2:2026'].n,1);
});
test('future or unavailable scores never enter training',()=>{
const f={fixture_id:1,league_id:'140',season:'2026',home_id:'172',away_id:'530',home_goals:1,away_goals:0,final_status:'FT',kickoff_at:'2026-09-01T10:00:00Z',result_available_at:'2026-10-21T10:00:00Z'};
const m=core.fitGoalModel([f],'2026-10-20T09:00:00Z',{iterations:1});
assert.equal(m.trainingFixtures,0);
});
test('runtime read and migration agree on team keys and model version',()=>{
const sql=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20261020_independent_goal_core_v32.sql'),'utf8');
assert.match(sql,/p_season\|\|':'\|\|p_home/);assert.match(sql,/two45-independent-core-v3\.2/);
assert.match(source,/status\?\.modelVersion===forecastCoreV3\.CORE_VERSION/);
});
