import { buildEliteSlateReview, reviewEliteFixture } from "./elite-intelligence-v86.js";

const base = {
  kickoff:"2026-10-05T18:00:00Z",
  competition:"Tier 1 Test",
  competitionTier:1,
  analysisStatus:"COMPLETE",
  dataQuality:0.82,
  probabilityBoard:{MATCH_RESULT:{HOME:0.74,DRAW:0.16,AWAY:0.10}},
  intelligence:{
    home:{formPPG:2.2,venuePPG:2.3,winRate:0.7,cleanSheetRate:0.4,failedToScoreRate:0.1,sampleSize:10},
    away:{formPPG:1.1,venuePPG:1.0,winRate:0.3,cleanSheetRate:0.2,failedToScoreRate:0.3,sampleSize:10}
  }
};

function assert(ok,msg){if(!ok)throw new Error(msg)}

const good=reviewEliteFixture({...base,fixtureId:1,home:"Alpha",away:"Beta"});
assert(good.researchEligible===true,"strong complete fixture should enter research queue");

const incomplete=buildEliteSlateReview([
  {...base,fixtureId:1,home:"Alpha",away:"Beta"},
  {...base,fixtureId:2,home:"Gamma",away:"Delta",analysisStatus:"PENDING"}
]);
assert(incomplete.slateComplete===false,"slate must remain closed while Tier 1/2 analysis is incomplete");
assert(incomplete.researchQueue.length===0,"research queue must not open early");

const contradictory=reviewEliteFixture({
  ...base,fixtureId:3,home:"Weak Home",away:"Strong Away",
  probabilityBoard:{MATCH_RESULT:{HOME:0.76,DRAW:0.14,AWAY:0.10}},
  intelligence:{
    home:{formPPG:0.7,venuePPG:0.8,sampleSize:10},
    away:{formPPG:2.2,venuePPG:2.1,sampleSize:10}
  }
});
assert(contradictory.warnings.includes("MODEL_FORM_CONTRADICTION"),"contradiction must be flagged");
assert(contradictory.researchEligible===false,"critical contradiction must block research eligibility");

const complete=buildEliteSlateReview([
  {...base,fixtureId:1,home:"Alpha",away:"Beta"},
  {...base,fixtureId:4,home:"Epsilon",away:"Zeta"}
]);
assert(complete.slateComplete===true,"fully analyzed Tier 1/2 slate should open research stage");
assert(complete.stage==="RESEARCH_READY","complete slate should be research ready");

console.log(JSON.stringify({ok:true,tests:4,revision:complete.revision}));
