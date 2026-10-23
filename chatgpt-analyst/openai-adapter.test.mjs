import test from "node:test";
import assert from "node:assert/strict";
import {analyzeWithOpenAI, estimateCostUsd, ANALYST_MODEL} from "./openai-adapter.mjs";

const fixture = {fixtureId:123, kickoff:"2026-11-01T20:00:00Z",home:"Alpha",away:"Beta"};
const availableQuotes = [{fixtureId:123,marketId:1,selection:"Over 1.5",bookmaker:"Bet365",odds:1.4}];
test("never calls API without a key",async()=>{
  await assert.rejects(analyzeWithOpenAI({fixture,availableQuotes,budgetRemainingUsd:10}),/OPENAI_API_KEY/);
});
test("blocks a call when monthly budget is exhausted",async()=>{
  let called=false;
  await assert.rejects(analyzeWithOpenAI({apiKey:"test",fixture,availableQuotes,budgetRemainingUsd:0,fetchImpl:async()=>{called=true;}}),/budget/);
  assert.equal(called,false);
});
test("returns non-publishable structured draft",async()=>{
  const fakeFetch=async(url,opts)=>{
    assert.equal(url,"https://api.openai.com/v1/responses");
    assert.equal(JSON.parse(opts.body).model,ANALYST_MODEL);
    return {ok:true,json:async()=>({output:[{content:[{type:"output_text",text:JSON.stringify({fixtureId:123,recommendation:{marketId:1,selection:"Over 1.5",bookmaker:"Bet365",odds:1.4},confidence:72,reasoning:"test"})}]}],usage:{input_tokens:400,output_tokens:120}})};
  };
  const result=await analyzeWithOpenAI({apiKey:"test",fixture,availableQuotes,budgetRemainingUsd:10,fetchImpl:fakeFetch});
  assert.equal(result.publishable,false);
  assert.equal(result.draft.fixtureId,123);
  assert.ok(result.estimatedActualCostUsd>0);
});
test("rejects malformed model JSON",async()=>{
  await assert.rejects(analyzeWithOpenAI({apiKey:"test",fixture,availableQuotes,budgetRemainingUsd:10,fetchImpl:async()=>({ok:true,json:async()=>({output:[{content:[{type:"output_text",text:"not json"}]}]})})}),/not valid JSON/);
});
test("cost estimate is nonnegative",()=>assert.equal(estimateCostUsd(-10,-2),0));
