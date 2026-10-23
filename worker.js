// BEGIN GENERATED MATCH EVIDENCE V1
var matchEvidenceV1 = (()=>{
const EVIDENCE_VERSION='two45-match-evidence-v1';
function eliteEvidenceRequirements(tier,market,selection) {
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
function cleanEvidenceResults(rows,job,asOf,conflicts=[]) {
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
function evidenceOutcome(m,s,r) {
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
 const lastFive=(list)=>{const a=list.slice(0,5),n=a.length;const matches=a.map(r=>{const home=String(r.home_id)===String(id),gf=home?r.home_goals:r.away_goals,ga=home?r.away_goals:r.home_goals;return {fixtureId:r.fixture_id,kickoff:r.kickoff_at,competitionId:r.league_id,venue:home?'HOME':'AWAY',goalsFor:gf,goalsAgainst:ga,won:gf>ga,btts:gf>0&&ga>0,over25:gf+ga>=3,scored:gf>0,conceded:ga>0};});const count=fn=>matches.filter(fn).length;return {sampleSize:n,scope:'COMPLETED_MATCHES_BEFORE_AS_OF',matches,scored:count(x=>x.scored),conceded:count(x=>x.conceded),btts:count(x=>x.btts),over25:count(x=>x.over25),wins:count(x=>x.won),scoredTwoPlus:count(x=>x.goalsFor>=2),concededTwoPlus:count(x=>x.goalsAgainst>=2)};};
 return {lastFiveAllCompetitions:lastFive(all),lastFiveAtVenue:lastFive(all.filter(r=>String(venue==='home'?r.home_id:r.away_id)===String(id))),recent:summarize(league),venue:summarize(league.filter(r=>String(venue==='home'?r.home_id:r.away_id)===String(id))),lastCompletedKickoff:all[0]?.kickoff_at||null,daysSinceLastCompletedKickoff:all.length?(stamp(job.kickoff_at)-stamp(all[0].kickoff_at))/86400000:null,completedMatchesLast14Days:all.length?all.filter(r=>stamp(job.kickoff_at)-stamp(r.kickoff_at)<=14*86400000).length:null};
}
// Discovery only: pattern evidence ranks markets but never creates a bet or a probability.
function patternOpportunityShortlistV2(home,away) {
 const h=home.lastFiveAllCompetitions,a=away.lastFiveAllCompetitions,
       hv=home.lastFiveAtVenue,av=away.lastFiveAtVenue;
 const candidates=[
  {market:'TOTAL_GOALS',selection:'OVER_2_5',indicators:[['Home last-five Over 2.5',h.over25,h.sampleSize],['Away last-five Over 2.5',a.over25,a.sampleSize],['Home venue Over 2.5',hv.over25,hv.sampleSize],['Away venue Over 2.5',av.over25,av.sampleSize]]},
  {market:'BTTS',selection:'YES',indicators:[['Home last-five BTTS',h.btts,h.sampleSize],['Away last-five BTTS',a.btts,a.sampleSize],['Home venue BTTS',hv.btts,hv.sampleSize],['Away venue BTTS',av.btts,av.sampleSize]]},
  {market:'HOME_TEAM_GOALS',selection:'OVER_1_5',indicators:[['Home scored twice',h.scoredTwoPlus,h.sampleSize],['Away conceded twice',a.concededTwoPlus,a.sampleSize],['Home venue scored twice',hv.scoredTwoPlus,hv.sampleSize],['Away venue conceded twice',av.concededTwoPlus,av.sampleSize]]},
  {market:'AWAY_TEAM_GOALS',selection:'OVER_1_5',indicators:[['Away scored twice',a.scoredTwoPlus,a.sampleSize],['Home conceded twice',h.concededTwoPlus,h.sampleSize],['Away venue scored twice',av.scoredTwoPlus,av.sampleSize],['Home venue conceded twice',hv.concededTwoPlus,hv.sampleSize]]},
  {market:'TOTAL_GOALS',selection:'OVER_1_5',indicators:[['Home scored',h.scored,h.sampleSize],['Away scored',a.scored,a.sampleSize],['Home venue scored',hv.scored,hv.sampleSize],['Away venue scored',av.scored,av.sampleSize]]}
 ];
 return candidates.map(c=>{
   const observations=c.indicators.filter(i=>i[2]>0).map(([label,hits,sampleSize])=>({label,hits,sampleSize}));
   const coverage=observations.reduce((v,i)=>v+i.sampleSize,0);
   const weightedHits=observations.reduce((v,i)=>v+i.hits,0);
   // Descriptive pattern frequency, NOT event probability or expected betting value.
   const descriptiveRate=coverage ? weightedHits/coverage : null;
   const provisional= h.sampleSize<3||a.sampleSize<3 || hv.sampleSize<2||av.sampleSize<2;
   return {market:c.market,selection:c.selection,rankScore:descriptiveRate===null?null:Math.round(descriptiveRate*1000)/10,descriptiveOnly:true,createsPicks:false,coverage,provisional,indicators:observations,
     warnings:[...(provisional?['Small or missing five-game/venue sample']:[]),'Indicators overlap and are not independent observations','Not adjusted for opponent strength or injuries','Must be calibrated and price-verified before any publication']};
 }).sort((x,y)=>(y.rankScore??-1)-(x.rankScore??-1));
}
function buildMatchEvidence({job,asOf,results=[],conflicts=[],analysis={},candidates=[],availability={},sourceErrors=[],truncated=false}) {
 const rows=cleanEvidenceResults(results,job,asOf,conflicts),home=profile(rows,job.home_team_id,'home',job),away=profile(rows,job.away_team_id,'away',job),risks=[];
 if(home.recent.matches<8||away.recent.matches<8)risks.push('Fewer than eight recent same-league matches for at least one team.');
 if(home.venue.matches<5||away.venue.matches<5)risks.push('Venue evidence is thin: fewer than five home or away matches.');
 const availabilityFresh=stamp(availability.generatedAt)<=stamp(asOf)&&stamp(asOf)-stamp(availability.generatedAt)<=4*3600000;
 const confirmed=availabilityFresh&&availability.lineupsConfirmed===true;
 if(!confirmed)risks.push('Confirmed starting lineups are not available in fresh retained evidence.');
 if(!availabilityFresh||availability.injuriesError||!Array.isArray(availability.injuries))risks.push('Injury coverage is unknown; missing reports do not mean a full-strength squad.');
 risks.push('Observed xG is unavailable. Model goal expectations are estimates, not measured xG.');
 if(truncated)risks.push('History read reached its bound; evidence may be incomplete.');
 const patternOpportunities=patternOpportunityShortlistV2(home,away);
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
  const pattern=patternOpportunities.find(x=>x.market===c.market&&x.selection===String(c.selection||'').toUpperCase())||null;
  return {...c,patternEvidence:pattern,patternReviewPriority:pattern?.rankScore??null,probability:p,odds,breakEven,estimatedEV:p!==null&&odds>1?p*odds-1:null,stressEV:p!==null&&odds>1?Math.max(0,p-.05)*odds-1:null,homeVenueEvent:h,awayVenueEvent:a,counterCase:counter};
 });
 return {version:EVIDENCE_VERSION,fixtureId:Number(job.fixture_id),asOf,kickoff:job.kickoff_at,mode:'EVIDENCE_REVIEW',createsPicks:false,confidenceBoost:0,
  summary:'Compare each exact market with its evidence and downside. Historical rates and stress scenarios do not replace validated probabilities.',
  home,away,patternOpportunities,expectedGoals:analysis.expectedGoals||null,lineupsConfirmed:confirmed,injuryCoverage:availabilityFresh&&!availability.injuriesError&&Array.isArray(availability.injuries)?'REPORTED':'UNKNOWN',
  modelGeneratedAt:analysis.generatedAt||null,historyFixtures:rows.length,historyAvailableAtMax:rows.length?new Date(Math.max(...rows.map(r=>stamp(r.result_available_at)))).toISOString():null,
  risks,sourceErrors,markets,limitations:['Historical event intervals describe the retained sample, not a calibrated probability for this fixture.','Opponent-adjusted forecasting comes from the independent raw model; venue frequencies are descriptive.','No invented motivation, tactical, injury-impact or player-minute assumptions.']};
}

return {EVIDENCE_VERSION,cleanEvidenceResults,buildMatchEvidence,evidenceOutcome,eliteEvidenceRequirements,patternOpportunityShortlistV2};
})();
async function getMatchEvidenceV1(env,fixtureId,{force=false}={}) {
 if(!Number.isSafeInteger(Number(fixtureId))||Number(fixtureId)<=0)throw Error('A valid fixture is required');
 fixtureId=Number(fixtureId);const key='match-evidence-v1:'+fixtureId,now=Date.now(),asOf=new Date(now).toISOString();
 const cached=await getFeedSnapshot(env,key).catch(()=>null);
 const cachedAge=now-Date.parse(cached?.payload?.asOf),cachedPricesCurrent=arr2(cached?.payload?.markets).every(m=>!m.exactPrice||[m.exactPrice.observedAt,m.exactPrice.providerUpdatedAt].every(t=>Date.parse(t)<=now&&now-Date.parse(t)<=30*60000));
 if(!force&&cached?.payload?.version===matchEvidenceV1.EVIDENCE_VERSION&&cachedAge>=0&&cachedAge<5*60000&&(!cached.payload.sourceErrors?.length||cachedAge<20000)&&Date.parse(cached.payload.kickoff)>now&&cachedPricesCurrent)return cached.payload;
 const jobs=arr2(await sb(env,'two45_feature_jobs?fixture_id=eq.'+fixtureId+'&select=fixture_id,home_team_id,away_team_id,provider_league_id,season,kickoff_at,home_team,away_team,competition&order=requested_at.desc&limit=1',{timeoutMs:2500}));
 const job=jobs[0];if(!job||!(Date.parse(job.kickoff_at)>now&&Date.parse(job.kickoff_at)<now+72*3600000))return null;
 const ids=[job.home_team_id,job.away_team_id].map(String);if(ids.some(x=>!/^\d+$/.test(x)))throw Error('Canonical team identities unavailable');
 const sourceErrors=[];
 const read=async(label,fn)=>{try{return await fn();}catch(e){sourceErrors.push(label+': '+safeRefreshError(e));return null;}};
 // One read-only server-side projection: never download the entire daily feed.
 const input=await read('evidence inputs',()=>sb(env,'rpc/two45_match_evidence_inputs_v1',{method:'POST',timeoutMs:5000,body:JSON.stringify({p_fixture_id:fixtureId,p_as_of:asOf,p_odds_key:oddsKey(dateOfV19(job.kickoff_at))})}))||{};
 const history=arr2(input.history),saved=input.analysis||{},analysis=saved.analysis||{},forecast=saved.forecast||{},core=input.core;
 const validHistory=history,conflictRows=arr2(input.conflicts);
 const priceRows=arr2(input.prices?.response).filter(r=>String(r.fixture?.id)===String(fixtureId)).sort((a,b)=>(Date.parse(b.observedAt)||0)-(Date.parse(a.observedAt)||0));
 const prices={response:priceRows.slice(0,1)},known=[forecast,...arr2(forecast.alternatives)],seen=new Set(),candidates=[];
 for(const row of flatten(analysis.probabilities||{})) {
  if(!['MATCH_RESULT','TOTAL_GOALS','BTTS','DOUBLE_CHANCE','HANDICAP','HOME_TEAM_GOALS','AWAY_TEAM_GOALS'].includes(row.market))continue;
  const prior=known.find(x=>x.market===row.market&&ticketSelectionKeyV78(x.selection)===ticketSelectionKeyV78(row.selection));
  const exactPrice=exactBet365QuoteV78(prices,fixtureId,row.market,row.selection);
  const pick={...forecast,...row,competitionTier:competitionTierV21(job.competition,job.provider_league_id),sportsbookOdds:exactPrice?.odds??null,valueEdge:exactPrice?row.probability-1/exactPrice.odds:null,valueEdgePct:exactPrice?(row.probability-1/exactPrice.odds)*100:null,priceObservedAt:exactPrice?.observedAt,providerUpdatedAt:exactPrice?.providerUpdatedAt};
  const clearedExistingGate=forecast.decision==='PICK'&&Boolean(prior)&&(prior===forecast||String(prior.lane)==='STRONG');
  const modelReview=modelReviewV1.compareModelPick(pick,core,now),gateReasons=eliteRejectionReasonsV2(pick);
  if(!clearedExistingGate)gateReasons.unshift('EXISTING_MODEL_GATE_NOT_CLEARED');
  if(!exactPrice)gateReasons.push('EXACT_PRICE_NOT_VERIFIED');
  if(modelReview.hold)gateReasons.push('INDEPENDENT_REVIEW_HOLD');
  candidates.push({...row,dataQuality:forecast.dataQuality!=null?ticketNormV70(forecast.dataQuality,0):null,confidenceScore:eliteConfidenceScoreV102(pick),requirements:matchEvidenceV1.eliteEvidenceRequirements(pick.competitionTier,row.market,ticketSelectionKeyV78(row.selection)),primary:forecast.decision==='PICK'&&prior===forecast,exactPrice,modelReview,clearedExistingGate,eliteEligible:!gateReasons.length,gateReasons});
 }
 // Compare the best available line per market family; research does not generate another ticket.
 candidates.sort((a,b)=>Number(b.primary)-Number(a.primary)||Number(b.eliteEligible)-Number(a.eliteEligible)||Number(b.clearedExistingGate)-Number(a.clearedExistingGate)||Number(Boolean(b.exactPrice))-Number(Boolean(a.exactPrice))||((b.exactPrice?b.probability*b.exactPrice.odds-1:-Infinity)-(a.exactPrice?a.probability*a.exactPrice.odds-1:-Infinity))||b.probability-a.probability);
 const diverse=candidates.filter(c=>{if(seen.has(c.market))return false;seen.add(c.market);return true;}).slice(0,7);
 const result=matchEvidenceV1.buildMatchEvidence({job,asOf,results:validHistory,conflicts:conflictRows,analysis,candidates:diverse,availability:analysis.intelligence?.availability||{},sourceErrors,truncated:history.length>=160});
 result.homeName=job.home_team;result.awayName=job.away_team;
 if(!analysis.generatedAt)result.risks.unshift('A completed model analysis is not available yet; no market probability is inferred.');
 else if(now-Date.parse(analysis.generatedAt)>6*3600000)result.risks.unshift('The retained model analysis is over six hours old and needs reassessment.');
 await saveFeedSnapshot(env,key,result,86400);return result;
}
async function runMatchEvidenceSweepV1(env) {
 const now=Date.now(),jobs=arr2(await sb(env,'two45_feature_jobs?provider_league_id=in.('+[...TIER1_IDS].join(',')+')&kickoff_at=gt.'+encodeURIComponent(new Date(now).toISOString())+'&kickoff_at=lt.'+encodeURIComponent(new Date(now+48*3600000).toISOString())+'&select=fixture_id,provider_league_id,competition,kickoff_at&order=kickoff_at.asc&limit=60',{timeoutMs:2500}));
 const ids=jobs.filter(j=>competitionTierV21(j.competition,j.provider_league_id)===1).map(j=>Number(j.fixture_id)).filter(Number.isSafeInteger);
 if(!ids.length)return {processed:0};
 const existing=arr2(await sb(env,'two45_feed_snapshots?snapshot_key=in.('+ids.map(id=>'match-evidence-v1:'+id).map(encodeURIComponent).join(',')+')&select=snapshot_key,refreshed_at',{timeoutMs:2500}));
 const fresh=new Set(existing.filter(r=>now-Date.parse(r.refreshed_at)<30*60000).map(r=>r.snapshot_key));
 const id=ids.find(id=>!fresh.has('match-evidence-v1:'+id));if(!id)return {processed:0,reason:'EVIDENCE_CURRENT'};
 const evidence=await getMatchEvidenceV1(env,id,{force:true});return {processed:evidence?1:0,fixtureId:id,historyFixtures:evidence?.historyFixtures??0};
}

async function runMatchHistoryCollectionV1(env,{productionBacklog=false}={}) {
 const key='match-history-v1:status',now=Date.now(),asOf=new Date(now).toISOString();
 if(productionBacklog)return {skipped:true,reason:'PRODUCTION_BACKLOG_FIRST'};
 const previous=(await getFeedSnapshot(env,key).catch(()=>null))?.payload;
 if(now-Date.parse(previous?.asOf)<5*60000)return {skipped:true,reason:'HISTORY_5M_CADENCE'};
 if(!providerBurstV69||providerBurstV69.calls>=providerBurstV69.maxCalls)return {skipped:true,reason:'PROVIDER_BUDGET_RESERVED_FOR_PRODUCTION'};
 const status={version:'two45-match-history-v1',asOf,mode:'RESEARCH_INPUTS',officialPicksCreated:0,providerCalls:0};
 try {
  const jobs=arr2(await sb(env,'two45_feature_jobs?provider_league_id=in.('+[...new Set([...TIER1_IDS,...TIER2_IDS])].join(',')+')&kickoff_at=gt.'+encodeURIComponent(asOf)+'&kickoff_at=lt.'+encodeURIComponent(new Date(now+48*3600000).toISOString())+'&select=fixture_id,home_team_id,away_team_id,provider_league_id,season,kickoff_at,competition&order=kickoff_at.asc&limit=60',{timeoutMs:3000}));
  const teams=new Map();for(const j of jobs.filter(j=>competitionTierV21(j.competition,j.provider_league_id)<=2))for(const id of [j.home_team_id,j.away_team_id]){
   if(!/^\d+$/.test(String(id)))continue;const teamKey='match-history-v1:team:'+j.provider_league_id+':'+j.season+':'+id;if(!teams.has(teamKey))teams.set(teamKey,{id:String(id),job:j,key:teamKey});
  }
  if(!teams.size){status.reason='NO_UPCOMING_TIER1_TEAMS';}
  else {
   const rows=arr2(await sb(env,'two45_feed_snapshots?snapshot_key=in.('+[...teams.keys()].map(encodeURIComponent).join(',')+')&select=snapshot_key,payload->retryAfter',{timeoutMs:3000}));
   const deferred=new Set(rows.filter(r=>Date.parse(r.retryAfter)>now).map(r=>r.snapshot_key));
   const selected=[...teams.values()].find(t=>!deferred.has(t.key));
   if(!selected)status.reason='TEAM_HISTORY_CURRENT_OR_BACKOFF';
   else {
    const {job,id}=selected;status.fixtureId=job.fixture_id;status.teamId=id;
    const input=await sb(env,'rpc/two45_match_evidence_inputs_v1',{method:'POST',timeoutMs:5000,body:JSON.stringify({p_fixture_id:job.fixture_id,p_as_of:asOf,p_odds_key:oddsKey(dateOfV19(job.kickoff_at))})});
    const available=matchEvidenceV1.cleanEvidenceResults(arr2(input?.history),job,asOf,arr2(input?.conflicts)).filter(r=>String(r.home_id)===id||String(r.away_id)===id);
    status.retainedMatchesBefore=available.length;status.historyScope='ALL_COMPETITIONS_LAST_180_DAYS';
    if(available.length>=8)status.reason='SUFFICIENT_RETAINED_HISTORY';
    else {
     status.providerCalls=1;
     const raw=await football(env,'/fixtures',{team:id,last:15});
     if(raw.errors&&Object.keys(raw.errors).length)throw Error('Historical fixtures provider returned errors');
     const observedAt=new Date().toISOString();
     const fixtures=arr2(raw.response).filter(f=>f.fixture?.status?.short==='FT'&&Date.parse(f.fixture?.date)<Date.parse(job.kickoff_at)&&[f.teams?.home?.id,f.teams?.away?.id].some(x=>String(x)===id)&&Date.parse(f.fixture?.date)+90*60000<=Date.parse(observedAt)&&[f.goals?.home,f.goals?.away].every(g=>typeof g==='number'&&Number.isInteger(g)&&g>=0&&g<=30));
     const sourceKey='match-history-v1:raw:'+job.provider_league_id+':'+job.season+':'+id+':'+observedAt;
     await archivePlayerResearchV1(env,sourceKey,{observedAt,fixtureId:job.fixture_id,teamId:id,fixtures,mode:'RESEARCH_INPUTS'});
     // Existing append-only label capture records observation time and detects conflicts.
     await sb(env,'rpc/two45_capture_goal_results_v3',{method:'POST',timeoutMs:4000,body:JSON.stringify({p_key:sourceKey,p_payload:{fixtures},p_observed_at:observedAt,p_seed:false})});
     status.acceptedFixtures=fixtures.length;status.observedAt=observedAt;status.crossCompetitionFixtures=fixtures.filter(f=>String(f.league?.id)!==String(job.provider_league_id)).length;
     if(!fixtures.length)status.reason='NO_VALID_REGULATION_RESULTS_RETURNED';
    }
    await saveFeedSnapshot(env,selected.key,{asOf,teamId:id,retryAfter:new Date(now+(status.acceptedFixtures>0?12:4)*3600000).toISOString(),status},2*86400);
   }
  }
  status.ok=true;
 }catch(e){status.ok=false;status.error=safeRefreshError(e);}
 await saveFeedSnapshot(env,key,status,365*86400);return status;
}

// END GENERATED MATCH EVIDENCE V1
// BEGIN GENERATED PLAYER RESEARCH V1
var playerPropsV1 = (()=>{
// Research only. No player market can enter an official publisher through this module.
const PLAYER_RESEARCH_VERSION = 'two45-player-research-v1';
const PLAYER_MARKETS = ['PLAYER_SHOTS_ON_TARGET','PLAYER_TO_SCORE','PLAYER_TO_ASSIST','PLAYER_TO_SCORE_OR_ASSIST'];
function isPlayerMarket(name) {
  const label=String(name).trim();
  return /player|scorer/i.test(label)||/^(?:(?:anytime|first|last)\s+)?(?:to score|to assist|(?:to )?score or assist)$/i.test(label);
}
function normalizePlayerStats(response, fixture, observedAt) {
  const rows=[];
  const count=v=>typeof v==='number'&&Number.isInteger(v)&&v>=0?v:null;
  for(const team of response||[]) for(const p of team.players||[]) {
    // A fixture response must have one statistics entry. Ambiguity stays missing.
    const s=p.statistics?.length===1?p.statistics[0]:null;
    if(!s||!Number.isSafeInteger(p.player?.id)||!Number.isSafeInteger(team.team?.id))continue;
    rows.push({fixtureId:Number(fixture.fixture_id),playerId:p.player.id,teamId:team.team.id,name:p.player.name||null,
      kickoff:fixture.kickoff_at,availableAt:observedAt,minutes:count(s.games?.minutes),
      started:typeof s.games?.substitute==='boolean'?!s.games.substitute:null,
      shotsOnTarget:count(s.shots?.on),goals:count(s.goals?.total),assists:count(s.goals?.assists)});
  }
  return rows;
}
function forecastPlayerProp({history=[],playerId,teamId,fixtureId,kickoff,asOf,lineup,market,line=0.5,quote}) {
  const reasons=[],now=Date.parse(asOf),ko=Date.parse(kickoff);
  if(!(now<ko))reasons.push('NOT_PREMATCH');
  if(!PLAYER_MARKETS.includes(market)||!(line===0.5||(market==='PLAYER_SHOTS_ON_TARGET'&&line===1.5)))reasons.push('UNSUPPORTED_EXACT_MARKET');
  if(!(lineup?.confirmed===true&&lineup.playerId===playerId&&lineup.teamId===teamId&&lineup.fixtureId===fixtureId&&lineup.starting===true&&Date.parse(lineup.observedAt)<=now&&now-Date.parse(lineup.observedAt)<=60*60000))reasons.push('CONFIRMED_START_REQUIRED');
  const groups=new Map();
  for(const r of history) {
    if(r.playerId!==playerId||r.teamId!==teamId||r.fixtureId===fixtureId||r.started!==true||!(r.minutes>0&&r.minutes<=120)||!(Date.parse(r.availableAt)<=now&&Date.parse(r.kickoff)<now&&now-Date.parse(r.kickoff)<=180*86400000))continue;
    if(!groups.has(r.fixtureId))groups.set(r.fixtureId,[]);groups.get(r.fixtureId).push(r);
  }
  const valid=v=>Number.isInteger(v)&&v>=0;
  const rows=[...groups.values()].filter(a=>a.length===1).map(a=>a[0]).filter(r=>market==='PLAYER_SHOTS_ON_TARGET'?valid(r.shotsOnTarget):market==='PLAYER_TO_SCORE'?valid(r.goals):market==='PLAYER_TO_ASSIST'?valid(r.assists):valid(r.goals)&&valid(r.assists));
  const minutes=rows.reduce((n,r)=>n+r.minutes,0);
  if(rows.length<10||minutes<600)reasons.push('INSUFFICIENT_PLAYER_STARTS_AND_MINUTES');
  const wins=rows.filter(r=>market==='PLAYER_SHOTS_ON_TARGET'?r.shotsOnTarget>line:market==='PLAYER_TO_SCORE'?r.goals>0:market==='PLAYER_TO_ASSIST'?r.assists>0:r.goals>0||r.assists>0).length;
  // Empirical start-level probability with Jeffreys smoothing. Includes early substitutions.
  // Score-or-assist uses the observed union, never an independence assumption.
  const probability=rows.length?(wins+0.5)/(rows.length+1):null;
  const fresh=t=>Date.parse(t)<=now&&now-Date.parse(t)<=30*60000;
  if(!(quote?.bookmaker==='Bet365'&&quote.fixtureId===fixtureId&&quote.playerId===playerId&&quote.teamId===teamId&&quote.market===market&&quote.line===line&&quote.selection==='OVER'&&Number.isFinite(quote.odds)&&quote.odds>1&&fresh(quote.observedAt)&&fresh(quote.providerUpdatedAt)&&quote.settlementRulesVerified===true))reasons.push('EXACT_FRESH_PLAYER_PRICE_AND_RULES_REQUIRED');
  return {version:PLAYER_RESEARCH_VERSION,mode:'RESEARCH_ONLY',promotionAllowed:false,fixtureId,playerId,teamId,market,line,
    probability:reasons.length?null:probability,sampleSize:rows.length,minutes,successes:wins,
    method:'Empirical confirmed-start event frequency; Jeffreys smoothing; no opponent adjustment or validated edge',
    blockers:[...reasons,'PLAYER_CHRONOLOGICAL_VALIDATION_REQUIRED'],officialEligible:false};
}

return {PLAYER_RESEARCH_VERSION,PLAYER_MARKETS,isPlayerMarket,normalizePlayerStats,forecastPlayerProp};
})();
async function runPlayerResearchV1(env,{productionBacklog=false}={}) {
  const key='player-research-v1:status',now=Date.now(),stamp=new Date(now).toISOString();
  const previous=(await getFeedSnapshot(env,key).catch(()=>null))?.payload;
  const collectionRevision='tier1-before-limit-gateway-v5';
  if(previous?.collectionRevision===collectionRevision&&now-Date.parse(previous?.asOf)<15*60000)return {skipped:true,reason:'RESEARCH_15M_CADENCE'};
  const status={version:playerPropsV1.PLAYER_RESEARCH_VERSION,collectionRevision,asOf:stamp,mode:'RESEARCH_ONLY',promotionAllowed:false,
    markets:playerPropsV1.PLAYER_MARKETS,officialPicksCreated:0,providerCalls:0,
    blockers:['PLAYER_HISTORY_ACCUMULATING','EXACT_PLAYER_ID_PRICE_MAPPING_REQUIRED','BOOKMAKER_PLAYER_SETTLEMENT_RULES_REQUIRED','PLAYER_CHRONOLOGICAL_VALIDATION_REQUIRED']};
  try {
    // Archive raw player prices with original timestamps; names are never guessed into player IDs.
    let rawMarkets=0;
    for(const date of [...new Set([easternDate(),tomorrowEasternDate()])]) {
      const snapshot=(await getFeedSnapshot(env,oddsKey(date)))?.payload;
      const fixtures=arr2(snapshot?.response).map(r=>({...r,bookmakers:arr2(r.bookmakers).filter(b=>String(b.name).replace(/[^a-z0-9]/gi,'').toLowerCase()==='bet365').map(b=>({...b,bets:arr2(b.bets).filter(m=>playerPropsV1.isPlayerMarket(m.name))})).filter(b=>b.bets.length)})).filter(r=>r.bookmakers.length);
      rawMarkets+=fixtures.reduce((n,r)=>n+r.bookmakers.reduce((s,b)=>s+b.bets.length,0),0);
      if(fixtures.length)await archivePlayerResearchV1(env,'player-research-v1:quotes:'+stamp+':'+date,{asOf:stamp,fixtures,mode:'RESEARCH_ONLY'});
    }
    status.rawPlayerMarkets=rawMarkets;
    if(!rawMarkets)status.blockers.push('NO_RETAINED_BET365_PLAYER_MARKETS');
    // One settled fixture per run, only with spare provider capacity, after production work.
    if(productionBacklog)status.collectionDeferred='PRODUCTION_BACKLOG_FIRST';
    else if(!providerBurstV69||providerBurstV69.calls>=providerBurstV69.maxCalls)status.collectionDeferred='PROVIDER_BUDGET_RESERVED_FOR_PRODUCTION';
    else {
      const finals=arr2(await sb(env,'two45_goal_results_v3?league_id=in.('+[...TIER1_IDS].join(',')+')&kickoff_at=gte.'+encodeURIComponent(new Date(now-7*86400000).toISOString())+'&final_status=eq.FT&select=fixture_id,league_id,kickoff_at,competition&order=kickoff_at.desc,fixture_id.desc&limit=50',{timeoutMs:3000}));
      const eligible=finals.filter(f=>competitionTierV21(f.competition,f.league_id)===1);
      const keys=eligible.map(f=>'player-research-v1:stats:'+f.fixture_id);
      const retained=keys.length?arr2(await sb(env,'two45_feed_snapshots?snapshot_key=in.('+keys.map(encodeURIComponent).join(',')+')&select=snapshot_key',{timeoutMs:3000})):[];
      const seen=new Set(retained.map(r=>r.snapshot_key));
      const selected=eligible.find(f=>!seen.has('player-research-v1:stats:'+f.fixture_id));
      status.collectionWindowCandidates=eligible.length;
      if(selected) {
        status.providerCalls=1;
        const raw=await football(env,'/fixtures/players',{fixture:selected.fixture_id});
        if(raw.errors&&Object.keys(raw.errors).length)throw Error('Player statistics provider returned errors');
        const observedAt=new Date().toISOString(),rows=playerPropsV1.normalizePlayerStats(raw.response,selected,observedAt);
        if(!rows.length)throw Error('No unambiguous player statistics available; retry later');
        await archivePlayerResearchV1(env,'player-research-v1:stats:'+selected.fixture_id,{fixture:selected,observedAt,rows,source:'/fixtures/players',mode:'RESEARCH_ONLY'});
        status.collectedFixtureId=selected.fixture_id;status.playerRows=rows.length;
        status.completeStatRows=rows.filter(r=>r.shotsOnTarget!==null&&r.goals!==null&&r.assists!==null).length;
      }else status.collectionDeferred='NO_UNCOLLECTED_TIER1_FINAL_IN_WINDOW';
    }
    status.ok=true;
  }catch(e){status.ok=false;status.error=safeRefreshError(e);}
  await saveFeedSnapshot(env,key,status,365*86400);return status;
}
async function archivePlayerResearchV1(env,key,payload) {
  // Existing feed storage, immutable first observation; no publication/Record writes.
  await sb(env,'two45_feed_snapshots?on_conflict=snapshot_key',{method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',body:JSON.stringify({snapshot_key:key,payload,refreshed_at:new Date().toISOString(),expires_at:new Date(Date.now()+3650*86400000).toISOString(),request_count:0})});
}

// END GENERATED PLAYER RESEARCH V1
// BEGIN GENERATED MODEL REVIEW V1
var modelReviewV1 = (() => {
const REVIEW_VERSION='two45-independent-review-v1';
const canonical=s=>String(s||'').trim().toUpperCase().replace(/(\d)\.(\d)/g,'$1_$2');
const numeric=x=>x==null||x===''||!Number.isFinite(Number(x))?null:Number(x);
const probability=x=>{const n=numeric(x);return n==null?null:n>1?n/100:n;};

// A conservative evidence-review policy, not fitted calibration or model promotion.
function compareModelPick(pick,row,now=Date.now(),simulation=null) {
 const payload=row?.payload||row||{},forecast=payload.forecast||{},context=payload.context||{};
 const market=String(pick.market||'').toUpperCase(),selection=canonical(pick.selection),legacy=probability(pick.probability);
 const core=probability(forecast.probabilities?.[market]?.[selection]),odds=numeric(pick.sportsbookOdds ?? pick.odds);
 const base={version:REVIEW_VERSION,fixtureId:pick.fixtureId ?? pick.providerMatchId,market,selection,
  coreForecastId:row?.id||null,coreModelId:row?.model_id||null,coreGeneratedAt:row?.generated_at||null,
  legacyProbability:legacy,independentProbability:core,odds,independentEV:core!=null&&odds>1?core*odds-1:null,
  coreValidated:false,confidenceBoost:0,policy:'REVIEW_ONLY_NO_NEW_PICKS',hold:false};
 const unreviewed=reason=>({...base,status:'UNREVIEWED',reason});
 if(!row)return unreviewed('INDEPENDENT_FORECAST_MISSING');
 const kickoff=Date.parse(pick.kickoff ?? pick.kickoffAt ?? pick.kickoff_at),generated=Date.parse(row.generated_at);
 if(String(row.fixture_id)!==String(base.fixtureId)||Date.parse(row.kickoff_at)!==kickoff)return unreviewed('FIXTURE_IDENTITY_MISMATCH');
 if(!(generated<=now && now-generated<=3600000 && now<kickoff))return unreviewed('STALE_OR_NON_PREMATCH_COMPARISON');
 if(forecast.modelVersion!=='two45-independent-core-v3.1'||!/^[a-f0-9]{64}$/.test(payload.datasetHash||''))return unreviewed('INDEPENDENT_PROVENANCE_MISSING');
 const trained=Date.parse(forecast.trainedBefore),features=Date.parse(context.featureAsOf);
 if(!(trained<=generated && now-trained<=7*86400000 && features<=generated && now-features<=86400000))return unreviewed('STALE_OR_FUTURE_MODEL_INPUTS');
 if(forecast.qualityHold || !(forecast.dataQuality>=.75 && context.sampleSize>=8 && forecast.evidence?.leagueEffectiveMatches>=20))return unreviewed('INSUFFICIENT_INDEPENDENT_EVIDENCE');
 if(!(legacy>0&&legacy<1&&core>0&&core<1&&odds>1))return unreviewed('EXACT_MARKET_PROBABILITY_OR_PRICE_MISSING');
 const observed=Date.parse(pick.priceObservedAt),updated=Date.parse(pick.providerUpdatedAt);
 if(!(updated<=observed&&observed<=now&&now-observed<=1800000&&now-updated<=1800000))return unreviewed('FRESH_EXACT_PRICE_EVIDENCE_MISSING');
 const difference=legacy-core,ev=base.independentEV;
 // Material negative-value disagreement sends an already-qualified legacy candidate back for review.
 if(difference>=.10 && ev<=-.05)return {...base,status:'HOLD',reason:'MATERIAL_INDEPENDENT_DISAGREEMENT',hold:true};
 const sim=probability(simulation?.markets?.[market]?.[selection]);
 if(sim!=null && sim>=0 && sim<=1 && Number.isFinite(simulation?.monteCarloStandardErrorUpperBound)){
  const simEV=sim*odds-1;
  // Engine 2 may challenge a qualified legacy pick but never approve a missing/unsupported candidate.
  if(simEV<=-.05 && core-sim>=.08)return {...base,status:'HOLD',reason:'ENGINE2_SIMULATION_MATERIAL_NEGATIVE_VALUE',hold:true,simulationProbability:sim,simulationEV:simEV,simulationVersion:simulation.version};
 }
 if(ev>=.03 && Math.abs(difference)<.10)return {...base,status:'SUPPORTS',reason:'SAME_MARKET_POSITIVE_VALUE_ABOVE_3PCT_EV_FLOOR'};
 return {...base,status:'DIFFERS',reason:'REVIEW_DIFFERENCE_WITHOUT_STRONG_HOLD'};
}

function summarizeReviews(rows) {
 const counts={SUPPORTS:0,DIFFERS:0,HOLD:0,UNREVIEWED:0};
 for(const row of rows)counts[row.modelReview?.status||'UNREVIEWED']++;
 return {version:REVIEW_VERSION,mode:'CONSERVATIVE_REVIEW',coreValidated:false,counts};
}

return {REVIEW_VERSION,compareModelPick,summarizeReviews};
})();
// END GENERATED MODEL REVIEW V1
// BEGIN MODEL REVIEW RUNTIME V1
var modelReviewCacheV1=new Map();
var modelReviewHoldReceiptsV1=new Set();
function presentModelReviewV1(pick,review) {
  const match=[...review.pool,...review.holds].find(x=>String(x.fixtureId ?? x.providerMatchId)===String(pick.fixtureId ?? pick.providerMatchId) && x.market===pick.market && ticketSelectionKeyV78(x.selection)===ticketSelectionKeyV78(pick.selection));
  if(!match)return pick;
  return match.modelReview.hold ? {...pick,modelReview:match.modelReview,decision:'NO_BET',qualityHold:true,reasons:['Held for independent-model disagreement review.']} : {...pick,modelReview:match.modelReview};
}
async function reviewModelPoolV1(env,picks) {
  const now=Date.now(),ids=[...new Set(arr2(picks).filter(p=>Number(p.fixtureId ?? p.providerMatchId)>0 && Number.isFinite(Date.parse(p.kickoff ?? p.kickoffAt ?? p.kickoff_at))).map(p=>String(p.fixtureId ?? p.providerMatchId)))].sort();
  let rows=[],error=null;
  if(ids.length) {
    const key=String(supa(env).url||'')+'|'+ids.join(','),cached=modelReviewCacheV1.get(key);
    if(cached && now-cached.at<30000)rows=cached.rows;
    else try {
      rows=arr2(await sb(env,'two45_goal_forecasts_v3?fixture_id=in.('+ids.join(',')+')&generated_at=gte.'+encodeURIComponent(new Date(now-3600000).toISOString())+
        '&select=id,fixture_id,model_id,generated_at,kickoff_at,forecast:payload->forecast,context:payload->context,datasetHash:payload->>datasetHash&order=generated_at.desc,id.desc&limit=500',{timeoutMs:2500}));
      if(modelReviewCacheV1.size>=8)modelReviewCacheV1.delete(modelReviewCacheV1.keys().next().value);
      modelReviewCacheV1.set(key,{at:now,rows});
    }catch(e){error=safeRefreshError(e);}
  }
  const latest=new Map();for(const row of rows)if(!latest.has(String(row.fixture_id)))latest.set(String(row.fixture_id),row);
  // Deterministic, per-fixture simulation challenger; never originates selections.
  const simulations=new Map();
  for(const [fixtureId,row] of latest) {
    const x=row.forecast?.expectedGoals;
    if(!x||!(Number.isFinite(x.home)&&Number.isFinite(x.away)&&x.home>0&&x.away>0))continue;
    try { simulations.set(fixtureId,engine2ShadowV1.simulateMatch({homeExpectedGoals:x.home,awayExpectedGoals:x.away,seed:Number(fixtureId),simulations:3000,logRateSd:.15})); }catch(e){ /* independent review continues unchanged */ }
  }
  const reviewed=arr2(picks).map(p=>({...p,modelReview:modelReviewV1.compareModelPick(p,latest.get(String(p.fixtureId ?? p.providerMatchId)),now,simulations.get(String(p.fixtureId ?? p.providerMatchId)))}));
  const holds=reviewed.filter(p=>p.modelReview.hold);let receiptError=null;
  const pending=holds.map(p=>({pick:p,key:JSON.stringify([p.fixtureId ?? p.providerMatchId,p.market,ticketSelectionKeyV78(p.selection),p.modelReview.coreForecastId,p.sportsbookOdds,p.priceObservedAt])})).filter(x=>!modelReviewHoldReceiptsV1.has(x.key));
  if(pending.length)try {
    await sb(env,'two45_selection_shadow_v2',{method:'POST',prefer:'return=minimal',timeoutMs:2500,body:JSON.stringify(pending.map(({pick:p})=>({fixture_id:p.fixtureId ?? p.providerMatchId,kickoff_at:p.kickoff ?? p.kickoffAt ?? p.kickoff_at,generated_at:new Date(now).toISOString(),model_version:modelReviewV1.REVIEW_VERSION,
      payload:{mode:'REVIEW_HOLD',validationProtocol:modelReviewV1.REVIEW_VERSION,promotionAllowed:false,candidate:p,review:p.modelReview}})))});
    for(const x of pending){if(modelReviewHoldReceiptsV1.size>=256)modelReviewHoldReceiptsV1.delete(modelReviewHoldReceiptsV1.values().next().value);modelReviewHoldReceiptsV1.add(x.key);}
  }catch(e){receiptError=safeRefreshError(e);}
  return {pool:reviewed.filter(p=>!p.modelReview.hold),holds,summary:{...modelReviewV1.summarizeReviews(reviewed),error,receiptError}};
}

// END MODEL REVIEW RUNTIME V1
// BEGIN GENERATED FORECAST CORE V3
var forecastCoreV3 = (() => {
// Odds-free, hierarchical goal model. Training labels are unique regulation-time fixtures.
const CORE_VERSION='two45-independent-core-v3.1';
const day=86400000;
const number=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const clip=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const leagueKey=f=>`${f.league_id}:${f.season}`;
const teamKey=(f,id)=>`${leagueKey(f)}:${id}`;
const validId=x=>x!=null&&String(x).trim()!==''&&!['undefined','null','nan','0'].includes(String(x).toLowerCase());
function seasonFeatures(snapshot,fixture,side,at) {
 if(!snapshot)return null;
 const team=side==='home'?fixture.home_id:fixture.away_id;
 if(String(snapshot.provider_team_id)!==String(team)||String(snapshot.provider_league_id)!==String(fixture.league_id)||String(snapshot.season)!==String(fixture.season))return null;
 if(!(timestamp(snapshot.as_of)<=timestamp(at))||!snapshot.cutoff_date||!(snapshot.cutoff_date<fixture.kickoff_at.slice(0,10)))return null;
 const played={};for(const venue of ['home','away','total']) {const n=number(snapshot.played?.[venue]);played[venue]=Number.isInteger(n)&&n>=0?n:null;}
 if(played.total==null||played.home==null||played.away==null||played.total!==played.home+played.away)return null;
 const forRate={},againstRate={};
 for(const [name,target] of [['goals_for',forRate],['goals_against',againstRate]])for(const venue of ['home','away','total']) {
  const goals=number(snapshot[name]?.[venue]),n=played[venue];
  target[venue]=n>0&&goals!=null&&goals>=0&&goals/n<=8?goals/n:null;
 }
 return {snapshotId:snapshot.id||null,teamId:String(team),leagueId:String(fixture.league_id),season:String(fixture.season),observedAt:snapshot.as_of,cutoffDate:snapshot.cutoff_date,played,forRate,againstRate};
}
function validFeatures(f,fixture,side,at) {
 const team=side==='home'?fixture.home_id:fixture.away_id;
 return f&&String(f.teamId)===String(team)&&String(f.leagueId)===String(fixture.league_id)&&String(f.season)===String(fixture.season)&&timestamp(f.observedAt)<=timestamp(at)&&timestamp(at)-timestamp(f.observedAt)<=30*day&&f.cutoffDate<fixture.kickoff_at.slice(0,10)?f:null;
}
function seasonOffsets(f,global,config,at) {
 const h=validFeatures(f.home_features,f,'home',at),a=validFeatures(f.away_features,f,'away',at);
 const ratio=(feature,field,venue,prior)=>{
  const n=feature?.played?.[venue]||0,r=feature?.[field]?.[venue];
  return r==null||!n?0:Math.log((n*r+config.seasonPriorMatches*prior)/(n+config.seasonPriorMatches)/prior);
 };
 return {home:config.seasonWeight*(ratio(h,'forRate','home',global.home)+ratio(a,'againstRate','away',global.home)),away:config.seasonWeight*(ratio(a,'forRate','away',global.away)+ratio(h,'againstRate','home',global.away)),h,a};
}
function timestamp(s) {
 if(typeof s==='number')return Number.isFinite(s)?s:NaN;
 return Date.parse(String(s||'').replace(' ','T').replace(/([+-]\d\d)$/,'$1:00'));
}
function cleanFixtures(rows,asOf) {
 const before=timestamp(asOf),groups=new Map(),rejected={};
 const reject=k=>{rejected[k]=(rejected[k]||0)+1;};
 for(const f of rows) {
  const h=number(f.home_goals),a=number(f.away_goals),kickoff=timestamp(f.kickoff_at),available=timestamp(f.result_available_at);
  if(f.final_status!=='FT'){reject('NOT_REGULATION_FULL_TIME');continue;}
  if(!f.fixture_id||!f.league_id||!f.season||!f.home_id||!f.away_id||String(f.home_id)===String(f.away_id)){reject('IDENTITY');continue;}
  if(!Number.isInteger(h)||!Number.isInteger(a)||h<0||a<0||h>30||a>30){reject('SCORES');continue;}
  if(!Number.isFinite(kickoff)||!Number.isFinite(available)||available<kickoff){reject('RESULT_PROVENANCE');continue;}
  if(!(available<before&&kickoff<before)){reject('NOT_AVAILABLE_BEFORE_CUTOFF');continue;}
  const copy={...f,home_goals:h,away_goals:a},id=String(f.fixture_id),existing=groups.get(id);
  if(existing===null){reject('CONFLICTING_DUPLICATE');continue;}
  if(existing&&(existing.home_goals!==h||existing.away_goals!==a||String(existing.home_id)!==String(f.home_id)||String(existing.away_id)!==String(f.away_id)||leagueKey(existing)!==leagueKey(f)||timestamp(existing.kickoff_at)!==kickoff)){
    groups.set(id,null);reject('CONFLICTING_DUPLICATE');continue;
  }
  if(!existing||available<timestamp(existing.result_available_at))groups.set(id,copy);
  else reject('EXACT_DUPLICATE');
 }
 return {rows:[...groups.values()].filter(Boolean).sort((a,b)=>timestamp(a.kickoff_at)-timestamp(b.kickoff_at)||String(a.fixture_id).localeCompare(String(b.fixture_id))),rejected};
}

function attachSeasonHistory(fixtures,snapshots) {
 const groups=new Map();for(const s of snapshots){const key=[s.provider_league_id,s.season,s.provider_team_id].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);}
 for(const list of groups.values())list.sort((a,b)=>timestamp(a.as_of)-timestamp(b.as_of));
 return fixtures.map(f=>{
  const at=timestamp(f.kickoff_at)-3600000,result={...f};
  for(const side of ['home','away']) {
   const list=groups.get([f.league_id,f.season,f[side+'_id']].join(':'))||[];
   for(let i=list.length-1;i>=0;i--) {
    if(timestamp(list[i].as_of)>at)continue;
    const feature=seasonFeatures(list[i],f,side,at);if(feature){result[side+'_features']=feature;break;}
   }
  }
  return result;
 });
}

function fitGoalModel(fixtures,asOf,options={}) {
 const config={halfLifeDays:90,teamPenalty:12,leaguePriorMatches:30,seasonPriorMatches:12,seasonWeight:.65,rho:0,iterations:90,...options};
 if(!(config.halfLifeDays>0&&config.teamPenalty>0&&config.leaguePriorMatches>0&&config.seasonPriorMatches>0&&config.seasonWeight>=0&&config.seasonWeight<=1&&Math.abs(config.rho)<=.2))throw Error('Invalid model configuration');
 const clean=cleanFixtures(fixtures,asOf),now=timestamp(asOf);
 if(!Number.isFinite(now))throw Error('Training cutoff must be a valid timestamp');
 const rows=clean.rows.map(f=>({...f,weight:Math.exp(-Math.LN2*(now-timestamp(f.kickoff_at))/day/config.halfLifeDays)}));
 const sum=rows.reduce((n,r)=>n+r.weight,0);
 // Weak global Gamma priors are explicit; league and team terms learn from results.
 const global={home:(rows.reduce((n,r)=>n+r.home_goals*r.weight,0)+1.4*20)/(sum+20),away:(rows.reduce((n,r)=>n+r.away_goals*r.weight,0)+1.1*20)/(sum+20)};
 const leagues={},teams={};
 for(const f of rows) {
  const l=leagues[leagueKey(f)] ||= {home:Math.log(global.home),away:Math.log(global.away),n:0,weight:0};l.n++;l.weight+=f.weight;
  for(const id of [f.home_id,f.away_id]) {const t=teams[teamKey(f,id)] ||= {attack:0,defence:0,n:0,weight:0};t.n++;t.weight+=f.weight;}
 }
 const observations=rows.flatMap(f=>{
  const offsets=seasonOffsets(f,global,config,timestamp(f.kickoff_at)-3600000);
  return [
   {l:leagueKey(f),venue:'home',attack:teamKey(f,f.home_id),defence:teamKey(f,f.away_id),y:f.home_goals,w:f.weight,offset:offsets.home},
   {l:leagueKey(f),venue:'away',attack:teamKey(f,f.away_id),defence:teamKey(f,f.home_id),y:f.away_goals,w:f.weight,offset:offsets.away}
  ];
 });
 const groups=new Map();
 for(const o of observations)for(const key of [`l|${o.l}|${o.venue}`,`a|${o.attack}`,`d|${o.defence}`]) {
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
 }
 const rate=o=>Math.exp(clip(leagues[o.l][o.venue]+teams[o.attack].attack+teams[o.defence].defence+o.offset,-3,2));
 let lastStep=Infinity,iterations=0;
 // Damped coordinate Newton optimization of a penalized weighted Poisson likelihood.
 for(;iterations<config.iterations;iterations++) {
  let maximum=0;
  for(const [key,obs] of groups) {
   const [type,id,venue]=key.split('|'),object=type==='l'?leagues[id]:teams[id],field=type==='l'?venue:type==='a'?'attack':'defence';
   const current=object[field];let gradient,hessian;
   if(type==='l') {
    const prior=global[venue],penalty=config.leaguePriorMatches;
    gradient=penalty*(Math.exp(current)-prior);hessian=penalty*Math.exp(current);
   }else {gradient=config.teamPenalty*current;hessian=config.teamPenalty;}
   for(const o of obs){const mu=rate(o);gradient+=o.w*(mu-o.y);hessian+=o.w*mu;}
   const step=clip(gradient/Math.max(hessian,1e-8),-.3,.3);object[field]=clip(current-.8*step,type==='l'?-2.3:-1.5,type==='l'?1.8:1.5);maximum=Math.max(maximum,Math.abs(step));
  }
  lastStep=maximum;if(maximum<1e-7)break;
 }
 // Diagonal curvature approximations are reported as approximations, not calibrated confidence bounds.
 for(const [key,obs] of groups) {
  const [type,id,venue]=key.split('|'),object=type==='l'?leagues[id]:teams[id],field=type==='l'?venue:type==='a'?'attack':'defence';
  object[field+'Variance']=1/(obs.reduce((n,o)=>n+o.w*rate(o),0)+(type==='l'?config.leaguePriorMatches*Math.exp(object[field]):config.teamPenalty));
 }
 return {version:CORE_VERSION,trainedBefore:new Date(now).toISOString(),trainingFixtures:rows.length,firstFixture:rows[0]?.kickoff_at||null,lastFixture:rows.at(-1)?.kickoff_at||null,global,leagues,teams,config,fit:{iterations,lastStep},trainingAudit:clean.rejected};
}

function poissonVector(lambda) {
 const p=[Math.exp(-lambda)];let sum=p[0];
 for(let k=1;k<80;k++){p[k]=p[k-1]*lambda/k;sum+=p[k];if(k>lambda&&1-sum<1e-12)break;}
 return {p,tail:Math.max(0,1-sum)};
}
function scoreMatrix(homeRate,awayRate,rho=0) {
 if(!(homeRate>0&&awayRate>0&&homeRate<=8&&awayRate<=8))throw Error('Invalid goal rates');
 const h=poissonVector(homeRate),a=poissonVector(awayRate);
 const safeRho=clip(rho,Math.max(-1/homeRate,-1/awayRate)+1e-9,Math.min(1/(homeRate*awayRate),1)-1e-9);
 const cells=[];let mass=0;
 for(let x=0;x<h.p.length;x++)for(let y=0;y<a.p.length;y++) {
  const tau=x===0&&y===0?1-homeRate*awayRate*safeRho:x===0&&y===1?1+homeRate*safeRho:x===1&&y===0?1+awayRate*safeRho:x===1&&y===1?1-safeRho:1;
  const p=h.p[x]*a.p[y]*tau;cells.push([x,y,p]);mass+=p;
 }
 return {cells:cells.map(([h,a,p])=>[h,a,p/mass]),discardedTail:1-(1-h.tail)*(1-a.tail),rho:safeRho};
}
function marketBoard(cells) {
 const out={MATCH_RESULT:{HOME:0,DRAW:0,AWAY:0},BTTS:{YES:0,NO:0},TOTAL_GOALS:{},HOME_TEAM_GOALS:{},AWAY_TEAM_GOALS:{},HANDICAP:{}};
 for(const m of ['TOTAL_GOALS','HOME_TEAM_GOALS','AWAY_TEAM_GOALS'])for(const line of [.5,1.5,2.5,3.5,4.5,5.5]) {const s=String(line).replace('.','_');out[m]['OVER_'+s]=0;out[m]['UNDER_'+s]=0;}
 for(const team of ['HOME','AWAY'])for(const sign of ['PLUS','MINUS'])for(const line of [.5,1.5,2.5])out.HANDICAP[`${team}_${sign}_${String(line).replace('.','_')}`]=0;
 for(const [h,a,p] of cells) {
  out.MATCH_RESULT[h>a?'HOME':h<a?'AWAY':'DRAW']+=p;out.BTTS[h>0&&a>0?'YES':'NO']+=p;
  for(const [m,total] of [['TOTAL_GOALS',h+a],['HOME_TEAM_GOALS',h],['AWAY_TEAM_GOALS',a]])for(const line of [.5,1.5,2.5,3.5,4.5,5.5])out[m][`${total>line?'OVER':'UNDER'}_${String(line).replace('.','_')}`]+=p;
  for(const [team,diff] of [['HOME',h-a],['AWAY',a-h]])for(const [sign,mult] of [['PLUS',1],['MINUS',-1]])for(const line of [.5,1.5,2.5])if(diff+mult*line>0)out.HANDICAP[`${team}_${sign}_${String(line).replace('.','_')}`]+=p;
 }
 out.DOUBLE_CHANCE={HOME_OR_DRAW:out.MATCH_RESULT.HOME+out.MATCH_RESULT.DRAW,DRAW_OR_AWAY:out.MATCH_RESULT.DRAW+out.MATCH_RESULT.AWAY,HOME_OR_AWAY:out.MATCH_RESULT.HOME+out.MATCH_RESULT.AWAY};
 return out;
}

function predictGoals(model,fixture,asOf,context={}) {
 if(model?.version!==CORE_VERSION)throw Error('Unsupported goal model version');
 const now=timestamp(asOf),kickoff=timestamp(fixture.kickoff_at),trained=timestamp(model.trainedBefore);
 if(!Number.isFinite(now)||!Number.isFinite(kickoff)||!(trained<=now&&now<kickoff))throw Error('Prediction violates training/fixture time boundary');
 if(![fixture.league_id,fixture.season,fixture.home_id,fixture.away_id].every(validId)||String(fixture.home_id)===String(fixture.away_id))throw Error('Fixture identity is incomplete');
 const l=model.leagues[leagueKey(fixture)],h=model.teams[teamKey(fixture,fixture.home_id)],a=model.teams[teamKey(fixture,fixture.away_id)];
 const offsets=seasonOffsets(fixture,model.global,model.config,asOf);
 const homeLog=(l?.home??Math.log(model.global.home))+(h?.attack||0)+(a?.defence||0)+offsets.home,awayLog=(l?.away??Math.log(model.global.away))+(a?.attack||0)+(h?.defence||0)+offsets.away;
 const homeVariance=(l?.homeVariance??1/20)+(h?.attackVariance??1/model.config.teamPenalty)+(a?.defenceVariance??1/model.config.teamPenalty);
 const awayVariance=(l?.awayVariance??1/20)+(a?.attackVariance??1/model.config.teamPenalty)+(h?.defenceVariance??1/model.config.teamPenalty);
 const reasons=[];
 if(!l||l.weight<20)reasons.push('SPARSE_LEAGUE_HISTORY');
 const supported=(t,f,venue)=>(t?.weight||0)>=4||((f?.played?.total||0)>=8&&(f?.played?.[venue]||0)>=4&&f?.forRate?.[venue]!=null&&f?.againstRate?.[venue]!=null);
 if(!supported(h,offsets.h,'home')||!supported(a,offsets.a,'away'))reasons.push('SPARSE_TEAM_HISTORY');
 if(now-trained>7*day)reasons.push('STALE_TRAINING_ARTIFACT');
 // Context must have observed measurements and separately validated coefficients;
 // default lineup/absence/form values never alter independent goal rates.
 const contextual={used:false,provided:Object.keys(context).length>0,reason:'CONTEXT_COEFFICIENTS_NOT_VALIDATED'};
 const quadrature=[[-Math.sqrt(3),1/6],[0,2/3],[Math.sqrt(3),1/6]],mixture=new Map(),draws=[];let tail=0;
 for(const [zh,wh] of quadrature)for(const [za,wa] of quadrature) {
  const rateH=clip(Math.exp(homeLog+zh*Math.sqrt(homeVariance)),.08,7),rateA=clip(Math.exp(awayLog+za*Math.sqrt(awayVariance)),.08,7);
  const matrix=scoreMatrix(rateH,rateA,model.config.rho),weight=wh*wa;tail+=weight*matrix.discardedTail;
  draws.push({weight,home:rateH,away:rateA});
  for(const [x,y,p] of matrix.cells){const key=`${x}:${y}`;mixture.set(key,(mixture.get(key)||0)+p*weight);}
 }
 const cells=[...mixture].map(([key,p])=>[...key.split(':').map(Number),p]),mass=cells.reduce((n,c)=>n+c[2],0);
 for(const c of cells)c[2]/=mass;
 return {modelVersion:CORE_VERSION,trainedBefore:model.trainedBefore,generatedAt:new Date(now).toISOString(),fixtureId:fixture.fixture_id,
  expectedGoals:{home:draws.reduce((n,x)=>n+x.home*x.weight,0),away:draws.reduce((n,x)=>n+x.away*x.weight,0)},
  probabilities:marketBoard(cells),scoreCells:cells,uncertainty:{method:'penalized-curvature log-rate mixture; diagonal approximation',homeLogSd:Math.sqrt(homeVariance),awayLogSd:Math.sqrt(awayVariance),discardedTail:tail},
  evidence:{leagueMatches:l?.n||0,homeMatches:h?.n||0,awayMatches:a?.n||0,leagueEffectiveMatches:l?.weight||0,homeEffectiveMatches:h?.weight||0,awayEffectiveMatches:a?.weight||0,homeSeasonSnapshot:offsets.h?.snapshotId||null,awaySeasonSnapshot:offsets.a?.snapshotId||null,homeSeasonMatches:offsets.h?.played?.total||0,awaySeasonMatches:offsets.a?.played?.total||0,contextual},
  dataQuality:Math.min(1,(l?.weight||0)/30)*.3+Math.min(1,Math.max(h?.weight||0,offsets.h?.played?.total||0)/8)*.35+Math.min(1,Math.max(a?.weight||0,offsets.a?.played?.total||0)/8)*.35,
  qualityHold:reasons.length>0,rejectionReasons:reasons,coreUsesSportsbookOdds:false,promotionAllowed:false};
}

return {CORE_VERSION,fitGoalModel,predictGoals,seasonFeatures,attachSeasonHistory};
})();
// END GENERATED FORECAST CORE V3
// BEGIN GENERATED ENGINE2 SHADOW V1
var engine2ShadowV1 = (()=>{
const SIMULATION_VERSION='two45-simulation-v2.0-shadow';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rng(seed){let s=(seed>>>0)||0x9e3779b9;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
function normal(r){return Math.sqrt(-2*Math.log(Math.max(r(),1e-12)))*Math.cos(2*Math.PI*r());}
function poisson(lambda,r){let sum=0,remaining=lambda;while(remaining>0){const part=Math.min(remaining,8),bound=Math.exp(-part);let p=1,k=0;do{p*=r();k++;}while(p>bound);sum+=k-1;remaining-=part;}return sum;}
function simulateMatch(input){
 const {homeExpectedGoals:h,awayExpectedGoals:a,simulations:n=20000,seed=42,logRateSd=0}=input||{};
 if(!Number.isFinite(h)||!Number.isFinite(a)||h<=0||a<=0||h>8||a>8)throw Error('Invalid expected goals');
 if(!Number.isInteger(n)||n<1000||n>100000)throw Error('Simulation count must be 1000-100000');
 if(!Number.isInteger(seed)||!Number.isFinite(logRateSd)||logRateSd<0||logRateSd>.75)throw Error('Invalid seed or uncertainty');
 const r=rng(seed),counts=new Map(),outcomes={HOME:0,DRAW:0,AWAY:0},total=Array(8).fill(0),home=Array(8).fill(0),away=Array(8).fill(0);let btts=0;
 for(let i=0;i<n;i++){
  const hg=poisson(clamp(h*Math.exp(logRateSd*normal(r)-.5*logRateSd**2),.01,15),r),ag=poisson(clamp(a*Math.exp(logRateSd*normal(r)-.5*logRateSd**2),.01,15),r);
  outcomes[hg>ag?'HOME':hg<ag?'AWAY':'DRAW']++;if(hg>0&&ag>0)btts++;counts.set(hg+'-'+ag,(counts.get(hg+'-'+ag)||0)+1);
  for(let t=0;t<8;t++){if(hg+ag>t)total[t]++;if(hg>t)home[t]++;if(ag>t)away[t]++;}
 }
 const p=x=>x/n,markets={MATCH_RESULT:Object.fromEntries(Object.entries(outcomes).map(([k,v])=>[k,p(v)])),BTTS:{YES:p(btts),NO:1-p(btts)}};
 markets.DOUBLE_CHANCE={HOME_OR_DRAW:1-markets.MATCH_RESULT.AWAY,DRAW_OR_AWAY:1-markets.MATCH_RESULT.HOME,HOME_OR_AWAY:1-markets.MATCH_RESULT.DRAW};
 for(const [market,values]of [['TOTAL_GOALS',total],['HOME_TEAM_GOALS',home],['AWAY_TEAM_GOALS',away]]){markets[market]={};for(let t=0;t<8;t++){markets[market]['OVER_'+t+'_5']=p(values[t]);markets[market]['UNDER_'+t+'_5']=1-p(values[t]);}}
 return {version:SIMULATION_VERSION,mode:'SHADOW',promotionAllowed:false,seed,simulations:n,inputs:{homeExpectedGoals:h,awayExpectedGoals:a,logRateSd},markets,topScorelines:[...counts].map(([score,count])=>({score,probability:p(count)})).sort((x,y)=>y.probability-x.probability||x.score.localeCompare(y.score)).slice(0,12),monteCarloStandardErrorUpperBound:1/(2*Math.sqrt(n))};
}
function comparePricedMarkets(simulation,quotes,{minExpectedValue=.03}={}){
 if(simulation?.version!==SIMULATION_VERSION||!Array.isArray(quotes))throw Error('Invalid simulation or quotes');
 return quotes.flatMap(q=>{const p=simulation.markets[q.market]?.[q.selection];if(p==null||!Number.isFinite(q.odds)||q.odds<=1||!q.observedAt||q.bookmaker!=='Bet365')return [];const expectedValue=p*q.odds-1;return [{market:q.market,selection:q.selection,bookmaker:q.bookmaker,odds:q.odds,observedAt:q.observedAt,probability:p,expectedValue,meetsIndicativeEV:expectedValue>=minExpectedValue,simulationOnly:true}];}).sort((x,y)=>y.expectedValue-x.expectedValue);
}

const SHADOW_ADAPTER_VERSION='two45-engine2-shadow-adapter-v1';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function evaluateShadowForecast(row,{seed=undefined,simulations=20000,logRateSd=.15,asOf=undefined}={}){
 const fixture=row?.payload?.fixture,forecast=row?.payload?.forecast;
 const kickoff=Date.parse(row?.kickoff_at||fixture?.kickoff_at),generated=Date.parse(row?.generated_at);
 if(!Number.isFinite(generated)||!Number.isFinite(kickoff)||generated>=kickoff)return {ok:false,reason:'NOT_PREMATCH',createsPicks:false};
 if(asOf!==undefined&&(!Number.isFinite(Date.parse(asOf))||generated>Date.parse(asOf)))return {ok:false,reason:'FORECAST_NOT_YET_AVAILABLE',createsPicks:false};
 const h=forecast?.expectedGoals?.home,a=forecast?.expectedGoals?.away;
 if(!finite(h)||!finite(a)||h<=0||a<=0)return {ok:false,reason:'EXPECTED_GOALS_UNAVAILABLE',createsPicks:false};
 const fixtureId=Number(row.fixture_id??fixture?.fixture_id);
 if(!Number.isSafeInteger(fixtureId)||fixtureId<=0)return {ok:false,reason:'INVALID_FIXTURE_ID',createsPicks:false};
 const actualSeed=seed??fixtureId,simulation=simulateMatch({homeExpectedGoals:h,awayExpectedGoals:a,seed:actualSeed,simulations,logRateSd});
 const observations=(row.payload?.quotes||[]).filter(q=>q.observedAt&&Date.parse(q.observedAt)<=generated&&q.providerUpdatedAt&&Date.parse(q.providerUpdatedAt)<=Date.parse(q.observedAt));
 const marketComparisons=comparePricedMarkets(simulation,observations).map(x=>({...x,preMatch:true}));
 return {ok:true,version:SHADOW_ADAPTER_VERSION,sourceVersion:SIMULATION_VERSION,fixtureId,generatedAt:row.generated_at,kickoffAt:row.kickoff_at,modelId:row.model_id,datasetHash:row.payload?.datasetHash||null,mode:'SHADOW',createsPicks:false,promotionAllowed:false,qualityHold:Boolean(forecast.qualityHold),rejectionReasons:forecast.rejectionReasons||[],simulation,marketComparisons};
}
function scoreShadowOutcome(shadow,{homeGoals,awayGoals,resultAvailableAt}={}){
 if(!shadow?.ok||!Number.isInteger(homeGoals)||!Number.isInteger(awayGoals)||homeGoals<0||awayGoals<0||!Number.isFinite(Date.parse(resultAvailableAt))||Date.parse(resultAvailableAt)<=Date.parse(shadow.kickoffAt))return {ok:false,reason:'INVALID_OR_UNAVAILABLE_SETTLEMENT'};
 const outcome=homeGoals>awayGoals?'HOME':homeGoals<awayGoals?'AWAY':'DRAW',p=shadow.simulation.markets.MATCH_RESULT[outcome];
 const markets=shadow.marketComparisons.map(c=>{const win=c.market==='MATCH_RESULT'?c.selection===outcome:c.market==='BTTS'?(c.selection==='YES')===(homeGoals>0&&awayGoals>0):c.market==='TOTAL_GOALS'?c.selection.startsWith('OVER_')?(homeGoals+awayGoals)>Number(c.selection.match(/_(\d+)_(\d+)$/)?.slice(1).join('.')||NaN):(homeGoals+awayGoals)<Number(c.selection.match(/_(\d+)_(\d+)$/)?.slice(1).join('.')||NaN):null;return {...c,won:win};});
 return {ok:true,fixtureId:shadow.fixtureId,marketOutcome:outcome,homeGoals,awayGoals,brier1x2:Object.entries(shadow.simulation.markets.MATCH_RESULT).reduce((s,[key,v])=>s+(v-(key===outcome?1:0))**2,0),logLoss1x2:-Math.log(Math.max(p,1e-12)),markets};
}

const ENGINE2_DISCOVERY_VERSION='engine2-market-discovery-v1';
const canonical=s=>String(s||'').trim().toUpperCase().replace(/(\d)\.(\d)/g,'$1_$2');
function discoverEngine2Markets(shadow,{minEV=.03,maxQuoteAgeMinutes=30,minProbability=.35}={}){
 if(!shadow?.ok||shadow?.mode!=='SHADOW'||!shadow.simulation||!Number.isFinite(Date.parse(shadow.generatedAt))||!Number.isFinite(Date.parse(shadow.kickoffAt)))return {version:ENGINE2_DISCOVERY_VERSION,status:'BLOCKED',reason:'INVALID_SHADOW_FORECAST',candidates:[],createsPicks:false,promotionAllowed:false};
 const generated=Date.parse(shadow.generatedAt),kickoff=Date.parse(shadow.kickoffAt);
 if(!(generated<kickoff)||shadow.qualityHold)return {version:ENGINE2_DISCOVERY_VERSION,status:'BLOCKED',reason:shadow.qualityHold?'INDEPENDENT_QUALITY_HOLD':'NOT_PREMATCH',candidates:[],createsPicks:false,promotionAllowed:false};
 const candidates=[],rejected={};
 for(const q of shadow.marketComparisons||[]){
  const observed=Date.parse(q.observedAt),p=shadow.simulation.markets?.[q.market]?.[canonical(q.selection)];
  let reason=null;
  if(q.bookmaker!=='Bet365'||!Number.isFinite(q.odds)||q.odds<=1)reason='EXACT_BET365_QUOTE_REQUIRED';
  else if(!Number.isFinite(observed)||observed>generated||generated-observed>maxQuoteAgeMinutes*60000||observed>=kickoff)reason='QUOTE_NOT_FRESH_PREMATCH';
  else if(!Number.isFinite(p)||p<=0||p>=1)reason='MARKET_PROBABILITY_UNAVAILABLE';
  else if(p<minProbability)reason='PROBABILITY_BELOW_FLOOR';
  else if(p*q.odds-1<minEV)reason='NO_POSITIVE_VALUE';
  if(reason){rejected[reason]=(rejected[reason]||0)+1;continue;}
  candidates.push({fixtureId:shadow.fixtureId,market:q.market,selection:canonical(q.selection),odds:q.odds,probability:p,estimatedEV:p*q.odds-1,observedAt:q.observedAt,sourceGeneratedAt:shadow.generatedAt,mode:'SHADOW',createsPicks:false});
 }
 candidates.sort((a,b)=>b.estimatedEV-a.estimatedEV||b.probability-a.probability);
 return {version:ENGINE2_DISCOVERY_VERSION,status:candidates.length?'CANDIDATES':'NO_ELIGIBLE_MARKET',candidates:candidates.slice(0,12),rejected,considered:(shadow.marketComparisons||[]).length,createsPicks:false,promotionAllowed:false};
}

return {SIMULATION_VERSION,SHADOW_ADAPTER_VERSION,simulateMatch,comparePricedMarkets,evaluateShadowForecast,scoreShadowOutcome,discoverEngine2Markets};
})();
// Engine 2.0 read-only shadow sweep. No provider calls and no publication writes.
async function runEngine2ShadowSweepV1(env) {
  const now=Date.now(), low=new Date(now+5*60000).toISOString(), high=new Date(now+48*3600000).toISOString();
  try {
    const metadata=arr2(await sb(env,'two45_goal_forecasts_v3?kickoff_at=gt.'+encodeURIComponent(low)+'&kickoff_at=lt.'+encodeURIComponent(high)+'&generated_at=gte.'+encodeURIComponent(new Date(now-45*60000).toISOString())+'&select=fixture_id,model_id,generated_at,kickoff_at&order=generated_at.desc&limit=36',{timeoutMs:3500}));
    const distinct=new Map();for(const row of metadata)if(!distinct.has(String(row.fixture_id)))distinct.set(String(row.fixture_id),row);
    const completed=[],failures=[];let evaluated=0;
    for(const row of distinct.values()) {
      if(evaluated>=2)break;
      const key='engine2-shadow:v1:'+row.fixture_id;
      try {
        const existing=(await getFeedSnapshot(env,key))?.payload;
        if(existing?.sourceGeneratedAt===row.generated_at&&existing?.modelId===row.model_id&&existing?.discovery?.version==='engine2-market-discovery-v1')continue;
        const forecasts=arr2(await sb(env,'two45_goal_forecasts_v3?fixture_id=eq.'+encodeURIComponent(row.fixture_id)+'&model_id=eq.'+encodeURIComponent(row.model_id)+'&generated_at=eq.'+encodeURIComponent(row.generated_at)+'&select=fixture_id,model_id,generated_at,kickoff_at,payload&limit=1',{timeoutMs:3500}));
        if(!forecasts.length)continue;
        const evaluation=engine2ShadowV1.evaluateShadowForecast(forecasts[0],{seed:Number(row.fixture_id),simulations:3000,asOf:new Date(now).toISOString()});
        const summary=evaluation.ok?{ok:true,version:evaluation.version,mode:'SHADOW',createsPicks:false,promotionAllowed:false,
          fixtureId:evaluation.fixtureId,sourceGeneratedAt:evaluation.generatedAt,modelId:evaluation.modelId,datasetHash:evaluation.datasetHash,kickoffAt:evaluation.kickoffAt,
          qualityHold:evaluation.qualityHold,rejectionReasons:evaluation.rejectionReasons,simulationVersion:evaluation.simulation.version,
          simulations:evaluation.simulation.simulations,inputs:evaluation.simulation.inputs,markets:evaluation.simulation.markets,
          topScorelines:evaluation.simulation.topScorelines,marketComparisons:evaluation.marketComparisons.slice(0,30),discovery:engine2ShadowV1.discoverEngine2Markets(evaluation)}
          :{ok:false,reason:evaluation.reason,fixtureId:row.fixture_id,modelId:row.model_id,sourceGeneratedAt:row.generated_at,mode:'SHADOW',createsPicks:false};
        await saveFeedSnapshot(env,key,summary,14*86400);
        completed.push({fixtureId:row.fixture_id,ok:summary.ok,reason:summary.reason||null});evaluated++;
      }catch(e){failures.push({fixtureId:row.fixture_id,error:safeRefreshError(e)});}
    }
    return {ok:failures.length===0,mode:'SHADOW',eligibleRecent:distinct.size,processed:completed.length,completed,failures};
  }catch(e){return {ok:false,mode:'SHADOW',processed:0,error:safeRefreshError(e)};}
}

// Engine 2 settlement: immutable pre-match snapshot + provider-observed final result only.
// Never converts retrospective scores into picks or changes official record.
async function runEngine2SettlementV1(env) {
 try {
  const now=Date.now(),cutoff=new Date(now-2*3600000).toISOString(),start=new Date(now-14*86400000).toISOString();
  const rows=arr2(await sb(env,'two45_feed_snapshots?snapshot_key=like.engine2-shadow:v1:*&refreshed_at=gte.'+encodeURIComponent(start)+'&select=snapshot_key,payload&order=refreshed_at.desc&limit=80',{timeoutMs:5000}));
  const pending=rows.filter(x=>x.payload?.ok&&Date.parse(x.payload.kickoffAt)<Date.parse(cutoff)).slice(0,8);
  if(!pending.length)return {ok:true,mode:'SHADOW',eligible:0,settled:0};
  const ids=pending.map(x=>Number(x.payload.fixtureId)).filter(Number.isSafeInteger).join(',');
  if(!ids)return {ok:true,mode:'SHADOW',eligible:0,settled:0};
  const finals=arr2(await sb(env,'two45_goal_results_v3?fixture_id=in.('+ids+')&final_status=eq.FT&select=fixture_id,home_goals,away_goals,result_available_at,kickoff_at&limit=20',{timeoutMs:4000}));
  const byId=new Map(finals.map(x=>[String(x.fixture_id),x])),settled=[];
  for(const item of pending) {
   const p=item.payload,result=byId.get(String(p.fixtureId));if(!result)continue;
   if(Date.parse(result.result_available_at)<=Date.parse(p.kickoffAt)||Date.parse(p.sourceGeneratedAt)>=Date.parse(p.kickoffAt)||Date.parse(result.result_available_at)>now)continue;
   const key='engine2-settled:v1:'+p.fixtureId+':'+encodeURIComponent(p.sourceGeneratedAt);
   if((await getFeedSnapshot(env,key).catch(()=>null))?.payload?.ok)continue;
   const g1=result.home_goals,g2=result.away_goals,actual=g1>g2?'HOME':g1<g2?'AWAY':'DRAW',prob=p.markets?.MATCH_RESULT;
   if(!prob||!Number.isInteger(g1)||!Number.isInteger(g2)||Object.values(prob).some(x=>!Number.isFinite(x)))continue;
   const brier=Object.entries(prob).reduce((sum,[name,value])=>sum+(value-(name===actual?1:0))**2,0);
   const logLoss=-Math.log(Math.max(1e-12,prob[actual]||0));
   const record={ok:true,version:'engine2-settlement-v1',mode:'SHADOW',createsPicks:false,promotionAllowed:false,
    fixtureId:p.fixtureId,sourceGeneratedAt:p.sourceGeneratedAt,modelId:p.modelId,kickoffAt:p.kickoffAt,
    resultAvailableAt:result.result_available_at,homeGoals:g1,awayGoals:g2,actualOutcome:actual,
    brier1x2:brier,logLoss1x2:logLoss,qualityHold:p.qualityHold,probabilities:prob};
   await saveFeedSnapshot(env,key,record,365*86400);
   settled.push({fixtureId:p.fixtureId,brier1x2:brier,logLoss1x2:logLoss});
  }
  return {ok:true,mode:'SHADOW',eligible:pending.length,finalsAvailable:finals.length,settled:settled.length,results:settled};
 }catch(e){return {ok:false,mode:'SHADOW',error:safeRefreshError(e)};}
}

// END GENERATED ENGINE2 SHADOW V1
// BEGIN FORECAST CORE RUNTIME V3
// The configuration is frozen from development scoring. Daily refreshes never retune on test results.
const GOAL_CORE_CONFIG_V3 = {teamPenalty:12,halfLifeDays:90,rho:0,seasonWeight:1};
const MIGRATION_PROTOCOL_V2 = 'independent-v2-migration-20261018';
function modelMigrationStatusV2() {
  return {state:'BLOCKED_VALIDATION',promotionAllowed:false,protocol:MIGRATION_PROTOCOL_V2,
    activeRawModel:MODEL_VERSION,candidateRawModel:forecastCoreV3.CORE_VERSION,activeSelection:'LEGACY_WITH_INDEPENDENT_REVIEW',candidateSelection:selectionV2.VERSION,
    independentReview:{version:modelReviewV1.REVIEW_VERSION,mode:'CONSERVATIVE_REVIEW',createsPicks:false,confidenceBoost:0},
    products:['ELITE_3','HIGH_CONVICTION','WEEKEND_LADDER'],recordScope:'official-publication-ledger-v2',
    blockers:['HISTORICAL_PAIRED_BRIER_AND_LOG_LOSS_FAILED','UNTOUCHED_PROSPECTIVE_HOLDOUT_REQUIRED','EXACT_PRICE_SELECTION_ROI_NOT_VALIDATED','PUBLIC_RECORD_RESULT_SOURCE_REQUIRES_CUTOVER'],
    requirements:{settledSelections:200,fixtureDays:14,perMarketSelections:60,decisionMinutesBeforeKickoff:60,quoteMaxAgeMinutes:30},
    missingXGPolicy:'Observed xG is unavailable and excluded. Goal expectations are learned from timestamped scores and season features.',
    cutover:'No runtime activation flag. A validated release must replace all product publishers together, retire legacy writes and retain the publication ledger and historical locks.'};
}

// Verified historical-score backfill: one provider request per 15-minute slot.
// Results become available for training only when observed; never backdate labels.
function goalBackfillResultV120(row,nowIso) {
 const f=row?.fixture,l=row?.league,h=row?.teams?.home,a=row?.teams?.away,g=row?.goals;
 const kickoff=Date.parse(f?.date),now=Date.parse(nowIso),hg=g?.home==null?NaN:Number(g.home),ag=g?.away==null?NaN:Number(g.away);
 if(!Number.isSafeInteger(Number(f?.id))||Number(f.id)<=0||f?.status?.short!=='FT')return null;
 if(!Number.isFinite(kickoff)||kickoff>=now||now-kickoff>365*86400000)return null;
 if(!Number.isSafeInteger(hg)||!Number.isSafeInteger(ag)||hg<0||ag<0||hg>30||ag>30)return null;
 if(!l?.id||!l?.season||!h?.id||!a?.id||h.id===a.id)return null;
 return {fixture_id:Number(f.id),league_id:String(l.id),season:String(l.season),
  home_id:String(h.id),away_id:String(a.id),home_name:String(h.name||''),away_name:String(a.name||''),
  competition:String(l.name||''),country:String(l.country||''),kickoff_at:new Date(kickoff).toISOString(),
  home_goals:hg,away_goals:ag,result_available_at:nowIso,final_status:'FT',
  source_key:'provider-team-history:'+String(h.id)+':'+String(a.id)};
}

async function backfillGoalHistoryV120(env) {
 const now=new Date(),slot=Math.floor(now.getTime()/300000);
 if(now.getUTCMinutes()%5!==2)return {skipped:true,reason:'5_MINUTE_CADENCE'};
 if(providerQuietWindow())return {skipped:true,reason:'PROVIDER_QUIET_WINDOW'};
 const jobs=arr2(await sb(env,'two45_feature_jobs?kickoff_at=gt.'+encodeURIComponent(now.toISOString())+
  '&kickoff_at=lt.'+encodeURIComponent(new Date(now.getTime()+48*3600000).toISOString())+
  '&select=fixture_id,provider_league_id,season,home_team_id,away_team_id,competition,kickoff_at&order=kickoff_at.asc&limit=90',{timeoutMs:3500}));
 const candidates=jobs.filter(j=>competitionTierV21(j.competition,j.provider_league_id)<=2).flatMap(j=>[j.home_team_id,j.away_team_id]).filter(Boolean);
 const unique=[...new Set(candidates.map(String))];
 if(!unique.length)return {skipped:true,reason:'NO_ELIGIBLE_UPCOMING_TEAMS'};
 // Never compete with match analysis: only one missing team per invocation.
 const rotate=Math.floor(slot/12)%Math.ceil(unique.length/30),ordered=unique.slice(rotate*30).concat(unique.slice(0,rotate*30));
 for(const team of ordered.slice(0,30)) {
  const historyKey='goal-history-backfill:v120:'+team;
  const marker=(await getFeedSnapshot(env,historyKey).catch(()=>null))?.payload;
  const markerAt=Date.parse(marker?.observedAt);
  if(Number.isFinite(markerAt)&&markerAt<=now.getTime()&&now.getTime()-markerAt<24*3600000)continue;
  const present=arr2(await sb(env,'two45_goal_results_v3?or=(home_id.eq.'+encodeURIComponent(team)+',away_id.eq.'+encodeURIComponent(team)+')&select=fixture_id&limit=30',{timeoutMs:3500}));
  if(present.length>=24)continue;
  const response=await providerFetchV18(env,'fixtures',{team,last:'60'});
  const observedAt=new Date().toISOString();
  const rows=arr2(response?.response).map(r=>goalBackfillResultV120(r,observedAt)).filter(Boolean);
  if(rows.length)await sb(env,'two45_goal_results_v3?on_conflict=fixture_id',{method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',timeoutMs:9000,body:JSON.stringify(rows)});
  await saveFeedSnapshot(env,historyKey,{slot,team,observedAt,returned:arr2(response?.response).length,valid:rows.length,insertAttempted:rows.length},7*86400);
  return {ok:true,team,existingHistory:present.length,validFinals:rows.length,observedAt,trainingAvailableAfter:observedAt};
 }
 return {skipped:true,reason:'NO_UNDERCOVERED_TEAM'};
}

async function runGoalCoreSweepV3(env) {
  // Raw inference must not depend on legacy job completion or provider calls.
  const started=Date.now(),low=new Date(started+5*60000).toISOString(),high=new Date(started+48*3600000).toISOString();
  try {
    const jobs=arr2(await sb(env,'two45_feature_jobs?kickoff_at=gt.'+encodeURIComponent(low)+'&kickoff_at=lt.'+encodeURIComponent(high)+
      '&select=fixture_id,provider_league_id,season,home_team_id,away_team_id,home_team,away_team,competition,kickoff_at&order=kickoff_at.asc,fixture_id.asc&limit=60',{timeoutMs:3000}));
    if(!jobs.length)return {ok:true,processed:0,reason:'NO_PREMATCH_FIXTURES'};
    const ids=jobs.map(j=>Number(j.fixture_id)).filter(Number.isFinite).join(',');
    let priorityError=null;
    const [recentRows,priorityRows,trainingSnapshot]=await Promise.all([
      sb(env,'two45_goal_forecasts_v3?fixture_id=in.('+ids+')&generated_at=gte.'+encodeURIComponent(new Date(started-30*60000).toISOString())+'&select=fixture_id,model_id&limit=1000',{timeoutMs:3000}),
      sb(env,'two45_analysis_state?fixture_id=in.('+ids+')&model_version=eq.'+encodeURIComponent(MODEL_VERSION)+'&decision=eq.PICK&status=eq.COMPLETE&select=fixture_id&limit=120',{timeoutMs:2500}).catch(e=>{priorityError=safeRefreshError(e);return [];}),
      getFeedSnapshot(env,'forecast-core-v3:training-status').catch(()=>null)
    ]);
    const recent=arr2(recentRows),priority=new Set(arr2(priorityRows).map(r=>String(r.fixture_id)));
    jobs.sort((a,b)=>Number(priority.has(String(b.fixture_id)))-Number(priority.has(String(a.fixture_id))) || Date.parse(a.kickoff_at)-Date.parse(b.kickoff_at));
    const activeModelId=trainingSnapshot?.payload?.state==='READY'?trainingSnapshot.payload.modelId:null;
    const seen=new Set(recent.filter(r=>!activeModelId||String(r.model_id)===String(activeModelId)).map(r=>String(r.fixture_id))),results=[],daily=new Map();
    for(const job of jobs.filter(j=>!seen.has(String(j.fixture_id))).slice(0,2)) {
      if(Date.now()-started>10000)break;
      try {
        const date=dateOfV19(job.kickoff_at);
        if(!daily.has(date))daily.set(date,await getFeedSnapshot(env,oddsKey(date)).catch(()=>null));
        const direct=await getFeedSnapshot(env,'fixture-odds:'+job.fixture_id).catch(()=>null);
        const payloads=[daily.get(date)?.payload,direct?.payload].filter(Boolean);
        const rows=payloads.flatMap(p=>arr2(p.response)).filter(r=>String(r.fixture?.id)===String(job.fixture_id));
        // Choose the latest retained fixture observation, never an aggregate refresh.
        rows.sort((a,b)=>(Date.parse(b.observedAt)||0)-(Date.parse(a.observedAt)||0));
        const groups=oddsMarketsFromSnapshot({response:rows.slice(0,1)},job.fixture_id);
        const quotes=groups.flatMap(g=>arr2(g.outcomes).map(q=>({fixtureId:job.fixture_id,market:g.market,selection:q.selection,bookmaker:g.bookmaker,odds:q.odds,observedAt:g.observedAt,providerUpdatedAt:g.providerUpdatedAt,rawMarket:g.rawMarket,rawSelection:q.rawSelection||null})));
        const old=await existingForecast(env,job.fixture_id).catch(()=>null);
        const legacy=old&&Date.parse(old.created_at)<=started?{modelVersion:old.model_version,expectedGoals:old.feature_snapshot?.expectedGoals,probabilities:old.probability_snapshot||{}}:{};
        const decision=old&&Date.parse(old.created_at)<=started?{decision:old.decision,market:old.market,selection:old.selection}:null;
        results.push({fixtureId:job.fixture_id,...await recordGoalForecastV3(env,job,legacy,quotes,decision)});
      }catch(e){results.push({fixtureId:job.fixture_id,error:safeRefreshError(e)});}
    }
    return {ok:results.every(r=>!r.error),processed:results.length,eligibleJobs:jobs.length,priorityFixtures:priority.size,priorityError,results};
  }catch(e){return {ok:false,processed:0,error:safeRefreshError(e)};}
}

async function refreshGoalCoreV3(env) {
  const now=new Date(),asOf=now.toISOString(),date=asOf.slice(0,10),statusKey='forecast-core-v3:training-status';
  const status=(await getFeedSnapshot(env,statusKey).catch(()=>null))?.payload;
  if(status?.state==='RUNNING'&&Date.now()-Date.parse(status.startedAt)<15*60000)return {skipped:true,reason:'TRAINING_IN_PROGRESS'};
  if(Date.parse(status?.retryAfter)>Date.now())return {skipped:true,reason:'TRAINING_RETRY_BACKOFF'};
  try {
    const existing=arr2(await sb(env,'two45_goal_model_artifacts_v3?model_version=eq.'+encodeURIComponent(forecastCoreV3.CORE_VERSION)+'&select=id,trained_before,dataset_hash&order=trained_before.desc&limit=1'))[0];
    const recent=existing?.trained_before&&Date.now()-Date.parse(existing.trained_before)<90*60000;
    if(recent) {
      const result={state:'READY',date,modelId:existing.id,trainedBefore:existing.trained_before,mode:'SHADOW',datasetHash:existing.dataset_hash,reason:'RECENT_MODEL_ARTIFACT'};
      await saveFeedSnapshot(env,statusKey,result,365*86400);return {skipped:true,...result};
    }
    // Historical backfill may finish after midnight training. Check the as-of corpus fingerprint
    // before deciding that today's immutable artifact is sufficient.
    const hash=await sb(env,'rpc/two45_goal_dataset_hash_v3',{method:'POST',body:JSON.stringify({p_as_of:asOf}),timeoutMs:15000});
    if(!/^[a-f0-9]{64}$/.test(String(hash)))throw Error('Training dataset hash unavailable');
    if(existing?.dataset_hash===hash) {
      const result={state:'READY',date,modelId:existing.id,trainedBefore:existing.trained_before,mode:'SHADOW',datasetHash:hash,reason:'TRAINING_CORPUS_UNCHANGED',checkedAt:asOf};
      await saveFeedSnapshot(env,statusKey,result,365*86400);return {skipped:true,...result};
    }
    if(status?.checkedAt&&Date.now()-Date.parse(status.checkedAt)<30*60000)return {skipped:true,reason:'TRAINING_RECHECK_COOLDOWN'};
    await saveFeedSnapshot(env,statusKey,{state:'RUNNING',date,startedAt:asOf,mode:'SHADOW',previousModelId:existing?.id||null},365*86400);
    const data=await sb(env,'rpc/two45_goal_training_data_v3',{method:'POST',body:JSON.stringify({p_as_of:asOf}),timeoutMs:15000});
    if(!data||data.truncated)throw Error('Training corpus unavailable or exceeded declared bounds');
    const inputs=forecastCoreV3.attachSeasonHistory(data.fixtures,data.features);
    const parameters=forecastCoreV3.fitGoalModel(inputs,asOf,GOAL_CORE_CONFIG_V3);
    if(parameters.trainingFixtures<100||parameters.fit.lastStep>.001)throw Error('Insufficient training data or optimizer did not converge');
    parameters.calibration=await sb(env,'rpc/two45_goal_calibration_v3',{method:'POST',body:JSON.stringify({p_as_of:asOf})});
    // Never overwrite a previously trained artifact: every distinct as-of corpus has its own key.
    const saved=arr2(await sb(env,'two45_goal_model_artifacts_v3?on_conflict=artifact_key',{method:'POST',prefer:'resolution=ignore-duplicates,return=representation',timeoutMs:15000,
      body:JSON.stringify({artifact_key:forecastCoreV3.CORE_VERSION+':'+date+':'+hash,model_version:forecastCoreV3.CORE_VERSION,trained_before:asOf,dataset_hash:hash,parameters,
      validation:{promotionAllowed:false,phase:'PROSPECTIVE_SHADOW',historicalGate:'FAILED_PAIRED_BRIER_AND_LOG_LOSS',configuration:'development-frozen; no automatic retuning'}})}))[0];
    if(!saved?.id)throw Error('New training artifact not persisted');
    const result={state:'READY',date,modelId:saved.id,trainedBefore:asOf,trainingFixtures:parameters.trainingFixtures,mode:'SHADOW',datasetHash:hash,checkedAt:asOf,reason:'UPDATED_HISTORY_CORPUS'};
    await saveFeedSnapshot(env,statusKey,result,365*86400);return result;
  }catch(e) {
    const result={state:'FAILED',date,error:safeRefreshError(e),retryAfter:new Date(Date.now()+3600000).toISOString(),mode:'SHADOW'};
    await saveFeedSnapshot(env,statusKey,result,365*86400).catch(()=>null);return result;
  }
}

async function recordGoalForecastV3(env,job,legacyAnalysis,quotes,legacyDecision=null) {
  const now=Date.now(),asOf=new Date(now).toISOString();
  if(!(now<Date.parse(job.kickoff_at))||legacyAnalysis.live)return {mode:'SHADOW',skipped:true,reason:'NOT_PREMATCH'};
  const contextRow=await sb(env,'rpc/two45_goal_context_v3',{method:'POST',timeoutMs:4000,body:JSON.stringify({p_league:String(job.provider_league_id),p_season:String(job.season),p_home:String(job.home_team_id),p_away:String(job.away_team_id),p_as_of:asOf,p_kickoff:job.kickoff_at})});
  if(!contextRow?.model)return {mode:'SHADOW',skipped:true,reason:'MODEL_ARTIFACT_UNAVAILABLE'};
  const fixture={fixture_id:job.fixture_id,league_id:String(job.provider_league_id),season:String(job.season),home_id:String(job.home_team_id),away_id:String(job.away_team_id),kickoff_at:job.kickoff_at};
  fixture.home_features=forecastCoreV3.seasonFeatures(contextRow.home_feature,fixture,'home',asOf);
  fixture.away_features=forecastCoreV3.seasonFeatures(contextRow.away_feature,fixture,'away',asOf);
  const prediction=forecastCoreV3.predictGoals(contextRow.model,fixture,asOf);
  const {scoreCells,...forecast}=prediction; // Reconstruct cells from immutable artifact + fixture inputs.
  const featureTimes=[fixture.home_features?.observedAt,fixture.away_features?.observedAt].filter(Boolean).map(Date.parse);
  const context={fixtureId:job.fixture_id,modelVersion:forecastCoreV3.CORE_VERSION,now,kickoff:job.kickoff_at,tier:competitionTierV21(job.competition,job.provider_league_id),requireProviderQuoteTime:true,
    sampleSize:Math.min(Math.max(prediction.evidence.homeEffectiveMatches,prediction.evidence.homeSeasonMatches),Math.max(prediction.evidence.awayEffectiveMatches,prediction.evidence.awaySeasonMatches)),
    featureAsOf:featureTimes.length?new Date(Math.min(...featureTimes)).toISOString():contextRow.model.trainedBefore};
  const candidates=selectionV2.generateCandidates(forecast,quotes,contextRow.model.calibration,context);
  const target=quotes.filter(q=>q.market===legacyDecision?.market && ticketSelectionKeyV78(q.selection)===ticketSelectionKeyV78(legacyDecision?.selection) && String(q.bookmaker).replace(/[^a-z0-9]/gi,'').toLowerCase()==='bet365');
  const quote=new Set(target.map(q=>Number(q.odds))).size===1?target[0]:null;
  const comparison=legacyDecision?.decision==='PICK'?modelReviewV1.compareModelPick({fixtureId:job.fixture_id,kickoff:job.kickoff_at,market:legacyDecision.market,selection:legacyDecision.selection,
    probability:legacyAnalysis.probabilities?.[legacyDecision.market]?.[ticketSelectionKeyV78(legacyDecision.selection)],sportsbookOdds:quote?.odds,priceObservedAt:quote?.observedAt,providerUpdatedAt:quote?.providerUpdatedAt},
    {fixture_id:job.fixture_id,model_id:contextRow.model_id,generated_at:asOf,kickoff_at:job.kickoff_at,forecast,context,datasetHash:contextRow.dataset_hash},now):{version:modelReviewV1.REVIEW_VERSION,status:'NO_LEGACY_PICK',hold:false};
  await sb(env,'two45_goal_forecasts_v3',{method:'POST',prefer:'return=minimal',timeoutMs:4000,body:JSON.stringify({fixture_id:job.fixture_id,model_id:contextRow.model_id,generated_at:asOf,kickoff_at:job.kickoff_at,
    payload:{mode:'SHADOW',promotionAllowed:false,validationProtocol:MIGRATION_PROTOCOL_V2,datasetHash:contextRow.dataset_hash,fixture,forecast,context,quotes,candidates,primary:selectionV2.primaryPicks(candidates),comparison,legacy:{modelVersion:legacyAnalysis.modelVersion,expectedGoals:legacyAnalysis.expectedGoals,probabilities:legacyAnalysis.probabilities,decision:legacyDecision}}})});
  return {mode:'SHADOW',modelId:contextRow.model_id,version:forecastCoreV3.CORE_VERSION,expectedGoals:forecast.expectedGoals,rejectionReasons:forecast.rejectionReasons,promotionAllowed:false};
}

// END FORECAST CORE RUNTIME V3
// BEGIN GENERATED SELECTION V2
var selectionV2 = (() => {
// Independent probabilities enter here before prices. Prices never generate forecasts.
const VERSION = 'two45-independent-v2-shadow';
const canonical = s => String(s || '').toUpperCase().replace(/(\d)\.(\d)/g, '$1_$2');
const unit = x => x == null || x === '' || !Number.isFinite(Number(x)) ? null : Number(x) > 1 ? Number(x) / 100 : Number(x);
const clip = p => Math.max(.001, Math.min(.999, p));

function noVigProbability(quote, quotes) {
  // Normalize only exhaustive outcomes at the SAME line, never all totals lines.
  const s=canonical(quote.selection),m=quote.market;
  let wanted,multiplier=1;
  if(m==='MATCH_RESULT') wanted=['HOME','DRAW','AWAY'];
  else if(m==='BTTS') wanted=['YES','NO'];
  else if(m==='DOUBLE_CHANCE') {wanted=['HOME_OR_DRAW','DRAW_OR_AWAY','HOME_OR_AWAY'];multiplier=2;}
  else if(['TOTAL_GOALS','HOME_TEAM_GOALS','AWAY_TEAM_GOALS'].includes(m)) {
    const match=s.match(/^(OVER|UNDER)_(\d+(?:_\d+)?)$/);
    if(match) wanted=['OVER_'+match[2],'UNDER_'+match[2]];
  } else if(m==='HANDICAP') {
    const match=s.match(/^(HOME|AWAY)_(PLUS|MINUS)_(\d+(?:_\d+)?)$/);
    if(match) wanted=[s,(match[1]==='HOME'?'AWAY':'HOME')+'_'+(match[2]==='PLUS'?'MINUS':'PLUS')+'_'+match[3]];
  }
  if(!wanted || !wanted.includes(s)) return null;
  const odds=[];
  for(const selection of wanted) {
    const matches=quotes.filter(q=>String(q.fixtureId)===String(quote.fixtureId) && q.market===m && q.bookmaker===quote.bookmaker && canonical(q.selection)===selection && Number(q.odds)>1);
    const prices=[...new Set(matches.map(q=>Number(q.odds)))];
    if(prices.length!==1) return null;
    odds.push(prices[0]);
  }
  const p=(1/Number(quote.odds))/odds.reduce((n,o)=>n+1/o,0)*multiplier;
  return p>0 && p<1 ? p : null;
}

function fitCalibration(rows, asOf, minSample = 60) {
  // Separate market + line + model version; never borrow outcomes from the holdout.
  const groups = {};
  const seen = new Set();
  for (const r of [...rows].sort((a,b) => Date.parse(a.created_at)-Date.parse(b.created_at))) {
    if (!['WIN','LOSS'].includes(r.outcome) || !(Date.parse(r.created_at) < Date.parse(r.kickoff_at)) || !(Date.parse(r.settled_at) < Date.parse(asOf))) continue;
    const id = [r.fixture_id,r.market,canonical(r.selection),r.model_version].join('|');
    if (seen.has(id)) continue;
    seen.add(id);
    const p = unit(r.probability);
    if (!(p > 0 && p < 1)) continue;
    const key = calibrationKey(r.market,r.selection,r.model_version);
    const g = groups[key] ||= {n:0,wins:0,sumP:0};
    g.n++; g.wins += +(r.outcome === 'WIN'); g.sumP += p;
  }
  for (const g of Object.values(groups)) {
    // Shrunk intercept calibration. Small cells remain ineligible for publication.
    g.offset = (g.wins-g.sumP)/(g.n+100);
    g.ready = g.n >= minSample;
    g.uncertainty = Math.sqrt(.25/(g.n+1));
  }
  return {version:VERSION, trainedBefore:asOf, minSample, groups};
}
function calibrationKey(market,selection,version) {
  return [version,market,canonical(selection)].join('|');
}

function generateCandidates(analysis, quotes, calibration, context) {
  const candidates = [];
  for (const [market, outcomes] of Object.entries(analysis.probabilities || {})) {
    for (const [selection, raw] of Object.entries(outcomes)) {
      const rawProbability = unit(raw), key = canonical(selection);
      const cell = calibration?.groups?.[calibrationKey(market,key,context.modelVersion)];
      const probability = rawProbability == null ? null : clip(rawProbability + (cell?.offset || 0));
      const matches = quotes.filter(q => String(q.fixtureId) === String(context.fixtureId) && q.market === market && canonical(q.selection) === key && String(q.bookmaker).replace(/[^a-z0-9]/gi,'').toLowerCase() === 'bet365');
      const fresh = q => Number(q.odds)>1 && Date.parse(q.observedAt)<=context.now && context.now-Date.parse(q.observedAt)<=30*60*1000 && Date.parse(q.observedAt)<Date.parse(context.kickoff)
        && (!context.requireProviderQuoteTime || (Date.parse(q.providerUpdatedAt)<=Date.parse(q.observedAt) && context.now-Date.parse(q.providerUpdatedAt)<=30*60*1000));
      const valid = matches.filter(fresh);
      const prices = new Set(valid.map(q => Number(q.odds).toFixed(4)));
      const quote = prices.size === 1 ? valid[0] : null;
      const contemporaneous=quotes.filter(fresh);
      const marketProbability=quote ? noVigProbability(quote,contemporaneous) : null;
      const odds = quote ? Number(quote.odds) : null;
      const reasons = [];
      if (!(rawProbability>0 && rawProbability<1)) reasons.push('INVALID_PROBABILITY');
      if (!cell?.ready || !(Date.parse(calibration?.trainedBefore)<context.now)) reasons.push('CALIBRATION_UNVALIDATED');
      if (cell && (!(Number.isFinite(cell.offset) && Math.abs(cell.offset)<1) || !(cell.uncertainty>0 && cell.uncertainty<=.5) || !(cell.n>=60))) reasons.push('INVALID_CALIBRATION_EVIDENCE');
      if (!quote) reasons.push(prices.size>1 ? 'AMBIGUOUS_PRICE' : 'MISSING_OR_STALE_EXACT_BET365');
      if (![1,2].includes(context.tier)) reasons.push('COMPETITION_TIER');
      if (!(unit(analysis.dataQuality)>=.75)) reasons.push('DATA_QUALITY');
      if (!(Date.parse(context.featureAsOf)<context.now && context.now-Date.parse(context.featureAsOf)<=24*3600000)) reasons.push('FEATURE_FRESHNESS');
      if (!(context.now<Date.parse(context.kickoff))) reasons.push('KICKOFF_PASSED');
      if (!(context.sampleSize>=8)) reasons.push('FEATURE_SAMPLE');
      if (analysis.qualityHold || context.contradiction) reasons.push('UNRESOLVED_EVIDENCE');
      // Quarter/integer Asian lines need push-aware distributions; abstain until supported.
      if (market === 'HANDICAP' && !/_(0|1|2|3|4)_5$/.test(key)) reasons.push('UNSUPPORTED_SETTLEMENT');
      if (['TOTAL_GOALS','HOME_TEAM_GOALS','AWAY_TEAM_GOALS'].includes(market) && !/^(OVER|UNDER)_\d+_5$/.test(key)) reasons.push('UNSUPPORTED_SETTLEMENT');
      if (!['MATCH_RESULT','BTTS','TOTAL_GOALS','HOME_TEAM_GOALS','AWAY_TEAM_GOALS','HANDICAP','DOUBLE_CHANCE'].includes(market)) reasons.push('UNSUPPORTED_MARKET');
      const uncertainty = cell?.uncertainty ?? .15;
      const lowerProbability = probability == null ? null : Math.max(0, probability-1.64*uncertainty);
      const ev = odds && probability != null ? probability*odds-1 : null;
      const lowerEV = odds && lowerProbability != null ? lowerProbability*odds-1 : null;
      if (!(lowerEV>.02)) reasons.push('UNCERTAINTY_ADJUSTED_VALUE');
      if (odds && probability && probability-1/odds>.20) reasons.push('PRICE_MODEL_DISAGREEMENT');
      candidates.push({fixtureId:context.fixtureId,market,selection:key,rawProbability,probability,marketProbability,lowerProbability,uncertainty,odds,ev,lowerEV,tier:context.tier,quote,calibrationN:cell?.n||0,reasons,eligible:reasons.length===0});
    }
  }
  return candidates;
}
function primaryPicks(candidates) {
  const best = new Map();
  for (const c of candidates.filter(c=>c.eligible).sort((a,b)=>a.tier-b.tier || b.lowerEV-a.lowerEV || b.lowerProbability-a.lowerProbability || (a.market+a.selection).localeCompare(b.market+b.selection))) {
    if (!best.has(String(c.fixtureId))) best.set(String(c.fixtureId),c);
  }
  return [...best.values()];
}
function optimizeProduct(pool, {low,high,minLegs,maxLegs,reserved=[]}) {
  const excluded=new Set(reserved.map(String));
  const rows=primaryPicks(pool).filter(x=>!excluded.has(String(x.fixtureId)));
  let best=null;
  function visit(start,legs,odds,p) {
    if (legs.length>=minLegs && odds>=low && odds<=high) {
      const score=p*odds-1;
      if (score>0 && (!best || score>best.lowerEV)) best={legs:[...legs],odds,lowerProbability:p,lowerEV:score};
    }
    if (legs.length>=maxLegs || odds>high) return;
    for(let i=start;i<rows.length;i++) visit(i+1,[...legs,rows[i]],odds*rows[i].odds,p*rows[i].lowerProbability);
  }
  visit(0,[],1,1);
  return best || {legs:[],rejection:'NO_QUALIFIED_TARGET_COMBINATION'};
}
function scoreRows(rows,predict) {
  let n=0,brier=0,logLoss=0,profit=0,priced=0;
  for (const r of rows) {
    const p=predict(r);
    if (!['WIN','LOSS'].includes(r.outcome) || !(p>0 && p<1)) continue;
    const y=+(r.outcome==='WIN'); n++; brier+=(p-y)**2; logLoss-=y*Math.log(clip(p))+(1-y)*Math.log(1-clip(p));
    if (Number(r.sportsbook_odds)>1) {priced++;profit+=y ? Number(r.sportsbook_odds)-1 : -1;}
  }
  return {n,brier:n?brier/n:null,logLoss:n?logLoss/n:null,priced,profit,roi:priced?profit/priced:null};
}

return {VERSION,generateCandidates,primaryPicks,optimizeProduct,canonical,scoreRows};
})();
// END GENERATED SELECTION V2
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// elite-intelligence-v86.js
var ELITE_INTELLIGENCE_REVISION = "2026-10-04-decision-useful-view-v89";
var clamp = /* @__PURE__ */ __name((v, a, b) => Math.max(a, Math.min(b, v)), "clamp");
var num = /* @__PURE__ */ __name((v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d, "num");
var p01 = /* @__PURE__ */ __name((value) => {
  const n = Number(value);
  if (!Number.isFinite(n))
    return 0;
  return clamp(n > 1 ? n / 100 : n, 0, 1);
}, "p01");
function flattenProbabilityBoard(board = {}) {
  const out = [];
  for (const [market, selections] of Object.entries(board || {})) {
    for (const [selection, probability] of Object.entries(selections || {})) {
      out.push({ market, selection, probability: p01(probability) });
    }
  }
  return out.sort((a, b) => b.probability - a.probability);
}
__name(flattenProbabilityBoard, "flattenProbabilityBoard");
function researchSignalAdjustment(x) {
  const market = String(x?.market || "").toUpperCase();
  const selection = String(x?.selection || "").toUpperCase();
  if (market === "TOTAL_GOALS" && selection === "UNDER_4_5")
    return -0.35;
  if (market === "DOUBLE_CHANCE")
    return -0.2;
  if (market === "HANDICAP" && /PLUS_1_5/.test(selection))
    return -0.3;
  if (["HOME_TEAM_GOALS", "AWAY_TEAM_GOALS"].includes(market) && selection === "OVER_0_5")
    return -0.15;
  if (market === "MATCH_RESULT")
    return 0.12;
  if (market === "TOTAL_GOALS" && selection === "OVER_2_5")
    return 0.13;
  if (market === "TOTAL_GOALS" && selection === "OVER_3_5")
    return 0.1;
  if (market === "TOTAL_GOALS" && selection === "UNDER_3_5")
    return 0.05;
  if (market === "BTTS")
    return 0.1;
  if (market === "HANDICAP" && /MINUS/.test(selection))
    return 0.1;
  if (["HOME_TEAM_GOALS", "AWAY_TEAM_GOALS"].includes(market) && selection === "OVER_1_5")
    return 0.08;
  if (market === "TOTAL_GOALS" && selection === "OVER_1_5")
    return -0.03;
  return 0;
}
__name(researchSignalAdjustment, "researchSignalAdjustment");
function isSafetyOnlyView(x) {
  const market = String(x?.market || "").toUpperCase();
  const selection = String(x?.selection || "").toUpperCase();
  return market === "TOTAL_GOALS" && selection === "UNDER_4_5" || market === "DOUBLE_CHANCE" || market === "HANDICAP" && /PLUS_1_5/.test(selection) || ["HOME_TEAM_GOALS", "AWAY_TEAM_GOALS"].includes(market) && selection === "OVER_0_5";
}
__name(isSafetyOnlyView, "isSafetyOnlyView");
function selectResearchModelView(board = {}) {
  const rows = flattenProbabilityBoard(board);
  const meaningful = rows.filter((x) => x.probability >= 0.45).filter((x) => !isSafetyOnlyView(x)).map((x) => ({ ...x, researchScore: x.probability + researchSignalAdjustment(x) })).sort((a, b) => b.researchScore - a.researchScore || b.probability - a.probability);
  if (meaningful.length)
    return { ...meaningful[0], safetyFallback: false };
  const fallback = rows[0] || null;
  return fallback ? { ...fallback, researchScore: fallback.probability + researchSignalAdjustment(fallback), safetyFallback: true } : null;
}
__name(selectResearchModelView, "selectResearchModelView");
function reviewEliteFixture({
  fixtureId,
  kickoff,
  competition,
  competitionTier,
  home,
  away,
  analysisStatus,
  dataQuality,
  probabilityBoard,
  intelligence
}) {
  const tier = Math.max(1, Math.min(2, num(competitionTier, 2)));
  const dq = p01(dataQuality);
  const researchView = selectResearchModelView(probabilityBoard);
  const probability = researchView?.probability || 0;
  const homeIntel = intelligence?.home || {};
  const awayIntel = intelligence?.away || {};
  const homeSample = num(homeIntel.sampleSize, 0);
  const awaySample = num(awayIntel.sampleSize, 0);
  const sampleScore = clamp(Math.min(homeSample, awaySample) / 10, 0, 1);
  const tierReliability = tier === 1 ? 0.92 : 0.82;
  const signalFloor = tier === 1 ? 0.58 : 0.6;
  const evidenceScore = Math.round(100 * clamp(
    dq * 0.42 + probability * 0.3 + sampleScore * 0.16 + tierReliability * 0.12,
    0,
    1
  ));
  const warnings = [];
  if (dq < (tier === 1 ? 0.58 : 0.62))
    warnings.push("DATA_QUALITY_BELOW_ELITE_RESEARCH_GATE");
  if (Math.min(homeSample, awaySample) < 5)
    warnings.push("SMALL_RECENT_SAMPLE");
  if (Math.abs(num(homeIntel.formPPG, 1.5) - num(homeIntel.venuePPG, 1.5)) > 0.8)
    warnings.push("HOME_FORM_VENUE_SPLIT");
  if (Math.abs(num(awayIntel.formPPG, 1.5) - num(awayIntel.venuePPG, 1.5)) > 0.8)
    warnings.push("AWAY_FORM_VENUE_SPLIT");
  if (researchView?.market === "MATCH_RESULT") {
    const formGap = num(homeIntel.formPPG, 1.5) - num(awayIntel.formPPG, 1.5);
    if (researchView.selection === "HOME" && formGap < -0.45)
      warnings.push("MODEL_FORM_CONTRADICTION");
    if (researchView.selection === "AWAY" && formGap > 0.45)
      warnings.push("MODEL_FORM_CONTRADICTION");
  }
  if (researchView?.safetyFallback)
    warnings.push("SAFETY_ONLY_MODEL_VIEW");
  if (!researchView || probability < signalFloor)
    warnings.push("NO_MEANINGFUL_MODEL_SIGNAL");
  const critical = warnings.some((x) => [
    "DATA_QUALITY_BELOW_ELITE_RESEARCH_GATE",
    "MODEL_FORM_CONTRADICTION",
    "SAFETY_ONLY_MODEL_VIEW",
    "NO_MEANINGFUL_MODEL_SIGNAL"
  ].includes(x));
  const researchEligible = analysisStatus === "COMPLETE" && evidenceScore >= (tier === 1 ? 70 : 73) && probability >= signalFloor && !critical;
  return {
    fixtureId,
    kickoff,
    competition,
    competitionTier: tier,
    home,
    away,
    analysisStatus,
    evidenceScore,
    dataQuality: Math.round(dq * 1e3) / 10,
    strongestModelView: researchView ? {
      market: researchView.market,
      selection: researchView.selection,
      probability: Math.round(probability * 1e3) / 10,
      safetyFallback: Boolean(researchView.safetyFallback)
    } : null,
    warnings,
    researchEligible,
    researchStatus: researchEligible ? "PENDING_EXTERNAL_CONTEXT" : "NOT_QUEUED",
    researchQuestions: researchEligible ? [
      "Check injuries, suspensions and likely lineup changes.",
      "Check manager and team news for rotation or schedule-congestion risk.",
      "Check whether recent tactical and scoring trends support or contradict the model view.",
      "Record credible contrary evidence and reduce confidence when warranted."
    ] : []
  };
}
__name(reviewEliteFixture, "reviewEliteFixture");
function buildEliteSlateReview(fixtures = []) {
  const reviews = fixtures.map(reviewEliteFixture);
  const analyzed = reviews.filter((x) => x.analysisStatus === "COMPLETE").length;
  const remaining = Math.max(0, reviews.length - analyzed);
  const slateComplete = reviews.length > 0 && remaining === 0;
  const researchQueue = slateComplete ? reviews.filter((x) => x.researchEligible).sort((a, b) => b.evidenceScore - a.evidenceScore) : [];
  return {
    revision: ELITE_INTELLIGENCE_REVISION,
    stage: slateComplete ? "RESEARCH_READY" : "ANALYSIS_IN_PROGRESS",
    slateComplete,
    readinessRule: "All future Tier 1 and Tier 2 fixtures in scope must complete the current model before Elite research begins.",
    fixturesTotal: reviews.length,
    analyzed,
    remaining,
    researchEligible: researchQueue.length,
    externalResearchPolicy: "Outside sources are corroborating context only. Credible conflicting evidence must be recorded and can lower confidence.",
    researchQueue,
    reviews
  };
}
__name(buildEliteSlateReview, "buildEliteSlateReview");

// competition-tier-v87.js
const TIER1_IDS = new Set([1,2,4,5,9,15,39,61,78,135,140,536]);
const TIER2_IDS = new Set([3,13,40,45,48,66,71,72,73,81,88,94,136,137,141,143,144,253]);
const TIER3_IDS = new Set([179,203,262]);

const norm = value => String(value || "")
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[’']/g,"")
  .replace(/[^a-z0-9]+/g," ")
  .trim();

function competitionTierV87(value, leagueId) {
  const n = norm(value);
  const id = Number(leagueId);

  if (!n && !Number.isFinite(id)) return 4;

  // Explicit quality downgrades must run before any broad family or ID rule.
  if (/\bfriendl/.test(n)) return 3;
  if (/\bliga premier serie a\b/.test(n)) return 4;
  if (/\b2 frauen bundesliga\b/.test(n)) return 3;
  if (/\b(u17|u18|u19)\b/.test(n)) return 3;

  // Approved development competitions: useful for testing, but never Tier 1.
  if (/\b(u20|u21|u23)\b/.test(n) &&
      /\b(uefa|caf|afc|concacaf|world|championship|cup of nations|qualif)/.test(n)) return 2;

  // Known second divisions / strong secondary competitions.
  if (/\bserie b\b/.test(n) ||
      /\b2 bundesliga\b/.test(n) ||
      /\bchampionship\b/.test(n) ||
      /\bsegunda division\b/.test(n) ||
      /\busl championship\b/.test(n) ||
      /\bnpfl\b/.test(n) ||
      /\bprimera a\b/.test(n) ||
      /\bj league cup\b/.test(n)) return 2;

  // Major women's top flights remain analysable, but do not inherit men's Tier 1.
  if (/\b(frauen bundesliga|serie a women|eredivisie women|womens super league|liga f)\b/.test(n)) return 2;
  if (/\b(women|womens|femenina|femenil|feminine|femminile)\b/.test(n)) return 2;

  // Tier 1 always requires a canonical provider identity. Names alone cannot
  // promote unrelated leagues, women's variants or unknown international cups.
  if (TIER1_IDS.has(id) && !/\bqualif/.test(n)) return 1;

  if (/\bworld cup qualif/.test(n) ||
      /\bworld cup qualifiers/.test(n) ||
      /\beuro qualif/.test(n) ||
      /\beuropean championship qualif/.test(n)) return 2;
  if (n === "world cup") return 4;

  // Tier 2 continental / high-quality leagues.
  if (/\beuropa league\b/.test(n) ||
      /\bconference league\b/.test(n) ||
      /\bcopa libertadores\b/.test(n) ||
      /\blibertadores\b/.test(n) ||
      /\bcopa sudamericana\b/.test(n) ||
      /\bsudamericana\b/.test(n) ||
      n === "eredivisie" ||
      n === "primeira liga" ||
      /\bbrasileir/.test(n) ||
      /\bliga profesional argentina\b/.test(n) ||
      n === "mls" ||
      /\basian cup\b/.test(n) ||
      /\bafc\b/.test(n) ||
      /\bcaf\b/.test(n) ||
      /\bconcacaf\b/.test(n)) return 2;

  if (/\bscottish premiership\b/.test(n) ||
      /\bbelgian pro league\b/.test(n) ||
      /\bswiss super league\b/.test(n) ||
      /\baustrian bundesliga\b/.test(n) ||
      /\bsuper lig\b/.test(n) ||
      /\bliga mx\b/.test(n) ||
      /\bsaudi pro league\b/.test(n) ||
      /\binternational\b/.test(n)) return 3;

  if (TIER1_IDS.has(id)) return 1;
  if (TIER2_IDS.has(id)) return 2;
  if (TIER3_IDS.has(id)) return 3;
  return 4;
}

// elite-slate-scope-v88.js
var UPCOMING = /* @__PURE__ */ new Set(["NS", "TBD"]);
function isEliteResearchFixture(fixture, nowMs = Date.now()) {
  const status = String(fixture?.fixture?.status?.short || "").toUpperCase();
  const kickoffMs = Date.parse(fixture?.fixture?.date || "");
  if (!UPCOMING.has(status))
    return false;
  if (!Number.isFinite(kickoffMs))
    return false;
  return kickoffMs > Number(nowMs);
}
__name(isEliteResearchFixture, "isEliteResearchFixture");

// elite-research-evidence-v90.js
var ELITE_RESEARCH_REVISION = "2026-10-04-external-evidence-v90";
var clamp2 = /* @__PURE__ */ __name((v, a, b) => Math.max(a, Math.min(b, v)), "clamp");
var num2 = /* @__PURE__ */ __name((v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d, "num");
var SOURCE_WEIGHT = {
  OFFICIAL_TEAM: 0.98,
  OFFICIAL_LEAGUE: 0.95,
  REPUTABLE_NEWS: 0.88,
  STATS_PROVIDER: 0.84,
  SPECIALIST_ANALYSIS: 0.72,
  PREDICTION_SITE: 0.55,
  SOCIAL: 0.4,
  UNKNOWN: 0.35
};
function freshnessWeight(publishedAt, nowMs = Date.now()) {
  const t = Date.parse(publishedAt || "");
  if (!Number.isFinite(t))
    return 0.45;
  const hours = Math.max(0, (nowMs - t) / 36e5);
  if (hours <= 12)
    return 1;
  if (hours <= 24)
    return 0.94;
  if (hours <= 72)
    return 0.82;
  if (hours <= 168)
    return 0.68;
  return 0.45;
}
__name(freshnessWeight, "freshnessWeight");
function normalizeResearchEvidence(item = {}, nowMs = Date.now()) {
  const sourceType = String(item.sourceType || "UNKNOWN").toUpperCase();
  const direction = String(item.direction || "NEUTRAL").toUpperCase();
  const credibility = SOURCE_WEIGHT[sourceType] ?? SOURCE_WEIGHT.UNKNOWN;
  const confidence = clamp2(num2(item.confidence, 0.7), 0, 1);
  const freshness = freshnessWeight(item.publishedAt, nowMs);
  const weight = credibility * confidence * freshness;
  return {
    sourceName: String(item.sourceName || "Unknown source"),
    sourceUrl: item.sourceUrl || null,
    sourceType,
    publishedAt: item.publishedAt || null,
    checkedAt: item.checkedAt || new Date(nowMs).toISOString(),
    claimType: String(item.claimType || "OTHER").toUpperCase(),
    direction: ["SUPPORTS", "CONTRADICTS", "NEUTRAL"].includes(direction) ? direction : "NEUTRAL",
    confidence,
    credibility,
    freshness,
    weight,
    summary: String(item.summary || "").slice(0, 500)
  };
}
__name(normalizeResearchEvidence, "normalizeResearchEvidence");
function contradictionWeightSafe(value) {
  return Math.max(0, num2(value, 0));
}
__name(contradictionWeightSafe, "contradictionWeightSafe");
function summarizeExternalResearch(items = [], nowMs = Date.now()) {
  const evidence = items.map((x) => normalizeResearchEvidence(x, nowMs));
  let support = 0, contradict = 0, neutral = 0;
  for (const x of evidence) {
    if (x.direction === "SUPPORTS")
      support += x.weight;
    else if (x.direction === "CONTRADICTS")
      contradict += x.weight;
    else
      neutral += x.weight;
  }
  const directional = support + contradict;
  const contradictionShare = directional ? contradict / directional : 0;
  const supportShare = directional ? support / directional : 0;
  const credible = evidence.filter((x) => x.credibility >= 0.8);
  const fresh = evidence.filter((x) => x.freshness >= 0.8);
  const criticalContradiction = evidence.some(
    (x) => x.direction === "CONTRADICTS" && x.credibility >= 0.88 && x.confidence >= 0.75 && x.freshness >= 0.8
  );
  let status = "INSUFFICIENT";
  if (evidence.length >= 2 && credible.length >= 1) {
    const contradictionCount = evidence.filter((x) => x.direction === "CONTRADICTS" && x.weight >= 0.45).length;
    if (criticalContradiction || contradictionCount >= 2 && contradictionWeightSafe(contradict) >= 0.95)
      status = "CONTRADICTED";
    else if (contradictionShare >= 0.3)
      status = "MIXED";
    else if (supportShare >= 0.62)
      status = "SUPPORTED";
    else
      status = "MIXED";
  }
  const confidenceAdjustment = status === "SUPPORTED" ? Math.min(0.05, 0.02 + supportShare * 0.03) : status === "MIXED" ? -0.04 : status === "CONTRADICTED" ? -0.12 : 0;
  return {
    revision: ELITE_RESEARCH_REVISION,
    status,
    evidenceCount: evidence.length,
    credibleSourceCount: credible.length,
    freshSourceCount: fresh.length,
    supportWeight: Math.round(support * 1e3) / 1e3,
    contradictionWeight: Math.round(contradict * 1e3) / 1e3,
    neutralWeight: Math.round(neutral * 1e3) / 1e3,
    supportShare: Math.round(supportShare * 1e3) / 1e3,
    contradictionShare: Math.round(contradictionShare * 1e3) / 1e3,
    criticalContradiction,
    confidenceAdjustment,
    recommendation: status === "CONTRADICTED" ? "HOLD" : status === "MIXED" ? "MORE_RESEARCH" : status === "SUPPORTED" ? "PROCEED_REVIEW" : "MORE_RESEARCH",
    evidence
  };
}
__name(summarizeExternalResearch, "summarizeExternalResearch");
function applyExternalResearch(review = {}, items = [], nowMs = Date.now()) {
  const summary = summarizeExternalResearch(items, nowMs);
  const baseEligible = Boolean(review?.researchEligible);
  const finalReviewEligible = baseEligible && summary.status === "SUPPORTED";
  const researchStatus = !baseEligible ? "NOT_QUEUED" : summary.status === "INSUFFICIENT" ? "PENDING_EXTERNAL_CONTEXT" : summary.status;
  return {
    ...review,
    researchStatus,
    externalResearch: summary,
    finalReviewEligible,
    reviewRecommendation: !baseEligible ? "NOT_QUEUED" : summary.status === "SUPPORTED" ? "PROCEED_REVIEW" : summary.status === "CONTRADICTED" ? "HOLD" : "MORE_RESEARCH"
  };
}
__name(applyExternalResearch, "applyExternalResearch");

// elite-final-review-v91.js
var ELITE_FINAL_REVIEW_REVISION = "2026-10-04-calibrated-final-review-v91";
var clamp3 = /* @__PURE__ */ __name((v, a, b) => Math.max(a, Math.min(b, v)), "clamp");
var num3 = /* @__PURE__ */ __name((v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d, "num");
var p012 = /* @__PURE__ */ __name((v) => {
  const n = num3(v, 0);
  return clamp3(n > 1 ? n / 100 : n, 0, 1);
}, "p01");
function evaluateEliteFinalReview(review = {}) {
  const reasons = [];
  const evidenceScore = clamp3(num3(review.evidenceScore, 0), 0, 100);
  const dataQuality = p012(review.dataQuality);
  const probability = p012(review?.strongestModelView?.probability);
  const research = review.externalResearch || {};
  const supportShare = clamp3(num3(research.supportShare, 0), 0, 1);
  const contradictionShare = clamp3(num3(research.contradictionShare, 0), 0, 1);
  const credibleCount = Math.max(0, num3(research.credibleSourceCount, 0));
  const freshCount = Math.max(0, num3(research.freshSourceCount, 0));
  if (review.researchStatus !== "SUPPORTED")
    reasons.push("EXTERNAL_RESEARCH_NOT_SUPPORTED");
  if (evidenceScore < 76)
    reasons.push("EVIDENCE_SCORE_BELOW_FINAL_GATE");
  if (dataQuality < 0.68)
    reasons.push("DATA_QUALITY_BELOW_FINAL_GATE");
  if (probability < 0.62)
    reasons.push("MODEL_SIGNAL_BELOW_FINAL_GATE");
  if (credibleCount < 1)
    reasons.push("NO_CREDIBLE_EXTERNAL_SOURCE");
  if (freshCount < 1)
    reasons.push("NO_FRESH_EXTERNAL_SOURCE");
  if (contradictionShare >= 0.2)
    reasons.push("UNRESOLVED_CONTRADICTION");
  const diversity = clamp3((credibleCount + Math.min(freshCount, 2)) / 4, 0, 1);
  const finalConfidence = 100 * clamp3(
    evidenceScore / 100 * 0.38 + dataQuality * 0.22 + probability * 0.22 + supportShare * 0.12 + diversity * 0.06 - contradictionShare * 0.18,
    0,
    1
  );
  const approved = reasons.length === 0 && finalConfidence >= 75;
  if (reasons.length === 0 && finalConfidence < 75)
    reasons.push("FINAL_CONFIDENCE_BELOW_GATE");
  return {
    revision: ELITE_FINAL_REVIEW_REVISION,
    fixtureId: review.fixtureId,
    approved,
    disposition: approved ? "FINAL_REVIEW_APPROVED" : "HOLD",
    finalConfidence: Math.round(finalConfidence * 10) / 10,
    reasons,
    modelProbability: Math.round(probability * 1e3) / 10,
    evidenceScore,
    dataQuality: Math.round(dataQuality * 1e3) / 10,
    externalSupportShare: Math.round(supportShare * 1e3) / 1e3,
    externalContradictionShare: Math.round(contradictionShare * 1e3) / 1e3,
    credibleSourceCount: credibleCount,
    freshSourceCount: freshCount
  };
}
__name(evaluateEliteFinalReview, "evaluateEliteFinalReview");

// elite-selection-explanation-v92.js
var ELITE_EXPLANATION_REVISION = "2026-10-04-evidence-grounded-explanation-v92";
var arr = /* @__PURE__ */ __name((v) => Array.isArray(v) ? v : [], "arr");
var pct = /* @__PURE__ */ __name((v) => Number.isFinite(Number(v)) ? Math.round(Number(v) * 10) / 10 : null, "pct");
var clean = /* @__PURE__ */ __name((s) => String(s || "").replace(/\s+/g, " ").trim(), "clean");
function marketLabel(view = {}) {
  const market = clean(view.market).replaceAll("_", " ");
  const selection = clean(view.selection).replaceAll("_", " ");
  return [market, selection].filter(Boolean).join(" \u2014 ");
}
__name(marketLabel, "marketLabel");
function supportingEvidence(review = {}) {
  return arr(review?.externalResearch?.evidence).filter((x) => x?.direction === "SUPPORTS").sort((a, b) => Number(b?.weight || 0) - Number(a?.weight || 0)).slice(0, 3).map((x) => ({
    sourceName: clean(x.sourceName) || "External source",
    sourceType: clean(x.sourceType) || "UNKNOWN",
    claimType: clean(x.claimType) || "OTHER",
    summary: clean(x.summary).slice(0, 220)
  })).filter((x) => x.summary);
}
__name(supportingEvidence, "supportingEvidence");
function explainEliteSelection(review = {}, finalReview = {}) {
  if (!finalReview?.approved)
    return null;
  const view = review?.strongestModelView || {};
  const support = supportingEvidence(review);
  const reasons = [];
  if (view.market && view.selection) {
    reasons.push(`Two45's strongest meaningful model view was ${marketLabel(view)} at ${pct(view.probability)}% model confidence.`);
  }
  if (Number.isFinite(Number(review.evidenceScore))) {
    reasons.push(`The fixture cleared the evidence gate with an evidence score of ${pct(review.evidenceScore)}/100 and data quality of ${pct(review.dataQuality)}/100.`);
  }
  if (review?.researchStatus === "SUPPORTED") {
    reasons.push(`Independent research supported the model direction; ${Number(review.externalResearch?.credibleSourceCount || 0)} credible and ${Number(review.externalResearch?.freshSourceCount || 0)} fresh source checks were recorded.`);
  }
  if (Number(review?.externalResearch?.contradictionShare || 0) === 0) {
    reasons.push("No unresolved directional contradiction remained in the recorded external evidence.");
  }
  if (support.length) {
    reasons.push("The strongest supporting context was: " + support.map((x) => x.summary).join(" | "));
  }
  return {
    revision: ELITE_EXPLANATION_REVISION,
    fixtureId: review.fixtureId,
    title: "Why Two45 Picked This",
    market: view.market || null,
    selection: view.selection || null,
    modelProbability: pct(view.probability),
    finalConfidence: pct(finalReview.finalConfidence),
    evidenceScore: pct(review.evidenceScore),
    dataQuality: pct(review.dataQuality),
    reasons,
    supportingEvidence: support,
    disclaimer: "Explanation is generated only from evidence already used by Two45's review pipeline; it does not add new facts after selection."
  };
}
__name(explainEliteSelection, "explainEliteSelection");

// worker.js
var WORKER_VERSION = 84;
var PACING_REVISION = "2026-10-05.84-bet365-fail-closed-v100";
var PRACTICAL_DAILY_CAP = 6500;
var MODEL_VERSION = "two45-independent-v1.9";
var DECISION_REVISION = "2026-10-01-bold-evidence-v1";
var REANALYZE_COOLDOWN_MS = 10 * 60 * 1e3;
var TIME_ZONE = "America/New_York";
var HARD_CAP = 7e3;
var MAX_ODDS_PAGES = 15;
var DEFAULT_MODEL_BATCH = 9;
var FUTURE_FIXTURE_DAYS = 4;
var TOMORROW_PRELOAD_HOUR_ET = 20;
var TARGET_DAILY_REQUESTS = 6e3;
var FAST_BASELINE_INTERVAL_MS = 2e3;
var SHADOW_V40_DEFAULT_DAILY_CAP = 650;
var PROVIDER_BURST_MAX_CALLS_V69 = 4;
var PROVIDER_BURST_GAP_MS_V69 = 850;
var providerBurstV69 = null;
var LIVE_STATUSES = /* @__PURE__ */ new Set([
  "1H",
  "HT",
  "2H",
  "ET",
  "BT",
  "P",
  "SUSP",
  "INT",
  "LIVE"
]);
var FINISHED_STATUSES = /* @__PURE__ */ new Set([
  "FT",
  "AET",
  "PEN"
]);
var UPCOMING_STATUSES = /* @__PURE__ */ new Set([
  "NS",
  "TBD"
]);
var SCORING_MARKETS = /* @__PURE__ */ new Set([
  "Match Winner",
  "Goals Over/Under",
  "Both Teams Score",
  "Double Chance",
  "Asian Handicap",
  "Handicap Result",
  "Corners Over Under",
  "Corners Over/Under",
  "Total Corners (3 way)",
  "Total Corners",
  "Home Corners Over/Under",
  "Away Corners Over/Under",
  "Corner Handicap",
  "Cards Over/Under",
  "Total Cards",
  "Home Team Total Cards",
  "Away Team Total Cards",
  "Cards Asian Handicap",
  "Card Handicap",
  "Total ShotOnGoal",
  "Total Shots On Target",
  "Shots On Target",
  "Home Player Shots On Target Total",
  "Away Player Shots On Target Total",
  "Total Shots",
  "Home Player Shots Total",
  "Away Player Shots Total",
  "Total Shots Off Target",
  "Shots Off Target",
  "Total ShotOffGoal",
  "Home Player Shots Off Target Total",
  "Away Player Shots Off Target Total",
  "Home Team Score a Goal",
  "Away Team Score a Goal"
]);
var clamp4 = /* @__PURE__ */ __name((v, a, b) => Math.max(a, Math.min(b, v)), "clamp");
var num4 = /* @__PURE__ */ __name((v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d, "num");
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
}
__name(corsHeaders, "corsHeaders");
function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders()
      }
    }
  );
}
__name(json, "json");
function internalRequestAuthorized(request, env) {
  const supplied = request.headers.get("x-two45-internal-key") || "";
  return Boolean(env.TWO45_INTERNAL_KEY && supplied === env.TWO45_INTERNAL_KEY);
}
__name(internalRequestAuthorized, "internalRequestAuthorized");
function easternParts(date = /* @__PURE__ */ new Date()) {
  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false
    }
  ).formatToParts(date);
  return Object.fromEntries(
    parts.map(
      (p) => [p.type, p.value]
    )
  );
}
__name(easternParts, "easternParts");
function easternDate() {
  const x = easternParts();
  return `${x.year}-${x.month}-${x.day}`;
}
__name(easternDate, "easternDate");
function datePlusDays(dateString, days) {
  const [y, m, d] = String(dateString).split("-").map(Number);
  const dt = new Date(
    Date.UTC(
      y,
      m - 1,
      d + days,
      12
    )
  );
  return dt.toISOString().slice(0, 10);
}
__name(datePlusDays, "datePlusDays");
function tomorrowEasternDate() {
  return datePlusDays(
    easternDate(),
    1
  );
}
__name(tomorrowEasternDate, "tomorrowEasternDate");
function easternHour() {
  return num4(
    easternParts().hour,
    0
  ) % 24;
}
__name(easternHour, "easternHour");
function shouldPreloadTomorrow() {
  return easternHour() >= TOMORROW_PRELOAD_HOUR_ET;
}
__name(shouldPreloadTomorrow, "shouldPreloadTomorrow");
function providerQuietWindow() {
  return false;
}
__name(providerQuietWindow, "providerQuietWindow");
function msUntilProviderResetV30() {
  const now = /* @__PURE__ */ new Date();
  const nextReset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(6e4, nextReset - now.getTime());
}
__name(msUntilProviderResetV30, "msUntilProviderResetV30");
function adaptiveProviderIntervalV30(pacing = {}) {
  const used = Math.max(0, num4(pacing.used));
  if (used >= PRACTICAL_DAILY_CAP)
    return 6e4;
  if (pacing.fastBaselineMode)
    return FAST_BASELINE_INTERVAL_MS;
  const targetRemaining = Math.max(1, TARGET_DAILY_REQUESTS - used);
  const ideal = Math.round(msUntilProviderResetV30() / targetRemaining);
  return Math.trunc(clamp4(ideal, 12e3, 22e3));
}
__name(adaptiveProviderIntervalV30, "adaptiveProviderIntervalV30");
function easternWeekday() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short"
  }).format(/* @__PURE__ */ new Date());
}
__name(easternWeekday, "easternWeekday");
function weekendModeV20() {
  const day = easternWeekday();
  const hour = easternHour();
  return day === "Fri" && hour >= 20 || day === "Sat" || day === "Sun";
}
__name(weekendModeV20, "weekendModeV20");
function weekendLadderDatesV67() {
  const today = easternDate();
  const day = easternWeekday();
  if (day === "Fri")
    return [datePlusDays(today, 1), datePlusDays(today, 2)];
  if (day === "Sat")
    return [today, datePlusDays(today, 1)];
  if (day === "Sun")
    return [today];
  return [];
}
__name(weekendLadderDatesV67, "weekendLadderDatesV67");
function weekendDeadlineRushV67() {
  const day = easternWeekday();
  const hour = easternHour();
  return day === "Fri" && hour >= 20 || day === "Sat" && hour < 6;
}
__name(weekendDeadlineRushV67, "weekendDeadlineRushV67");
function fourDayFixtureDatesV20() {
  const today = easternDate();
  return Array.from({ length: FUTURE_FIXTURE_DAYS }, (_, i) => datePlusDays(today, i));
}
__name(fourDayFixtureDatesV20, "fourDayFixtureDatesV20");
function deepAnalysisDatesV20() {
  const today = easternDate();
  const tomorrow = datePlusDays(today, 1);
  if (easternWeekday() === "Sun" && shouldPreloadTomorrow())
    return [tomorrow];
  const dates = weekendModeV20() ? weekendLadderDatesV67() : [today];
  if (shouldPreloadTomorrow() && !dates.includes(tomorrow))
    dates.push(tomorrow);
  return dates;
}
__name(deepAnalysisDatesV20, "deepAnalysisDatesV20");
function supa(env) {
  return {
    url: env.SUPABASE_URL || env.TWO45_SUPABASE_URL || env.PUBLIC_SUPABASE_URL,
    key: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.TWO45_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY
  };
}
__name(supa, "supa");
function footballKey(env) {
  return env.API_FOOTBALL_KEY || env.FOOTBALL_API_KEY || env.API_SPORTS_KEY || env.RAPIDAPI_KEY || null;
}
__name(footballKey, "footballKey");
async function sb(env, path2, options = {}) {
  const { url, key } = supa(env);
  if (!url || !key)
    throw new Error("Supabase configuration missing");
  const {
    prefer,
    headers: extraHeaders = {},
    timeoutMs = 8e3,
    signal,
    ...requestOptions
  } = options;
  let r;
  try {
    r = await fetch(
      url + "/rest/v1/" + path2,
      {
        ...requestOptions,
        signal: signal || AbortSignal.timeout(Math.max(2e3, num4(timeoutMs, 8e3))),
        headers: {
          apikey: key,
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
          Prefer: prefer || "return=representation",
          ...extraHeaders
        }
      }
    );
  } catch (e) {
    const msg = e?.name === "TimeoutError" ? "Supabase request timed out: " + String(path2).split("?")[0] : e?.message || String(e);
    throw new Error(msg);
  }
  const text = await r.text();
  if (!r.ok)
    throw new Error("Supabase " + r.status + ": " + text);
  return text ? JSON.parse(text) : null;
}
__name(sb, "sb");
async function snapshot(env, key) {
  const rows = await sb(
    env,
    `two45_feed_snapshots?snapshot_key=eq.${encodeURIComponent(
      key
    )}&select=payload,refreshed_at&limit=1`
  );
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
__name(snapshot, "snapshot");
function formatBoardSelectionsV20(payload) {
  if (!payload || typeof payload !== "object")
    return payload;
  const cleanBookV64 = /* @__PURE__ */ __name((value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, ""), "cleanBookV64");
  const allowedPriceV64 = /* @__PURE__ */ __name((item) => {
    if (!item || typeof item !== "object")
      return false;
    const price = num4(item.sportsbookOdds, 0);
    return !price || ["bet365","draftkings","pinnacle","williamhill","marathonbet"].includes(cleanBookV64(item.bookmaker));
  }, "allowedPriceV64");
  const formatItem = /* @__PURE__ */ __name((item) => {
    if (!item || typeof item !== "object")
      return item;
    const qualified = item.decision === "PICK" && item.selection && String(item.selection).toUpperCase() !== "NO_BET" && allowedPriceV64(item);
    const alternatives = displayAlternativesV20(item.alternatives).filter(allowedPriceV64);
    return {
      ...item,
      market: qualified ? item.market : "NO_BET",
      selection: qualified ? displaySelectionV20(item.selection) : "NO_BET",
      probability: qualified ? item.probability : 0,
      fairOdds: qualified ? item.fairOdds ?? null : null,
      sportsbookOdds: qualified ? item.sportsbookOdds ?? null : null,
      bookmaker: qualified ? item.bookmaker ?? null : null,
      alternatives
    };
  }, "formatItem");
  const visible = /* @__PURE__ */ __name((item) => allowedPriceV64(item) && num4(item?.competitionTier, 3) <= 3, "visible");
  return {
    ...payload,
    picks: Array.isArray(payload.picks) ? payload.picks.filter(visible).map(formatItem) : payload.picks,
    strongPicks: Array.isArray(payload.strongPicks) ? payload.strongPicks.filter(visible).map(formatItem) : payload.strongPicks,
    riskyPlays: Array.isArray(payload.riskyPlays) ? payload.riskyPlays.filter(visible).map(formatItem) : payload.riskyPlays,
    independentForecasts: Array.isArray(payload.independentForecasts) ? payload.independentForecasts.map(formatItem) : payload.independentForecasts
  };
}
__name(formatBoardSelectionsV20, "formatBoardSelectionsV20");
function fixtureRowsV58(snapshotRow) {
  const p = snapshotRow?.payload || {};
  return Array.isArray(p.fixtures) ? p.fixtures : Array.isArray(p.response) ? p.response : [];
}
__name(fixtureRowsV58, "fixtureRowsV58");
function mergeFixtureRowsV58(baseRows, overlayRows) {
  const map = /* @__PURE__ */ new Map();
  for (const f of [...arr2(baseRows), ...arr2(overlayRows)]) {
    const id = f?.fixture?.id;
    if (id != null)
      map.set(String(id), f);
  }
  return [...map.values()].sort(
    (a, b) => Date.parse(a?.fixture?.date || 0) - Date.parse(b?.fixture?.date || 0)
  );
}
__name(mergeFixtureRowsV58, "mergeFixtureRowsV58");
function priceCoherentV60(probability, odds) {
  const p = Number(probability), o = Number(odds);
  if (!(o > 1))
    return true;
  return !(o >= 3 && p >= 0.7 || o >= 4 && p >= 0.8 || p * o > 3);
}
__name(priceCoherentV60, "priceCoherentV60");
function displayForecastV60(f) {
  const probability = Number(f.probability) > 1 ? Number(f.probability) / 100 : Number(f.probability);
  const unsupportedHandicap = f.market === "HANDICAP" && f.analysisSource === "cross-book-market-consensus";
  const blocked = f.decision === "PICK" && (!priceCoherentV60(probability, f.sportsbookOdds) || unsupportedHandicap);
  const alternatives = arr2(f.alternatives).filter(
    (a) => priceCoherentV60(Number(a.probability) > 1 ? Number(a.probability) / 100 : Number(a.probability), a.sportsbookOdds) && !(a.market === "HANDICAP" && a.analysisSource === "cross-book-market-consensus")
  );
  if (!blocked)
    return { ...f, alternatives };
  return {
    ...f,
    decision: "NO_BET",
    selection: "NO_BET",
    qualityHold: true,
    alternatives,
    reasons: ["Saved pick withheld: price coherence or independent handicap support could not be confirmed."]
  };
}
__name(displayForecastV60, "displayForecastV60");
function pricedBoardPickV65(f, competitionTier = 3) {
  if (!f || typeof f !== "object")
    return null;
  const normBook = /* @__PURE__ */ __name((value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, ""), "normBook");
  const p013 = /* @__PURE__ */ __name((value) => {
    const n = Number(value);
    if (!Number.isFinite(n))
      return 0;
    return n > 1 ? n / 100 : n;
  }, "p01");
  const edgePct = /* @__PURE__ */ __name((x) => {
    if (x?.valueEdgePct != null)
      return num4(x.valueEdgePct, 0);
    const e = num4(x?.valueEdge, 0);
    return Math.abs(e) <= 1 ? e * 100 : e;
  }, "edgePct");
  const tier = Math.max(1, Math.min(4, Number(competitionTier) || 3));
  const dq = p013(f.dataQuality);
  const choices = [f, ...arr2(f.alternatives)].filter(
    (x) => ["bet365", "draftkings", "pinnacle", "williamhill", "marathonbet"].includes(normBook(x?.bookmaker)) && x?.priceVerified === true && num4(x?.sportsbookOdds, 0) >= 1.15 && priceCoherentV60(p013(x?.probability), num4(x?.sportsbookOdds, 0))
  );
  if (!choices.length || tier > 3)
    return null;
  const marketBoldness = /* @__PURE__ */ __name((x) => {
    const market = String(x?.market || "").toUpperCase();
    const selection = String(x?.selection || "").toUpperCase();
    if (market === "MATCH_RESULT" && ["HOME", "AWAY"].includes(selection))
      return 6;
    if (market === "TOTAL_GOALS" && selection === "OVER_3_5")
      return 6;
    if (market === "TOTAL_GOALS" && selection === "OVER_2_5")
      return 5;
    if (market === "BTTS" && selection === "YES")
      return 5;
    if (["HOME_TEAM_GOALS", "AWAY_TEAM_GOALS"].includes(market) && /OVER_(1_5|2_5|3_5)/.test(selection))
      return 5;
    if (market === "HANDICAP" && /MINUS/.test(selection))
      return 5;
    if (market.includes("CORNERS") || market.includes("CARDS") || market.includes("SHOTS"))
      return 4;
    if (market === "TOTAL_GOALS" && selection === "OVER_1_5")
      return 1;
    if (market === "DOUBLE_CHANCE")
      return 1;
    if (market === "HANDICAP" && /PLUS_1_5/.test(selection))
      return 0;
    return 3;
  }, "marketBoldness");
  const eliteGate = tier === 1 ? { p: 0.69, q: 0.5, minEdge: -8 } : tier === 2 ? { p: 0.72, q: 0.54, minEdge: -6 } : { p: 0.75, q: 0.6, minEdge: -4 };
  const eliteScore = /* @__PURE__ */ __name((x) => {
    const p = p013(x.probability), e = edgePct(x), o = num4(x.sportsbookOdds, 0);
    const market = String(x.market || "").toUpperCase();
    const selection = String(x.selection || "").toUpperCase();
    const safety = market === "DOUBLE_CHANCE" ? 0.05 : market === "TOTAL_GOALS" && selection === "OVER_1_5" ? 0.038 : market === "TOTAL_GOALS" ? 0.025 : ["HOME_TEAM_GOALS", "AWAY_TEAM_GOALS"].includes(market) ? 0.022 : market === "BTTS" ? 0.01 : market === "MATCH_RESULT" ? 4e-3 : 0;
    const lowInformation = market === "TOTAL_GOALS" && selection === "UNDER_4_5" ? 0.075 : market === "HANDICAP" && /PLUS_1_5/.test(selection) ? 0.055 : 0;
    const patternSignal = x?.patternEvidence?.rankScore != null && x?.patternEvidence?.descriptiveOnly === true ? Math.min(0.025, Math.max(0, Number(x.patternEvidence.rankScore) / 100 * 0.025)) : 0;
    return p * 0.76 + clamp4(dq, 0, 1) * 0.18 + clamp4(e / 100, -0.12, 0.3) * 0.04 + safety + patternSignal - lowInformation - Math.max(0, o - 2.8) * 8e-3;
  }, "eliteScore");
  const strong = choices.filter((x) => {
    const p = p013(x.probability), e = edgePct(x), lane = String(x.lane || "").toUpperCase();
    if (dq < eliteGate.q)
      return false;
    if (lane === "STRONG" && p >= eliteGate.p - 0.05 && e >= eliteGate.minEdge)
      return true;
    return p >= eliteGate.p && e >= eliteGate.minEdge;
  }).sort((a, b) => eliteScore(b) - eliteScore(a));
  const riskyQ = tier === 1 ? 0.46 : tier === 2 ? 0.5 : 0.54;
  const riskyScore = /* @__PURE__ */ __name((x) => {
    const p = p013(x.probability);
    const e = Math.max(0, edgePct(x));
    const uncertainty = 1 - clamp4(p, 0, 1);
    const evidence = clamp4(dq, 0, 1);
    return uncertainty * 42 + evidence * 28 + Math.min(e, 30) * 1 + Math.log(Math.max(1.01, num4(x.sportsbookOdds, 0))) * 2;
  }, "riskyScore");
  const risky = choices.filter((x) => {
    const p = p013(x.probability), o = num4(x.sportsbookOdds, 0), e = edgePct(x);
    if (o < 1.35 || dq < riskyQ || !priceCoherentV60(p, o))
      return false;
    if (e < 2 || p < 0.18)
      return false;
    return true;
  }).sort((a, b) => riskyScore(b) - riskyScore(a));
  const chosen = strong[0] || risky[0];
  if (!chosen)
    return null;
  const isRisky = !strong.length;
  const explainPickV81 = /* @__PURE__ */ __name((x) => {
    const market = String(x?.market || "").toUpperCase(), selection = String(x?.selection || "").toUpperCase();
    const probability = Number(x?.probability) > 1 ? Number(x.probability) : p013(x?.probability) * 100;
    const edge = edgePct(x), odds = num4(x?.sportsbookOdds, 0), implied = odds > 1 ? 100 / odds : 0;
    const option = selection.replaceAll("_", " ").replace(/PLUS/g, "+").replace(/MINUS/g, "-");
    let why = "Two45 sees this as the strongest supported option";
    if (market === "MATCH_RESULT")
      why = "Two45's match model favors the " + option + " result";
    else if (market === "TOTAL_GOALS")
      why = "Two45's scoring model favors " + option.toLowerCase() + " total goals";
    else if (market === "BTTS")
      why = "Two45's scoring model favors both teams to score: " + option.toLowerCase();
    else if (market === "HOME_TEAM_GOALS")
      why = "Two45's team-scoring model favors the home side " + option.toLowerCase() + " goals";
    else if (market === "AWAY_TEAM_GOALS")
      why = "Two45's team-scoring model favors the away side " + option.toLowerCase() + " goals";
    else if (market === "HANDICAP")
      why = "Two45's matchup model favors the " + option.toLowerCase() + " handicap";
    else if (market.includes("CORNERS"))
      why = "Two45's corner model favors the " + option.toLowerCase() + " corner line";
    return why + " at " + odds.toFixed(2) + ". Model probability " + probability.toFixed(1) + "% versus " + implied.toFixed(1) + "% market-implied, with " + Math.max(0, edge).toFixed(1) + "% modeled edge.";
  }, "explainPickV81");
  return {
    ...f,
    ...chosen,
    decision: "PICK",
    pickType: isRisky ? "RISKY_VALUE" : "STRONG_PICK",
    band: isRisky ? "Risky Play" : "Top Pick",
    bookmaker: "Bet365",
    sportsbookOdds: num4(chosen.sportsbookOdds, null),
    probability: Number(chosen.probability) > 1 ? Number(chosen.probability) : p013(chosen.probability) * 100,
    valueEdgePct: edgePct(chosen),
    reasons: [explainPickV81(chosen)],
    promotedFromAlternative: chosen !== f
  };
}
__name(pricedBoardPickV65, "pricedBoardPickV65");
function presentCanonicalBoardV59(base, fixtures, canonicalRows) {
  const chosenRows = /* @__PURE__ */ new Map();
  for (const row of canonicalRows) {
    if (row.status !== "COMPLETE")
      continue;
    const forecast = canonicalForecastV2(row);
    if (!forecast)
      continue;
    const id = Number(row.fixture_id);
    const rank = row.model_version === MODEL_VERSION ? 2 : 1;
    const completed = Date.parse(row.completed_at || row.updated_at || row.requested_at || 0);
    const prev = chosenRows.get(id);
    if (!prev || rank > prev.rank || rank === prev.rank && completed > prev.completed) {
      chosenRows.set(id, { row, forecast, rank, completed });
    }
  }
  let independentForecasts = fixtures.map(fixtureIdV19).map((id) => chosenRows.get(Number(id))?.forecast).filter(Boolean).map(displayForecastV60);
  const byId = new Map(fixtures.map((f) => [fixtureIdV19(f), f]));
  independentForecasts = independentForecasts.filter((f) => {
    const fixture = byId.get(Number(f.fixtureId));
    return competitionTierV21(fixture?.league?.name || f.league, fixture?.league?.id) <= 3;
  });
  const playableForecasts = independentForecasts.map((f) => {
    const fixture = byId.get(Number(f.fixtureId));
    const tier = competitionTierV21(fixture?.league?.name || f.league, fixture?.league?.id);
    return pricedBoardPickV65(f, tier);
  }).filter(Boolean);
  const picks = playableForecasts.filter((f) => {
    const status = byId.get(Number(f.fixtureId))?.fixture?.status?.short;
    return f.decision === "PICK" && (UPCOMING_STATUSES.has(status) || LIVE_STATUSES.has(status) && f.live === true && Date.now() - Date.parse(f.generatedAt || 0) < 15 * 6e4);
  }).map((f) => {
    const fixture = byId.get(Number(f.fixtureId));
    const competitionTier = competitionTierV21(fixture?.league?.name || f.league, fixture?.league?.id);
    const tierBonus = competitionTier === 1 ? 10 : competitionTier === 2 ? 4 : competitionTier === 3 ? 1 : 0;
    const price = num4(f.sportsbookOdds, 0);
    const elitePriceBonus = price >= 1.18 && price <= 1.85 ? 3 : 0;
    return {
      ...f,
      fixtureId: String(f.fixtureId),
      competitionTier,
      band: f.pickType === "RISKY_VALUE" ? "Risky Play" : "Top Pick",
      score: num4(f.probability),
      rankScore: num4(f.probability) * 0.7 + num4(f.valueEdgePct) * 0.3 + tierBonus + elitePriceBonus
    };
  }).sort((a, b) => b.rankScore - a.rankScore);
  const riskyMarketRankV61 = /* @__PURE__ */ __name((f) => {
    const market = String(f?.market || "").toUpperCase();
    const selection = String(f?.selection || "").toUpperCase();
    if (market === "MATCH_RESULT" && ["HOME", "AWAY"].includes(selection))
      return 6;
    if (market === "TOTAL_GOALS" && selection === "OVER_3_5")
      return 6;
    if (market === "TOTAL_GOALS" && selection === "OVER_2_5")
      return 5;
    if (market === "BTTS" && selection === "YES")
      return 5;
    if (["HOME_TEAM_GOALS", "AWAY_TEAM_GOALS"].includes(market) && /OVER_(1_5|2_5)/.test(selection))
      return 5;
    if (market === "HANDICAP" && /MINUS/.test(selection))
      return 4;
    if (market === "TOTAL_GOALS" && selection === "OVER_1_5")
      return 1;
    if (market === "HANDICAP" && /PLUS_1_5/.test(selection))
      return 0;
    return 3;
  }, "riskyMarketRankV61");
  const riskyCandidateV62 = /* @__PURE__ */ __name((parent, candidate) => {
    const price = num4(candidate?.sportsbookOdds, 0);
    const probability = Number(candidate?.probability) > 1 ? Number(candidate.probability) / 100 : num4(candidate?.probability, 0);
    const edgeRaw = candidate?.valueEdgePct ?? candidate?.valueEdge;
    const edgePct = edgeRaw == null ? num4(parent?.valueEdgePct, 0) : Math.abs(num4(edgeRaw, 0)) <= 1 ? num4(edgeRaw, 0) * 100 : num4(edgeRaw, 0);
    const dqRaw = candidate?.dataQuality ?? parent?.dataQuality;
    const dq = Number(dqRaw) > 1 ? Number(dqRaw) / 100 : num4(dqRaw, 0);
    const tier = num4(parent?.competitionTier, 3);
    const qFloor = tier === 1 ? 0.46 : tier === 2 ? 0.5 : 0.54;
    if (price < 1.35 || dq < qFloor || !priceCoherentV60(probability, price))
      return null;
    if (edgePct < 2 || probability < 0.18)
      return null;
    const uncertainty = 1 - clamp4(probability, 0, 1);
    return {
      ...parent,
      ...candidate,
      fixtureId: String(parent.fixtureId),
      decision: "PICK",
      pickType: "RISKY_VALUE",
      band: "Risky Play",
      probability: Number(candidate?.probability) > 1 ? Number(candidate.probability) : probability * 100,
      valueEdgePct: edgePct,
      competitionTier: parent.competitionTier,
      // Data first: higher-variance model outcomes with stronger evidence/value
      // rise naturally. Market name and odds band do not define risk.
      rankScore: uncertainty * 42 + dq * 28 + Math.min(Math.max(edgePct, 0), 30) + Math.log(Math.max(1.01, price)) * 2,
      promotedFromAlternative: candidate !== parent
    };
  }, "riskyCandidateV62");
  const premiumMarketQualityV80 = /* @__PURE__ */ __name((f) => {
    const market = String(f?.market || "").toUpperCase(), selection = String(f?.selection || "").toUpperCase();
    if (market === "MATCH_RESULT" && ["HOME", "AWAY"].includes(selection))
      return 6;
    if (market === "BTTS")
      return 4;
    if (market === "TOTAL_GOALS" && selection === "OVER_2_5")
      return 7;
    if (market === "TOTAL_GOALS" && selection === "OVER_3_5")
      return 6;
    if (market === "TOTAL_GOALS" && selection === "OVER_1_5")
      return 3;
    if (market === "TOTAL_GOALS" && selection === "UNDER_3_5")
      return 2;
    if (market === "TOTAL_GOALS" && selection === "UNDER_4_5")
      return -12;
    if (["HOME_TEAM_GOALS", "AWAY_TEAM_GOALS"].includes(market) && /OVER_(1_5|2_5)/.test(selection))
      return 6;
    if (market === "HANDICAP" && /PLUS_1_5/.test(selection))
      return -10;
    if (market === "HANDICAP" && /PLUS_0_5/.test(selection))
      return 1;
    if (market === "HANDICAP" && /MINUS/.test(selection))
      return 4;
    if (market === "DOUBLE_CHANCE")
      return -4;
    if (market.includes("CORNERS"))
      return 1;
    return 0;
  }, "premiumMarketQualityV80");
  const premiumPublishScoreV80 = /* @__PURE__ */ __name((f) => {
    const probability = Number(f?.probability) > 1 ? Number(f.probability) : num4(f?.probability, 0) * 100;
    const dq = Number(f?.dataQuality) > 1 ? Number(f.dataQuality) : num4(f?.dataQuality, 0) * 100;
    const edgeRaw = f?.valueEdgePct ?? f?.valueEdge;
    const edge = Math.abs(num4(edgeRaw, 0)) <= 1 ? num4(edgeRaw, 0) * 100 : num4(edgeRaw, 0);
    const tier = num4(f?.competitionTier, 4), odds = num4(f?.sportsbookOdds, 0);
    const tierPts = tier === 1 ? 12 : tier === 2 ? 7 : tier === 3 ? 2 : -20;
    const pricePts = odds >= 1.5 && odds <= 1.9 ? 6 : odds >= 1.25 && odds < 1.5 ? 4 : odds > 1.9 && odds <= 2.5 ? 5 : odds > 2.5 ? 2 : 0;
    return probability * 0.45 + dq * 0.18 + Math.min(Math.max(edge, 0), 25) * 0.6 + tierPts + pricePts + premiumMarketQualityV80(f);
  }, "premiumPublishScoreV80");
  const premiumFloorV80 = /* @__PURE__ */ __name((f) => num4(f?.competitionTier, 4) === 1 ? 72 : num4(f?.competitionTier, 4) === 2 ? 76 : 80, "premiumFloorV80");
  const automaticPicks = picks.filter((f) => num4(f.competitionTier, 4) <= 3);
  const riskyByFixture = /* @__PURE__ */ new Map();
  for (const parent of automaticPicks) {
    for (const candidate of [parent, ...arr2(parent.alternatives)]) {
      const promoted = riskyCandidateV62(parent, candidate);
      if (!promoted)
        continue;
      const id = String(parent.fixtureId), prev = riskyByFixture.get(id);
      if (!prev || promoted.rankScore > prev.rankScore)
        riskyByFixture.set(id, promoted);
    }
  }
  const strongPicks = automaticPicks.filter((f) => f.pickType !== "RISKY_VALUE").filter((f) => String(f?.lane || "").toUpperCase() !== "WATCH" && String(f?.role || "").toUpperCase() !== "WATCH_OPTION").map((f) => ({ ...f, premiumScore: premiumPublishScoreV80(f) })).filter((f) => f.premiumScore >= premiumFloorV80(f)).sort(
    (a, b) => num4(a.competitionTier, 4) - num4(b.competitionTier, 4) || b.premiumScore - a.premiumScore || b.rankScore - a.rankScore
  ).slice(0, 10);
  const strongFixtureIds = new Set(
    strongPicks.map((f) => String(f.fixtureId || f.providerMatchId || "")).filter(Boolean)
  );
  const rankedRisky = [...riskyByFixture.values()].filter((f) => !strongFixtureIds.has(String(f.fixtureId || f.providerMatchId || ""))).sort((a, b) => b.rankScore - a.rankScore || num4(b.valueEdgePct, 0) - num4(a.valueEdgePct, 0));
  const riskyBuckets = /* @__PURE__ */ new Map();
  for (const x of rankedRisky) {
    const sig = String(x.market || "") + "|" + String(x.selection || "");
    if (!riskyBuckets.has(sig))
      riskyBuckets.set(sig, []);
    riskyBuckets.get(sig).push(x);
  }
  const riskyPlays = [];
  while (riskyPlays.length < rankedRisky.length) {
    let added = false;
    for (const bucket of riskyBuckets.values()) {
      if (bucket.length) {
        riskyPlays.push(bucket.shift());
        added = true;
      }
    }
    if (!added)
      break;
  }
  const eligiblePicks = [...strongPicks, ...riskyPlays];
  return formatBoardSelectionsV20({
    ...base,
    independentForecasts,
    analyzedCount: independentForecasts.length,
    picks: eligiblePicks,
    strongPicks,
    riskyPlays
  });
}
__name(presentCanonicalBoardV59, "presentCanonicalBoardV59");
function repricePublicCandidateV84(oddsPayload, fixtureId, candidate) {
  if (!candidate || typeof candidate !== "object")
    return candidate;
  const quote = exactBet365QuoteV78(oddsPayload, fixtureId, candidate.market, candidate.selection);
  if (!quote) {
    return {
      ...candidate,
      bookmaker: null,
      sportsbookOdds: null,
      valueEdge: null,
      valueEdgePct: null,
      priceVerified: false,
      oddsVerification: null
    };
  }
  const rawP = Number(candidate.probability);
  const probability = Number.isFinite(rawP) ? rawP > 1 ? rawP / 100 : rawP : 0;
  const edge = probability > 0 ? probability - 1 / quote.odds : null;
  return {
    ...candidate,
    bookmaker: quote.bookmaker || "Bet365",
    sportsbookOdds: quote.odds,
    rawMarket: quote.rawMarket || null,
    rawSelection: quote.rawSelection || null,
    priceVerified: true,
    oddsVerification: quote.oddsVerification || null,
    valueEdge: edge,
    valueEdgePct: edge == null ? null : edge * 100
  };
}
__name(repricePublicCandidateV84, "repricePublicCandidateV84");
async function repriceCanonicalRowsV84(env, date, rows) {
  const oddsRow = await getFeedSnapshot(env, oddsKey(date)).catch(() => null);
  const oddsPayload = oddsRow?.payload || {};
  return arr2(rows).map((row) => {
    const result = row?.result;
    const stored = result?.forecast;
    if (!stored || typeof stored !== "object")
      return row;
    const fixtureId = row.fixture_id || stored.fixtureId || stored.providerMatchId;
    const main = repricePublicCandidateV84(oddsPayload, fixtureId, stored);
    const alternatives = arr2(stored.alternatives).map((x) => repricePublicCandidateV84(oddsPayload, fixtureId, x));
    const verifiedMain = Boolean(main?.priceVerified);
    const forecast = {
      ...main,
      alternatives,
      decision: verifiedMain ? stored.decision : "NO_BET",
      qualityHold: !verifiedMain && stored.decision === "PICK",
      reasons: !verifiedMain && stored.decision === "PICK" ? ["Two45 is holding this pick until the exact full-match Bet365 line is verified."] : stored.reasons
    };
    return {
      ...row,
      result: {
        ...result,
        forecast,
        marketOptions: arr2(result.marketOptions).map((x) => repricePublicCandidateV84(oddsPayload, fixtureId, x))
      }
    };
  });
}
__name(repriceCanonicalRowsV84, "repriceCanonicalRowsV84");
async function hydrateBoardFixturesV58(env, date, board, includeLive = false) {
  const fixtureSnap = await snapshot(env, `fixtures:${date}`).catch(() => null);
  let games = fixtureRowsV58(fixtureSnap);
  if (!games.length)
    games = arr2(board?.games || board?.fixtures);
  if (includeLive) {
    const liveSnap = await snapshot(env, "live").catch(() => null);
    const liveRows = fixtureRowsV58(liveSnap).filter((f) => {
      const age = Date.now() - Date.parse(f?.fixture?.date);
      return LIVE_STATUSES.has(f?.fixture?.status?.short) && age >= 0 && age < 6 * 60 * 6e4;
    });
    games = mergeFixtureRowsV58(games, liveRows);
  }
  try {
    let rows = await canonicalAnalysisRowsV2(env, games.map(fixtureIdV19));
    rows = await repriceCanonicalRowsV84(env, date, rows);
    board = presentCanonicalBoardV59(board || {}, games, rows);
    board = await verifyPublicStrongPicksV83(env, date, board);
  } catch (_) {
  }
  return {
    ...board || {},
    ok: true,
    date,
    games,
    fixtures: games,
    fixtureFeedUpdatedAt: fixtureSnap?.refreshed_at || null
  };
}
__name(hydrateBoardFixturesV58, "hydrateBoardFixturesV58");
async function todayBoard(env) {
  const d = easternDate();
  let s = await snapshot(env, `model-board:${d}`);
  if (!s) {
    const fixtures = await snapshot(env, `fixtures:${d}`).catch(() => null);
    if (fixtureRowsV58(fixtures).length) {
      await evaluateBoardV19(env, d, true).catch(() => null);
      s = await snapshot(env, `model-board:${d}`).catch(() => null);
    }
  }
  const board = s ? formatBoardSelectionsV20(s.payload) : { ok: true, date: d, games: [], fixtures: [], picks: [], strongPicks: [], riskyPlays: [] };
  return hydrateBoardFixturesV58(env, d, board, true);
}
__name(todayBoard, "todayBoard");
async function fixturesToday(env) {
  const d = easternDate();
  const s = await snapshot(
    env,
    `fixtures:${d}`
  );
  return s ? s.payload : {
    ok: false,
    date: d,
    fixtures: []
  };
}
__name(fixturesToday, "fixturesToday");
async function liveBoard(env) {
  const s = await snapshot(
    env,
    "live"
  );
  return s ? s.payload : {
    ok: true,
    live: [],
    upcoming: [],
    finished: []
  };
}
__name(liveBoard, "liveBoard");
async function oddsToday(env) {
  const d = easternDate();
  const s = await snapshot(
    env,
    `odds:${d}`
  );
  return s ? s.payload : {
    ok: true,
    date: d,
    response: [],
    total: 0
  };
}
__name(oddsToday, "oddsToday");
async function fixturesTomorrow(env) {
  const d = tomorrowEasternDate();
  if (!shouldPreloadTomorrow()) {
    return {
      ok: true,
      date: d,
      waitingUntil: "20:00 America/New_York",
      fixtures: [],
      total: 0
    };
  }
  const s = await snapshot(
    env,
    `fixtures:${d}`
  );
  return s ? s.payload : {
    ok: true,
    date: d,
    fixtures: [],
    total: 0
  };
}
__name(fixturesTomorrow, "fixturesTomorrow");
async function oddsTomorrow(env) {
  const d = tomorrowEasternDate();
  if (!shouldPreloadTomorrow()) {
    return {
      ok: true,
      date: d,
      waitingUntil: "20:00 America/New_York",
      response: [],
      total: 0
    };
  }
  const s = await snapshot(
    env,
    `odds:${d}`
  );
  return s ? s.payload : {
    ok: true,
    date: d,
    response: [],
    total: 0
  };
}
__name(oddsTomorrow, "oddsTomorrow");
async function tomorrowBoard(env) {
  const d = tomorrowEasternDate();
  if (!shouldPreloadTomorrow()) {
    return {
      ok: true,
      date: d,
      waitingUntil: "20:00 America/New_York",
      games: [],
      picks: []
    };
  }
  const s = await snapshot(
    env,
    `model-board:${d}`
  );
  const board = s ? formatBoardSelectionsV20(s.payload) : {
    ok: true,
    date: d,
    games: [],
    fixtures: [],
    picks: [],
    strongPicks: [],
    riskyPlays: []
  };
  return hydrateBoardFixturesV58(env, d, board, false);
}
__name(tomorrowBoard, "tomorrowBoard");
async function liveOdds(env) {
  const s = await snapshot(
    env,
    "live-odds"
  );
  return s ? s.payload : {
    ok: true,
    response: [],
    total: 0
  };
}
__name(liveOdds, "liveOdds");
function statusBucketV20(value) {
  const s = String(value || "").trim().toUpperCase();
  if (["WIN", "WON", "SUCCESS"].includes(s))
    return "WIN";
  if (["LOSS", "LOST", "LOSE", "FAILED"].includes(s))
    return "LOSS";
  if (["VOID", "PUSH", "CANCELLED", "CANCELED"].includes(s))
    return "VOID";
  if (["LIVE", "IN_PLAY", "IN-PLAY"].includes(s))
    return "LIVE";
  return "PENDING";
}
__name(statusBucketV20, "statusBucketV20");
function firstDefinedV20(obj, keys, fallback = null) {
  for (const key of keys) {
    if (obj && obj[key] !== void 0 && obj[key] !== null)
      return obj[key];
  }
  return fallback;
}
__name(firstDefinedV20, "firstDefinedV20");
function normalizeRecordRowV20(row, source) {
  const result = statusBucketV20(firstDefinedV20(row, ["result", "status", "settlement_status", "outcome"], "PENDING"));
  return {
    source,
    id: firstDefinedV20(row, ["id", "forecast_key", "pick_key"]),
    fixtureId: num4(firstDefinedV20(row, ["fixture_id", "provider_match_id"]), null),
    kickoffAt: firstDefinedV20(row, ["kickoff_at", "fixture_date", "created_at"]),
    competition: firstDefinedV20(row, ["competition", "league"]),
    homeTeam: firstDefinedV20(row, ["home_team", "home"]),
    awayTeam: firstDefinedV20(row, ["away_team", "away"]),
    market: firstDefinedV20(row, ["market"]),
    selection: displaySelectionV20(firstDefinedV20(row, ["selection", "pick"])),
    odds: num4(firstDefinedV20(row, ["odds", "sportsbook_odds", "price"]), null),
    probability: num4(firstDefinedV20(row, ["probability", "model_probability"]), null),
    confidence: firstDefinedV20(row, ["confidence_tier", "band", "confidence"]),
    result,
    score: row.final_home_score != null && row.final_away_score != null ? `${row.final_home_score}-${row.final_away_score}` : firstDefinedV20(row, ["score", "final_score"]),
    settledAt: firstDefinedV20(row, ["settled_at", "completed_at", "updated_at"]),
    createdAt: firstDefinedV20(row, ["created_at", "published_at", "kickoff_at"]),
    raw: row
  };
}
__name(normalizeRecordRowV20, "normalizeRecordRowV20");
async function researchHistoryV2(env, limit = 250) {
  const rowsRaw = await sb(
    env,
    `two45_model_forecasts?decision=eq.PICK&selection=neq.NO_BET&select=id,fixture_id,kickoff_at,competition,home_team,away_team,market,selection,sportsbook_odds,probability,confidence_tier,outcome,final_home_score,final_away_score,settled_at,created_at&order=kickoff_at.desc,created_at.desc&limit=${Math.max(1, Math.min(limit, 1e3))}`
  );
  const rows = Array.isArray(rowsRaw) ? rowsRaw.map((x) => normalizeRecordRowV20(x, "published_pick")) : [];
  const seen = /* @__PURE__ */ new Set();
  const deduped = [];
  for (const row of rows) {
    const key = [row.fixtureId, row.market, row.selection].join("|");
    if (seen.has(key))
      continue;
    seen.add(key);
    deduped.push(row);
  }
  deduped.sort((a, b) => Date.parse(b.kickoffAt || b.createdAt || 0) - Date.parse(a.kickoffAt || a.createdAt || 0));
  return {
    ok: true,
    total: deduped.length,
    publishedCount: deduped.length,
    forecastCount: 0,
    source: "two45_model_forecasts:decision=PICK",
    rows: deduped.slice(0, limit)
  };
}
__name(researchHistoryV2, "researchHistoryV2");
async function recordHistoryV20(env, limit = 250) {
  const rows = await sb(env, `two45_public_record_v2?select=*&order=kickoff_at.desc,id.desc&limit=${Math.max(1,Math.min(limit,1000))}`);
  if (!Array.isArray(rows)) throw new Error("Publication Record unavailable");
  const displayed = rows.map(x=>normalizeRecordRowV20(x,x.product));
  // Publication-time snapshots are separate from settlement updates. Do not reconstruct
  // historical rationales from the latest forecasts or post-match data.
  const fixtureIds=[...new Set(displayed.map(r=>Number(r.fixtureId)).filter(Number.isSafeInteger))];
  // Scope large JSON snapshots to the fixtures shown in this response. This preserves
  // immutable publication evidence while avoiding an unrelated 1,000-snapshot read.
  const published=[];
  for(let i=0;i<fixtureIds.length;i+=40){
    const ids=fixtureIds.slice(i,i+40);
    const subset=await sb(env,"two45_publications?fixture_id=in.("+ids.join(",")+")&select=fixture_id,market,selection,product,published_at,snapshot&order=published_at.desc&limit=1000").catch(()=>[]);
    published.push(...arr2(subset));
  }
  const evidence = new Map();
  for(const p of arr2(published)){
    const key=[p.fixture_id,String(p.market||"").toUpperCase(),ticketSelectionKeyV78(p.selection)].join("|");
    if(!evidence.has(key)) evidence.set(key,p);
  }
  for(const row of displayed){
    const key=[row.fixtureId,String(row.market||"").toUpperCase(),ticketSelectionKeyV78(row.selection)].join("|");
    const archived=evidence.get(key);
    const snap=archived?.snapshot||{};
    row.preMatchReview=archived?{
      publishedAt:archived.published_at,
      modelVersion:snap.modelVersion||null,
      reasons:arr2(snap.reasons).filter(x=>typeof x==="string").slice(0,8),
      dataQuality:snap.dataQuality??null,
      priceObservedAt:snap.priceObservedAt||null,
      source:"publication-snapshot",
      evidenceStatus:arr2(snap.reasons).length?"RECORDED":"INCOMPLETE"
    }:{source:"publication-snapshot",evidenceStatus:"UNAVAILABLE"};
  }
  return {ok:true,source:"official-publication-ledger-v2",scope:"official selections only; research forecasts excluded",total:rows.length,publishedCount:rows.length,forecastCount:0,rows:displayed};
}

async function recordSummaryV20(env) {
  const summary = await sb(env, "rpc/two45_record_summary", {method:"POST",body:JSON.stringify({})});
  if (summary == null) throw new Error("Publication summary unavailable");
  return {ok:true,source:"official-publication-ledger-v2",scope:"official selections only; incomplete historical publication evidence is excluded",summary};
}
__name(recordSummaryV20, "recordSummaryV20");
function poisson(k, lambda) {
  if (lambda <= 0) {
    return k === 0 ? 1 : 0;
  }
  let f = 1;
  for (let i = 2; i <= k; i++) {
    f *= i;
  }
  return Math.exp(-lambda) * Math.pow(lambda, k) / f;
}
__name(poisson, "poisson");
function shrink(v, n, baseline, strength = 8) {
  n = Math.max(
    0,
    num4(n)
  );
  const w = n / (n + strength);
  return w * num4(
    v,
    baseline
  ) + (1 - w) * baseline;
}
__name(shrink, "shrink");
function expectedGoals(home, away, ctx = {}) {
  const lh = num4(
    ctx.leagueHomeGoalsAvg,
    1.45
  );
  const la = num4(
    ctx.leagueAwayGoalsAvg,
    1.15
  );
  const homeVenueSample = Math.max(0, num4(home.homeSampleSize, home.sampleSize));
  const awayVenueSample = Math.max(0, num4(away.awaySampleSize, away.sampleSize));
  const hgf = shrink(
    home.homeGoalsForAvg ?? home.goalsForAvg,
    homeVenueSample,
    lh
  );
  const hga = shrink(
    home.homeGoalsAgainstAvg ?? home.goalsAgainstAvg,
    homeVenueSample,
    la
  );
  const agf = shrink(
    away.awayGoalsForAvg ?? away.goalsForAvg,
    awayVenueSample,
    la
  );
  const aga = shrink(
    away.awayGoalsAgainstAvg ?? away.goalsAgainstAvg,
    awayVenueSample,
    lh
  );
  let hx = Math.sqrt(
    Math.max(
      0.05,
      hgf
    ) * Math.max(
      0.05,
      aga
    )
  );
  let ax = Math.sqrt(
    Math.max(
      0.05,
      agf
    ) * Math.max(
      0.05,
      hga
    )
  );
  const form = clamp4(
    (num4(
      home.formPointsPerGame,
      1.5
    ) - num4(
      away.formPointsPerGame,
      1.5
    )) / 3,
    -0.35,
    0.35
  );
  hx *= 1 + form * 0.12;
  ax *= 1 - form * 0.1;
  const homeVenuePPG = shrink(num4(home.homePointsPerGame, home.formPointsPerGame), homeVenueSample, num4(home.formPointsPerGame, 1.5), 4);
  const awayVenuePPG = shrink(num4(away.awayPointsPerGame, away.formPointsPerGame), awayVenueSample, num4(away.formPointsPerGame, 1.5), 4);
  const venueEdge = clamp4((homeVenuePPG - awayVenuePPG) / 3, -0.3, 0.3);
  hx *= 1 + venueEdge * 0.08;
  ax *= 1 - venueEdge * 0.07;
  const homeAttackReliability = clamp4(1 - num4(home.failedToScoreRate, 0), 0.35, 1);
  const awayAttackReliability = clamp4(1 - num4(away.failedToScoreRate, 0), 0.35, 1);
  const homeDefResilience = clamp4(num4(home.cleanSheetRate, 0), 0, 0.65);
  const awayDefResilience = clamp4(num4(away.cleanSheetRate, 0), 0, 0.65);
  hx *= clamp4(0.94 + homeAttackReliability * 0.08 - awayDefResilience * 0.06, 0.9, 1.06);
  ax *= clamp4(0.94 + awayAttackReliability * 0.08 - homeDefResilience * 0.06, 0.9, 1.06);
  hx *= 1 - clamp4(
    num4(
      home.absenceImpact,
      0
    ),
    0,
    1
  ) * 0.12;
  ax *= 1 - clamp4(
    num4(
      away.absenceImpact,
      0
    ),
    0,
    1
  ) * 0.12;
  return {
    home: clamp4(
      hx,
      0.15,
      4
    ),
    away: clamp4(
      ax,
      0.15,
      4
    )
  };
}
__name(expectedGoals, "expectedGoals");
function probabilities(hx, ax, homeGoals = 0, awayGoals = 0) {
  const out = {
    MATCH_RESULT: {
      HOME: 0,
      DRAW: 0,
      AWAY: 0
    },
    TOTAL_GOALS: {
      OVER_1_5: 0,
      OVER_2_5: 0,
      OVER_3_5: 0,
      UNDER_3_5: 0,
      UNDER_4_5: 0
    },
    BTTS: {
      YES: 0,
      NO: 0
    },
    HANDICAP: {
      HOME_MINUS_0_5: 0,
      HOME_PLUS_0_5: 0,
      AWAY_MINUS_0_5: 0,
      AWAY_PLUS_0_5: 0,
      HOME_MINUS_1_5: 0,
      HOME_PLUS_1_5: 0,
      AWAY_MINUS_1_5: 0,
      AWAY_PLUS_1_5: 0
    },
    HOME_TEAM_GOALS: {
      OVER_0_5: 0,
      OVER_1_5: 0
    },
    AWAY_TEAM_GOALS: {
      OVER_0_5: 0,
      OVER_1_5: 0
    }
  };
  let total = 0;
  const cells = [];
  for (let h = 0; h <= 7; h++) {
    for (let a = 0; a <= 7; a++) {
      const p = poisson(
        h,
        hx
      ) * poisson(
        a,
        ax
      );
      cells.push([
        h,
        a,
        p
      ]);
      total += p;
    }
  }
  for (const [
    remainingH,
    remainingA,
    raw
  ] of cells) {
    const h = remainingH + homeGoals;
    const a = remainingA + awayGoals;
    const p = raw / total;
    const g = h + a;
    if (h > a) {
      out.MATCH_RESULT.HOME += p;
    } else if (h === a) {
      out.MATCH_RESULT.DRAW += p;
    } else {
      out.MATCH_RESULT.AWAY += p;
    }
    const diff = h - a;
    if (diff >= 1)
      out.HANDICAP.HOME_MINUS_0_5 += p;
    if (diff >= 0)
      out.HANDICAP.HOME_PLUS_0_5 += p;
    if (diff <= -1)
      out.HANDICAP.AWAY_MINUS_0_5 += p;
    if (diff <= 0)
      out.HANDICAP.AWAY_PLUS_0_5 += p;
    if (diff >= 2)
      out.HANDICAP.HOME_MINUS_1_5 += p;
    if (diff >= -1)
      out.HANDICAP.HOME_PLUS_1_5 += p;
    if (diff <= -2)
      out.HANDICAP.AWAY_MINUS_1_5 += p;
    if (diff <= 1)
      out.HANDICAP.AWAY_PLUS_1_5 += p;
    if (g > 1) {
      out.TOTAL_GOALS.OVER_1_5 += p;
    }
    if (g > 2) {
      out.TOTAL_GOALS.OVER_2_5 += p;
    }
    if (g > 3) {
      out.TOTAL_GOALS.OVER_3_5 += p;
    }
    if (g < 4) {
      out.TOTAL_GOALS.UNDER_3_5 += p;
    }
    if (g < 5) {
      out.TOTAL_GOALS.UNDER_4_5 += p;
    }
    if (h > 0 && a > 0) {
      out.BTTS.YES += p;
    }
    if (h > 0) {
      out.HOME_TEAM_GOALS.OVER_0_5 += p;
    }
    if (h > 1) {
      out.HOME_TEAM_GOALS.OVER_1_5 += p;
    }
    if (a > 0) {
      out.AWAY_TEAM_GOALS.OVER_0_5 += p;
    }
    if (a > 1) {
      out.AWAY_TEAM_GOALS.OVER_1_5 += p;
    }
  }
  out.DOUBLE_CHANCE = {
    HOME_OR_DRAW: out.MATCH_RESULT.HOME + out.MATCH_RESULT.DRAW,
    DRAW_OR_AWAY: out.MATCH_RESULT.DRAW + out.MATCH_RESULT.AWAY,
    HOME_OR_AWAY: out.MATCH_RESULT.HOME + out.MATCH_RESULT.AWAY
  };
  out.BTTS.NO = 1 - out.BTTS.YES;
  for (const selections of Object.values(out)) {
    for (const key of Object.keys(selections))
      selections[key] = clamp4(selections[key], 0, 1);
  }
  return out;
}
__name(probabilities, "probabilities");
function quality(home, away, ctx = {}) {
  return clamp4(
    clamp4(
      num4(
        home.sampleSize
      ) / 10,
      0,
      1
    ) * 0.25 + clamp4(
      num4(
        away.sampleSize
      ) / 10,
      0,
      1
    ) * 0.25 + clamp4(
      num4(
        home.lineupCertainty,
        0.7
      ),
      0,
      1
    ) * 0.15 + clamp4(
      num4(
        away.lineupCertainty,
        0.7
      ),
      0,
      1
    ) * 0.15 + clamp4(
      num4(
        ctx.competitionReliability,
        0.75
      ),
      0,
      1
    ) * 0.2,
    0,
    1
  );
}
__name(quality, "quality");
function analyzeMatch(input) {
  const home = input.home || {};
  const away = input.away || {};
  const ctx = input.context || {};
  const xg = expectedGoals(
    home,
    away,
    ctx
  );
  const probs = probabilities(
    xg.home,
    xg.away
  );
  return {
    modelVersion: MODEL_VERSION,
    coreUsesSportsbookOdds: false,
    homeTeam: input.homeTeam || null,
    awayTeam: input.awayTeam || null,
    expectedGoals: xg,
    intelligence: {
      home: {
        formPPG: home.formPointsPerGame,
        venuePPG: home.homePointsPerGame,
        winRate: home.winRate,
        cleanSheetRate: home.cleanSheetRate,
        failedToScoreRate: home.failedToScoreRate,
        sampleSize: home.sampleSize
      },
      away: {
        formPPG: away.formPointsPerGame,
        venuePPG: away.awayPointsPerGame,
        winRate: away.winRate,
        cleanSheetRate: away.cleanSheetRate,
        failedToScoreRate: away.failedToScoreRate,
        sampleSize: away.sampleSize
      },
      marketProfile: { home: home.marketProfile || null, away: away.marketProfile || null },
      source: "API-Football team statistics + Two45 independent weighting"
    },
    dataQuality: quality(
      home,
      away,
      ctx
    ),
    competitionReliability: clamp4(
      num4(
        ctx.competitionReliability,
        0.75
      ),
      0,
      1
    ),
    lineupCertainty: clamp4(
      (num4(
        home.lineupCertainty,
        0.7
      ) + num4(
        away.lineupCertainty,
        0.7
      )) / 2,
      0,
      1
    ),
    probabilities: probs,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(analyzeMatch, "analyzeMatch");
function flatten(probs) {
  const out = [];
  for (const [
    market,
    selections
  ] of Object.entries(
    probs
  )) {
    for (const [
      selection,
      p
    ] of Object.entries(
      selections
    )) {
      out.push({
        market,
        selection,
        probability: p,
        fairOdds: p > 0 ? 1 / p : null
      });
    }
  }
  return out;
}
__name(flatten, "flatten");
function selectIndependent(analysis, marketOdds = [], competitionTier = 4) {
  const tier = Math.max(1, Math.min(4, Number(competitionTier) || 4));
  const tierGate = {
    1: { strongQ: 0.52, riskyQ: 0.46, convictionQ: 0.5, winFloor: 0.66, o25Floor: 0.61 },
    2: { strongQ: 0.58, riskyQ: 0.5, convictionQ: 0.57, winFloor: 0.7, o25Floor: 0.64 },
    3: { strongQ: 0.64, riskyQ: 0.54, convictionQ: 0.64, winFloor: 0.73, o25Floor: 0.67 },
    4: { strongQ: 0.68, riskyQ: 0.56, convictionQ: 0.7, winFloor: 0.76, o25Floor: 0.7 }
  }[tier];
  const modeled = flatten(
    analysis.probabilities
  );
  const strong = [];
  const risky = [];
  const modelConvictionWatch = [];
  for (const group of marketOdds) {
    const valid = (group.outcomes || []).filter(
      (x) => num4(
        x.odds
      ) > 1
    );
    const sum = valid.reduce(
      (s, x) => s + 1 / num4(
        x.odds
      ),
      0
    );
    if (valid.length < 2 || sum <= 0) {
      continue;
    }
    for (const price of valid) {
      const m = modeled.find(
        (x) => x.market === group.market && x.selection === price.selection
      );
      if (!m) {
        continue;
      }
      const nv = 1 / num4(
        price.odds
      ) / sum * (group.market === "DOUBLE_CHANCE" ? 2 : 1);
      const edge = m.probability - nv;
      const candidate = {
        ...m,
        rawMarket: group.rawMarket,
        bookmaker: group.bookmaker || null,
        sportsbookOdds: num4(
          price.odds
        ),
        noVigMarketProbability: nv,
        valueEdge: edge,
        analysisSource: "independent-model",
        dataQuality: analysis.dataQuality,
        competitionReliability: analysis.competitionReliability,
        qualificationMode: "MODEL_PLUS_MARKET"
      };
      if (!priceCoherentV60(m.probability, candidate.sportsbookOdds))
        continue;
      const pricedConviction = tier <= 2 &&
        analysis.dataQuality >= tierGate.convictionQ &&
        edge >= (tier === 1 ? -0.08 : -0.05) &&
        (
          (m.market === "MATCH_RESULT" && ["HOME","AWAY"].includes(String(m.selection)) && m.probability >= tierGate.winFloor) ||
          (m.market === "DOUBLE_CHANCE" && m.probability >= (tier === 1 ? 0.74 : 0.77)) ||
          (m.market === "HANDICAP" && /PLUS_0_5$/.test(String(m.selection)) && m.probability >= (tier === 1 ? 0.74 : 0.77)) ||
          (m.market === "TOTAL_GOALS" && m.selection === "OVER_1_5" && m.probability >= (tier === 1 ? 0.74 : 0.77)) ||
          (m.market === "TOTAL_GOALS" && m.selection === "OVER_2_5" && m.probability >= (tier === 1 ? 0.66 : 0.69)) ||
          (m.market === "BTTS" && m.selection === "YES" && m.probability >= (tier === 1 ? 0.66 : 0.69))
        );
      if (
        (m.probability >= 0.64 && edge >= 0.035 && analysis.dataQuality >= tierGate.strongQ) ||
        pricedConviction
      ) {
        strong.push({
          ...candidate,
          qualificationMode: pricedConviction && edge < 0.035 ? "MODEL_CONVICTION_PRICED" : candidate.qualificationMode
        });
      } else if (candidate.sportsbookOdds >= 1.35 && analysis.dataQuality >= tierGate.riskyQ) {
        const floor = candidate.sportsbookOdds >= 3.5 ? 0.26 : candidate.sportsbookOdds >= 2.75 ? 0.3 : candidate.sportsbookOdds >= 2 ? 0.34 : candidate.sportsbookOdds >= 1.6 ? 0.48 : 0.56;
        const edgeFloor = candidate.sportsbookOdds >= 3.5 ? 0.015 : candidate.sportsbookOdds >= 2 ? 0.02 : 0.025;
        if (m.probability >= floor && edge >= edgeFloor) {
          risky.push(
            candidate
          );
        }
      }
    }
  }
  const corePreference = /* @__PURE__ */ __name((market) => ({
    DOUBLE_CHANCE: 0.02,
    HANDICAP: 0.022,
    TOTAL_CORNERS: 0.02,
    CORNERS_HANDICAP: 0.018,
    TOTAL_SHOTS: 0.018,
    TOTAL_SHOTS_ON_TARGET: 0.022,
    TOTAL_SHOTS_OFF_TARGET: 0.012,
    HOME_PLAYER_SHOTS: 0.01,
    AWAY_PLAYER_SHOTS: 0.01,
    HOME_PLAYER_SHOTS_ON_TARGET: 0.012,
    AWAY_PLAYER_SHOTS_ON_TARGET: 0.012,
    TOTAL_GOALS: 8e-3,
    HOME_TEAM_GOALS: 0.01,
    AWAY_TEAM_GOALS: 0.01,
    BTTS: 0.01,
    MATCH_RESULT: tier <= 2 ? 0.018 : -5e-3
  })[market] || 0, "corePreference");
  const selectionAdjustment = /* @__PURE__ */ __name((x) => {
    const s = String(x?.selection || "");
    if (x?.market === "TOTAL_GOALS" && s === "UNDER_4_5") {
      const priced = num4(x?.sportsbookOdds, 0);
      const edge = num4(x?.valueEdge, 0);
      return priced >= 1.45 && edge >= 0.035 ? -0.01 : -0.05;
    }
    if (tier <= 2 && x?.market === "TOTAL_GOALS" && s === "OVER_3_5")
      return tier === 1 ? 0.045 : 0.028;
    if (tier <= 2 && x?.market === "TOTAL_GOALS" && s === "OVER_2_5")
      return tier === 1 ? 0.03 : 0.018;
    if (tier <= 2 && x?.market === "MATCH_RESULT" && (s === "HOME" || s === "AWAY"))
      return tier === 1 ? 0.028 : 0.015;
    return 0;
  }, "selectionAdjustment");
  for (const m of modeled) {
    if (!["TOTAL_GOALS", "DOUBLE_CHANCE", "HANDICAP", "HOME_TEAM_GOALS", "AWAY_TEAM_GOALS", "BTTS", "MATCH_RESULT"].includes(m.market))
      continue;
    const floor = m.market === "MATCH_RESULT" ? tierGate.winFloor : m.market === "TOTAL_GOALS" && m.selection === "OVER_3_5" ? tier === 1 ? 0.58 : tier === 2 ? 0.62 : 0.68 : m.market === "TOTAL_GOALS" && m.selection === "OVER_2_5" ? tierGate.o25Floor : m.market === "HANDICAP" ? 0.7 : m.market === "BTTS" ? 0.73 : m.selection === "UNDER_4_5" ? 0.8 : 0.72;
    const qualityGate = analysis.competitionReliability >= 0.86 ? Math.max(0.48, tierGate.convictionQ - 0.02) : tierGate.convictionQ;
    if (m.probability < floor || analysis.dataQuality < qualityGate)
      continue;
    const exists = strong.some((x) => x.market === m.market && x.selection === m.selection);
    if (exists)
      continue;
    const candidate = {
      ...m,
      rawMarket: m.market,
      bookmaker: null,
      sportsbookOdds: null,
      noVigMarketProbability: null,
      valueEdge: 0,
      dataQuality: analysis.dataQuality,
      competitionReliability: analysis.competitionReliability,
      qualificationMode: "MODEL_CONVICTION",
      analysisSource: "independent-model-conviction"
    };
    if (m.probability >= floor + 0.03 || analysis.competitionReliability >= 0.86 && m.probability >= floor + 0.01) {
      for (let i = risky.length - 1; i >= 0; i--) {
        if (risky[i].market === m.market && risky[i].selection === m.selection)
          risky.splice(i, 1);
      }
      modelConvictionWatch.push(candidate);
    }
  }
  const consensus = consensusCandidates(marketOdds);
  const watch = [...modelConvictionWatch];
  for (const m of modeled) {
    if (num4(m.probability, 0) < 0.5)
      continue;
    if (m.market === "TOTAL_GOALS" && String(m.selection) === "UNDER_4_5")
      continue;
    const alreadyQualified = strong.some((x) => x.market === m.market && x.selection === m.selection) || risky.some((x) => x.market === m.market && x.selection === m.selection);
    if (alreadyQualified)
      continue;
    watch.push({
      ...m,
      rawMarket: m.market,
      bookmaker: null,
      sportsbookOdds: null,
      noVigMarketProbability: null,
      valueEdge: null,
      bookmakerCount: null,
      dataQuality: analysis.dataQuality,
      competitionReliability: analysis.competitionReliability,
      qualificationMode: "MODEL_WATCH",
      analysisSource: "independent-model-watch"
    });
  }
  for (const c of consensus) {
    if (!priceCoherentV60(c.probability, c.sportsbookOdds))
      continue;
    if (c.probability >= 0.5 && c.sportsbookOdds > 1) {
      watch.push({
        ...c,
        dataQuality: analysis.dataQuality,
        competitionReliability: analysis.competitionReliability,
        qualificationMode: "MARKET_WATCH",
        analysisSource: c.bookmakerCount >= 2 ? "cross-book-market-watch" : "single-book-market-watch"
      });
    }
    if ([
      "MATCH_RESULT",
      "DOUBLE_CHANCE",
      "HANDICAP",
      // Core handicap picks require independent model support.
      "TOTAL_GOALS",
      "BTTS",
      "HOME_TEAM_GOALS",
      "AWAY_TEAM_GOALS"
    ].includes(
      c.market
    )) {
      continue;
    }
    if (c.bookmakerCount < 2) {
      continue;
    }
    if (c.probability >= 0.64 && c.valueEdge >= 0.025 && analysis.dataQuality >= 0.62) {
      strong.push(c);
    } else if (c.sportsbookOdds >= 2 && analysis.dataQuality >= 0.52) {
      const floor = c.sportsbookOdds >= 3.5 ? 0.26 : c.sportsbookOdds >= 2.75 ? 0.29 : 0.33;
      const edgeFloor = c.sportsbookOdds >= 3.5 ? 0.012 : 0.018;
      if (c.probability >= floor && c.valueEdge >= edgeFloor) {
        risky.push(c);
      }
    }
  }
  const score = /* @__PURE__ */ __name((x) => {
    const odds = num4(x.sportsbookOdds, 0);
    const usablePrice = odds > 1 ? clamp4((odds - 1.15) / 1.35, 0, 1) : 0;
    return x.probability * 0.5 + clamp4(num4(x.dataQuality, analysis.dataQuality), 0, 1) * 0.14 + clamp4(num4(x.competitionReliability, analysis.competitionReliability), 0, 1) * 0.1 + Math.max(0, num4(x.valueEdge, 0)) * 0.16 + usablePrice * 0.06 + corePreference(x.market) + selectionAdjustment(x);
  }, "score");
  strong.sort(
    (a, b2) => score(b2) - score(a)
  );
  risky.sort(
    (a, b2) => score(b2) - score(a)
  );
  const rankedCandidates = [
    ...strong.slice(0, 12),
    ...risky.slice(0, 12),
    ...watch.sort((a, b2) => score(b2) - score(a)).slice(0, 20)
  ].sort((a, b2) => {
    const qa = strong.includes(a) ? 2 : risky.includes(a) ? 1 : 0;
    const qb = strong.includes(b2) ? 2 : risky.includes(b2) ? 1 : 0;
    return qb - qa || score(b2) - score(a);
  });
  const diverseTop = [];
  const seenMarkets = /* @__PURE__ */ new Set();
  for (const x of rankedCandidates) {
    if (x.market === "TOTAL_GOALS" && String(x.selection) === "UNDER_4_5" && rankedCandidates.some((y) => y.market !== "TOTAL_GOALS"))
      continue;
    if (seenMarkets.has(x.market))
      continue;
    diverseTop.push(x);
    seenMarkets.add(x.market);
    if (diverseTop.length >= 8)
      break;
  }
  if (diverseTop.length < 8) {
    for (const x of rankedCandidates) {
      if (diverseTop.includes(x))
        continue;
      diverseTop.push(x);
      if (diverseTop.length >= 8)
        break;
    }
  }
  const topMarkets = diverseTop.map((x) => ({
    market: x.market,
    selection: x.selection,
    probability: x.probability,
    sportsbookOdds: x.sportsbookOdds,
    bookmaker: x.bookmaker,
    bookmakerCount: x.bookmakerCount ?? null,
    valueEdge: x.valueEdge,
    analysisSource: x.analysisSource,
    lane: strong.includes(x) ? "STRONG" : risky.includes(x) ? "RISKY_VALUE" : "WATCH"
  }));
  const nonU45Strong = strong.find(
    (x) => !(x.market === "TOTAL_GOALS" && String(x.selection) === "UNDER_4_5")
  );
  const nonU45Risky = risky.find(
    (x) => !(x.market === "TOTAL_GOALS" && String(x.selection) === "UNDER_4_5")
  );
  const baseStrong = nonU45Strong || strong[0] || null;
  const audacityRank = /* @__PURE__ */ __name((x) => {
    const s = String(x?.selection || "");
    if (x?.market === "TOTAL_GOALS" && s === "OVER_3_5")
      return 5;
    if (x?.market === "MATCH_RESULT" && (s === "HOME" || s === "AWAY"))
      return 4;
    if (x?.market === "TOTAL_GOALS" && s === "OVER_2_5")
      return 4;
    if (x?.market === "BTTS" && s === "YES")
      return 3;
    if (x?.market === "HOME_TEAM_GOALS" || x?.market === "AWAY_TEAM_GOALS")
      return 3;
    if (x?.market === "HANDICAP" && /MINUS/.test(s))
      return 3;
    if (x?.market === "TOTAL_GOALS" && s === "OVER_1_5")
      return 1;
    if (x?.market === "TOTAL_GOALS" && (s === "UNDER_3_5" || s === "UNDER_4_5"))
      return 0;
    if (x?.market === "DOUBLE_CHANCE")
      return 0;
    if (x?.market === "HANDICAP" && /PLUS_(0_5|1_5)/.test(s))
      return 0;
    return 2;
  }, "audacityRank");
  const audaciousStrong = tier <= 2 && baseStrong ? strong.filter(
    (x) => audacityRank(x) > audacityRank(baseStrong) && num4(x.probability, 0) >= Math.max(0.58, num4(baseStrong.probability, 0) - (tier === 1 ? 0.16 : 0.12)) && analysis.dataQuality >= (tier === 1 ? 0.5 : 0.56) && score(x) >= score(baseStrong) - (tier === 1 ? 0.075 : 0.055)
  ).sort((a, b2) => audacityRank(b2) - audacityRank(a) || score(b2) - score(a))[0] : null;
  const b = audaciousStrong || nonU45Strong || strong[0] || nonU45Risky || risky[0];
  if (!b) {
    return {
      decision: "NO_BET",
      reason: "No market passed the final Two45 bet gate, but alternative market signals are shown for analysis.",
      topMarkets
    };
  }
  const isRisky = !strong.length;
  return {
    decision: "PICK",
    pickType: isRisky ? "RISKY_VALUE" : "STRONG_PICK",
    riskLabel: isRisky ? "Higher variance \u2014 model/market edge detected" : "Standard Two45 qualification",
    market: b.market,
    selection: b.selection,
    probability: b.probability,
    fairOdds: b.fairOdds,
    sportsbookOdds: b.sportsbookOdds,
    bookmaker: b.bookmaker,
    noVigMarketProbability: b.noVigMarketProbability,
    valueEdge: b.valueEdge,
    analysisSource: b.analysisSource,
    topMarkets,
    confidenceTier: isRisky ? "RISKY" : b.probability >= 0.78 && analysis.dataQuality >= 0.82 ? "A" : b.probability >= 0.7 && analysis.dataQuality >= 0.75 ? "B" : "C"
  };
}
__name(selectIndependent, "selectIndependent");
async function requeueStale(env) {
  return await sb(
    env,
    "rpc/two45_requeue_stale_feature_jobs",
    {
      method: "POST",
      body: JSON.stringify({
        p_stale_minutes: 5
      })
    }
  );
}
__name(requeueStale, "requeueStale");
async function patchJob(env, id, patch) {
  return await sb(
    env,
    `two45_feature_jobs?id=eq.${encodeURIComponent(
      id
    )}`,
    {
      method: "PATCH",
      body: JSON.stringify(
        patch
      )
    }
  );
}
__name(patchJob, "patchJob");
function analysisKeyV2(job, modelVersion = MODEL_VERSION) {
  return `${modelVersion}:${Number(job.fixture_id)}`;
}
__name(analysisKeyV2, "analysisKeyV2");
async function ensureAnalysisRowsV2(env, jobs = []) {
  const rows = [];
  for (const job of jobs) {
    if (!job?.fixture_id)
      continue;
    rows.push({
      analysis_key: analysisKeyV2(job),
      fixture_id: Number(job.fixture_id),
      provider_match_id: String(job.provider_match_id || job.fixture_id),
      model_version: MODEL_VERSION,
      kickoff_at: job.kickoff_at,
      competition: job.competition || null,
      home_team: job.home_team,
      away_team: job.away_team,
      status: "PENDING",
      refreshing: false,
      priority: num4(job.priority, 100),
      attempts: 0,
      requested_at: job.requested_at || (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      source_snapshot_key: job.source_snapshot_key || null,
      legacy_source: false
    });
  }
  for (let i = 0; i < rows.length; i += 100) {
    await sb(env, "two45_analysis_state?on_conflict=analysis_key", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: JSON.stringify(rows.slice(i, i + 100))
    });
  }
}
__name(ensureAnalysisRowsV2, "ensureAnalysisRowsV2");
async function canonicalAnalysisRowsV2(env, fixtureIds = []) {
  if (!fixtureIds.length)
    return [];
  return await rowsForIdsV19(env, "two45_analysis_state", "fixture_id", fixtureIds);
}
__name(canonicalAnalysisRowsV2, "canonicalAnalysisRowsV2");
function canonicalForecastV2(row) {
  if (!row || row.status !== "COMPLETE")
    return null;
  const result = row.result || {};
  if (result.forecast && typeof result.forecast === "object") {
    return {
      ...result.forecast,
      canonicalStatus: row.status,
      canonicalModelVersion: row.model_version,
      canonicalCompletedAt: row.completed_at,
      generatedAt: result.forecast.generatedAt || row.completed_at,
      createdAt: result.forecast.createdAt || row.completed_at
    };
  }
  if (result.forecast_key || result.probability_snapshot || result.feature_snapshot) {
    return {
      ...forecastRowToClient(result),
      canonicalStatus: row.status,
      canonicalModelVersion: row.model_version,
      canonicalCompletedAt: row.completed_at,
      generatedAt: row.completed_at,
      createdAt: row.completed_at
    };
  }
  return null;
}
__name(canonicalForecastV2, "canonicalForecastV2");
async function currentCanonicalAnalysisV2(env, fixtureId) {
  const rows = await sb(
    env,
    `two45_analysis_state?fixture_id=eq.${encodeURIComponent(fixtureId)}&model_version=eq.${encodeURIComponent(MODEL_VERSION)}&select=*&limit=1`
  );
  return arr2(rows)[0] || null;
}
__name(currentCanonicalAnalysisV2, "currentCanonicalAnalysisV2");
async function beginCanonicalAnalysisV2(env, job) {
  const key = analysisKeyV2(job);
  const current = await currentCanonicalAnalysisV2(env, job.fixture_id).catch(() => null);
  const hasResult = current?.result && typeof current.result === "object" && Object.keys(current.result).length > 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const body = {
    status: hasResult ? "COMPLETE" : "PROCESSING",
    refreshing: hasResult,
    started_at: now,
    updated_at: now,
    attempts: num4(current?.attempts, 0) + 1,
    last_error: null,
    next_retry_at: null,
    priority: num4(job.priority, current?.priority || 100),
    requested_at: current?.requested_at || job.requested_at || now
  };
  const rows = await sb(
    env,
    `two45_analysis_state?analysis_key=eq.${encodeURIComponent(key)}&select=*`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
  return arr2(rows)[0] || current;
}
__name(beginCanonicalAnalysisV2, "beginCanonicalAnalysisV2");
async function completeCanonicalAnalysisV2(env, job, forecast, analysis, decision) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const alternatives = Array.isArray(forecast?.alternatives) ? forecast.alternatives : [];
  const body = {
    analysis_key: analysisKeyV2(job),
    fixture_id: Number(job.fixture_id),
    provider_match_id: String(job.provider_match_id || job.fixture_id),
    model_version: MODEL_VERSION,
    kickoff_at: job.kickoff_at,
    competition: job.competition || null,
    home_team: job.home_team,
    away_team: job.away_team,
    status: "COMPLETE",
    refreshing: false,
    priority: num4(job.priority, 100),
    attempts: 0,
    requested_at: job.requested_at || now,
    started_at: now,
    completed_at: now,
    updated_at: now,
    next_retry_at: null,
    last_error: null,
    result: {
      forecast,
      probabilityBoard: analysis?.probabilities || {},
      marketOptions: decision?.topMarkets || [],
      researchMarketOptions: decision?.researchMarketOptions || [],
      intelligence: analysis?.intelligence || null,
      shadowContext: {
        homeTeamId: Number(job.home_team_id),
        awayTeamId: Number(job.away_team_id),
        fixtureId: Number(job.fixture_id)
      }
    },
    options_count: alternatives.length,
    data_quality: analysis?.dataQuality ?? null,
    decision: decision?.decision || "NO_BET",
    source_snapshot_key: job.source_snapshot_key || null,
    legacy_source: false,
    shadow_attempted: Boolean(
      analysis?.intelligence?.availability?.shadowV40Attempted || analysis?.intelligence?.shadowMarketModel || analysis?.intelligence?.shadowMarketRanking
    )
  };
  await sb(env, "two45_analysis_state?on_conflict=analysis_key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(body)
  });
  return body;
}
__name(completeCanonicalAnalysisV2, "completeCanonicalAnalysisV2");
async function recoverCanonicalAnalysisV2(env) {
  try {
    return await sb(env, "rpc/two45_recover_stale_analysis", {
      method: "POST",
      body: JSON.stringify({ p_timeout_minutes: 5 })
    });
  } catch (_) {
    return null;
  }
}
__name(recoverCanonicalAnalysisV2, "recoverCanonicalAnalysisV2");
async function analysisHealthV2(env, date = easternDate()) {
  const [rows, cronRow] = await Promise.all([
    sb(env, "rpc/two45_analysis_health", {
      method: "POST",
      timeoutMs: 6e3,
      body: JSON.stringify({ p_date: date, p_model_version: MODEL_VERSION })
    }),
    getFeedSnapshot(env, "cron-status").catch(() => null)
  ]);
  const health = arr2(rows)[0] || {};
  const heartbeatAt = cronRow?.payload?.heartbeatAt || cronRow?.payload?.completedAt || cronRow?.refreshed_at || null;
  const heartbeatAgeMs = heartbeatAt ? Math.max(0, Date.now() - Date.parse(heartbeatAt)) : null;
  const automationActive = heartbeatAgeMs != null && heartbeatAgeMs < 18e4;
  return {
    date,
    modelVersion: MODEL_VERSION,
    fixturesTotal: num4(health.fixtures_total),
    pending: num4(health.pending),
    processing: num4(health.processing),
    complete: num4(health.complete),
    failed: num4(health.failed),
    refreshing: num4(health.refreshing),
    oldestPending: health.oldest_pending || null,
    lastCompletedAt: health.last_completed_at || null,
    heartbeatAt,
    heartbeatAgeMs,
    automationActive,
    pipelineStatus: cronRow?.payload?.status || null
  };
}
__name(analysisHealthV2, "analysisHealthV2");
async function eliteIntelligenceSnapshotV86(env, date = easternDate(), persist = false) {
  const fixtureSnap = await fixtureSnapshotV19(env, date);
  const fixtures = arr2(fixtureSnap?.fixtures).filter((f) => competitionTierV21(f?.league?.name, f?.league?.id) <= 2).filter((f) => isEliteResearchFixture(f));
  const ids = fixtures.map(fixtureIdV19).filter(Number.isFinite);
  const rows = ids.length ? await canonicalAnalysisRowsV2(env, ids) : [];
  const current = new Map(
    rows.filter((r) => r?.model_version === MODEL_VERSION).map((r) => [Number(r.fixture_id), r])
  );
  const input = fixtures.map((f) => {
    const row = current.get(fixtureIdV19(f));
    const result = row?.result || {};
    return {
      fixtureId: fixtureIdV19(f),
      kickoff: f?.fixture?.date || row?.kickoff_at || null,
      competition: f?.league?.name || row?.competition || null,
      competitionTier: competitionTierV21(f?.league?.name || row?.competition, f?.league?.id),
      home: f?.teams?.home?.name || row?.home_team || null,
      away: f?.teams?.away?.name || row?.away_team || null,
      analysisStatus: row?.status || "MISSING",
      dataQuality: row?.data_quality ?? null,
      probabilityBoard: result?.probabilityBoard || {},
      intelligence: result?.intelligence || null
    };
  });
  const review = buildEliteSlateReview(input);
  const hydratedReviews = await Promise.all(review.reviews.map(async (item) => {
    if (!item.researchEligible) {
      return { ...item, externalResearch: null, finalReviewEligible: false, reviewRecommendation: "NOT_QUEUED" };
    }
    const researchRow = await getFeedSnapshot(env, "elite-research:" + item.fixtureId).catch(() => null);
    const evidence = arr2(researchRow?.payload?.evidence);
    return applyExternalResearch(item, evidence);
  }));
  const reviewed = hydratedReviews.map((item) => {
    if (!item.finalReviewEligible) {
      return { ...item, finalReview: null, selectionExplanation: null };
    }
    const finalReview = evaluateEliteFinalReview(item);
    const selectionExplanation = explainEliteSelection(item, finalReview);
    return { ...item, finalReview, selectionExplanation };
  });
  const finalReviewQueue = review.slateComplete ? reviewed.filter((x) => x.finalReview?.approved).sort((a, b) => b.finalReview.finalConfidence - a.finalReview.finalConfidence) : [];
  const heldFinalReviews = reviewed.filter((x) => x.finalReview && !x.finalReview.approved);
  const contradicted = reviewed.filter((x) => x.researchStatus === "CONTRADICTED");
  const researchQueue = review.slateComplete ? reviewed.filter((x) => x.researchEligible && !x.finalReviewEligible && x.researchStatus !== "CONTRADICTED").sort((a, b) => b.evidenceScore - a.evidenceScore) : [];
  const payload = {
    ok: true,
    date,
    modelVersion: MODEL_VERSION,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...review,
    reviews: reviewed,
    researchQueue,
    researchEligible: reviewed.filter((x) => x.researchEligible).length,
    finalReviewReady: finalReviewQueue.length,
    finalReviewQueue,
    finalReviewHeld: heldFinalReviews.length,
    heldFinalReviews,
    explanationRevision: "2026-10-04-evidence-grounded-explanation-v92",
    contradictedCount: contradicted.length,
    contradicted
  };
  if (persist) {
    await saveFeedSnapshot(env, "elite-intelligence:" + date, payload, 172800).catch(() => null);
  }
  return payload;
}
__name(eliteIntelligenceSnapshotV86, "eliteIntelligenceSnapshotV86");
async function football(env, endpoint, params) {
  return providerFetchV18(env, endpoint.replace(/^\//, ""), params);
}
__name(football, "football");
function cutoff(kickoff) {
  const d = new Date(
    kickoff
  );
  d.setUTCDate(
    d.getUTCDate() - 1
  );
  return d.toISOString().slice(
    0,
    10
  );
}
__name(cutoff, "cutoff");
function formPPG(form) {
  const arr3 = String(
    form || ""
  ).toUpperCase().split("").filter(
    (x) => "WDL".includes(
      x
    )
  );
  if (!arr3.length) {
    return 1.5;
  }
  return arr3.reduce(
    (s, x) => s + (x === "W" ? 3 : x === "D" ? 1 : 0),
    0
  ) / arr3.length;
}
__name(formPPG, "formPPG");
function path(obj, keys, d = null) {
  let x = obj;
  for (const k of keys) {
    if (!x || typeof x !== "object") {
      return d;
    }
    x = x[k];
  }
  return x ?? d;
}
__name(path, "path");
function toFeatures(stats) {
  const sampleSize = num4(path(stats, ["fixtures", "played", "total"]), 0);
  const gf = num4(path(stats, ["goals", "for", "average", "total"]), 0);
  const ga = num4(path(stats, ["goals", "against", "average", "total"]), 0);
  const wins = num4(path(stats, ["fixtures", "wins", "total"]), 0);
  const draws = num4(path(stats, ["fixtures", "draws", "total"]), 0);
  const losses = num4(path(stats, ["fixtures", "loses", "total"]), 0);
  const homePlayed = num4(path(stats, ["fixtures", "played", "home"]), 0);
  const awayPlayed = num4(path(stats, ["fixtures", "played", "away"]), 0);
  const homePoints = num4(path(stats, ["fixtures", "wins", "home"]), 0) * 3 + num4(path(stats, ["fixtures", "draws", "home"]), 0);
  const awayPoints = num4(path(stats, ["fixtures", "wins", "away"]), 0) * 3 + num4(path(stats, ["fixtures", "draws", "away"]), 0);
  const cleanSheets = num4(path(stats, ["clean_sheet", "total"]), 0);
  const failedToScore = num4(path(stats, ["failed_to_score", "total"]), 0);
  const form = String(stats?.form || "");
  return {
    sampleSize,
    homeSampleSize: homePlayed,
    awaySampleSize: awayPlayed,
    goalsForAvg: gf,
    goalsAgainstAvg: ga,
    homeGoalsForAvg: num4(path(stats, ["goals", "for", "average", "home"]), gf),
    homeGoalsAgainstAvg: num4(path(stats, ["goals", "against", "average", "home"]), ga),
    awayGoalsForAvg: num4(path(stats, ["goals", "for", "average", "away"]), gf),
    awayGoalsAgainstAvg: num4(path(stats, ["goals", "against", "average", "away"]), ga),
    formPointsPerGame: formPPG(form),
    winRate: sampleSize ? wins / sampleSize : 0.33,
    drawRate: sampleSize ? draws / sampleSize : 0.27,
    lossRate: sampleSize ? losses / sampleSize : 0.4,
    homePointsPerGame: homePlayed ? homePoints / homePlayed : formPPG(form),
    awayPointsPerGame: awayPlayed ? awayPoints / awayPlayed : formPPG(form),
    cleanSheetRate: sampleSize ? cleanSheets / sampleSize : 0,
    failedToScoreRate: sampleSize ? failedToScore / sampleSize : 0,
    recentForm: form,
    lineupCertainty: 0.7,
    absenceImpact: 0
  };
}
__name(toFeatures, "toFeatures");
function summarizeRecentV211(fixtures, teamId) {
  const rows = fixtures.filter((f) => Number(f?.fixture?.timestamp || 0) > 0).sort((a, b) => Number(b.fixture.timestamp) - Number(a.fixture.timestamp)).slice(0, 8);
  let w = 0, d = 0, l = 0, gf = 0, ga = 0, btts = 0, over25 = 0, clean2 = 0, failed = 0, weight = 0, weightedPPG = 0;
  rows.forEach((f, i) => {
    const home = Number(f.teams?.home?.id) === teamId;
    const a = Number(home ? f.goals?.home : f.goals?.away);
    const b = Number(home ? f.goals?.away : f.goals?.home);
    if (!Number.isFinite(a) || !Number.isFinite(b))
      return;
    const wt = Math.pow(0.82, i);
    weight += wt;
    gf += a;
    ga += b;
    if (a > b) {
      w++;
      weightedPPG += 3 * wt;
    } else if (a === b) {
      d++;
      weightedPPG += wt;
    } else
      l++;
    if (a > 0 && b > 0)
      btts++;
    if (a + b >= 3)
      over25++;
    if (b === 0)
      clean2++;
    if (a === 0)
      failed++;
  });
  const n = Math.max(1, w + d + l);
  return {
    matches: w + d + l,
    wins: w,
    draws: d,
    losses: l,
    goalsForAvg: gf / n,
    goalsAgainstAvg: ga / n,
    bttsRate: btts / n,
    over25Rate: over25 / n,
    cleanSheetRate: clean2 / n,
    failedToScoreRate: failed / n,
    recencyWeightedPPG: weight ? weightedPPG / weight : 1.5
  };
}
__name(summarizeRecentV211, "summarizeRecentV211");
function summarizeH2HV211(fixtures, homeId, awayId) {
  const rows = fixtures.filter((f) => Number(f?.fixture?.timestamp || 0) > 0).sort((a, b) => Number(b.fixture.timestamp) - Number(a.fixture.timestamp)).slice(0, 5);
  let hw = 0, aw = 0, d = 0, total = 0, weight = 0, homeScore = 0;
  rows.forEach((f, i) => {
    const hIsHome = Number(f.teams?.home?.id) === homeId, hg = Number(f.goals?.home), ag = Number(f.goals?.away);
    if (!Number.isFinite(hg) || !Number.isFinite(ag))
      return;
    const homeGoals = hIsHome ? hg : ag, awayGoals = hIsHome ? ag : hg, wt = Math.pow(0.65, i);
    weight += wt;
    total += homeGoals + awayGoals;
    if (homeGoals > awayGoals) {
      hw++;
      homeScore += wt;
    } else if (homeGoals < awayGoals) {
      aw++;
    } else {
      d++;
      homeScore += 0.5 * wt;
    }
  });
  const n = Math.max(1, hw + aw + d);
  return { matches: hw + aw + d, homeWins: hw, awayWins: aw, draws: d, avgGoals: total / n, recencyWeightedHomeShare: weight ? homeScore / weight : 0.5 };
}
__name(summarizeH2HV211, "summarizeH2HV211");
function shadowV40Enabled(env) {
  const raw = String(env.TWO45_V40_SHADOW_ENABLED ?? "0").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(raw);
}
__name(shadowV40Enabled, "shadowV40Enabled");
async function shadowBudgetV46(env) {
  const key = "shadow-v40-budget:" + easternDate();
  const snap = await getFeedSnapshot(env, key).catch(() => null);
  const payload = snap?.payload || {};
  return {
    key,
    used: Math.max(0, num4(payload.used, 0)),
    cap: Math.max(50, num4(env.TWO45_V40_DAILY_CAP, SHADOW_V40_DEFAULT_DAILY_CAP))
  };
}
__name(shadowBudgetV46, "shadowBudgetV46");
async function reserveShadowCallV46(env, count = 1) {
  if (!shadowV40Enabled(env))
    return false;
  const budget = await shadowBudgetV46(env);
  if (budget.used + count > budget.cap)
    return false;
  await saveFeedSnapshot(env, budget.key, {
    used: budget.used + count,
    cap: budget.cap,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }, 2 * 86400).catch(() => null);
  return true;
}
__name(reserveShadowCallV46, "reserveShadowCallV46");
function statValueV40(rows, teamId, label) {
  const teamRow = arr2(rows).find((r) => Number(r?.team?.id) === Number(teamId));
  const stats = arr2(teamRow?.statistics);
  const wanted = String(label || "").toLowerCase();
  const hit = stats.find((s) => String(s?.type || "").toLowerCase() === wanted);
  const v = hit?.value;
  if (typeof v === "number")
    return v;
  if (typeof v === "string") {
    const n = Number(v.replace("%", "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
__name(statValueV40, "statValueV40");
function summarizeMarketProfileV40(samples, teamId) {
  const valid = arr2(samples).filter((x) => x && x.stats);
  const fields = [
    ["cornersFor", "Corner Kicks"],
    ["shotsFor", "Total Shots"],
    ["shotsOnTargetFor", "Shots on Goal"],
    ["yellowCardsFor", "Yellow Cards"],
    ["redCardsFor", "Red Cards"]
  ];
  const againstFields = [
    ["cornersAgainst", "Corner Kicks"],
    ["shotsAgainst", "Total Shots"],
    ["shotsOnTargetAgainst", "Shots on Goal"],
    ["yellowCardsAgainst", "Yellow Cards"],
    ["redCardsAgainst", "Red Cards"]
  ];
  const agg = {};
  for (const [key] of [...fields, ...againstFields])
    agg[key] = { sum: 0, weight: 0, count: 0 };
  valid.forEach((sample, i) => {
    const wt = Math.pow(0.82, i);
    for (const [key, label] of fields) {
      const v = statValueV40(sample.stats, teamId, label);
      if (!Number.isFinite(v))
        continue;
      agg[key].sum += v * wt;
      agg[key].weight += wt;
      agg[key].count++;
    }
    const opponentRow = arr2(sample.stats).find((r) => Number(r?.team?.id) !== Number(teamId));
    const opponentId = Number(opponentRow?.team?.id);
    if (Number.isFinite(opponentId)) {
      for (const [key, label] of againstFields) {
        const v = statValueV40(sample.stats, opponentId, label);
        if (!Number.isFinite(v))
          continue;
        agg[key].sum += v * wt;
        agg[key].weight += wt;
        agg[key].count++;
      }
    }
  });
  const out = { matches: valid.length };
  for (const [key] of fields) {
    const a = agg[key];
    out[key] = a.weight ? a.sum / a.weight : null;
    out[key + "Sample"] = a.count;
  }
  return out;
}
__name(summarizeMarketProfileV40, "summarizeMarketProfileV40");
async function recentMarketProfileV40(env, teamId, recentFixtures = [], cacheScope = "") {
  const ids = arr2(recentFixtures).filter((f) => Number(f?.fixture?.id) > 0).sort((a, b) => Number(b?.fixture?.timestamp || 0) - Number(a?.fixture?.timestamp || 0)).slice(0, 6).map((f) => Number(f.fixture.id));
  if (!ids.length)
    return { matches: 0, source: "none" };
  const cacheKey = "market-profile:v40:" + teamId + ":" + cacheScope + ":" + ids.join("-");
  const cached = await getFeedSnapshot(env, cacheKey).catch(() => null);
  if (cached?.payload?.profile)
    return { ...cached.payload.profile, source: "cache" };
  const samples = [];
  let newFetches = 0;
  const maxNewFetchesPerPass = 1;
  for (const fixtureId of ids) {
    try {
      const snapKey = "fixture-stats:" + fixtureId;
      const snap = await getFeedSnapshot(env, snapKey).catch(() => null);
      let stats = snap?.payload?.response || snap?.payload || null;
      if (!stats && newFetches < maxNewFetchesPerPass) {
        const allowed = await reserveShadowCallV46(env, 1);
        if (!allowed)
          continue;
        const r = await football(env, "/fixtures/statistics", { fixture: fixtureId });
        stats = r?.response || [];
        newFetches++;
        await saveFeedSnapshot(env, snapKey, { response: stats }, 7 * 864e5).catch(() => null);
      }
      if (stats)
        samples.push({ fixtureId, stats });
    } catch (_) {
    }
  }
  const profile = summarizeMarketProfileV40(samples, teamId);
  await saveFeedSnapshot(env, cacheKey, { profile }, 12 * 36e5).catch(() => null);
  return { ...profile, source: "api-football-recent-fixtures" };
}
__name(recentMarketProfileV40, "recentMarketProfileV40");
function poissonOverV40(lambda, line) {
  if (!Number.isFinite(lambda) || lambda <= 0)
    return null;
  const threshold = Math.floor(Number(line));
  let underEq = 0;
  for (let k = 0; k <= threshold; k++)
    underEq += poisson(k, lambda);
  return clamp4(1 - underEq, 0, 1);
}
__name(poissonOverV40, "poissonOverV40");
function poissonUnderV40(lambda, line) {
  const over = poissonOverV40(lambda, line);
  return over == null ? null : 1 - over;
}
__name(poissonUnderV40, "poissonUnderV40");
function blendedMeanV40(forAvg, oppAgainst, fallback) {
  const a = num4(forAvg, fallback);
  const b = num4(oppAgainst, fallback);
  return clamp4(a * 0.58 + b * 0.42, 0.05, fallback * 2.5);
}
__name(blendedMeanV40, "blendedMeanV40");
function shadowMarketProbabilitiesV40(homeProfile, awayProfile) {
  if (!homeProfile || !awayProfile)
    return {};
  const hc = blendedMeanV40(homeProfile.cornersFor, awayProfile.cornersAgainst, 5);
  const ac = blendedMeanV40(awayProfile.cornersFor, homeProfile.cornersAgainst, 4.5);
  const hs = blendedMeanV40(homeProfile.shotsFor, awayProfile.shotsAgainst, 12);
  const as = blendedMeanV40(awayProfile.shotsFor, homeProfile.shotsAgainst, 10.5);
  const hsot = blendedMeanV40(homeProfile.shotsOnTargetFor, awayProfile.shotsOnTargetAgainst, 4.3);
  const asot = blendedMeanV40(awayProfile.shotsOnTargetFor, homeProfile.shotsOnTargetAgainst, 3.8);
  const hy = blendedMeanV40(homeProfile.yellowCardsFor, awayProfile.yellowCardsAgainst, 2.1);
  const ay = blendedMeanV40(awayProfile.yellowCardsFor, homeProfile.yellowCardsAgainst, 2.1);
  const out = {
    HOME_CORNERS: {},
    AWAY_CORNERS: {},
    TOTAL_CORNERS: {},
    HOME_SHOTS: {},
    AWAY_SHOTS: {},
    TOTAL_SHOTS: {},
    HOME_SHOTS_ON_TARGET: {},
    AWAY_SHOTS_ON_TARGET: {},
    TOTAL_SHOTS_ON_TARGET: {},
    TOTAL_CARDS: {}
  };
  for (const line of [2.5, 3.5, 4.5, 5.5]) {
    out.HOME_CORNERS["OVER_" + String(line).replace(".", "_")] = poissonOverV40(hc, line);
    out.AWAY_CORNERS["OVER_" + String(line).replace(".", "_")] = poissonOverV40(ac, line);
  }
  for (const line of [8.5, 9.5, 10.5, 11.5]) {
    const key = String(line).replace(".", "_");
    out.TOTAL_CORNERS["OVER_" + key] = poissonOverV40(hc + ac, line);
    out.TOTAL_CORNERS["UNDER_" + key] = poissonUnderV40(hc + ac, line);
  }
  for (const line of [8.5, 10.5, 12.5, 14.5]) {
    out.HOME_SHOTS["OVER_" + String(line).replace(".", "_")] = poissonOverV40(hs, line);
    out.AWAY_SHOTS["OVER_" + String(line).replace(".", "_")] = poissonOverV40(as, line);
  }
  for (const line of [20.5, 22.5, 24.5, 26.5]) {
    const key = String(line).replace(".", "_");
    out.TOTAL_SHOTS["OVER_" + key] = poissonOverV40(hs + as, line);
    out.TOTAL_SHOTS["UNDER_" + key] = poissonUnderV40(hs + as, line);
  }
  for (const line of [1.5, 2.5, 3.5, 4.5]) {
    out.HOME_SHOTS_ON_TARGET["OVER_" + String(line).replace(".", "_")] = poissonOverV40(hsot, line);
    out.AWAY_SHOTS_ON_TARGET["OVER_" + String(line).replace(".", "_")] = poissonOverV40(asot, line);
  }
  for (const line of [5.5, 6.5, 7.5, 8.5]) {
    const key = String(line).replace(".", "_");
    out.TOTAL_SHOTS_ON_TARGET["OVER_" + key] = poissonOverV40(hsot + asot, line);
    out.TOTAL_SHOTS_ON_TARGET["UNDER_" + key] = poissonUnderV40(hsot + asot, line);
  }
  for (const line of [2.5, 3.5, 4.5, 5.5]) {
    const key = String(line).replace(".", "_");
    out.TOTAL_CARDS["OVER_" + key] = poissonOverV40(hy + ay, line);
    out.TOTAL_CARDS["UNDER_" + key] = poissonUnderV40(hy + ay, line);
  }
  return {
    expected: {
      homeCorners: hc,
      awayCorners: ac,
      homeShots: hs,
      awayShots: as,
      homeShotsOnTarget: hsot,
      awayShotsOnTarget: asot,
      homeYellowCards: hy,
      awayYellowCards: ay
    },
    probabilities: out,
    model: "two45-market-shadow-v40",
    calibrated: false
  };
}
__name(shadowMarketProbabilitiesV40, "shadowMarketProbabilitiesV40");
function marketSampleQualityV41(profile, market) {
  if (!profile)
    return 0;
  const map = {
    HOME_CORNERS: ["cornersForSample", "cornersAgainstSample"],
    AWAY_CORNERS: ["cornersForSample", "cornersAgainstSample"],
    TOTAL_CORNERS: ["cornersForSample", "cornersAgainstSample"],
    HOME_SHOTS: ["shotsForSample", "shotsAgainstSample"],
    AWAY_SHOTS: ["shotsForSample", "shotsAgainstSample"],
    TOTAL_SHOTS: ["shotsForSample", "shotsAgainstSample"],
    HOME_SHOTS_ON_TARGET: ["shotsOnTargetForSample", "shotsOnTargetAgainstSample"],
    AWAY_SHOTS_ON_TARGET: ["shotsOnTargetForSample", "shotsOnTargetAgainstSample"],
    TOTAL_SHOTS_ON_TARGET: ["shotsOnTargetForSample", "shotsOnTargetAgainstSample"],
    TOTAL_CARDS: ["yellowCardsForSample", "yellowCardsAgainstSample"]
  };
  const keys = map[market] || [];
  if (!keys.length)
    return 0;
  const vals = keys.map((k) => num4(profile[k], 0));
  return clamp4(vals.reduce((a, b) => a + b, 0) / (keys.length * 6), 0, 1);
}
__name(marketSampleQualityV41, "marketSampleQualityV41");
function conservativeCalibrateV41(rawProbability, evidenceQuality, competitionReliability2 = 0.75) {
  const p = clamp4(num4(rawProbability, 0.5), 0.01, 0.99);
  const q = clamp4(num4(evidenceQuality, 0), 0, 1);
  const r = clamp4(num4(competitionReliability2, 0.75), 0.55, 0.95);
  const confidence = clamp4(q * 0.72 + r * 0.28, 0.18, 0.95);
  return clamp4(0.5 + (p - 0.5) * confidence, 0.03, 0.97);
}
__name(conservativeCalibrateV41, "conservativeCalibrateV41");
function rankShadowMarketsV41(shadow, homeProfile, awayProfile, competitionReliability2 = 0.75, empiricalCalibration = {}) {
  const probs = shadow?.probabilities || {};
  const out = [];
  for (const [market, selections] of Object.entries(probs)) {
    const homeQuality = marketSampleQualityV41(homeProfile, market);
    const awayQuality = marketSampleQualityV41(awayProfile, market);
    const evidenceQuality = clamp4((homeQuality + awayQuality) / 2, 0, 1);
    for (const [selection, rawProbability] of Object.entries(selections || {})) {
      if (!Number.isFinite(Number(rawProbability)))
        continue;
      const provisionalProbability = conservativeCalibrateV41(rawProbability, evidenceQuality, competitionReliability2);
      const bucket = calibrationBucketV43(provisionalProbability);
      const empirical = empiricalCalibration?.buckets?.[market + "|" + bucket] || null;
      const empiricalN = num4(empirical?.settled, 0);
      const empiricalRate = empiricalN > 0 ? (num4(empirical?.wins, 0) + 1) / (empiricalN + 2) : null;
      const empiricalWeight = empiricalN >= 8 ? clamp4(empiricalN / (empiricalN + 32), 0, 0.72) : 0;
      const calibratedProbability = empiricalRate == null ? provisionalProbability : clamp4(
        provisionalProbability * (1 - empiricalWeight) + empiricalRate * empiricalWeight,
        0.03,
        0.97
      );
      const decisiveness = Math.abs(calibratedProbability - 0.5) * 2;
      const score = calibratedProbability * 0.62 + evidenceQuality * 0.26 + decisiveness * 0.12;
      out.push({
        market,
        selection,
        rawProbability,
        calibratedProbability,
        evidenceQuality,
        score,
        fairOdds: calibratedProbability > 0 ? 1 / calibratedProbability : null,
        calibrationMode: empiricalWeight > 0 ? "EMPIRICAL_BLEND" : "PROVISIONAL_SHRINKAGE",
        empiricalSampleSize: empiricalN,
        empiricalHitRate: empiricalRate
      });
    }
  }
  out.sort((a, b) => b.score - a.score);
  const diverse = [];
  const seen = /* @__PURE__ */ new Set();
  for (const x of out) {
    if (x.calibratedProbability < 0.55)
      continue;
    if (seen.has(x.market))
      continue;
    diverse.push(x);
    seen.add(x.market);
    if (diverse.length >= 8)
      break;
  }
  return {
    candidates: out.slice(0, 24),
    topMarkets: diverse,
    calibrationStatus: num4(empiricalCalibration?.settled, 0) >= 20 ? "EMPIRICAL_ACTIVE" : "PROVISIONAL",
    empiricalBacktestReady: num4(empiricalCalibration?.settled, 0) >= 20,
    empiricalSettled: num4(empiricalCalibration?.settled, 0),
    note: num4(empiricalCalibration?.settled, 0) >= 20 ? "Settled shadow results are blended into market calibration." : "Probabilities are conservatively shrunk until more settled shadow results accumulate."
  };
}
__name(rankShadowMarketsV41, "rankShadowMarketsV41");
function qualifyShadowDataDrivenV42(ranking, context = {}) {
  const candidates = Array.isArray(ranking?.topMarkets) ? ranking.topMarkets : [];
  const lineupCertainty = clamp4(num4(context.lineupCertainty, 0.7), 0, 1);
  const competitionReliability2 = clamp4(num4(context.competitionReliability, 0.75), 0, 1);
  return candidates.map((x) => {
    const evidence = clamp4(num4(x.evidenceQuality, 0), 0, 1);
    const p = clamp4(num4(x.calibratedProbability, 0.5), 0, 1);
    const dataDriven = evidence >= 0.5 && p >= 0.6 && competitionReliability2 >= 0.75;
    const confidenceScore = clamp4(
      p * 0.52 + evidence * 0.28 + competitionReliability2 * 0.12 + lineupCertainty * 0.08,
      0,
      1
    );
    return {
      ...x,
      dataDriven,
      label: dataDriven ? "DATA_DRIVEN" : "RESEARCHING",
      confidenceScore,
      evidenceStatus: evidence >= 0.75 ? "STRONG" : evidence >= 0.5 ? "USABLE" : "THIN",
      reasons: [
        "recent-market-profile",
        "opponent-against-profile",
        ranking?.calibrationStatus === "PROVISIONAL" ? "provisional-calibration" : "empirical-calibration"
      ]
    };
  });
}
__name(qualifyShadowDataDrivenV42, "qualifyShadowDataDrivenV42");
function selectionLineV43(selection) {
  const m = String(selection || "").match(/^(OVER|UNDER)_([0-9]+)_([0-9]+)$/);
  if (!m)
    return null;
  return { side: m[1], line: Number(m[2] + "." + m[3]) };
}
__name(selectionLineV43, "selectionLineV43");
function calibrationBucketV43(probability) {
  const p = clamp4(num4(probability, 0), 0, 1);
  const low = Math.floor(p * 10) / 10;
  const high = Math.min(1, low + 0.1);
  return low.toFixed(1) + "-" + high.toFixed(1);
}
__name(calibrationBucketV43, "calibrationBucketV43");
function gradeThresholdV43(value, selection) {
  const parsed = selectionLineV43(selection);
  if (!parsed || !Number.isFinite(Number(value)))
    return "UNGRADABLE";
  const v = Number(value);
  if (parsed.side === "OVER")
    return v > parsed.line ? "WIN" : "LOSS";
  if (parsed.side === "UNDER")
    return v < parsed.line ? "WIN" : "LOSS";
  return "UNGRADABLE";
}
__name(gradeThresholdV43, "gradeThresholdV43");
function gradeShadowMarketV43(market, selection, statsRows, homeTeamId, awayTeamId) {
  const homeCorners = statValueV40(statsRows, homeTeamId, "Corner Kicks");
  const awayCorners = statValueV40(statsRows, awayTeamId, "Corner Kicks");
  const homeShots = statValueV40(statsRows, homeTeamId, "Total Shots");
  const awayShots = statValueV40(statsRows, awayTeamId, "Total Shots");
  const homeSot = statValueV40(statsRows, homeTeamId, "Shots on Goal");
  const awaySot = statValueV40(statsRows, awayTeamId, "Shots on Goal");
  const homeY = statValueV40(statsRows, homeTeamId, "Yellow Cards");
  const awayY = statValueV40(statsRows, awayTeamId, "Yellow Cards");
  const values = {
    HOME_CORNERS: homeCorners,
    AWAY_CORNERS: awayCorners,
    TOTAL_CORNERS: Number.isFinite(homeCorners) && Number.isFinite(awayCorners) ? homeCorners + awayCorners : null,
    HOME_SHOTS: homeShots,
    AWAY_SHOTS: awayShots,
    TOTAL_SHOTS: Number.isFinite(homeShots) && Number.isFinite(awayShots) ? homeShots + awayShots : null,
    HOME_SHOTS_ON_TARGET: homeSot,
    AWAY_SHOTS_ON_TARGET: awaySot,
    TOTAL_SHOTS_ON_TARGET: Number.isFinite(homeSot) && Number.isFinite(awaySot) ? homeSot + awaySot : null,
    TOTAL_CARDS: Number.isFinite(homeY) && Number.isFinite(awayY) ? homeY + awayY : null
  };
  return gradeThresholdV43(values[market], selection);
}
__name(gradeShadowMarketV43, "gradeShadowMarketV43");
function buildShadowBacktestRowsV43(recommendations, finalStats, homeTeamId, awayTeamId) {
  return (Array.isArray(recommendations) ? recommendations : []).map((x) => ({
    market: x.market,
    selection: x.selection,
    rawProbability: x.rawProbability,
    calibratedProbability: x.calibratedProbability,
    evidenceQuality: x.evidenceQuality,
    dataDriven: Boolean(x.dataDriven),
    confidenceScore: x.confidenceScore,
    calibrationBucket: calibrationBucketV43(x.calibratedProbability),
    result: gradeShadowMarketV43(x.market, x.selection, finalStats, homeTeamId, awayTeamId)
  }));
}
__name(buildShadowBacktestRowsV43, "buildShadowBacktestRowsV43");
async function optionalIntelligenceV21(env, job) {
  const fixtureId = Number(job.fixture_id);
  const major = priorityCompetitionV20(job.competition, job.provider_league_id);
  const hours = (Date.parse(job.kickoff_at) - Date.now()) / 36e5;
  if (!major && hours > 18)
    return { source: "baseline", enriched: false };
  const key = `match-intelligence:${fixtureId}`;
  const cached = await getFeedSnapshot(env, key);
  const age = cached ? Date.now() - Date.parse(cached.refreshed_at) : Infinity;
  const ttl = hours <= 3 ? 2 * 36e5 : hours <= 18 ? 4 * 36e5 : 8 * 36e5;
  const cachedPayload = cached?.payload || null;
  const cachedHomeRecent = num4(cachedPayload?.homeRecent?.matches, 0) >= 3;
  const cachedAwayRecent = num4(cachedPayload?.awayRecent?.matches, 0) >= 3;
  const cachedRecentBalanced = cachedHomeRecent && cachedAwayRecent;
  if (cached && age < ttl && cachedRecentBalanced)
    return cachedPayload || { source: "cache", enriched: false };
  if (cached && age < 6e4)
    return cachedPayload || { source: "cache", enriched: false };
  const out = cachedPayload ? { ...cachedPayload, source: "API-Football enrichment", enriched: true, fixtureId, generatedAt: (/* @__PURE__ */ new Date()).toISOString() } : { source: "API-Football enrichment", enriched: true, fixtureId, generatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  let homeRecentFixtures = [];
  let awayRecentFixtures = [];
  if (!cachedHomeRecent) try {
    const recent = await football(env, "/fixtures", { league: job.provider_league_id, season: job.season, team: job.home_team_id, last: 8 });
    homeRecentFixtures = arr2(recent.response);
    out.homeRecent = summarizeRecentV211(homeRecentFixtures, Number(job.home_team_id));
    if (out.homeRecent.matches < 5) {
      const broad = await football(env, "/fixtures", { team: job.home_team_id, last: 8 });
      const broadSummary = summarizeRecentV211(arr2(broad.response), Number(job.home_team_id));
      if (broadSummary.matches > out.homeRecent.matches) {
        out.homeRecent = broadSummary;
        out.homeRecentSource = "all-competitions";
      }
    }
    delete out.homeRecentError;
  } catch (e) {
    out.homeRecentError = safeRefreshError(e);
  }
  if (!cachedAwayRecent) try {
    const recent = await football(env, "/fixtures", { league: job.provider_league_id, season: job.season, team: job.away_team_id, last: 8 });
    awayRecentFixtures = arr2(recent.response);
    out.awayRecent = summarizeRecentV211(awayRecentFixtures, Number(job.away_team_id));
    if (out.awayRecent.matches < 5) {
      const broad = await football(env, "/fixtures", { team: job.away_team_id, last: 8 });
      const broadSummary = summarizeRecentV211(arr2(broad.response), Number(job.away_team_id));
      if (broadSummary.matches > out.awayRecent.matches) {
        out.awayRecent = broadSummary;
        out.awayRecentSource = "all-competitions";
      }
    }
    delete out.awayRecentError;
  } catch (e) {
    out.awayRecentError = safeRefreshError(e);
  }
  if (major || hours <= 18) {
    try {
      const pair = String(job.home_team_id) + "-" + String(job.away_team_id);
      const h2h = await football(env, "/fixtures/headtohead", { h2h: pair, last: 5 });
      out.h2h = summarizeH2HV211(arr2(h2h.response), Number(job.home_team_id), Number(job.away_team_id));
    } catch (e) {
      out.h2hError = safeRefreshError(e);
    }
  }
  try {
    const calibration = await getFeedSnapshot(env, "shadow-calibration:v44");
    out.empiricalCalibration = calibration?.payload || {};
  } catch (_) {
    out.empiricalCalibration = {};
  }
  if (shadowV40Enabled(env)) {
    out.shadowV40Attempted = true;
    out.shadowV40AttemptedAt = (/* @__PURE__ */ new Date()).toISOString();
    try {
      out.homeMarketProfile = await recentMarketProfileV40(env, Number(job.home_team_id), homeRecentFixtures, String(job.provider_league_id || ""));
    } catch (e) {
      out.homeMarketProfileError = safeRefreshError(e);
    }
    try {
      out.awayMarketProfile = await recentMarketProfileV40(env, Number(job.away_team_id), awayRecentFixtures, String(job.provider_league_id || ""));
    } catch (e) {
      out.awayMarketProfileError = safeRefreshError(e);
    }
  } else {
    out.shadowV40Disabled = true;
  }
  try {
    const injuries = await football(env, "/injuries", { fixture: fixtureId });
    const rows = arr2(injuries.response);
    out.injuries = rows.map((x) => ({ teamId: x.team?.id, team: x.team?.name, player: x.player?.name, type: x.player?.type, reason: x.player?.reason })).slice(0, 30);
    out.homeAbsences = rows.filter((x) => Number(x.team?.id) === Number(job.home_team_id)).length;
    out.awayAbsences = rows.filter((x) => Number(x.team?.id) === Number(job.away_team_id)).length;
  } catch (e) {
    out.injuriesError = safeRefreshError(e);
  }
  if (hours <= 3) {
    try {
      const lineups = await football(env, "/fixtures/lineups", { fixture: fixtureId });
      out.lineups = arr2(lineups.response).map((x) => ({
        teamId: x.team?.id,
        team: x.team?.name,
        formation: x.formation,
        coach: x.coach?.name,
        startingXI: arr2(x.startXI).map((p) => p.player?.name).filter(Boolean).slice(0, 11)
      }));
      out.lineupsConfirmed = out.lineups.length >= 2 && out.lineups.every((x) => x.startingXI.length >= 10);
    } catch (e) {
      out.lineupsError = safeRefreshError(e);
    }
  }
  await saveFeedSnapshot(env, key, out, ttl);
  return out;
}
__name(optionalIntelligenceV21, "optionalIntelligenceV21");
function applyOptionalIntelligenceV21(home, away, intel, job) {
  if (!intel?.enriched)
    return;
  const h = num4(intel.homeAbsences, 0), a = num4(intel.awayAbsences, 0);
  home.absenceImpact = clamp4(h * 0.025, 0, 0.18);
  away.absenceImpact = clamp4(a * 0.025, 0, 0.18);
  const confirmed = Boolean(intel.lineupsConfirmed);
  home.lineupCertainty = confirmed ? 0.95 : 0.72;
  away.lineupCertainty = confirmed ? 0.95 : 0.72;
  home.availability = { reportedAbsences: h, lineupConfirmed: confirmed };
  away.availability = { reportedAbsences: a, lineupConfirmed: confirmed };
  const applyRecent = /* @__PURE__ */ __name((team, recent) => {
    if (!recent || recent.matches < 3)
      return;
    const sparse = num4(team.sampleSize, 0) < 5;
    team.formPointsPerGame = sparse ? clamp4(num4(recent.recencyWeightedPPG, 1.5), 0, 3) : clamp4(num4(team.formPointsPerGame, 1.5) * 0.55 + num4(recent.recencyWeightedPPG, 1.5) * 0.45, 0, 3);
    if (sparse) {
      team.sampleSize = Math.max(num4(team.sampleSize, 0), num4(recent.matches, 0));
      team.goalsForAvg = num4(recent.goalsForAvg, team.goalsForAvg);
      team.goalsAgainstAvg = num4(recent.goalsAgainstAvg, team.goalsAgainstAvg);
      team.homeGoalsForAvg = team.goalsForAvg;
      team.homeGoalsAgainstAvg = team.goalsAgainstAvg;
      team.awayGoalsForAvg = team.goalsForAvg;
      team.awayGoalsAgainstAvg = team.goalsAgainstAvg;
      team.homeSampleSize = num4(recent.matches, team.sampleSize);
      team.awaySampleSize = num4(recent.matches, team.sampleSize);
      team.homePointsPerGame = team.formPointsPerGame;
      team.awayPointsPerGame = team.formPointsPerGame;
      team.winRate = recent.matches ? num4(recent.wins, 0) / recent.matches : team.winRate;
      team.drawRate = recent.matches ? num4(recent.draws, 0) / recent.matches : team.drawRate;
      team.lossRate = recent.matches ? num4(recent.losses, 0) / recent.matches : team.lossRate;
      team.cleanSheetRate = num4(recent.cleanSheetRate, team.cleanSheetRate);
      team.failedToScoreRate = num4(recent.failedToScoreRate, team.failedToScoreRate);
    }
  }, "applyRecent");
  const homeRecentUsable = num(intel?.homeRecent?.matches,0) >= 3;
  const awayRecentUsable = num(intel?.awayRecent?.matches,0) >= 3;
  const balancedRecentContext = homeRecentUsable && awayRecentUsable;
  // V104: recent-form enrichment must be symmetric. A pacing miss on one side
  // must never let one team receive a fresh-form adjustment while the opponent
  // remains on a different baseline. This was a real source of distorted 1X2
  // views in Founder/model disagreement review.
  if (balancedRecentContext) {
    applyRecent(home, intel.homeRecent);
    applyRecent(away, intel.awayRecent);
  }
  intel.recentContextBalanced = balancedRecentContext;
  intel.recentContextHoldReason = balancedRecentContext
    ? null
    : "Recent-form adjustment held until both teams have comparable recent-match samples.";
  home.recentMatchContext = balancedRecentContext ? intel.homeRecent : null;
  away.recentMatchContext = balancedRecentContext ? intel.awayRecent : null;
  home.marketProfile = intel.homeMarketProfile || null;
  away.marketProfile = intel.awayMarketProfile || null;
  intel.shadowMarketModel = shadowMarketProbabilitiesV40(home.marketProfile, away.marketProfile);
  const compReliability = competitionReliability(job.competition, job.provider_league_id);
  const empiricalCalibration = intel.empiricalCalibration || {};
  intel.shadowMarketRanking = rankShadowMarketsV41(
    intel.shadowMarketModel,
    home.marketProfile,
    away.marketProfile,
    compReliability,
    empiricalCalibration
  );
  intel.shadowRecommendations = qualifyShadowDataDrivenV42(
    intel.shadowMarketRanking,
    {
      competitionReliability: compReliability,
      lineupCertainty: (num4(home.lineupCertainty, 0.7) + num4(away.lineupCertainty, 0.7)) / 2
    }
  );
  if (intel.h2h?.matches >= 2) {
    const edge = clamp4(num4(intel.h2h.recencyWeightedHomeShare, 0.5) - 0.5, -0.25, 0.25);
    home.formPointsPerGame = clamp4(home.formPointsPerGame + edge * 0.12, 0, 3);
    away.formPointsPerGame = clamp4(away.formPointsPerGame - edge * 0.12, 0, 3);
  }
}
__name(applyOptionalIntelligenceV21, "applyOptionalIntelligenceV21");
async function cachedTeamStatsV56(env, job, side) {
  const teamId = side === "home" ? job.home_team_id : job.away_team_id;
  const cutoffDate = cutoff(job.kickoff_at);
  const featureKey = String(teamId) + ":" + String(job.provider_league_id) + ":" + String(job.season) + ":" + cutoffDate;
  try {
    const cached = await sb(
      env,
      "two45_team_feature_snapshots?feature_key=eq." + encodeURIComponent(featureKey) + "&select=raw_features,as_of&limit=1",
      { timeoutMs: 2e3 }
    );
    const row = arr2(cached)[0];
    if (row?.raw_features && typeof row.raw_features === "object" && Object.keys(row.raw_features).length) {
      return {...row.raw_features, _two45AsOf: row.as_of};
    }
  } catch (_) {
  }
  return null;
}
__name(cachedTeamStatsV56, "cachedTeamStatsV56");
async function teamStats(env, job, side, skipCache = false) {
  const teamId = side === "home" ? job.home_team_id : job.away_team_id;
  const teamName = side === "home" ? job.home_team : job.away_team;
  const cutoffDate = cutoff(job.kickoff_at);
  const featureKey = `${teamId}:${job.provider_league_id}:${job.season}:${cutoffDate}`;
  if (!skipCache) {
    try {
      const cached = await sb(
        env,
        `two45_team_feature_snapshots?feature_key=eq.${encodeURIComponent(featureKey)}&select=raw_features,as_of&limit=1`,
        { timeoutMs: 2e3 }
      );
      const row = arr2(cached)[0];
      if (row?.raw_features && typeof row.raw_features === "object" && Object.keys(row.raw_features).length) {
        return row.raw_features;
      }
    } catch (_) {
    }
  }
  const data = await football(
    env,
    "/teams/statistics",
    {
      league: job.provider_league_id,
      season: job.season,
      team: teamId,
      date: cutoffDate
    }
  );
  const raw = data.response || {};
  try {
    const sampleSize = num4(raw?.fixtures?.played?.total, 0);
    await sb(
      env,
      "two45_team_feature_snapshots?on_conflict=feature_key",
      {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        timeoutMs: 1500,
        body: JSON.stringify({
          feature_key: featureKey,
          provider_team_id: String(teamId),
          team_name: teamName || String(teamId),
          provider_league_id: String(job.provider_league_id || ""),
          competition: job.competition || null,
          season: num4(job.season, null),
          as_of: (/* @__PURE__ */ new Date()).toISOString(),
          sample_size: sampleSize,
          data_quality: clamp4(sampleSize / 10, 0, 1),
          raw_features: raw,
          source_meta: {
            provider: "api-football",
            cutoff: cutoffDate,
            cachedBy: "analysis-engine-v2"
          }
        })
      }
    );
  } catch (_) {
  }
  return raw;
}
__name(teamStats, "teamStats");
function thresholdSelection(raw) {
  const s = String(
    raw ?? ""
  ).trim();
  const n = s.toLowerCase();
  const map = {
    home: "HOME",
    "1": "HOME",
    draw: "DRAW",
    x: "DRAW",
    away: "AWAY",
    "2": "AWAY",
    yes: "YES",
    no: "NO",
    "1x": "HOME_OR_DRAW",
    "x2": "DRAW_OR_AWAY",
    "12": "HOME_OR_AWAY"
  };
  if (map[n]) {
    return map[n];
  }
  const m = n.match(
    /\b(over|under)\s*([0-9]+(?:\.[0-9]+)?)/i
  );
  if (m) {
    return `${m[1].toUpperCase()}_${m[2].replace(
      ".",
      "_"
    )}`;
  }
  return s.toUpperCase().replace(
    /[^A-Z0-9]+/g,
    "_"
  ).replace(
    /^_+|_+$/g,
    ""
  );
}
__name(thresholdSelection, "thresholdSelection");
function providerMarketName(name) {
  if (playerPropsV1.isPlayerMarket(name)) return null; // Player identities cannot enter team-total markets.
  const n = String(
    name || ""
  ).toLowerCase();
  if (n === "match winner" || n === "1x2") {
    return "MATCH_RESULT";
  }
  if (n === "both teams score" || n === "both teams to score") {
    return "BTTS";
  }
  if (n === "double chance") {
    return "DOUBLE_CHANCE";
  }
  if (n.includes(
    "handicap result"
  ) && !n.includes("corner") && !n.includes("card")) {
    return null;
  }
  if (n === "asian handicap" || n === "cards asian handicap" || n === "corners asian handicap") {
    if (n.includes(
      "card"
    )) {
      return "CARDS_HANDICAP";
    }
    if (n.includes(
      "corner"
    )) {
      return "CORNERS_HANDICAP";
    }
    return "HANDICAP";
  }
  if (n.includes("corner") && n.includes("handicap"))
    return "CORNERS_HANDICAP";
  if (n.includes("card") && n.includes("handicap"))
    return "CARDS_HANDICAP";
  if (n.includes(
    "home corners"
  )) {
    return "HOME_CORNERS";
  }
  if (n.includes(
    "away corners"
  )) {
    return "AWAY_CORNERS";
  }
  if (n === "corners over under" || n === "corners over/under" || n === "total corners") {
    return "TOTAL_CORNERS";
  }
  if (n.includes(
    "home team total cards"
  ) || n.includes(
    "home cards"
  )) {
    return "HOME_CARDS";
  }
  if (n.includes(
    "away team total cards"
  ) || n.includes(
    "away cards"
  )) {
    return "AWAY_CARDS";
  }
  if (n === "cards over/under" || n === "total cards") {
    return "TOTAL_CARDS";
  }
  if (n.includes(
    "home player shots on target"
  )) {
    return "HOME_PLAYER_SHOTS_ON_TARGET";
  }
  if (n.includes(
    "away player shots on target"
  )) {
    return "AWAY_PLAYER_SHOTS_ON_TARGET";
  }
  if (n.includes(
    "shotongoal"
  ) || n.includes(
    "shots on target"
  ) || n.includes(
    "shot on target"
  )) {
    return "TOTAL_SHOTS_ON_TARGET";
  }
  if (n.includes(
    "home player shots off target"
  )) {
    return "HOME_PLAYER_SHOTS_OFF_TARGET";
  }
  if (n.includes(
    "away player shots off target"
  )) {
    return "AWAY_PLAYER_SHOTS_OFF_TARGET";
  }
  if (n.includes(
    "shotoffgoal"
  ) || n.includes(
    "shots off target"
  ) || n.includes(
    "shot off target"
  )) {
    return "TOTAL_SHOTS_OFF_TARGET";
  }
  if (n.includes(
    "home player shots total"
  )) {
    return "HOME_PLAYER_SHOTS";
  }
  if (n.includes(
    "away player shots total"
  )) {
    return "AWAY_PLAYER_SHOTS";
  }
  if (n.includes(
    "total shots"
  )) {
    return "TOTAL_SHOTS";
  }
  if (n.includes("home team total goals") || n.includes("home total goals") || n.includes("home team goals over/under") || n.includes("home goals over/under")) {
    return "HOME_TEAM_GOALS";
  }
  if (n.includes("away team total goals") || n.includes("away total goals") || n.includes("away team goals over/under") || n.includes("away goals over/under")) {
    return "AWAY_TEAM_GOALS";
  }
  if (n.includes(
    "home team score a goal"
  )) {
    return "HOME_TEAM_GOALS";
  }
  if (n.includes(
    "away team score a goal"
  )) {
    return "AWAY_TEAM_GOALS";
  }
  if (n === "goals over/under" || n === "total goals") {
    return "TOTAL_GOALS";
  }
  return null;
}
__name(providerMarketName, "providerMarketName");
function oddsMarketsFromSnapshot(payload, fixtureId) {
  const rows = Array.isArray(
    payload?.response
  ) ? payload.response : [];
  const row = rows.find(
    (x) => String(
      x?.fixture?.id ?? x?.fixture_id ?? x?.id
    ) === String(
      fixtureId
    )
  );
  if (!row) {
    return [];
  }
  const out = [];
  for (const book of row.bookmakers || []) {
    const bookNameV64 = String(book?.name || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (bookNameV64 !== "bet365")
      continue;
    for (const bet of book.bets || []) {
      const market = providerMarketName(
        bet.name
      );
      if (!market) {
        continue;
      }
      const outcomes = [];
      for (const v of bet.values || []) {
        const raw = String(
          v.value ?? v.name ?? ""
        );
        const selection = thresholdSelection(
          raw
        );
        const odds = num4(
          v.odd ?? v.odds,
          null
        );
        if (selection && odds > 1) {
          outcomes.push({
            selection,
            rawSelection: raw,
            odds
          });
        }
      }
      if (outcomes.length >= 2) {
        out.push({
          market,
          rawMarket: bet.name || market,
          bookmaker: book.name || null,
          observedAt: row.observedAt || null,
          providerUpdatedAt: row.providerUpdatedAt || row.update || null,
          outcomes
        });
      }
    }
  }
  return groupMarketLinesV19(out);
}
__name(oddsMarketsFromSnapshot, "oddsMarketsFromSnapshot");
function consensusCandidates(marketOdds = []) {
  const buckets = /* @__PURE__ */ new Map();
  for (const group of marketOdds) {
    const valid = (group.outcomes || []).filter(
      (x) => num4(
        x.odds
      ) > 1
    );
    const inv = valid.reduce(
      (s, x) => s + 1 / num4(
        x.odds
      ),
      0
    );
    if (valid.length < 2 || inv <= 0) {
      continue;
    }
    for (const price of valid) {
      const noVig = 1 / num4(
        price.odds
      ) / inv * (group.market === "DOUBLE_CHANCE" ? 2 : 1);
      const key = `${group.market}|${group.groupKey || ""}|${price.selection}`;
      const b = buckets.get(
        key
      ) || {
        market: group.market,
        selection: price.selection,
        rawMarket: group.rawMarket,
        probabilities: [],
        offers: []
      };
      b.probabilities.push(
        noVig
      );
      b.offers.push({
        bookmaker: group.bookmaker || null,
        odds: num4(
          price.odds
        ),
        noVig
      });
      buckets.set(
        key,
        b
      );
    }
  }
  const out = [];
  for (const b of buckets.values()) {
    const consensus = b.probabilities.reduce(
      (a, v) => a + v,
      0
    ) / b.probabilities.length;
    const best = b.offers.sort(
      (a, b2) => a.odds - b2.odds
    )[0];
    const bestImplied = 1 / best.odds;
    out.push({
      market: b.market,
      selection: b.selection,
      rawMarket: b.rawMarket,
      probability: consensus,
      fairOdds: consensus > 0 ? 1 / consensus : null,
      sportsbookOdds: best.odds,
      bookmaker: best.bookmaker,
      noVigMarketProbability: consensus,
      valueEdge: consensus - bestImplied,
      bookmakerCount: b.probabilities.length,
      analysisSource: "cross-book-market-consensus"
    });
  }
  return out;
}
__name(consensusCandidates, "consensusCandidates");
async function writeForecast(env, job, analysis, decision) {
  const market = decision.decision === "PICK" ? decision.market : "NO_BET";
  const selection = decision.decision === "PICK" ? decision.selection : "NO_BET";
  const probability = decision.decision === "PICK" ? decision.probability : 0;
  const body = {
    forecast_key: `${MODEL_VERSION}:${job.provider_match_id}:${market}:${selection}`,
    provider_match_id: String(
      job.provider_match_id
    ),
    fixture_id: num4(
      job.fixture_id,
      null
    ),
    kickoff_at: job.kickoff_at,
    competition: job.competition,
    home_team: job.home_team,
    away_team: job.away_team,
    model_version: MODEL_VERSION,
    market,
    selection,
    probability,
    fair_odds: decision.fairOdds ?? null,
    sportsbook: decision.bookmaker ?? null,
    sportsbook_odds: decision.sportsbookOdds ?? null,
    no_vig_market_probability: decision.noVigMarketProbability ?? null,
    value_edge: decision.valueEdge ?? null,
    data_quality: analysis.dataQuality,
    competition_reliability: analysis.competitionReliability,
    lineup_certainty: analysis.lineupCertainty,
    decision: decision.decision,
    confidence_tier: decision.confidenceTier ?? null,
    reasons: [
      decision.reason || "Independent Two45 model evaluation"
    ],
    feature_snapshot: {
      expectedGoals: analysis.expectedGoals,
      homeTeam: analysis.homeTeam,
      awayTeam: analysis.awayTeam,
      pickType: decision.pickType || null,
      riskLabel: decision.riskLabel || null,
      analysisSource: decision.analysisSource || null,
      topMarkets: decision.topMarkets || [],
      decisionRevision: DECISION_REVISION
    },
    probability_snapshot: analysis.probabilities,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const {
    url,
    key
  } = supa(env);
  const r = await fetch(
    `${url}/rest/v1/two45_model_forecasts?on_conflict=forecast_key`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // Forecast core fields are immutable after first insert.
        // Reanalysis belongs in two45_analysis_state; never mutate an existing forecast row.
        Prefer: "resolution=ignore-duplicates,return=representation"
      },
      body: JSON.stringify(
        body
      ),
      signal: AbortSignal.timeout(7e3)
    }
  );
  const text = await r.text();
  if (!r.ok) {
    throw new Error(
      `Forecast write ${r.status}: ${text}`
    );
  }
  return text ? JSON.parse(text) : null;
}
__name(writeForecast, "writeForecast");
function pctClient(v) {
  const n = num4(
    v,
    0
  );
  return Math.round(
    (n <= 1 ? n * 100 : n) * 10
  ) / 10;
}
__name(pctClient, "pctClient");
function strongestIndependent(analysis) {
  const all = flatten(
    analysis?.probabilities || {}
  ).sort(
    (a, b) => b.probability - a.probability
  );
  return all[0] || null;
}
__name(strongestIndependent, "strongestIndependent");
function manualForecast(job, analysis, decision) {
  const strongest = strongestIndependent(
    analysis
  );
  const picked = decision?.decision === "PICK";
  const chosen = picked ? decision : null;
  return {
    fixtureId: num4(
      job.fixture_id,
      null
    ),
    providerMatchId: String(
      job.provider_match_id || job.fixture_id || ""
    ),
    home: job.home_team,
    away: job.away_team,
    league: job.competition,
    kickoff: job.kickoff_at,
    modelVersion: MODEL_VERSION,
    market: chosen?.market || "NO_BET",
    selection: displaySelectionV20(
      chosen?.selection || "NO_BET"
    ),
    probability: chosen ? pctClient(
      chosen.probability
    ) : 0,
    fairOdds: chosen?.fairOdds ?? null,
    sportsbookOdds: decision?.sportsbookOdds ?? null,
    bookmaker: decision?.bookmaker ?? null,
    valueEdgePct: decision?.valueEdge != null ? Math.round(
      decision.valueEdge * 1e3
    ) / 10 : null,
    dataQuality: pctClient(
      analysis?.dataQuality
    ),
    decision: decision?.decision || "NO_BET",
    confidenceTier: decision?.confidenceTier ?? null,
    pickType: decision?.pickType || (decision?.confidenceTier === "RISKY" ? "RISKY_VALUE" : picked ? "STRONG_PICK" : "NO_BET"),
    riskLabel: decision?.riskLabel ?? null,
    analysisSource: decision?.analysisSource ?? (picked ? "independent-model" : null),
    alternatives: displayAlternativesV20(
      decision?.topMarkets
    ),
    modelConfidence: chosen?.probability >= 0.82 && analysis?.dataQuality >= 0.8 ? "VERY_STRONG" : chosen?.probability >= 0.72 ? "STRONG" : chosen?.probability >= 0.62 ? "LEAN" : "LOW",
    two45View: picked && decision?.confidenceTier === "RISKY" ? "RISKY_VALUE" : picked ? "VALUE_PICK" : chosen?.probability >= 0.75 && analysis?.dataQuality >= 0.68 ? "STRONG_MODEL_VIEW_NO_VALUE_PICK" : "NO_BET",
    marketValue: picked ? "VALUE" : "UNPRICED",
    reasons: [
      decision?.reason || (picked ? "Independent probability and sportsbook value gates cleared" : "No market passed probability, value and data-quality gates"),
      ...strongest && !picked ? [
        "No qualified pick. Raw model probabilities remain available in detailed analysis only."
      ] : []
    ]
  };
}
__name(manualForecast, "manualForecast");
async function authenticatedUser(request, env) {
  const auth = request.headers.get(
    "Authorization"
  ) || "";
  if (!auth.startsWith(
    "Bearer "
  )) {
    return null;
  }
  const {
    url,
    key
  } = supa(env);
  const r = await fetch(
    `${url}/auth/v1/user`,
    {
      headers: {
        apikey: key,
        Authorization: auth
      }
    }
  );
  if (!r.ok) {
    return null;
  }
  return await r.json().catch(
    () => null
  );
}
__name(authenticatedUser, "authenticatedUser");
async function founderAuthorizedV95(env, user) {
  if (!user?.id)
    return false;
  const rows = await sb(env, `two45_founder_access?user_id=eq.${encodeURIComponent(user.id)}&enabled=eq.true&role=eq.founder&select=user_id&limit=1`).catch(() => []);
  return arr2(rows).length === 1;
}
__name(founderAuthorizedV95, "founderAuthorizedV95");
async function founderStatusV95(request, env) {
  const user = await authenticatedUser(request, env);
  if (!user?.id)
    return { httpStatus: 401, body: { ok: false, founder: false, code: "SIGN_IN_REQUIRED" } };
  return { httpStatus: 200, body: { ok: true, founder: await founderAuthorizedV95(env, user) } };
}
__name(founderStatusV95, "founderStatusV95");
async function founderSuggestEliteV95(request, env) {
  const user = await authenticatedUser(request, env);
  if (!user?.id)
    return { httpStatus: 401, body: { ok: false, code: "SIGN_IN_REQUIRED", message: "Sign in to use founder scouting." } };
  if (!await founderAuthorizedV95(env, user))
    return { httpStatus: 403, body: { ok: false, code: "FOUNDER_ONLY", message: "Founder scouting is not available on this account." } };
  const body = await request.json().catch(() => ({})), fixtureId = Math.trunc(num4(body.fixtureId, 0));
  if (!fixtureId)
    return { httpStatus: 400, body: { ok: false, code: "INVALID_FIXTURE", message: "A valid fixture is required." } };
  const job = await founderFixtureV99(env, fixtureId).catch(() => null);
  if (!job)
    return { httpStatus: 404, body: { ok: false, code: "NOT_AVAILABLE", message: "This fixture is not available for Elite review." } };
  const fixtureDate = dateOfV19(job.kickoff_at), tier = competitionTierV21(job.competition, job.provider_league_id);
  if (tier > 2)
    return { httpStatus: 400, body: { ok: false, code: "ELITE_TIER_INELIGIBLE", message: "Elite review remains restricted to Tier 1 and Tier 2 competitions." } };
  const reviewBase = { requestedBy: "founder", requestedAt: (/* @__PURE__ */ new Date()).toISOString(), competition: job.competition, tier };
  await sb(env, "two45_founder_elite_suggestions?on_conflict=user_id,fixture_id,fixture_date", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify({ user_id: user.id, fixture_id: fixtureId, fixture_date: fixtureDate, status: "REVIEWING", review: reviewBase })
  });
  const auth = request.headers.get("Authorization") || "";
  const deepReq = new Request("https://two45.internal/api/model/analyze", {
    method: "POST",
    headers: { "Authorization": auth, "Content-Type": "application/json" },
    body: JSON.stringify({ fixtureId, force: true })
  });
  const analysis = await analyzeFixtureOnDemand(deepReq, env);
  let status = "REVIEWING", review = { ...reviewBase, analysisStatus: analysis?.body?.status || null };
  if (analysis?.body?.status === "READY") {
    const forecast = analysis.body.forecast || {}, candidate = { ...forecast, competitionTier: tier }, elite = eliteLegQualityV79(candidate);
    status = elite ? "ELITE_QUALIFIED" : forecast?.decision === "PICK" ? "STRONG_ONLY" : "REJECTED";
    review = {
      ...review,
      decision: forecast?.decision || null,
      market: forecast?.market || null,
      selection: forecast?.selection || null,
      probability: forecast?.probability ?? null,
      sportsbookOdds: forecast?.sportsbookOdds ?? null,
      bookmaker: forecast?.bookmaker || null,
      eliteQualified: elite,
      premiumScore: ticketPremiumScoreV80(candidate),
      reason: arr2(forecast?.reasons)[0] || null,
      reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await sb(env, `two45_founder_elite_suggestions?user_id=eq.${encodeURIComponent(user.id)}&fixture_id=eq.${fixtureId}&fixture_date=eq.${fixtureDate}`, {
      method: "PATCH",
      prefer: "return=representation",
      body: JSON.stringify({ status, review, reviewed_at: (/* @__PURE__ */ new Date()).toISOString() })
    });
    await evaluateBoardV19(env, fixtureDate).catch(() => null);
    await ensureTicketLocksV70(env).catch(() => null);
  }
  try { review.evidenceReview = await getMatchEvidenceV1(env,fixtureId,{force:true}); }
  catch(e) { review.evidenceReview = {sourceErrors:[safeRefreshError(e)],markets:[],risks:["Evidence review could not be completed."]}; }
  const reviewedPrimaryV1=review.evidenceReview?.markets?.find(m=>m.primary);
  if(reviewedPrimaryV1?.modelReview?.hold) { status="REJECTED";review.eliteQualified=false;review.reason="Held for independent-model disagreement review."; }
  if(review.decision!=="PICK") { review.probability=null;review.premiumScore=null; }
  await sb(env,"two45_founder_elite_suggestions?user_id=eq."+encodeURIComponent(user.id)+"&fixture_id=eq."+fixtureId+"&fixture_date=eq."+fixtureDate,{method:"PATCH",prefer:"return=minimal",body:JSON.stringify({status,review})});
  return { httpStatus: analysis.httpStatus === 500 ? 202 : 200, body: {
    ok: true,
    founder: true,
    fixtureId,
    status,
    message: status === "ELITE_QUALIFIED" ? "Founder suggestion passed the Elite gate." : status === "STRONG_ONLY" ? "Founder suggestion is strong, but did not clear Elite." : status === "REJECTED" ? "Two45 reviewed the suggestion and rejected it for Elite." : "Founder suggestion is under deeper review.",
    review
  } };
}
__name(founderSuggestEliteV95, "founderSuggestEliteV95");
function founderAgreementV96(founderMarket, founderSelection, forecast) {
  const fm = String(founderMarket || "").toUpperCase(), fs = ticketSelectionKeyV78(founderSelection);
  const homeDraw = (s) => ["HOME_DRAW","HOME_OR_DRAW","DRAW_OR_HOME"].includes(s);
  const awayDraw = (s) => ["AWAY_DRAW","AWAY_OR_DRAW","DRAW_OR_AWAY"].includes(s);
  const sameOrEquivalent = (market, selection) => {
    const mm = String(market || "").toUpperCase(), ms = ticketSelectionKeyV78(selection);
    if (!mm || !ms) return false;
    if (fm === mm && fs === ms) return true;
    return fm === "DOUBLE_CHANCE" && homeDraw(fs) && mm === "HANDICAP" && ms === "HOME_PLUS_0_5" ||
      fm === "DOUBLE_CHANCE" && awayDraw(fs) && mm === "HANDICAP" && ms === "AWAY_PLUS_0_5" ||
      mm === "DOUBLE_CHANCE" && homeDraw(ms) && fm === "HANDICAP" && fs === "HOME_PLUS_0_5" ||
      mm === "DOUBLE_CHANCE" && awayDraw(ms) && fm === "HANDICAP" && fs === "AWAY_PLUS_0_5";
  };
  if (forecast?.decision === "PICK" && sameOrEquivalent(forecast?.market, forecast?.selection)) return "AGREES";
  const independent = arr2(forecast?.alternatives).filter((x) => String(x?.analysisSource || "").toLowerCase() === "independent-model");
  if (independent.some((x) => String(x?.lane || "").toUpperCase() === "STRONG" && sameOrEquivalent(x?.market, x?.selection))) return "AGREES";
  if (independent.some((x) => sameOrEquivalent(x?.market, x?.selection))) return "PARTIAL";
  return "DISAGREES";
}
__name(founderAgreementV96, "founderAgreementV96");
function founderMarketCategoryV97(market) {
  const m = String(market || "").toUpperCase();
  if (m.includes("CORNER"))
    return "Corners";
  if (m.includes("CARD"))
    return "Cards";
  if (m.includes("SHOT"))
    return "Shots";
  if (m.includes("GOAL") || m === "BTTS")
    return "Goals";
  if (m.includes("HANDICAP"))
    return "Handicaps";
  return "Result";
}
__name(founderMarketCategoryV97, "founderMarketCategoryV97");
async function founderFixtureV99(env, fixtureId) {
  const queued = await jobForFixture(env, fixtureId).catch(() => null);
  if (queued)
    return queued;
  const today = easternDate(), dates = [today, datePlusDays(today, 1)];
  for (const date of dates) {
    const snap = await fixtureSnapshotV19(env, date).catch(() => ({ fixtures: [] }));
    const fixture = arr2(snap?.fixtures).find((f) => fixtureIdV19(f) === Number(fixtureId));
    if (fixture)
      return jobFromFixtureV19(fixture, date, (/* @__PURE__ */ new Date()).toISOString());
  }
  return null;
}
__name(founderFixtureV99, "founderFixtureV99");
async function founderMarketsV97(request, env, fixtureId) {
  const user = await authenticatedUser(request, env);
  if (!user?.id)
    return { httpStatus: 401, body: { ok: false, code: "SIGN_IN_REQUIRED", message: "Your Founder session has expired. Sign in again to publish a Founder\u2019s Pick." } };
  if (!await founderAuthorizedV95(env, user))
    return { httpStatus: 403, body: { ok: false, code: "FOUNDER_ONLY" } };
  const job = await founderFixtureV99(env, fixtureId).catch(() => null);
  if (!job)
    return { httpStatus: 404, body: { ok: false, code: "NOT_AVAILABLE", message: "Fixture not available." } };
  const date = dateOfV19(job.kickoff_at), oddsRow = await getFeedSnapshot(env, oddsKey(date)).catch(() => null), groups = oddsMarketsFromSnapshot(oddsRow?.payload || {}, fixtureId), markets = [];
  for (const g of groups) {
    const outcomes = arr2(g?.outcomes).filter((x) => Number(x?.odds) >= 1.15).map((x) => ({
      selection: ticketSelectionKeyV78(x.selection),
      label: String(x.rawSelection || x.selection || "").trim(),
      odds: Number(x.odds)
    }));
    if (!outcomes.length)
      continue;
    markets.push({ category: founderMarketCategoryV97(g.market), market: g.market, label: g.rawMarket || g.market, outcomes });
  }
  const order = { Result: 1, Goals: 2, Handicaps: 3, Corners: 4, Cards: 5, Shots: 6 };
  markets.sort((a, b) => (order[a.category] || 9) - (order[b.category] || 9) || String(a.label).localeCompare(String(b.label)));
  return { httpStatus: 200, body: { ok: true, fixtureId, date, bookmaker: "Bet365", markets, count: markets.reduce((n, x) => n + x.outcomes.length, 0) } };
}
__name(founderMarketsV97, "founderMarketsV97");
async function founderPickPublicV96(env, date = easternDate()) {
  const rows = await sb(env, `two45_founder_picks?pick_date=eq.${encodeURIComponent(date)}&select=*&order=created_at.asc&limit=5`).catch(() => []);
  const picks = arr2(rows), pick = picks[0] || null;
  const history = await sb(env, "two45_founder_picks?status=eq.SETTLED&select=result,profit_units,agreement&limit=500").catch(() => []);
  const settled = arr2(history), wins = settled.filter((x) => x.result === "WIN").length, losses = settled.filter((x) => x.result === "LOSS").length, pushes = settled.filter((x) => x.result === "PUSH" || x.result === "VOID").length, profit = settled.reduce((s, x) => s + num4(x.profit_units, 0), 0);
  return { ok: true, date, pick, picks, pickCount: picks.length, remaining: Math.max(0, 5 - picks.length), combinedOdds: picks.length ? Math.round(picks.reduce((n, x) => n * num4(x.published_odds, 1), 1) * 100) / 100 : null, record: { settled: settled.length, wins, losses, pushes, hitRate: wins + losses ? Math.round(wins / (wins + losses) * 1e3) / 10 : null, profitUnits: Math.round(profit * 100) / 100 } };
}
__name(founderPickPublicV96, "founderPickPublicV96");
async function founderPublishPickV96(request, env) {
  const user = await authenticatedUser(request, env);
  if (!user?.id)
    return { httpStatus: 401, body: { ok: false, code: "SIGN_IN_REQUIRED", message: "Sign in with the founder account." } };
  if (!await founderAuthorizedV95(env, user))
    return { httpStatus: 403, body: { ok: false, code: "FOUNDER_ONLY", message: "Founder Pick publishing is restricted to the founder account." } };
  const body = await request.json().catch(() => ({})), fixtureId = Math.trunc(num4(body.fixtureId, 0)), market = String(body.market || "").trim().toUpperCase(), selection = ticketSelectionKeyV78(body.selection), confidence = ["STANDARD", "HIGH", "VERY_HIGH"].includes(String(body.confidence || "").toUpperCase()) ? String(body.confidence).toUpperCase() : "HIGH", note = String(body.note || "").trim().slice(0, 500);
  if (!fixtureId || !market || !selection)
    return { httpStatus: 400, body: { ok: false, code: "INVALID_PICK", message: "Choose a fixture, market and selection." } };
  const job = await founderFixtureV99(env, fixtureId).catch(() => null);
  if (!job)
    return { httpStatus: 404, body: { ok: false, code: "NOT_AVAILABLE", message: "This fixture is not available." } };
  if (Date.parse(job.kickoff_at) <= Date.now())
    return { httpStatus: 400, body: { ok: false, code: "KICKOFF_PASSED", message: "Founder Pick must be published before kickoff." } };
  const pickDate = dateOfV19(job.kickoff_at);
  const existing = await sb(env, `two45_founder_picks?user_id=eq.${encodeURIComponent(user.id)}&pick_date=eq.${encodeURIComponent(pickDate)}&select=id,fixture_id,market,selection&limit=5`).catch(() => []);
  if (arr2(existing).length >= 5)
    return { httpStatus: 409, body: { ok: false, code: "DAILY_PICK_LIMIT", message: "You already published the maximum 5 Founder Picks for this date." } };
  if (arr2(existing).some((x) => String(x.fixture_id) === String(fixtureId) && String(x.market) === market && ticketSelectionKeyV78(x.selection) === selection))
    return { httpStatus: 409, body: { ok: false, code: "DUPLICATE_PICK", message: "That exact Founder Pick is already published and locked." } };
  const oddsRow = await getFeedSnapshot(env, oddsKey(pickDate)).catch(() => null), quote = exactBet365QuoteV78(oddsRow?.payload || {}, fixtureId, market, selection);
  if (!quote)
    return { httpStatus: 400, body: { ok: false, code: "BET365_PRICE_REQUIRED", message: "Two45 could not verify this exact selection at Bet365, so it cannot be published yet." } };
  const row = {
    user_id: user.id,
    pick_date: pickDate,
    fixture_id: fixtureId,
    kickoff_at: job.kickoff_at,
    competition: job.competition,
    home_team: job.home_team,
    away_team: job.away_team,
    market,
    selection,
    founder_confidence: confidence,
    founder_note: note || null,
    sportsbook: "Bet365",
    published_odds: quote.odds,
    agreement: "PENDING",
    status: "PUBLISHED"
  };
  const saved = await sb(env, "two45_founder_picks", { method: "POST", body: JSON.stringify(row) });
  const published = arr2(saved)[0] || row;
  let publicForecast = null;
  try {
    const forecast = await existingForecast(env, fixtureId).catch(() => null);
    publicForecast = forecast ? canonicalForecastV2(forecast) : null;
    if (!publicForecast) {
      const auth = request.headers.get("Authorization") || "", deepReq = new Request("https://two45.internal/api/model/analyze", {
        method: "POST",
        headers: { "Authorization": auth, "Content-Type": "application/json" },
        body: JSON.stringify({ fixtureId, force: true })
      }), analysis = await analyzeFixtureOnDemand(deepReq, env);
      publicForecast = analysis?.body?.forecast || null;
    }
    if (publicForecast && published?.id) {
      const agreement = founderAgreementV96(market, selection, publicForecast);
      await sb(env, `two45_founder_picks?id=eq.${encodeURIComponent(published.id)}`, { method: "PATCH", body: JSON.stringify({
        model_market: publicForecast.market || null,
        model_selection: publicForecast.selection || null,
        model_probability: publicForecast.probability ?? null,
        model_odds: publicForecast.sportsbookOdds ?? null,
        model_decision: publicForecast.decision || null,
        model_reason: arr2(publicForecast.reasons)[0] || null,
        agreement
      }) }).catch(() => null);
      published.agreement = agreement;
    }
  } catch (_) {
  }
  return { httpStatus: 200, body: { ok: true, pick: published, pickNumber: arr2(existing).length + 1, remaining: Math.max(0, 4 - arr2(existing).length), message: "Founder Pick #" + (arr2(existing).length + 1) + " published and locked. Two45 comparison " + (publicForecast ? "complete." : "will follow independently.") } };
}
__name(founderPublishPickV96, "founderPublishPickV96");
async function existingForecast(env, fixtureId) {
  const rows = await sb(
    env,
    `two45_model_forecasts?fixture_id=eq.${encodeURIComponent(
      fixtureId
    )}&model_version=eq.${encodeURIComponent(
      MODEL_VERSION
    )}&select=*&order=created_at.desc&limit=1`
  );
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
__name(existingForecast, "existingForecast");
function cooldownState(row) {
  if (!row?.created_at) {
    return {
      active: false,
      remainingMs: 0,
      nextRefreshAt: null
    };
  }
  const created = new Date(
    row.created_at
  ).getTime();
  if (!Number.isFinite(
    created
  )) {
    return {
      active: false,
      remainingMs: 0,
      nextRefreshAt: null
    };
  }
  const remainingMs = Math.max(
    0,
    REANALYZE_COOLDOWN_MS - (Date.now() - created)
  );
  return {
    active: remainingMs > 0,
    remainingMs,
    nextRefreshAt: new Date(
      created + REANALYZE_COOLDOWN_MS
    ).toISOString()
  };
}
__name(cooldownState, "cooldownState");
function displaySelectionV20(value) {
  return String(value || "").replace(/_(\d+)_(\d+)(?=$|_)/g, "_$1.$2");
}
__name(displaySelectionV20, "displaySelectionV20");
function displayAlternativesV20(items) {
  return Array.isArray(items) ? items.map((item) => {
    const lane = item?.lane || "WATCH";
    const edge = item?.valueEdge != null ? Math.round(num4(item.valueEdge, 0) * 1e3) / 10 : null;
    const role = lane === "STRONG" ? "STRONG_OPTION" : lane === "RISKY_VALUE" ? "VALUE_OPTION" : "WATCH_OPTION";
    const reason = lane === "STRONG" ? "Cleared Two45 probability, data-quality and market-value gates." : lane === "RISKY_VALUE" ? "Higher-variance option with a positive model/market edge." : num4(item?.bookmakerCount, 0) >= 2 ? "Supported across multiple sportsbook lines; kept as an analysis option." : "Available market signal; useful for analysis but not yet a final Two45 pick.";
    return {
      ...item,
      selection: displaySelectionV20(item?.selection),
      role,
      reason,
      valueEdgePct: edge
    };
  }) : [];
}
__name(displayAlternativesV20, "displayAlternativesV20");
function forecastRowToClient(row) {
  if (!row) {
    return null;
  }
  const snap = row.probability_snapshot || {};
  let strongest = null;
  let snapshotOptions = [];
  try {
    const flat = flatten(
      snap
    ).sort(
      (a, b) => b.probability - a.probability
    );
    strongest = flat[0] || null;
    const preferred = flat.filter((x) => num4(x.probability, 0) >= 0.5).filter((x) => !(x.market === "TOTAL_GOALS" && String(x.selection) === "UNDER_4_5")).sort((a, b) => num4(b.probability, 0) - num4(a.probability, 0));
    const seen = /* @__PURE__ */ new Set();
    for (const x of preferred) {
      if (seen.has(x.market))
        continue;
      snapshotOptions.push({
        ...x,
        lane: "WATCH",
        sportsbookOdds: null,
        bookmaker: null,
        bookmakerCount: null,
        valueEdge: null,
        analysisSource: "saved-model-snapshot"
      });
      seen.add(x.market);
      if (snapshotOptions.length >= 6)
        break;
    }
  } catch (_) {
  }
  const storedPick = row.decision === "PICK" && row.selection && row.selection !== "NO_BET";
  const market = storedPick ? row.market : "NO_BET";
  const selection = displaySelectionV20(
    storedPick ? row.selection : "NO_BET"
  );
  const probability = storedPick ? pctClient(
    row.probability
  ) : 0;
  return {
    fixtureId: num4(
      row.fixture_id,
      null
    ),
    providerMatchId: String(
      row.provider_match_id || row.fixture_id || ""
    ),
    home: row.home_team,
    away: row.away_team,
    league: row.competition,
    kickoff: row.kickoff_at,
    modelVersion: row.model_version,
    market,
    selection,
    probability,
    fairOdds: storedPick ? row.fair_odds : null,
    modelLeader: !storedPick && strongest ? {
      market: strongest.market,
      selection: displaySelectionV20(strongest.selection),
      probability: pctClient(strongest.probability),
      fairOdds: strongest.fairOdds ?? null
    } : null,
    sportsbookOdds: row.sportsbook_odds ?? null,
    bookmaker: row.sportsbook ?? null,
    valueEdgePct: row.value_edge != null ? Math.round(
      num4(
        row.value_edge
      ) * 1e3
    ) / 10 : null,
    dataQuality: pctClient(
      row.data_quality
    ),
    decision: row.decision || "NO_BET",
    confidenceTier: row.confidence_tier ?? null,
    pickType: row?.feature_snapshot?.pickType || (row.confidence_tier === "RISKY" ? "RISKY_VALUE" : storedPick ? "STRONG_PICK" : "NO_BET"),
    riskLabel: row?.feature_snapshot?.riskLabel ?? null,
    analysisSource: row?.feature_snapshot?.analysisSource ?? null,
    alternatives: displayAlternativesV20(
      Array.isArray(row?.feature_snapshot?.topMarkets) && row.feature_snapshot.topMarkets.length ? row.feature_snapshot.topMarkets : snapshotOptions
    ),
    modelConfidence: probability >= 82 && pctClient(
      row.data_quality
    ) >= 80 ? "VERY_STRONG" : probability >= 72 ? "STRONG" : probability >= 62 ? "LEAN" : "LOW",
    two45View: storedPick && row.confidence_tier === "RISKY" ? "RISKY_VALUE" : storedPick ? "VALUE_PICK" : probability >= 75 && pctClient(
      row.data_quality
    ) >= 68 ? "STRONG_MODEL_VIEW_NO_VALUE_PICK" : "NO_BET",
    marketValue: storedPick ? "VALUE" : "UNPRICED",
    reasons: Array.isArray(
      row.reasons
    ) ? row.reasons : []
  };
}
__name(forecastRowToClient, "forecastRowToClient");
async function jobForFixture(env, fixtureId) {
  const rows = await sb(
    env,
    `two45_feature_jobs?fixture_id=eq.${encodeURIComponent(
      fixtureId
    )}&select=*&order=requested_at.desc&limit=1`
  );
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
__name(jobForFixture, "jobForFixture");
async function claimNextFreshJobV55(env) {
  const rows = await sb(env, "rpc/two45_claim_next_fresh_job_v55", {
    method: "POST",
    timeoutMs: 2500,
    body: JSON.stringify({ p_model_version: MODEL_VERSION })
  });
  return arr2(rows)[0] || null;
}
__name(claimNextFreshJobV55, "claimNextFreshJobV55");
async function deferClaimedJobV55(env, job, message) {
  return sb(env, "rpc/two45_defer_claimed_job_v55", {
    method: "POST",
    timeoutMs: 2e3,
    body: JSON.stringify({
      p_job_id: job.id,
      p_fixture_id: Number(job.fixture_id),
      p_model_version: MODEL_VERSION,
      p_message: message
    })
  });
}
__name(deferClaimedJobV55, "deferClaimedJobV55");
async function claimSpecificJob(env, job) {
  if (!dateAllowedV19(dateOfV19(job.kickoff_at)))
    return null;
  if (!["PENDING", "READY", "FAILED"].includes(job.status))
    return null;
  const rows = await sb(env, "rpc/two45_claim_feature_job", {
    method: "POST",
    timeoutMs: 5e3,
    body: JSON.stringify({
      p_job_id: job.id,
      p_expected_status: job.status,
      p_expected_attempts: num4(job.attempts),
      p_expected_requested_at: job.requested_at
    })
  });
  const owned = arr2(rows)[0] || null;
  if (owned)
    await beginCanonicalAnalysisV2(env, owned);
  return owned;
}
__name(claimSpecificJob, "claimSpecificJob");
// Read-only polling: never sync, claim, process, or call the paid provider.
async function fixtureAnalysisStatus(request, env, fixtureId) {
  if (!Number.isSafeInteger(fixtureId) || fixtureId <= 0)
    return { httpStatus: 400, body: { ok: false, code: "INVALID_FIXTURE", message: "A valid fixture ID is required." } };
  const user = await authenticatedUser(request, env);
  if (!user?.id)
    return { httpStatus: 401, body: { ok: false, code: "SIGN_IN_REQUIRED", message: "Sign in to view analysis." } };
  const canonical = await currentCanonicalAnalysisV2(env, fixtureId);
  const forecast = canonicalForecastV2(canonical);
  if (forecast && !canonical.refreshing)
    return { httpStatus: 200, body: { ok: true, status: "READY", fixtureId, forecast, source: "canonical-analysis-v2" } };
  // Only small job metadata is needed when the canonical result is not ready.
  const jobs = await sb(env, `two45_feature_jobs?fixture_id=eq.${fixtureId}&select=status,kickoff_at&order=requested_at.desc&limit=1`);
  const job = arr2(jobs)[0];
  if (job && !dateAllowedV19(dateOfV19(job.kickoff_at)))
    return { httpStatus: 202, body: { ok: true, status: "WAITING", fixtureId, message: "Tomorrow analysis opens at 8 PM Eastern." } };
  if (!canonical && !job)
    return { httpStatus: 404, body: { ok: false, code: "NOT_QUEUED", message: "This fixture is not currently queued for analysis." } };
  if (canonical?.status === "FAILED" && !canonical.refreshing)
    return { httpStatus: 200, body: { ok: true, status: "FAILED", fixtureId, message: "Analysis could not finish. Two45 will retry through its background queue." } };
  return { httpStatus: 202, body: { ok: true, status: "QUEUED", fixtureId, retryAfterSeconds: 15, message: canonical?.status === "PROCESSING" || canonical?.refreshing ? "Analysis is running. This view will update automatically." : "Analysis is queued. This view will update automatically." } };
}
async function analyzeFixtureOnDemand(request, env) {
  const user = await authenticatedUser(
    request,
    env
  );
  if (!user?.id) {
    return {
      httpStatus: 401,
      body: {
        ok: false,
        code: "SIGN_IN_REQUIRED",
        message: "Sign in to request an on-demand analysis."
      }
    };
  }
  const body = await request.json().catch(
    () => ({})
  );
  const fixtureId = Math.trunc(
    num4(
      body.fixtureId,
      0
    )
  );
  const force = body.force === true;
  if (!fixtureId) {
    return {
      httpStatus: 400,
      body: {
        ok: false,
        code: "INVALID_FIXTURE",
        message: "A valid fixture ID is required."
      }
    };
  }
  const canonical = await currentCanonicalAnalysisV2(env, fixtureId).catch(() => null);
  if (canonical?.status === "COMPLETE" && !canonical.refreshing && !force) {
    const forecast = canonicalForecastV2(canonical);
    if (forecast) {
      const cd = cooldownState({ created_at: canonical.completed_at });
      return {
        httpStatus: 200,
        body: {
          ok: true,
          status: "READY",
          source: "canonical-analysis-v2",
          forecast,
          canReanalyze: !cd.active,
          nextRefreshAt: cd.nextRefreshAt,
          cooldownSeconds: Math.ceil(cd.remainingMs / 1e3)
        }
      };
    }
  }
  if (canonical?.status === "PROCESSING" || canonical?.refreshing) {
    return {
      httpStatus: 202,
      body: {
        ok: true,
        status: "QUEUED",
        fixtureId,
        message: "Analysis is already running."
      }
    };
  }
  let job = await jobForFixture(
    env,
    fixtureId
  );
  if (!job) {
    await syncFixtureJobsV19(env);
    job = await jobForFixture(env, fixtureId);
  }
  if (job && !dateAllowedV19(dateOfV19(job.kickoff_at))) {
    return { httpStatus: 202, body: { ok: true, status: "WAITING", fixtureId, waitingUntil: "20:00 America/New_York" } };
  }
  if (!job) {
    // Tier 4 is intentionally excluded from automatic queue discovery.
    // Only a signed-in Ask Two45 request may create this manual job.
    for (const date of activeDatesV19()) {
      const snapshot = await fixtureSnapshotV19(env, date);
      const fixture = snapshot.fixtures.find((f) => fixtureIdV19(f) === fixtureId);
      if (!fixture) continue;
      const tier = competitionTierV21(fixture?.league?.name, fixture?.league?.id);
      const gameStatus = fixture?.fixture?.status?.short;
      if (tier !== 4 || dateOfV19(fixture?.fixture?.date) !== date ||
          !(UPCOMING_STATUSES.has(gameStatus) || LIVE_STATUSES.has(gameStatus)) ||
          !Number(fixture?.league?.id) || !Number(fixture?.league?.season) ||
          !Number(fixture?.teams?.home?.id) || !Number(fixture?.teams?.away?.id)) break;
      const manualJob = jobFromFixtureV19(fixture, date, new Date().toISOString());
      manualJob.metadata.queued_by = "manual-ask-two45";
      // Idempotent insert prevents repeated taps from duplicating API work.
      await sb(env, "two45_feature_jobs?on_conflict=job_key", {
        method: "POST",
        prefer: "resolution=ignore-duplicates,return=representation",
        body: JSON.stringify([manualJob])
      });
      job = await jobForFixture(env, fixtureId);
      if (job) await ensureAnalysisRowsV2(env, [job]);
      break;
    }
  }
  if (!job) {
    return {
      httpStatus: 404,
      body: {
        ok: false,
        code: "NOT_QUEUED",
        message: "This fixture is not available for a manual review. Check its kickoff time or current status."
      }
    };
  }
  const started = job.started_at ? new Date(
    job.started_at
  ).getTime() : 0;
  const ageMs = started ? Date.now() - started : Infinity;
  const rateLimited = /rate.?limit|too many requests|HTTP 429|daily cap|budget reservation|quiet window/i.test(
    String(
      job.last_error || ""
    )
  );
  if (job.status === "IN_PROGRESS" && ageMs < 12e4) {
    return {
      httpStatus: 202,
      body: {
        ok: true,
        status: "QUEUED",
        fixtureId,
        message: "Analysis is already running."
      }
    };
  }
  if (rateLimited && ageMs < 9e4) {
    return {
      httpStatus: 202,
      body: {
        ok: true,
        status: "QUEUED",
        fixtureId,
        retryAfterSeconds: Math.max(
          5,
          Math.ceil(
            (9e4 - ageMs) / 1e3
          )
        ),
        message: "The provider's per-minute limit is cooling down. This match stays at the front of the queue."
      }
    };
  }
  if (![
    "PENDING",
    "FAILED",
    "READY"
  ].includes(
    job.status
  )) {
    return {
      httpStatus: 202,
      body: {
        ok: true,
        status: "QUEUED",
        fixtureId,
        message: "This match is already being handled by the Independent Model."
      }
    };
  }
  if (providerQuietWindow()) {
    return { httpStatus: 202, body: { ok: true, status: "QUEUED", fixtureId, message: "Analysis queued. Two45 provider requests resume at 5:00 AM Eastern." } };
  }
  const claimed = await claimSpecificJob(
    env,
    job
  );
  if (!claimed) {
    return {
      httpStatus: 202,
      body: {
        ok: true,
        status: "QUEUED",
        fixtureId,
        message: "Another analysis process claimed this match first."
      }
    };
  }
  const result = await processOne(env, claimed);
  if (result.status === "READY") {
    return {
      httpStatus: 200,
      body: {
        ok: true,
        status: "READY",
        source: force ? "on-demand-refresh" : "on-demand",
        forecast: result.forecast || manualForecast(
          claimed,
          result.analysis,
          result.decision
        ),
        canReanalyze: false,
        nextRefreshAt: new Date(
          Date.now() + REANALYZE_COOLDOWN_MS
        ).toISOString(),
        cooldownSeconds: Math.ceil(
          REANALYZE_COOLDOWN_MS / 1e3
        )
      }
    };
  }
  const isRate = /rate.?limit|too many requests|HTTP 429|daily cap|budget reservation|quiet window/i.test(
    String(
      result.error || ""
    )
  );
  return {
    httpStatus: isRate ? 202 : 500,
    body: {
      ok: isRate,
      status: isRate ? "QUEUED" : "FAILED",
      fixtureId,
      message: isRate ? "Provider limit reached for this minute. Two45 kept the match queued for retry." : result.error || "The analysis could not be completed."
    }
  };
}
__name(analyzeFixtureOnDemand, "analyzeFixtureOnDemand");
function competitionReliability(name, leagueId = null) {
  const tier = competitionTierV21(name, leagueId);
  if (tier === 1)
    return 0.9;
  if (tier === 2)
    return 0.86;
  if (tier === 3)
    return 0.81;
  return 0.75;
}
__name(competitionReliability, "competitionReliability");
async function processOne(env, job) {
  try {
    const canonicalBefore = await currentCanonicalAnalysisV2(env, job.fixture_id).catch(() => null);
    const baselineFirstPass = canonicalBefore?.status !== "COMPLETE";
    let [hs, as] = await Promise.all([
      cachedTeamStatsV56(env, job, "home"),
      cachedTeamStatsV56(env, job, "away")
    ]);
    const missingHome = !hs;
    const missingAway = !as;
    let fetchedBaselineSide = null;
    if (missingHome) {
      hs = await teamStats(env, job, "home", true);
      fetchedBaselineSide = "home";
    } else if (missingAway) {
      as = await teamStats(env, job, "away", true);
      fetchedBaselineSide = "away";
    }
    if (fetchedBaselineSide) {
      const stillNeedsAway = missingHome && missingAway;
      const deferMessage = stillNeedsAway ? "Baseline home input cached; waiting for away input" : "Baseline inputs ready; continuing analysis next cycle";
      await deferClaimedJobV55(env, job, deferMessage).catch(() => null);
      return {
        fixtureId: job.fixture_id,
        status: "DEFERRED",
        baselineStaged: true,
        fetchedBaselineSide,
        waitingFor: stillNeedsAway ? "away-team-baseline" : "analysis-next-cycle",
        rateLimited: false
      };
    }
    if (!hs || !as) {
      throw new Error("Baseline team features unavailable after incremental fetch");
    }
    const hf = toFeatures(hs);
    const af = toFeatures(as);
    const optionalIntel = baselineFirstPass ? { source: "baseline-first-pass", enriched: false, deferred: true } : await optionalIntelligenceV21(env, job);
    applyOptionalIntelligenceV21(hf, af, optionalIntel, job);
    const analysis = analyzeMatch({
      homeTeam: job.home_team,
      awayTeam: job.away_team,
      home: hf,
      away: af,
      context: {
        competitionReliability: competitionReliability(
          job.competition,
          job.provider_league_id
        )
      }
    });
    analysis.intelligence = {
      ...analysis.intelligence || {},
      availability: optionalIntel,
      shadowMarketModel: optionalIntel?.shadowMarketModel || null,
      shadowMarketRanking: optionalIntel?.shadowMarketRanking || null,
      shadowRecommendations: optionalIntel?.shadowRecommendations || []
    };
    await applyLiveStateV19(env, job, analysis);
    const odds = analysis.live && !analysis.liveUsable ? { response: [] } : await oddsForJobV19(env, job);
    const marketOdds = oddsMarketsFromSnapshot(
      odds,
      job.fixture_id
    );
    let decision = selectIndependent(
      analysis,
      marketOdds,
      competitionTierV21(job.competition, job.provider_league_id)
    );
    // Independent raw inference runs outside legacy analysis, in runGoalCoreSweepV3.
    // Retained legacy-wrapper shadow history is preserved; duplicate synchronous writes are retired.

    const verifyCandidateV85 = /* @__PURE__ */ __name((candidate) => {
      if (!candidate || typeof candidate !== "object")
        return null;
      const quote = exactBet365QuoteV78(
        odds,
        job.fixture_id,
        candidate.market,
        candidate.selection
      );
      if (!quote)
        return null;
      const probability = Number(candidate.probability);
      const p = Number.isFinite(probability) ? probability > 1 ? probability / 100 : probability : 0;
      const edge = p > 0 ? p - 1 / quote.odds : null;
      return {
        ...candidate,
        bookmaker: quote.bookmaker || "Bet365",
        sportsbookOdds: quote.odds,
        rawMarket: quote.rawMarket || null,
        rawSelection: quote.rawSelection || null,
        oddsVerification: quote.oddsVerification || null,
        priceVerified: true,
        priceVerificationRevision: TICKET_LOCK_REVISION_V78,
        valueEdge: edge
      };
    }, "verifyCandidateV85");
    // Preserve original independently evaluated alternatives for later research-only
    // repricing. These are NOT approved picks and never bypass Bet365 verification.
    const researchMarketOptionsV116 = decision?.decision === "PICK"
      ? arr2(decision?.topMarkets).filter(x => x && typeof x === "object").slice(0, 20)
      : [];
    const verifiedTopMarketsV85 = arr2(decision?.topMarkets).map(verifyCandidateV85).filter(Boolean);
    if (decision?.decision === "PICK") {
      const verifiedMainV85 = verifyCandidateV85(decision);
      const verifiedFallbackV101 =
        verifiedTopMarketsV85.find((x) => String(x?.lane || "").toUpperCase() === "STRONG") ||
        verifiedTopMarketsV85.find((x) => String(x?.lane || "").toUpperCase() === "RISKY_VALUE") ||
        null;
      decision = verifiedMainV85
        ? { ...decision, ...verifiedMainV85, topMarkets: verifiedTopMarketsV85 }
        : verifiedFallbackV101
          ? {
              ...decision,
              ...verifiedFallbackV101,
              decision: "PICK",
              pickType: String(verifiedFallbackV101.lane || "").toUpperCase() === "RISKY_VALUE" ? "RISKY_VALUE" : "STRONG_PICK",
              confidenceTier: String(verifiedFallbackV101.lane || "").toUpperCase() === "RISKY_VALUE" ? "RISKY" : decision.confidenceTier,
              priceVerified: true,
              topMarkets: verifiedTopMarketsV85,
              reason: "Primary model line was not exactly priced; Two45 promoted the next independently qualified exact Bet365 option."
            }
          : {
              ...decision,
              decision: "NO_BET",
              pickType: "NO_BET",
              sportsbookOdds: null,
              bookmaker: null,
              valueEdge: null,
              priceVerified: false,
              oddsVerification: null,
              topMarkets: verifiedTopMarketsV85,
              reason: "Pick withheld until an independently qualified exact full-match Bet365 option is verified."
            };
    } else {
      decision = { ...decision, topMarkets: verifiedTopMarketsV85 };
    }
    const clientForecast = manualForecast(job, analysis, decision);
    await writeForecast(
      env,
      job,
      analysis,
      decision
    );
    await saveLatestAnalysisV19(env, job, analysis, decision);
    await completeCanonicalAnalysisV2(env, job, clientForecast, analysis, { ...decision, researchMarketOptions: researchMarketOptionsV116 });
    await patchJob(
      env,
      job.id,
      {
        attempts: 0,
        status: "READY",
        completed_at: (/* @__PURE__ */ new Date()).toISOString(),
        last_error: null
      }
    );
    return {
      fixtureId: job.fixture_id,
      status: "READY",
      decision,
      analysis,
      forecast: clientForecast
    };
  } catch (e) {
    const msg = e?.message || String(e);
    const rateLimited = /rate.?limit|too many requests|HTTP 429|daily cap|budget reservation|quiet window|pacing lock busy|another request is active|bounded provider burst complete/i.test(
      msg
    );
    await patchJob(
      env,
      job.id,
      {
        status: rateLimited ? "PENDING" : num4(
          job.attempts,
          0
        ) >= 4 ? "FAILED" : "PENDING",
        attempts: rateLimited ? 0 : num4(job.attempts, 0),
        started_at: rateLimited ? null : job.started_at,
        last_error: msg
      }
    );
    return {
      fixtureId: job.fixture_id,
      status: rateLimited ? "DEFERRED" : "FAILED",
      error: msg,
      rateLimited
    };
  }
}
__name(processOne, "processOne");
async function loadExistingQueueV39(env) {
  try {
    const rows = arr2(await sb(env, "rpc/two45_next_feature_jobs_v2", {
      method: "POST",
      timeoutMs: 5e3,
      body: JSON.stringify({
        p_model_version: MODEL_VERSION,
        p_limit: 30
      })
    }));
    const jobs = rows.map((r) => ({
      ...r.job || {},
      canonicalComplete: Boolean(r.canonical_complete),
      canonicalStatus: r.canonical_status || "PENDING",
      canonicalRefreshing: Boolean(r.canonical_refreshing),
      shadowAttempted: Boolean(r.shadow_attempted)
    }));
    return {
      jobs,
      summary: {
        eligible: jobs.length,
        existing: jobs.length,
        inserted: 0,
        excluded: 0,
        source: "ranked-rpc-v2"
      }
    };
  } catch (e) {
    const jobs = arr2(await sb(
      env,
      "two45_feature_jobs?status=in.(PENDING,READY,FAILED)&select=id,job_key,provider_match_id,fixture_id,kickoff_at,competition,provider_league_id,season,home_team_id,home_team,away_team_id,away_team,status,priority,attempts,requested_at,started_at,completed_at,last_error,source_snapshot_key,metadata&order=priority.asc,requested_at.asc&limit=30",
      { timeoutMs: 5e3 }
    ));
    const ids = jobs.map((j) => Number(j.fixture_id)).filter(Boolean);
    const canonical = ids.length ? await rowsForIdsV19(env, "two45_analysis_state", "fixture_id", ids) : [];
    const byFixture = new Map(
      canonical.filter((r) => r.model_version === MODEL_VERSION).map((r) => [Number(r.fixture_id), r])
    );
    return {
      jobs: jobs.map((j) => {
        const row = byFixture.get(Number(j.fixture_id));
        return {
          ...j,
          canonicalComplete: row?.status === "COMPLETE",
          canonicalStatus: row?.status || "PENDING",
          canonicalRefreshing: Boolean(row?.refreshing),
          shadowAttempted: Boolean(row?.shadow_attempted)
        };
      }),
      summary: {
        eligible: jobs.length,
        existing: jobs.length,
        inserted: 0,
        excluded: 0,
        source: "bounded-fallback-v2"
      }
    };
  }
}
__name(loadExistingQueueV39, "loadExistingQueueV39");
async function processJobs(env, limit = DEFAULT_MODEL_BATCH, prepared = null, skipRecovery = false) {
  if (providerQuietWindow()) {
    return { ok: true, skipped: true, reason: "Provider quiet window 00:00-05:00 America/New_York", claimed: 0, processed: 0, queue: null, results: [] };
  }
  if (skipRecovery) {
    const freshResults = [];
    const freshDeadline = Date.now() + 17000;
    for (let step = 0; step < 3 && freshDeadline-Date.now()>=9000; step++) {
      const freshOwned = await timedV2(claimNextFreshJobV55(env), 3e3, "atomic fresh claim").catch(() => null);
      if (!freshOwned)
        break;
      let result;
      try {
        const processBudget=Math.min(15000,Math.max(1000,freshDeadline-Date.now()-2000));
        result = await timedV2(
          processOne(env, freshOwned),
          processBudget,
          "fresh fixture " + freshOwned.fixture_id + " analysis"
        );
      } catch (e) {
        const msg = "V69 bounded fresh-cycle recovery: " + safeRefreshError(e);
        await timedV2(deferClaimedJobV55(env, freshOwned, msg),2000,'fresh-cycle recovery').catch(() => null);
        result = { fixtureId: freshOwned.fixture_id, status: "DEFERRED", autoRecovered: true, rateLimited: false, error: msg };
      }
      freshResults.push(result);
      if (result?.rateLimited || /bounded provider burst complete/i.test(String(result?.error || "")))
        break;
    }
    if (freshResults.length) {
      const ready = freshResults.filter((x) => x.status === "READY").length;
      return {
        ok: freshResults.every((x) => x.status === "READY" || x.status === "DEFERRED"),
        claimed: freshResults.length,
        processed: freshResults.length,
        claimStarved: false,
        candidateCount: freshResults.length,
        freshTomorrowBacklog: 0,
        freshBaselineBacklog: Math.max(0, freshResults.length - ready),
        adaptiveBatch: freshResults.length,
        queue: { eligible: freshResults.length, existing: freshResults.length, inserted: 0, excluded: 0, source: "atomic-fresh-v69" },
        results: freshResults
      };
    }
  }
  if (!skipRecovery) {
    await timedV2(requeueStale(env), 4e3, "stale job recovery").catch(() => null);
    await timedV2(recoverCanonicalAnalysisV2(env), 4e3, "canonical recovery").catch(() => null);
  }
  const queue = prepared || await timedV2(loadExistingQueueV39(env), 4e3, "queue load");
  const candidates = rankedJobsV19(queue.jobs);
  const freshTomorrowBacklog = candidates.filter((j) => !j.canonicalComplete && dateOfV19(j.kickoff_at) === tomorrowEasternDate()).length;
  const adaptive = adaptiveBatchV30(candidates, limit);
  const freshBaselineBacklog = adaptive.freshBaselineBacklog;
  const cycleLimit = adaptive.limit;
  const pacing = (await getFeedSnapshot(env, "api-football-pacing").catch(() => null))?.payload || {};
  const fastBaselineMode = freshBaselineBacklog > 0;
  if (Boolean(pacing.fastBaselineMode) !== fastBaselineMode) {
    pacing.fastBaselineMode = fastBaselineMode;
    await saveFeedSnapshot(env, "api-football-pacing", pacing, 172800);
  }
  const cooldownWait = Math.max(0, num4(pacing.blockedUntil) - Date.now());
  if (cooldownWait > 2e4) {
    return { ok: true, skipped: true, cooldownActive: true, retryAt: num4(pacing.blockedUntil), reason: "Provider cooldown", claimed: 0, processed: 0, freshTomorrowBacklog, freshBaselineBacklog, adaptiveBatch: cycleLimit, queue: queue.summary, results: [] };
  }
  const results = [];
  const deadline = Date.now() + (freshBaselineBacklog > 0 ? 17500 : 17000);
  let claimed = 0;
  for (const candidate of candidates) {
    if (claimed >= cycleLimit || Date.now() >= deadline)
      break;
    let job = candidate;
    if (job.status === "READY") {
      const rows = await sb(
        env,
        `two45_feature_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.READY&completed_at=eq.${encodeURIComponent(job.completed_at)}&select=*`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "PENDING",
            attempts: 0,
            requested_at: (/* @__PURE__ */ new Date()).toISOString()
          })
        }
      );
      if (!arr2(rows).length)
        continue;
      job = { ...rows[0], metadata: job.metadata, kickoff_at: job.kickoff_at };
    }
    const owned = await claimSpecificJob(env, job);
    if (!owned)
      continue;
    claimed++;
    let result;
    try {
      result = await timedV2(
        processOne(env, owned),
        15e3,
        "fixture " + owned.fixture_id + " analysis"
      );
    } catch (e) {
      const msg = safeRefreshError(e);
      await patchJob(env, owned.id, {
        status: "PENDING",
        started_at: null,
        last_error: "Auto-requeued after bounded analysis timeout: " + msg
      }).catch(() => null);
      await sb(
        env,
        "two45_analysis_state?analysis_key=eq." + encodeURIComponent(analysisKeyV2(owned)),
        {
          method: "PATCH",
          timeoutMs: 6e3,
          body: JSON.stringify({
            status: "PENDING",
            refreshing: false,
            started_at: null,
            updated_at: (/* @__PURE__ */ new Date()).toISOString(),
            last_error: "Auto-requeued after bounded analysis timeout: " + msg,
            next_retry_at: new Date(Date.now() + 6e4).toISOString()
          })
        }
      ).catch(() => null);
      result = {
        fixtureId: owned.fixture_id,
        status: "DEFERRED",
        rateLimited: false,
        autoRecovered: true,
        error: msg
      };
    }
    results.push(result);
    if (result.rateLimited)
      break;
  }
  const claimStarved = candidates.length > 0 && claimed === 0;
  return {
    ok: !claimStarved && results.every((x) => x.status === "READY" || x.status === "DEFERRED"),
    claimed,
    processed: results.length,
    claimStarved,
    candidateCount: candidates.length,
    freshTomorrowBacklog,
    freshBaselineBacklog,
    adaptiveBatch: cycleLimit,
    queue: queue.summary,
    results
  };
}
__name(processJobs, "processJobs");
function updateCalibrationAccumulatorV44(current, rows) {
  const out = current && typeof current === "object" ? JSON.parse(JSON.stringify(current)) : {};
  out.buckets = out.buckets || {};
  out.settled = num4(out.settled, 0);
  out.wins = num4(out.wins, 0);
  out.losses = num4(out.losses, 0);
  for (const row of arr2(rows)) {
    if (!["WIN", "LOSS"].includes(row.result))
      continue;
    const key = row.market + "|" + row.calibrationBucket;
    const b = out.buckets[key] || { settled: 0, wins: 0, losses: 0 };
    b.settled++;
    out.settled++;
    if (row.result === "WIN") {
      b.wins++;
      out.wins++;
    } else {
      b.losses++;
      out.losses++;
    }
    b.hitRate = b.settled ? b.wins / b.settled : null;
    out.buckets[key] = b;
  }
  out.hitRate = out.settled ? out.wins / out.settled : null;
  out.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return out;
}
__name(updateCalibrationAccumulatorV44, "updateCalibrationAccumulatorV44");
async function settleShadowBacktestV44(env, limit = 1) {
  if (!shadowV40Enabled(env))
    return { ok: true, disabled: true, processed: 0, skipped: 0 };
  const cutoffIso = new Date(Date.now() - 90 * 6e4).toISOString();
  const rows = await sb(
    env,
    "two45_analysis_state?status=eq.COMPLETE&kickoff_at=lt." + encodeURIComponent(cutoffIso) + "&select=fixture_id,kickoff_at,result&order=kickoff_at.desc&limit=80"
  ).catch(() => []);
  let processed = 0;
  let skipped = 0;
  for (const row of arr2(rows)) {
    if (processed >= Math.max(1, num4(limit, 1)))
      break;
    const fixtureId = Number(row.fixture_id);
    const result = row.result || {};
    const recommendations = arr2(result?.intelligence?.shadowRecommendations).filter((x) => x?.market && x?.selection);
    const context = result.shadowContext || {};
    if (!fixtureId || !recommendations.length || !context.homeTeamId || !context.awayTeamId) {
      skipped++;
      continue;
    }
    const existing = await getFeedSnapshot(env, "shadow-backtest:" + fixtureId).catch(() => null);
    if (existing?.payload?.settled) {
      skipped++;
      continue;
    }
    const date = dateOfV19(row.kickoff_at);
    const fixtureSnap = await getFeedSnapshot(env, fixtureKey(date)).catch(() => null);
    const fixtureRows = arr2(
      fixtureSnap?.payload?.response || fixtureSnap?.payload?.fixtures || fixtureSnap?.payload
    );
    const fixture = fixtureRows.find((f) => Number(f?.fixture?.id || f?.id) === fixtureId);
    const status = String(fixture?.fixture?.status?.short || fixture?.status?.short || "").toUpperCase();
    if (!FINISHED_STATUSES.has(status)) {
      skipped++;
      continue;
    }
    const allowed = await reserveShadowCallV46(env, 1);
    if (!allowed)
      break;
    const statResponse = await football(env, "/fixtures/statistics", { fixture: fixtureId });
    const stats = arr2(statResponse?.response);
    if (!stats.length) {
      skipped++;
      continue;
    }
    const graded = buildShadowBacktestRowsV43(
      recommendations,
      stats,
      Number(context.homeTeamId),
      Number(context.awayTeamId)
    ).filter((x) => x.result !== "UNGRADABLE");
    if (!graded.length) {
      skipped++;
      continue;
    }
    const payload = {
      settled: true,
      fixtureId,
      kickoffAt: row.kickoff_at,
      gradedAt: (/* @__PURE__ */ new Date()).toISOString(),
      rows: graded
    };
    await saveFeedSnapshot(env, "shadow-backtest:" + fixtureId, payload, 90 * 86400);
    const currentCalibration = (await getFeedSnapshot(env, "shadow-calibration:v44").catch(() => null))?.payload || {};
    const nextCalibration = updateCalibrationAccumulatorV44(currentCalibration, graded);
    await saveFeedSnapshot(env, "shadow-calibration:v44", nextCalibration, 365 * 86400);
    processed++;
  }
  const calibration = (await getFeedSnapshot(env, "shadow-calibration:v44").catch(() => null))?.payload || {};
  return {
    ok: true,
    processed,
    skipped,
    calibrationSettled: num4(calibration.settled, 0),
    calibrationHitRate: calibration.hitRate ?? null
  };
}
__name(settleShadowBacktestV44, "settleShadowBacktestV44");
function parseCalibrationBucketV45(bucket) {
  const m = String(bucket || "").match(/^([0-9.]+)-([0-9.]+)$/);
  if (!m)
    return null;
  const low = Number(m[1]);
  const high = Number(m[2]);
  if (!Number.isFinite(low) || !Number.isFinite(high))
    return null;
  return { low, high, midpoint: (low + high) / 2 };
}
__name(parseCalibrationBucketV45, "parseCalibrationBucketV45");
function shadowAccuracyReportFromCalibrationV45(calibration = {}) {
  const buckets = calibration?.buckets || {};
  const marketMap = {};
  let brierWeighted = 0;
  let brierN = 0;
  for (const [key, row] of Object.entries(buckets)) {
    const split = key.lastIndexOf("|");
    if (split < 0)
      continue;
    const market = key.slice(0, split);
    const bucket = key.slice(split + 1);
    const settled = num4(row?.settled, 0);
    const wins = num4(row?.wins, 0);
    const losses = num4(row?.losses, 0);
    if (!settled)
      continue;
    const hitRate = wins / settled;
    const parsed = parseCalibrationBucketV45(bucket);
    const statedProbability = parsed?.midpoint ?? null;
    const calibrationError = statedProbability == null ? null : Math.abs(hitRate - statedProbability);
    marketMap[market] = marketMap[market] || {
      market,
      settled: 0,
      wins: 0,
      losses: 0,
      weightedStatedProbability: 0,
      calibrationErrorWeighted: 0,
      calibrationErrorN: 0,
      buckets: []
    };
    const m = marketMap[market];
    m.settled += settled;
    m.wins += wins;
    m.losses += losses;
    if (statedProbability != null) {
      m.weightedStatedProbability += statedProbability * settled;
      m.calibrationErrorWeighted += calibrationError * settled;
      m.calibrationErrorN += settled;
      brierWeighted += Math.pow(hitRate - statedProbability, 2) * settled;
      brierN += settled;
    }
    m.buckets.push({
      bucket,
      settled,
      wins,
      losses,
      hitRate,
      statedProbability,
      calibrationError
    });
  }
  const markets = Object.values(marketMap).map((m) => ({
    market: m.market,
    settled: m.settled,
    wins: m.wins,
    losses: m.losses,
    hitRate: m.settled ? m.wins / m.settled : null,
    avgStatedProbability: m.calibrationErrorN ? m.weightedStatedProbability / m.calibrationErrorN : null,
    meanCalibrationError: m.calibrationErrorN ? m.calibrationErrorWeighted / m.calibrationErrorN : null,
    buckets: m.buckets.sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)))
  })).sort((a, b) => b.settled - a.settled);
  return {
    model: "two45-market-shadow-v40",
    calibrationStatus: num4(calibration?.settled, 0) >= 20 ? "EMPIRICAL_ACTIVE" : "COLLECTING",
    settled: num4(calibration?.settled, 0),
    wins: num4(calibration?.wins, 0),
    losses: num4(calibration?.losses, 0),
    hitRate: calibration?.hitRate ?? (num4(calibration?.settled, 0) ? num4(calibration?.wins, 0) / num4(calibration?.settled, 0) : null),
    calibrationBrier: brierN ? brierWeighted / brierN : null,
    markets,
    updatedAt: calibration?.updatedAt || null
  };
}
__name(shadowAccuracyReportFromCalibrationV45, "shadowAccuracyReportFromCalibrationV45");
async function shadowAccuracyReportV45(env) {
  const calibration = (await getFeedSnapshot(env, "shadow-calibration:v44").catch(() => null))?.payload || {};
  return shadowAccuracyReportFromCalibrationV45(calibration);
}
__name(shadowAccuracyReportV45, "shadowAccuracyReportV45");
function learningNormV82(v) {
  return String(v || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
__name(learningNormV82, "learningNormV82");
function learningProfileKeyV82(team, market, selection) {
  return [learningNormV82(team), learningNormV82(market), learningNormV82(selection)].join("|");
}
__name(learningProfileKeyV82, "learningProfileKeyV82");
function learningConfidenceV82(profile) {
  const n = num4(profile?.settled, 0), wins = num4(profile?.wins, 0);
  if (n < 4)
    return { eligible: false, bonus: 0, label: "EARLY_SAMPLE" };
  const hit = wins / Math.max(1, n), sample = Math.min(1, n / 20), centered = (hit - 0.55) * 20 * sample;
  return { eligible: n >= 6, bonus: clamp4(centered, -4, 6), label: n >= 12 ? hit >= 0.72 ? "DEPENDABLE" : hit <= 0.42 ? "CAUTION" : "NEUTRAL" : hit >= 0.75 ? "EMERGING_DEPENDABLE" : "BUILDING", hitRate: hit, sampleSize: n };
}
__name(learningConfidenceV82, "learningConfidenceV82");
function learningReviewV82(row) {
  const result = String(row?.result || "").toUpperCase(), p = Number(row?.probability) > 1 ? Number(row.probability) / 100 : num4(row?.probability, 0), odds = num4(row?.odds, 0), implied = odds > 1 ? 1 / odds : null;
  let reviewType = "SETTLED_REVIEW", lesson = "Keep this result in the evidence base; do not change the model from one outcome.";
  if (result === "WIN")
    lesson = "The decision is recorded as supporting evidence, but one win does not validate the reasoning by itself.";
  if (result === "LOSS")
    lesson = "The pick missed. Treat this as a review signal, not an automatic model correction; look for repetition in the same team/market pattern.";
  return { reviewType, result, modelProbability: p || null, marketImplied: implied, probabilityGap: p && implied ? p - implied : null, lesson };
}
__name(learningReviewV82, "learningReviewV82");
function updateLearningAccumulatorV82(current, rows) {
  const out = current && typeof current === "object" ? JSON.parse(JSON.stringify(current)) : { version: "v82", profiles: {}, reviews: [], processed: {} };
  out.profiles = out.profiles || {};
  out.reviews = arr2(out.reviews);
  out.processed = out.processed || {};
  for (const row of arr2(rows)) {
    if (!["WIN", "LOSS"].includes(row.result))
      continue;
    const identity = String(row.id || [row.fixtureId, row.market, row.selection, row.createdAt || row.kickoffAt].join("|"));
    if (out.processed[identity])
      continue;
    out.processed[identity] = (/* @__PURE__ */ new Date()).toISOString();
    const teams = [row.homeTeam, row.awayTeam].filter(Boolean);
    for (const team of teams) {
      const key = learningProfileKeyV82(team, row.market, row.selection), p = out.profiles[key] || { team, market: row.market, selection: row.selection, settled: 0, wins: 0, losses: 0, lastSettledAt: null };
      p.settled++;
      if (row.result === "WIN")
        p.wins++;
      else
        p.losses++;
      p.hitRate = p.wins / Math.max(1, p.settled);
      p.lastSettledAt = row.settledAt || (/* @__PURE__ */ new Date()).toISOString();
      p.reliability = learningConfidenceV82(p);
      out.profiles[key] = p;
    }
    const review = { id: identity, fixtureId: row.fixtureId, homeTeam: row.homeTeam, awayTeam: row.awayTeam, market: row.market, selection: row.selection, odds: row.odds, probability: row.probability, result: row.result, settledAt: row.settledAt || (/* @__PURE__ */ new Date()).toISOString(), ...learningReviewV82(row) };
    out.reviews.unshift(review);
  }
  out.reviews = out.reviews.slice(0, 300);
  const processedEntries = Object.entries(out.processed).sort((a, b) => Date.parse(b[1] || 0) - Date.parse(a[1] || 0)).slice(0, 2500);
  out.processed = Object.fromEntries(processedEntries);
  out.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return out;
}
__name(updateLearningAccumulatorV82, "updateLearningAccumulatorV82");
async function refreshLearningLoopV82(env) {
  const history = await researchHistoryV2(env, 1e3);
  const settled = arr2(history?.rows).filter((x) => ["WIN", "LOSS"].includes(x.result));
  const current = (await getFeedSnapshot(env, "two45-learning:v82").catch(() => null))?.payload || {};
  const before = Object.keys(current?.processed || {}).length, next = updateLearningAccumulatorV82(current, settled), after = Object.keys(next?.processed || {}).length;
  await saveFeedSnapshot(env, "two45-learning:v82", next, 365 * 86400);
  return { ok: true, newReviews: Math.max(0, after - before), profiles: Object.keys(next.profiles || {}).length, updatedAt: next.updatedAt };
}
__name(refreshLearningLoopV82, "refreshLearningLoopV82");
async function settleFounderStatMarketsV114(env) {
  const rows = await sb(env, "two45_founder_picks?status=eq.PUBLISHED&result=is.null&select=id,fixture_id,market,selection,published_odds&limit=25").catch(() => []);
  let settled = 0;
  for (const pick of arr2(rows)) {
    const market = String(pick?.market || "").toUpperCase();
    if (!["HOME_CARDS", "AWAY_CARDS", "TOTAL_CARDS"].includes(market)) continue;
    const fixtureId = Math.trunc(num4(pick?.fixture_id, 0));
    if (!fixtureId) continue;
    try {
      const payload = await providerFetchV18(env, "fixtures/statistics", { fixture: String(fixtureId) });
      const teams = arr2(payload?.response);
      if (teams.length < 2) continue;
      const statValue = (team, names) => {
        const row = arr2(team?.statistics).find((x) => names.includes(String(x?.type || "").toLowerCase()));
        const n = Number(row?.value);
        return Number.isFinite(n) ? n : null;
      };
      const yellowNames = ["yellow cards"];
      const redNames = ["red cards"];
      const cardTotal = (team) => {
        const y = statValue(team, yellowNames), r = statValue(team, redNames);
        if (y == null && r == null) return null;
        return num4(y, 0) + num4(r, 0);
      };
      const homeCards = cardTotal(teams[0]), awayCards = cardTotal(teams[1]);
      const totalCards = homeCards != null && awayCards != null ? homeCards + awayCards : null;
      const actual = market === "HOME_CARDS" ? homeCards : market === "AWAY_CARDS" ? awayCards : totalCards;
      if (actual == null) continue;
      const selection = ticketSelectionKeyV78(pick?.selection);
      const m = selection.match(/^(OVER|UNDER)_([0-9]+)_([05])$/);
      if (!m) continue;
      const line = Number(m[2] + "." + m[3]);
      const win = m[1] === "OVER" ? actual > line : actual < line;
      const result = win ? "WIN" : "LOSS";
      const profit = win ? num4(pick?.published_odds, 1) - 1 : -1;
      await sb(env, `two45_founder_picks?id=eq.${encodeURIComponent(pick.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "SETTLED", result, profit_units: profit, settled_at: new Date().toISOString() })
      });
      settled++;
    } catch (_) {}
  }
  return settled;
}
__name(settleFounderStatMarketsV114, "settleFounderStatMarketsV114");

async function settle(env) {
  const result = await sb(
    env,
    "rpc/two45_settle_from_fixture_snapshot",
    {
      method: "POST",
      body: JSON.stringify({
        p_snapshot_key: `fixtures:${easternDate()}`
      })
    }
  );
  const founderStatsSettled = await settleFounderStatMarketsV114(env).catch(() => 0);
  let learning = null;
  try {
    learning = await refreshLearningLoopV82(env);
  } catch (e) {
    learning = { ok: false, error: String(e?.message || e).slice(0, 240) };
  }
  return { settlement: result, founderStatsSettled, learning };
}
__name(settle, "settle");
async function modelStatus(env) {
  let forecasts = null;
  let pending = null;
  let ready = null;
  try {
    const rows = await allRowsV19(
      env,
      "two45_model_forecasts?select=id&order=id.asc"
    );
    forecasts = Array.isArray(
      rows
    ) ? rows.length : null;
  } catch (_) {
  }
  try {
    const rows = await allRowsV19(
      env,
      "two45_feature_jobs?select=status&order=id.asc"
    );
    if (Array.isArray(
      rows
    )) {
      pending = rows.filter(
        (x) => x.status === "PENDING"
      ).length;
      ready = rows.filter(
        (x) => x.status === "READY"
      ).length;
    }
  } catch (_) {
  }
  return {
    ok: true,
    modelVersion: MODEL_VERSION,
    coreUsesSportsbookOdds: false,
    forecastCount: forecasts,
    pendingFeatureJobs: pending,
    readyFeatureJobs: ready,
    pacingRevision: PACING_REVISION,
    providerPacing: { minIntervalMs: FAST_BASELINE_INTERVAL_MS, maxIntervalMs: 22e3, targetDailyRequests: TARGET_DAILY_REQUESTS, practicalDailyCap: PRACTICAL_DAILY_CAP, hardCap: HARD_CAP, state: (await getFeedSnapshot(env, "api-football-pacing"))?.payload || null, currentIntervalMs: adaptiveProviderIntervalV30((await getFeedSnapshot(env, "api-football-pacing"))?.payload || {}) },
    modelBatch: batchLimitV19(env.TWO45_MODEL_BATCH),
    shadowV40: {
      enabled: shadowV40Enabled(env),
      dailyCap: Math.max(50, num4(env.TWO45_V40_DAILY_CAP, SHADOW_V40_DEFAULT_DAILY_CAP)),
      budget: await shadowBudgetV46(env)
    },
    pipeline: (await getFeedSnapshot(env, "cron-status").catch(() => null))?.payload || null,
    tomorrowPreloadStartsAt: "20:00 America/New_York",
    tomorrowPreloadActive: shouldPreloadTomorrow(),
    providerQuietWindowActive: providerQuietWindow(),
    providerQuietHours: "Disabled \xE2\x80\x94 provider operates 24/7",
    supportedAnalysisFamilies: [
      "match-result",
      "double-chance",
      "handicap",
      "goals",
      "btts",
      "corners",
      "corner-handicap",
      "cards",
      "shots",
      "shots-on-target",
      "shots-off-target",
      "player-shots"
    ]
  };
}
__name(modelStatus, "modelStatus");
var arr2 = /* @__PURE__ */ __name((v) => Array.isArray(v) ? v : [], "arr");
var fixtureKey = /* @__PURE__ */ __name((date) => `fixtures:${date}`, "fixtureKey");
var oddsKey = /* @__PURE__ */ __name((date) => `odds:${date}`, "oddsKey");
var modelBoardKey = /* @__PURE__ */ __name((date) => `model-board:${date}`, "modelBoardKey");
function safeRefreshError(error) {
  return String(
    error?.message || error || "Unknown refresh error"
  ).slice(
    0,
    300
  );
}
__name(safeRefreshError, "safeRefreshError");
async function rpcRefresh(env, name, body) {
  return await sb(
    env,
    `rpc/${name}`,
    {
      method: "POST",
      body: JSON.stringify(
        body
      )
    }
  );
}
__name(rpcRefresh, "rpcRefresh");
async function saveFeedSnapshot(env, key, payload, ttlSeconds) {
  const date = key.includes(":") ? key.split(":").pop() : null;
  const body = {
    snapshot_key: key,
    payload,
    provider_date: /^\d{4}-\d{2}-\d{2}$/.test(
      date || ""
    ) ? date : null,
    refreshed_at: (/* @__PURE__ */ new Date()).toISOString(),
    expires_at: new Date(
      Date.now() + ttlSeconds * 1e3
    ).toISOString(),
    request_count: 0
  };
  await sb(
    env,
    `two45_feed_snapshots?on_conflict=snapshot_key`,
    {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify(
        body
      )
    }
  );
}
__name(saveFeedSnapshot, "saveFeedSnapshot");
async function getFeedSnapshot(env, key) {
  const rows = await sb(
    env,
    `two45_feed_snapshots?snapshot_key=eq.${encodeURIComponent(
      key
    )}&select=payload,refreshed_at,expires_at&limit=1`
  );
  return arr2(
    rows
  )[0] || null;
}
__name(getFeedSnapshot, "getFeedSnapshot");
async function feedDue(env, key, seconds) {
  const row = await getFeedSnapshot(
    env,
    key
  );
  return !row || Date.now() - Date.parse(
    row.refreshed_at
  ) >= seconds * 1e3;
}
__name(feedDue, "feedDue");
async function providerFetchV18(env, path2, params = {}) {
  if (providerQuietWindow()) {
    throw new Error("API-Football quiet window is active until 05:00 America/New_York");
  }
  const lockKey = "api-football-pacing";
  const leaseDeadline = Date.now() + (providerBurstV69 ? 2e4 : 12e3);
  let pacing;
  try {
    pacing = (await getFeedSnapshot(env, lockKey))?.payload || {};
    const utcDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (pacing.budgetDate === utcDate && num4(pacing.used) >= PRACTICAL_DAILY_CAP) {
      throw new Error("Two45 practical daily cap of 6500 reached.");
    }
    const blockedWait = Math.max(0, num4(pacing.blockedUntil) - Date.now());
    if (blockedWait > 0) {
      const error = new Error("API-Football rate limit pacing not ready; retry on next cron");
      error.retryAt = num4(pacing.blockedUntil);
      throw error;
    }
    const wait = Math.max(0, num4(pacing.nextAt) - Date.now());
    const burst = providerBurstV69;
    if (burst && burst.calls >= burst.maxCalls) {
      const error = new Error("Two45 bounded provider burst complete; continue next cron");
      error.retryAt = Date.now() + 6e4;
      throw error;
    }
    if (wait > 0) {
      if (!burst) {
        const error = new Error("API-Football rate limit pacing not ready; retry on next cron");
        error.retryAt = num4(pacing.nextAt);
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(PROVIDER_BURST_GAP_MS_V69, wait)));
    }
    if (Date.now() >= leaseDeadline)
      throw new Error("API-Football rate limit pacing lease expired");
    if (burst)
      burst.calls += 1;
    const nextInterval = burst ? PROVIDER_BURST_GAP_MS_V69 : adaptiveProviderIntervalV30(pacing);
    pacing = { ...pacing, nextAt: Date.now() + nextInterval };
    await saveFeedSnapshot(env, lockKey, pacing, 172800);
    const payload = await providerFetchReservedV18(env, path2, params, pacing, leaseDeadline);
    await saveFeedSnapshot(env, lockKey, {
      ...pacing,
      nextAt: Date.now() + (burst ? PROVIDER_BURST_GAP_MS_V69 : adaptiveProviderIntervalV30(pacing)),
      burstCallsThisCron: burst ? burst.calls : 0,
      burstMaxCalls: burst ? burst.maxCalls : 0
    }, 172800);
    return payload;
  } catch (error) {
    if (pacing && /Too many requests|HTTP 429|exceeded.*minute/i.test(safeRefreshError(error))) {
      const retryAt = Math.max(Date.now() + 65e3, num4(error.retryAt));
      await saveFeedSnapshot(env, lockKey, { ...pacing, blockedUntil: retryAt, nextAt: retryAt }, 172800);
    }
    throw error;
  }
}
__name(providerFetchV18, "providerFetchV18");
async function providerFetchReservedV18(env, path2, params = {}, pacing = {}, leaseDeadline = 0) {
  if (!footballKey(
    env
  )) {
    throw new Error(
      "API_FOOTBALL_KEY is not configured."
    );
  }
  let state = null;
  try {
    const reservation = await rpcRefresh(
      env,
      "two45_reserve_internal_requests_v2",
      {
        p_units: 1
      }
    );
    state = Array.isArray(
      reservation
    ) ? reservation[0] : reservation;
  } catch (e) {
    throw new Error(
      `Provider budget reservation failed: ${safeRefreshError(
        e
      )}`
    );
  }
  if (!state?.allowed) {
    throw new Error(
      `Two45 internal daily cap of ${HARD_CAP} reached.`
    );
  }
  pacing.budgetDate = state.date;
  pacing.used = num4(state.used);
  if (pacing.used > PRACTICAL_DAILY_CAP) {
    await saveFeedSnapshot(env, "api-football-pacing", pacing, 172800);
    throw new Error("Two45 practical daily cap of 6500 reached.");
  }
  pacing.nextAt = Date.now() + adaptiveProviderIntervalV30(pacing);
  await saveFeedSnapshot(env, "api-football-pacing", pacing, 172800);
  if (Date.now() >= leaseDeadline)
    throw new Error("API-Football rate limit pacing lease expired");
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase gateway configuration missing.");
  }
  const gatewayUrl = `${String(env.SUPABASE_URL).replace(/\/$/, "")}/functions/v1/two45-football-gateway`;
  const response = await fetch(
    gatewayUrl,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "x-apisports-key": footballKey(
          env
        ),
        Accept: "application/json"
      },
      body: JSON.stringify({
        endpoint: String(path2).replace(/^\/+/, ""),
        params
      }),
      signal: AbortSignal.timeout(4500)
    }
  );
  const remaining = Number(response.headers.get("x-ratelimit-requests-remaining") ?? NaN);
  const minuteLimit = Number(response.headers.get("x-ratelimit-limit") ?? NaN);
  const minuteRemaining = Number(response.headers.get("x-ratelimit-remaining") ?? NaN);
  const dailyLimit = Number(response.headers.get("x-ratelimit-requests-limit") ?? NaN);
  Object.assign(pacing, {
    providerMinuteLimit: Number.isFinite(minuteLimit) ? minuteLimit : null,
    providerMinuteRemaining: Number.isFinite(minuteRemaining) ? minuteRemaining : null,
    providerDailyLimit: Number.isFinite(dailyLimit) ? dailyLimit : null,
    providerDailyRemaining: Number.isFinite(remaining) ? remaining : null,
    lastProviderStatus: response.status,
    lastProviderAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  await saveFeedSnapshot(env, "api-football-pacing", pacing, 172800);
  const retryAfter = response.headers.get("retry-after");
  const retryAt = Number.isFinite(Number(retryAfter)) ? Date.now() + Number(retryAfter) * 1e3 : Date.parse(retryAfter || "");
  if (response.status === 429) {
    const error = new Error("API-Football returned HTTP 429.");
    error.retryAt = retryAt;
    throw error;
  }
  if (Number.isFinite(
    remaining
  ) && remaining >= 0) {
    await Promise.race([
      rpcRefresh(env, "two45_set_provider_remaining", { p_remaining: remaining }),
      new Promise((resolve) => setTimeout(() => resolve(null), 3e3))
    ]).catch(() => null);
  }
  const payload = await response.json().catch(() => {
    throw new Error("API-Football returned invalid JSON");
  });
  if (!response.ok) {
    throw new Error(
      `API-Football returned HTTP ${response.status}.`
    );
  }
  const errors = payload?.errors;
  if (errors && (Array.isArray(
    errors
  ) && errors.length || !Array.isArray(
    errors
  ) && Object.keys(
    errors
  ).length)) {
    throw new Error(
      `API-Football: ${JSON.stringify(
        errors
      ).slice(
        0,
        220
      )}`
    );
  }
  if (!Object.prototype.hasOwnProperty.call(payload, "response"))
    throw new Error("API-Football response missing");
  return payload;
}
__name(providerFetchReservedV18, "providerFetchReservedV18");
function makeFixtureBoard(date, fixtures) {
  const live = [];
  const upcoming = [];
  const finished = [];
  const other = [];
  for (const fixture of fixtures) {
    const status = fixture?.fixture?.status?.short;
    if (LIVE_STATUSES.has(
      status
    )) {
      live.push(
        fixture
      );
    } else if (UPCOMING_STATUSES.has(
      status
    )) {
      upcoming.push(
        fixture
      );
    } else if (FINISHED_STATUSES.has(
      status
    )) {
      finished.push(
        fixture
      );
    } else {
      other.push(
        fixture
      );
    }
  }
  return {
    ok: true,
    service: "two45-live-worker",
    timezone: TIME_ZONE,
    date,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    total: fixtures.length,
    counts: {
      total: fixtures.length,
      live: live.length,
      upcoming: upcoming.length,
      finished: finished.length,
      other: other.length
    },
    fixtures,
    live,
    upcoming,
    finished,
    other
  };
}
__name(makeFixtureBoard, "makeFixtureBoard");
async function refreshFixturesV18(env, date) {
  const payload = await providerFetchV18(
    env,
    "fixtures",
    {
      date,
      timezone: TIME_ZONE
    }
  );
  return makeFixtureBoard(
    date,
    arr2(
      payload.response
    )
  );
}
__name(refreshFixturesV18, "refreshFixturesV18");
async function refreshLiveV18(env, date) {
  const payload = await providerFetchV18(
    env,
    "fixtures",
    {
      live: "all",
      timezone: TIME_ZONE
    }
  );
  const fixtures = arr2(
    payload.response
  ).filter(
    (x) => LIVE_STATUSES.has(
      x?.fixture?.status?.short
    )
  );
  return makeFixtureBoard(
    date,
    fixtures
  );
}
__name(refreshLiveV18, "refreshLiveV18");
function slimOddsRowV18(row) {
  return {
    // Keep fixture-level evidence across page merges. Aggregate refresh time is not quote time.
    observedAt: row?.observedAt || new Date().toISOString(),
    providerUpdatedAt: row?.providerUpdatedAt || row?.update || null,
    fixture: {
      id: row?.fixture?.id
    },
    bookmakers: arr2(
      row?.bookmakers
    ).map(
      (book) => ({
        name: book?.name,
        // Preserve source-specific quote timestamps for multi-bookmaker validation.
        observedAt: book?.observedAt || null,
        providerUpdatedAt: book?.providerUpdatedAt || book?.last_update || null,
        bets: arr2(
          book?.bets
        ).filter(
          (b) => SCORING_MARKETS.has(
            b?.name
          ) || playerPropsV1.isPlayerMarket(b?.name) || providerMarketName(
            b?.name
          )
        ).map(
          (b) => ({
            name: b.name,
            values: arr2(
              b.values
            )
          })
        )
      })
    ).filter(
      (book) => book.bets.length
    )
  };
}
__name(slimOddsRowV18, "slimOddsRowV18");
function mergeOddsV18(existing, incoming) {
  const map = /* @__PURE__ */ new Map();
  for (const row of [
    ...existing,
    ...incoming
  ]) {
    const id = row?.fixture?.id;
    if (id != null) {
      map.set(
        String(id),
        row
      );
    }
  }
  return [
    ...map.values()
  ];
}
__name(mergeOddsV18, "mergeOddsV18");
function bet365RowsV68(rows) {
  return arr2(rows).filter(
    (row) => arr2(row?.bookmakers).some(
      (book) => ["bet365","draftkings","pinnacle","williamhill","marathonbet"].includes(String(book?.name || "").trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
    )
  );
}
__name(bet365RowsV68, "bet365RowsV68");
var ELITE_ODDS_MAX_AGE_MS_V83 = 15 * 60 * 1e3;
var ELITE_ODDS_REPAIR_TARGETS_V83 = 12;
function oddsSnapshotStaleV83(row, maxAgeMs = ELITE_ODDS_MAX_AGE_MS_V83) {
  if (!row?.refreshed_at)
    return true;
  const age = Date.now() - Date.parse(row.refreshed_at);
  return !Number.isFinite(age) || age >= maxAgeMs;
}
__name(oddsSnapshotStaleV83, "oddsSnapshotStaleV83");
async function eliteOddsRepairTargetsV83(env, date, fixtures) {
  const boardRow = await getFeedSnapshot(env, modelBoardKey(date)).catch(() => null);
  const upcoming = new Set(
    arr2(fixtures).filter((f) => UPCOMING_STATUSES.has(f?.fixture?.status?.short) && Date.parse(f?.fixture?.date)>Date.now()).map((f) => String(fixtureIdV19(f))).filter(Boolean)
  );
  const fixtureMap = new Map(arr2(fixtures).map(f=>[String(fixtureIdV19(f)),f]));
  const eligibleIds = arr2(fixtures).filter(f=>upcoming.has(String(fixtureIdV19(f))) && competitionTierV21(f?.league?.name,f?.league?.id)<=2).map(f=>fixtureIdV19(f)).slice(0,120);
  const rawRows = eligibleIds.length ? arr2(await sb(env,'two45_analysis_state?fixture_id=in.('+eligibleIds.join(',')+')&status=eq.COMPLETE&model_version=eq.'+encodeURIComponent(MODEL_VERSION)+'&select=fixture_id,data_quality,marketOptions:result->marketOptions,probabilityBoard:result->probabilityBoard&limit=120',{timeoutMs:2500})) : [];
  const rawOptions = rawRows.flatMap(r=>arr2(r.marketOptions).filter(o=>o.lane==='STRONG' && o.analysisSource==='independent-model').map(o=>({...o,fixtureId:r.fixture_id,decision:'PICK'})));
  const unpricedResearch = rawRows.filter(r=>num4(r.data_quality,0)>=.75 && Object.values(r.probabilityBoard||{}).some(outcomes=>Object.values(outcomes||{}).some(p=>Number.isFinite(Number(p)) && Number(p)>0 && Number(p)<1))).map(r=>({fixtureId:r.fixture_id,requestQuote:true,dataQuality:r.data_quality}));
  // Research-qualified alternatives can request a quote before public price verification.
  return [...arr2(boardRow?.payload?.strongPicks),...rawOptions,...unpricedResearch].map(p=>({...p,competitionTier:competitionTierV21(fixtureMap.get(String(p.fixtureId ?? p.providerMatchId))?.league?.name,fixtureMap.get(String(p.fixtureId ?? p.providerMatchId))?.league?.id)})).filter((p) => {
    const id = String(p?.fixtureId ?? p?.providerMatchId ?? "");
    return id && upcoming.has(id) && (p?.decision === "PICK" || p?.requestQuote===true) && num4(p?.competitionTier, 4) <= 2;
  }).sort(
    (a, b) => num4(a?.competitionTier, 4) - num4(b?.competitionTier, 4) || num4(b?.dataQuality, 0) - num4(a?.dataQuality, 0) || num4(b?.probability, 0) - num4(a?.probability, 0)
  ).map((p) => String(p?.fixtureId ?? p?.providerMatchId ?? "")).filter(Boolean).filter((id, index, rows) => rows.indexOf(id) === index).slice(0, ELITE_ODDS_REPAIR_TARGETS_V83);
}
__name(eliteOddsRepairTargetsV83, "eliteOddsRepairTargetsV83");
function fixtureQuoteFreshV2(row, now=Date.now(), age=ELITE_ODDS_MAX_AGE_MS_V83) {
  const observed=Date.parse(row?.observedAt),updated=Date.parse(row?.providerUpdatedAt || row?.update);
  return updated<=observed && observed<=now && now-observed<age && now-updated<age;
}
async function repairDailyOddsFromFixturesV68(env, date) {
  const fixtureRow = await getFeedSnapshot(env, fixtureKey(date));
  const fixtures = fixtureRowsV58(fixtureRow).filter((f) => {
    const status = f?.fixture?.status?.short;
    return (UPCOMING_STATUSES.has(status) || LIVE_STATUSES.has(status)) && competitionTierV21(f?.league?.name, f?.league?.id) <= 3 && fixtureIdV19(f) > 0;
  });
  const dailyRow = await getFeedSnapshot(env, oddsKey(date));
  const previous = dailyRow?.payload || {};
  let response = bet365RowsV68(previous.response);
  const covered = new Set(response.map((row) => String(row?.fixture?.id)));
  const eliteTargets = await eliteOddsRepairTargetsV83(env, date, fixtures);
  // Include at most two independent Engine 2 candidates in the existing one-request-per-cycle
  // odds repair queue. These remain shadow-only and never become publication candidates here.
  let engine2PriceTargets=[];
  try {
    const shadow=arr2(await sb(env,'two45_feed_snapshots?snapshot_key=like.engine2-shadow:v1:*&select=fixtureId:payload->>fixtureId,kickoffAt:payload->>kickoffAt,qualityHold:payload->>qualityHold,discovery:payload->discovery&order=refreshed_at.desc&limit=80',{timeoutMs:2500}));
    const eligible=new Set(fixtures.filter(f=>competitionTierV21(f?.league?.name,f?.league?.id)<=2).map(f=>String(fixtureIdV19(f))));
    engine2PriceTargets=[...new Set(shadow.filter(x=>x.discovery?.status==='CANDIDATES'&&x.qualityHold!=='true'&&dateOfV19(x.kickoffAt)===date&&eligible.has(String(x.fixtureId))).map(x=>String(x.fixtureId)))].filter(id=>!eliteTargets.map(String).includes(id)).slice(0,2);
  }catch(e){engine2PriceTargets=[];}
  const repairTargets = [...new Set([...eliteTargets,...engine2PriceTargets])];
  const quoteRows = new Map(response.map(row=>[String(row.fixture?.id),row]));
  const repairedTargets = new Set(repairTargets.filter(id=>fixtureQuoteFreshV2(quoteRows.get(String(id)))));
  const repairAttempts = {...previous.repairAttempts};
  const recentlyAttempted = id => Date.now()-Date.parse(repairAttempts[String(id)])<10*60000;
  const targetedRepairActive = repairTargets.some(id=>!repairedTargets.has(String(id)) && !recentlyAttempted(id));
  const targetRank = new Map(repairTargets.map((id, index) => [String(id), index]));
  fixtures.sort((a, b) => {
    const aid = String(fixtureIdV19(a)), bid = String(fixtureIdV19(b));
    const ar = targetRank.has(aid) ? targetRank.get(aid) : 9999;
    const br = targetRank.has(bid) ? targetRank.get(bid) : 9999;
    return ar - br || competitionTierV21(a?.league?.name, a?.league?.id) - competitionTierV21(b?.league?.name, b?.league?.id) || Date.parse(a?.fixture?.date || 0) - Date.parse(b?.fixture?.date || 0);
  });
  for (const fixture of fixtures) {
    const fixtureId = fixtureIdV19(fixture);
    const fixtureKeyString = String(fixtureId);
    const isEliteTarget = targetRank.has(fixtureKeyString);
    if (recentlyAttempted(fixtureKeyString)) continue;
    if (targetedRepairActive) {
      if (!isEliteTarget || repairedTargets.has(fixtureKeyString) || recentlyAttempted(fixtureKeyString))
        continue;
    } else if (covered.has(fixtureKeyString)) {
      continue;
    }
    const directKey = "fixture-odds:" + fixtureId;
    const cached = await getFeedSnapshot(env, directKey).catch(() => null);
    const fresh = cached && Date.now() - Date.parse(cached.refreshed_at) < 10 * 6e4 && arr2(cached.payload?.response).some(r=>String(r.fixture?.id)===fixtureKeyString && fixtureQuoteFreshV2(r));
    let directRows = [];
    if (fresh) {
      directRows = bet365RowsV68(cached?.payload?.response);
    } else {
      const direct = await providerFetchV18(env, "odds", {
        fixture: String(fixtureId),
        page: 1
      });
      directRows = bet365RowsV68(arr2(direct?.response).map(slimOddsRowV18));
      await saveFeedSnapshot(env, directKey, {
        ok: true,
        service: "two45-live-worker",
        type: "fixture-odds",
        fixtureId,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        response: directRows
      }, 1800);
    }
    if (directRows.length)
      response = mergeOddsV18(response, directRows);
    repairAttempts[fixtureKeyString]=new Date().toISOString();
    if (isEliteTarget && directRows.some(r=>String(r.fixture?.id)===fixtureKeyString && fixtureQuoteFreshV2(r)))
      repairedTargets.add(fixtureKeyString);
    const remainingEliteTargets = repairTargets.filter((id) => !repairedTargets.has(String(id)));
    const payload2 = {
      ok: true,
      service: "two45-live-worker",
      type: "odds",
      date,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      total: response.length,
      paging: previous.paging || { current: 1, total: 1, complete: true },
      cacheSeconds: 900,
      response,
      source: "fixture-repair-v83",
      repairInProgress: targetedRepairActive ? remainingEliteTargets.some(id=>!recentlyAttempted(id)) : true,
      repairReason: targetedRepairActive ? "elite-odds-freshness" : "missing-bet365-coverage",
      repairTargets,
      repairedTargets: [...repairedTargets],
      repairAttempts,
      pendingExactPrices: remainingEliteTargets,
      repairedFixtureId: fixtureId,
      repairedWithBet365: Boolean(directRows.length)
    };
    await saveFeedSnapshot(env, oddsKey(date), payload2, 900);
    return payload2;
  }
  const payload = {
    ok: true,
    service: "two45-live-worker",
    type: "odds",
    date,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    total: response.length,
    paging: previous.paging || { current: 1, total: 1, complete: true },
    cacheSeconds: 900,
    response,
    source: "fixture-repair-v83",
    repairInProgress: false,
    repairReason: null,
    repairTargets,
    repairedTargets: [...repairedTargets],
    repairAttempts,
    pendingExactPrices: repairTargets.filter(id=>!repairedTargets.has(String(id))),
    repairExhaustedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveFeedSnapshot(env, oddsKey(date), payload, 900);
  return payload;
}
__name(repairDailyOddsFromFixturesV68, "repairDailyOddsFromFixturesV68");
async function oddsRepairActiveV68(env) {
  const dates = [...new Set([...(shouldPreloadTomorrow() ? [tomorrowEasternDate()] : []),...(weekendDeadlineRushV67() ? weekendLadderDatesV67() : [easternDate()])])];
  for (const date of dates) {
    const row = await getFeedSnapshot(env, oddsKey(date)).catch(() => null);
    if (!row || !arr2(row?.payload?.response).length || row?.payload?.paging?.complete === false || row?.payload?.repairInProgress || oddsSnapshotStaleV83(row))
      return true;
  }
  return false;
}
__name(oddsRepairActiveV68, "oddsRepairActiveV68");
async function refreshOddsPageV18(env, date) {
  const previousRow = await getFeedSnapshot(
    env,
    oddsKey(
      date
    )
  );
  const previous = previousRow?.payload;
  const sameCycle = previous?.date === date && previous?.paging?.complete === false;
  const previousPage = sameCycle ? Math.max(
    Number(
      previous?.paging?.current
    ) || 0,
    0
  ) : 0;
  const previousTotal = sameCycle ? Math.min(
    Math.max(
      Number(
        previous?.paging?.total
      ) || 1,
      1
    ),
    MAX_ODDS_PAGES
  ) : 1;
  const page = sameCycle && previousPage < previousTotal ? previousPage + 1 : 1;
  const provider = await providerFetchV18(
    env,
    "odds",
    {
      date,
      timezone: TIME_ZONE,
      page
    }
  );
  const totalPages = Math.min(
    Math.max(
      Number(
        provider?.paging?.total
      ) || 1,
      1
    ),
    MAX_ODDS_PAGES
  );
  const newRows = arr2(
    provider.response
  ).map(
    slimOddsRowV18
  );
  const response = page === 1 ? newRows : mergeOddsV18(
    arr2(
      previous?.response
    ),
    newRows
  );
  const payload = {
    ok: true,
    service: "two45-live-worker",
    type: "odds",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    date,
    total: response.length,
    paging: {
      current: page,
      total: totalPages,
      complete: page >= totalPages
    },
    cacheSeconds: 900,
    response,
    // Preserve targeted repair pacing across general odds-page refreshes.
    repairAttempts: previous?.repairAttempts || {},
    pendingExactPrices: previous?.pendingExactPrices || [],
    repairTargets: previous?.repairTargets || []
  };
  await saveFeedSnapshot(
    env,
    oddsKey(
      date
    ),
    payload,
    900
  );
  return payload;
}
__name(refreshOddsPageV18, "refreshOddsPageV18");
async function refreshLiveOddsV18(env) {
  const payload = await providerFetchV18(
    env,
    "odds/live",
    {}
  );
  const response = arr2(
    payload.response
  );
  return {
    ok: true,
    service: "two45-live-worker",
    type: "liveOdds",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    total: response.length,
    paging: payload.paging || null,
    response
  };
}
__name(refreshLiveOddsV18, "refreshLiveOddsV18");
async function runBackgroundEvaluationV18(env, date, oddsPage) {
  const pagesUrl = (env.TWO45_PAGES_URL || "https://two45.pages.dev").replace(
    /\/$/,
    ""
  );
  const response = await fetch(
    `${pagesUrl}/api/dashboard?evaluate=1&date=${encodeURIComponent(
      date
    )}`,
    {
      headers: {
        Accept: "application/json",
        "x-two45-background-evaluation": "worker-v19"
      },
      signal: AbortSignal.timeout(2e4)
    }
  );
  if (!response.ok) {
    throw new Error(
      `Two45 Pages evaluator returned HTTP ${response.status}.`
    );
  }
  const board = await response.json();
  if (!Array.isArray(
    board?.games
  ) || !Array.isArray(
    board?.picks
  )) {
    throw new Error(
      "Two45 Pages evaluator returned an invalid board."
    );
  }
  if (board?.date && board.date !== date) {
    throw new Error(
      `Two45 Pages evaluator returned ${board.date} while ${date} was requested.`
    );
  }
  const evaluatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await saveFeedSnapshot(
    env,
    `pages-evaluation:${date}`,
    {
      ...board,
      updatedAt: evaluatedAt,
      evaluation: {
        date,
        evaluatedAt,
        source: "worker-v19",
        oddsPage
      }
    },
    1800
  );
  return {
    ok: true,
    status: "updated",
    evaluatedAt,
    picks: board.picks.length,
    board
  };
}
__name(runBackgroundEvaluationV18, "runBackgroundEvaluationV18");
async function oddsNeedsRefreshV18(env, date) {
  const row = await getFeedSnapshot(
    env,
    oddsKey(
      date
    )
  );
  if (!row || row.payload?.date !== date) {
    return true;
  }
  if (row.payload?.paging?.complete === false) {
    return true;
  }
  return Date.now() - Date.parse(
    row.refreshed_at
  ) >= 9e5;
}
__name(oddsNeedsRefreshV18, "oddsNeedsRefreshV18");
async function selectFeedJobV18(env, date, force = false) {
  const tomorrow = datePlusDays(
    date,
    1
  );
  const preloadTomorrow = shouldPreloadTomorrow();
  if (preloadTomorrow) {
    const next = await getFeedSnapshot(env, fixtureKey(tomorrow));
    const empty = !arr2(next?.payload?.fixtures).length;
    const age = next ? Date.now() - Date.parse(next.refreshed_at) : Infinity;
    if (!next || age >= (empty ? 3e5 : 18e5)) {
      return {
        key: fixtureKey(tomorrow),
        ttl: 1800,
        run: () => refreshFixturesV18(env, tomorrow)
      };
    }
    const nextOdds = await getFeedSnapshot(env, oddsKey(tomorrow));
    if (!nextOdds || nextOdds.payload?.paging?.complete===false) {
      return {key:oddsKey(tomorrow),ttl:900,savesItself:true,run:()=>refreshOddsPageV18(env,tomorrow)};
    }
    if (nextOdds.payload?.repairInProgress || oddsSnapshotStaleV83(nextOdds)) {
      return {key:oddsKey(tomorrow),ttl:900,savesItself:true,run:()=>repairDailyOddsFromFixturesV68(env,tomorrow)};
    }
  }
  if (weekendDeadlineRushV67()) {
    for (const weekendDate of weekendLadderDatesV67()) {
      const wf = await getFeedSnapshot(env, fixtureKey(weekendDate));
      if (!wf || !fixtureRowsV58(wf).length) {
        return {
          key: fixtureKey(weekendDate),
          ttl: 1800,
          run: () => refreshFixturesV18(env, weekendDate)
        };
      }
      const wo = await getFeedSnapshot(env, oddsKey(weekendDate));
      if (!wo) {
        return {
          key: oddsKey(weekendDate),
          ttl: 1800,
          savesItself: true,
          run: () => refreshOddsPageV18(env, weekendDate)
        };
      }
      if (!arr2(wo?.payload?.response).length || num4(wo?.payload?.total, 0) <= 0 || wo?.payload?.repairInProgress) {
        return {
          key: oddsKey(weekendDate),
          ttl: 1800,
          savesItself: true,
          run: () => repairDailyOddsFromFixturesV68(env, weekendDate)
        };
      }
    }
  }
  const fixturesMissing = !await getFeedSnapshot(
    env,
    fixtureKey(
      date
    )
  );
  const oddsSnapshot = await getFeedSnapshot(
    env,
    oddsKey(
      date
    )
  );
  const oddsMissing = !oddsSnapshot || !arr2(oddsSnapshot?.payload?.response).length || num4(oddsSnapshot?.payload?.total, 0) <= 0;
  const oddsIncomplete = Boolean(oddsSnapshot) && oddsSnapshot?.payload?.paging?.complete === false;
  if (fixturesMissing) {
    return {
      key: fixtureKey(
        date
      ),
      ttl: 900,
      run: () => refreshFixturesV18(
        env,
        date
      )
    };
  }
  // Retry unpublished Elite candidates with missing exact Bet365 quotes after 06:00.
  // A fresh aggregate odds page does not prove that candidate markets are priced.
  if (oddsSnapshot && date === activeDailyTicketDateV93()) {
    const dailyLock = await getFeedSnapshot(env, "ticket-lock:daily:" + date).catch(() => null);
    const pending = arr2(dailyLock?.payload?.pipeline?.pendingVerificationFixtures).map(String);
    if (dailyLock?.payload?.status === "BUILDING" && pending.some(id =>
        Date.now() - Date.parse(oddsSnapshot?.payload?.repairAttempts?.[id] || 0) >= 10 * 60000)) {
      return {key:oddsKey(date),ttl:900,savesItself:true,run:()=>repairDailyOddsFromFixturesV68(env,date)};
    }
  }
  if (oddsIncomplete) {
    return {
      key: oddsKey(date),
      ttl: 900,
      savesItself: true,
      run: () => refreshOddsPageV18(env, date)
    };
  }
  if (oddsMissing || oddsSnapshot?.payload?.repairInProgress) {
    return {
      key: oddsKey(date),
      ttl: 900,
      savesItself: true,
      run: () => oddsSnapshot ? repairDailyOddsFromFixturesV68(env, date) : refreshOddsPageV18(env, date)
    };
  }
  for (const futureDate of fourDayFixtureDatesV20().slice(1)) {
    const missing = !await getFeedSnapshot(env, fixtureKey(futureDate));
    if (missing) {
      return {
        key: fixtureKey(futureDate),
        ttl: 21600,
        run: () => refreshFixturesV18(env, futureDate)
      };
    }
  }
  for (const deepDate of deepAnalysisDatesV20().slice(1)) {
    const missingOdds = !await getFeedSnapshot(env, oddsKey(deepDate));
    if (missingOdds) {
      return {
        key: oddsKey(deepDate),
        ttl: 1800,
        savesItself: true,
        run: () => refreshOddsPageV18(env, deepDate)
      };
    }
  }
  if (preloadTomorrow) {
    const tf = !await getFeedSnapshot(
      env,
      fixtureKey(
        tomorrow
      )
    );
    const to = !await getFeedSnapshot(
      env,
      oddsKey(
        tomorrow
      )
    );
    if (tf) {
      return {
        key: fixtureKey(
          tomorrow
        ),
        ttl: 1800,
        run: () => refreshFixturesV18(
          env,
          tomorrow
        )
      };
    }
    if (to) {
      return {
        key: oddsKey(
          tomorrow
        ),
        ttl: 1800,
        savesItself: true,
        run: () => refreshOddsPageV18(
          env,
          tomorrow
        )
      };
    }
  }
  const candidates = [
    {
      key: fixtureKey(
        date
      ),
      ttl: 900,
      due: () => feedDue(
        env,
        fixtureKey(
          date
        ),
        900
      ),
      run: () => refreshFixturesV18(
        env,
        date
      )
    },
    {
      key: "live",
      ttl: 300,
      due: () => feedDue(
        env,
        "live",
        300
      ),
      run: () => refreshLiveV18(
        env,
        date
      )
    },
    {
      key: oddsKey(
        date
      ),
      ttl: 900,
      savesItself: true,
      due: () => oddsNeedsRefreshV18(
        env,
        date
      ),
      run: () => refreshOddsPageV18(
        env,
        date
      )
    },
    {
      key: "live-odds",
      ttl: 300,
      due: () => feedDue(
        env,
        "live-odds",
        300
      ),
      run: () => refreshLiveOddsV18(
        env
      )
    }
  ];
  for (const futureDate of fourDayFixtureDatesV20().slice(1)) {
    if (futureDate === tomorrow && preloadTomorrow)
      continue;
    candidates.push({
      key: fixtureKey(futureDate),
      ttl: 21600,
      due: () => feedDue(env, fixtureKey(futureDate), 21600),
      run: () => refreshFixturesV18(env, futureDate)
    });
  }
  if (weekendModeV20()) {
    for (const deepDate of deepAnalysisDatesV20().slice(1)) {
      if (deepDate === tomorrow && preloadTomorrow)
        continue;
      candidates.push({
        key: oddsKey(deepDate),
        ttl: 1800,
        savesItself: true,
        due: () => oddsNeedsRefreshV18(env, deepDate),
        run: () => refreshOddsPageV18(env, deepDate)
      });
    }
  }
  if (preloadTomorrow) {
    candidates.push(
      {
        key: fixtureKey(
          tomorrow
        ),
        ttl: 1800,
        due: () => feedDue(
          env,
          fixtureKey(
            tomorrow
          ),
          1800
        ),
        run: () => refreshFixturesV18(
          env,
          tomorrow
        )
      },
      {
        key: oddsKey(
          tomorrow
        ),
        ttl: 1800,
        savesItself: true,
        due: () => oddsNeedsRefreshV18(
          env,
          tomorrow
        ),
        run: () => refreshOddsPageV18(
          env,
          tomorrow
        )
      }
    );
  }
  if (force) {
    return candidates[0];
  }
  const bucket = Math.floor(
    (/* @__PURE__ */ new Date()).getUTCMinutes() / 5
  ) % candidates.length;
  const first = candidates[bucket];
  if (await first.due()) {
    return first;
  }
  for (const c of candidates) {
    if (await c.due()) {
      return c;
    }
  }
  return null;
}
__name(selectFeedJobV18, "selectFeedJobV18");
async function refreshOneFeed(env, force = false) {
  if (providerQuietWindow()) {
    return { ok: true, skipped: true, reason: "Provider quiet window 00:00-05:00 America/New_York" };
  }
  const token = crypto.randomUUID();
  const acquired = await rpcRefresh(
    env,
    "two45_try_refresh_lock",
    {
      p_lock_key: "scheduled-feed-refresh",
      p_lock_token: token,
      p_ttl_seconds: 240
    }
  );
  if (!acquired) {
    return {
      ok: true,
      skipped: true,
      reason: "Another refresh is already running."
    };
  }
  try {
    const date = easternDate();
    const job = await selectFeedJobV18(
      env,
      date,
      force
    );
    if (!job) {
      return {
        ok: true,
        skipped: true,
        reason: "All feeds are fresh.",
        date
      };
    }
    try {
      const payload = await job.run();
      if (!job.savesItself) {
        await saveFeedSnapshot(
          env,
          job.key,
          payload,
          job.ttl
        );
      }
      return {
        ok: true,
        skipped: false,
        date,
        key: job.key,
        providerCalls: 1,
        total: payload?.total ?? null,
        paging: payload?.paging ?? null
      };
    } catch (error) {
      return {
        ok: false,
        skipped: false,
        date,
        key: job.key,
        providerCalls: 1,
        error: safeRefreshError(
          error
        )
      };
    }
  } finally {
    await rpcRefresh(
      env,
      "two45_release_refresh_lock",
      {
        p_lock_key: "scheduled-feed-refresh",
        p_lock_token: token
      }
    ).catch(
      () => false
    );
  }
}
__name(refreshOneFeed, "refreshOneFeed");
var PRIORITY_COMPETITION_RE_V20 = /uefa nations league|nations league|world cup|world cup qualif|world cup qualifiers|european championship qualif|euro qualif|uefa|euro|copa america|africa cup of nations|afcon|caf|asian cup|afc|concacaf|champions league|europa league|conference league|copa libertadores|libertadores|copa sudamericana|sudamericana|la liga|serie a|bundesliga|ligue 1|eredivisie|primeira liga|brasileir|liga profesional|argentina|mls|scottish premiership|belgian pro league|swiss super league|austrian bundesliga|super lig|liga mx|saudi pro league/i;
function competitionTierV21(value, leagueId) {
  return competitionTierV87(value, leagueId);
}
__name(competitionTierV21, "competitionTierV21");
function priorityCompetitionV20(value, leagueId) {
  return competitionTierV21(value, leagueId) <= 2 || PRIORITY_COMPETITION_RE_V20.test(String(value || ""));
}
__name(priorityCompetitionV20, "priorityCompetitionV20");
function groupMarketLinesV19(groups) {
  const out = [];
  for (const group of groups) {
    const buckets = /* @__PURE__ */ new Map();
    for (const outcome of group.outcomes) {
      let key = "main";
      const raw = String(outcome.rawSelection || "");
      const total = raw.match(/\b(over|under)\s*(\d+(?:\.\d+)?)/i);
      const handicap = raw.match(/^(home|away|draw)\s*([+-]?\d+(?:\.\d+)?)/i);
      const value = { ...outcome };
      if (total) {
        const subject = raw.slice(0, total.index).trim().toLowerCase();
        key = `${subject}|${Number(total[2])}`;
        if (subject)
          value.selection = `${thresholdSelection(subject)}_${outcome.selection}`;
      } else if (group.market.includes("HANDICAP") && handicap) {
        const side = handicap[1].toUpperCase();
        const line = Number(handicap[2]);
        key = String(/handicap result/i.test(group.rawMarket) ? line : side === "AWAY" ? -line : line);
        value.selection = `${side}_${line < 0 ? "MINUS" : "PLUS"}_${String(Math.abs(line)).replace(".", "_")}`;
      }
      if (!buckets.has(key))
        buckets.set(key, []);
      const bucket = buckets.get(key);
      if (!bucket.some((x) => x.selection === value.selection))
        bucket.push(value);
    }
    for (const [groupKey, outcomes] of buckets) {
      if (outcomes.length < 2)
        continue;
      if (group.market === "DOUBLE_CHANCE" && outcomes.length !== 3)
        continue;
      if (group.market === "MATCH_RESULT" && outcomes.length !== 3)
        continue;
      if ([
        "TOTAL_GOALS",
        "HOME_TEAM_GOALS",
        "AWAY_TEAM_GOALS",
        "TOTAL_CORNERS",
        "HOME_CORNERS",
        "AWAY_CORNERS",
        "TOTAL_CARDS",
        "HOME_CARDS",
        "AWAY_CARDS",
        "TOTAL_SHOTS",
        "TOTAL_SHOTS_ON_TARGET",
        "TOTAL_SHOTS_OFF_TARGET"
      ].includes(group.market)) {
        const normalized = outcomes.map((x) => String(x.selection || "").toUpperCase());
        const hasOver = normalized.some((x) => /(^|_)OVER_\d/.test(x));
        const hasUnder = normalized.some((x) => /(^|_)UNDER_\d/.test(x));
        if (!hasOver || !hasUnder)
          continue;
      }
      out.push({ ...group, groupKey, outcomes });
    }
  }
  return out;
}
__name(groupMarketLinesV19, "groupMarketLinesV19");
function batchLimitV19(value) {
  return Math.trunc(clamp4(num4(value, DEFAULT_MODEL_BATCH), 1, 9));
}
__name(batchLimitV19, "batchLimitV19");
function adaptiveBatchV30(candidates, requested = DEFAULT_MODEL_BATCH) {
  const fresh = candidates.filter((j) => !j.canonicalComplete).length;
  const feedMinute = (/* @__PURE__ */ new Date()).getUTCMinutes() % 5 === 0;
  let desired = fresh >= 100 ? 9 : fresh >= 50 ? 8 : fresh >= 20 ? 6 : fresh > 0 ? 4 : 1;
  if (feedMinute && desired > 1)
    desired = Math.max(3, desired - 1);
  return {
    freshBaselineBacklog: fresh,
    limit: Math.min(batchLimitV19(requested || DEFAULT_MODEL_BATCH), desired)
  };
}
__name(adaptiveBatchV30, "adaptiveBatchV30");
function dateOfV19(value) {
  const dt = new Date(value);
  if (!Number.isFinite(dt.getTime()))
    return null;
  const p = easternParts(dt);
  return `${p.year}-${p.month}-${p.day}`;
}
__name(dateOfV19, "dateOfV19");
function dateAllowedV19(date) {
  return deepAnalysisDatesV20().includes(date);
}
__name(dateAllowedV19, "dateAllowedV19");
function activeDatesV19() {
  return deepAnalysisDatesV20();
}
__name(activeDatesV19, "activeDatesV19");
function fixtureIdV19(f) {
  return Number(f?.fixture?.id || f?.fixtureId || f?.fixture_id || 0);
}
__name(fixtureIdV19, "fixtureIdV19");
function eligibleFixtureV19(f, date, explicitDate = false) {
  const status = f?.fixture?.status?.short;
  const tier = competitionTierV21(f?.league?.name, f?.league?.id);
  return tier <= 3 && (explicitDate || dateAllowedV19(date)) && dateOfV19(f?.fixture?.date) === date && (UPCOMING_STATUSES.has(status) || LIVE_STATUSES.has(status)) && fixtureIdV19(f) > 0 && Number(f?.league?.id) > 0 && Number.isInteger(Number(f?.league?.season)) && Number(f?.league?.season) > 0 && Number(f?.teams?.home?.id) > 0 && Number(f?.teams?.away?.id) > 0;
}
__name(eligibleFixtureV19, "eligibleFixtureV19");
async function allRowsV19(env, query) {
  const rows = [];
  for (let offset = 0; ; offset += 100) {
    const page = arr2(await sb(env, `${query}&limit=100&offset=${offset}`));
    rows.push(...page);
    if (page.length < 100)
      break;
  }
  return rows;
}
__name(allRowsV19, "allRowsV19");
async function rowsForIdsV19(env, table, column, ids) {
  const result = [];
  for (let start = 0; start < ids.length; start += 80) {
    const values = ids.slice(start, start + 80).map((x) => encodeURIComponent(String(x))).join(",");
    result.push(...await allRowsV19(
      env,
      `${table}?${column}=in.(${values})&select=*&order=${column}.asc`
    ));
  }
  return result;
}
__name(rowsForIdsV19, "rowsForIdsV19");
async function fixtureSnapshotV19(env, date) {
  const base = await getFeedSnapshot(env, fixtureKey(date));
  const fixtures = arr2(base?.payload?.fixtures).length ? base.payload.fixtures : arr2(base?.payload?.response);
  const map = new Map(fixtures.map((f) => [fixtureIdV19(f), f]));
  if (date === easternDate()) {
    const live = await getFeedSnapshot(env, "live");
    if (Date.parse(live?.refreshed_at) > Date.parse(base?.refreshed_at || "1970-01-01")) {
      for (const f of arr2(live?.payload?.fixtures)) {
        if (dateOfV19(f?.fixture?.date) === date)
          map.set(fixtureIdV19(f), f);
      }
    }
  }
  return { date, fixtures: [...map.values()], refreshedAt: base?.refreshed_at || null };
}
__name(fixtureSnapshotV19, "fixtureSnapshotV19");
function jobFromFixtureV19(f, date, now) {
  const id = fixtureIdV19(f);
  const major = priorityCompetitionV20(f.league.name, f.league.id);
  return {
    job_key: String(id) + ":" + String(f.league.season),
    provider_match_id: String(id),
    fixture_id: id,
    kickoff_at: new Date(f.fixture.date).toISOString(),
    competition: f.league.name || "Unknown competition",
    provider_league_id: String(f.league.id),
    season: Number(f.league.season),
    home_team_id: String(f.teams.home.id),
    away_team_id: String(f.teams.away.id),
    home_team: f.teams.home.name || String(f.teams.home.id),
    away_team: f.teams.away.name || String(f.teams.away.id),
    status: "PENDING",
    priority: major ? 10 : 40,
    attempts: 0,
    requested_at: now,
    source_snapshot_key: fixtureKey(date),
    metadata: {
      country: f.league.country,
      round: f.league.round,
      fixture_status: f.fixture.status.short,
      fixture: f,
      queued_by: "worker-v19"
    }
  };
}
__name(jobFromFixtureV19, "jobFromFixtureV19");
async function syncFixtureJobsV19(env, dates = null) {
  const wanted = [];
  const summary = { eligible: 0, inserted: 0, existing: 0, excluded: 0, dates: [] };
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const date of Array.isArray(dates) && dates.length ? dates : activeDatesV19()) {
    const snapshot2 = await fixtureSnapshotV19(env, date);
    summary.dates.push({ date, fixtures: snapshot2.fixtures.length });
    for (const fixture of snapshot2.fixtures) {
      if (eligibleFixtureV19(fixture, date, Array.isArray(dates) && dates.length > 0))
        wanted.push(jobFromFixtureV19(fixture, date, now));
      else
        summary.excluded++;
    }
  }
  const distinct = [...new Map(wanted.map((j) => [j.job_key, j])).values()];
  summary.eligible = distinct.length;
  const existing = await rowsForIdsV19(
    env,
    "two45_feature_jobs",
    "job_key",
    distinct.map((j) => j.job_key)
  );
  const byKey = new Map(existing.map((j) => [j.job_key, j]));
  summary.existing = existing.length;
  const missing = distinct.filter((j) => !byKey.has(j.job_key));
  for (let i = 0; i < missing.length; i += 100) {
    const inserted = arr2(await sb(env, "two45_feature_jobs?on_conflict=job_key", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=representation",
      body: JSON.stringify(missing.slice(i, i + 100))
    }));
    summary.inserted += inserted.length;
    for (const row of inserted)
      byKey.set(row.job_key, row);
  }
  const jobs = distinct.flatMap((current) => {
    const stored = byKey.get(current.job_key);
    return stored ? [{
      ...stored,
      kickoff_at: current.kickoff_at,
      metadata: { ...stored.metadata, ...current.metadata }
    }] : [];
  });
  await ensureAnalysisRowsV2(env, jobs);
  const canonicalRows = await canonicalAnalysisRowsV2(
    env,
    jobs.map((j) => Number(j.fixture_id))
  );
  const canonicalByFixture = new Map(
    canonicalRows.filter((r) => r.model_version === MODEL_VERSION).map((r) => [Number(r.fixture_id), r])
  );
  const annotatedJobs = jobs.map((j) => {
    const row = canonicalByFixture.get(Number(j.fixture_id));
    return {
      ...j,
      canonicalComplete: row?.status === "COMPLETE",
      canonicalStatus: row?.status || "PENDING"
    };
  });
  return { jobs: annotatedJobs, summary };
}
__name(syncFixtureJobsV19, "syncFixtureJobsV19");
function jobDueV19(job) {
  if (!dateAllowedV19(dateOfV19(job.kickoff_at)))
    return false;
  const status = job.metadata?.fixture_status;
  if (!(LIVE_STATUSES.has(status) || UPCOMING_STATUSES.has(status)))
    return false;
  const now = Date.now();
  if (job.status === "READY") {
    const interval = LIVE_STATUSES.has(status) ? 10 * 6e4 : job.canonicalComplete && !job.shadowAttempted ? 2 * 6e4 : 60 * 6e4;
    return now - Date.parse(job.completed_at || "1970-01-01") >= interval;
  }
  if (job.status === "FAILED") {
    return !job.started_at || now - Date.parse(job.started_at) >= 2 * 60 * 6e4;
  }
  if (job.status !== "PENDING")
    return false;
  const attempts = num4(job.attempts);
  const delay = attempts ? Math.min(120, 5 * 2 ** Math.min(attempts - 1, 5)) * 6e4 : 0;
  return !job.started_at || now - Date.parse(job.started_at) >= delay;
}
__name(jobDueV19, "jobDueV19");
function rankedJobsV19(jobs) {
  const candidates = jobs.filter(jobDueV19).filter(
    (job) => competitionTierV21(job.competition, job.provider_league_id) <= 3
  );
  const rank = /* @__PURE__ */ __name((j) => {
    const wait = Math.max(0, (Date.now() - Date.parse(j.requested_at)) / 6e4);
    const tier = competitionTierV21(j.competition, j.provider_league_id);
    const isTomorrow = dateOfV19(j.kickoff_at) === tomorrowEasternDate();
    const hoursToKickoff = Math.max(0, (Date.parse(j.kickoff_at) - Date.now()) / 36e5);
    const tierBase = tier === 1 ? 4 : tier === 2 ? 12 : tier === 3 ? 26 : 42;
    const tomorrowPenalty = isTomorrow ? shouldPreloadTomorrow() ? tier <= 2 ? 4 : 10 : 30 : 0;
    const kickoffUrgency = hoursToKickoff <= 3 ? -12 : hoursToKickoff <= 8 ? -7 : hoursToKickoff <= 18 ? -3 : 0;
    return tierBase + tomorrowPenalty + kickoffUrgency - Math.min(80, wait / 3);
  }, "rank");
  candidates.sort((a, b) => rank(a) - rank(b) || Date.parse(a.kickoff_at) - Date.parse(b.kickoff_at));
  const fresh = candidates.filter((j) => !j.canonicalComplete);
  const live = candidates.filter((j) => j.canonicalComplete && LIVE_STATUSES.has(j.metadata?.fixture_status));
  const repeat = candidates.filter((j) => j.canonicalComplete && !LIVE_STATUSES.has(j.metadata?.fixture_status));
  const ordered = [];
  const analysisReady = fresh.filter(
    (j) => String(j.last_error || "").includes("Baseline inputs ready")
  );
  const homeStaged = fresh.filter(
    (j) => String(j.last_error || "").includes("Baseline home input cached")
  );
  const stagedIds = new Set(
    [...analysisReady, ...homeStaged].map((j) => j.id)
  );
  const untouchedFresh = fresh.filter((j) => !stagedIds.has(j.id));
  if (analysisReady.length || homeStaged.length) {
    return [...analysisReady, ...homeStaged, ...untouchedFresh, ...live, ...repeat];
  }
  if (weekendDeadlineRushV67()) {
    const weekendDates = new Set(weekendLadderDatesV67());
    const weekendFresh = untouchedFresh.filter((j) => weekendDates.has(dateOfV19(j.kickoff_at)));
    const otherFresh = untouchedFresh.filter((j) => !weekendDates.has(dateOfV19(j.kickoff_at)));
    return [...weekendFresh, ...otherFresh, ...live, ...repeat];
  }
  if (shouldPreloadTomorrow()) {
    const tomorrow = tomorrowEasternDate();
    const tomorrowFresh = untouchedFresh.filter((j) => dateOfV19(j.kickoff_at) === tomorrow);
    const otherFresh = untouchedFresh.filter((j) => dateOfV19(j.kickoff_at) !== tomorrow);
    return [...tomorrowFresh, ...otherFresh, ...live, ...repeat];
  }
  if (untouchedFresh.length)
    return [...untouchedFresh, ...live, ...repeat];
  const lanes = [live, repeat];
  while (live.length || repeat.length) {
    for (const lane of lanes)
      if (lane.length)
        ordered.push(lane.shift());
  }
  return ordered;
}
__name(rankedJobsV19, "rankedJobsV19");
async function saveLatestAnalysisV19(env, job, analysis, decision) {
  const forecast = manualForecast(job, analysis, decision);
  forecast.generatedAt = analysis.generatedAt;
  forecast.createdAt = analysis.generatedAt;
  forecast.live = Boolean(analysis.live);
  forecast.probabilityBoard = flatten(analysis.probabilities).map((x) => ({ ...x, probability: pctClient(x.probability) }));
  await saveFeedSnapshot(env, `model-analysis:${job.fixture_id}`, {
    date: dateOfV19(job.kickoff_at),
    generatedAt: analysis.generatedAt,
    forecast,
    analysis,
    decision
  }, 86400);
}
__name(saveLatestAnalysisV19, "saveLatestAnalysisV19");
async function applyLiveStateV19(env, job, analysis) {
  const date = dateOfV19(job.kickoff_at);
  const snap = await fixtureSnapshotV19(env, date);
  const fixture = snap.fixtures.find((f) => fixtureIdV19(f) === Number(job.fixture_id)) || job.metadata?.fixture;
  job.metadata = { ...job.metadata, fixture, fixture_status: fixture?.fixture?.status?.short };
  if (!LIVE_STATUSES.has(job.metadata.fixture_status))
    return;
  const elapsed = fixture?.fixture?.status?.elapsed;
  const home = fixture?.goals?.home;
  const away = fixture?.goals?.away;
  analysis.live = { elapsed, homeGoals: home, awayGoals: away, status: job.metadata.fixture_status };
  analysis.liveUsable = ["1H", "HT", "2H", "LIVE"].includes(job.metadata.fixture_status) && Number.isFinite(elapsed) && Number.isFinite(home) && Number.isFinite(away) && elapsed >= 0 && elapsed <= 90 && home >= 0 && away >= 0;
  if (!analysis.liveUsable)
    return;
  const remaining = clamp4((90 - elapsed) / 90, 0, 1);
  const hx = analysis.expectedGoals.home * remaining;
  const ax = analysis.expectedGoals.away * remaining;
  analysis.probabilities = probabilities(hx, ax, home, away);
  analysis.expectedGoals = { home: home + hx, away: away + ax };
  analysis.live.method = "score-and-time-conditioned-poisson";
}
__name(applyLiveStateV19, "applyLiveStateV19");
async function oddsForJobV19(env, job) {
  const live = LIVE_STATUSES.has(job.metadata?.fixture_status);
  const key = live ? "live-odds" : oddsKey(dateOfV19(job.kickoff_at));
  const row = await getFeedSnapshot(env, key);
  if (live) {
    if (!row || Date.now() - Date.parse(row.refreshed_at) > 10 * 6e4)
      return { response: [] };
    if (!["1H", "HT", "2H", "LIVE"].includes(job.metadata.fixture_status))
      return { response: [] };
    return { response: arr2(row.payload?.response).filter(
      (f) => !f.status?.blocked && !f.status?.stopped && !f.status?.finished
    ).map((f) => {
      if (Array.isArray(f.bookmakers))
        return f;
      const aliases = {
        "Match Winner": "Match Winner",
        "Fulltime Result": "Match Winner",
        "Match Goals": "Goals Over/Under",
        "Goals Over/Under": "Goals Over/Under",
        "Both Teams to Score": "Both Teams Score",
        "Both Teams Score": "Both Teams Score",
        "Double Chance": "Double Chance"
      };
      const bets = arr2(f.odds).filter((b) => aliases[b.name]).map((b) => ({
        name: aliases[b.name],
        values: arr2(b.values).filter((v) => !v.suspended && v.main !== false).map((v) => ({
          value: v.handicap != null && !/\d/.test(String(v.value)) ? `${v.value} ${v.handicap}` : v.value,
          odd: v.odd
        }))
      }));
      return { ...f, bookmakers: [{ name: "API-Football Live", bets }] };
    }) };
  }
  const snapshotPayload = row?.payload || { response: [] };
  if (oddsMarketsFromSnapshot(snapshotPayload, job.fixture_id).length)
    return snapshotPayload;
  const directKey = `fixture-odds:${job.fixture_id}`;
  const cached = await getFeedSnapshot(env, directKey).catch(() => null);
  if (cached && Date.now() - Date.parse(cached.refreshed_at) < 30 * 6e4) {
    return cached.payload || snapshotPayload;
  }
  try {
    const direct = await providerFetchV18(env, "odds", {
      fixture: String(job.fixture_id),
      page: 1
    });
    const payload = {
      ok: true,
      service: "two45-live-worker",
      type: "fixture-odds",
      fixtureId: Number(job.fixture_id),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      response: arr2(direct?.response).map(slimOddsRowV18)
    };
    await saveFeedSnapshot(env, directKey, payload, 1800);
    return payload;
  } catch (_) {
    await saveFeedSnapshot(env, directKey, { response: [] }, 600).catch(() => null);
    return snapshotPayload;
  }
}
__name(oddsForJobV19, "oddsForJobV19");
async function refreshCarryoverV19(env) {
  if (providerQuietWindow())
    return { ok: true, skipped: true, reason: "Provider quiet window" };
  for (let daysBack = 1; daysBack <= 4; daysBack++) {
    const date = datePlusDays(easternDate(), -daysBack);
    const row = await getFeedSnapshot(env, fixtureKey(date));
    if (!row || Date.now() - Date.parse(row.refreshed_at) < 15 * 6e4)
      continue;
    const fixtures = arr2(row.payload?.fixtures);
    const needsFinals = fixtures.some(
      (f) => LIVE_STATUSES.has(f?.fixture?.status?.short) || UPCOMING_STATUSES.has(f?.fixture?.status?.short)
    );
    if (!needsFinals)
      continue;
    const payload = await refreshFixturesV18(env, date);
    await saveFeedSnapshot(env, fixtureKey(date), payload, 900);
    return { ok: true, key: fixtureKey(date), total: payload.total, settlementOnly: true, daysBack };
  }
  return null;
}
__name(refreshCarryoverV19, "refreshCarryoverV19");
async function evaluateBoardV19(env, date, light = false) {
  if (!dateAllowedV19(date))
    return { ok: true, skipped: true, date };
  const previous = await getFeedSnapshot(env, modelBoardKey(date));
  let external = { ok: true, board: previous?.payload || null };
  if (!light) {
    try {
      external = await runBackgroundEvaluationV18(env, date, null);
    } catch (error) {
      external = {
        ok: false,
        error: safeRefreshError(error),
        board: previous?.payload || null
      };
    }
  }
  const base = external.board || previous?.payload || {};
  const fixtureData = await fixtureSnapshotV19(env, date);
  const fixtures = fixtureData.fixtures;
  const ids = fixtures.map(fixtureIdV19);
  const canonicalRows = await canonicalAnalysisRowsV2(env, ids);
  const presented = presentCanonicalBoardV59({
    ...base,
    ok: true,
    date,
    service: "two45-live-worker",
    games: fixtures,
    fixtures
  }, fixtures, canonicalRows);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const health = await analysisHealthV2(env, date).catch(() => null);
  const independentForecasts = arr2(presented.independentForecasts);
  const eligiblePicks = arr2(presented.picks);
  const strongPicks = arr2(presented.strongPicks);
  const riskyPlays = arr2(presented.riskyPlays);
  const board = {
    ...presented,
    updatedAt: now,
    analyzedCount: independentForecasts.length,
    analysisHealth: health,
    independentModel: {
      ...base.independentModel,
      version: MODEL_VERSION,
      updatedAt: now,
      forecastCount: independentForecasts.length,
      qualifiedValuePicks: eligiblePicks.length,
      strongPicks: strongPicks.length,
      riskyPlays: riskyPlays.length,
      strongModelViews: independentForecasts.filter(
        (f) => num4(f.probability) >= 75 && num4(f.dataQuality) >= 68
      ).length
    },
    evaluation: {
      source: "analysis-engine-v2",
      date,
      evaluatedAt: now,
      pagesEvaluationOk: external.ok,
      pagesEvaluationError: external.error || null,
      fixtureUpdatedAt: fixtureData.refreshedAt
    }
  };
  await saveFeedSnapshot(env, modelBoardKey(date), board, 1800);
  return {
    ok: true,
    date,
    analyzed: independentForecasts.length,
    picks: eligiblePicks.length,
    analysisHealth: health,
    pagesEvaluationOk: external.ok,
    pagesEvaluationError: external.error || null
  };
}
__name(evaluateBoardV19, "evaluateBoardV19");
async function runCycleV19(event, env, force = false) {
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const result = { ok: true, version: WORKER_VERSION, pacingRevision: PACING_REVISION, feeds: [], boards: [], errors: [] };
  try {
    const oddsRepairActive = await oddsRepairActiveV68(env).catch(() => false);
    const modelFirst = !(oddsRepairActive && (/* @__PURE__ */ new Date()).getUTCMinutes() % 2 === 0);
    if (modelFirst) {
      try {
        result.model = await processJobs(env, batchLimitV19(env.TWO45_MODEL_BATCH));
        if (!result.model.ok)
          result.errors.push({ stage: "model", error: "One or more jobs failed; see model results" });
      } catch (e) {
        result.errors.push({ stage: "model", error: safeRefreshError(e) });
      }
    }
    const clearingFresh = modelFirst && num4(result.model?.freshBaselineBacklog) > 0;
    const feedMinute = (/* @__PURE__ */ new Date()).getUTCMinutes();
    const refreshFeedThisCycle = !clearingFresh || feedMinute % 5 === 0;
    const providerCooling = Boolean(result.model?.cooldownActive);
    if (providerCooling || !refreshFeedThisCycle) {
      result.feeds.push({ ok: true, skipped: true, reason: providerCooling ? "Provider cooldown: model retry has priority" : "Fresh baseline backlog: feed refresh runs every 5 minutes" });
    } else {
      for (let i = 0; i < 1; i++) {
        try {
          const feed = await refreshOneFeed(env, force && i === 0);
          result.feeds.push(feed);
          if (!feed.ok)
            result.errors.push({ stage: "feed", error: feed.error });
          if (feed.skipped || !feed.ok)
            break;
        } catch (e) {
          result.errors.push({ stage: "feed", error: safeRefreshError(e) });
          break;
        }
      }
      try {
        const carryover = await refreshCarryoverV19(env);
        if (carryover)
          result.feeds.push(carryover);
      } catch (e) {
        result.errors.push({ stage: "carryover", error: safeRefreshError(e) });
      }
    }
    if (!modelFirst) {
      try {
        result.model = await processJobs(env, batchLimitV19(env.TWO45_MODEL_BATCH));
        if (!result.model.ok)
          result.errors.push({ stage: "model", error: "One or more jobs failed; see model results" });
      } catch (e) {
        result.errors.push({ stage: "model", error: safeRefreshError(e) });
      }
    }
    if (clearingFresh) {
      // Keep both date boards materialized while fresh baseline jobs are draining.
      // Tomorrow's High Conviction and Risky Value must not wait for the backlog
      // to clear before a model-board snapshot can exist.
      for (const date of activeDatesV19()) {
        try {
          result.boards.push(await evaluateBoardV19(env, date, true));
        } catch (e) {
          result.errors.push({ stage: "board-light", date, error: safeRefreshError(e) });
        }
      }
    } else {
      for (const date of activeDatesV19().slice().sort((a, b) => Number(b === tomorrowEasternDate()) - Number(a === tomorrowEasternDate()))) {
        try {
          result.boards.push(await evaluateBoardV19(env, date));
        } catch (e) {
          result.errors.push({ stage: "board", date, error: safeRefreshError(e) });
        }
      }
    }
    try {
      result.settled = await settle(env);
    } catch (e) {
      result.errors.push({ stage: "settlement", error: safeRefreshError(e) });
    }
    result.ok = result.errors.length === 0;
    await saveFeedSnapshot(env, "cron-status", {
      status: result.ok ? "completed" : "partial-failure",
      cron: event?.cron || "manual",
      startedAt,
      completedAt: (/* @__PURE__ */ new Date()).toISOString(),
      result
    }, 1800);
    return result;
  } finally {
  }
}
__name(runCycleV19, "runCycleV19");
async function timedV2(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label + " timed out after " + ms + "ms")), ms);
      })
    ]);
  } finally {
    if (timer)
      clearTimeout(timer);
  }
}
__name(timedV2, "timedV2");
async function runAnalysisWatchdogV2(env) {
  try {
    const rows = await sb(env, "rpc/two45_analysis_watchdog", {
      method: "POST",
      body: JSON.stringify({ p_model_version: MODEL_VERSION, p_timeout_minutes: 1 })
    });
    const row = arr2(rows)[0] || {};
    return {
      recoveredAnalysis: num4(row.recovered_analysis),
      recoveredJobs: num4(row.recovered_jobs),
      pending: num4(row.pending),
      processing: num4(row.processing),
      complete: num4(row.complete),
      failed: num4(row.failed),
      lastCompletedAt: row.last_completed_at || null
    };
  } catch (e) {
    return { recoveredAnalysis: 0, recoveredJobs: 0, error: safeRefreshError(e) };
  }
}
__name(runAnalysisWatchdogV2, "runAnalysisWatchdogV2");
async function ensureTomorrowPreloadV49(env) {
  if (!shouldPreloadTomorrow()) {
    return { ok: true, skipped: true, reason: "Tomorrow preload window has not started" };
  }
  const tomorrow = tomorrowEasternDate();
  const key = fixtureKey(tomorrow);
  const stageKey = "tomorrow-staged:" + tomorrow;
  const [snap, staged] = await Promise.all([
    getFeedSnapshot(env, key).catch(() => null),
    getFeedSnapshot(env, stageKey).catch(() => null)
  ]);
  const stagedHasTomorrow = arr2(staged?.payload?.queue?.dates).some((x) => x?.date === tomorrow);
  const stagedQueueCount = Number(staged?.payload?.queue?.eligible || 0);
  const stagedHasQueuedJobs = stagedQueueCount > 0 || Number(staged?.payload?.queue?.existing || 0) > 0 || Number(staged?.payload?.queue?.inserted || 0) > 0;
  if (snap && staged?.payload?.staged && stagedHasTomorrow && stagedHasQueuedJobs) {
    const fixtureCount2 = arr2(snap?.payload?.fixtures).length || arr2(snap?.payload?.response).length || num4(snap?.payload?.total, 0);
    return {
      ok: true,
      date: tomorrow,
      refreshed: false,
      fixtureCount: fixtureCount2,
      staged: true,
      skippedRefresh: true,
      skippedSync: true,
      queue: staged?.payload?.queue || null
    };
  }
  let payload = snap?.payload || null;
  if (!payload) {
    payload = await timedV2(
      refreshFixturesV18(env, tomorrow),
      9e3,
      "initial tomorrow fixture preload"
    );
    await saveFeedSnapshot(env, key, payload, 7200);
  }
  const fixtureCount = arr2(payload?.fixtures).length || arr2(payload?.response).length || num4(payload?.total, 0);
  const sync = await timedV2(
    syncFixtureJobsV19(env, [tomorrow]),
    9e3,
    "initial tomorrow queue sync"
  );
  const stagePayload = {
    staged: true,
    date: tomorrow,
    fixtureCount,
    stagedAt: (/* @__PURE__ */ new Date()).toISOString(),
    queue: sync?.summary || null
  };
  await saveFeedSnapshot(env, stageKey, stagePayload, 12 * 3600).catch(() => null);
  return {
    ok: true,
    date: tomorrow,
    refreshed: !snap,
    fixtureCount,
    staged: true,
    queue: sync?.summary || null
  };
}
__name(ensureTomorrowPreloadV49, "ensureTomorrowPreloadV49");
async function refreshTodayScoreStateV66(env) {
  const date = easternDate();
  const base = await getFeedSnapshot(env, fixtureKey(date)).catch(() => null);
  const fixtures = fixtureRowsV58(base);
  const now = Date.now();
  const activeWindow = fixtures.some((f) => {
    const kickoff = Date.parse(f?.fixture?.date || 0);
    const status = f?.fixture?.status?.short;
    if (!Number.isFinite(kickoff))
      return false;
    if (FINISHED_STATUSES.has(status))
      return false;
    return now >= kickoff - 10 * 6e4 && now <= kickoff + 3 * 60 * 6e4;
  });
  if (!activeWindow) {
    return { ok: true, skipped: true, reason: "No Today fixture is in an active match window" };
  }
  const fresh = await refreshFixturesV18(env, date);
  await saveFeedSnapshot(env, fixtureKey(date), fresh, 900);
  let settled = null;
  try {
    settled = await settle(env);
  } catch (e) {
    settled = { error: safeRefreshError(e) };
  }
  return {
    ok: true,
    type: "today-fixtures",
    total: fresh.total,
    updatedAt: fresh.updatedAt,
    settled
  };
}
__name(refreshTodayScoreStateV66, "refreshTodayScoreStateV66");
var TICKET_LOCK_REVISION_V78 = "2026-10-06-normalized-selection-quality-v11";
function ticketNormV70(v, d = 0) {
  v = Number(v);
  return Number.isFinite(v) ? v > 1 ? v / 100 : v : d;
}
__name(ticketNormV70, "ticketNormV70");
function ticketPriceV70(x) {
  const n = Number(x?.sportsbookOdds ?? x?.odds ?? x?.price);
  return Number.isFinite(n) && n >= 1.15 ? n : null;
}
__name(ticketPriceV70, "ticketPriceV70");
function ticketPriceCoherentV70(x) {
  const o = ticketPriceV70(x), p = ticketNormV70(x?.probability, 0);
  if (!o)
    return false;
  const implied = 1 / o;
  if (o >= 3 && p >= 0.7)
    return false;
  if (p >= 0.8 && o >= 4)
    return false;
  if (p > 0 && implied > 0 && p / implied > 3)
    return false;
  return true;
}
__name(ticketPriceCoherentV70, "ticketPriceCoherentV70");
function ticketUpcomingV70(board, x) {
  const id = String(x?.fixtureId ?? x?.providerMatchId ?? "");
  const f = arr2(board?.games || board?.fixtures).find((g) => String(fixtureIdV19(g)) === id);
  return !!f && f?.fixture?.status?.short === "NS" && Date.parse(f?.fixture?.date || 0) > Date.now();
}
__name(ticketUpcomingV70, "ticketUpcomingV70");
function ticketCompetitionTierV79(board, x) {
  const id = String(x?.fixtureId ?? x?.providerMatchId ?? "");
  const f = arr2(board?.games || board?.fixtures).find((g) => String(fixtureIdV19(g)) === id);
  if (f)
    return competitionTierV21(f?.league?.name, f?.league?.id);
  return Math.max(1, Math.min(4, num4(x?.competitionTier, 4)));
}
__name(ticketCompetitionTierV79, "ticketCompetitionTierV79");
function ticketPremiumScoreV80(x) {
  const probability = ticketNormV70(x?.probability, 0) * 100, dq = ticketNormV70(x?.dataQuality, 0.7) * 100, edge = x?.valueEdgePct != null ? num4(x.valueEdgePct, 0) : num4(x?.valueEdge, 0) * 100, tier = num4(x?.competitionTier, 4), odds = ticketPriceV70(x) || 0, market = String(x?.market || "").toUpperCase(), selection = ticketSelectionKeyV78(x?.selection);
  let marketPts = 0;
  if (market === "MATCH_RESULT" && ["HOME", "AWAY"].includes(selection))
    marketPts = 6;
  else if (market === "BTTS")
    marketPts = 4;
  else if (market === "TOTAL_GOALS" && selection === "OVER_2_5")
    marketPts = 7;
  else if (market === "TOTAL_GOALS" && selection === "OVER_3_5")
    marketPts = 6;
  else if (market === "TOTAL_GOALS" && selection === "OVER_1_5")
    marketPts = 3;
  else if (market === "TOTAL_GOALS" && selection === "UNDER_3_5")
    marketPts = 2;
  else if (market === "TOTAL_GOALS" && selection === "UNDER_4_5")
    marketPts = -12;
  else if (["HOME_TEAM_GOALS", "AWAY_TEAM_GOALS"].includes(market) && /OVER_(1_5|2_5)/.test(selection))
    marketPts = 6;
  else if (market === "HANDICAP" && /PLUS_1_5/.test(selection))
    marketPts = -10;
  else if (market === "HANDICAP" && /PLUS_0_5/.test(selection))
    marketPts = 1;
  else if (market === "HANDICAP" && /MINUS/.test(selection))
    marketPts = 4;
  else if (market === "DOUBLE_CHANCE")
    marketPts = -4;
  const tierPts = tier === 1 ? 12 : tier === 2 ? 7 : 0, pricePts = odds >= 1.5 && odds <= 1.9 ? 6 : odds >= 1.25 && odds < 1.5 ? 4 : odds > 1.9 && odds <= 2.5 ? 5 : odds > 2.5 ? 2 : 0;
  return probability * 0.45 + dq * 0.18 + Math.min(Math.max(edge, 0), 25) * 0.6 + tierPts + pricePts + marketPts;
}
__name(ticketPremiumScoreV80, "ticketPremiumScoreV80");
function eliteConfidenceScoreV102(x) {
  const probability = ticketNormV70(x?.probability, 0) * 100,
    dq = ticketNormV70(x?.dataQuality, 0.7) * 100,
    edge = x?.valueEdgePct != null ? num4(x.valueEdgePct, 0) : num4(x?.valueEdge, 0) * 100,
    tier = num4(x?.competitionTier, 4),
    odds = ticketPriceV70(x) || 0,
    market = String(x?.market || "").toUpperCase(),
    selection = ticketSelectionKeyV78(x?.selection);
  let marketPts = 0;
  if (market === "MATCH_RESULT" && ["HOME", "AWAY"].includes(selection)) marketPts = 3;
  else if (market === "BTTS") marketPts = 2;
  else if (market === "TOTAL_GOALS" && selection === "OVER_2_5") marketPts = 3;
  else if (market === "TOTAL_GOALS" && selection === "OVER_3_5") marketPts = 2;
  else if (market === "TOTAL_GOALS" && selection === "OVER_1_5") marketPts = 2;
  else if (market === "TOTAL_GOALS" && selection === "UNDER_3_5") marketPts = 1;
  else if (market === "TOTAL_GOALS" && selection === "UNDER_4_5") marketPts = -10;
  else if (["HOME_TEAM_GOALS", "AWAY_TEAM_GOALS"].includes(market) && /OVER_(1_5|2_5)/.test(selection)) marketPts = 2;
  else if (market === "HANDICAP" && /PLUS_1_5/.test(selection)) marketPts = -9;
  else if (market === "HANDICAP" && /PLUS_0_5/.test(selection)) marketPts = 1;
  else if (market === "HANDICAP" && /MINUS/.test(selection)) marketPts = 2;
  else if (market === "DOUBLE_CHANCE") marketPts = -1;
  const tierPts = tier === 1 ? 8 : tier === 2 ? 5 : 0,
    pricePts = odds >= 1.50 && odds <= 1.90 ? 2 : odds >= 1.25 && odds < 1.50 ? 1 : odds > 1.90 && odds <= 2.50 ? 3 : odds > 2.50 ? 1 : 0,
    edgePts = clamp4(edge, -8, 6) * 0.20;
  return probability * 0.60 + dq * 0.22 + edgePts + tierPts + pricePts + marketPts;
}
__name(eliteConfidenceScoreV102, "eliteConfidenceScoreV102");

function eliteRejectionReasonsV2(x) {
  const reasons = [];
  const odds = ticketPriceV70(x),
    market = String(x?.market || "").toUpperCase(),
    selection = ticketSelectionKeyV78(x?.selection),
    tier = num4(x?.competitionTier, 4),
    p = ticketNormV70(x?.probability, 0),
    dq = ticketNormV70(x?.dataQuality, 0.7),
    edge = x?.valueEdgePct != null ? num4(x.valueEdgePct, 0) / 100 : num4(x?.valueEdge, 0),
    score = eliteConfidenceScoreV102(x);
  if (!odds || odds < 1.18) reasons.push("PRICE_FLOOR");
  if (tier > 2) reasons.push("COMPETITION_TIER");
  if (dq < (tier === 1 ? 0.64 : 0.72)) reasons.push("DATA_QUALITY");
  if (!Number.isFinite(edge) || edge <= 0) reasons.push("NON_POSITIVE_VALUE");
  let probabilityFloor = tier === 1 ? 0.72 : 0.76;
  if (market === "MATCH_RESULT" && ["HOME", "AWAY"].includes(selection)) probabilityFloor = tier === 1 ? 0.66 : 0.70;
  else if (market === "TOTAL_GOALS" && selection === "OVER_1_5") probabilityFloor = tier === 1 ? 0.74 : 0.77;
  else if (market === "TOTAL_GOALS" && selection === "OVER_2_5") probabilityFloor = tier === 1 ? 0.66 : 0.69;
  else if (market === "BTTS") probabilityFloor = tier === 1 ? 0.66 : 0.69;
  else if (market === "HANDICAP" && /PLUS_0_5/.test(selection)) probabilityFloor = tier === 1 ? 0.74 : 0.77;
  else if (market === "DOUBLE_CHANCE") probabilityFloor = tier === 1 ? 0.78 : 0.80;
  else if (market === "TOTAL_GOALS" && selection === "UNDER_4_5") {
    probabilityFloor = tier === 1 ? 0.86 : 0.88;
    if (odds < 1.45) reasons.push("LOW_RETURN_UNDER_4_5");
  } else if (market === "HANDICAP" && /(HOME|AWAY)_PLUS_1_5/.test(selection)) {
    probabilityFloor = tier === 1 ? 0.86 : 0.88;
    if (odds < 1.30) reasons.push("LOW_RETURN_PLUS_1_5");
  }
  if (p < probabilityFloor) reasons.push("PROBABILITY_FLOOR");
  if (tier === 1 && score < 73.5) reasons.push("CONFIDENCE_SCORE");
  if (tier === 2 && score < 77) reasons.push("CONFIDENCE_SCORE");
  return reasons;
}
function eliteLegQualityV79(x) { return eliteRejectionReasonsV2(x).length === 0; }
__name(eliteLegQualityV79, "eliteLegQualityV79");
function ticketSelectionKeyV78(value) {
  return String(value || "").trim().toUpperCase().replace(/(\d)\.(\d)/g, "$1_$2").replace(/[^A-Z0-9_]+/g, "_");
}
__name(ticketSelectionKeyV78, "ticketSelectionKeyV78");
function oddsMarketsForBooksV81(payload, fixtureId, allowedBooks) {
  const rows = Array.isArray(payload?.response) ? payload.response : [], row = rows.find((x) => String(x?.fixture?.id ?? x?.fixture_id ?? x?.id) === String(fixtureId));
  if (!row)
    return [];
  const allowed = new Set(arr2(allowedBooks).map((x) => String(x || "").toLowerCase().replace(/[^a-z0-9]/g, ""))), out = [];
  for (const book of row.bookmakers || []) {
    const normalized = String(book?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (allowed.size && !allowed.has(normalized))
      continue;
    for (const bet of book.bets || []) {
      const market = providerMarketName(bet.name);
      if (!market)
        continue;
      const outcomes = [];
      for (const v of bet.values || []) {
        const raw = String(v.value ?? v.name ?? ""), selection = thresholdSelection(raw), odds = num4(v.odd ?? v.odds, null);
        if (selection && odds > 1)
          outcomes.push({ selection, rawSelection: raw, odds });
      }
      if (outcomes.length >= 2)
        out.push({ market, rawMarket: bet.name || market, bookmaker: book.name || null, outcomes });
    }
  }
  return groupMarketLinesV19(out);
}
__name(oddsMarketsForBooksV81, "oddsMarketsForBooksV81");
function crossBookCheckV81(oddsPayload, fixtureId, market, selection, bet365Odds) {
  const books = oddsMarketsForBooksV81(oddsPayload, fixtureId, ["DraftKings", "FanDuel"]), wantMarket = String(market || "").toUpperCase(), wantSelection = ticketSelectionKeyV78(selection), comparisons = [];
  for (const group of books) {
    if (String(group?.market || "").toUpperCase() !== wantMarket)
      continue;
    for (const outcome of arr2(group?.outcomes)) {
      if (ticketSelectionKeyV78(outcome?.selection) !== wantSelection)
        continue;
      const odds = Number(outcome?.odds);
      if (odds > 1)
        comparisons.push({ bookmaker: group.bookmaker, odds, rawMarket: group.rawMarket, rawSelection: outcome.rawSelection });
    }
  }
  if (!comparisons.length)
    return { status: "BET365_ONLY", ok: true, comparisons: [], median: null, spreadPct: null };
  const vals = comparisons.map((x) => x.odds).sort((a, b) => a - b), median = vals.length % 2 ? vals[(vals.length - 1) / 2] : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2, spreadPct = Math.abs(Number(bet365Odds) / median - 1) * 100;
  return { status: spreadPct <= 20 ? "CROSS_BOOK_VERIFIED" : "CROSS_BOOK_MISMATCH", ok: spreadPct <= 20, comparisons, median, spreadPct };
}
__name(crossBookCheckV81, "crossBookCheckV81");
function publishedReasonV81(x) {
  const market = String(x?.market || "").toUpperCase(), selection = String(x?.selection || "").toUpperCase(), odds = num4(x?.sportsbookOdds, 0), prob = ticketNormV70(x?.probability, 0) * 100, implied = odds > 1 ? 100 / odds : 0, edge = x?.valueEdgePct != null ? num4(x.valueEdgePct, 0) : num4(x?.valueEdge, 0) * 100, option = selection.replaceAll("_", " ").replace(/\bPLUS\b/g, "+").replace(/\bMINUS\b/g, "-");
  let why = "Two45 rates this as the best supported option";
  if (market === "MATCH_RESULT")
    why = "Two45's match model favors " + option;
  else if (market === "TOTAL_GOALS")
    why = "Two45's scoring model favors " + option.toLowerCase() + " total goals";
  else if (market === "BTTS")
    why = "Two45's scoring model favors both teams to score: " + option.toLowerCase();
  else if (market === "HOME_TEAM_GOALS")
    why = "Two45's team-scoring model favors the home side " + option.toLowerCase() + " goals";
  else if (market === "AWAY_TEAM_GOALS")
    why = "Two45's team-scoring model favors the away side " + option.toLowerCase() + " goals";
  else if (market === "HANDICAP")
    why = "Two45's matchup model favors the " + option.toLowerCase() + " handicap";
  else if (market.includes("CORNERS"))
    why = "Two45's corner model favors the " + option.toLowerCase() + " corner line";
  const book = String(x?.bookmaker || "verified sportsbook").trim();
  const verify = x?.oddsVerification?.status === "CROSS_BOOK_VERIFIED" ? " Price was checked against additional bookmaker quotes for this exact line." : x?.oddsVerification?.status === "SINGLE_BOOK_VERIFIED" ? " Only one bookmaker quote was available for this exact line." : "";
  return why + " at " + book + " " + odds.toFixed(2) + ". Model " + prob.toFixed(1) + "% vs " + implied.toFixed(1) + "% implied, edge " + Math.max(0, edge).toFixed(1) + "%." + verify;
}
__name(publishedReasonV81, "publishedReasonV81");
function suspiciousBet365PriceV100(market, selection, odds) {
  const m = String(market || "").toUpperCase(), s = ticketSelectionKeyV78(selection), o = Number(odds);
  if (!(o > 1))
    return true;
  if (o > 12)
    return true;
  if (m === "HANDICAP") {
    if (/PLUS_0_5$/.test(s) && o >= 3)
      return true;
    if (/PLUS_1_5$/.test(s) && o >= 2.5)
      return true;
    if (/PLUS_2_5$/.test(s) && o >= 2.15)
      return true;
  }
  if (m === "DOUBLE_CHANCE" && o >= 3.25)
    return true;
  return false;
}
__name(suspiciousBet365PriceV100, "suspiciousBet365PriceV100");
// Equal-priority Bet365/DraftKings quote resolver. Never relabel one book's price as another.
function exactPreferredBookQuoteV118(oddsPayload, fixtureId, market, selection, now = Date.now(), requiredBookmaker = null) {
 const wantedMarket=String(market||'').trim().toUpperCase(), wantedSelection=ticketSelectionKeyV78(selection);
 if(!wantedMarket||!wantedSelection)return null;
 const rows=Array.isArray(oddsPayload?.response)?oddsPayload.response:[];
 const row=rows.find(x=>String(x?.fixture?.id??x?.fixture_id??x?.id)===String(fixtureId));
 if(!row)return null;
 const matches=[];
 for(const group of oddsMarketsForBooksV81(oddsPayload,fixtureId,['Bet365','DraftKings','Pinnacle','William Hill','Marathonbet'])){
  if(String(group.market||'').toUpperCase()!==wantedMarket)continue;
  const normalizedBook=String(group.bookmaker||'').replace(/[^a-z0-9]/gi,'').toLowerCase();
  if(!['bet365','draftkings','pinnacle','williamhill','marathonbet'].includes(normalizedBook))continue;
  const bookRow=(row.bookmakers||[]).find(b=>String(b.name||'').replace(/[^a-z0-9]/gi,'').toLowerCase()===normalizedBook);
  const observedAt=bookRow?.observedAt||row.observedAt,providerUpdatedAt=bookRow?.providerUpdatedAt||bookRow?.last_update||row.providerUpdatedAt||row.update;
  const observed=Date.parse(observedAt),updated=Date.parse(providerUpdatedAt);
  if(!Number.isFinite(observed)||!Number.isFinite(updated)||updated>observed||observed>now||updated>now||now-observed>30*60000||now-updated>180*60000)continue;
  for(const outcome of arr2(group.outcomes)){
   if(ticketSelectionKeyV78(outcome.selection)!==wantedSelection)continue;
   const odds=Number(outcome.odds);
   if(!Number.isFinite(odds)||odds<1.15||suspiciousBet365PriceV100(wantedMarket,wantedSelection,odds))continue;
   matches.push({odds,bookmaker:({bet365:'Bet365',draftkings:'DraftKings',pinnacle:'Pinnacle',williamhill:'William Hill',marathonbet:'Marathonbet'})[normalizedBook],observedAt,providerUpdatedAt,rawMarket:group.rawMarket||null,rawSelection:outcome.rawSelection||null,groupKey:group.groupKey||null,exactMarket:true,exactSelection:true,priceSuspicious:false});
  }
 }
 const byBook=new Map();
 for(const x of matches){const arr=byBook.get(x.bookmaker)||[];arr.push(x);byBook.set(x.bookmaker,arr);}
 const verified=[];
 for(const [book,arr] of byBook){
  if(new Set(arr.map(x=>x.odds.toFixed(4))).size!==1)continue;
  const x=arr[0];
  const comparisonBooks=['Bet365','DraftKings','Pinnacle','William Hill','Marathonbet'].filter(x=>x!==book);
  const comparisons=oddsMarketsForBooksV81(oddsPayload,fixtureId,comparisonBooks).flatMap(g=>
   String(g.market||'').toUpperCase()===wantedMarket?arr2(g.outcomes).filter(o=>ticketSelectionKeyV78(o.selection)===wantedSelection&&Number(o.odds)>1).map(o=>Number(o.odds)):[]
  );
  if(comparisons.length){const vals=comparisons.sort((a,b)=>a-b),mid=Math.floor(vals.length/2),median=vals.length%2?vals[mid]:(vals[mid-1]+vals[mid])/2;
   if(Math.abs(x.odds/median-1)*100>20)continue;
  }
  verified.push({...x,oddsVerification:{ok:true,status:comparisons.length?'CROSS_BOOK_VERIFIED':'SINGLE_BOOK_VERIFIED',comparisonsCount:comparisons.length}});
 }
 // Same priority, prefer the best independently verified price, never overwrite its bookmaker.
 verified.sort((a,b)=>b.odds-a.odds||a.bookmaker.localeCompare(b.bookmaker));
 return (requiredBookmaker ? verified.find(x=>x.bookmaker===requiredBookmaker) : verified[0])||null;
}
__name(exactPreferredBookQuoteV118,"exactPreferredBookQuoteV118");
function exactBet365QuoteV78(oddsPayload,fixtureId,market,selection){
 const quote=exactPreferredBookQuoteV118(oddsPayload,fixtureId,market,selection);
 if(!quote?.bookmaker)return null;
 const updated=Date.parse(quote.providerUpdatedAt),now=Date.now();
 if(!Number.isFinite(updated)||updated>now||now-updated>30*60000)return null;
 return quote;
}
__name(exactBet365QuoteV78, "exactBet365QuoteV78");
function trustScoreV83(x) {
  const premium = clamp4(num4(x?.premiumScore, ticketPremiumScoreV80(x)), 0, 100), dq = clamp4(ticketNormV70(x?.dataQuality, 0.7) * 100, 0, 100), prob = clamp4(ticketNormV70(x?.probability, 0) * 100, 0, 100), verify = x?.oddsVerification?.status === "CROSS_BOOK_VERIFIED" ? 9 : x?.oddsVerification?.status === "SINGLE_BOOK_VERIFIED" || x?.oddsVerification?.status === "BET365_ONLY" ? 5 : 0, rel = clamp4(num4(x?.teamMarketReliability?.bonus, 0), -4, 6);
  return Math.round(clamp4(premium * 0.52 + dq * 0.18 + prob * 0.18 + verify + rel, 0, 100));
}
__name(trustScoreV83, "trustScoreV83");
async function verifyPublicStrongPicksV83(env, date, board) {
  const oddsRow = await getFeedSnapshot(env, oddsKey(date)).catch(() => null), learningRow = await getFeedSnapshot(env, "two45-learning:v82").catch(() => null), oddsPayload = oddsRow?.payload || {}, learning = learningRow?.payload || {}, profiles = learning.profiles || {}, verified = [];
  for (const p of arr2(board?.strongPicks)) {
    const fixtureId = p?.fixtureId ?? p?.providerMatchId, quote = exactBet365QuoteV78(oddsPayload, fixtureId, p?.market, p?.selection);
    if (!quote)
      continue;
    const tier = num4(p?.competitionTier, 4), x = { ...p, bookmaker: quote.bookmaker, sportsbookOdds: quote.odds, priceObservedAt:quote.observedAt,providerUpdatedAt:quote.providerUpdatedAt, rawMarket: quote.rawMarket, rawSelection: quote.rawSelection, oddsVerification: quote.oddsVerification, priceVerified: true, priceVerificationRevision: TICKET_LOCK_REVISION_V78, convictionLabel: "Two45 High Conviction" };
    x.valueEdge = ticketNormV70(x.probability,0) - 1/quote.odds;
    x.valueEdgePct = x.valueEdge * 100;
    x.premiumScore = ticketPremiumScoreV80(x);
    const rels = [profiles[learningProfileKeyV82(x.home, x.market, x.selection)], profiles[learningProfileKeyV82(x.away, x.market, x.selection)]].filter(Boolean).sort((a, b) => num4(b?.reliability?.bonus, 0) - num4(a?.reliability?.bonus, 0));
    const rel = rels[0] || null;
    x.teamMarketReliability = rel ? { team: rel.team, settled: rel.settled, wins: rel.wins, losses: rel.losses, hitRate: rel.hitRate, label: rel.reliability?.label || null, bonus: clamp4(num4(rel?.reliability?.bonus, 0), -4, 6) } : null;
    x.trustScore = trustScoreV83(x);
    x.trustStatus = x.trustScore >= 82 ? "HIGH" : x.trustScore >= 74 ? "SOLID" : "HOLD";
    x.reasons = [publishedReasonV81(x), ...rel && num4(rel.settled, 0) >= 6 ? ["Two45 history: " + rel.team + " is " + rel.wins + "/" + rel.settled + " on this team-market pattern. Historical reliability supports the decision but never creates it."] : []];
    if (tier <= 3 && x.trustScore >= 74)
      verified.push(x);
  }
  const review=await reviewModelPoolV1(env,verified);
  verified.splice(0,verified.length,...review.pool.filter(x=>x.modelReview?.status==='SUPPORTS' && x.modelReview?.hold===false));
  verified.sort((a, b) => num4(a.competitionTier, 4) - num4(b.competitionTier, 4) || num4(b.trustScore, 0) - num4(a.trustScore, 0) || num4(b.premiumScore, 0) - num4(a.premiumScore, 0));
  const primary=new Map();for(const x of verified)if(!primary.has(String(x.fixtureId ?? x.providerMatchId)))primary.set(String(x.fixtureId ?? x.providerMatchId),x);
  verified.splice(0,verified.length,...primary.values());
  await Promise.all(verified.map(x=>sb(env,"rpc/two45_capture_publication_v2",{method:"POST",body:JSON.stringify({p_product:"HIGH_CONVICTION",p_key:date,p_evidence:"verified-public-board:"+date,p_pick:x,p_at:new Date().toISOString()})})));
  const ids = new Set(verified.map((x) => String(x.fixtureId || x.providerMatchId || "")));
  return { ...board, strongPicks: verified, independentReview:review.summary,independentReviewHolds:review.holds,
    independentForecasts:arr2(board?.independentForecasts).map(f=>presentModelReviewV1(f,review)),
    picks: arr2(board?.picks).filter((x) => x?.pickType === "RISKY_VALUE" || ids.has(String(x?.fixtureId || x?.providerMatchId || ""))).map(f=>presentModelReviewV1(f,review)) };
}
__name(verifyPublicStrongPicksV83, "verifyPublicStrongPicksV83");
function ticketPoolBoardVerifiedV78(board, day, oddsPayload, alts = false, learning = null, deduplicateFixtures = true) {
  const rows = [];
  const sources = [...arr2(board?.strongPicks), ...arr2(board?.premiumCandidates)];
  for (const p of sources) {
    const tier = ticketCompetitionTierV79(board, p);
    if (tier > 3 || p?.decision !== "PICK" || !ticketUpcomingV70(board, p))
      continue;
    for (const c of alts ? [p, ...arr2(p.alternatives)] : [p]) {
      const x = { ...p, ...c }, fixtureId = p.fixtureId ?? p.providerMatchId;
      for (const book of ['Bet365','DraftKings','Pinnacle','William Hill','Marathonbet']) {
      const quote = exactPreferredBookQuoteV118(oddsPayload, fixtureId, x.market, x.selection, Date.now(), book);
      if (!quote || Date.now()-Date.parse(quote.providerUpdatedAt)>30*60000) continue;
      const verified = { ...x, fixtureId: p.fixtureId, providerMatchId: p.providerMatchId, home: p.home, away: p.away, league: p.league, kickoff: p.kickoff, competitionTier: tier, bookmaker: quote.bookmaker, sportsbookOdds: quote.odds,priceObservedAt:quote.observedAt,providerUpdatedAt:quote.providerUpdatedAt, rawMarket: quote.rawMarket, rawSelection: quote.rawSelection, oddsVerification: quote.oddsVerification, priceVerified: true, priceVerificationRevision: TICKET_LOCK_REVISION_V78, _ticketOdds: quote.odds, _ticketDay: day };
      // A merged alternative must never inherit the headline market's edge.
      verified.valueEdge = ticketNormV70(verified.probability,0) - 1/quote.odds;
      verified.valueEdgePct = verified.valueEdge * 100;
      if (!ticketPriceCoherentV70(verified))
        continue;
      verified.premiumScore = ticketPremiumScoreV80(verified);
      const profiles = learning?.profiles || {}, teamProfiles = [profiles[learningProfileKeyV82(verified.home, verified.market, verified.selection)], profiles[learningProfileKeyV82(verified.away, verified.market, verified.selection)]].filter(Boolean).sort((a, b) => num4(b?.reliability?.bonus, 0) - num4(a?.reliability?.bonus, 0)), rel = teamProfiles[0] || null, relBonus = clamp4(num4(rel?.reliability?.bonus, 0), -4, 6);
      verified.teamMarketReliability = rel ? { team: rel.team, settled: rel.settled, wins: rel.wins, losses: rel.losses, hitRate: rel.hitRate, label: rel.reliability?.label || null, bonus: relBonus } : null;
      verified._ticketScore = (verified.premiumScore + relBonus) / 100;
      verified.convictionLabel = "Two45 High Conviction";
      verified.reasons = [publishedReasonV81(verified)];
      if (rel && num4(rel.settled, 0) >= 6)
        verified.reasons.push("Two45 history: " + rel.team + " has gone " + rel.wins + "/" + rel.settled + " on this team-market pattern. This is a supporting signal, not an automatic pick.");
      rows.push(verified);
      }
    }
  }
  const seen = /* @__PURE__ */ new Map();
  for (const x of rows) {
    const fixture = String(x.fixtureId || x.providerMatchId || "");
    if (!fixture) continue;
    const id = deduplicateFixtures ? [fixture,x.bookmaker].join('|') : [fixture,x.bookmaker,x.market,ticketSelectionKeyV78(x.selection)].join('|'), prev = seen.get(id);
    if (id && (!prev || x._ticketScore > prev._ticketScore))
      seen.set(id, x);
  }
  return [...seen.values()].sort((a, b) => num4(a.competitionTier, 4) - num4(b.competitionTier, 4) || b._ticketScore - a._ticketScore);
}
__name(ticketPoolBoardVerifiedV78, "ticketPoolBoardVerifiedV78");
function eliteQualifiedPoolV2(rows) {
  const best = new Map();
  for (const row of rows.filter(x=>x.engine2Experimental ? (x.priceVerified===true && Boolean(x.bookmaker) && x.competitionTier<=2 && x.probability>=.70 && x.probability<.95 && x.sportsbookOdds>=1.18 && x.sportsbookOdds<=3.5 && x.valueEdge>0 && x.probability*x.sportsbookOdds-1<=.30) : eliteLegQualityV79(x))) {
    const id=[String(row.fixtureId ?? row.providerMatchId),String(row.bookmaker)].join('|'),previous=best.get(id);
    if (!previous || row._ticketScore>previous._ticketScore) best.set(id,row);
  }
  return [...best.values()].sort((a,b)=>a.competitionTier-b.competitionTier || b._ticketScore-a._ticketScore);
}
function dailyPublicationWindowV2(date, now = Date.now()) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now)).map(p=>[p.type,p.value]));
  const localDate=parts.year+'-'+parts.month+'-'+parts.day;
  return {allowed:date<localDate || date===localDate && Number(parts.hour)>=6,date:localDate,hour:Number(parts.hour),reviewAt:'06:00 America/New_York'};
}
async function archiveTicketLockV78(env, type, date, row) {
  const payload = row?.payload;
  if (!payload)
    return;
  const stamp = String(payload.lockedAt || (/* @__PURE__ */ new Date()).toISOString()).replace(/[:.]/g, "-");
  await saveFeedSnapshot(env, "ticket-lock-history:" + type + ":" + date + ":" + stamp, { archivedAt: (/* @__PURE__ */ new Date()).toISOString(), archiveReason: "pricing-integrity-revision", replacedByRevision: TICKET_LOCK_REVISION_V78, payload }, 30 * 86400).catch(() => null);
}
__name(archiveTicketLockV78, "archiveTicketLockV78");
function ticketOptimizeV70(pool, target, low, high, minLegs, maxLegs, requireTier1 = false) {
  let best = null, fallback = null;
  const tier1Available = requireTier1 && pool.some((x) => num4(x?.competitionTier, 4) === 1);
  function visit(start, legs, combined, sum) {
    if (legs.length >= minLegs) {
      const hasTier1 = legs.some((x) => num4(x?.competitionTier, 4) === 1);
      if (!tier1Available || hasTier1) {
        const avg = sum / legs.length, dist = Math.abs(combined - target) / target, c = { legs: legs.slice(), combined, score: avg - dist * 0.08 - Math.max(0, legs.length - minLegs) * 8e-3, target, targetLow: low, targetHigh: high };
        if (combined >= low && combined <= high && (!best || c.score > best.score))
          best = c;
        c.fallbackScore = avg - dist * 0.16 - Math.max(0, legs.length - minLegs) * 0.01;
        if (!fallback || c.fallbackScore > fallback.fallbackScore)
          fallback = c;
      }
    }
    if (legs.length >= maxLegs || combined > high * 1.75)
      return;
    for (let i = start; i < pool.length; i++) {
      if (legs.some((leg) => String(leg.fixtureId ?? leg.providerMatchId) === String(pool[i].fixtureId ?? pool[i].providerMatchId))) continue;
      // All legs must be executable at one identified bookmaker.
      if (legs.length && pool[i].bookmaker !== legs[0].bookmaker) continue;
      const next = combined * pool[i]._ticketOdds;
      if (next > Math.max(high * 1.75, target * 1.75))
        continue;
      legs.push(pool[i]);
      visit(i + 1, legs, next, sum + pool[i]._ticketScore);
      legs.pop();
    }
  }
  __name(visit, "visit");
  visit(0, [], 1, 0);
  const chosen = best || fallback;
  if (chosen) {
    chosen.targetMet = !!best;
    chosen.tier1Required = tier1Available;
    chosen.tier1Included = chosen.legs.some((x) => num4(x?.competitionTier, 4) === 1);
  }
  return chosen;
}
__name(ticketOptimizeV70, "ticketOptimizeV70");
function recoverEliteBoardHandoffV119(presented,stored,games,canonicalRows,now=Date.now()) {
 const candidates=arr2(stored?.strongPicks).filter(p=>{
  const id=String(p?.fixtureId??p?.providerMatchId??'');
  const f=arr2(games).find(g=>String(fixtureIdV19(g))===id);
  if(!f||!UPCOMING_STATUSES.has(f?.fixture?.status?.short)||Date.parse(f?.fixture?.date||0)<=now)return false;
  if(competitionTierV21(f?.league?.name,f?.league?.id)>2)return false;
  if(p?.decision!=='PICK'||p?.analysisSource!=='independent-model'||p?.priceVerified!==true)return false;
  if(!p?.market||!p?.selection||!Number.isFinite(Number(p?.probability)))return false;
  const created=Date.parse(p?.generatedAt||p?.createdAt||'');
  return Number.isFinite(created)&&created<=now&&created<Date.parse(f?.fixture?.date||0);
 });
 const canonicalIds=new Set(arr2(canonicalRows).filter(r=>r?.status==='COMPLETE').map(r=>String(r.fixture_id)));
 const presentIds=new Set(arr2(presented?.strongPicks).map(p=>String(p.fixtureId??p.providerMatchId)));
 const missing=candidates.filter(p=>!canonicalIds.has(String(p.fixtureId??p.providerMatchId))&&!presentIds.has(String(p.fixtureId??p.providerMatchId)));
 if(!missing.length)return presented;
 return {...presented,strongPicks:[...arr2(presented?.strongPicks),...missing],
   picks:[...arr2(presented?.picks),...missing],
   analyzedCount:Math.max(num4(presented?.analyzedCount,0),num4(stored?.analyzedCount,0)),
   handoffRecovery:{source:'stored-independent-model-board',candidateCount:missing.length,requiresFreshOdds:true,publicationAuthorized:false}};
}
__name(recoverEliteBoardHandoffV119,"recoverEliteBoardHandoffV119");
async function ticketBoardV70(env, date) {
  const fs = await snapshot(env, fixtureKey(date)).catch(() => null), games = fixtureRowsV58(fs);
  if (!games.length)
    return { ok: true, date, games: [], fixtures: [], strongPicks: [], riskyPlays: [], premiumCandidates: [] };
  const bs = await snapshot(env, modelBoardKey(date)).catch(() => null), base = bs?.payload || { ok: true, date, games, fixtures: games };
  let rows = await canonicalAnalysisRowsV2(env, games.map(fixtureIdV19)).catch(() => []);
  rows = await repriceCanonicalRowsV84(env, date, rows);
  const presented = presentCanonicalBoardV59(base, games, rows);
  // A transient canonical-query failure must not erase a completed model board.
  // Recovery supplies research candidates only; buildDailyLockV70 reprices every
  // selection against current exact sportsbook quotes and independent review.
  const recoveredBoard = recoverEliteBoardHandoffV119(presented, base, games, rows);
  const fixtureMap = new Map(games.map((f) => [String(fixtureIdV19(f)), f]));
  const chosenRows = /* @__PURE__ */ new Map();
  for (const row of arr2(rows)) {
    if (row?.status !== "COMPLETE")
      continue;
    const id = String(row?.fixture_id || "");
    if (!id)
      continue;
    const rank = row?.model_version === MODEL_VERSION ? 2 : 1;
    const completed = Date.parse(row?.completed_at || row?.updated_at || row?.requested_at || 0);
    const prev = chosenRows.get(id);
    if (!prev || rank > prev.rank || rank === prev.rank && completed > prev.completed)
      chosenRows.set(id, { row, rank, completed });
  }
  const premiumCandidates = [];
  for (const [id, entry] of chosenRows) {
    const row = entry.row, f = fixtureMap.get(id);
    if (!f || !UPCOMING_STATUSES.has(f?.fixture?.status?.short) || Date.parse(f?.fixture?.date || 0) <= Date.now())
      continue;
    const tier = competitionTierV21(f?.league?.name, f?.league?.id);
    if (tier > 2)
      continue;
    const forecast = canonicalForecastV2(row);
    if (!forecast)
      continue;
    // Include preserved independent-model candidates only in the existing
    // exact-Bet365, kickoff, Elite-quality and independent-review pipeline.
    // Research is not a pick: no price means no candidate can survive verification.
    const researchOptions = row.model_version === MODEL_VERSION
      ? arr2(row?.result?.researchMarketOptions) : [];
    const options = [...arr2(row?.result?.marketOptions), ...researchOptions];
    const seenOptions = new Set();
    for (const option of options) {
      const identity = String(option?.market || "") + "|" + ticketSelectionKeyV78(option?.selection);
      if (seenOptions.has(identity)) continue;
      seenOptions.add(identity);
      if (String(option?.lane || "").toUpperCase() !== "STRONG")
        continue;
      if (String(option?.analysisSource || "").toLowerCase() !== "independent-model")
        continue;
      premiumCandidates.push({
        ...forecast,
        ...option,
        fixtureId: Number(id),
        providerMatchId: Number(id),
        home: forecast?.home || f?.teams?.home?.name || null,
        away: forecast?.away || f?.teams?.away?.name || null,
        league: f?.league?.name || forecast?.league || null,
        kickoff: f?.fixture?.date || forecast?.kickoff || null,
        competitionTier: tier,
        decision: "PICK",
        alternatives: []
      });
    }
  }
  return { ...recoveredBoard, premiumCandidates };
}
__name(ticketBoardV70, "ticketBoardV70");
async function ticketBaselineV70(env, legs) {
  const out = {}, ids = [...new Set(arr2(legs).map((x) => Number(x.fixtureId || x.providerMatchId)).filter(Boolean))];
  await Promise.all(ids.map(async (id) => {
    const s = await getFeedSnapshot(env, "match-intelligence:" + id).catch(() => null), p = s?.payload || {};
    out[String(id)] = { generatedAt: p.generatedAt || s?.refreshed_at || null, homeAbsences: num4(p.homeAbsences, 0), awayAbsences: num4(p.awayAbsences, 0), lineupsConfirmed: Boolean(p.lineupsConfirmed) };
  }));
  return out;
}
__name(ticketBaselineV70, "ticketBaselineV70");
function lockTicketV70(t, at, b) {
  if (!t)
    return null;
  return { ...t, locked: true, lockedAt: at, legs: arr2(t.legs).map((x) => ({ ...x, locked: true, lockedAt: at, originalOdds: ticketPriceV70(x), originalProbability: num4(x.probability, null), originalMarket: x.market || null, originalSelection: x.selection || null, lockIntel: b?.[String(x.fixtureId || x.providerMatchId)] || null })) };
}
__name(lockTicketV70, "lockTicketV70");
async function hydrateEliteCandidateOddsV101(env, board, oddsPayload, additionalFixtureIds = []) {
  let response = bet365RowsV68(arr2(oddsPayload?.response));
  const priorityIds = arr2(additionalFixtureIds).map(String).filter(Boolean);
  const boardIds = [...arr2(board?.strongPicks), ...arr2(board?.riskyPlays), ...arr2(board?.premiumCandidates)]
    .filter((p) => p?.decision === "PICK" && num4(p?.competitionTier, 4) <= 3 && ticketUpcomingV70(board, p))
    .map((p) => String(p?.fixtureId ?? p?.providerMatchId ?? "")).filter(Boolean);
  const ids = [...new Set([...boardIds, ...priorityIds])].filter(id => !response.some(row => String(row?.fixture?.id) === id && fixtureQuoteFreshV2(row))).slice(0, 30);
  // Bounded requests: the provider enforces shared pacing and a daily budget.
  const directResponses = [];
  for (const id of ids.slice(0, 4)) {
    const rowsForFixture = await (async () => {
    const cached = await getFeedSnapshot(env, "fixture-odds:" + id).catch(() => null);
    const age = Date.now() - Date.parse(cached?.refreshed_at);
    const cachedRows = bet365RowsV68(cached?.payload?.response);
    if (Number.isFinite(age) && age >= 0 && age < 10 * 60 * 1e3 &&
        cachedRows.some(row => String(row?.fixture?.id) === id && fixtureQuoteFreshV2(row))) return cachedRows;
    // A fresh cache write is not proof of a fresh provider quote.
    try {
      const direct = await providerFetchV18(env, "odds", {fixture:id,page:1});
      const rows = bet365RowsV68(arr2(direct?.response).map(slimOddsRowV18));
      if (!rows.some(row => String(row?.fixture?.id) === id && fixtureQuoteFreshV2(row))) return [];
      await saveFeedSnapshot(env, "fixture-odds:" + id, {
        ok:true,service:"two45-live-worker",type:"fixture-odds",fixtureId:id,
        updatedAt:new Date().toISOString(),response:rows
      },1800);
      return rows;
    } catch (e) { return []; }
    })();
    directResponses.push(rowsForFixture);
  }
  for (const rows of directResponses) if (rows.length) response = mergeOddsV18(response, rows);
  return { ...oddsPayload, response, total: response.length };
}
__name(hydrateEliteCandidateOddsV101, "hydrateEliteCandidateOddsV101");
async function buildDailyLockV70(env, date, rebuildReason = null) {
  const values = await Promise.all([ticketBoardV70(env, date), getFeedSnapshot(env, oddsKey(date)).catch(() => null), getFeedSnapshot(env, "two45-learning:v82").catch(() => null)]), board = values[0], oddsRow = values[1], learning = values[2]?.payload || {}, oddsPayload = oddsRow?.payload || {};
  const oddsComplete = Boolean(oddsRow) && oddsPayload?.paging?.complete !== false && !oddsPayload?.repairInProgress;
  const engine2PricingIds = arr2(await sb(env,'two45_feed_snapshots?snapshot_key=like.engine2-shadow:v1:*&select=fixtureId:payload->>fixtureId,kickoffAt:payload->>kickoffAt,qualityHold:payload->>qualityHold,discovery:payload->discovery&order=refreshed_at.desc&limit=80',{timeoutMs:2500}).catch(()=>[])).filter(x=>x.discovery?.status==='CANDIDATES'&&x.qualityHold!==true&&x.qualityHold!=='true'&&dateOfV19(x.kickoffAt)===date).map(x=>String(x.fixtureId));
  const candidateOddsPayload = await hydrateEliteCandidateOddsV101(env, board, oddsPayload, engine2PricingIds);
  const researchFixtureIds = new Set([...arr2(board?.strongPicks),...arr2(board?.premiumCandidates)].filter(p=>p?.decision==='PICK' && ticketCompetitionTierV79(board,p)<=2 && ticketUpcomingV70(board,p)).map(p=>String(p.fixtureId ?? p.providerMatchId)));
  const pricedPool = ticketPoolBoardVerifiedV78(board, "Today", candidateOddsPayload, true, learning, false).filter((x) => num4(x?.competitionTier, 4) <= 2).filter((x) => String(x?.lane || "").toUpperCase() !== "WATCH" && String(x?.role || "").toUpperCase() !== "WATCH_OPTION");
  // Engine 2 independent candidate comparison. The model is not validated for live promotion.
  // Never promote its candidates into verifiedPool or use them for ticket optimization.
  let engine2Handoff={mode:'SHADOW',candidates:[],eligibleByExactPrice:0,unvalidated:true,error:null};
  try {
    const shadowRows=arr2(await sb(env,'two45_feed_snapshots?snapshot_key=like.engine2-shadow:v1:*&select=snapshot_key,fixtureId:payload->>fixtureId,kickoffAt:payload->>kickoffAt,sourceGeneratedAt:payload->>sourceGeneratedAt,qualityHold:payload->>qualityHold,discovery:payload->discovery&order=refreshed_at.desc&limit=80',{timeoutMs:3500}));
    const seen=new Set(),compared=[];
    for(const item of shadowRows) {
      if(item.discovery?.status!=='CANDIDATES'||item.qualityHold===true||item.qualityHold==='true'||dateOfV19(item.kickoffAt)!==date)continue;
      for(const c of arr2(item.discovery.candidates)) {
        const id=String(c.fixtureId||item.fixtureId),key=id+'|'+c.market+'|'+ticketSelectionKeyV78(c.selection);
        if(seen.has(key))continue;seen.add(key);
        const quote=exactBet365QuoteV78(candidateOddsPayload,id,c.market,c.selection);
        const at=Date.parse(quote?.observedAt),now=Date.now(),kickoff=Date.parse(item.kickoffAt);
        const priceFresh=Boolean(quote&&at<=now&&now-at<=30*60000&&now<kickoff);
        const priceMatches=priceFresh; // Current exact-market Bet365 quote supersedes the stale discovery-time price.
        const currentEstimatedEV=priceFresh&&Number.isFinite(Number(c.probability))?Number(c.probability)*Number(quote.odds)-1:null;
        const anomalous=currentEstimatedEV!==null&&currentEstimatedEV>.30;
        compared.push({fixtureId:id,market:c.market,selection:c.selection,simulationProbability:c.probability,
          simulatedEV:c.estimatedEV,quotedOdds:c.odds,currentBet365Odds:quote?.odds||null,
          currentEstimatedEV,priceFresh,priceMatches,priceObservedAt:quote?.observedAt||null,providerUpdatedAt:quote?.providerUpdatedAt||quote?.updatedAt||null,publicationEligible:false,
          modelRiskFlag:anomalous?'EXTREME_MODEL_EDGE_REQUIRES_CALIBRATION':null,
          reason:!priceFresh?'NO_FRESH_EXACT_BET365_PRICE':anomalous?'EXTREME_MODEL_EDGE_REQUIRES_CALIBRATION':currentEstimatedEV<.03?'CURRENT_PRICE_NO_LONGER_VALUE':'ENGINE2_PROSPECTIVE_VALIDATION_REQUIRED'});
      }
    }
    engine2Handoff={mode:'SHADOW',candidateCount:compared.length,eligibleByExactPrice:compared.filter(x=>x.priceMatches).length,
      candidates:compared,unvalidated:true,promotionAllowed:false,error:null};
  }catch(e){engine2Handoff={mode:'SHADOW',candidateCount:0,eligibleByExactPrice:0,candidates:[],unvalidated:true,promotionAllowed:false,error:safeRefreshError(e)};}
  const engine2Live=[];
  for(const c of arr2(engine2Handoff.candidates)){
    const f=arr2(board?.games||board?.fixtures).find(g=>String(fixtureIdV19(g))===String(c.fixtureId));
    if(!f||f?.fixture?.status?.short!=='NS'||Date.parse(f?.fixture?.date)<=Date.now()||dateOfV19(f?.fixture?.date)!==date)continue;
    const tier=competitionTierV21(f?.league?.name,f?.league?.id),p=Number(c.simulationProbability),odds=Number(c.currentBet365Odds),ev=p*odds-1;
    if(tier>2||!c.priceFresh||c.modelRiskFlag||!(p>=.70&&p<.95)||!(odds>=1.18&&odds<=3.5)||!(ev>=.03&&ev<=.30))continue;
    const x={fixtureId:Number(c.fixtureId),providerMatchId:Number(c.fixtureId),home:f?.teams?.home?.name,away:f?.teams?.away?.name,league:f?.league?.name,kickoff:f?.fixture?.date,competitionTier:tier,market:c.market,selection:c.selection,probability:p,sportsbookOdds:odds,bookmaker:'Bet365',priceVerified:true,priceObservedAt:c.priceObservedAt,providerUpdatedAt:c.providerUpdatedAt,dataQuality:.75,valueEdge:p-1/odds,valueEdgePct:(p-1/odds)*100,_ticketOdds:odds,_ticketDay:'Today',decision:'PICK',engine2Experimental:true,reasons:['Experimental Engine2 simulation; uncalibrated probability and current verified Bet365 odds.']};
    x.premiumScore=ticketPremiumScoreV80(x);x._ticketScore=x.premiumScore/100;
    engine2Live.push(x);
  }
  engine2Handoff.liveCandidateCount=engine2Live.length;
  // Bound the published diagnostic payload without truncating the candidates evaluated above.
  engine2Handoff.candidates=engine2Handoff.candidates.slice(0,24);engine2Handoff.liveCandidates=engine2Live.map(x=>({fixtureId:x.fixtureId,selection:x.selection,market:x.market,odds:x.sportsbookOdds}));
  const review=await reviewModelPoolV1(env,[...pricedPool.filter(eliteLegQualityV79),...engine2Live]),verifiedPool=review.pool.filter(x=>x.modelReview?.status==='SUPPORTS' && x.modelReview?.hold===false);
  const verifiedFixtureIds = new Set(pricedPool.map(x=>String(x.fixtureId ?? x.providerMatchId)));
  const candidateCoverageReady = new Set([...verifiedFixtureIds,...engine2Live.map(x=>String(x.fixtureId))]).size>=2;
  const pipelineBase = {
    analyzed: num4(board?.analyzedCount, 0),
    headlineStrong: arr2(board?.strongPicks).length,
    strongMarketOptions: arr2(board?.premiumCandidates).length,
    engine2Handoff,
    oddsComplete,
    candidateCoverageReady,
    independentReview:review.summary,
    independentReviewPending:review.pool.filter(x=>x.modelReview?.status!=='SUPPORTS').map(x=>({fixtureId:x.fixtureId,market:x.market,selection:x.selection,status:x.modelReview?.status||'UNREVIEWED',reason:x.modelReview?.reason||'NO_REVIEW'})),
    reviewApprovedMarketCount:verifiedPool.length,
    independentReviewHolds:review.holds.map(x=>({fixtureId:x.fixtureId,market:x.market,selection:x.selection,modelReview:x.modelReview})),
    researchFixtureCount: researchFixtureIds.size,
    researchMarketCount: arr2(board?.premiumCandidates).length + arr2(board?.strongPicks).length,
    priceVerifiedMarketCount: pricedPool.length,
    qualifiedBeforeIndependentReview: pricedPool.filter(eliteLegQualityV79).length,
    independentlyHeldCount: review.holds.length,
    noPickDiagnostic: researchFixtureIds.size === 0 ? "NO_CURRENT_STRONG_RESEARCH" : pricedPool.length === 0 ? "NO_CURRENT_EXACT_BOOK_QUOTES" : pricedPool.every(x => !eliteLegQualityV79(x)) ? "ELITE_QUALITY_REJECTION" : review.holds.length && !verifiedPool.length ? "INDEPENDENT_REVIEW_HOLD" : review.pool.length && !verifiedPool.length ? "INDEPENDENT_REVIEW_INCOMPLETE" : "NO_QUALIFIED_ODDS_COMBINATION",
    pendingVerificationFixtures: [...researchFixtureIds].filter(id=>!verifiedFixtureIds.has(id)),
    exactVerifiedFixtures: new Set(verifiedPool.map(x=>String(x.fixtureId ?? x.providerMatchId))).size,
    rejections: pricedPool.map(x=>({fixtureId:x.fixtureId,market:x.market,selection:x.selection,reasons:[...eliteRejectionReasonsV2(x),...(review.holds.some(h=>String(h.fixtureId)===String(x.fixtureId)&&h.market===x.market&&h.selection===x.selection)?['INDEPENDENT_REVIEW_HOLD']:[])],probability:ticketNormV70(x.probability),verifiedOdds:x.sportsbookOdds,valueEdge:x.valueEdge,valueEdgePct:x.valueEdgePct,confidenceScore:eliteConfidenceScoreV102(x)}))
  };
  if (!candidateCoverageReady && (!oddsComplete || researchFixtureIds.size>verifiedFixtureIds.size)) {
    const payload2 = {
      ok: true,
      type: "daily",
      date,
      status: "BUILDING",
      lockedAt: null,
      immutable: false,
      revision: TICKET_LOCK_REVISION_V78,
      rebuiltForPricingIntegrity: Boolean(rebuildReason),
      rebuildReason: rebuildReason || null,
      waitingFor: researchFixtureIds.size === 0 ? "ELITE_QUALITY" : "ELITE_CANDIDATE_ODDS",
      oddsSnapshotUpdatedAt: candidateOddsPayload.updatedAt || oddsRow?.refreshed_at || null,
      ticket: null,
      candidateCount: 0,
      pipeline: { ...pipelineBase, exactVerified: pricedPool.length, eliteQualified: 0,engine2Qualified:engine2Live.length },
      rule: "Elite no longer waits for unrelated sportsbook pages. It proceeds only when at least two Tier 1/2 STRONG independent-model candidates have exact verified approved-bookmaker prices; otherwise it keeps building."
    };
    await saveFeedSnapshot(env, "ticket-lock:daily:" + date, payload2, 259200);
    return payload2;
  }
  const pool = eliteQualifiedPoolV2(verifiedPool.filter(x=>!x.engine2Experimental || (x.modelReview?.coreValidated===true && x.modelReview?.status==='SUPPORTS' && x.modelReview?.hold===false))).slice(0, 30), tier1Pool = pool.filter((x) => num4(x?.competitionTier, 4) === 1), tier1Try = ticketOptimizeV70(tier1Pool, 3, 2.8, 3.2, 2, 4, true), tier12Try = tier1Try?.targetMet ? tier1Try : ticketOptimizeV70(pool, 3, 2.8, 3.2, 2, 4, true), t = tier12Try?.targetMet ? tier12Try : null, at = (/* @__PURE__ */ new Date()).toISOString(), window = dailyPublicationWindowV2(date), publish = Boolean(t && window.allowed), b = publish ? await ticketBaselineV70(env, t.legs) : {}, payload = {
    ok: true,
    type: "daily",
    date,
    status: publish ? "LOCKED" : t ? "DRAFT" : "BUILDING",
    lockedAt: publish ? at : null,
    immutable: publish,
    publicationWindow: window,
    revision: TICKET_LOCK_REVISION_V78,
    rebuiltForPricingIntegrity: Boolean(rebuildReason),
    rebuildReason: rebuildReason || null,
    waitingFor: publish ? null : t ? "06:00_ET_REVIEW" : (review.holds.length || review.pool.length && !verifiedPool.length) ? "INDEPENDENT_REVIEW" : pool.length ? "TARGET_ODDS_COMBINATION" : "ELITE_QUALITY",
    oddsSnapshotUpdatedAt: candidateOddsPayload.updatedAt || oddsRow?.refreshed_at || null,
    ticket: publish ? lockTicketV70(t, at, b) : t ? {...t,locked:false,draftAt:at,legs:arr2(t.legs).map(x=>({...x,locked:false}))} : null,
    candidateCount: pool.length,
    pipeline: { ...pipelineBase, exactVerified: pricedPool.length, eliteQualified: pool.length,engine2Qualified:engine2Live.length,rejectedQuality: pricedPool.filter(x=>!eliteLegQualityV79(x)).length, qualifiedMarketOptions: pricedPool.filter(eliteLegQualityV79).length, targetLow: 2.8, targetHigh: 3.2, minimumLegs: 2, maximumLegs: 4, combinationFound: Boolean(t) },
    rule: "Frozen after publication. Every leg is exact verified approved-bookmaker priced. Elite can use fresh fixture-level approved-bookmaker verification without waiting for unrelated daily odds pages, evaluates every STRONG independent-model Tier 1/2 option available to the slate, prioritizes Tier 1, and never lowers the Elite quality threshold. Tier 3/4 and WATCH are forbidden. No fallback ticket is published unless the 2.80-3.20 target is genuinely met with 2-4 distinct fixtures and positive modeled edge."
  };
  await saveFeedSnapshot(env, "ticket-lock:daily:" + date, payload, 259200);
  return payload;
}
__name(buildDailyLockV70, "buildDailyLockV70");
function weekendAnchorV70() {
  const d = easternDate(), day = easternWeekday();
  if (day === "Fri")
    return datePlusDays(d, 1);
  if (day === "Sat")
    return d;
  if (day === "Sun")
    return datePlusDays(d, -1);
  return null;
}
__name(weekendAnchorV70, "weekendAnchorV70");
async function buildWeekendLockV70(env, satDate, rebuildReason = null, previousLock = null) {
  if (rebuildReason || previousLock?.revision !== TICKET_LOCK_REVISION_V78 || previousLock?.saturday !== satDate) previousLock = null;
  const sunDate = datePlusDays(satDate, 1), values = await Promise.all([ticketBoardV70(env, satDate), ticketBoardV70(env, sunDate), getFeedSnapshot(env, oddsKey(satDate)).catch(() => null), getFeedSnapshot(env, oddsKey(sunDate)).catch(() => null), getFeedSnapshot(env, "two45-learning:v82").catch(() => null)]), satBoard = values[0], sunBoard = values[1], satOddsRow = values[2], sunOddsRow = values[3], learning = values[4]?.payload || {}, rankedUnreviewed = [...ticketPoolBoardVerifiedV78(satBoard, "Sat", satOddsRow?.payload || {}, false, learning), ...ticketPoolBoardVerifiedV78(sunBoard, "Sun", sunOddsRow?.payload || {}, false, learning)].sort((a, b2) => num4(a.competitionTier, 4) - num4(b2.competitionTier, 4) || b2._ticketScore - a._ticketScore).slice(0, 24), review = await reviewModelPoolV1(env,rankedUnreviewed), ranked = review.pool.filter(x=>x.modelReview?.status==='SUPPORTS' && x.modelReview?.hold===false), dailySnaps = await Promise.all([satDate,sunDate].map(d=>getFeedSnapshot(env,"ticket-lock:daily:"+d).catch(()=>null))), reserved = new Set(dailySnaps.flatMap(s=>arr2(s?.payload?.ticket?.legs)).map((x) => String(x.fixtureId || x.providerMatchId || "")).filter(Boolean)), pool = reserved.size ? ranked.filter((x) => !reserved.has(String(x.fixtureId || x.providerMatchId || ""))) : ranked, fiveTry = ticketOptimizeV70(pool.filter(x => !new Set(["five","ten","fifty"].flatMap(k => arr2(previousLock?.tickets?.[k]?.locked ? previousLock.tickets[k].legs : []).map(l => String(l.fixtureId || l.providerMatchId)))).has(String(x.fixtureId || x.providerMatchId))), 5, 4.75, 5.5, 2, 5, true), five = previousLock?.tickets?.five?.locked ? previousLock.tickets.five : fiveTry?.targetMet ? fiveTry : null, fiveIds = new Set(arr2(five?.legs).map(x => String(x.fixtureId || x.providerMatchId))), tenPool = pool.filter(x => !fiveIds.has(String(x.fixtureId || x.providerMatchId)) && !arr2(previousLock?.tickets?.fifty?.locked ? previousLock.tickets.fifty.legs : []).some(l => String(l.fixtureId || l.providerMatchId) === String(x.fixtureId || x.providerMatchId))), tenTry = ticketOptimizeV70(tenPool, 10, 9, 11, 3, 7, true), ten = previousLock?.tickets?.ten?.locked ? previousLock.tickets.ten : tenTry?.targetMet ? tenTry : null, usedIds = new Set([...arr2(five?.legs),...arr2(ten?.legs)].map(x => String(x.fixtureId || x.providerMatchId))), fiftyTry = ticketOptimizeV70(pool.filter(x => !usedIds.has(String(x.fixtureId || x.providerMatchId))), 50, 45, 55, 4, 9, true), fifty = previousLock?.tickets?.fifty?.locked ? previousLock.tickets.fifty : fiftyTry?.targetMet ? fiftyTry : null, weekendReady = Boolean(five && ten && fifty), at = (/* @__PURE__ */ new Date()).toISOString(), b = await ticketBaselineV70(env, [...arr2(five?.legs), ...arr2(ten?.legs), ...arr2(fifty?.legs)]), payload = { ok: true, type: "weekend", saturday: satDate, sunday: sunDate, status: weekendReady ? "LOCKED" : "BUILDING", lockedAt: weekendReady ? at : null, immutable: weekendReady, revision: TICKET_LOCK_REVISION_V78, rebuiltForPricingIntegrity: Boolean(rebuildReason), rebuiltForOneDayOverride: rebuildReason === "one-day-weekend-reset" || Boolean(previousLock?.rebuiltForOneDayOverride), rebuildReason: rebuildReason || null, saturdayOddsSnapshotUpdatedAt: satOddsRow?.payload?.updatedAt || satOddsRow?.refreshed_at || null, sundayOddsSnapshotUpdatedAt: sunOddsRow?.payload?.updatedAt || sunOddsRow?.refreshed_at || null, tickets: { five: lockTicketV70(five, at, b), ten: lockTicketV70(ten, at, b), fifty: lockTicketV70(fifty, at, b) }, candidateCount: pool.length, independentReview:review.summary, independentReviewHolds:review.holds, eliteReservedCount: reserved.size, rule: "Saturday and Sunday legs freeze together. Every leg is exact-tuple Bet365 verified and cross-checked against DraftKings/FanDuel when available; Elite fixtures are never reused by Weekend Ladder." };
  // A published rung is immutable even while the other targets keep building.
  if (!rebuildReason && previousLock?.revision === TICKET_LOCK_REVISION_V78 && previousLock?.saturday === satDate) {
    for (const rung of ["five", "ten", "fifty"]) {
      const previous = previousLock.tickets?.[rung];
      if (previous?.locked && previous?.targetMet && previous?.legs?.length) payload.tickets[rung] = previous;
    }
  }
  const lockedRungs = Object.values(payload.tickets).filter(Boolean);
  payload.status = lockedRungs.length === 3 ? "LOCKED" : lockedRungs.length ? "PARTIAL" : "BUILDING";
  payload.lockedAt = lockedRungs.length === 3 ? previousLock?.lockedAt || at : null;
  payload.immutable = lockedRungs.length === 3;
  payload.rule = "Each qualified rung freezes independently; missing targets keep building. Every leg is exact-tuple Bet365 verified and cross-checked against DraftKings/FanDuel when available; Elite fixtures are never reused by Weekend Ladder.";
  await saveFeedSnapshot(env, "ticket-lock:weekend:" + satDate, payload, 432e3);
  return payload;
}
__name(buildWeekendLockV70, "buildWeekendLockV70");
function activeDailyTicketDateV93() {
  const date = easternDate();
  return shouldPreloadTomorrow() ? datePlusDays(date, 1) : date;
}
__name(activeDailyTicketDateV93, "activeDailyTicketDateV93");
async function ensureTicketLocksV70(env) {
  const hour = easternHour(), date = activeDailyTicketDateV93();
  let d = await getFeedSnapshot(env, "ticket-lock:daily:" + date).catch(() => null);
  const dailyStale = Boolean(d?.payload && d.payload.revision !== TICKET_LOCK_REVISION_V78);
  if (!d || dailyStale || d?.payload?.status !== "LOCKED") {
    if (dailyStale && d?.payload?.status === "LOCKED")
      await archiveTicketLockV78(env, "daily", date, d);
    d = { payload: await buildDailyLockV70(env, date, dailyStale ? "quality-revision" : null) };
  }
  const sat = weekendAnchorV70(), day = easternWeekday();
  let w = sat ? await getFeedSnapshot(env, "ticket-lock:weekend:" + sat).catch(() => null) : null;
  const weekendStale = Boolean(w?.payload && w.payload.revision !== TICKET_LOCK_REVISION_V78);
  const weekendOneDayReset = false; // The dated reset has completed; never replay it on retained locks.
  if (sat && (day === "Sat" || day === "Sun") && (!w || weekendStale || weekendOneDayReset || w?.payload?.status !== "LOCKED")) {
    if ((weekendStale || weekendOneDayReset) && w?.payload?.tickets)
      await archiveTicketLockV78(env, "weekend", sat, w);
    const weekendReason = weekendOneDayReset ? "one-day-weekend-reset" : weekendStale ? "quality-revision" : null;
    w = { payload: await buildWeekendLockV70(env, sat, weekendReason, weekendReason ? null : w?.payload) };
  }
  return { daily: d?.payload || null, weekend: w?.payload || null };
}
__name(ensureTicketLocksV70, "ensureTicketLocksV70");
async function alertsForLockV70(env, lock) {
  const tickets = [];
  if (lock?.ticket)
    tickets.push(lock.ticket);
  if (lock?.tickets)
    tickets.push(...Object.values(lock.tickets).filter(Boolean));
  const seen = /* @__PURE__ */ new Set(), alerts = [];
  for (const t of tickets)
    for (const leg of arr2(t?.legs)) {
      const id = String(leg.fixtureId || leg.providerMatchId || "");
      if (!id || seen.has(id))
        continue;
      seen.add(id);
      const s = await getFeedSnapshot(env, "match-intelligence:" + id).catch(() => null), p = s?.payload || {}, base = leg.lockIntel || {};
      if (!p.generatedAt || Date.parse(p.generatedAt) <= Date.parse(leg.lockedAt || 0))
        continue;
      const hd = num4(p.homeAbsences, 0) - num4(base.homeAbsences, 0), ad = num4(p.awayAbsences, 0) - num4(base.awayAbsences, 0);
      if (hd || ad)
        alerts.push({ fixtureId: id, home: leg.home, away: leg.away, severity: hd > 0 || ad > 0 ? "HIGH_IMPACT" : "WATCH", type: "AVAILABILITY_CHANGE", message: "Player availability changed after lock. The original selection remains unchanged.", updatedAt: p.generatedAt });
      if (p.lineupsConfirmed && !base.lineupsConfirmed)
        alerts.push({ fixtureId: id, home: leg.home, away: leg.away, severity: "INFO", type: "LINEUP_CONFIRMED", message: "Confirmed lineups are available. The locked ticket remains unchanged.", updatedAt: p.generatedAt });
    }
  return alerts;
}
__name(alertsForLockV70, "alertsForLockV70");
async function ticketLocksResponseV70(env) {
  const locks = await ensureTicketLocksV70(env), alerts = [...await alertsForLockV70(env, locks.daily), ...await alertsForLockV70(env, locks.weekend)];
  return { ok: true, lockHour: "06:00 America/New_York", immutableAfterLock: true, pricingVerificationRevision: TICKET_LOCK_REVISION_V78, daily: locks.daily || { status: "BUILDING", date: activeDailyTicketDateV93(), locksAt: "Slate verification in progress" }, weekend: locks.weekend || { status: "BUILDING", saturday: weekendAnchorV70(), locksAt: "Saturday 06:00 America/New_York" }, alerts };
}
__name(ticketLocksResponseV70, "ticketLocksResponseV70");
async function scheduledAnalysisV2(event, env) {
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  providerBurstV69 = { id: startedAt, calls: 0, maxCalls: PROVIDER_BURST_MAX_CALLS_V69 };
  const result = {
    ok: true,
    version: WORKER_VERSION,
    pacingRevision: PACING_REVISION,
    engine: "analysis-engine-v2",
    cron: event?.cron || "* * * * *",
    startedAt,
    model: null,
    watchdog: null,
    maintenance: []
  };
  await saveFeedSnapshot(env, "cron-status", {
    status: "starting",
    cron: result.cron,
    startedAt,
    heartbeatAt: startedAt,
    result
  }, 1800).catch(() => null);
  result.watchdog = await runAnalysisWatchdogV2(env);
  result.goalHistoryBackfill = await backfillGoalHistoryV120(env).catch(e=>({ok:false,error:safeRefreshError(e)}));
  result.forecastCoreTraining = await refreshGoalCoreV3(env);
  result.forecastCoreSweep = await runGoalCoreSweepV3(env);
  result.engine2Shadow = { ok: true, status: "DISABLED", reason: "CHATGPT_ANALYST_V1_PILOT" };
  result.engine2Settlement = { ok: true, status: "DISABLED", reason: "CHATGPT_ANALYST_V1_PILOT" };
  // Single-fixture guarded live smoke test: one billable attempt, never publish.
  if (shouldPreloadTomorrow()) {
    const pilotDate=tomorrowEasternDate();
    const pilotKey="chatgpt-analyst:pilot-attempt:v3:"+pilotDate;
    const attempted=await getFeedSnapshot(env,pilotKey).catch(()=>null);
    if (!attempted) {
      await saveFeedSnapshot(env,pilotKey,{startedAt:new Date().toISOString(),fixtureId:1565507,status:"ATTEMPTED"},86400).catch(()=>null);
      try {
        result.chatgptPilot=await timedV2(runChatGPTAnalystPilotV1(env,1565507,pilotDate),27000,"ChatGPT Analyst pilot");
      } catch (e) {
        result.chatgptPilot={ok:false,error:safeRefreshError(e)};
      }
      await saveFeedSnapshot(env,pilotKey,{completedAt:new Date().toISOString(),result:result.chatgptPilot},86400).catch(()=>null);
    } else result.chatgptPilot={ok:true,skipped:true,reason:"Already attempted once today"};
  }

  // V115 egress guard: learning is settlement-driven below (every 15 minutes).
  // Running it every minute re-downloaded up to 1,000 full forecast rows, including
  // large JSON analysis fields, without improving model freshness.
  result.learning = { ok: true, deferred: true, cadence: "settlement-15m" };
  try {
    result.ticketLocks = await ensureTicketLocksV70(env);
  } catch (e) {
    result.maintenance.push({ ok: false, stage: "ticket-lock", error: safeRefreshError(e) });
  }
  await saveFeedSnapshot(env, "cron-status", {
    status: "running",
    cron: result.cron,
    startedAt,
    heartbeatAt: startedAt,
    result
  }, 1800).catch(() => null);
  if (shouldPreloadTomorrow()) {
    try {
      result.tomorrowPreload = await timedV2(
        ensureTomorrowPreloadV49(env),
        18e3,
        "tomorrow preload"
      );
    } catch (e) {
      result.ok = false;
      result.tomorrowPreload = { ok: false, error: safeRefreshError(e) };
    }
  }
  const minute = (/* @__PURE__ */ new Date()).getUTCMinutes();
  const oddsRepairActive = await oddsRepairActiveV68(env).catch(() => false);
  const oddsRepairFirst = oddsRepairActive && minute % 2 === 0;
  if (oddsRepairFirst) {
    try {
      result.maintenance.push(await timedV2(
        refreshOneFeed(env, false),
        22e3,
        "priority odds repair"
      ));
    } catch (e) {
      result.maintenance.push({ ok: false, stage: "priority-odds-repair", error: safeRefreshError(e) });
    }
  }
  try {
    result.model = await timedV2(
      processJobs(env, DEFAULT_MODEL_BATCH, null, true),
      19e3,
      "analysis pass"
    );
  } catch (e) {
    result.ok = false;
    result.model = {
      ok: false,
      claimed: 0,
      processed: 0,
      error: safeRefreshError(e)
    };
  }
  const modelStageAt = (/* @__PURE__ */ new Date()).toISOString();
  await saveFeedSnapshot(env, "cron-status", {
    status: result.model?.ok ? "model-complete" : "model-partial",
    cron: result.cron,
    startedAt,
    heartbeatAt: modelStageAt,
    modelCompletedAt: modelStageAt,
    result
  }, 1800).catch(() => null);
  const pendingBacklogNow = num4(result.watchdog?.pending) > 0 || num4(result.model?.freshBaselineBacklog) > 0;
  if (!pendingBacklogNow) {
    try {
      const boardDates = shouldPreloadTomorrow() ? [tomorrowEasternDate(), easternDate()] : [easternDate()];
      for (const boardDate of boardDates) {
        result.maintenance.push(await timedV2(
          evaluateBoardV19(env, boardDate, true),
          4e3,
          "light board refresh " + boardDate
        ));
      }
    } catch (e) {
      result.maintenance.push({
        ok: false,
        stage: "light-board-refresh",
        error: safeRefreshError(e)
      });
    }
  }
  if (!pendingBacklogNow) {
    try {
      const eliteDates = shouldPreloadTomorrow() ? [tomorrowEasternDate(), easternDate()] : [easternDate()];
      for (const eliteDate of eliteDates) {
        const summary = await timedV2(
          eliteIntelligenceSnapshotV86(env, eliteDate, true),
          5e3,
          "Elite intelligence review " + eliteDate
        );
        result.maintenance.push({
          ok: true,
          stage: "elite-intelligence",
          date: eliteDate,
          slateComplete: Boolean(summary?.slateComplete),
          fixturesTotal: num4(summary?.fixturesTotal),
          analyzed: num4(summary?.analyzed),
          remaining: num4(summary?.remaining),
          researchEligible: num4(summary?.researchEligible)
        });
      }
    } catch (e) {
      result.maintenance.push({ ok: false, stage: "elite-intelligence", error: safeRefreshError(e) });
    }
  }
  const modelCompletedAt = (/* @__PURE__ */ new Date()).toISOString();
  await saveFeedSnapshot(env, "cron-status", {
    status: result.ok ? "analysis-complete" : "analysis-partial",
    cron: result.cron,
    startedAt,
    completedAt: modelCompletedAt,
    heartbeatAt: modelCompletedAt,
    result
  }, 1800).catch(() => null);
  const pendingBacklog = pendingBacklogNow;
  let scoreStateRefreshed = false;
  if (minute % 5 === 0) {
    try {
      const scoreState = await timedV2(
        refreshTodayScoreStateV66(env),
        12e3,
        "five-minute Today score refresh"
      );
      result.maintenance.push(scoreState);
      scoreStateRefreshed = Boolean(scoreState && !scoreState.skipped);
    } catch (e) {
      result.maintenance.push({ ok: false, stage: "today-score-refresh", error: safeRefreshError(e) });
    }
  }
  const currentOddsSnapshot = await getFeedSnapshot(
    env,
    oddsKey(easternDate())
  ).catch(() => null);
  const currentOddsEmpty = !currentOddsSnapshot || !arr2(currentOddsSnapshot?.payload?.response).length || num4(currentOddsSnapshot?.payload?.total, 0) <= 0;
  const repairStillActive = await oddsRepairActiveV68(env).catch(() => currentOddsEmpty);
  if (!oddsRepairFirst && !scoreStateRefreshed && (repairStillActive || minute % 5 === 0)) {
    try {
      result.maintenance.push(await timedV2(
        refreshOneFeed(env, false),
        22e3,
        "feed refresh"
      ));
    } catch (e) {
      result.maintenance.push({ ok: false, stage: "feed", error: safeRefreshError(e) });
    }
  }
  if (minute % 15 === 0) {
    try {
      const carryover = await timedV2(
        refreshCarryoverV19(env),
        1e4,
        "settlement carryover refresh"
      );
      if (carryover)
        result.maintenance.push(carryover);
    } catch (e) {
      result.maintenance.push({ ok: false, stage: "settlement-carryover", error: safeRefreshError(e) });
    }
    try {
      result.settled = await timedV2(settle(env), 1e4, "settlement");
    } catch (e) {
      result.maintenance.push({ ok: false, stage: "settlement", error: safeRefreshError(e) });
    }
    if (!pendingBacklog) {
      try {
        result.shadowBacktest = await timedV2(
          settleShadowBacktestV44(env, 1),
          12e3,
          "shadow backtest settlement"
        );
      } catch (e) {
        result.maintenance.push({ ok: false, stage: "shadow-backtest", error: safeRefreshError(e) });
      }
    }
  }
  { // Research checks its own cadence, including the first run after deployment.
    try { result.playerResearch = await runPlayerResearchV1(env,{productionBacklog:result.model?.ok!==true||num4(result.model?.freshBaselineBacklog)>0||num4(result.model?.freshTomorrowBacklog)>0||Boolean(result.model?.claimStarved)}); }
    catch(e) { result.playerResearch = {ok:false,error:safeRefreshError(e)}; }
  }
  { // Validation checks its own six-hour cadence and runs on initial deployment.
    try { result.modelValidation = await runModelValidationV1(env); }
    catch(e) { result.modelValidation = {ok:false,error:safeRefreshError(e)}; }
  }
  try { result.matchHistory = await runMatchHistoryCollectionV1(env,{productionBacklog:result.model?.ok!==true||num4(result.model?.freshBaselineBacklog)>0||num4(result.model?.freshTomorrowBacklog)>0||Boolean(result.model?.claimStarved)}); }
  catch(e) { result.matchHistory = {ok:false,error:safeRefreshError(e)}; }
  try { result.matchEvidence = await runMatchEvidenceSweepV1(env); }
  catch(e) { result.matchEvidence = {ok:false,error:safeRefreshError(e)}; }
  result.providerBurst = { calls: providerBurstV69?.calls || 0, maxCalls: PROVIDER_BURST_MAX_CALLS_V69 };
  providerBurstV69 = null;
  return result;
}
__name(scheduledAnalysisV2, "scheduledAnalysisV2");
// BEGIN GENERATED VALIDATION ROUTINE V1
var shadowEvaluationV1 = (()=>{
const {canonical,scoreRows}=selectionV2;

function grade(m,s,h,a) {
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
function blockIntervals(rows,replicates=1500) {
 const days=[...new Set(rows.map(r=>r.date))].sort(),groups=days.map(d=>rows.filter(r=>r.date===d));
 if(days.length<2)return {days:days.length,roi95:null,brierVsLegacy95:null,logLossVsLegacy95:null};
 let seed=7331;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const values={roi:[],brierVsLegacy:[],logLossVsLegacy:[]};
 const loss=(p,y)=>-y*Math.log(Math.max(.001,p))-(1-y)*Math.log(Math.max(.001,1-p));
 for(let i=0;i<replicates;i++) {
  const sample=days.flatMap(()=>groups[Math.floor(rand()*groups.length)]),priced=sample.filter(r=>r.odds>1),paired=sample.filter(r=>r.legacyProbability>0&&r.legacyProbability<1);
  if(priced.length)values.roi.push(priced.reduce((n,r)=>n+(r.outcome==='WIN'?r.odds-1:-1),0)/priced.length);
  if(paired.length) {
   values.brierVsLegacy.push(paired.reduce((n,r)=>n+(r.probability-r.y)**2-(r.legacyProbability-r.y)**2,0)/paired.length);
   values.logLossVsLegacy.push(paired.reduce((n,r)=>n+loss(r.probability,r.y)-loss(r.legacyProbability,r.y),0)/paired.length);
  }
 }
 const interval=a=>{a.sort((a,b)=>a-b);return a.length?[a[Math.floor(a.length*.025)],a[Math.floor(a.length*.975)]]:null;};
 return {days:days.length,replicates,seed:7331,roi95:interval(values.roi),brierVsLegacy95:interval(values.brierVsLegacy),logLossVsLegacy95:interval(values.logLossVsLegacy)};
}
function evaluate(rows,{protocol=null}={}) {
 const inputRows=rows.length;
 if(protocol)rows=rows.filter(r=>r.payload?.validationProtocol===protocol);
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
   if(outcome)selected.push({...c,date:r.kickoff_at.slice(0,10),y:+(outcome==='WIN'),legacyProbability:p.legacy?.probabilities?.[c.market]?.[c.selection]??null,outcome,sportsbook_odds:c.odds,fixture_id:r.fixture_id});
  }
  const decision=p.legacyResearchDecision;
  const b=p.candidates?.find(c=>c.market===decision?.market&&c.selection===canonical(decision?.selection));
  if(decision?.decision==='PICK'&&b?.odds>1) {
   const outcome=grade(b.market,b.selection,r.final_home_score,r.final_away_score);
   if(outcome)legacy.push({...b,rawProbability:p.legacy?.probabilities?.[b.market]?.[b.selection]??b.rawProbability,outcome,sportsbook_odds:b.odds,fixture_id:r.fixture_id});
  }
 }
 const paired=selected.filter(c=>['WIN','LOSS'].includes(c.outcome)&&c.marketProbability>0&&c.marketProbability<1);
 const candidate=scoreRows(selected,c=>c.probability),rawOnSameSelections=scoreRows(paired,c=>c.rawProbability),market=scoreRows(paired,c=>c.marketProbability);
 const calibratedOnPaired=scoreRows(paired,c=>c.probability),baseline=scoreRows(legacy,c=>c.rawProbability);
 const reasons=[];
 const settled=selected.filter(c=>['WIN','LOSS'].includes(c.outcome)),intervals=blockIntervals(settled);
 const sameLegacy=paired.filter(c=>c.legacyProbability>0&&c.legacyProbability<1);
 const legacyScores=scoreRows(sameLegacy,c=>c.legacyProbability),candidateScores=scoreRows(sameLegacy,c=>c.probability);
 if(intervals.days<14)reasons.push('NEED_14_SETTLED_FIXTURE_DAYS');
 if(!(intervals.roi95?.[0]>0))reasons.push('POSITIVE_ROI_CONFIDENCE_NOT_ESTABLISHED');
 if(!(intervals.brierVsLegacy95?.[1]<0&&intervals.logLossVsLegacy95?.[1]<0))reasons.push('PAIRED_LEGACY_IMPROVEMENT_NOT_ESTABLISHED');
 if(sameLegacy.length!==paired.length)reasons.push('INCOMPLETE_PAIRED_LEGACY_BENCHMARK');
 if(!(candidateScores.brier<legacyScores.brier&&candidateScores.logLoss<legacyScores.logLoss))reasons.push('PAIRED_SCORES_NOT_BETTER_THAN_LEGACY');
 const byMarket=Object.fromEntries([...new Set(settled.map(x=>x.market))].map(m=>[m,scoreRows(settled.filter(x=>x.market===m),c=>c.probability)]));
 if(!Object.keys(byMarket).length||Object.values(byMarket).some(m=>m.n<60))reasons.push('NEED_60_SETTLED_SELECTIONS_PER_PUBLISHED_MARKET');
 if(!protocol)reasons.push('EXPLICIT_FROZEN_PROTOCOL_REQUIRED');
 if(candidate.n<200)reasons.push('NEED_200_SETTLED_PROSPECTIVE_SELECTIONS');
 if(paired.length!==selected.filter(c=>['WIN','LOSS'].includes(c.outcome)).length)reasons.push('INCOMPLETE_SAME_LINE_MARKET_BENCHMARK');
 if(!(candidate.roi>0&&candidate.roi>baseline.roi))reasons.push('ROI_NOT_ABOVE_ZERO_AND_LEGACY');
 if(!(calibratedOnPaired.brier<rawOnSameSelections.brier&&calibratedOnPaired.brier<market.brier&&calibratedOnPaired.logLoss<rawOnSameSelections.logLoss&&calibratedOnPaired.logLoss<market.logLoss))reasons.push('PROPER_SCORES_NOT_BETTER_THAN_BOTH_BASELINES');
 reasons.push('REQUIRE_FROZEN_HOLDOUT_AND_FIXTURE_DAY_BLOCK_CONFIDENCE_INTERVAL_REVIEW');
 return {snapshotRule:'Latest snapshot at least one hour before kickoff; one primary per fixture',protocol,inputRows,protocolRows:rows.length,fixtures:frozen.size,roiScope:'Flat one-unit single-selection returns at frozen exact Bet365 quotes; not published ticket ROI',candidate,baseline,legacyOnSameSelections:legacyScores,candidateOnLegacyPaired:candidateScores,rawOnSameSelections,calibratedOnPaired,market,paired:paired.length,intervals,byMarket,promotion:{allowed:false,reasons}};
}

return {evaluate};
})();
async function runModelValidationV1(env) {
  const now=Date.now(),asOf=new Date(now).toISOString(),key='model-validation-v1:status';
  const previous=(await getFeedSnapshot(env,key).catch(()=>null))?.payload;
  if(now-Date.parse(previous?.asOf)<6*3600000)return {skipped:true,reason:'VALIDATION_6H_CADENCE'};
  const rows=[];let truncated=false;
  for(let offset=0;offset<5000;offset+=500) {
    const page=arr2(await sb(env,'two45_goal_forecasts_v3?generated_at=gte.2026-10-18T00:00:00Z&generated_at=lte.'+encodeURIComponent(asOf)+'&select=id,fixture_id,generated_at,kickoff_at,primary:payload->primary,candidates:payload->candidates,legacy:payload->legacy,protocol:payload->>validationProtocol&order=generated_at.asc,id.asc&limit=500&offset='+offset,{timeoutMs:4000}));
    // Retain only the exact legacy comparison candidate, not every board market.
    for(const r of page) {
      const d=r.legacy?.decision;
      r.candidates=arr2(r.candidates).filter(c=>c.market===d?.market&&selectionV2.canonical(c.selection)===selectionV2.canonical(d?.selection)).slice(0,1);
      rows.push(r);
    }
    if(page.length<500)break;if(offset===4500)truncated=true;
  }
  const frozen=new Map();
  for(const r of rows)if(r.protocol===MIGRATION_PROTOCOL_V2&&Date.parse(r.generated_at)<=Date.parse(r.kickoff_at)-3600000){const old=frozen.get(String(r.fixture_id));if(!old||Date.parse(old.generated_at)<Date.parse(r.generated_at))frozen.set(String(r.fixture_id),r);}
  const ids=[...frozen.keys()].filter(x=>/^\d+$/.test(x)),results=[],conflicts=[];
  for(let i=0;i<ids.length;i+=100) {
    const group=ids.slice(i,i+100).join(',');
    const [r,c]=await Promise.all([
      sb(env,'two45_goal_results_v3?fixture_id=in.('+group+')&result_available_at=lte.'+encodeURIComponent(asOf)+'&select=fixture_id,home_goals,away_goals',{timeoutMs:4000}),
      sb(env,'two45_goal_result_conflicts_v3?fixture_id=in.('+group+')&observed_at=lte.'+encodeURIComponent(asOf)+'&select=fixture_id',{timeoutMs:4000})]);
    results.push(...arr2(r));conflicts.push(...arr2(c));
  }
  const labels=new Map(results.map(r=>[String(r.fixture_id),r])),ambiguous=new Set(conflicts.map(r=>String(r.fixture_id)));
  const input=[...frozen.values()].map(r=>{const label=ambiguous.has(String(r.fixture_id))?null:labels.get(String(r.fixture_id));return {...r,final_home_score:label?.home_goals,final_away_score:label?.away_goals,payload:{validationProtocol:r.protocol,primary:r.primary,candidates:r.candidates,legacy:r.legacy,legacyResearchDecision:r.legacy?.decision}};});
  const report=shadowEvaluationV1.evaluate(input,{protocol:MIGRATION_PROTOCOL_V2});
  if(truncated)report.promotion.reasons.push('BOUNDED_EXPORT_TRUNCATED_FULL_REPLAY_REQUIRED');
  report.promotion.reasons.push('HISTORICAL_PAIRED_BRIER_AND_LOG_LOSS_FAILED','PUBLIC_RECORD_RESULT_SOURCE_REQUIRES_CUTOVER');
  const status={version:'two45-validation-routine-v1',asOf,ok:true,mode:'RESEARCH_ONLY',promotionAllowed:false,inputRows:rows.length,truncated,
    frozenFixtures:frozen.size,pendingLabels:input.filter(r=>r.final_home_score==null).length,excludedConflicts:ambiguous.size,report};
  await archivePlayerResearchV1(env,'model-validation-v1:report:'+asOf,status);
  await saveFeedSnapshot(env,key,status,365*86400);return status;
}

// END GENERATED VALIDATION ROUTINE V1

async function runChatGPTAnalystPilotV1(env, fixtureId, date) {
  if (!env.OPENAI_API_KEY) return {ok:false,error:"OPENAI_API_KEY missing"};
  const fixtureRow = await getFeedSnapshot(env,"fixtures:"+date);
  const oddsRow = await getFeedSnapshot(env,"odds:"+date);
  const fixtures = Array.isArray(fixtureRow?.payload?.fixtures) ? fixtureRow.payload.fixtures : [];
  const odds = Array.isArray(oddsRow?.payload?.response) ? oddsRow.payload.response : [];
  const fixture = fixtures.find(f=>Number(f.fixture?.id)===Number(fixtureId));
  const oddsFixture = odds.find(o=>Number(o.fixture?.id)===Number(fixtureId));
  if (!fixture || !oddsFixture) return {ok:false,error:"Fixture or odds snapshot unavailable",fixtureId,date};
  if (fixture.fixture?.status?.short !== "NS" || Date.parse(fixture.fixture?.date) <= Date.now()) return {ok:false,error:"Fixture already started",fixtureId,date};
  const quotes = [];
  for (const b of (oddsFixture.bookmakers||[])) {
    if (String(b.name).toLowerCase() !== "bet365") continue;
    for (const bet of (b.bets||[])) {
      if (!["Match Winner","Goals Over/Under","Both Teams Score","Double Chance"].includes(bet.name)) continue;
      for (const v of (bet.values||[])) {
        const price=Number(v.odd);
        if (Number.isFinite(price) && price>=1.10 && price<=12) quotes.push({market:bet.name,selection:v.value,odds:price,bookmaker:"Bet365"});
      }
    }
  }
  if (!quotes.length) return {ok:false,error:"No exact Bet365 markets",fixtureId,date};
  const prompt=JSON.stringify({fixtureId:Number(fixtureId),date,home:fixture.teams?.home?.name,away:fixture.teams?.away?.name,league:fixture.league?.name,kickoff:fixture.fixture?.date,quotes:quotes.slice(0,100)});
  const response=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",headers:{"Authorization":"Bearer "+env.OPENAI_API_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({model:"gpt-5-nano",store:false,max_output_tokens:3000,reasoning:{effort:"minimal"},text:{format:{type:"json_object"}},input:[
      {role:"system",content:"Analyze this football fixture using only supplied evidence and Bet365 snapshot odds. Never invent facts, injury news, statistics or markets. If no sufficient evidence, recommend null. Return only a JSON object with keys fixtureId, recommendation (object with market, selection, odds or null), confidence (0-100), reasoning (string). No markdown."},
      {role:"user",content:prompt}
    ]}),signal:AbortSignal.timeout(25000)
  });
  if (!response.ok) return {ok:false,error:"OpenAI HTTP "+response.status,fixtureId,date};
  const raw=await response.json();
  const output=(raw.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("");
  let draft;
  try { draft=JSON.parse(output); } catch {return {ok:false,error:"Model response was not JSON",fixtureId,date,usage:raw.usage||null};}
  const pick=draft.recommendation;
  const match=pick&&quotes.find(q=>q.market===pick.market&&q.selection===pick.selection&&Number(q.odds)===Number(pick.odds));
  const verified=pick===null || Boolean(match);
  const publishable=Boolean(match) && Number(draft.confidence)>=65 && Number(draft.confidence)<=100 && typeof draft.reasoning==="string" && draft.reasoning.trim().length>=25 && Number(draft.fixtureId)===Number(fixtureId);
  const result={ok:verified,fixtureId:Number(fixtureId),date,model:"gpt-5-nano",status:publishable?"PUBLISHED":verified?"NO_SELECTION":"REJECTED",draft:verified?draft:null,usage:raw.usage||null,quoteVerified:Boolean(match),published:publishable,analyzedAt:new Date().toISOString()};
  await saveFeedSnapshot(env,"chatgpt-analyst:"+date+":"+fixtureId,result,86400);
  if (publishable) await saveFeedSnapshot(env,"chatgpt-published:"+date+":"+fixtureId,{...result,quote:match},86400);
  return result;
}

var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(
      request.url
    );
    if (request.method === "OPTIONS") {
      return new Response(
        null,
        {
          status: 204,
          headers: corsHeaders()
        }
      );
    }
    try {
      if (url.pathname === "/") {
        return json({
          ok: true,
          service: "two45-live-worker",
          forecastCoreVersion: forecastCoreV3.CORE_VERSION,
          forecastCoreMode: "SHADOW",
          selectionVersion: selectionV2.VERSION,
          selectionMode: "SHADOW",
          recordScope: "official-publication-ledger-v2",
          version: WORKER_VERSION,
          modelVersion: MODEL_VERSION,
          modelLoaded: true
        });
      }
      if (url.pathname === "/api/match-history-status") {
        return json({ok:true,createsPicks:false,status:(await getFeedSnapshot(env,"match-history-v1:status"))?.payload||null});
      }
      if (url.pathname === "/api/external-intelligence-health" && request.method === "GET") {
        // Read-only, bounded source coverage. This never runs collection or alters picks.
        let rows=[];
        try {
          rows=arr2(await sb(env,'two45_fixture_evidence?select=fixture_id,source_name,evidence_type,captured_at,expires_at,status&order=captured_at.desc&limit=500',{timeoutMs:3000}));
        }catch(_error){
          return json({ok:false,status:"SOURCE_AUDIT_UNAVAILABLE",truncated:false,modelInfluence:false},503);
        }
        const now=Date.now(),active=rows.filter(r=>r.status==='ACTIVE'&&Number.isFinite(Date.parse(r.captured_at))&&Date.parse(r.captured_at)<=now&&Number.isFinite(Date.parse(r.expires_at))&&Date.parse(r.expires_at)>now);
        const fixtures=new Set(active.map(r=>String(r.fixture_id))),sources=[...new Set(active.map(r=>String(r.source_name||'Unknown')))].sort();
        return json({ok:true,status:active.length?'FRESH_EVIDENCE_PRESENT':'NO_FRESH_EVIDENCE',modelInfluence:false,scanned:rows.length,truncated:rows.length===500,freshRecords:active.length,staleOrUnusableRecords:rows.length-active.length,fixturesWithFreshEvidence:fixtures.size,activeSources:sources,latestCapturedAt:rows[0]?.captured_at||null,automatedExternalCollection:false,commercialPermissionsVerified:false,approvedExternalForecastFeeds:0});
      }
      if (url.pathname === "/api/match-evidence" && request.method === "GET") {
        const id=Number(url.searchParams.get("fixtureId"));
        if(!Number.isSafeInteger(id)||id<=0)return json({ok:false,error:"A valid fixture is required"},400);
        const evidence=await getMatchEvidenceV1(env,id);
        if(!evidence)return json({ok:false,evidence:null,createsPicks:false},404);
        // Separate source provenance from the independent forecasting output.
        // Never inject third-party notes into model probabilities, eligibility, or settlement.
        let externalReview={status:"UNAVAILABLE",usedByModel:false,records:[],expiredCount:0};
        try {
          const sourceRows=arr2(await sb(env,'two45_fixture_evidence?fixture_id=eq.'+id+'&select=evidence_type,source_name,fact_text,captured_at,expires_at,effective_at,status&order=captured_at.desc&limit=30',{timeoutMs:3000}));
          const t=Date.now();
          const fresh=sourceRows.filter(row=>row.status==='ACTIVE'&&Number.isFinite(Date.parse(row.captured_at))&&Date.parse(row.captured_at)<=t&&Number.isFinite(Date.parse(row.expires_at))&&Date.parse(row.expires_at)>t&&(!row.effective_at||Date.parse(row.effective_at)<=t));
          externalReview={status:fresh.length?"FRESH_RESEARCH":"NO_FRESH_RESEARCH",usedByModel:false,records:fresh.slice(0,8).map(row=>({type:row.evidence_type,source:row.source_name,note:String(row.fact_text||"").slice(0,300),capturedAt:row.captured_at,expiresAt:row.expires_at})),expiredCount:sourceRows.length-fresh.length};
        }catch(_error){externalReview={status:"UNAVAILABLE",usedByModel:false,records:[],expiredCount:0};}
        return json({ok:true,evidence:{...evidence,externalReview},createsPicks:false},200);
      }
      if (url.pathname === "/api/model-validation") {
        return json({ok:true,promotionAllowed:false,status:(await getFeedSnapshot(env,"model-validation-v1:status"))?.payload||null});
      }
      if (url.pathname === "/api/player-research") {
        return json({ok:true,mode:"RESEARCH_ONLY",promotionAllowed:false,status:(await getFeedSnapshot(env,"player-research-v1:status"))?.payload||null});
      }
      if (url.pathname === "/api/health/forecast-core") {
        return json({ok:true,status:await sb(env,"rpc/two45_goal_status_v3",{method:"POST",body:"{}"}),training:(await getFeedSnapshot(env,"forecast-core-v3:training-status").catch(()=>null))?.payload||null});
      }
      if (url.pathname === "/api/model-migration") {
        return json({ok:true,...modelMigrationStatusV2()});
      }
      if (url.pathname === "/api/health/analysis") {
        const healthDate = url.searchParams.get("scope") === "tomorrow" ? tomorrowEasternDate() : easternDate();
        const health = await analysisHealthV2(env, healthDate);
        return json({
          ok: true,
          service: "two45-live-worker",
          engine: "analysis-engine-v2",
          pacingRevision: PACING_REVISION,
          ...health
        });
      }
      if (url.pathname === "/api/elite-repricing-audit" && request.method === "GET") {
        const date=String(url.searchParams.get("date")||easternDate());
        if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date))return json({ok:false,error:"Invalid date"},400);
        return json(await eliteResearchRepricingAuditV116(env,date));
      }
async function eliteResearchRepricingAuditV116(env,date){
  const fixtureSnap=await fixtureSnapshotV19(env,date);
  const fixtures=arr2(fixtureSnap?.fixtures).filter(f=>UPCOMING_STATUSES.has(f?.fixture?.status?.short)&&Date.parse(f?.fixture?.date)>Date.now()&&competitionTierV21(f?.league?.name,f?.league?.id)<=2);
  const ids=fixtures.map(fixtureIdV19).filter(x=>Number.isSafeInteger(x)&&x>0).slice(0,150);
  const rows=ids.length?await canonicalAnalysisRowsV2(env,ids):[];
  const latest=new Map();for(const r of rows){if(r?.status!=="COMPLETE"||r?.model_version!==MODEL_VERSION)continue;const id=Number(r.fixture_id),old=latest.get(id);if(!old||Date.parse(r.completed_at||0)>Date.parse(old.completed_at||0))latest.set(id,r);}
  const daily=(await getFeedSnapshot(env,oddsKey(date)).catch(()=>null))?.payload||{};
  const items=[];let candidates=0,quoted=0;
  for(const f of fixtures){const id=fixtureIdV19(f),row=latest.get(id);const research=arr2(row?.result?.researchMarketOptions).slice(0,20);if(!research.length)continue;
    const direct=await getFeedSnapshot(env,"fixture-odds:"+id).catch(()=>null);
    const recent=direct?.refreshed_at&&Date.now()-Date.parse(direct.refreshed_at)<30*60000;
    const payload=recent?{response:mergeOddsV18(arr2(daily.response),bet365RowsV68(direct?.payload?.response))}:daily;
    const markets=research.map(c=>{const match=exactBet365QuoteV78(payload,id,c.market,c.selection);return {market:c.market,selection:c.selection,quoteVerified:Boolean(match),odds:match?.odds||null};});
    candidates+=markets.length;quoted+=markets.filter(m=>m.quoteVerified).length;
    items.push({fixtureId:id,kickoff:f?.fixture?.date,competition:f?.league?.name,markets});
  }
  return {ok:true,date,readOnly:true,published:false,qualifiedPicks:0,fixtureCount:fixtures.length,fixturesWithPreservedResearch:items.length,researchCandidates:candidates,exactQuotedCandidates:quoted,items};
}
__name(eliteResearchRepricingAuditV116,"eliteResearchRepricingAuditV116");
      if (url.pathname === "/api/elite-intelligence") {
        const requestedDate = String(url.searchParams.get("date") || easternDate());
        if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
          return json({ ok: false, error: "Invalid date." }, 400);
        }
        return json(await eliteIntelligenceSnapshotV86(env, requestedDate, false));
      }
      if (url.pathname === "/api/internal/elite-research" && request.method === "POST") {
        if (!internalRequestAuthorized(request, env)) {
          return json({ ok: false, error: "Protected Two45 research endpoint." }, 403);
        }
        const body = await request.json().catch(() => ({}));
        const fixtureId = Number(body?.fixtureId);
        const evidence = arr2(body?.evidence).slice(0, 20);
        if (!Number.isFinite(fixtureId) || fixtureId <= 0) {
          return json({ ok: false, error: "Valid fixtureId required." }, 400);
        }
        if (!evidence.length) {
          return json({ ok: false, error: "At least one research evidence item is required." }, 400);
        }
        const summary = summarizeExternalResearch(evidence);
        const normalizedEvidence = arr2(summary?.evidence);
        const researchPayload = {
          fixtureId,
          date: String(body?.date || easternDate()),
          submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
          submittedBy: String(body?.submittedBy || "authorized-research-process").slice(0, 100),
          evidence: normalizedEvidence,
          summary
        };
        await saveFeedSnapshot(env, "elite-research:" + fixtureId, researchPayload, 7 * 86400);
        return json({ ok: true, fixtureId, summary });
      }
      if (url.pathname === "/api/health") {
        const s = supa(env);
        return json({
          ok: true,
          service: "two45-live-worker",
          forecastCoreVersion: forecastCoreV3.CORE_VERSION,
          forecastCoreMode: "SHADOW",
          selectionVersion: selectionV2.VERSION,
          selectionMode: "SHADOW",
          recordScope: "official-publication-ledger-v2",
          version: WORKER_VERSION,
          modelVersion: MODEL_VERSION,
          modelLoaded: true,
          supabaseConfigured: Boolean(
            s.url && s.key
          ),
          footballApiConfigured: Boolean(
            footballKey(
              env
            )
          ),
          date: easternDate(),
          tomorrowPreloadStartsAt: "20:00 America/New_York",
          tomorrowPreloadActive: shouldPreloadTomorrow(),
          modelBatch: Math.max(
            1,
            Math.min(
              num4(
                env.TWO45_MODEL_BATCH,
                DEFAULT_MODEL_BATCH
              ),
              9
            )
          )
        });
      }
      if (url.pathname === "/api/internal/refresh" && request.method === "POST") {
        const supplied = request.headers.get(
          "x-two45-internal-key"
        ) || "";
        if (!env.TWO45_INTERNAL_KEY || supplied !== env.TWO45_INTERNAL_KEY) {
          return json(
            {
              ok: false,
              error: "Protected Two45 refresh endpoint."
            },
            403
          );
        }
        return json(
          await runCycleV19({ cron: "manual" }, env, true)
        );
      }
      if (url.pathname === "/api/today") {
        return json(
          await todayBoard(
            env
          )
        );
      }
      if (url.pathname === "/api/model-board" || url.pathname === "/api/dashboard") {
        return json(
          await todayBoard(
            env
          )
        );
      }
      if (url.pathname === "/api/fixtures" || url.pathname === "/api/fixtures/today") {
        return json(
          await fixturesToday(
            env
          )
        );
      }
      if (url.pathname === "/api/fixtures/tomorrow") {
        return json(
          await fixturesTomorrow(
            env
          )
        );
      }
      if (url.pathname === "/api/odds/tomorrow") {
        return json(
          await oddsTomorrow(
            env
          )
        );
      }
      if (url.pathname === "/api/model-board/tomorrow" || url.pathname === "/api/tomorrow") {
        return json(
          await tomorrowBoard(
            env
          )
        );
      }
      if (url.pathname === "/api/model-board/date") {
        const requestedDate = String(url.searchParams.get("date") || "");
        const allowedDates = new Set(weekendLadderDatesV67());
        if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || !allowedDates.has(requestedDate)) {
          return json({ ok: false, error: "Date is not in the active Weekend Ladder pool." }, 400);
        }
        const snap = await snapshot(env, "model-board:" + requestedDate);
        const board = snap ? formatBoardSelectionsV20(snap.payload) : {
          ok: true,
          date: requestedDate,
          games: [],
          fixtures: [],
          picks: [],
          strongPicks: [],
          riskyPlays: []
        };
        return json(await hydrateBoardFixturesV58(env, requestedDate, board, false));
      }
      if (url.pathname === "/api/live") {
        return json(
          await liveBoard(
            env
          )
        );
      }
      if (url.pathname === "/api/odds") {
        return json(
          await oddsToday(
            env
          )
        );
      }
      if (url.pathname === "/api/live-odds") {
        return json(
          await liveOdds(
            env
          )
        );
      }
      if (url.pathname === "/api/tickets") {
        return json(await ticketLocksResponseV70(env));
      }
      if (url.pathname === "/api/model/status") {
        return json(
          await modelStatus(
            env
          )
        );
      }
      if (url.pathname === "/api/internal/learning") {
        if (!internalRequestAuthorized(request, env)) {
          return json({ ok: false, error: "Protected Two45 learning endpoint." }, 403);
        }
        const learning = (await getFeedSnapshot(env, "two45-learning:v82").catch(() => null))?.payload || {};
        const profiles = Object.values(learning.profiles || {}).sort((a, b) => num4(b?.reliability?.bonus, 0) - num4(a?.reliability?.bonus, 0) || num4(b?.settled, 0) - num4(a?.settled, 0));
        return json({ ok: true, version: learning.version || "v82", updatedAt: learning.updatedAt || null, profileCount: profiles.length, dependable: profiles.filter((x) => ["DEPENDABLE", "EMERGING_DEPENDABLE"].includes(x?.reliability?.label)).slice(0, 50), caution: profiles.filter((x) => x?.reliability?.label === "CAUTION").slice(0, 50), recentReviews: arr2(learning.reviews).slice(0, 50) });
      }
      if (url.pathname === "/api/internal/model-accuracy") {
        if (!internalRequestAuthorized(request, env)) {
          return json({ ok: false, error: "Protected Two45 accuracy endpoint." }, 403);
        }
        return json({
          ok: true,
          ...await shadowAccuracyReportV45(env)
        });
      }
      if (url.pathname === "/api/record/summary") {
        return json(
          await recordSummaryV20(env)
        );
      }
      if (url.pathname === "/api/record/report") {
        return json({ok:true,report:await sb(env,"rpc/two45_record_report_v2",{method:"POST",body:"{}"})});
      }
      if (url.pathname === "/api/record/history" || url.pathname === "/api/record") {
        const limit = Math.max(1, Math.min(num4(url.searchParams.get("limit"), 250), 1e3));
        return json(
          await recordHistoryV20(env, limit)
        );
      }
      if (url.pathname === "/api/model/test" && request.method === "POST") {
        const testBody = await request.json();
        const testAnalysis = analyzeMatch(testBody);
        return json({
          ok: true,
          result: testAnalysis,
          decision: Array.isArray(testBody.marketOdds) ? selectIndependent(testAnalysis, testBody.marketOdds) : null
        });
      }
      if (url.pathname === "/api/founder/markets" && request.method === "GET") {
        const fixtureId = Math.trunc(num4(url.searchParams.get("fixtureId"), 0));
        if (!fixtureId)
          return json({ ok: false, code: "INVALID_FIXTURE" }, 400);
        const result = await founderMarketsV97(request, env, fixtureId);
        return json(result.body, result.httpStatus);
      }
      if (url.pathname === "/api/founder-pick" && request.method === "GET") {
        return json(await founderPickPublicV96(env, url.searchParams.get("date") || easternDate()));
      }
      if (url.pathname === "/api/founder/pick" && request.method === "POST") {
        const result = await founderPublishPickV96(request, env);
        return json(result.body, result.httpStatus);
      }
      if (url.pathname === "/api/founder/status" && request.method === "GET") {
        const result = await founderStatusV95(request, env);
        return json(result.body, result.httpStatus);
      }
      if (url.pathname === "/api/founder/elite-review-status" && request.method === "GET") {
        const user = await authenticatedUser(request, env);
        if (!user?.id) return json({ok:false,error:"Sign in required."},401);
        if (!await founderAuthorizedV95(env,user)) return json({ok:false,error:"Founder access required."},403);
        const fixtureId = Math.trunc(Number(url.searchParams.get("fixtureId") || 0));
        if (!(fixtureId > 0)) return json({ok:false,error:"Valid fixture ID required."},400);
        const rows = await sb(env, "two45_founder_elite_suggestions?user_id=eq."+encodeURIComponent(user.id)+"&fixture_id=eq."+fixtureId+"&select=status,review,reviewed_at,fixture_date&order=fixture_date.desc&limit=1");
        const saved = arr2(rows)[0];
        if (!saved) return json({ok:false,status:"NOT_FOUND",message:"No saved review for this fixture."},404);
        if (saved.status === "REVIEWING") {
          const canonical = await currentCanonicalAnalysisV2(env,fixtureId).catch(()=>null);
          const forecast = canonicalForecastV2(canonical);
          if (forecast) {
            const candidate = {...forecast,competitionTier: Number(saved.review?.tier || 4)};
            const eligible = eliteLegQualityV79(candidate);
            const status = eligible ? "ELITE_QUALIFIED" : forecast.decision === "PICK" ? "STRONG_ONLY" : "REJECTED";
            const review = {...saved.review,analysisStatus:"READY",decision:forecast.decision,market:forecast.market||null,selection:forecast.selection||null,probability:forecast.decision==="PICK"?forecast.probability:null,sportsbookOdds:forecast.sportsbookOdds||null,bookmaker:forecast.bookmaker||null,eliteQualified:eligible,reason:arr2(forecast.reasons)[0]||"No independently qualified market.",reviewedAt:new Date().toISOString()};
            await sb(env,"two45_founder_elite_suggestions?user_id=eq."+encodeURIComponent(user.id)+"&fixture_id=eq."+fixtureId+"&fixture_date=eq."+encodeURIComponent(saved.fixture_date),{method:"PATCH",prefer:"return=minimal",body:JSON.stringify({status,review,reviewed_at:new Date().toISOString()})});
            return json({ok:true,status,review,fixtureId});
          }
        }
        return json({ok:true,status:saved.status,review:saved.review,fixtureId});
      }
      if (url.pathname === "/api/founder/elite-suggest" && request.method === "POST") {
        const result = await founderSuggestEliteV95(request, env);
        return json(result.body, result.httpStatus);
      }
      if (url.pathname === "/api/model/analysis-status" && request.method === "GET") {
        const result = await fixtureAnalysisStatus(request, env, Number(url.searchParams.get("fixtureId")));
        return json(result.body, result.httpStatus);
      }
      if (url.pathname === "/api/model/analyze" && request.method === "POST") {
        const result = await analyzeFixtureOnDemand(
          request,
          env
        );
        if (result.body?.status === "READY" && result.body?.forecast?.kickoff) {
          ctx.waitUntil(evaluateBoardV19(env, dateOfV19(result.body.forecast.kickoff)).catch((e) => console.error("On-demand board refresh failed", safeRefreshError(e))));
        }
        return json(
          result.body,
          result.httpStatus
        );
      }
      if (url.pathname === "/api/chatgpt-analyst/published" && request.method === "GET") {
        const date=String(url.searchParams.get("date")||easternDate());
        if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) return json({ok:false,error:"Invalid date"},400);
        const rows=await sb(env,"two45_feed_snapshots?snapshot_key=like.chatgpt-published:"+date+":*&select=payload&limit=50",{timeoutMs:4500}).catch(()=>[]);
        return json({ok:true,date,source:"ChatGPT Analyst V1",tickets:arr2(rows).map(r=>r.payload).filter(r=>r?.published===true)});
      }
      if (url.pathname === "/api/chatgpt-analyst/analyze" && request.method === "POST") {
        if (!internalRequestAuthorized(request,env)) return json({ok:false,error:"Unauthorized"},403);
        const body=await request.json().catch(()=>({}));
        const date=String(body.date||"");
        const fixtureId=Number(body.fixtureId);
        if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)||!Number.isSafeInteger(fixtureId)||fixtureId<=0) return json({ok:false,error:"Invalid date or fixture ID"},400);
        return json(await runChatGPTAnalystPilotV1(env,fixtureId,date));
      }
      if (url.pathname === "/api/model/process" && request.method === "POST") {
        if (!internalRequestAuthorized(request, env)) {
          return json({ ok: false, error: "Protected Two45 processing endpoint." }, 403);
        }
        const body = await request.json().catch(
          () => ({})
        );
        return json(
          await processJobs(
            env,
            num4(
              body.limit,
              1
            )
          )
        );
      }
      if (url.pathname === "/api/model/settle" && request.method === "POST") {
        if (!internalRequestAuthorized(request, env)) {
          return json({ ok: false, error: "Protected Two45 settlement endpoint." }, 403);
        }
        return json({
          ok: true,
          settled: await settle(
            env
          )
        });
      }
      return json(
        {
          ok: false,
          error: "Endpoint not found",
          path: url.pathname
        },
        404
      );
    } catch (e) {
      return json(
        {
          ok: false,
          service: "two45-live-worker",
          forecastCoreVersion: forecastCoreV3.CORE_VERSION,
          forecastCoreMode: "SHADOW",
          selectionVersion: selectionV2.VERSION,
          selectionMode: "SHADOW",
          recordScope: "official-publication-ledger-v2",
          version: WORKER_VERSION,
          error: e?.message || String(e)
        },
        500
      );
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(scheduledAnalysisV2(event, env));
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
