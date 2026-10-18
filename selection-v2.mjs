// Independent probabilities enter here before prices. Prices never generate forecasts.
export const VERSION = 'two45-independent-v2-shadow';
export const canonical = s => String(s || '').toUpperCase().replace(/(\d)\.(\d)/g, '$1_$2');
const unit = x => x == null || x === '' || !Number.isFinite(Number(x)) ? null : Number(x) > 1 ? Number(x) / 100 : Number(x);
const clip = p => Math.max(.001, Math.min(.999, p));

export function noVigProbability(quote, quotes) {
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

export function fitCalibration(rows, asOf, minSample = 60) {
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
export function calibrationKey(market,selection,version) {
  return [version,market,canonical(selection)].join('|');
}

export function generateCandidates(analysis, quotes, calibration, context) {
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
export function primaryPicks(candidates) {
  const best = new Map();
  for (const c of candidates.filter(c=>c.eligible).sort((a,b)=>a.tier-b.tier || b.lowerEV-a.lowerEV || b.lowerProbability-a.lowerProbability || (a.market+a.selection).localeCompare(b.market+b.selection))) {
    if (!best.has(String(c.fixtureId))) best.set(String(c.fixtureId),c);
  }
  return [...best.values()];
}
export function optimizeProduct(pool, {low,high,minLegs,maxLegs,reserved=[]}) {
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
export function scoreRows(rows,predict) {
  let n=0,brier=0,logLoss=0,profit=0,priced=0;
  for (const r of rows) {
    const p=predict(r);
    if (!['WIN','LOSS'].includes(r.outcome) || !(p>0 && p<1)) continue;
    const y=+(r.outcome==='WIN'); n++; brier+=(p-y)**2; logLoss-=y*Math.log(clip(p))+(1-y)*Math.log(1-clip(p));
    if (Number(r.sportsbook_odds)>1) {priced++;profit+=y ? Number(r.sportsbook_odds)-1 : -1;}
  }
  return {n,brier:n?brier/n:null,logLoss:n?logLoss/n:null,priced,profit,roi:priced?profit/priced:null};
}
