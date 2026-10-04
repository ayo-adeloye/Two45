export const ELITE_INTELLIGENCE_REVISION = "2026-10-04-decision-useful-view-v89";

const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const num = (v,d=0) => Number.isFinite(Number(v)) ? Number(v) : d;
const p01 = value => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return clamp(n > 1 ? n / 100 : n, 0, 1);
};

export function flattenProbabilityBoard(board = {}) {
  const out = [];
  for (const [market,selections] of Object.entries(board || {})) {
    for (const [selection,probability] of Object.entries(selections || {})) {
      out.push({market,selection,probability:p01(probability)});
    }
  }
  return out.sort((a,b)=>b.probability-a.probability);
}

function researchSignalAdjustment(x) {
  const market=String(x?.market||"").toUpperCase();
  const selection=String(x?.selection||"").toUpperCase();

  if (market==="TOTAL_GOALS" && selection==="UNDER_4_5") return -0.35;
  if (market==="DOUBLE_CHANCE") return -0.20;
  if (market==="HANDICAP" && /PLUS_1_5/.test(selection)) return -0.30;
  if (["HOME_TEAM_GOALS","AWAY_TEAM_GOALS"].includes(market) && selection==="OVER_0_5") return -0.15;

  if (market==="MATCH_RESULT") return 0.12;
  if (market==="TOTAL_GOALS" && selection==="OVER_2_5") return 0.13;
  if (market==="TOTAL_GOALS" && selection==="OVER_3_5") return 0.10;
  if (market==="TOTAL_GOALS" && selection==="UNDER_3_5") return 0.05;
  if (market==="BTTS") return 0.10;
  if (market==="HANDICAP" && /MINUS/.test(selection)) return 0.10;
  if (["HOME_TEAM_GOALS","AWAY_TEAM_GOALS"].includes(market) && selection==="OVER_1_5") return 0.08;
  if (market==="TOTAL_GOALS" && selection==="OVER_1_5") return -0.03;
  return 0;
}

export function isSafetyOnlyView(x) {
  const market=String(x?.market||"").toUpperCase();
  const selection=String(x?.selection||"").toUpperCase();
  return (
    (market==="TOTAL_GOALS" && selection==="UNDER_4_5") ||
    market==="DOUBLE_CHANCE" ||
    (market==="HANDICAP" && /PLUS_1_5/.test(selection)) ||
    (["HOME_TEAM_GOALS","AWAY_TEAM_GOALS"].includes(market) && selection==="OVER_0_5")
  );
}

export function selectResearchModelView(board = {}) {
  const rows=flattenProbabilityBoard(board);
  const meaningful=rows
    .filter(x=>x.probability>=0.45)
    .filter(x=>!isSafetyOnlyView(x))
    .map(x=>({...x,researchScore:x.probability+researchSignalAdjustment(x)}))
    .sort((a,b)=>b.researchScore-a.researchScore || b.probability-a.probability);

  if (meaningful.length) return {...meaningful[0],safetyFallback:false};

  const fallback=rows[0]||null;
  return fallback ? {...fallback,researchScore:fallback.probability+researchSignalAdjustment(fallback),safetyFallback:true} : null;
}

