import { normalizeResearchEvidence, summarizeExternalResearch } from "./elite-research-evidence-v90.js";

const now=Date.parse("2026-10-04T22:00:00Z");
const official={
  sourceName:"Club",
  sourceType:"OFFICIAL_TEAM",
  sourceUrl:"https://example.com/team",
  publishedAt:"2026-10-04T18:00:00Z",
  claimType:"LINEUP",
  direction:"SUPPORTS",
  confidence:0.9,
  summary:"Expected starters available."
};
const news={
  sourceName:"News",
  sourceType:"REPUTABLE_NEWS",
  sourceUrl:"https://example.com/news",
  publishedAt:"2026-10-04T17:00:00Z",
  claimType:"INJURY",
  direction:"SUPPORTS",
  confidence:0.8,
  summary:"No new major absences reported."
};
const normalized=normalizeResearchEvidence(official,now);
if(normalized.credibility<0.95)throw new Error("official source should carry high credibility");
if(normalized.freshness!==1)throw new Error("fresh official evidence should have full freshness");

const supported=summarizeExternalResearch([official,news],now);
if(supported.status!=="SUPPORTED")throw new Error("credible aligned evidence should support");
if(supported.recommendation!=="PROCEED_REVIEW")throw new Error("supported research should proceed to review");

const conflict=summarizeExternalResearch([
  official,
  {...news,direction:"CONTRADICTS",confidence:0.95,summary:"Key player ruled out."}
],now);
if(!["MIXED","CONTRADICTED"].includes(conflict.status))throw new Error("conflicting credible evidence must not be marked supported");

const critical=summarizeExternalResearch([
  {...official,direction:"CONTRADICTS",confidence:0.95,summary:"Official team confirms key starter unavailable."},
  news
],now);
if(critical.status!=="CONTRADICTED")throw new Error("fresh official contradiction should hold the review");
if(critical.recommendation!=="HOLD")throw new Error("critical contradiction should hold");

const weak=summarizeExternalResearch([{
  sourceName:"Anonymous",
  sourceType:"SOCIAL",
  publishedAt:"2026-09-20T10:00:00Z",
  direction:"SUPPORTS",
  confidence:0.5,
  summary:"Unverified claim."
}],now);
if(weak.status!=="INSUFFICIENT")throw new Error("single weak stale source is insufficient");

console.log(JSON.stringify({ok:true,tests:5,revision:supported.revision}));
