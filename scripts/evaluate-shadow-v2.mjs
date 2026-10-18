import fs from 'node:fs';
import crypto from 'node:crypto';
import {scoreRows,canonical} from '../selection-v2.mjs';

export function grade(m,s,h,a) {
 if(!Number.isInteger(h)||!Number.isInteger(a)||h<0||a<0)return null;
 s=canonical(s);let v,match;
 if(m==='MATCH_RESULT')return (s==='HOME'?h>a:s==='AWAY'?a>h:s==='DRAW'?h===a:null)===true?'WIN':['HOME','AWAY','DRAW'].includes(s)?'LOSS':null;
 if(m==='BTTS'&&['YES','NO'].includes(s))return ((h>0&&a>0)===(s==='YES'))?'WIN':'LOSS';
 if(m==='DOUBLE_CHANCE')return ({HOME_OR_DRAW:h>=a,DRAW_OR_AWAY:a>=h,HOME_OR_AWAY:h!==a}[s])===true?'WIN':['HOME_OR_DRAW','DRAW_OR_AWAY','HOME_OR_AWAY'].includes(s)?'LOSS':null;
 if(['TOTAL_GOALS','HOME_TEAM_GOALS','AWAY_TEAM_GOALS'].includes(m)) {
   match=s.match(/^(OVER|UNDER)_(\d+(?:_\d+)?)$/);if(!match)return null;
   const line=Number(match[2].replace('_','.'));if((line*100)%50!==0)return null;
   v=(m==='TOTAL_GOALS'?h+a:m==='HOME_TEAM_GOALS'?h:a)-line;if(match[1]==='UNDER')v=-v;
 }else if(m==='HANDICAP') {
   match=s.match(/^(HOME|AWAY)_(PLUS|MINUS)_(\d+(?:_\d+)?)$/);if(!match)return null;
   const line=Number(match[3].replace('_','.'));if((line*100)%50!==0)return null;
   v=(match[1]==='HOME'?h-a:a-h)+(match[2]==='PLUS'?line:-line);
 }else return null;
 return v>0?'WIN':v<0?'LOSS':'PUSH';
}
export function evaluate(rows) {
 const frozen=new Map();
 // Predeclared decision time: last available snapshot at least one hour before kickoff.
 for(const r of rows) {
  if(!(Date.parse(r.generated_at)<=Date.parse(r.kickoff_at)-3600000))continue;
  const prior=frozen.get(String(r.fixture_id));
  if(!prior||Date.parse(prior.generated_at)<Date.parse(r.generated_at))frozen.set(String(r.fixture_id),r);
 }
 const selected=[],legacy=[];
 for(const r of frozen.values()) {
  const p=r.payload||{}, c=p.primary?.[0];
  if(c?.eligible) {
   const outcome=grade(c.market,c.selection,r.final_home_score,r.final_away_score);
   if(outcome)selected.push({...c,legacyProbability:p.legacy?.probabilities?.[c.market]?.[c.selection]??null,outcome,sportsbook_odds:c.odds,fixture_id:r.fixture_id});
  }
  const decision=p.legacyResearchDecision;
  const b=p.candidates?.find(c=>c.market===decision?.market&&c.selection===canonical(decision?.selection));
  if(decision?.decision==='PICK'&&b?.odds>1) {
   const outcome=grade(b.market,b.selection,r.final_home_score,r.final_away_score);
   if(outcome)legacy.push({...b,rawProbability:p.legacy?.probabilities?.[b.market]?.[b.selection]??b.rawProbability,outcome,sportsbook_odds:b.odds,fixture_id:r.fixture_id});
  }
 }
 const paired=selected.filter(c=>c.marketProbability>0&&c.marketProbability<1);
 const candidate=scoreRows(selected,c=>c.probability),rawOnSameSelections=scoreRows(paired,c=>c.rawProbability),market=scoreRows(paired,c=>c.marketProbability);
 const calibratedOnPaired=scoreRows(paired,c=>c.probability),baseline=scoreRows(legacy,c=>c.rawProbability);
 const reasons=[];
 if(candidate.n<200)reasons.push('NEED_200_SETTLED_PROSPECTIVE_SELECTIONS');
 if(paired.length!==selected.filter(c=>['WIN','LOSS'].includes(c.outcome)).length)reasons.push('INCOMPLETE_SAME_LINE_MARKET_BENCHMARK');
 if(!(candidate.roi>0&&candidate.roi>baseline.roi))reasons.push('ROI_NOT_ABOVE_ZERO_AND_LEGACY');
 if(!(calibratedOnPaired.brier<rawOnSameSelections.brier&&calibratedOnPaired.brier<market.brier&&calibratedOnPaired.logLoss<rawOnSameSelections.logLoss&&calibratedOnPaired.logLoss<market.logLoss))reasons.push('PROPER_SCORES_NOT_BETTER_THAN_BOTH_BASELINES');
 reasons.push('REQUIRE_FROZEN_HOLDOUT_AND_FIXTURE_DAY_BLOCK_CONFIDENCE_INTERVAL_REVIEW');
 return {snapshotRule:'Latest snapshot at least one hour before kickoff; one primary per fixture',fixtures:frozen.size,candidate,baseline,legacyOnSameSelections:scoreRows(paired,c=>c.legacyProbability),rawOnSameSelections,calibratedOnPaired,market,paired:paired.length,byMarket:Object.fromEntries([...new Set(selected.map(x=>x.market))].map(m=>[m,scoreRows(selected.filter(x=>x.market===m),c=>c.probability)])),promotion:{allowed:false,reasons}};
}
if(process.argv[1]?.endsWith('evaluate-shadow-v2.mjs')) {
 if(!process.argv[2])throw Error('Usage: node scripts/evaluate-shadow-v2.mjs shadow-export.json [report.json]');
 const bytes=fs.readFileSync(process.argv[2]),report={inputSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),...evaluate(JSON.parse(bytes))};
 const text=JSON.stringify(report,null,2);if(process.argv[3])fs.writeFileSync(process.argv[3],text);else console.log(text);
}
