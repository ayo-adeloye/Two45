// Standalone Cloudflare Worker entry point for manual AI shadow tests.
// Deploy separately from two45-live-worker; no public publishing routes.
import { runShadow } from "./ai-analyst-shadow-v1.mjs";
import { invokeGeminiFree } from "./ai-analyst-gemini-adapter-v1.mjs";
export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Not found", {status:404});
    if (!env.AI_SHADOW_ADMIN_TOKEN || request.headers.get("authorization") !== "Bearer " + env.AI_SHADOW_ADMIN_TOKEN)
      return new Response("Unauthorized", {status:401});
    if (!env.GEMINI_API_KEY) return Response.json({error:"Gemini secret missing"},{status:503});
    if (env.GEMINI_FREE_TIER_CONFIRMED !== "true") return Response.json({error:"Free tier not confirmed"},{status:503});
    let body;
    try { body = await request.json(); } catch { return Response.json({error:"Invalid JSON"},{status:400}); }
    if (!Array.isArray(body.fixtures) || body.fixtures.length > 5)
      return Response.json({error:"Maximum 5 fixtures per manual run"},{status:400});
    // Manual pilot only. No schedule, DB writes, or durable budget claims.
    const month = new Date().toISOString().slice(0,7);
    const result = await runShadow({ fixtures: body.fixtures, provider:"gemini", maxMatches:5,
      ledger:{month,spentUsd:0,reservedUsd:0,freeTier:true,paidBillingEnabled:false},
      invoke: ({model,prompt,maxOutputTokens})=>invokeGeminiFree({
        apiKey:env.GEMINI_API_KEY,model,prompt,maxOutputTokens
      }) });
    return Response.json(result, {headers:{"cache-control":"no-store"}});
  }
};
