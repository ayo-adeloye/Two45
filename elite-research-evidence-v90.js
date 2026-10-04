export const ELITE_RESEARCH_REVISION = "2026-10-04-external-evidence-v90";

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;

const SOURCE_WEIGHT={
  OFFICIAL_TEAM:0.98,
  OFFICIAL_LEAGUE:0.95,
  REPUTABLE_NEWS:0.88,
  STATS_PROVIDER:0.84,
  SPECIALIST_ANALYSIS:0.72,
  PREDICTION_SITE:0.55,
  SOCIAL:0.40,
  UNKNOWN:0.35
};

function freshnessWeight(publishedAt,nowMs=Date.now()){
  const t=Date.parse(publishedAt||"");
  if(!Number.isFinite(t)) return 0.45;
  const hours=Math.max(0,(nowMs-t)/3600000);
  if(hours<=12)return 1;
  if(hours<=24)return 0.94;
  if(hours<=72)return 0.82;
  if(hours<=168)return 0.68;
  return 0.45;
}

export function normalizeResearchEvidence(item={},nowMs=Date.now()){
  const sourceType=String(item.sourceType||"UNKNOWN").toUpperCase();
  const direction=String(item.direction||"NEUTRAL").toUpperCase();
  const credibility=SOURCE_WEIGHT[sourceType]??SOURCE_WEIGHT.UNKNOWN;
  const confidence=clamp(num(item.confidence,0.7),0,1);
  const freshness=freshnessWeight(item.publishedAt,nowMs);
  const weight=credibility*confidence*freshness;
  return {
    sourceName:String(item.sourceName||"Unknown source"),
    sourceUrl:item.sourceUrl||null,
    sourceType,
    publishedAt:item.publishedAt||null,
    checkedAt:item.checkedAt||new Date(nowMs).toISOString(),
    claimType:String(item.claimType||"OTHER").toUpperCase(),
    direction:["SUPPORTS","CONTRADICTS","NEUTRAL"].includes(direction)?direction:"NEUTRAL",
    confidence,
    credibility,
    freshness,
    weight,
    summary:String(item.summary||"").slice(0,500)
  };
}

function contradictionWeightSafe(value){ return Math.max(0,num(value,0)); }

export function summarizeExternalResearch(items=[],nowMs=Date.now()){
  const evidence=items.map(x=>normalizeResearchEvidence(x,nowMs));
  let support=0,contradict=0,neutral=0;
  for(const x of evidence){
    if(x.direction==="SUPPORTS")support+=x.weight;
    else if(x.direction==="CONTRADICTS")contradict+=x.weight;
    else neutral+=x.weight;
  }
  const directional=support+contradict;
  const contradictionShare=directional?contradict/directional:0;
  const supportShare=directional?support/directional:0;
  const credible=evidence.filter(x=>x.credibility>=0.8);
  const fresh=evidence.filter(x=>x.freshness>=0.8);
  const criticalContradiction=evidence.some(x=>
    x.direction==="CONTRADICTS" &&
    x.credibility>=0.88 &&
    x.confidence>=0.75 &&
    x.freshness>=0.8
  );

  let status="INSUFFICIENT";
  if(evidence.length>=2 && credible.length>=1){
    const contradictionCount=evidence.filter(x=>x.direction==="CONTRADICTS" && x.weight>=0.45).length;
    if(criticalContradiction || (contradictionCount>=2 && contradictionWeightSafe(contradict)>=0.95)) status="CONTRADICTED";
    else if(contradictionShare>=0.30) status="MIXED";
    else if(supportShare>=0.62) status="SUPPORTED";
    else status="MIXED";
  }

  const confidenceAdjustment=
    status==="SUPPORTED" ? Math.min(0.05,0.02+supportShare*0.03) :
    status==="MIXED" ? -0.04 :
    status==="CONTRADICTED" ? -0.12 :
    0;

  return {
    revision:ELITE_RESEARCH_REVISION,
    status,
    evidenceCount:evidence.length,
    credibleSourceCount:credible.length,
    freshSourceCount:fresh.length,
    supportWeight:Math.round(support*1000)/1000,
    contradictionWeight:Math.round(contradict*1000)/1000,
    neutralWeight:Math.round(neutral*1000)/1000,
    supportShare:Math.round(supportShare*1000)/1000,
    contradictionShare:Math.round(contradictionShare*1000)/1000,
    criticalContradiction,
    confidenceAdjustment,
    recommendation:
      status==="CONTRADICTED" ? "HOLD" :
      status==="MIXED" ? "MORE_RESEARCH" :
      status==="SUPPORTED" ? "PROCEED_REVIEW" :
      "MORE_RESEARCH",
    evidence
  };
}


export function applyExternalResearch(review={}, items=[], nowMs=Date.now()) {
  const summary=summarizeExternalResearch(items,nowMs);
  const baseEligible=Boolean(review?.researchEligible);
  const finalReviewEligible=baseEligible && summary.status==="SUPPORTED";
  const researchStatus=
    !baseEligible ? "NOT_QUEUED" :
    summary.status==="INSUFFICIENT" ? "PENDING_EXTERNAL_CONTEXT" :
    summary.status;

  return {
    ...review,
    researchStatus,
    externalResearch:summary,
    finalReviewEligible,
    reviewRecommendation:
      !baseEligible ? "NOT_QUEUED" :
      summary.status==="SUPPORTED" ? "PROCEED_REVIEW" :
      summary.status==="CONTRADICTED" ? "HOLD" :
      "MORE_RESEARCH"
  };
}
