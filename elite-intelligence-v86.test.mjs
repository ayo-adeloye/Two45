import {
  buildEliteSlateReview,
  reviewEliteFixture,
  selectResearchModelView,
  isSafetyOnlyView
} from "./elite-intelligence-v86.js";

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

const goalsView=selectResearchModelView({
  TOTAL_GOALS:{UNDER_4_5:0.96,OVER_2_5:0.64,OVER_3_5:0.40},
  MATCH_RESULT:{HOME:0.57,DRAW:0.24,AWAY:0.19}
});
assert(goalsView.selection==="OVER_2_5","decision-useful O2.5 should outrank trivial Under 4.5");

const resultView=selectResearchModelView({
  HANDICAP:{HOME_PLUS_1_5:0.94,HOME_MINUS_0_5:0.61},
  MATCH_RESULT:{HOME:0.61,DRAW:0.23,AWAY:0.16}
});
assert(resultView.market==="MATCH_RESULT" || resultView.selection==="HOME_MINUS_0_5",
  "meaningful result/active handicap should outrank +1.5 safety");

const safety=reviewEliteFixture({
  ...base,fixtureId:5,home:"Safe",away:"Only",
  probabilityBoard:{TOTAL_GOALS:{UNDER_4_5:0.97},HANDICAP:{HOME_PLUS_1_5:0.95}}
});
assert(safety.warnings.includes("SAFETY_ONLY_MODEL_VIEW"),"safety-only model should be flagged");
assert(safety.researchEligible===false,"safety-only model must not enter external research queue");
assert(isSafetyOnlyView({market:"TOTAL_GOALS",selection:"UNDER_4_5"})===true,"Under 4.5 is safety-only");

console.log(JSON.stringify({ok:true,tests:8,revision:complete.revision}));
