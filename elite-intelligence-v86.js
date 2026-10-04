export const ELITE_INTELLIGENCE_REVISION = "2026-10-04-evidence-review-v86";

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
  const board = flattenProbabilityBoard(probabilityBoard);
  const strongest = board[0] || null;
  const probability = strongest?.probability || 0;
  const homeIntel = intelligence?.home || {};
  const awayIntel = intelligence?.away || {};
  const homeSample = num(homeIntel.sampleSize,0);
  const awaySample = num(awayIntel.sampleSize,0);
  const sampleScore = clamp(Math.min(homeSample,awaySample)/10,0,1);
  const tierReliability = tier === 1 ? 0.92 : 0.82;

  const evidenceScore = Math.round(100 * clamp(
    dq*0.42 + probability*0.30 + sampleScore*0.16 + tierReliability*0.12,
    0,1
  ));

  const warnings = [];
  if (dq < (tier===1 ? 0.58 : 0.62)) warnings.push("DATA_QUALITY_BELOW_ELITE_RESEARCH_GATE");
  if (Math.min(homeSample,awaySample) < 5) warnings.push("SMALL_RECENT_SAMPLE");
  if (Math.abs(num(homeIntel.formPPG,1.5)-num(homeIntel.venuePPG,1.5)) > 0.8) warnings.push("HOME_FORM_VENUE_SPLIT");
  if (Math.abs(num(awayIntel.formPPG,1.5)-num(awayIntel.venuePPG,1.5)) > 0.8) warnings.push("AWAY_FORM_VENUE_SPLIT");

  if (strongest?.market === "MATCH_RESULT") {
    const formGap = num(homeIntel.formPPG,1.5)-num(awayIntel.formPPG,1.5);
    if (strongest.selection === "HOME" && formGap < -0.45) warnings.push("MODEL_FORM_CONTRADICTION");
    if (strongest.selection === "AWAY" && formGap > 0.45) warnings.push("MODEL_FORM_CONTRADICTION");
  }
  if (!strongest || probability < 0.62) warnings.push("NO_DOMINANT_MODEL_VIEW");

  const critical = warnings.some(x => [
    "DATA_QUALITY_BELOW_ELITE_RESEARCH_GATE",
    "MODEL_FORM_CONTRADICTION",
    "NO_DOMINANT_MODEL_VIEW"
  ].includes(x));

  const researchEligible =
    analysisStatus === "COMPLETE" &&
    evidenceScore >= (tier===1 ? 70 : 73) &&
    probability >= (tier===1 ? 0.66 : 0.68) &&
    !critical;

  return {
    fixtureId,kickoff,competition,competitionTier:tier,home,away,
    analysisStatus,
    evidenceScore,
    dataQuality:Math.round(dq*1000)/10,
    strongestModelView: strongest ? {
      market:strongest.market,
      selection:strongest.selection,
      probability:Math.round(probability*1000)/10
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
    readinessRule:"All active Tier 1 and Tier 2 fixtures must complete the current model before Elite research begins.",
    fixturesTotal:reviews.length,
    analyzed,
    remaining,
    researchEligible:researchQueue.length,
    externalResearchPolicy:"Outside sources are corroborating context only. Credible conflicting evidence must be recorded and can lower confidence.",
    researchQueue,
    reviews
  };
}
