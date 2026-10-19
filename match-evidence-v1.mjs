export const EVIDENCE_VERSION='two45-match-evidence-v1';
export function eliteEvidenceRequirements(tier,market,selection) {
 const t=Number(tier),s=String(selection);let p=t===1?.72:.76,price=1.18;
 if(market==='MATCH_RESULT'&&['HOME','AWAY'].includes(s))p=t===1?.66:.70;
 else if(market==='TOTAL_GOALS'&&s==='OVER_1_5')p=t===1?.74:.77;
 else if(market==='TOTAL_GOALS'&&s==='OVER_2_5')p=t===1?.66:.69;
 else if(market==='BTTS')p=t===1?.66:.69;
 else if(market==='HANDICAP'&&/PLUS_0_5/.test(s))p=t===1?.74:.77;
 else if(market==='DOUBLE_CHANCE')p=t===1?.78:.80;
 else if(market==='TOTAL_GOALS'&&s==='UNDER_4_5'){p=t===1?.86:.88;price=1.45;}
 else if(market==='HANDICAP'&&/(HOME|AWAY)_PLUS_1_5/.test(s)){p=t===1?.86:.88;price=1.30;}
 return {probability:p,dataQuality:t===1?.64:.72,minimumPrice:price,confidenceScore:t===1?73.5:77,positiveValueRequired:true};
}
const stamp=x=>Date.parse(x),unit=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100?(x>1?x/100:x):null;
export function cleanEvidenceResults(rows,job,asOf,conflicts=[]) {
 const cutoff=Math.min(stamp(asOf),stamp(job.kickoff_at)),bad=new Set(conflicts.map(String)),groups=new Map();
 for(const r of rows) {
  if(String(r.fixture_id)===String(job.fixture_id)||bad.has(String(r.fixture_id))||r.final_status!=='FT'||!(stamp(r.kickoff_at)<cutoff&&stamp(r.result_available_at)<=stamp(asOf)&&stamp(r.result_available_at)>=stamp(r.kickoff_at)+90*60000))continue;
  if(![r.home_goals,r.away_goals].every(x=>typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<=30))continue;
  if(![r.home_id,r.away_id].some(x=>[String(job.home_team_id),String(job.away_team_id)].includes(String(x))))continue;
  const key=String(r.fixture_id),old=groups.get(key);
  if(old===null)continue;
  if(old&&(old.home_goals!==r.home_goals||old.away_goals!==r.away_goals||String(old.home_id)!==String(r.home_id)||String(old.away_id)!==String(r.away_id)||old.kickoff_at!==r.kickoff_at))groups.set(key,null);
  else if(!old)groups.set(key,r);
 }
 return [...groups.values()].filter(Boolean).sort((a,b)=>stamp(b.kickoff_at)-stamp(a.kickoff_at));
}
export function evidenceOutcome(m,s,r) {
 s=String(s).toUpperCase().replace(/(\d)\.(\d)/g,'$1_$2');const h=r.home_goals,a=r.away_goals;
 if(m==='BTTS'&&['YES','NO'].includes(s))return (h>0&&a>0)===(s==='YES');
 if(m==='MATCH_RESULT'&&['HOME','AWAY','DRAW'].includes(s))return s==='HOME'?h>a:s==='AWAY'?a>h:a===h;
 const match=s.match(/^(OVER|UNDER)_(\d+)_([05])$/);
 if(!match||!['TOTAL_GOALS','HOME_TEAM_GOALS','AWAY_TEAM_GOALS'].includes(m))return null;
 const value=m==='TOTAL_GOALS'?h+a:m==='HOME_TEAM_GOALS'?h:a,line=Number(match[2]+'.'+match[3]);
 if(value===line)return null;return match[1]==='OVER'?value>line:value<line;
}
function interval(w,n) {if(!n)return null;const z=1.96,p=w/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,r=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [Math.max(0,c-r),Math.min(1,c+r)];}
function profile(rows,id,venue,job) {
 const all=rows.filter(r=>String(r.home_id)===String(id)||String(r.away_id)===String(id));
 const league=all.filter(r=>String(r.league_id)===String(job.provider_league_id)&&String(r.season)===String(job.season));
 const summarize=list=>{const a=list.slice(0,8),n=a.length;return {matches:n,fixtureIds:a.map(r=>r.fixture_id),goalsFor:n?a.reduce((s,r)=>s+(String(r.home_id)===String(id)?r.home_goals:r.away_goals),0)/n:null,goalsAgainst:n?a.reduce((s,r)=>s+(String(r.home_id)===String(id)?r.away_goals:r.home_goals),0)/n:null,pointsPerGame:n?a.reduce((s,r)=>{const h=String(r.home_id)===String(id),gf=h?r.home_goals:r.away_goals,ga=h?r.away_goals:r.home_goals;return s+(gf>ga?3:gf===ga?1:0);},0)/n:null};};
 return {recent:summarize(league),venue:summarize(league.filter(r=>String(venue==='home'?r.home_id:r.away_id)===String(id))),lastCompletedKickoff:all[0]?.kickoff_at||null,daysSinceLastCompletedKickoff:all.length?(stamp(job.kickoff_at)-stamp(all[0].kickoff_at))/86400000:null,completedMatchesLast14Days:all.filter(r=>stamp(job.kickoff_at)-stamp(r.kickoff_at)<=14*86400000).length};
}
export function buildMatchEvidence({job,asOf,results=[],conflicts=[],analysis={},candidates=[],availability={},sourceErrors=[],truncated=false}) {
 const rows=cleanEvidenceResults(results,job,asOf,conflicts),home=profile(rows,job.home_team_id,'home',job),away=profile(rows,job.away_team_id,'away',job),risks=[];
 if(home.recent.matches<8||away.recent.matches<8)risks.push('Fewer than eight recent same-league matches for at least one team.');
 if(home.venue.matches<5||away.venue.matches<5)risks.push('Venue evidence is thin: fewer than five home or away matches.');
 const availabilityFresh=stamp(availability.generatedAt)<=stamp(asOf)&&stamp(asOf)-stamp(availability.generatedAt)<=4*3600000;
 const confirmed=availabilityFresh&&availability.lineupsConfirmed===true;
 if(!confirmed)risks.push('Confirmed starting lineups are not available in fresh retained evidence.');
 if(!availabilityFresh||availability.injuriesError||!Array.isArray(availability.injuries))risks.push('Injury coverage is unknown; missing reports do not mean a full-strength squad.');
 risks.push('Observed xG is unavailable. Model goal expectations are estimates, not measured xG.');
 if(truncated)risks.push('History read reached its bound; evidence may be incomplete.');
 const markets=candidates.map(c=>{
  const p=unit(c.probability),odds=c.exactPrice?.odds??null,breakEven=odds>1?1/odds:null;
  const sample=(id,venue)=>{const observations=rows.filter(r=>String(r.league_id)===String(job.provider_league_id)&&String(r.season)===String(job.season)&&String(venue==='home'?r.home_id:r.away_id)===String(id)).slice(0,8);
   // Match result/team-goal events are oriented to the upcoming fixture's home/away role.
   const events=observations.map(r=>evidenceOutcome(c.market,c.selection,r)).filter(x=>x!==null),wins=events.filter(Boolean).length;
   return {matches:events.length,successes:wins,rate:events.length?wins/events.length:null,interval95:interval(wins,events.length)};};
  const h=sample(job.home_team_id,'home'),a=sample(job.away_team_id,'away'),counter=[];
  if(!c.exactPrice)counter.push('No fresh, exact full-match Bet365 price is verified for this selection.');
  if(p!==null&&breakEven!==null&&p<=breakEven)counter.push('Model probability does not beat the price break-even probability.');
  if(p!==null&&odds>1&&Math.max(0,p-.05)*odds<=1)counter.push('A five-percentage-point probability reduction removes the estimated value.');
  if(h.matches<5||a.matches<5)counter.push('Too few venue-specific observations to rely on the historical event rate.');
  if(c.modelReview?.status==='HOLD')counter.push('The independent model materially disagrees; this selection is held for review.');
  return {...c,probability:p,odds,breakEven,estimatedEV:p!==null&&odds>1?p*odds-1:null,stressEV:p!==null&&odds>1?Math.max(0,p-.05)*odds-1:null,homeVenueEvent:h,awayVenueEvent:a,counterCase:counter};
 });
 return {version:EVIDENCE_VERSION,fixtureId:Number(job.fixture_id),asOf,kickoff:job.kickoff_at,mode:'EVIDENCE_REVIEW',createsPicks:false,confidenceBoost:0,
  summary:'Compare each exact market with its evidence and downside. Historical rates and stress scenarios do not replace validated probabilities.',
  home,away,expectedGoals:analysis.expectedGoals||null,lineupsConfirmed:confirmed,injuryCoverage:availabilityFresh&&!availability.injuriesError&&Array.isArray(availability.injuries)?'REPORTED':'UNKNOWN',
  modelGeneratedAt:analysis.generatedAt||null,historyFixtures:rows.length,historyAvailableAtMax:rows.length?new Date(Math.max(...rows.map(r=>stamp(r.result_available_at)))).toISOString():null,
  risks,sourceErrors,markets,limitations:['Historical event intervals describe the retained sample, not a calibrated probability for this fixture.','Opponent-adjusted forecasting comes from the independent raw model; venue frequencies are descriptive.','No invented motivation, tactical, injury-impact or player-minute assumptions.']};
}
