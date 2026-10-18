import fs from 'node:fs';
import crypto from 'node:crypto';
import {fitGoalModel,predictGoals,cleanFixtures,timestamp,scoreMatrix,marketBoard,CORE_VERSION} from '../forecast-core-v3.mjs';
import {grade} from './evaluate-shadow-v2.mjs';
const clip=p=>Math.max(1e-12,Math.min(1-1e-12,p));
const average=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:null;
const logFactorial=n=>{let x=0;for(let i=2;i<=n;i++)x+=Math.log(i);return x;};
function metric(rows,key) {
 const data=rows.filter(r=>r[key]!=null);
 return {n:data.length,brier:average(data.map(r=>(r[key]-r.y)**2)),logLoss:average(data.map(r=>-r.y*Math.log(clip(r[key]))-(1-r.y)*Math.log(clip(1-r[key]))))};
}
function scorelineLoss(p,f) {const cell=p.scoreCells.find(c=>c[0]===f.home_goals&&c[1]===f.away_goals);return -Math.log(Math.max(cell?.[2]||0,1e-12));}
function bootstrap(rows,replicates=1500) {
 const days=[...new Set(rows.map(r=>r.date))].sort(),groups=days.map(d=>rows.filter(r=>r.date===d));
 if(days.length<2)return {days:days.length,brierDifference95:null};
 let seed=7331;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};const diffs=[];
 for(let i=0;i<replicates;i++){let total=0,n=0;for(let d=0;d<days.length;d++){for(const r of groups[Math.floor(random()*days.length)]){total+=(r.core-r.y)**2-(r.baseline-r.y)**2;n++;}}if(n)diffs.push(total/n);}
 diffs.sort((a,b)=>a-b);return {days:days.length,replicates,brierDifference95:[diffs[Math.floor(diffs.length*.025)],diffs[Math.floor(diffs.length*.975)]]};
}
export function evaluateCore(fixtures,forecasts,asOf) {
 const audit=cleanFixtures(fixtures,asOf),all=audit.rows,dates=[...new Set(all.map(f=>f.kickoff_at.slice(0,10)))].sort();
 if(dates.length<10)throw Error('At least ten chronological fixture days required');
 const developmentDate=dates[Math.floor(dates.length*.6)],testDate=dates[Math.floor(dates.length*.8)],developmentCut=developmentDate+'T00:00:00Z',testCut=testDate+'T00:00:00Z';
 const development=all.filter(f=>f.kickoff_at.slice(0,10)>=developmentDate&&f.kickoff_at.slice(0,10)<testDate&&timestamp(f.result_available_at)<timestamp(testCut));
 const configs=[];for(const teamPenalty of [6,12,24])for(const halfLifeDays of [45,90])for(const rho of [0,-.08])configs.push({teamPenalty,halfLifeDays,rho});
 const tuning=configs.map(config=>{
  const model=fitGoalModel(all,developmentCut,config),losses=[];
  for(const f of development) {const at=timestamp(f.kickoff_at)-3600000;if(at<timestamp(model.trainedBefore))continue;losses.push(scorelineLoss(predictGoals(model,f,at),f));}
  return {config,n:losses.length,scorelineLogLoss:average(losses)};
 }).filter(x=>x.n>0).sort((a,b)=>a.scorelineLogLoss-b.scorelineLogLoss);
 if(!tuning.length)throw Error('No time-valid development observations');
 const chosen=tuning[0].config,test=all.filter(f=>f.kickoff_at.slice(0,10)>=testDate),dayModels=new Map(),paired=[],scorelines=[],coverage={eligible:0,coldTeam:0,sparseLeague:0};
 const legacy=new Map();
 for(const r of forecasts) {
  if(!(timestamp(r.created_at)<=timestamp(r.kickoff_at)-3600000)||r.model_version!=='two45-independent-v1.9')continue;
  const old=legacy.get(String(r.fixture_id));if(!old||timestamp(old.created_at)<timestamp(r.created_at))legacy.set(String(r.fixture_id),r);
 }
 for(const f of test) {
  const date=f.kickoff_at.slice(0,10),cut=date+'T00:00:00Z';
  if(!dayModels.has(date))dayModels.set(date,fitGoalModel(all,cut,chosen));
  const model=dayModels.get(date),at=timestamp(f.kickoff_at)-3600000;if(at<timestamp(model.trainedBefore))continue;
  const p=predictGoals(model,f,at),r=legacy.get(String(f.fixture_id));
  if(!p.qualityHold)coverage.eligible++;if(p.rejectionReasons.includes('SPARSE_TEAM_HISTORY'))coverage.coldTeam++;if(p.rejectionReasons.includes('SPARSE_LEAGUE_HISTORY'))coverage.sparseLeague++;
  const line={fixtureId:f.fixture_id,date,coreNLL:scorelineLoss(p,f),baselineNLL:null,core1X2:p.probabilities.MATCH_RESULT};
  const h=Number(r?.expected_goals?.home),a=Number(r?.expected_goals?.away);
  if(h>0&&a>0) {
   // v1.9 truncates each marginal at seven and renormalizes.
   const legacyCells=[];let mass=0;for(let x=0;x<=7;x++)for(let y=0;y<=7;y++){const prob=Math.exp(-h-a+x*Math.log(h)+y*Math.log(a)-logFactorial(x)-logFactorial(y));mass+=prob;legacyCells.push([x,y,prob]);}
   for(const c of legacyCells)c[2]/=mass;
   const cell=legacyCells.find(c=>c[0]===f.home_goals&&c[1]===f.away_goals);line.baselineNLL=-Math.log(Math.max(cell?.[2]||0,1e-12));line.baseline1X2=marketBoard(legacyCells).MATCH_RESULT;
  }
  scorelines.push(line);
  if(!r)continue;const s=String(r.selection).replace(/(\d)\.(\d)/g,'$1_$2'),outcome=grade(r.market,s,f.home_goals,f.away_goals),core=p.probabilities[r.market]?.[s],baseline=Number(r.probability);
  if(!['WIN','LOSS'].includes(outcome)||core==null||!(baseline>0&&baseline<1))continue;
  paired.push({fixtureId:f.fixture_id,date,market:r.market,selection:s,y:+(outcome==='WIN'),core,baseline,marketRawImplied:Number(r.sportsbook_odds)>1?1/Number(r.sportsbook_odds):null,eligible:!p.qualityHold});
 }
 const comparable=scorelines.filter(x=>x.baselineNLL!=null),priced=paired.filter(x=>x.marketRawImplied!=null),ci=bootstrap(paired);
 const reasons=['HISTORICAL_EXACT_QUOTE_TIMESTAMPS_AND_COMPLETE_MARKET_OUTCOMES_MISSING','PROSPECTIVE_SELECTION_ROI_NOT_VALIDATED'];
 if(ci.days<14)reasons.push('FEWER_THAN_14_HELD_OUT_FIXTURE_DAYS');
 if(!(ci.brierDifference95?.[1]<0))reasons.push('BRIER_IMPROVEMENT_NOT_ESTABLISHED');
 if(coverage.eligible<100)reasons.push('INSUFFICIENT_TEAM_AND_LEAGUE_COVERAGE');
 const artifact=fitGoalModel(all,asOf,chosen);
 return {modelVersion:CORE_VERSION,asOf,trainingData:{fixtures:all.length,fixtureDays:dates.length,rejections:audit.rejected},split:{developmentDate,testDate,selection:'Tune only on development scoreline likelihood; fixed hyperparameters, daily rolling refits on already-observed results during test'},tuning,chosen,
  test:{fixtures:scorelines.length,pairedEvents:paired.length,baseline:metric(paired,'baseline'),core:metric(paired,'core'),pricedPaired:{core:metric(priced,'core'),baseline:metric(priced,'baseline'),marketRawImplied:metric(priced,'marketRawImplied'),warning:'Raw single-price implied probability includes bookmaker margin. Complete same-line no-vig benchmarks unavailable historically.'},scoreline:{paired:comparable.length,baselineLogLoss:average(comparable.map(x=>x.baselineNLL)),coreLogLoss:average(comparable.map(x=>x.coreNLL))},byMarket:Object.fromEntries([...new Set(paired.map(x=>x.market))].map(m=>[m,{baseline:metric(paired.filter(x=>x.market===m),'baseline'),core:metric(paired.filter(x=>x.market===m),'core')}])),coverage,uncertainty:ci},
  promotion:{allowed:false,reasons},artifact,pairedObservations:paired};
}
if(process.argv[1]?.endsWith('evaluate-forecast-core-v3.mjs')) {
 const [fixturePath,forecastPath,out,asOf]=process.argv.slice(2);if(!asOf)throw Error('Usage: node scripts/evaluate-forecast-core-v3.mjs fixtures.json forecasts.json report.json ISO_CUTOFF');
 const fixtureBytes=fs.readFileSync(fixturePath),forecastBytes=fs.readFileSync(forecastPath),report=evaluateCore(JSON.parse(fixtureBytes),JSON.parse(forecastBytes),asOf);
 report.inputSHA256={fixtures:crypto.createHash('sha256').update(fixtureBytes).digest('hex'),forecasts:crypto.createHash('sha256').update(forecastBytes).digest('hex')};
 fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({split:report.split,chosen:report.chosen,test:report.test,promotion:report.promotion}));
}