export function reviewEliteFixture({
  fixtureId,
  kickoff,
  competition,
  competitionTier,
  home,
  away,
  analysisStatus,
  dataQuality,
  probabilityBoard,
  intelligence
}) {
  const tier = Math.max(1, Math.min(2, num(competitionTier,2)));
  const dq = p01(dataQuality);
  const researchView = selectResearchModelView(probabilityBoard);
  const probability = researchView?.probability || 0;
  const homeIntel = intelligence?.home || {};
  const awayIntel = intelligence?.away || {};
  const homeSample = num(homeIntel.sampleSize,0);
  const awaySample = num(awayIntel.sampleSize,0);
  const sampleScore = clamp(Math.min(homeSample,awaySample)/10,0,1);
  const tierReliability = tier === 1 ? 0.92 : 0.82;
  const signalFloor = tier===1 ? 0.58 : 0.60;

  const evidenceScore = Math.round(100 * clamp(
    dq*0.42 + probability*0.30 + sampleScore*0.16 + tierReliability*0.12,
    0,1
  ));

  const warnings = [];
  if (dq < (tier === 1 ? 0.58 : 0.62)) warnings.push("DATA_QUALITY_BELOW_ELITE_RESEARCH_GATE");
  if (Math.min(homeSample,awaySample) < 5) warnings.push("SMALL_RECENT_SAMPLE");
  if (Math.abs(num(homeIntel.formPPG,1.5)-num(homeIntel.venuePPG,1.5)) > 0.8) warnings.push("HOME_FORM_VENUE_SPLIT");
  if (Math.abs(num(awayIntel.formPPG,1.5)-num(awayIntel.venuePPG,1.5)) > 0.8) warnings.push("AWAY_FORM_VENUE_SPLIT");

  if (researchView?.market === "MATCH_RESULT") {
    const formGap = num(homeIntel.formPPG,1.5)-num(awayIntel.formPPG,1.5);
    if (researchView.selection === "HOME" && formGap < -0.45) warnings.push("MODEL_FORM_CONTRADICTION");
    if (researchView.selection === "AWAY" && formGap > 0.45) warnings.push("MODEL_FORM_CONTRADICTION");
  }
  if (researchView?.safetyFallback) warnings.push("SAFETY_ONLY_MODEL_VIEW");
  if (!researchView || probability < signalFloor) warnings.push("NO_MEANINGFUL_MODEL_SIGNAL");

  const critical = warnings.some(x => [
    "DATA_QUALITY_BELOW_ELITE_RESEARCH_GATE",
    "MODEL_FORM_CONTRADICTION",
    "SAFETY_ONLY_MODEL_VIEW",
    "NO_MEANINGFUL_MODEL_SIGNAL"
  ].includes(x));

  const researchEligible =
    analysisStatus === "COMPLETE" &&
    evidenceScore >= (tier===1 ? 70 : 73) &&
    probability >= signalFloor &&
    !critical;

  return {
    fixtureId,kickoff,competition,competitionTier:tier,home,away,
    analysisStatus,
    evidenceScore,
    dataQuality:Math.round(dq*1000)/10,
    strongestModelView:researchView ? {
      market:researchView.market,
      selection:researchView.selection,
      probability:Math.round(probability*1000)/10,
      safetyFallback:Boolean(researchView.safetyFallback)
    } : null,
    warnings,
    researchEligible,
    researchStatus:researchEligible ? "PENDING_EXTERNAL_CONTEXT" : "NOT_QUEUED",
    researchQuestions:researchEligible ? [
      "Check injuries, suspensions and likely lineup changes.",
      "Check manager and team news for rotation or schedule-congestion risk.",
      "Check whether recent tactical and scoring trends support or contradict the model view.",
      "Record credible contrary evidence and reduce confidence when warranted."
    ] : []
  };
}

export function buildEliteSlateReview(fixtures = []) {
  const reviews = fixtures.map(reviewEliteFixture);
  const analyzed = reviews.filter(x=>x.analysisStatus==="COMPLETE").length;
  const remaining = Math.max(0,reviews.length-analyzed);
  const slateComplete = reviews.length>0 && remaining===0;
  const researchQueue = slateComplete
    ? reviews.filter(x=>x.researchEligible).sort((a,b)=>b.evidenceScore-a.evidenceScore)
    : [];

  return {
    revision:ELITE_INTELLIGENCE_REVISION,
    stage:slateComplete ? "RESEARCH_READY" : "ANALYSIS_IN_PROGRESS",
    slateComplete,
    readinessRule:"All future Tier 1 and Tier 2 fixtures in scope must complete the current model before Elite research begins.",
    fixturesTotal:reviews.length,
    analyzed,
    remaining,
    researchEligible:researchQueue.length,
    externalResearchPolicy:"Outside sources are corroborating context only. Credible conflicting evidence must be recorded and can lower confidence.",
    researchQueue,
    reviews
  };
}
