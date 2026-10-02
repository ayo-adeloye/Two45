const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..')+'/';
const html=fs.readFileSync(root+'index.html','utf8');
const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
script.forEach(s=>new vm.Script(s));
const dom={value:'',style:{},classList:{toggle(){},remove(){},add(){},contains(){return false}},setAttribute(){}};
const c=vm.createContext({console,Date,Intl,Set,Map,localStorage:{getItem(){return ''}},document:{querySelector(){return {...dom}},querySelectorAll(){return []}},setInterval(){},fetch:()=>new Promise(()=>{})});
vm.runInContext(script[0],c);
const f=(name,country='World',status='NS')=>({fixture:{id:1,date:new Date(Date.now()+3600000).toISOString(),status:{short:status}},league:{name,country},teams:{home:{name:'Alpha'},away:{name:'Beta'}}});
assert.equal(c.isIntl(f('UEFA Champions League Women')),false);
assert.equal(c.isIntl(f('Friendlies Clubs')),false);
assert.equal(c.isIntl(f('UEFA Nations League')),true);
assert.equal(c.isIntl(f('UEFA U21 Championship - Qualification')),true);
assert.equal(c.isIntl(f('Friendlies')),true);
assert.equal(c.isIntl(f('Premier League','England')),false);
c.state.filter='upcoming'; for(const st of ['PST','SUSP','INT','CANC','FT','2H'])assert.equal(c.passes(f('League','World',st)),false);
assert.equal(c.passes(f('League')),true);
const board={games:[f('UEFA Champions League Women')],strongPicks:[{fixtureId:1,market:'TOTAL_GOALS',selection:'OVER_2.5',home:'Alpha',away:'Beta',decision:'PICK',sportsbookOdds:1.5,probability:75}]};
c.state.filter='international';assert.equal(c.filteredPicks(board,board.strongPicks).length,0);assert.equal(c.featured(board),'');
c.state.filter='all';c.state.query='missing';assert.equal(c.filteredPicks(board,board.strongPicks).length,0);
c.state.query=' Alpha ';assert.equal(c.filteredPicks(board,board.strongPicks).length,1);
assert.equal(c.ticketPriceCoherent({market:'TOTAL_GOALS',sportsbookOdds:3.1,probability:80}),false);
assert.equal(c.ticketPriceCoherent({market:'HANDICAP',sportsbookOdds:3.1,probability:.8}),false);
assert.equal(c.ticketPriceCoherent({market:'TOTAL_GOALS',sportsbookOdds:1.7,probability:.75}),true);
c.state.today={strongPicks:[{...board.strongPicks[0],sportsbookOdds:4}]};assert.equal(c.ticketPool().length,0);
c.state.today={independentForecasts:[{fixtureId:3,decision:'NO_BET',alternatives:[{}]}]};assert.equal(c.findForecast(3).decision,'NO_BET');
const past=f('League');past.fixture.date=new Date(Date.now()-2*86400000).toISOString();past.fixture.status.short='1H';assert.equal(c.isLive(past),false);assert.equal(c.awaitingUpdate(past),true);past.fixture.status.short='NS';assert.equal(c.isUpcoming(past),false);assert.equal(c.ticketUpcoming({games:[past]},{fixtureId:1}),false);
console.log('PASS: frontend syntax, national/club classification, status/search/pick filtering, ticket price guard and saved analysis lookup');

const w=vm.createContext({console,Date,Intl,URL,Set,Map,Response,Request,Headers,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(root+'worker.js','utf8').replace('export default {','const worker = {'),w);
const select=(p,tier=1,odds=[])=>w.selectIndependent({probabilities:p,dataQuality:.85,competitionReliability:.9},odds,tier);
for(const [market,selection,p] of [['TOTAL_GOALS','OVER_2_5',.76],['TOTAL_GOALS','OVER_3_5',.76],['MATCH_RESULT','HOME',.76],['BTTS','YES',.77],['HOME_TEAM_GOALS','OVER_1_5',.77],['HANDICAP','HOME_MINUS_1_5',.77]]){
 const probs={HANDICAP:{HOME_PLUS_1_5:.88}};probs[market]={...probs[market],[selection]:p};
 const r=select(probs);assert.equal(r.selection,selection,JSON.stringify(r));assert.equal(r.pickType,'STRONG_PICK');
 const r3=select(probs,3);assert.equal(r3.selection,'HOME_PLUS_1_5');
}
const weak=select({HANDICAP:{HOME_PLUS_1_5:.95},TOTAL_GOALS:{OVER_3_5:.50}});assert.equal(weak.selection,'HOME_PLUS_1_5');
const guarded=select({HANDICAP:{HOME_PLUS_1_5:.85,AWAY_MINUS_1_5:.15}},1,[{market:'HANDICAP',bookmaker:'Test',outcomes:[{selection:'HOME_PLUS_1_5',odds:4},{selection:'AWAY_MINUS_1_5',odds:1.2}]}]);
assert.equal(guarded.sportsbookOdds,null);assert(!guarded.topMarkets.some(x=>x.sportsbookOdds===4&&x.lane==='STRONG'));
const game=f('UEFA Nations League');game.fixture.id=10;game.league.id=5;
const rows=[{status:'COMPLETE',fixture_id:10,model_version:'two45-independent-v1.9',completed_at:new Date().toISOString(),result:{forecast:{fixtureId:10,decision:'PICK',selection:'OVER_2_5',market:'TOTAL_GOALS',probability:76,pickType:'STRONG_PICK'}}}];
const hydrated=w.presentCanonicalBoardV59({},[game],rows);assert.equal(hydrated.analyzedCount,1);assert.equal(hydrated.strongPicks.length,1);assert.equal(hydrated.strongPicks[0].selection,'OVER_2.5');
game.fixture.status.short='FT';assert.equal(w.presentCanonicalBoardV59({},[game],rows).strongPicks.length,0);
console.log('PASS: all six audacity families promote only when qualified in eligible tiers; weak alternative stays unpromoted; mismatched price is removed; saved forecasts hydrate and finished picks stay off promotion board');


const consensusOdds=(market,odds,opposite)=>['Book A','Book B'].map(bookmaker=>({market,bookmaker,outcomes:[{selection:'HOME_MINUS_1',odds},{selection:'AWAY_PLUS_1',odds:opposite}]}));
assert.equal(select({},1,consensusOdds('HANDICAP',3.14,12)).decision,'NO_BET');
assert.equal(select({HANDICAP:{HOME_MINUS_1:.28}},1,consensusOdds('HANDICAP',2.74,10)).decision,'NO_BET');
assert.equal(select({},1,consensusOdds('TOTAL_CORNERS',3.14,12)).decision,'NO_BET');
const saved={decision:'PICK',market:'HANDICAP',selection:'HOME_MINUS_1',probability:77.556,sportsbookOdds:3.14,analysisSource:'cross-book-market-consensus',alternatives:[]};
assert.equal(w.displayForecastV60(saved).qualityHold,true);assert.equal(w.displayForecastV60(saved).decision,'NO_BET');assert.equal(saved.decision,'PICK');
assert.equal(w.priceCoherentV60(.77556,3.14),false);
assert.equal(w.priceCoherentV60(.75,1.8),true);
console.log('PASS: reproduced consensus price bypass is blocked; handicaps require independent support; current promotion hides invalid saved picks without mutating the ledger');

assert.equal(c.isIntl(f('U20 Elite League')),true);
assert.equal(c.isIntl(f('CAF U23 Cup of Nations')),true);
console.log('PASS: youth national competitions stay in International');
