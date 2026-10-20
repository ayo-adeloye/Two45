import assert from 'node:assert/strict';
import {buildScorecard} from './engine2-scorecard-v1.mjs';
const r={ok:true,mode:'SHADOW',promotionAllowed:false,fixtureId:1,sourceGeneratedAt:'2026-10-20T10:00:00Z',kickoffAt:'2026-10-20T12:00:00Z',resultAvailableAt:'2026-10-20T17:00:00Z',actualOutcome:'HOME',probabilities:{HOME:.6,DRAW:.2,AWAY:.2}};
const s=buildScorecard([r,r,{...r,fixtureId:2,actualOutcome:'DRAW'},{...r,fixtureId:3,sourceGeneratedAt:'2026-10-20T19:00:00Z'}]);
assert.equal(s.records,2);assert.equal(s.excluded.duplicate,1);assert.equal(s.excluded.invalid,1);assert(Math.abs(s.brier1x2-.64)<1e-10);assert.equal(s.readyForPromotion,false);assert.equal(buildScorecard([]).brier1x2,null);console.log('PASS scorecard');