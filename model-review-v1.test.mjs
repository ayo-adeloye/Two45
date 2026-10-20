import assert from 'node:assert/strict';
import {compareModelPick,summarizeReviews} from './model-review-v1.mjs';
const now=Date.parse('2026-10-19T01:00:00Z'),stamp=new Date(now-60000).toISOString(),kickoff=new Date(now+3*3600000).toISOString();
const pick={fixtureId:1,kickoff,market:'TOTAL_GOALS',selection:'OVER_2.5',probability:.76,sportsbookOdds:1.55,priceObservedAt:stamp,providerUpdatedAt:stamp};
const row={id:10,fixture_id:1,model_id:'artifact',generated_at:stamp,kickoff_at:kickoff,datasetHash:'a'.repeat(64),
 forecast:{modelVersion:'two45-independent-core-v3.1',trainedBefore:new Date(now-3600000).toISOString(),dataQuality:.9,qualityHold:false,evidence:{leagueEffectiveMatches:25},probabilities:{TOTAL_GOALS:{OVER_2_5:.72}}},context:{sampleSize:10,featureAsOf:new Date(now-2*3600000).toISOString()}};
const original=JSON.stringify({pick,row});
const support=compareModelPick(pick,row,now);assert.equal(support.status,'SUPPORTS');assert.equal(support.confidenceBoost,0);assert.equal(support.coreValidated,false);
const conflict={...row,forecast:{...row.forecast,probabilities:{TOTAL_GOALS:{OVER_2_5:.5}}}};
assert.equal(compareModelPick(pick,conflict,now).hold,true);
const marginal={...row,forecast:{...row.forecast,probabilities:{TOTAL_GOALS:{OVER_2_5:.65}}}};
assert.equal(compareModelPick(pick,marginal,now).status,'DIFFERS','0.75% model EV must not receive independent support');

assert.equal(compareModelPick(pick,{...row,forecast:{...row.forecast,qualityHold:true}},now).status,'UNREVIEWED');
assert.equal(compareModelPick(pick,{...row,fixture_id:2},now).reason,'FIXTURE_IDENTITY_MISMATCH');
assert.equal(compareModelPick(pick,{...row,generated_at:new Date(now+1000).toISOString()},now).status,'UNREVIEWED');
assert.equal(compareModelPick(pick,{...row,generated_at:new Date(now-2*3600000).toISOString()},now).status,'UNREVIEWED');
assert.equal(compareModelPick(pick,{...row,context:{...row.context,sampleSize:2}},now).status,'UNREVIEWED');
assert.equal(compareModelPick(pick,{...row,context:{...row.context,featureAsOf:new Date(now+1000).toISOString()}},now).status,'UNREVIEWED');
assert.equal(compareModelPick(pick,{...row,datasetHash:null},now).status,'UNREVIEWED');
assert.equal(compareModelPick({...pick,selection:'OVER_3_5'},row,now).status,'UNREVIEWED','A different line cannot count as agreement');
assert.equal(compareModelPick({...pick,priceObservedAt:null},conflict,now).hold,false,'Unproven quotes cannot drive a veto');
assert.equal(compareModelPick(pick,null,now).status,'UNREVIEWED');
assert.equal(JSON.stringify({pick,row}),original,'Comparison must not rewrite probabilities or source evidence');
assert.deepEqual(summarizeReviews([{modelReview:support},{modelReview:compareModelPick(pick,conflict,now)}]).counts,{SUPPORTS:1,DIFFERS:0,HOLD:1,UNREVIEWED:0});
console.log('PASS: exact market/line comparison, conservative conflict hold, no confidence boost, missing/weak/stale/future evidence neutrality and immutable inputs');
