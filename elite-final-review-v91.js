export const ELITE_FINAL_REVIEW_REVISION = "2026-10-04-calibrated-final-review-v91";

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const p01=v=>{const n=num(v,0);return clamp(n>1?n/100:n,0,1);};

export function evaluateEliteFinalReview(review={}) {
  const reasons=[];
  const evidenceScore=clamp(num(review.evidenceScore,0),0,100);
  const dataQuality=p01(review.dataQuality);
  const probability=p01(review?.strongestModelView?.probability);
  const research=review.externalResearch||{};
  const supportShare=clamp(num(research.supportShare,0),0,1);
  const contradictionShare=clamp(num(research.contradictionShare,0),0,1);
  const credibleCount=Math.max(0,num(research.credibleSourceCount,0));
  const freshCount=Math.max(0,num(research.freshSourceCount,0));

  if(review.researchStatus!=="SUPPORTED") reasons.push("EXTERNAL_RESEARCH_NOT_SUPPORTED");
  if(evidenceScore<76) reasons.push("EVIDENCE_SCORE_BELOW_FINAL_GATE");
  if(dataQuality<0.68) reasons.push("DATA_QUALITY_BELOW_FINAL_GATE");
  if(probability<0.62) reasons.push("MODEL_SIGNAL_BELOW_FINAL_GATE");
  if(credibleCount<1) reasons.push("NO_CREDIBLE_EXTERNAL_SOURCE");
  if(freshCount<1) reasons.push("NO_FRESH_EXTERNAL_SOURCE");
  if(contradictionShare>=0.20) reasons.push("UNRESOLVED_CONTRADICTION");

  const diversity = clamp((credibleCount + Math.min(freshCount,2))/4,0,1);
  const finalConfidence=100*clamp(
    (evidenceScore/100)*0.38 +
    dataQuality*0.22 +
    probability*0.22 +
    supportShare*0.12 +
    diversity*0.06 -
    contradictionShare*0.18,
    0,1
  );

  const approved = reasons.length===0 && finalConfidence>=75;
  if(reasons.length===0 && finalConfidence<75) reasons.push("FINAL_CONFIDENCE_BELOW_GATE");

  return {
    revision:ELITE_FINAL_REVIEW_REVISION,
    fixtureId:review.fixtureId,
    approved,
    disposition:approved?"FINAL_REVIEW_APPROVED":"HOLD",
    finalConfidence:Math.round(finalConfidence*10)/10,
    reasons,
    modelProbability:Math.round(probability*1000)/10,
    evidenceScore,
    dataQuality:Math.round(dataQuality*1000)/10,
    externalSupportShare:Math.round(supportShare*1000)/1000,
    externalContradictionShare:Math.round(contradictionShare*1000)/1000,
    credibleSourceCount:credibleCount,
    freshSourceCount:freshCount
  };
}

export function buildEliteFinalReviewQueue(reviews=[]) {
  const evaluations=reviews
    .filter(x=>x?.finalReviewEligible)
    .map(evaluateEliteFinalReview)
    .sort((a,b)=>b.finalConfidence-a.finalConfidence);
  return {
    revision:ELITE_FINAL_REVIEW_REVISION,
    considered:evaluations.length,
    approved:evaluations.filter(x=>x.approved).length,
    held:evaluations.filter(x=>!x.approved).length,
    approvedQueue:evaluations.filter(x=>x.approved),
    heldQueue:evaluations.filter(x=>!x.approved)
  };
}
