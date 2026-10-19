// Research only. No player market can enter an official publisher through this module.
export const PLAYER_RESEARCH_VERSION = 'two45-player-research-v1';
export const PLAYER_MARKETS = ['PLAYER_SHOTS_ON_TARGET','PLAYER_TO_SCORE','PLAYER_TO_ASSIST','PLAYER_TO_SCORE_OR_ASSIST'];
export function isPlayerMarket(name) {
  const label=String(name).trim();
  return /player|scorer/i.test(label)||/^(?:(?:anytime|first|last)\s+)?(?:to score|to assist|(?:to )?score or assist)$/i.test(label);
}
export function normalizePlayerStats(response, fixture, observedAt) {
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
export function forecastPlayerProp({history=[],playerId,teamId,fixtureId,kickoff,asOf,lineup,market,line=0.5,quote}) {
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
