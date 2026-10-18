import fs from 'node:fs';
import crypto from 'node:crypto';
import {fitCalibration,calibrationKey,scoreRows,canonical} from '../selection-v2.mjs';
const input=process.argv[2];
if(!input) throw Error('Usage: node scripts/evaluate-v2.mjs forecasts.json [report.json]');
const bytes=fs.readFileSync(input),all=JSON.parse(bytes);
// Whole fixture groups stay together. Decisions must predate kickoff and outcomes must exist.
const seen=new Set();
const clean=[...all].sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)).filter(r=>{
 const key=[r.fixture_id,r.market,canonical(r.selection),r.model_version].join('|');
 if(!(Date.parse(r.created_at)<Date.parse(r.kickoff_at)) || !['WIN','LOSS'].includes(r.outcome) || seen.has(key)) return false;
 seen.add(key);return true;
});
const dates=[...new Set(clean.map(r=>r.kickoff_at.slice(0,10)))].sort();
const cut=dates[Math.floor(dates.length*.7)], test=clean.filter(r=>r.kickoff_at.slice(0,10)>=cut);
const asOf=cut+'T00:00:00Z',calibration=fitCalibration(clean.filter(r=>r.kickoff_at.slice(0,10)<cut),asOf);
const paired=test.filter(r=>Number(r.no_vig_market_probability)>0 && Number(r.no_vig_market_probability)<1 && Number(r.sportsbook_odds)>1);
const raw=r=>Number(r.probability),candidate=r=>Math.max(.001,Math.min(.999,raw(r)+(calibration.groups[calibrationKey(r.market,r.selection,r.model_version)]?.offset||0)));
const old=scoreRows(paired,raw), next=scoreRows(paired,candidate), market=scoreRows(paired,r=>Number(r.no_vig_market_probability));
const report={inputSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),asOf,rows:all.length,postKickoffExcluded:all.filter(r=>Date.parse(r.created_at)>=Date.parse(r.kickoff_at)).length,eligible:clean.length,holdout:test.length,paired:paired.length,baseline:old,candidate:next,market,calibration,marketBreakdown:Object.fromEntries([...new Set(paired.map(r=>r.market))].map(m=>[m,{baseline:scoreRows(paired.filter(r=>r.market===m),raw),candidate:scoreRows(paired.filter(r=>r.market===m),candidate),market:scoreRows(paired.filter(r=>r.market===m),r=>Number(r.no_vig_market_probability))}])),promotion:{allowed:false,reasons:['Historical forecast prices lack immutable exact-tuple quote timestamps; retrospective ROI is diagnostic only.','Feature snapshots and all candidate alternatives are not retained as point-in-time observations for a valid selection replay.','Require prospective shadow data, market-specific sample sufficiency, and independent holdout improvement before activation.']}};
report.benchmarkWarning = "Legacy no_vig_market_probability is diagnostic only: the old selector normalizes all outcomes in a provider market group, which can mix distinct totals/handicap lines. Prospective v2 requires complete same-line outcome sets.";
report.roiScope = "All probability variants score the same historical priced cohort. This is not a selection-strategy ROI comparison and cannot justify promotion.";
const out=JSON.stringify(report,null,2);if(process.argv[3]) fs.writeFileSync(process.argv[3],out);else console.log(out);
