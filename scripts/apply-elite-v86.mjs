import fs from "node:fs";

const path = "worker.js";
let code = fs.readFileSync(path, "utf8");

const importLine = 'import { buildEliteSlateReview } from "./elite-intelligence-v86.js";\n';
if (!code.includes(importLine.trim())) {
  code = importLine + code;
}

const healthAnchor = `/* =========================================================
   API-FOOTBALL
   ========================================================= */`;

if (!code.includes("async function eliteIntelligenceSnapshotV86")) {
  const helper = `
async function eliteIntelligenceSnapshotV86(env, date = easternDate(), persist = false) {
  const fixtureSnap = await fixtureSnapshotV19(env, date);
  const fixtures = arr(fixtureSnap?.fixtures)
    .filter(f => competitionTierV21(f?.league?.name, f?.league?.id) <= 2)
    .filter(f => !["CANC","PST","ABD","AWD","WO"].includes(String(f?.fixture?.status?.short || "").toUpperCase()));

  const ids = fixtures.map(fixtureIdV19).filter(Number.isFinite);
  const rows = ids.length ? await canonicalAnalysisRowsV2(env, ids) : [];
  const current = new Map(
    rows
      .filter(r => r?.model_version === MODEL_VERSION)
      .map(r => [Number(r.fixture_id), r])
  );

  const input = fixtures.map(f => {
    const row = current.get(fixtureIdV19(f));
    const result = row?.result || {};
    return {
      fixtureId: fixtureIdV19(f),
      kickoff: f?.fixture?.date || row?.kickoff_at || null,
      competition: f?.league?.name || row?.competition || null,
      competitionTier: competitionTierV21(f?.league?.name || row?.competition, f?.league?.id),
      home: f?.teams?.home?.name || row?.home_team || null,
      away: f?.teams?.away?.name || row?.away_team || null,
      analysisStatus: row?.status || "MISSING",
      dataQuality: row?.data_quality ?? null,
      probabilityBoard: result?.probabilityBoard || {},
      intelligence: result?.intelligence || null
    };
  });

  const review = buildEliteSlateReview(input);
  const payload = {
    ok: true,
    date,
    modelVersion: MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    ...review
  };

  if (persist) {
    await saveFeedSnapshot(env, "elite-intelligence:" + date, payload, 172800).catch(() => null);
  }
  return payload;
}

`;
  if (!code.includes(healthAnchor)) throw new Error("API-Football anchor missing");
  code = code.replace(healthAnchor, helper + healthAnchor);
}

const routeAnchor = `      if (
        url.pathname ===
        "/api/health"
      ) {`;

if (!code.includes('"/api/elite-intelligence"')) {
  const route = `      if (
        url.pathname ===
        "/api/elite-intelligence"
      ) {
        const requestedDate = String(url.searchParams.get("date") || easternDate());
        if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(requestedDate)) {
          return json({ok:false,error:"Invalid date."},400);
        }
        return json(await eliteIntelligenceSnapshotV86(env, requestedDate, false));
      }

`;
  if (!code.includes(routeAnchor)) throw new Error("Health route anchor missing");
  code = code.replace(routeAnchor, route + routeAnchor);
}

const cronAnchor = `  const modelCompletedAt = new Date().toISOString();`;
if (!code.includes('stage:"elite-intelligence"')) {
  const cronBlock = `  if (!pendingBacklogNow) {
    try {
      const eliteDates = shouldPreloadTomorrow()
        ? [tomorrowEasternDate(), easternDate()]
        : [easternDate()];
      for (const eliteDate of eliteDates) {
        const summary = await timedV2(
          eliteIntelligenceSnapshotV86(env, eliteDate, true),
          5000,
          "Elite intelligence review " + eliteDate
        );
        result.maintenance.push({
          ok: true,
          stage: "elite-intelligence",
          date: eliteDate,
          slateComplete: Boolean(summary?.slateComplete),
          fixturesTotal: num(summary?.fixturesTotal),
          analyzed: num(summary?.analyzed),
          remaining: num(summary?.remaining),
          researchEligible: num(summary?.researchEligible)
        });
      }
    } catch (e) {
      result.maintenance.push({ok:false,stage:"elite-intelligence",error:safeRefreshError(e)});
    }
  }

`;
  if (!code.includes(cronAnchor)) throw new Error("Cron anchor missing");
  code = code.replace(cronAnchor, cronBlock + cronAnchor);
}

fs.writeFileSync(path, code);
console.log("Elite intelligence integration applied.");
