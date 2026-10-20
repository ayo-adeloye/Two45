export const VERSION='engine2-scorecard-v1';
const labels=['HOME','DRAW','AWAY'];
export function buildScorecard(rows,minCount=200){
 const keys=new Set(),valid=[],excluded={invalid:0,duplicate:0};
 for(const r of rows){const p=r?.probabilities;
  if(!r?.ok||r.mode!=='SHADOW'||r.promotionAllowed!==false||!labels.includes(r.actualOutcome)||!p||labels.some(k=>!Number.isFinite(p[k])||p[k]<0||p[k]>1)||Math.abs(labels.reduce((s,k)=>s+p[k],0)-1)>1e-6||!(Date.parse(r.sourceGeneratedAt)<Date.parse(r.kickoffAt)&&Date.parse(r.kickoffAt)<Date.parse(r.resultAvailableAt))){excluded.invalid++;continue;}
  const key=r.fixtureId+':'+r.sourceGeneratedAt;
  if(keys.has(key)){excluded.duplicate++;continue;}keys.add(key);valid.push(r);
 }
 const mean=f=>valid.length?valid.reduce((s,r)=>s+f(r),0)/valid.length:null;
 const calibration=labels.map(k=>({outcome:k,meanProbability:mean(r=>r.probabilities[k]),actualFrequency:mean(r=>Number(r.actualOutcome===k))}));
 return {version:VERSION,mode:'SHADOW',records:valid.length,excluded,brier1x2:mean(r=>labels.reduce((s,k)=>s+(r.probabilities[k]-Number(r.actualOutcome===k))**2,0)),logLoss1x2:mean(r=>-Math.log(Math.max(1e-12,r.probabilities[r.actualOutcome]))),calibration,sufficientSample:valid.length>=minCount,readyForPromotion:false};
}