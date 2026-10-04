import fs from "node:fs";
const path="worker.js";
let code=fs.readFileSync(path,"utf8");

const importLine='import { applyExternalResearch, summarizeExternalResearch } from "./elite-research-evidence-v90.js";\n';
if(!code.includes(importLine.trim())){
  const scopeImport='import { isEliteResearchFixture } from "./elite-slate-scope-v88.js";\n';
  if(code.includes(scopeImport)) code=code.replace(scopeImport,scopeImport+importLine);
  else code=importLine+code;
}

const oldReview='  const review = buildEliteSlateReview(input);\n  const payload = {';
const newReview=`  const review = buildEliteSlateReview(input);
  const hydratedReviews = await Promise.all(review.reviews.map(async item => {
    if (!item.researchEligible) {
      return {...item, externalResearch:null, finalReviewEligible:false, reviewRecommendation:"NOT_QUEUED"};
    }
    const researchRow = await getFeedSnapshot(env, "elite-research:" + item.fixtureId).catch(() => null);
    const evidence = arr(researchRow?.payload?.evidence);
    return applyExternalResearch(item, evidence);
  }));

  const finalReviewQueue = review.slateComplete
    ? hydratedReviews.filter(x => x.finalReviewEligible).sort((a,b) => b.evidenceScore - a.evidenceScore)
    : [];
  const contradicted = hydratedReviews.filter(x => x.researchStatus === "CONTRADICTED");
  const researchQueue = review.slateComplete
    ? hydratedReviews
        .filter(x => x.researchEligible && !x.finalReviewEligible && x.researchStatus !== "CONTRADICTED")
        .sort((a,b) => b.evidenceScore - a.evidenceScore)
    : [];

  const payload = {`;
if(!code.includes("const hydratedReviews = await Promise.all")){
  if(!code.includes(oldReview)) throw new Error("Elite review anchor missing");
  code=code.replace(oldReview,newReview);
}

const oldSpread=`    ...review
  };`;
const newSpread=`    ...review,
    reviews: hydratedReviews,
    researchQueue,
    researchEligible: hydratedReviews.filter(x => x.researchEligible).length,
    finalReviewReady: finalReviewQueue.length,
    finalReviewQueue,
    contradictedCount: contradicted.length,
    contradicted
  };`;
if(!code.includes("finalReviewReady: finalReviewQueue.length")){
  if(!code.includes(oldSpread)) throw new Error("Elite payload spread anchor missing");
  code=code.replace(oldSpread,newSpread);
}

const routeAnchor=`      if (
        url.pathname ===
        "/api/health"
      ) {`;

if(!code.includes('"/api/internal/elite-research"')){
  const route=`      if (
        url.pathname ===
          "/api/internal/elite-research" &&
        request.method ===
          "POST"
      ) {
        if (!internalRequestAuthorized(request, env)) {
          return json({ok:false,error:"Protected Two45 research endpoint."},403);
        }
        const body = await request.json().catch(() => ({}));
        const fixtureId = Number(body?.fixtureId);
        const evidence = arr(body?.evidence).slice(0,20);
        if (!Number.isFinite(fixtureId) || fixtureId <= 0) {
          return json({ok:false,error:"Valid fixtureId required."},400);
        }
        if (!evidence.length) {
          return json({ok:false,error:"At least one research evidence item is required."},400);
        }
        const summary = summarizeExternalResearch(evidence);
        const normalizedEvidence = arr(summary?.evidence);
        const researchPayload = {
          fixtureId,
          date: String(body?.date || easternDate()),
          submittedAt: new Date().toISOString(),
          submittedBy: String(body?.submittedBy || "authorized-research-process").slice(0,100),
          evidence: normalizedEvidence,
          summary
        };
        await saveFeedSnapshot(env, "elite-research:" + fixtureId, researchPayload, 7 * 86400);
        return json({ok:true,fixtureId,summary});
      }

`;
  if(!code.includes(routeAnchor)) throw new Error("Health route anchor missing");
  code=code.replace(routeAnchor,route+routeAnchor);
}

fs.writeFileSync(path,code);
console.log("External research evidence integration applied.");