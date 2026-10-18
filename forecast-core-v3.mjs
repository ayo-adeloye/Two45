// Odds-free, hierarchical goal model. Training labels are unique regulation-time fixtures.
export const CORE_VERSION='two45-independent-core-v3.1';
const day=86400000;
const number=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const clip=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const leagueKey=f=>`${f.league_id}:${f.season}`;
const teamKey=(f,id)=>`${leagueKey(f)}:${id}`;
const validId=x=>x!=null&&String(x).trim()!==''&&!['undefined','null','nan','0'].includes(String(x).toLowerCase());
export function seasonFeatures(snapshot,fixture,side,at) {
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
export function timestamp(s) {
 if(typeof s==='number')return Number.isFinite(s)?s:NaN;
 return Date.parse(String(s||'').replace(' ','T').replace(/([+-]\d\d)$/,'$1:00'));
}
export function cleanFixtures(rows,asOf) {
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

export function attachSeasonHistory(fixtures,snapshots) {
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

export function fitGoalModel(fixtures,asOf,options={}) {
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
export function scoreMatrix(homeRate,awayRate,rho=0) {
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
export function marketBoard(cells) {
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

export function predictGoals(model,fixture,asOf,context={}) {
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
