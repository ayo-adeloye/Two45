export const ELITE_EXPLANATION_REVISION = "2026-10-04-evidence-grounded-explanation-v92";

const arr=v=>Array.isArray(v)?v:[];
const pct=v=>Number.isFinite(Number(v))?Math.round(Number(v)*10)/10:null;
const clean=s=>String(s||"").replace(/\s+/g," ").trim();

function marketLabel(view={}){
  const market=clean(view.market).replaceAll("_"," ");
  const selection=clean(view.selection).replaceAll("_"," ");
  return [market,selection].filter(Boolean).join(" — ");
}

function supportingEvidence(review={}){
  return arr(review?.externalResearch?.evidence)
    .filter(x=>x?.direction==="SUPPORTS")
    .sort((a,b)=>Number(b?.weight||0)-Number(a?.weight||0))
    .slice(0,3)
    .map(x=>({
      sourceName:clean(x.sourceName)||"External source",
      sourceType:clean(x.sourceType)||"UNKNOWN",
      claimType:clean(x.claimType)||"OTHER",
      summary:clean(x.summary).slice(0,220)
    }))
    .filter(x=>x.summary);
}

export function explainEliteSelection(review={},finalReview={}) {
  if(!finalReview?.approved) return null;
  const view=review?.strongestModelView||{};
  const support=supportingEvidence(review);
  const reasons=[];

  if(view.market && view.selection){
    reasons.push(`Two45's strongest meaningful model view was ${marketLabel(view)} at ${pct(view.probability)}% model confidence.`);
  }
  if(Number.isFinite(Number(review.evidenceScore))){
    reasons.push(`The fixture cleared the evidence gate with an evidence score of ${pct(review.evidenceScore)}/100 and data quality of ${pct(review.dataQuality)}/100.`);
  }
  if(review?.researchStatus==="SUPPORTED"){
    reasons.push(`Independent research supported the model direction; ${Number(review.externalResearch?.credibleSourceCount||0)} credible and ${Number(review.externalResearch?.freshSourceCount||0)} fresh source checks were recorded.`);
  }
  if(Number(review?.externalResearch?.contradictionShare||0)===0){
    reasons.push("No unresolved directional contradiction remained in the recorded external evidence.");
  }
  if(support.length){
    reasons.push("The strongest supporting context was: "+support.map(x=>x.summary).join(" | "));
  }

  return {
    revision:ELITE_EXPLANATION_REVISION,
    fixtureId:review.fixtureId,
    title:"Why Two45 Picked This",
    market:view.market||null,
    selection:view.selection||null,
    modelProbability:pct(view.probability),
    finalConfidence:pct(finalReview.finalConfidence),
    evidenceScore:pct(review.evidenceScore),
    dataQuality:pct(review.dataQuality),
    reasons,
    supportingEvidence:support,
    disclaimer:"Explanation is generated only from evidence already used by Two45's review pipeline; it does not add new facts after selection."
  };
}
