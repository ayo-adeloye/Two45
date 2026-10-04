import {evaluateEliteFinalReview,buildEliteFinalReviewQueue} from "./elite-final-review-v91.js";
const assert=(x,m)=>{if(!x)throw new Error(m)};
const strong={
 fixtureId:1,evidenceScore:86,dataQuality:82,
 strongestModelView:{probability:81.5},researchStatus:"SUPPORTED",finalReviewEligible:true,
 externalResearch:{supportShare:1,contradictionShare:0,credibleSourceCount:2,freshSourceCount:2}
};
const ok=evaluateEliteFinalReview(strong);
assert(ok.approved===true,"strong supported review should pass");
assert(ok.finalConfidence>=75,"approved review must clear final confidence gate");

const mixed=evaluateEliteFinalReview({...strong,fixtureId:2,researchStatus:"MIXED",externalResearch:{...strong.externalResearch,supportShare:.55,contradictionShare:.45}});
assert(mixed.approved===false,"mixed research must hold");
assert(mixed.reasons.includes("EXTERNAL_RESEARCH_NOT_SUPPORTED"),"mixed research reason required");

const weak=evaluateEliteFinalReview({...strong,fixtureId:3,evidenceScore:70,dataQuality:60,strongestModelView:{probability:59}});
assert(weak.approved===false,"weak model/data review must hold");
assert(weak.reasons.length>=2,"weak review should explain multiple deficiencies");

const contradiction=evaluateEliteFinalReview({...strong,fixtureId:4,externalResearch:{...strong.externalResearch,supportShare:.75,contradictionShare:.25}});
assert(contradiction.approved===false,"meaningful unresolved contradiction must hold");
assert(contradiction.reasons.includes("UNRESOLVED_CONTRADICTION"),"contradiction reason required");

const q=buildEliteFinalReviewQueue([strong,{...strong,fixtureId:5,evidenceScore:72}]);
assert(q.considered===2,"queue should evaluate all externally supported candidates");
assert(q.approved===1 && q.held===1,"queue should separate approved and held candidates");
console.log(JSON.stringify({ok:true,tests:5,revision:q.revision}));
