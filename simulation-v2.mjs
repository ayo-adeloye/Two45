export const SIMULATION_VERSION='two45-simulation-v2.0-shadow';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rng(seed){let s=(seed>>>0)||0x9e3779b9;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
function normal(r){return Math.sqrt(-2*Math.log(Math.max(r(),1e-12)))*Math.cos(2*Math.PI*r());}
function poisson(lambda,r){let sum=0,remaining=lambda;while(remaining>0){const part=Math.min(remaining,8),bound=Math.exp(-part);let p=1,k=0;do{p*=r();k++;}while(p>bound);sum+=k-1;remaining-=part;}return sum;}
export function simulateMatch(input){
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
export function comparePricedMarkets(simulation,quotes,{minExpectedValue=.03}={}){
 if(simulation?.version!==SIMULATION_VERSION||!Array.isArray(quotes))throw Error('Invalid simulation or quotes');
 return quotes.flatMap(q=>{const p=simulation.markets[q.market]?.[q.selection];if(p==null||!Number.isFinite(q.odds)||q.odds<=1||!q.observedAt||q.bookmaker!=='Bet365')return [];const expectedValue=p*q.odds-1;return [{market:q.market,selection:q.selection,bookmaker:q.bookmaker,odds:q.odds,observedAt:q.observedAt,probability:p,expectedValue,meetsIndicativeEV:expectedValue>=minExpectedValue,simulationOnly:true}];}).sort((x,y)=>y.expectedValue-x.expectedValue);
}
