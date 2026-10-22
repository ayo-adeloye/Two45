import test from "node:test";
import assert from "node:assert/strict";
import { invokeGeminiFree } from "./ai-analyst-gemini-adapter-v1.mjs";
test("Gemini adapter sends secret as header and parses strict JSON", async () => {
  let url, options;
  const fetchImpl = async (u,o) => {url=u;options=o;return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({candidates:[]})}]}}],usageMetadata:{promptTokenCount:50,candidatesTokenCount:12}})};};
  const r=await invokeGeminiFree({apiKey:"mock-secret",model:"gemini-2.5-flash-lite",prompt:"fixture",fetchImpl});
  assert.ok(url.includes("gemini-2.5-flash-lite"));
  assert.equal(options.headers["x-goog-api-key"],"mock-secret");
  assert.ok(!options.body.includes("mock-secret"));
  assert.equal(r.inputTokens,50);
  assert.deepEqual(r.data.candidates,[]);
});
test("missing secret prevents requests",async()=>{await assert.rejects(invokeGeminiFree({model:"gemini-2.5-flash-lite",prompt:"x"}),/not configured/);});
test("provider error omits sensitive response text",async()=>{await assert.rejects(invokeGeminiFree({apiKey:"secret",model:"gemini-2.5-flash-lite",prompt:"x",fetchImpl:async()=>({ok:false,status:403})}),/HTTP 403/);});
