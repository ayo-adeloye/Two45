/**
 * Two45 Cloudflare Worker
 * Version 20 â Priority Coverage and Market Expansion
 * Independent Model V1.5 â Broad Analysis
 */

const WORKER_VERSION = 76;
const PACING_REVISION = "2026-10-02.76-risky-diversity-elite-ready";
const PROVIDER_INTERVAL_MS = 7000;
const PRACTICAL_DAILY_CAP = 6500;
const MODEL_VERSION = "two45-independent-v1.9";
const DECISION_REVISION = "2026-10-01-bold-evidence-v1";
const REANALYZE_COOLDOWN_MS = 10 * 60 * 1000;

const API_BASE = "https://v3.football.api-sports.io";
const TIME_ZONE = "America/New_York";
const HARD_CAP = 7000;
const MAX_ODDS_PAGES = 15;
const DEFAULT_MODEL_BATCH = 9;
const FUTURE_FIXTURE_DAYS = 4;
const TOMORROW_PRELOAD_HOUR_ET = 20;
const TARGET_DAILY_REQUESTS = 6000;
const FAST_BASELINE_INTERVAL_MS = 2000;
const SHADOW_V40_DEFAULT_DAILY_CAP = 650;
const PROVIDER_BURST_MAX_CALLS_V69 = 4;
const PROVIDER_BURST_GAP_MS_V69 = 850;
let providerBurstV69 = null;


const LIVE_STATUSES = new Set([
  "1H",
  "HT",
  "2H",
  "ET",
  "BT",
  "P",
  "SUSP",
  "INT",
  "LIVE"
]);

const FINISHED_STATUSES = new Set([
  "FT",
  "AET",
  "PEN"
]);

const UPCOMING_STATUSES = new Set([
  "NS",
  "TBD"
]);

const SCORING_MARKETS = new Set([
  "Match Winner",
  "Goals Over/Under",
  "Both Teams Score",
  "Double Chance",
  "Asian Handicap",
  "Handicap Result",

  "Corners Over Under",
  "Corners Over/Under",
  "Total Corners (3 way)",
  "Total Corners",
  "Home Corners Over/Under",
  "Away Corners Over/Under",
  "Corner Handicap",

  "Cards Over/Under",
  "Total Cards",
  "Home Team Total Cards",
  "Away Team Total Cards",
  "Cards Asian Handicap",
  "Card Handicap",

  "Total ShotOnGoal",
  "Total Shots On Target",
  "Shots On Target",

  "Home Player Shots On Target Total",
  "Away Player Shots On Target Total",

  "Total Shots",
  "Home Player Shots Total",
  "Away Player Shots Total",

  "Total Shots Off Target",
  "Shots Off Target",
  "Total ShotOffGoal",

  "Home Player Shots Off Target Total",
  "Away Player Shots Off Target Total",

  "Home Team Score a Goal",
  "Away Team Score a Goal"
]);

/* =========================================================
   HELPERS
   ========================================================= */

const clamp = (v, a, b) =>
  Math.max(a, Math.min(b, v));

const num = (v, d = 0) =>
  Number.isFinite(Number(v))
    ? Number(v)
    : d;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS"
  };
}

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders()
      }
    }
  );
}

function internalRequestAuthorized(request, env) {
  const supplied = request.headers.get("x-two45-internal-key") || "";
  return Boolean(env.TWO45_INTERNAL_KEY && supplied === env.TWO45_INTERNAL_KEY);
}

function easternParts(date = new Date()) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hour12: false
      }
    ).formatToParts(date);

  return Object.fromEntries(
    parts.map(
      p => [p.type, p.value]
    )
  );
}

function easternDate() {
  const x = easternParts();

  return `${x.year}-${x.month}-${x.day}`;
}

function datePlusDays(dateString, days) {
  const [y, m, d] =
    String(dateString)
      .split("-")
      .map(Number);

  const dt =
    new Date(
      Date.UTC(
        y,
        m - 1,
        d + days,
        12
      )
    );

  return dt
    .toISOString()
    .slice(0, 10);
}

function tomorrowEasternDate() {
  return datePlusDays(
    easternDate(),
    1
  );
}

function easternHour() {
  return (
    num(
      easternParts().hour,
      0
    ) % 24
  );
}

function shouldPreloadTomorrow() {
  return (
    easternHour() >=
    TOMORROW_PRELOAD_HOUR_ET
  );
}

function providerQuietWindow() {
  // V30: provider work runs 24/7; pacing and caps control usage.
  return false;
}

function msUntilProviderResetV30() {
  const now = new Date();
  const nextReset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60000, nextReset - now.getTime());
}

function adaptiveProviderIntervalV30(pacing = {}) {
  const used = Math.max(0, num(pacing.used));
  if (used >= PRACTICAL_DAILY_CAP) return 60000;
  // Fresh-baseline mode is cadence-limited to about 4.2 calls/minute,
  // so a 7-second intra-cycle gap completes two matches inside one cron event.
  if (pacing.fastBaselineMode) return FAST_BASELINE_INTERVAL_MS;
  const targetRemaining = Math.max(1, TARGET_DAILY_REQUESTS - used);
  const ideal = Math.round(msUntilProviderResetV30() / targetRemaining);
  return Math.trunc(clamp(ideal, 12000, 22000));
}

function easternWeekday() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short"
  }).format(new Date());
}

function weekendModeV20() {
  const day = easternWeekday();
  const hour = easternHour();
  return (day === "Fri" && hour >= 20) || day === "Sat" || day === "Sun";
}

function weekendLadderDatesV67() {
  const today = easternDate();
  const day = easternWeekday();
  if (day === "Fri") return [datePlusDays(today, 1), datePlusDays(today, 2)];
  if (day === "Sat") return [today, datePlusDays(today, 1)];
  if (day === "Sun") return [today];
  return [];
}

function weekendDeadlineRushV67() {
  const day = easternWeekday();
  const hour = easternHour();
  return (day === "Fri" && hour >= 20) || (day === "Sat" && hour < 6);
}

function automaticAnalysisActiveV67() {
  return shouldPreloadTomorrow() || weekendDeadlineRushV67();
}

function fourDayFixtureDatesV20() {
  const today = easternDate();
  return Array.from({length: FUTURE_FIXTURE_DAYS}, (_, i) => datePlusDays(today, i));
}

function deepAnalysisDatesV20() {
  if (weekendModeV20()) return weekendLadderDatesV67();
  const today = easternDate();
  return [today, ...(shouldPreloadTomorrow() ? [datePlusDays(today, 1)] : [])];
}

function supa(env) {
  return {
    url:
      env.SUPABASE_URL ||
      env.TWO45_SUPABASE_URL ||
      env.PUBLIC_SUPABASE_URL,

    key:
      env.SUPABASE_SERVICE_ROLE_KEY ||
      env.SUPABASE_SERVICE_KEY ||
      env.TWO45_SUPABASE_SERVICE_ROLE_KEY ||
      env.SUPABASE_KEY
  };
}

function footballKey(env) {
  return (
    env.API_FOOTBALL_KEY ||
    env.FOOTBALL_API_KEY ||
    env.API_SPORTS_KEY ||
    env.RAPIDAPI_KEY ||
    null
  );
}

async function sb(
  env,
  path,
  options = {}
) {
  const { url, key } = supa(env);
  if (!url || !key) throw new Error("Supabase configuration missing");

  const {
    prefer,
    headers: extraHeaders = {},
    timeoutMs = 8000,
    signal,
    ...requestOptions
  } = options;

  let r;
  try {
    r = await fetch(
      url + "/rest/v1/" + path,
      {
        ...requestOptions,
        signal: signal || AbortSignal.timeout(Math.max(2000, num(timeoutMs, 8000))),
        headers: {
          apikey: key,
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
          Prefer: prefer || "return=representation",
          ...extraHeaders
        }
      }
    );
  } catch (e) {
    const msg = e?.name === "TimeoutError"
      ? "Supabase request timed out: " + String(path).split("?")[0]
      : (e?.message || String(e));
    throw new Error(msg);
  }

  const text = await r.text();
  if (!r.ok) throw new Error("Supabase " + r.status + ": " + text);
  return text ? JSON.parse(text) : null;
}

async function snapshot(
  env,
  key
) {
  const rows =
    await sb(
      env,
      `two45_feed_snapshots?snapshot_key=eq.${encodeURIComponent(
        key
      )}&select=payload,refreshed_at&limit=1`
    );

  return (
    Array.isArray(rows) &&
    rows.length
      ? rows[0]
      : null
  );
}

/* =========================================================
   BOARD ENDPOINTS
   ========================================================= */

function formatBoardSelectionsV20(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const cleanBookV64 = value => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const allowedPriceV64 = item => {
    if (!item || typeof item !== "object") return false;
    const price = num(item.sportsbookOdds, 0);
    return !price || cleanBookV64(item.bookmaker) === "bet365";
  };
  const formatItem = item => {
    if (!item || typeof item !== "object") return item;
    const qualified = item.decision === "PICK" && item.selection && String(item.selection).toUpperCase() !== "NO_BET" && allowedPriceV64(item);
    const alternatives = displayAlternativesV20(item.alternatives).filter(allowedPriceV64);
    return {
      ...item,
      market: qualified ? item.market : "NO_BET",
      selection: qualified ? displaySelectionV20(item.selection) : "NO_BET",
      probability: qualified ? item.probability : 0,
      fairOdds: qualified ? (item.fairOdds ?? null) : null,
      sportsbookOdds: qualified ? (item.sportsbookOdds ?? null) : null,
      bookmaker: qualified ? (item.bookmaker ?? null) : null,
      alternatives
    };
  };
  const visible = item => allowedPriceV64(item) && num(item?.competitionTier, 3) <= 3;
  return {
    ...payload,
    picks: Array.isArray(payload.picks) ? payload.picks.filter(visible).map(formatItem) : payload.picks,
    strongPicks: Array.isArray(payload.strongPicks) ? payload.strongPicks.filter(visible).map(formatItem) : payload.strongPicks,
    riskyPlays: Array.isArray(payload.riskyPlays) ? payload.riskyPlays.filter(visible).map(formatItem) : payload.riskyPlays,
    independentForecasts: Array.isArray(payload.independentForecasts) ? payload.independentForecasts.map(formatItem) : payload.independentForecasts
  };
}

function fixtureRowsV58(snapshotRow) {
  const p = snapshotRow?.payload || {};
  return Array.isArray(p.fixtures) ? p.fixtures :
    Array.isArray(p.response) ? p.response : [];
}

function mergeFixtureRowsV58(baseRows, overlayRows) {
  const map = new Map();
  for (const f of [...arr(baseRows), ...arr(overlayRows)]) {
    const id = f?.fixture?.id;
    if (id != null) map.set(String(id), f);
  }
  return [...map.values()].sort((a,b) =>
    Date.parse(a?.fixture?.date || 0) - Date.parse(b?.fixture?.date || 0)
  );
}


// Apply the same price bound to modeled and supplemental candidates.
function priceCoherentV60(probability, odds) {
  const p = Number(probability), o = Number(odds);
  if (!(o > 1)) return true; // An unpriced model view is not a priced offer.
  return !(o >= 3 && p >= 0.70 || o >= 4 && p >= 0.80 || p * o > 3);
}

function displayForecastV60(f) {
  const probability = Number(f.probability) > 1 ? Number(f.probability) / 100 : Number(f.probability);
  const unsupportedHandicap = f.market === "HANDICAP" && f.analysisSource === "cross-book-market-consensus";
  const blocked = f.decision === "PICK" && (!priceCoherentV60(probability, f.sportsbookOdds) || unsupportedHandicap);
  const alternatives = arr(f.alternatives).filter(a =>
    priceCoherentV60(Number(a.probability) > 1 ? Number(a.probability) / 100 : Number(a.probability), a.sportsbookOdds) &&
    !(a.market === "HANDICAP" && a.analysisSource === "cross-book-market-consensus")
  );
  if (!blocked) return {...f, alternatives};
  return {...f, decision: "NO_BET", selection: "NO_BET", qualityHold: true, alternatives,
    reasons: ["Saved pick withheld: price coherence or independent handicap support could not be confirmed."]};
}

// Board-level Bet365 promotion for already-completed analyses.
// Existing canonical rows can contain a strong model view with no sportsbook
// price while a usable Bet365 option sits in alternatives. The public board
// should publish only playable selections, never an unpriced model opinion.
function pricedBoardPickV65(f, competitionTier = 3) {
  if (!f || typeof f !== "object") return null;
  const normBook = value => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const p01 = value => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return n > 1 ? n / 100 : n;
  };
  const edgePct = x => {
    if (x?.valueEdgePct != null) return num(x.valueEdgePct, 0);
    const e = num(x?.valueEdge, 0);
    return Math.abs(e) <= 1 ? e * 100 : e;
  };
  const tier = Math.max(1, Math.min(4, Number(competitionTier) || 3));
  const dq = p01(f.dataQuality);
  const choices = [f, ...arr(f.alternatives)].filter(x =>
    normBook(x?.bookmaker) === "bet365" &&
    num(x?.sportsbookOdds, 0) >= 1.10 &&
    priceCoherentV60(p01(x?.probability), num(x?.sportsbookOdds, 0))
  );
  if (!choices.length || tier > 3) return null;

  const marketBoldness = x => {
    const market = String(x?.market || "").toUpperCase();
    const selection = String(x?.selection || "").toUpperCase();
    if (market === "MATCH_RESULT" && ["HOME","AWAY"].includes(selection)) return 6;
    if (market === "TOTAL_GOALS" && selection === "OVER_3_5") return 6;
    if (market === "TOTAL_GOALS" && selection === "OVER_2_5") return 5;
    if (market === "BTTS" && selection === "YES") return 5;
    if (["HOME_TEAM_GOALS","AWAY_TEAM_GOALS"].includes(market) && /OVER_(1_5|2_5|3_5)/.test(selection)) return 5;
    if (market === "HANDICAP" && /MINUS/.test(selection)) return 5;
    if (market.includes("CORNERS") || market.includes("CARDS") || market.includes("SHOTS")) return 4;
    if (market === "TOTAL_GOALS" && selection === "OVER_1_5") return 1;
    if (market === "DOUBLE_CHANCE") return 1;
    if (market === "HANDICAP" && /PLUS_1_5/.test(selection)) return 0;
    return 3;
  };

  // Elite is reliability-first. It can use any coherent Bet365 market, but
  // confidence, data quality and competition quality dominate the score.
  const eliteGate = tier === 1
    ? {p:0.69,q:0.50,minEdge:-8}
    : tier === 2
      ? {p:0.72,q:0.54,minEdge:-6}
      : {p:0.75,q:0.60,minEdge:-4};

  const eliteScore = x => {
    const p=p01(x.probability), e=edgePct(x), o=num(x.sportsbookOdds,0);
    const market=String(x.market||"").toUpperCase();
    const selection=String(x.selection||"").toUpperCase();
    const safety =
      market==="DOUBLE_CHANCE" ? .050 :
      market==="TOTAL_GOALS" && selection==="OVER_1_5" ? .038 :
      market==="TOTAL_GOALS" ? .025 :
      ["HOME_TEAM_GOALS","AWAY_TEAM_GOALS"].includes(market) ? .022 :
      market==="BTTS" ? .010 :
      market==="MATCH_RESULT" ? .004 : 0;
    return p*.76 + clamp(dq,0,1)*.18 + clamp(e/100,-.12,.30)*.04 + safety -
      Math.max(0,o-2.8)*.008;
  };

  const strong=choices.filter(x=>{
    const p=p01(x.probability), e=edgePct(x), lane=String(x.lane||"").toUpperCase();
    if(dq<eliteGate.q) return false;
    if(lane==="STRONG" && p>=eliteGate.p-.05 && e>=eliteGate.minEdge) return true;
    return p>=eliteGate.p && e>=eliteGate.minEdge;
  }).sort((a,b)=>eliteScore(b)-eliteScore(a));

  // Risky Value has no arbitrary upper odds ceiling and no fixed count.
  // The higher the price, the lower the raw probability can be, but every
  // candidate still needs positive model value, coherent Bet365 mapping and
  // enough data quality for the competition tier.
  const riskyQ = tier===1 ? .46 : tier===2 ? .50 : .54;

  // 3D principle: Risky Value is determined by the model evidence, not by
  // assuming a market is bold/safe because of its label or price band.
  // Bet365 price is still required to measure value, but it does not decide
  // which football outcome is "risky".
  const riskyScore=x=>{
    const p=p01(x.probability);
    const e=Math.max(0,edgePct(x));
    const uncertainty=1-clamp(p,0,1);
    const evidence=clamp(dq,0,1);
    return uncertainty*42 + evidence*28 + Math.min(e,30)*1.0 +
      Math.log(Math.max(1.01,num(x.sportsbookOdds,0)))*2;
  };

  const risky=choices.filter(x=>{
    const p=p01(x.probability), o=num(x.sportsbookOdds,0), e=edgePct(x);
    if(o<1.35 || dq<riskyQ || !priceCoherentV60(p,o)) return false;
    // Require a real positive value case and a non-trivial modeled chance.
    // No market-name exclusions and no odds-band probability assumptions.
    if(e<2 || p<0.18) return false;
    return true;
  }).sort((a,b)=>riskyScore(b)-riskyScore(a));

  const chosen=strong[0]||risky[0];
  if(!chosen) return null;
  const isRisky=!strong.length;
  return {
    ...f,
    ...chosen,
    decision:"PICK",
    pickType:isRisky?"RISKY_VALUE":"STRONG_PICK",
    band:isRisky?"Risky Play":"Top Pick",
    bookmaker:"Bet365",
    sportsbookOdds:num(chosen.sportsbookOdds,null),
    probability:Number(chosen.probability)>1?Number(chosen.probability):p01(chosen.probability)*100,
    valueEdgePct:edgePct(chosen),
    reasons:[isRisky
      ?"Bold Bet365-priced opportunity cleared Two45 probability, data-quality and value checks."
      :"Reliability-first Bet365 selection cleared Two45 Elite confidence and data-quality checks."],
    promotedFromAlternative:chosen!==f
  };
}

// Read-time presentation hydration. Reuse saved canonical results without
// claiming jobs, evaluating fixtures, calling providers, or writing snapshots.
function presentCanonicalBoardV59(base, fixtures, canonicalRows) {
  // One source of truth: the canonical analysis state table.
  // Prefer the current model version; use a legacy completed record only until
  // the current version finishes for that fixture.
  const chosenRows = new Map();
  for (const row of canonicalRows) {
    if (row.status !== "COMPLETE") continue;
    const forecast = canonicalForecastV2(row);
    if (!forecast) continue;
    const id = Number(row.fixture_id);
    const rank = row.model_version === MODEL_VERSION ? 2 : 1;
    const completed = Date.parse(row.completed_at || row.updated_at || row.requested_at || 0);
    const prev = chosenRows.get(id);
    if (!prev || rank > prev.rank || (rank === prev.rank && completed > prev.completed)) {
      chosenRows.set(id, {row, forecast, rank, completed});
    }
  }

  const independentForecasts = fixtures.map(fixtureIdV19)
    .map(id => chosenRows.get(Number(id))?.forecast)
    .filter(Boolean)
    .map(displayForecastV60);

  const byId = new Map(fixtures.map(f => [fixtureIdV19(f), f]));
  const playableForecasts = independentForecasts
    .map(f => {
      const fixture = byId.get(Number(f.fixtureId));
      const tier = competitionTierV21(f.league || fixture?.league?.name, fixture?.league?.id);
      return pricedBoardPickV65(f, tier);
    })
    .filter(Boolean);
  const picks = playableForecasts
    .filter(f => {
      const status = byId.get(Number(f.fixtureId))?.fixture?.status?.short;
      return f.decision === "PICK" && (
        UPCOMING_STATUSES.has(status) ||
        (LIVE_STATUSES.has(status) && f.live === true &&
          Date.now() - Date.parse(f.generatedAt || 0) < 15 * 60000)
      );
    })
    .map(f => {
      const fixture = byId.get(Number(f.fixtureId));
      const competitionTier = competitionTierV21(f.league || fixture?.league?.name, fixture?.league?.id);
      const tierBonus = competitionTier === 1 ? 10 : competitionTier === 2 ? 4 : competitionTier === 3 ? 1 : 0;
      const price = num(f.sportsbookOdds, 0);
      const elitePriceBonus = price >= 1.18 && price <= 1.85 ? 3 : 0;
      return {
        ...f,
        fixtureId: String(f.fixtureId),
        competitionTier,
        band: f.pickType === "RISKY_VALUE" ? "Risky Play" : "Top Pick",
        score: num(f.probability),
        rankScore: num(f.probability) * 0.7 + num(f.valueEdgePct) * 0.3 + tierBonus + elitePriceBonus
      };
    })
    .sort((a,b) => b.rankScore - a.rankScore);


  const riskyMarketRankV61 = f => {
    const market = String(f?.market || "").toUpperCase();
    const selection = String(f?.selection || "").toUpperCase();
    if (market === "MATCH_RESULT" && ["HOME","AWAY"].includes(selection)) return 6;
    if (market === "TOTAL_GOALS" && selection === "OVER_3_5") return 6;
    if (market === "TOTAL_GOALS" && selection === "OVER_2_5") return 5;
    if (market === "BTTS" && selection === "YES") return 5;
    if (["HOME_TEAM_GOALS","AWAY_TEAM_GOALS"].includes(market) && /OVER_(1_5|2_5)/.test(selection)) return 5;
    if (market === "HANDICAP" && /MINUS/.test(selection)) return 4;
    if (market === "TOTAL_GOALS" && selection === "OVER_1_5") return 1;
    if (market === "HANDICAP" && /PLUS_1_5/.test(selection)) return 0;
    return 3;
  };

  const riskyCandidateV62 = (parent, candidate) => {
    const price = num(candidate?.sportsbookOdds, 0);
    const probability = Number(candidate?.probability) > 1
      ? Number(candidate.probability) / 100
      : num(candidate?.probability, 0);
    const edgeRaw = candidate?.valueEdgePct ?? candidate?.valueEdge;
    const edgePct = edgeRaw == null
      ? num(parent?.valueEdgePct, 0)
      : (Math.abs(num(edgeRaw,0)) <= 1 ? num(edgeRaw,0) * 100 : num(edgeRaw,0));
    const dqRaw = candidate?.dataQuality ?? parent?.dataQuality;
    const dq = Number(dqRaw) > 1 ? Number(dqRaw)/100 : num(dqRaw,0);
    const tier = num(parent?.competitionTier, 3);
    const qFloor = tier === 1 ? .46 : tier === 2 ? .50 : .54;

    if (price < 1.35 || dq < qFloor || !priceCoherentV60(probability, price)) return null;
    if (edgePct < 2 || probability < 0.18) return null;

    const uncertainty = 1 - clamp(probability,0,1);
    return {
      ...parent,
      ...candidate,
      fixtureId:String(parent.fixtureId),
      decision:"PICK",
      pickType:"RISKY_VALUE",
      band:"Risky Play",
      probability:Number(candidate?.probability)>1?Number(candidate.probability):probability*100,
      valueEdgePct:edgePct,
      competitionTier:parent.competitionTier,
      // Data first: higher-variance model outcomes with stronger evidence/value
      // rise naturally. Market name and odds band do not define risk.
      rankScore:uncertainty*42 + dq*28 + Math.min(Math.max(edgePct,0),30) +
        Math.log(Math.max(1.01,price))*2,
      promotedFromAlternative:candidate!==parent
    };
  };

  // Tier 4 remains manual-only. Risky Value has no artificial result-count
  // ceiling and no maximum odds ceiling; evidence determines how many surface.
  const automaticPicks = picks.filter(f => num(f.competitionTier,4) <= 3);
  const riskyByFixture = new Map();
  for (const parent of automaticPicks) {
    for (const candidate of [parent, ...arr(parent.alternatives)]) {
      const promoted = riskyCandidateV62(parent,candidate);
      if (!promoted) continue;
      const id=String(parent.fixtureId), prev=riskyByFixture.get(id);
      if (!prev || promoted.rankScore > prev.rankScore) riskyByFixture.set(id,promoted);
    }
  }

  // Public Strong/Super Picks are intentionally scarce: show only the best 15
  // data-backed selections for the day. This is a presentation/qualification
  // cap, not a reason to stop analyzing the wider fixture pool.
  const strongPicks = automaticPicks
    .filter(f => f.pickType !== "RISKY_VALUE")
    .sort((a,b) => b.rankScore - a.rankScore)
    .slice(0,15);
  const strongFixtureIds = new Set(
    strongPicks.map(f => String(f.fixtureId || f.providerMatchId || "")).filter(Boolean)
  );

  // Keep the public lanes distinct. A fixture that already earned a Strong Pick
  // may still retain bold alternatives inside its analysis detail, but it must
  // not also appear as a separate Risky Value card.
  const rankedRisky=[...riskyByFixture.values()]
    .filter(f => !strongFixtureIds.has(String(f.fixtureId || f.providerMatchId || "")))
    .sort((a,b)=>b.rankScore-a.rankScore || num(b.valueEdgePct,0)-num(a.valueEdgePct,0));

  const riskyBuckets = new Map();
  for (const x of rankedRisky) {
    const sig = String(x.market||"")+"|"+String(x.selection||"");
    if (!riskyBuckets.has(sig)) riskyBuckets.set(sig,[]);
    riskyBuckets.get(sig).push(x);
  }
  const riskyPlays=[];
  while (riskyPlays.length < rankedRisky.length) {
    let added=false;
    for (const bucket of riskyBuckets.values()) {
      if (bucket.length) { riskyPlays.push(bucket.shift()); added=true; }
    }
    if (!added) break;
  }

  const eligiblePicks = [...strongPicks, ...riskyPlays];

  return formatBoardSelectionsV20({...base, independentForecasts,
    analyzedCount: independentForecasts.length, picks: eligiblePicks,
    strongPicks,
    riskyPlays});
}

async function hydrateBoardFixturesV58(env, date, board, includeLive = false) {
  const fixtureSnap = await snapshot(env, `fixtures:${date}`).catch(() => null);
  let games = fixtureRowsV58(fixtureSnap);
  if (!games.length) games = arr(board?.games || board?.fixtures);

  if (includeLive) {
    const liveSnap = await snapshot(env, "live").catch(() => null);
    // Cached live snapshots may outlive their games. Keep genuine recent
    // carryovers without importing days-old fixtures into today's display.
    const liveRows = fixtureRowsV58(liveSnap).filter(f => {
      const age = Date.now() - Date.parse(f?.fixture?.date);
      return LIVE_STATUSES.has(f?.fixture?.status?.short) && age >= 0 && age < 6 * 60 * 60000;
    });
    games = mergeFixtureRowsV58(games, liveRows);
  }

  try {
    const rows = await canonicalAnalysisRowsV2(env, games.map(fixtureIdV19));
    board = presentCanonicalBoardV59(board || {}, games, rows);
  } catch (_) {
    // Preserve the last saved board if the display read is unavailable.
  }

  return {
    ...(board || {}),
    ok: true,
    date,
    games,
    fixtures: games,
    fixtureFeedUpdatedAt: fixtureSnap?.refreshed_at || null
  };
}

async function todayBoard(env) {
  const d = easternDate();
  let s = await snapshot(env, `model-board:${d}`);

  if (!s) {
    const fixtures = await snapshot(env, `fixtures:${d}`).catch(() => null);
    if (fixtureRowsV58(fixtures).length) {
      await evaluateBoardV19(env, d, true).catch(() => null);
      s = await snapshot(env, `model-board:${d}`).catch(() => null);
    }
  }

  const board = s
    ? formatBoardSelectionsV20(s.payload)
    : {ok:true, date:d, games:[], fixtures:[], picks:[], strongPicks:[], riskyPlays:[]};

  // Display hydration only: use already-cached fixtures and live scores.
  // This never calls API-Football and never changes analysis/queue behavior.
  return hydrateBoardFixturesV58(env, d, board, true);
}

async function fixturesToday(env) {
  const d =
    easternDate();

  const s =
    await snapshot(
      env,
      `fixtures:${d}`
    );

  return s
    ? s.payload
    : {
        ok: false,
        date: d,
        fixtures: []
      };
}

async function liveBoard(env) {
  const s =
    await snapshot(
      env,
      "live"
    );

  return s
    ? s.payload
    : {
        ok: true,
        live: [],
        upcoming: [],
        finished: []
      };
}

async function oddsToday(env) {
  const d =
    easternDate();

  const s =
    await snapshot(
      env,
      `odds:${d}`
    );

  return s
    ? s.payload
    : {
        ok: true,
        date: d,
        response: [],
        total: 0
      };
}

async function fixturesTomorrow(env) {
  const d =
    tomorrowEasternDate();

  if (!shouldPreloadTomorrow()) {
    return {
      ok: true,
      date: d,
      waitingUntil:
        "20:00 America/New_York",
      fixtures: [],
      total: 0
    };
  }

  const s =
    await snapshot(
      env,
      `fixtures:${d}`
    );

  return s
    ? s.payload
    : {
        ok: true,
        date: d,
        fixtures: [],
        total: 0
      };
}

async function oddsTomorrow(env) {
  const d =
    tomorrowEasternDate();

  if (!shouldPreloadTomorrow()) {
    return {
      ok: true,
      date: d,
      waitingUntil:
        "20:00 America/New_York",
      response: [],
      total: 0
    };
  }

  const s =
    await snapshot(
      env,
      `odds:${d}`
    );

  return s
    ? s.payload
    : {
        ok: true,
        date: d,
        response: [],
        total: 0
      };
}

async function tomorrowBoard(env) {
  const d =
    tomorrowEasternDate();

  if (!shouldPreloadTomorrow()) {
    return {
      ok: true,
      date: d,
      waitingUntil:
        "20:00 America/New_York",
      games: [],
      picks: []
    };
  }

  const s =
    await snapshot(
      env,
      `model-board:${d}`
    );

  const board = s
    ? formatBoardSelectionsV20(s.payload)
    : {
        ok: true,
        date: d,
        games: [],
        fixtures: [],
        picks: [],
        strongPicks: [],
        riskyPlays: []
      };

  return hydrateBoardFixturesV58(env, d, board, false);
}

async function liveOdds(env) {
  const s =
    await snapshot(
      env,
      "live-odds"
    );

  return s
    ? s.payload
    : {
        ok: true,
        response: [],
        total: 0
      };
}


/* =========================================================
   RECORD BOARD
   ========================================================= */

function statusBucketV20(value) {
  const s = String(value || "").trim().toUpperCase();
  if (["WIN", "WON", "SUCCESS"].includes(s)) return "WIN";
  if (["LOSS", "LOST", "LOSE", "FAILED"].includes(s)) return "LOSS";
  if (["VOID", "PUSH", "CANCELLED", "CANCELED"].includes(s)) return "VOID";
  if (["LIVE", "IN_PLAY", "IN-PLAY"].includes(s)) return "LIVE";
  return "PENDING";
}

function firstDefinedV20(obj, keys, fallback = null) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return fallback;
}

function normalizeRecordRowV20(row, source) {
  const result = statusBucketV20(firstDefinedV20(row, ["result", "status", "settlement_status", "outcome"], "PENDING"));
  return {
    source,
    id: firstDefinedV20(row, ["id", "forecast_key", "pick_key"]),
    fixtureId: num(firstDefinedV20(row, ["fixture_id", "provider_match_id"]), null),
    kickoffAt: firstDefinedV20(row, ["kickoff_at", "fixture_date", "created_at"]),
    competition: firstDefinedV20(row, ["competition", "league"]),
    homeTeam: firstDefinedV20(row, ["home_team", "home"]),
    awayTeam: firstDefinedV20(row, ["away_team", "away"]),
    market: firstDefinedV20(row, ["market"]),
    selection: displaySelectionV20(firstDefinedV20(row, ["selection", "pick"])),
    odds: num(firstDefinedV20(row, ["odds", "sportsbook_odds", "price"]), null),
    probability: num(firstDefinedV20(row, ["probability", "model_probability"]), null),
    confidence: firstDefinedV20(row, ["confidence_tier", "band", "confidence"]),
    result,
    score: firstDefinedV20(row, ["score", "final_score"]),
    settledAt: firstDefinedV20(row, ["settled_at", "completed_at", "updated_at"]),
    createdAt: firstDefinedV20(row, ["created_at", "published_at", "kickoff_at"]),
    raw: row
  };
}

async function publishedPickRowsV20(env, limit = 500) {
  try {
    const rows = await sb(env, `published_picks?select=*&order=created_at.desc&limit=${Math.max(1, Math.min(limit, 1000))}`);
    return Array.isArray(rows) ? rows : [];
  } catch (_) {
    try {
      const rows = await sb(env, `published_picks?select=*&limit=${Math.max(1, Math.min(limit, 1000))}`);
      return Array.isArray(rows) ? rows : [];
    } catch (_) {
      return [];
    }
  }
}

async function forecastRecordRowsV20(env, limit = 500) {
  try {
    const rows = await sb(env, `two45_model_forecasts?select=*&order=created_at.desc&limit=${Math.max(1, Math.min(limit, 1000))}`);
    return Array.isArray(rows) ? rows : [];
  } catch (_) {
    return [];
  }
}

async function recordHistoryV20(env, limit = 250) {
  const rowsRaw = await sb(
    env,
    `two45_model_forecasts?decision=eq.PICK&selection=neq.NO_BET&select=*&order=kickoff_at.desc&limit=${Math.max(1, Math.min(limit, 1000))}`
  );
  const rows = Array.isArray(rowsRaw)
    ? rowsRaw.map(x => normalizeRecordRowV20(x, "published_pick"))
    : [];
  const seen = new Set();
  const deduped = [];
  for (const row of rows) {
    const key = [row.fixtureId, row.market, row.selection].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  deduped.sort((a,b) => Date.parse(b.kickoffAt || b.createdAt || 0) - Date.parse(a.kickoffAt || a.createdAt || 0));
  return {
    ok:true,
    total:deduped.length,
    publishedCount:deduped.length,
    forecastCount:0,
    source:"two45_model_forecasts:decision=PICK",
    rows:deduped.slice(0,limit)
  };
}

async function recordSummaryV20(env) {
  try {
    const rpc = await sb(env, "rpc/two45_record_summary", {method:"POST",body:JSON.stringify({})});
    if (rpc != null) return {ok:true,source:"rpc",summary:rpc};
  } catch (_) {}
  const history = await recordHistoryV20(env, 1000);
  const settled = history.rows.filter(x => ["WIN","LOSS","VOID"].includes(x.result));
  const wins = settled.filter(x => x.result === "WIN").length;
  const losses = settled.filter(x => x.result === "LOSS").length;
  const voids = settled.filter(x => x.result === "VOID").length;
  const live = history.rows.filter(x => x.result === "LIVE").length;
  const pendingOnly = history.rows.filter(x => x.result === "PENDING").length;
  return {
    ok:true,
    source:"computed",
    summary:{
      total:history.total,
      settled:settled.length,
      wins,
      losses,
      pushes:0,
      voids,
      live,
      pendingOnly,
      pending:live + pendingOnly,
      unsettled:live + pendingOnly,
      hitRate:(wins + losses) > 0 ? wins / (wins + losses) : null,
      publishedCount:history.publishedCount,
      forecastCount:history.forecastCount
    }
  };
}

/* =========================================================
   INDEPENDENT MODEL
   ========================================================= */

function poisson(
  k,
  lambda
) {
  if (lambda <= 0) {
    return k === 0
      ? 1
      : 0;
  }

  let f = 1;

  for (
    let i = 2;
    i <= k;
    i++
  ) {
    f *= i;
  }

  return (
    Math.exp(-lambda) *
    Math.pow(lambda, k) /
    f
  );
}

function shrink(
  v,
  n,
  baseline,
  strength = 8
) {
  n =
    Math.max(
      0,
      num(n)
    );

  const w =
    n /
    (n + strength);

  return (
    w *
      num(
        v,
        baseline
      ) +
    (1 - w) *
      baseline
  );
}

function expectedGoals(
  home,
  away,
  ctx = {}
) {
  const lh =
    num(
      ctx.leagueHomeGoalsAvg,
      1.45
    );

  const la =
    num(
      ctx.leagueAwayGoalsAvg,
      1.15
    );

  const hgf =
    shrink(
      home.homeGoalsForAvg ??
        home.goalsForAvg,
      home.sampleSize,
      lh
    );

  const hga =
    shrink(
      home.homeGoalsAgainstAvg ??
        home.goalsAgainstAvg,
      home.sampleSize,
      la
    );

  const agf =
    shrink(
      away.awayGoalsForAvg ??
        away.goalsForAvg,
      away.sampleSize,
      la
    );

  const aga =
    shrink(
      away.awayGoalsAgainstAvg ??
        away.goalsAgainstAvg,
      away.sampleSize,
      lh
    );

  let hx =
    Math.sqrt(
      Math.max(
        0.05,
        hgf
      ) *
      Math.max(
        0.05,
        aga
      )
    );

  let ax =
    Math.sqrt(
      Math.max(
        0.05,
        agf
      ) *
      Math.max(
        0.05,
        hga
      )
    );

  const form =
    clamp(
      (
        num(
          home.formPointsPerGame,
          1.5
        ) -
        num(
          away.formPointsPerGame,
          1.5
        )
      ) / 3,
      -0.35,
      0.35
    );

  hx *=
    1 +
    form * 0.12;

  ax *=
    1 -
    form * 0.10;

  // V20.2 richer team intelligence: use venue strength and scoring resilience
  // already present in /teams/statistics. Adjustments are deliberately bounded.
  const venueEdge = clamp((num(home.homePointsPerGame,1.5)-num(away.awayPointsPerGame,1.5))/3,-0.30,0.30);
  hx *= 1 + venueEdge * 0.08;
  ax *= 1 - venueEdge * 0.07;

  const homeAttackReliability = clamp(1-num(home.failedToScoreRate,0),0.35,1);
  const awayAttackReliability = clamp(1-num(away.failedToScoreRate,0),0.35,1);
  const homeDefResilience = clamp(num(home.cleanSheetRate,0),0,0.65);
  const awayDefResilience = clamp(num(away.cleanSheetRate,0),0,0.65);
  hx *= clamp(0.94 + homeAttackReliability*0.08 - awayDefResilience*0.06,0.90,1.06);
  ax *= clamp(0.94 + awayAttackReliability*0.08 - homeDefResilience*0.06,0.90,1.06);

  hx *=
    1 -
    clamp(
      num(
        home.absenceImpact,
        0
      ),
      0,
      1
    ) *
      0.12;

  ax *=
    1 -
    clamp(
      num(
        away.absenceImpact,
        0
      ),
      0,
      1
    ) *
      0.12;

  return {
    home:
      clamp(
        hx,
        0.15,
        4
      ),

    away:
      clamp(
        ax,
        0.15,
        4
      )
  };
}

function probabilities(
  hx,
  ax,
  homeGoals = 0,
  awayGoals = 0
) {
  const out = {
    MATCH_RESULT: {
      HOME: 0,
      DRAW: 0,
      AWAY: 0
    },

    TOTAL_GOALS: {
      OVER_1_5: 0,
      OVER_2_5: 0,
      OVER_3_5: 0,
      UNDER_3_5: 0,
      UNDER_4_5: 0
    },

    BTTS: {
      YES: 0,
      NO: 0
    },

    HANDICAP: {
      HOME_MINUS_0_5: 0,
      HOME_PLUS_0_5: 0,
      AWAY_MINUS_0_5: 0,
      AWAY_PLUS_0_5: 0,
      HOME_MINUS_1_5: 0,
      HOME_PLUS_1_5: 0,
      AWAY_MINUS_1_5: 0,
      AWAY_PLUS_1_5: 0
    },

    HOME_TEAM_GOALS: {
      OVER_0_5: 0,
      OVER_1_5: 0
    },

    AWAY_TEAM_GOALS: {
      OVER_0_5: 0,
      OVER_1_5: 0
    }
  };

  let total = 0;

  const cells = [];

  for (
    let h = 0;
    h <= 7;
    h++
  ) {
    for (
      let a = 0;
      a <= 7;
      a++
    ) {
      const p =
        poisson(
          h,
          hx
        ) *
        poisson(
          a,
          ax
        );

      cells.push([
        h,
        a,
        p
      ]);

      total += p;
    }
  }

  for (
    const [
      remainingH,
      remainingA,
      raw
    ] of cells
  ) {
    const h = remainingH + homeGoals;
    const a = remainingA + awayGoals;
    const p =
      raw / total;

    const g =
      h + a;

    if (h > a) {
      out.MATCH_RESULT.HOME += p;
    } else if (h === a) {
      out.MATCH_RESULT.DRAW += p;
    } else {
      out.MATCH_RESULT.AWAY += p;
    }

    const diff = h - a;
    if (diff >= 1) out.HANDICAP.HOME_MINUS_0_5 += p;
    if (diff >= 0) out.HANDICAP.HOME_PLUS_0_5 += p;
    if (diff <= -1) out.HANDICAP.AWAY_MINUS_0_5 += p;
    if (diff <= 0) out.HANDICAP.AWAY_PLUS_0_5 += p;
    if (diff >= 2) out.HANDICAP.HOME_MINUS_1_5 += p;
    if (diff >= -1) out.HANDICAP.HOME_PLUS_1_5 += p;
    if (diff <= -2) out.HANDICAP.AWAY_MINUS_1_5 += p;
    if (diff <= 1) out.HANDICAP.AWAY_PLUS_1_5 += p;

    if (g > 1) {
      out.TOTAL_GOALS.OVER_1_5 += p;
    }

    if (g > 2) {
      out.TOTAL_GOALS.OVER_2_5 += p;
    }

    if (g > 3) {
      out.TOTAL_GOALS.OVER_3_5 += p;
    }

    if (g < 4) {
      out.TOTAL_GOALS.UNDER_3_5 += p;
    }

    if (g < 5) {
      out.TOTAL_GOALS.UNDER_4_5 += p;
    }

    if (
      h > 0 &&
      a > 0
    ) {
      out.BTTS.YES += p;
    }

    if (h > 0) {
      out.HOME_TEAM_GOALS.OVER_0_5 += p;
    }

    if (h > 1) {
      out.HOME_TEAM_GOALS.OVER_1_5 += p;
    }

    if (a > 0) {
      out.AWAY_TEAM_GOALS.OVER_0_5 += p;
    }

    if (a > 1) {
      out.AWAY_TEAM_GOALS.OVER_1_5 += p;
    }
  }

  out.DOUBLE_CHANCE = {
    HOME_OR_DRAW: out.MATCH_RESULT.HOME + out.MATCH_RESULT.DRAW,
    DRAW_OR_AWAY: out.MATCH_RESULT.DRAW + out.MATCH_RESULT.AWAY,
    HOME_OR_AWAY: out.MATCH_RESULT.HOME + out.MATCH_RESULT.AWAY
  };

  out.BTTS.NO =
    1 -
    out.BTTS.YES;

  for (const selections of Object.values(out)) {
    for (const key of Object.keys(selections)) selections[key] = clamp(selections[key], 0, 1);
  }
  return out;
}

function quality(
  home,
  away,
  ctx = {}
) {
  return clamp(
    clamp(
      num(
        home.sampleSize
      ) / 10,
      0,
      1
    ) *
      0.25 +

    clamp(
      num(
        away.sampleSize
      ) / 10,
      0,
      1
    ) *
      0.25 +

    clamp(
      num(
        home.lineupCertainty,
        0.7
      ),
      0,
      1
    ) *
      0.15 +

    clamp(
      num(
        away.lineupCertainty,
        0.7
      ),
      0,
      1
    ) *
      0.15 +

    clamp(
      num(
        ctx.competitionReliability,
        0.75
      ),
      0,
      1
    ) *
      0.20,

    0,
    1
  );
}

function analyzeMatch(input) {
  const home =
    input.home || {};

  const away =
    input.away || {};

  const ctx =
    input.context || {};

  const xg =
    expectedGoals(
      home,
      away,
      ctx
    );

  const probs =
    probabilities(
      xg.home,
      xg.away
    );

  return {
    modelVersion:
      MODEL_VERSION,

    coreUsesSportsbookOdds:
      true,

    homeTeam:
      input.homeTeam ||
      null,

    awayTeam:
      input.awayTeam ||
      null,

    expectedGoals:
      xg,

    intelligence: {
      home: {formPPG: home.formPointsPerGame, venuePPG: home.homePointsPerGame, winRate: home.winRate,
        cleanSheetRate: home.cleanSheetRate, failedToScoreRate: home.failedToScoreRate, sampleSize: home.sampleSize},
      away: {formPPG: away.formPointsPerGame, venuePPG: away.awayPointsPerGame, winRate: away.winRate,
        cleanSheetRate: away.cleanSheetRate, failedToScoreRate: away.failedToScoreRate, sampleSize: away.sampleSize},
      marketProfile: {home: home.marketProfile || null, away: away.marketProfile || null},
      source: "API-Football team statistics + Two45 independent weighting"
    },

    dataQuality:
      quality(
        home,
        away,
        ctx
      ),

    competitionReliability:
      clamp(
        num(
          ctx.competitionReliability,
          0.75
        ),
        0,
        1
      ),

    lineupCertainty:
      clamp(
        (
          num(
            home.lineupCertainty,
            0.7
          ) +
          num(
            away.lineupCertainty,
            0.7
          )
        ) / 2,
        0,
        1
      ),

    probabilities:
      probs,

    generatedAt:
      new Date()
        .toISOString()
  };
}

function flatten(probs) {
  const out = [];

  for (
    const [
      market,
      selections
    ] of Object.entries(
      probs
    )
  ) {
    for (
      const [
        selection,
        p
      ] of Object.entries(
        selections
      )
    ) {
      out.push({
        market,
        selection,
        probability: p,

        fairOdds:
          p > 0
            ? 1 / p
            : null
      });
    }
  }

  return out;
}

function selectIndependent(
  analysis,
  marketOdds = [],
  competitionTier = 4
) {
  const tier = Math.max(1, Math.min(4, Number(competitionTier) || 4));
  const tierGate = {
    1: { strongQ: 0.52, riskyQ: 0.46, convictionQ: 0.50, winFloor: 0.66, o25Floor: 0.61 },
    2: { strongQ: 0.58, riskyQ: 0.50, convictionQ: 0.57, winFloor: 0.70, o25Floor: 0.64 },
    3: { strongQ: 0.64, riskyQ: 0.54, convictionQ: 0.64, winFloor: 0.73, o25Floor: 0.67 },
    4: { strongQ: 0.68, riskyQ: 0.56, convictionQ: 0.70, winFloor: 0.76, o25Floor: 0.70 }
  }[tier];
  const modeled =
    flatten(
      analysis.probabilities
    );

  const strong = [];
  const risky = [];
  // Model-only convictions are useful analysis context, but a published pick
  // must have a real Bet365 price. Keep unpriced convictions out of the final
  // strong/risky lanes so the board never advertises a pick users cannot play.
  const modelConvictionWatch = [];

  for (
    const group
    of marketOdds
  ) {
    const valid =
      (
        group.outcomes ||
        []
      ).filter(
        x =>
          num(
            x.odds
          ) > 1
      );

    const sum =
      valid.reduce(
        (
          s,
          x
        ) =>
          s +
          1 /
            num(
              x.odds
            ),
        0
      );

    if (
      valid.length < 2 ||
      sum <= 0
    ) {
      continue;
    }

    for (
      const price
      of valid
    ) {
      const m =
        modeled.find(
          x =>
            x.market ===
              group.market &&
            x.selection ===
              price.selection
        );

      if (!m) {
        continue;
      }

      const nv =
        (
          1 /
          num(
            price.odds
          )
        ) /
        sum * (group.market === "DOUBLE_CHANCE" ? 2 : 1);

      const edge =
        m.probability -
        nv;

      const candidate = {
        ...m,

        rawMarket:
          group.rawMarket,

        bookmaker:
          group.bookmaker ||
          null,

        sportsbookOdds:
          num(
            price.odds
          ),

        noVigMarketProbability:
          nv,

        valueEdge:
          edge,

        analysisSource:
          "independent-model",

        dataQuality:
          analysis.dataQuality,

        competitionReliability:
          analysis.competitionReliability,

        qualificationMode:
          "MODEL_PLUS_MARKET"
      };

      // Price coherence guard: sportsbook odds must describe the same event
      // represented by the model probability. Extreme probability/price
      // disagreement is treated as a mapping mismatch, not artificial value.
      if (!priceCoherentV60(m.probability, candidate.sportsbookOdds)) continue;

      if (
        m.probability >=
          0.64 &&
        edge >=
          0.035 &&
        analysis.dataQuality >=
          tierGate.strongQ
      ) {
        strong.push(
          candidate
        );
      } else if (
        candidate.sportsbookOdds >=
          1.35 &&
        analysis.dataQuality >=
          tierGate.riskyQ
      ) {
        const floor =
          candidate.sportsbookOdds >=
          3.5
            ? 0.26
            : candidate.sportsbookOdds >=
                2.75
              ? 0.30
              : candidate.sportsbookOdds >=
                  2.0
                ? 0.34
                : candidate.sportsbookOdds >=
                    1.60
                  ? 0.48
                  : 0.56;

        const edgeFloor =
          candidate.sportsbookOdds >=
          3.5
            ? 0.015
            : candidate.sportsbookOdds >=
                2.0
              ? 0.02
              : 0.025;

        if (
          m.probability >=
            floor &&
          edge >=
            edgeFloor
        ) {
          risky.push(
            candidate
          );
        }
      }
    }
  }

  // V21 independent-conviction lane: sportsbook price is confirmation/value,
  // not a hard prerequisite. Prefer safer non-1X2 markets when model quality is high.
  // V1.8: markets compete on usefulness + value, not just raw safety.
  // Goal totals still qualify, but ultra-safe Under 4.5 no longer gets an
  // automatic board advantage over handicap, corners or shot markets.
  const corePreference = market => ({
    DOUBLE_CHANCE: 0.020,
    HANDICAP: 0.022,
    TOTAL_CORNERS: 0.020,
    CORNERS_HANDICAP: 0.018,
    TOTAL_SHOTS: 0.018,
    TOTAL_SHOTS_ON_TARGET: 0.022,
    TOTAL_SHOTS_OFF_TARGET: 0.012,
    HOME_PLAYER_SHOTS: 0.010,
    AWAY_PLAYER_SHOTS: 0.010,
    HOME_PLAYER_SHOTS_ON_TARGET: 0.012,
    AWAY_PLAYER_SHOTS_ON_TARGET: 0.012,
    TOTAL_GOALS: 0.008,
    HOME_TEAM_GOALS: 0.010,
    AWAY_TEAM_GOALS: 0.010,
    BTTS: 0.010,
    MATCH_RESULT: tier <= 2 ? 0.018 : -0.005
  }[market] || 0);

  const selectionAdjustment = x => {
    const s = String(x?.selection || "");
    // Under 4.5 is useful as a safety market, but its naturally high model
    // probability should not dominate the main card at tiny/ordinary prices.
    if (x?.market === "TOTAL_GOALS" && s === "UNDER_4_5") {
      const priced = num(x?.sportsbookOdds, 0);
      const edge = num(x?.valueEdge, 0);
      return priced >= 1.45 && edge >= 0.035 ? -0.010 : -0.050;
    }
    if (tier <= 2 && x?.market === "TOTAL_GOALS" && s === "OVER_3_5") return tier === 1 ? 0.045 : 0.028;
    if (tier <= 2 && x?.market === "TOTAL_GOALS" && s === "OVER_2_5") return tier === 1 ? 0.030 : 0.018;
    if (tier <= 2 && x?.market === "MATCH_RESULT" && (s === "HOME" || s === "AWAY")) return tier === 1 ? 0.028 : 0.015;
    return 0;
  };

  for (const m of modeled) {
    if (!["TOTAL_GOALS","DOUBLE_CHANCE","HANDICAP","HOME_TEAM_GOALS","AWAY_TEAM_GOALS","BTTS","MATCH_RESULT"].includes(m.market)) continue;
    const floor = m.market === "MATCH_RESULT" ? tierGate.winFloor :
      (m.market === "TOTAL_GOALS" && m.selection === "OVER_3_5") ? (tier === 1 ? 0.58 : tier === 2 ? 0.62 : 0.68) :
      (m.market === "TOTAL_GOALS" && m.selection === "OVER_2_5") ? tierGate.o25Floor :
      m.market === "HANDICAP" ? 0.70 :
      m.market === "BTTS" ? 0.73 :
      m.selection === "UNDER_4_5" ? 0.80 : 0.72;
    const qualityGate = analysis.competitionReliability >= 0.86 ? Math.max(0.48, tierGate.convictionQ - 0.02) : tierGate.convictionQ;
    if (m.probability < floor || analysis.dataQuality < qualityGate) continue;

    const exists = strong.some(x => x.market === m.market && x.selection === m.selection);
    if (exists) continue;

    const candidate = {
      ...m,
      rawMarket: m.market,
      bookmaker: null,
      sportsbookOdds: null,
      noVigMarketProbability: null,
      valueEdge: 0,
      dataQuality: analysis.dataQuality,
      competitionReliability: analysis.competitionReliability,
      qualificationMode: "MODEL_CONVICTION",
      analysisSource: "independent-model-conviction"
    };

    // Model-only picks need stronger conviction than priced picks, but remain
    // analysis context until a real Bet365 price exists.
    if (m.probability >= floor + 0.03 || (analysis.competitionReliability >= 0.86 && m.probability >= floor + 0.01)) {
      for (let i = risky.length - 1; i >= 0; i--) {
        if (risky[i].market === m.market && risky[i].selection === m.selection) risky.splice(i, 1);
      }
      modelConvictionWatch.push(candidate);
    }
  }

  /*
   * Supplemental markets:
   * corners, cards, shots,
   * shots on target,
   * shots off target.
   *
   * These use cross-book
   * no-vig consensus.
   */

  const consensus = consensusCandidates(marketOdds);
  const watch = [...modelConvictionWatch];

  // Analysis options are allowed without a sportsbook price; final picks are not forced.
  for (const m of modeled) {
    if (num(m.probability, 0) < 0.50) continue;
    if (m.market === "TOTAL_GOALS" && String(m.selection) === "UNDER_4_5") continue;
    const alreadyQualified = strong.some(x => x.market === m.market && x.selection === m.selection) ||
      risky.some(x => x.market === m.market && x.selection === m.selection);
    if (alreadyQualified) continue;
    watch.push({
      ...m, rawMarket: m.market, bookmaker: null, sportsbookOdds: null,
      noVigMarketProbability: null, valueEdge: null, bookmakerCount: null,
      dataQuality: analysis.dataQuality, competitionReliability: analysis.competitionReliability,
      qualificationMode: "MODEL_WATCH", analysisSource: "independent-model-watch"
    });
  }

  for (const c of consensus) {
    if (!priceCoherentV60(c.probability, c.sportsbookOdds)) continue;
    if (
      c.probability >= 0.50 &&
      c.sportsbookOdds > 1
    ) {
      watch.push({
        ...c,
        dataQuality: analysis.dataQuality,
        competitionReliability: analysis.competitionReliability,
        qualificationMode: "MARKET_WATCH",
        analysisSource: c.bookmakerCount >= 2
          ? "cross-book-market-watch"
          : "single-book-market-watch"
      });
    }


    if (
      [
        "MATCH_RESULT",
        "DOUBLE_CHANCE",
        "HANDICAP", // Core handicap picks require independent model support.
        "TOTAL_GOALS",
        "BTTS",
        "HOME_TEAM_GOALS",
        "AWAY_TEAM_GOALS"
      ].includes(
        c.market
      )
    ) {
      continue;
    }

    if (
      c.bookmakerCount <
      2
    ) {
      continue;
    }

    if (
      c.probability >=
        0.64 &&
      c.valueEdge >=
        0.025 &&
      analysis.dataQuality >=
        0.62
    ) {
      strong.push(c);
    } else if (
      c.sportsbookOdds >=
        2.0 &&
      analysis.dataQuality >=
        0.52
    ) {
      const floor =
        c.sportsbookOdds >=
        3.5
          ? 0.26
          : c.sportsbookOdds >=
              2.75
            ? 0.29
            : 0.33;

      const edgeFloor =
        c.sportsbookOdds >=
        3.5
          ? 0.012
          : 0.018;

      if (
        c.probability >=
          floor &&
        c.valueEdge >=
          edgeFloor
      ) {
        risky.push(c);
      }
    }
  }

  const score =
    x => {
      const odds = num(x.sportsbookOdds, 0);
      const usablePrice =
        odds > 1
          ? clamp((odds - 1.15) / 1.35, 0, 1)
          : 0;

      return (
        x.probability * 0.50 +
        clamp(num(x.dataQuality, analysis.dataQuality), 0, 1) * 0.14 +
        clamp(num(x.competitionReliability, analysis.competitionReliability), 0, 1) * 0.10 +
        Math.max(0, num(x.valueEdge, 0)) * 0.16 +
        usablePrice * 0.06 +
        corePreference(x.market) +
        selectionAdjustment(x)
      );
    };

  strong.sort(
    (
      a,
      b
    ) =>
      score(b) -
      score(a)
  );

  risky.sort(
    (
      a,
      b
    ) =>
      score(b) -
      score(a)
  );

  // Detailed analysis should stay useful even when nothing clears the final bet gate.
  // Qualified picks rank first; then market-watch options fill out other families.
  const rankedCandidates = [
    ...strong.slice(0, 12),
    ...risky.slice(0, 12),
    ...watch.sort((a,b) => score(b) - score(a)).slice(0, 20)
  ].sort((a, b) => {
    const qa = strong.includes(a) ? 2 : risky.includes(a) ? 1 : 0;
    const qb = strong.includes(b) ? 2 : risky.includes(b) ? 1 : 0;
    return qb - qa || score(b) - score(a);
  });

  const diverseTop = [];
  const seenMarkets = new Set();
  for (const x of rankedCandidates) {
    // Never let Under 4.5 consume a watch slot when other families exist.
    if (
      x.market === "TOTAL_GOALS" &&
      String(x.selection) === "UNDER_4_5" &&
      rankedCandidates.some(y => y.market !== "TOTAL_GOALS")
    ) continue;
    if (seenMarkets.has(x.market)) continue;
    diverseTop.push(x);
    seenMarkets.add(x.market);
    if (diverseTop.length >= 8) break;
  }
  if (diverseTop.length < 8) {
    for (const x of rankedCandidates) {
      if (diverseTop.includes(x)) continue;
      diverseTop.push(x);
      if (diverseTop.length >= 8) break;
    }
  }

  const topMarkets = diverseTop.map(x => ({
    market: x.market,
    selection: x.selection,
    probability: x.probability,
    sportsbookOdds: x.sportsbookOdds,
    bookmaker: x.bookmaker,
    bookmakerCount: x.bookmakerCount ?? null,
    valueEdge: x.valueEdge,
    analysisSource: x.analysisSource,
    lane: strong.includes(x)
      ? "STRONG"
      : risky.includes(x)
        ? "RISKY_VALUE"
        : "WATCH"
  }));

  const nonU45Strong = strong.find(x =>
    !(x.market === "TOTAL_GOALS" && String(x.selection) === "UNDER_4_5")
  );
  const nonU45Risky = risky.find(x =>
    !(x.market === "TOTAL_GOALS" && String(x.selection) === "UNDER_4_5")
  );

  // Calculated-audacity promotion: among already-STRONG candidates,
  // prefer the deepest supported outcome when the confidence sacrifice is small.
  // This does not lower qualification thresholds or manufacture picks.
  const baseStrong = nonU45Strong || strong[0] || null;
  const audacityRank = x => {
    const s = String(x?.selection || "");
    if (x?.market === "TOTAL_GOALS" && s === "OVER_3_5") return 5;
    if (x?.market === "MATCH_RESULT" && (s === "HOME" || s === "AWAY")) return 4;
    if (x?.market === "TOTAL_GOALS" && s === "OVER_2_5") return 4;
    if (x?.market === "BTTS" && s === "YES") return 3;
    if (x?.market === "HOME_TEAM_GOALS" || x?.market === "AWAY_TEAM_GOALS") return 3;
    if (x?.market === "HANDICAP" && /MINUS/.test(s)) return 3;
    if (x?.market === "TOTAL_GOALS" && s === "OVER_1_5") return 1;
    if (x?.market === "HANDICAP" && /PLUS_1_5/.test(s)) return 0;
    return 2;
  };
  const audaciousStrong = tier <= 2 && baseStrong
    ? strong
        .filter(x =>
          audacityRank(x) > audacityRank(baseStrong) &&
          num(x.probability, 0) >= Math.max(0.58, num(baseStrong.probability, 0) - (tier === 1 ? 0.16 : 0.12)) &&
          analysis.dataQuality >= (tier === 1 ? 0.50 : 0.56) &&
          score(x) >= score(baseStrong) - (tier === 1 ? 0.075 : 0.055)
        )
        .sort((a,b) => audacityRank(b) - audacityRank(a) || score(b) - score(a))[0]
    : null;

  const b =
    audaciousStrong ||
    nonU45Strong ||
    strong[0] ||
    nonU45Risky ||
    risky[0];

  if (!b) {
    return {
      decision:
        "NO_BET",

      reason:
        "No market passed the final Two45 bet gate, but alternative market signals are shown for analysis.",

      topMarkets
    };
  }

  const isRisky =
    !strong.length;

  return {
    decision:
      "PICK",

    pickType:
      isRisky
        ? "RISKY_VALUE"
        : "STRONG_PICK",

    riskLabel:
      isRisky
        ? "Higher variance — model/market edge detected"
        : "Standard Two45 qualification",

    market:
      b.market,

    selection:
      b.selection,

    probability:
      b.probability,

    fairOdds:
      b.fairOdds,

    sportsbookOdds:
      b.sportsbookOdds,

    bookmaker:
      b.bookmaker,

    noVigMarketProbability:
      b.noVigMarketProbability,

    valueEdge:
      b.valueEdge,

    analysisSource:
      b.analysisSource,

    topMarkets,

    confidenceTier:
      isRisky
        ? "RISKY"

        : b.probability >=
            0.78 &&
          analysis.dataQuality >=
            0.82
          ? "A"

          : b.probability >=
              0.70 &&
            analysis.dataQuality >=
              0.75
            ? "B"

            : "C"
  };
}

/* =========================================================
   FEATURE JOBS
   ========================================================= */

async function claimJobs(env, limit = DEFAULT_MODEL_BATCH) {
  // The installed V18 RPC ignores p_limit and excludes most live fixtures.
  // V19 instead claims one eligible row at a time with compare-and-set filters.
  const queue = await syncFixtureJobsV19(env);
  const claimed = [];
  for (const item of rankedJobsV19(queue.jobs).slice(0, batchLimitV19(limit))) {
    const job = await claimSpecificJob(env, item);
    if (job) claimed.push(job);
  }
  return claimed;
}

async function requeueStale(env) {
  return await sb(
    env,
    "rpc/two45_requeue_stale_feature_jobs",
    {
      method:
        "POST",

      body:
        JSON.stringify({
          p_stale_minutes:
            5
        })
    }
  );
}

async function patchJob(
  env,
  id,
  patch
) {
  return await sb(
    env,
    `two45_feature_jobs?id=eq.${encodeURIComponent(
      id
    )}`,
    {
      method:
        "PATCH",

      body:
        JSON.stringify(
          patch
        )
    }
  );
}


function analysisKeyV2(job, modelVersion = MODEL_VERSION) {
  return `${modelVersion}:${Number(job.fixture_id)}`;
}

async function ensureAnalysisRowsV2(env, jobs = []) {
  const rows = [];
  for (const job of jobs) {
    if (!job?.fixture_id) continue;
    rows.push({
      analysis_key: analysisKeyV2(job),
      fixture_id: Number(job.fixture_id),
      provider_match_id: String(job.provider_match_id || job.fixture_id),
      model_version: MODEL_VERSION,
      kickoff_at: job.kickoff_at,
      competition: job.competition || null,
      home_team: job.home_team,
      away_team: job.away_team,
      status: "PENDING",
      refreshing: false,
      priority: num(job.priority, 100),
      attempts: 0,
      requested_at: job.requested_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source_snapshot_key: job.source_snapshot_key || null,
      legacy_source: false
    });
  }
  for (let i = 0; i < rows.length; i += 100) {
    await sb(env, "two45_analysis_state?on_conflict=analysis_key", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: JSON.stringify(rows.slice(i, i + 100))
    });
  }
}

async function canonicalAnalysisRowsV2(env, fixtureIds = []) {
  if (!fixtureIds.length) return [];
  return await rowsForIdsV19(env, "two45_analysis_state", "fixture_id", fixtureIds);
}

function canonicalForecastV2(row) {
  if (!row || row.status !== "COMPLETE") return null;
  const result = row.result || {};
  if (result.forecast && typeof result.forecast === "object") {
    return {
      ...result.forecast,
      canonicalStatus: row.status,
      canonicalModelVersion: row.model_version,
      canonicalCompletedAt: row.completed_at,
      generatedAt: result.forecast.generatedAt || row.completed_at,
      createdAt: result.forecast.createdAt || row.completed_at
    };
  }
  if (result.forecast_key || result.probability_snapshot || result.feature_snapshot) {
    return {
      ...forecastRowToClient(result),
      canonicalStatus: row.status,
      canonicalModelVersion: row.model_version,
      canonicalCompletedAt: row.completed_at,
      generatedAt: row.completed_at,
      createdAt: row.completed_at
    };
  }
  return null;
}

async function currentCanonicalAnalysisV2(env, fixtureId) {
  const rows = await sb(
    env,
    `two45_analysis_state?fixture_id=eq.${encodeURIComponent(fixtureId)}&model_version=eq.${encodeURIComponent(MODEL_VERSION)}&select=*&limit=1`
  );
  return arr(rows)[0] || null;
}

async function beginCanonicalAnalysisV2(env, job) {
  const key = analysisKeyV2(job);
  const current = await currentCanonicalAnalysisV2(env, job.fixture_id).catch(() => null);
  const hasResult = current?.result && typeof current.result === "object" &&
    Object.keys(current.result).length > 0;
  const now = new Date().toISOString();
  const body = {
    status: hasResult ? "COMPLETE" : "PROCESSING",
    refreshing: hasResult,
    started_at: now,
    updated_at: now,
    attempts: num(current?.attempts, 0) + 1,
    last_error: null,
    next_retry_at: null,
    priority: num(job.priority, current?.priority || 100),
    requested_at: current?.requested_at || job.requested_at || now
  };
  const rows = await sb(
    env,
    `two45_analysis_state?analysis_key=eq.${encodeURIComponent(key)}&select=*`,
    {method:"PATCH", body: JSON.stringify(body)}
  );
  return arr(rows)[0] || current;
}

async function completeCanonicalAnalysisV2(env, job, forecast, analysis, decision) {
  const now = new Date().toISOString();
  const alternatives = Array.isArray(forecast?.alternatives) ? forecast.alternatives : [];
  const body = {
    analysis_key: analysisKeyV2(job),
    fixture_id: Number(job.fixture_id),
    provider_match_id: String(job.provider_match_id || job.fixture_id),
    model_version: MODEL_VERSION,
    kickoff_at: job.kickoff_at,
    competition: job.competition || null,
    home_team: job.home_team,
    away_team: job.away_team,
    status: "COMPLETE",
    refreshing: false,
    priority: num(job.priority, 100),
    attempts: 0,
    requested_at: job.requested_at || now,
    started_at: now,
    completed_at: now,
    updated_at: now,
    next_retry_at: null,
    last_error: null,
    result: {
      forecast,
      probabilityBoard: analysis?.probabilities || {},
      marketOptions: decision?.topMarkets || [],
      intelligence: analysis?.intelligence || null,
      shadowContext: {
        homeTeamId: Number(job.home_team_id),
        awayTeamId: Number(job.away_team_id),
        fixtureId: Number(job.fixture_id)
      }
    },
    options_count: alternatives.length,
    data_quality: analysis?.dataQuality ?? null,
    decision: decision?.decision || "NO_BET",
    source_snapshot_key: job.source_snapshot_key || null,
    legacy_source: false,
    shadow_attempted: Boolean(
      analysis?.intelligence?.availability?.shadowV40Attempted ||
      analysis?.intelligence?.shadowMarketModel ||
      analysis?.intelligence?.shadowMarketRanking
    )
  };
  await sb(env, "two45_analysis_state?on_conflict=analysis_key", {
    method:"POST",
    prefer:"resolution=merge-duplicates,return=minimal",
    body:JSON.stringify(body)
  });
  return body;
}

async function failCanonicalAnalysisV2(env, job, error, deferred = false) {
  const current = await currentCanonicalAnalysisV2(env, job.fixture_id).catch(() => null);
  const hasResult = current?.result && typeof current.result === "object" &&
    Object.keys(current.result).length > 0;
  const now = new Date().toISOString();
  const status = hasResult ? "COMPLETE" : (deferred ? "PENDING" : "FAILED");
  const nextRetry = deferred
    ? new Date(Date.now() + 60000).toISOString()
    : new Date(Date.now() + Math.min(15, Math.max(2, num(current?.attempts,1) * 2)) * 60000).toISOString();
  await sb(
    env,
    `two45_analysis_state?analysis_key=eq.${encodeURIComponent(analysisKeyV2(job))}`,
    {
      method:"PATCH",
      body:JSON.stringify({
        status,
        refreshing:false,
        updated_at:now,
        started_at:null,
        next_retry_at:nextRetry,
        last_error:String(error || "Analysis failed").slice(0,500)
      })
    }
  ).catch(() => null);
}

async function recoverCanonicalAnalysisV2(env) {
  try {
    return await sb(env, "rpc/two45_recover_stale_analysis", {
      method:"POST",
      body:JSON.stringify({p_timeout_minutes:5})
    });
  } catch (_) {
    return null;
  }
}

async function analysisHealthV2(env, date = easternDate()) {
  const [rows, cronRow] = await Promise.all([
    sb(env, "rpc/two45_analysis_health", {
      method:"POST",
      timeoutMs:6000,
      body:JSON.stringify({p_date:date, p_model_version:MODEL_VERSION})
    }),
    getFeedSnapshot(env, "cron-status").catch(() => null)
  ]);
  const health = arr(rows)[0] || {};
  const heartbeatAt =
    cronRow?.payload?.heartbeatAt ||
    cronRow?.payload?.completedAt ||
    cronRow?.refreshed_at ||
    null;
  const heartbeatAgeMs = heartbeatAt
    ? Math.max(0, Date.now() - Date.parse(heartbeatAt))
    : null;
  const automationActive = heartbeatAgeMs != null && heartbeatAgeMs < 180000;
  return {
    date,
    modelVersion: MODEL_VERSION,
    fixturesTotal: num(health.fixtures_total),
    pending: num(health.pending),
    processing: num(health.processing),
    complete: num(health.complete),
    failed: num(health.failed),
    refreshing: num(health.refreshing),
    oldestPending: health.oldest_pending || null,
    lastCompletedAt: health.last_completed_at || null,
    heartbeatAt,
    heartbeatAgeMs,
    automationActive,
    pipelineStatus: cronRow?.payload?.status || null
  };
}

/* =========================================================
   API-FOOTBALL
   ========================================================= */

async function football(env, endpoint, params) {
  return providerFetchV18(env, endpoint.replace(/^\//, ''), params);
}

function cutoff(kickoff) {
  const d =
    new Date(
      kickoff
    );

  d.setUTCDate(
    d.getUTCDate() -
      1
  );

  return d
    .toISOString()
    .slice(
      0,
      10
    );
}

function formPPG(form) {
  const arr =
    String(
      form ||
      ""
    )
      .toUpperCase()
      .split("")
      .filter(
        x =>
          "WDL".includes(
            x
          )
      );

  if (!arr.length) {
    return 1.5;
  }

  return (
    arr.reduce(
      (
        s,
        x
      ) =>
        s +
        (
          x === "W"
            ? 3
            : x === "D"
              ? 1
              : 0
        ),
      0
    ) /
    arr.length
  );
}

function path(
  obj,
  keys,
  d = null
) {
  let x = obj;

  for (
    const k
    of keys
  ) {
    if (
      !x ||
      typeof x !==
        "object"
    ) {
      return d;
    }

    x =
      x[k];
  }

  return x ?? d;
}

function toFeatures(stats) {
  const sampleSize = num(path(stats, ["fixtures","played","total"]), 0);
  const gf = num(path(stats, ["goals","for","average","total"]), 0);
  const ga = num(path(stats, ["goals","against","average","total"]), 0);
  const wins = num(path(stats, ["fixtures","wins","total"]), 0);
  const draws = num(path(stats, ["fixtures","draws","total"]), 0);
  const losses = num(path(stats, ["fixtures","loses","total"]), 0);
  const homePlayed = num(path(stats, ["fixtures","played","home"]), 0);
  const awayPlayed = num(path(stats, ["fixtures","played","away"]), 0);
  const homePoints = num(path(stats, ["fixtures","wins","home"]),0)*3 + num(path(stats, ["fixtures","draws","home"]),0);
  const awayPoints = num(path(stats, ["fixtures","wins","away"]),0)*3 + num(path(stats, ["fixtures","draws","away"]),0);
  const cleanSheets = num(path(stats, ["clean_sheet","total"]), 0);
  const failedToScore = num(path(stats, ["failed_to_score","total"]), 0);
  const form = String(stats?.form || "");
  return {
    sampleSize,
    goalsForAvg: gf,
    goalsAgainstAvg: ga,
    homeGoalsForAvg: num(path(stats, ["goals","for","average","home"]), gf),
    homeGoalsAgainstAvg: num(path(stats, ["goals","against","average","home"]), ga),
    awayGoalsForAvg: num(path(stats, ["goals","for","average","away"]), gf),
    awayGoalsAgainstAvg: num(path(stats, ["goals","against","average","away"]), ga),
    formPointsPerGame: formPPG(form),
    winRate: sampleSize ? wins/sampleSize : 0.33,
    drawRate: sampleSize ? draws/sampleSize : 0.27,
    lossRate: sampleSize ? losses/sampleSize : 0.40,
    homePointsPerGame: homePlayed ? homePoints/homePlayed : formPPG(form),
    awayPointsPerGame: awayPlayed ? awayPoints/awayPlayed : formPPG(form),
    cleanSheetRate: sampleSize ? cleanSheets/sampleSize : 0,
    failedToScoreRate: sampleSize ? failedToScore/sampleSize : 0,
    recentForm: form,
    lineupCertainty: 0.70,
    absenceImpact: 0
  };
}

function summarizeRecentV211(fixtures, teamId) {
  const rows = fixtures
    .filter(f => Number(f?.fixture?.timestamp || 0) > 0)
    .sort((a,b) => Number(b.fixture.timestamp) - Number(a.fixture.timestamp))
    .slice(0,8);
  let w=0,d=0,l=0,gf=0,ga=0,btts=0,over25=0,clean=0,failed=0,weight=0,weightedPPG=0;
  rows.forEach((f,i)=>{
    const home=Number(f.teams?.home?.id)===teamId;
    const a=Number(home?f.goals?.home:f.goals?.away);
    const b=Number(home?f.goals?.away:f.goals?.home);
    if(!Number.isFinite(a)||!Number.isFinite(b))return;
    const wt=Math.pow(0.82,i);
    weight+=wt; gf+=a; ga+=b;
    if(a>b){w++;weightedPPG+=3*wt}else if(a===b){d++;weightedPPG+=wt}else l++;
    if(a>0&&b>0)btts++;
    if(a+b>=3)over25++;
    if(b===0)clean++;
    if(a===0)failed++;
  });
  const n=Math.max(1,w+d+l);
  return {
    matches:w+d+l,wins:w,draws:d,losses:l,
    goalsForAvg:gf/n,goalsAgainstAvg:ga/n,
    bttsRate:btts/n,over25Rate:over25/n,
    cleanSheetRate:clean/n,failedToScoreRate:failed/n,
    recencyWeightedPPG:weight?weightedPPG/weight:1.5
  };
}
function summarizeH2HV211(fixtures, homeId, awayId) { const rows=fixtures.filter(f=>Number(f?.fixture?.timestamp||0)>0).sort((a,b)=>Number(b.fixture.timestamp)-Number(a.fixture.timestamp)).slice(0,5); let hw=0,aw=0,d=0,total=0,weight=0,homeScore=0; rows.forEach((f,i)=>{const hIsHome=Number(f.teams?.home?.id)===homeId,hg=Number(f.goals?.home),ag=Number(f.goals?.away);if(!Number.isFinite(hg)||!Number.isFinite(ag))return;const homeGoals=hIsHome?hg:ag,awayGoals=hIsHome?ag:hg,wt=Math.pow(0.65,i);weight+=wt;total+=homeGoals+awayGoals;if(homeGoals>awayGoals){hw++;homeScore+=wt}else if(homeGoals<awayGoals){aw++}else{d++;homeScore+=0.5*wt}}); const n=Math.max(1,hw+aw+d);return {matches:hw+aw+d,homeWins:hw,awayWins:aw,draws:d,avgGoals:total/n,recencyWeightedHomeShare:weight?homeScore/weight:0.5}; }



function shadowV40Enabled(env) {
  const raw = String(env.TWO45_V40_SHADOW_ENABLED ?? "0").trim().toLowerCase();
  return ["1","true","yes","on"].includes(raw);
}

async function shadowBudgetV46(env) {
  const key = "shadow-v40-budget:" + easternDate();
  const snap = await getFeedSnapshot(env, key).catch(() => null);
  const payload = snap?.payload || {};
  return {
    key,
    used:Math.max(0,num(payload.used,0)),
    cap:Math.max(50,num(env.TWO45_V40_DAILY_CAP,SHADOW_V40_DEFAULT_DAILY_CAP))
  };
}

async function reserveShadowCallV46(env, count = 1) {
  if (!shadowV40Enabled(env)) return false;
  const budget = await shadowBudgetV46(env);
  if (budget.used + count > budget.cap) return false;
  await saveFeedSnapshot(env, budget.key, {
    used:budget.used + count,
    cap:budget.cap,
    updatedAt:new Date().toISOString()
  }, 2 * 86400).catch(() => null);
  return true;
}

function statValueV40(rows, teamId, label) {
  const teamRow = arr(rows).find(r => Number(r?.team?.id) === Number(teamId));
  const stats = arr(teamRow?.statistics);
  const wanted = String(label || "").toLowerCase();
  const hit = stats.find(s => String(s?.type || "").toLowerCase() === wanted);
  const v = hit?.value;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace("%","").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function summarizeMarketProfileV40(samples, teamId) {
  const valid = arr(samples).filter(x => x && x.stats);
  const fields = [
    ["cornersFor","Corner Kicks"],
    ["shotsFor","Total Shots"],
    ["shotsOnTargetFor","Shots on Goal"],
    ["yellowCardsFor","Yellow Cards"],
    ["redCardsFor","Red Cards"]
  ];
  const againstFields = [
    ["cornersAgainst","Corner Kicks"],
    ["shotsAgainst","Total Shots"],
    ["shotsOnTargetAgainst","Shots on Goal"],
    ["yellowCardsAgainst","Yellow Cards"],
    ["redCardsAgainst","Red Cards"]
  ];
  const agg = {};
  for (const [key] of [...fields, ...againstFields]) agg[key] = {sum:0, weight:0, count:0};

  valid.forEach((sample,i) => {
    const wt = Math.pow(0.82, i);
    for (const [key,label] of fields) {
      const v = statValueV40(sample.stats, teamId, label);
      if (!Number.isFinite(v)) continue;
      agg[key].sum += v * wt;
      agg[key].weight += wt;
      agg[key].count++;
    }
    const opponentRow = arr(sample.stats).find(r => Number(r?.team?.id) !== Number(teamId));
    const opponentId = Number(opponentRow?.team?.id);
    if (Number.isFinite(opponentId)) {
      for (const [key,label] of againstFields) {
        const v = statValueV40(sample.stats, opponentId, label);
        if (!Number.isFinite(v)) continue;
        agg[key].sum += v * wt;
        agg[key].weight += wt;
        agg[key].count++;
      }
    }
  });

  const out = {matches: valid.length};
  for (const [key] of fields) {
    const a = agg[key];
    out[key] = a.weight ? a.sum / a.weight : null;
    out[key + "Sample"] = a.count;
  }
  return out;
}

async function recentMarketProfileV40(env, teamId, recentFixtures = [], cacheScope = "") {
  const ids = arr(recentFixtures)
    .filter(f => Number(f?.fixture?.id) > 0)
    .sort((a,b) => Number(b?.fixture?.timestamp || 0) - Number(a?.fixture?.timestamp || 0))
    .slice(0,6)
    .map(f => Number(f.fixture.id));

  if (!ids.length) return {matches:0, source:"none"};
  const cacheKey = "market-profile:v40:" + teamId + ":" + cacheScope + ":" + ids.join("-");
  const cached = await getFeedSnapshot(env, cacheKey).catch(() => null);
  if (cached?.payload?.profile) return {...cached.payload.profile, source:"cache"};

  const samples = [];
  let newFetches = 0;
  const maxNewFetchesPerPass = 1;
  for (const fixtureId of ids) {
    try {
      const snapKey = "fixture-stats:" + fixtureId;
      const snap = await getFeedSnapshot(env, snapKey).catch(() => null);
      let stats = snap?.payload?.response || snap?.payload || null;
      if (!stats && newFetches < maxNewFetchesPerPass) {
        const allowed = await reserveShadowCallV46(env, 1);
        if (!allowed) continue;
        const r = await football(env, "/fixtures/statistics", {fixture: fixtureId});
        stats = r?.response || [];
        newFetches++;
        await saveFeedSnapshot(env, snapKey, {response:stats}, 7*86400000).catch(() => null);
      }
      if (stats) samples.push({fixtureId, stats});
    } catch (_) {}
  }

  const profile = summarizeMarketProfileV40(samples, teamId);
  await saveFeedSnapshot(env, cacheKey, {profile}, 12*3600000).catch(() => null);
  return {...profile, source:"api-football-recent-fixtures"};
}


function poissonOverV40(lambda, line) {
  if (!Number.isFinite(lambda) || lambda <= 0) return null;
  const threshold = Math.floor(Number(line));
  let underEq = 0;
  for (let k = 0; k <= threshold; k++) underEq += poisson(k, lambda);
  return clamp(1 - underEq, 0, 1);
}

function poissonUnderV40(lambda, line) {
  const over = poissonOverV40(lambda, line);
  return over == null ? null : 1 - over;
}

function blendedMeanV40(forAvg, oppAgainst, fallback) {
  const a = num(forAvg, fallback);
  const b = num(oppAgainst, fallback);
  return clamp((a * 0.58) + (b * 0.42), 0.05, fallback * 2.5);
}

function shadowMarketProbabilitiesV40(homeProfile, awayProfile) {
  if (!homeProfile || !awayProfile) return {};
  const hc = blendedMeanV40(homeProfile.cornersFor, awayProfile.cornersAgainst, 5.0);
  const ac = blendedMeanV40(awayProfile.cornersFor, homeProfile.cornersAgainst, 4.5);
  const hs = blendedMeanV40(homeProfile.shotsFor, awayProfile.shotsAgainst, 12.0);
  const as = blendedMeanV40(awayProfile.shotsFor, homeProfile.shotsAgainst, 10.5);
  const hsot = blendedMeanV40(homeProfile.shotsOnTargetFor, awayProfile.shotsOnTargetAgainst, 4.3);
  const asot = blendedMeanV40(awayProfile.shotsOnTargetFor, homeProfile.shotsOnTargetAgainst, 3.8);
  const hy = blendedMeanV40(homeProfile.yellowCardsFor, awayProfile.yellowCardsAgainst, 2.1);
  const ay = blendedMeanV40(awayProfile.yellowCardsFor, homeProfile.yellowCardsAgainst, 2.1);

  const out = {
    HOME_CORNERS: {},
    AWAY_CORNERS: {},
    TOTAL_CORNERS: {},
    HOME_SHOTS: {},
    AWAY_SHOTS: {},
    TOTAL_SHOTS: {},
    HOME_SHOTS_ON_TARGET: {},
    AWAY_SHOTS_ON_TARGET: {},
    TOTAL_SHOTS_ON_TARGET: {},
    TOTAL_CARDS: {}
  };

  for (const line of [2.5,3.5,4.5,5.5]) {
    out.HOME_CORNERS["OVER_"+String(line).replace(".","_")] = poissonOverV40(hc,line);
    out.AWAY_CORNERS["OVER_"+String(line).replace(".","_")] = poissonOverV40(ac,line);
  }
  for (const line of [8.5,9.5,10.5,11.5]) {
    const key=String(line).replace(".","_");
    out.TOTAL_CORNERS["OVER_"+key] = poissonOverV40(hc+ac,line);
    out.TOTAL_CORNERS["UNDER_"+key] = poissonUnderV40(hc+ac,line);
  }
  for (const line of [8.5,10.5,12.5,14.5]) {
    out.HOME_SHOTS["OVER_"+String(line).replace(".","_")] = poissonOverV40(hs,line);
    out.AWAY_SHOTS["OVER_"+String(line).replace(".","_")] = poissonOverV40(as,line);
  }
  for (const line of [20.5,22.5,24.5,26.5]) {
    const key=String(line).replace(".","_");
    out.TOTAL_SHOTS["OVER_"+key] = poissonOverV40(hs+as,line);
    out.TOTAL_SHOTS["UNDER_"+key] = poissonUnderV40(hs+as,line);
  }
  for (const line of [1.5,2.5,3.5,4.5]) {
    out.HOME_SHOTS_ON_TARGET["OVER_"+String(line).replace(".","_")] = poissonOverV40(hsot,line);
    out.AWAY_SHOTS_ON_TARGET["OVER_"+String(line).replace(".","_")] = poissonOverV40(asot,line);
  }
  for (const line of [5.5,6.5,7.5,8.5]) {
    const key=String(line).replace(".","_");
    out.TOTAL_SHOTS_ON_TARGET["OVER_"+key] = poissonOverV40(hsot+asot,line);
    out.TOTAL_SHOTS_ON_TARGET["UNDER_"+key] = poissonUnderV40(hsot+asot,line);
  }
  for (const line of [2.5,3.5,4.5,5.5]) {
    const key=String(line).replace(".","_");
    out.TOTAL_CARDS["OVER_"+key] = poissonOverV40(hy+ay,line);
    out.TOTAL_CARDS["UNDER_"+key] = poissonUnderV40(hy+ay,line);
  }
  return {
    expected: {
      homeCorners:hc, awayCorners:ac,
      homeShots:hs, awayShots:as,
      homeShotsOnTarget:hsot, awayShotsOnTarget:asot,
      homeYellowCards:hy, awayYellowCards:ay
    },
    probabilities: out,
    model:"two45-market-shadow-v40",
    calibrated:false
  };
}


function marketSampleQualityV41(profile, market) {
  if (!profile) return 0;
  const map = {
    HOME_CORNERS: ["cornersForSample","cornersAgainstSample"],
    AWAY_CORNERS: ["cornersForSample","cornersAgainstSample"],
    TOTAL_CORNERS: ["cornersForSample","cornersAgainstSample"],
    HOME_SHOTS: ["shotsForSample","shotsAgainstSample"],
    AWAY_SHOTS: ["shotsForSample","shotsAgainstSample"],
    TOTAL_SHOTS: ["shotsForSample","shotsAgainstSample"],
    HOME_SHOTS_ON_TARGET: ["shotsOnTargetForSample","shotsOnTargetAgainstSample"],
    AWAY_SHOTS_ON_TARGET: ["shotsOnTargetForSample","shotsOnTargetAgainstSample"],
    TOTAL_SHOTS_ON_TARGET: ["shotsOnTargetForSample","shotsOnTargetAgainstSample"],
    TOTAL_CARDS: ["yellowCardsForSample","yellowCardsAgainstSample"]
  };
  const keys = map[market] || [];
  if (!keys.length) return 0;
  const vals = keys.map(k => num(profile[k],0));
  return clamp(vals.reduce((a,b)=>a+b,0) / (keys.length * 6), 0, 1);
}

function conservativeCalibrateV41(rawProbability, evidenceQuality, competitionReliability = 0.75) {
  const p = clamp(num(rawProbability,0.5),0.01,0.99);
  const q = clamp(num(evidenceQuality,0),0,1);
  const r = clamp(num(competitionReliability,0.75),0.55,0.95);
  const confidence = clamp((q * 0.72) + (r * 0.28), 0.18, 0.95);
  return clamp(0.5 + (p - 0.5) * confidence, 0.03, 0.97);
}

function rankShadowMarketsV41(shadow, homeProfile, awayProfile, competitionReliability = 0.75, empiricalCalibration = {}) {
  const probs = shadow?.probabilities || {};
  const out = [];
  for (const [market,selections] of Object.entries(probs)) {
    const homeQuality = marketSampleQualityV41(homeProfile, market);
    const awayQuality = marketSampleQualityV41(awayProfile, market);
    const evidenceQuality = clamp((homeQuality + awayQuality) / 2,0,1);
    for (const [selection,rawProbability] of Object.entries(selections || {})) {
      if (!Number.isFinite(Number(rawProbability))) continue;
      const provisionalProbability = conservativeCalibrateV41(rawProbability,evidenceQuality,competitionReliability);
      const bucket = calibrationBucketV43(provisionalProbability);
      const empirical = empiricalCalibration?.buckets?.[market + "|" + bucket] || null;
      const empiricalN = num(empirical?.settled,0);
      const empiricalRate = empiricalN > 0
        ? (num(empirical?.wins,0) + 1) / (empiricalN + 2)
        : null;
      const empiricalWeight = empiricalN >= 8
        ? clamp(empiricalN / (empiricalN + 32),0,0.72)
        : 0;
      const calibratedProbability = empiricalRate == null
        ? provisionalProbability
        : clamp(
            provisionalProbability * (1 - empiricalWeight) +
            empiricalRate * empiricalWeight,
            0.03,0.97
          );
      const decisiveness = Math.abs(calibratedProbability - 0.5) * 2;
      const score = calibratedProbability * 0.62 + evidenceQuality * 0.26 + decisiveness * 0.12;
      out.push({
        market, selection, rawProbability, calibratedProbability,
        evidenceQuality, score,
        fairOdds: calibratedProbability > 0 ? 1 / calibratedProbability : null,
        calibrationMode: empiricalWeight > 0 ? "EMPIRICAL_BLEND" : "PROVISIONAL_SHRINKAGE",
        empiricalSampleSize: empiricalN,
        empiricalHitRate: empiricalRate
      });
    }
  }
  out.sort((a,b) => b.score - a.score);
  const diverse = [];
  const seen = new Set();
  for (const x of out) {
    if (x.calibratedProbability < 0.55) continue;
    if (seen.has(x.market)) continue;
    diverse.push(x); seen.add(x.market);
    if (diverse.length >= 8) break;
  }
  return {
    candidates: out.slice(0,24),
    topMarkets: diverse,
    calibrationStatus: num(empiricalCalibration?.settled,0) >= 20 ? "EMPIRICAL_ACTIVE" : "PROVISIONAL",
    empiricalBacktestReady: num(empiricalCalibration?.settled,0) >= 20,
    empiricalSettled: num(empiricalCalibration?.settled,0),
    note: num(empiricalCalibration?.settled,0) >= 20
      ? "Settled shadow results are blended into market calibration."
      : "Probabilities are conservatively shrunk until more settled shadow results accumulate."
  };
}


function qualifyShadowDataDrivenV42(ranking, context = {}) {
  const candidates = Array.isArray(ranking?.topMarkets) ? ranking.topMarkets : [];
  const lineupCertainty = clamp(num(context.lineupCertainty,0.70),0,1);
  const competitionReliability = clamp(num(context.competitionReliability,0.75),0,1);
  return candidates.map(x => {
    const evidence = clamp(num(x.evidenceQuality,0),0,1);
    const p = clamp(num(x.calibratedProbability,0.5),0,1);
    const dataDriven =
      evidence >= 0.50 &&
      p >= 0.60 &&
      competitionReliability >= 0.75;
    const confidenceScore = clamp(
      p * 0.52 +
      evidence * 0.28 +
      competitionReliability * 0.12 +
      lineupCertainty * 0.08,
      0,1
    );
    return {
      ...x,
      dataDriven,
      label: dataDriven ? "DATA_DRIVEN" : "RESEARCHING",
      confidenceScore,
      evidenceStatus:
        evidence >= 0.75 ? "STRONG" :
        evidence >= 0.50 ? "USABLE" :
        "THIN",
      reasons: [
        "recent-market-profile",
        "opponent-against-profile",
        ranking?.calibrationStatus === "PROVISIONAL"
          ? "provisional-calibration"
          : "empirical-calibration"
      ]
    };
  });
}


function selectionLineV43(selection) {
  const m = String(selection || "").match(/^(OVER|UNDER)_([0-9]+)_([0-9]+)$/);
  if (!m) return null;
  return {side:m[1], line:Number(m[2] + "." + m[3])};
}

function calibrationBucketV43(probability) {
  const p = clamp(num(probability,0),0,1);
  const low = Math.floor(p * 10) / 10;
  const high = Math.min(1, low + 0.1);
  return low.toFixed(1) + "-" + high.toFixed(1);
}

function gradeThresholdV43(value, selection) {
  const parsed = selectionLineV43(selection);
  if (!parsed || !Number.isFinite(Number(value))) return "UNGRADABLE";
  const v = Number(value);
  if (parsed.side === "OVER") return v > parsed.line ? "WIN" : "LOSS";
  if (parsed.side === "UNDER") return v < parsed.line ? "WIN" : "LOSS";
  return "UNGRADABLE";
}

function gradeShadowMarketV43(market, selection, statsRows, homeTeamId, awayTeamId) {
  const homeCorners = statValueV40(statsRows, homeTeamId, "Corner Kicks");
  const awayCorners = statValueV40(statsRows, awayTeamId, "Corner Kicks");
  const homeShots = statValueV40(statsRows, homeTeamId, "Total Shots");
  const awayShots = statValueV40(statsRows, awayTeamId, "Total Shots");
  const homeSot = statValueV40(statsRows, homeTeamId, "Shots on Goal");
  const awaySot = statValueV40(statsRows, awayTeamId, "Shots on Goal");
  const homeY = statValueV40(statsRows, homeTeamId, "Yellow Cards");
  const awayY = statValueV40(statsRows, awayTeamId, "Yellow Cards");
  const values = {
    HOME_CORNERS: homeCorners,
    AWAY_CORNERS: awayCorners,
    TOTAL_CORNERS: Number.isFinite(homeCorners) && Number.isFinite(awayCorners) ? homeCorners + awayCorners : null,
    HOME_SHOTS: homeShots,
    AWAY_SHOTS: awayShots,
    TOTAL_SHOTS: Number.isFinite(homeShots) && Number.isFinite(awayShots) ? homeShots + awayShots : null,
    HOME_SHOTS_ON_TARGET: homeSot,
    AWAY_SHOTS_ON_TARGET: awaySot,
    TOTAL_SHOTS_ON_TARGET: Number.isFinite(homeSot) && Number.isFinite(awaySot) ? homeSot + awaySot : null,
    TOTAL_CARDS: Number.isFinite(homeY) && Number.isFinite(awayY) ? homeY + awayY : null
  };
  return gradeThresholdV43(values[market], selection);
}

function buildShadowBacktestRowsV43(recommendations, finalStats, homeTeamId, awayTeamId) {
  return (Array.isArray(recommendations) ? recommendations : []).map(x => ({
    market: x.market,
    selection: x.selection,
    rawProbability: x.rawProbability,
    calibratedProbability: x.calibratedProbability,
    evidenceQuality: x.evidenceQuality,
    dataDriven: Boolean(x.dataDriven),
    confidenceScore: x.confidenceScore,
    calibrationBucket: calibrationBucketV43(x.calibratedProbability),
    result: gradeShadowMarketV43(x.market, x.selection, finalStats, homeTeamId, awayTeamId)
  }));
}

async function optionalIntelligenceV21(env, job) {
  const fixtureId = Number(job.fixture_id);
  const major = priorityCompetitionV20(job.competition, job.provider_league_id);
  const hours = (Date.parse(job.kickoff_at) - Date.now()) / 3600000;
  // Spend extra calls where they can materially improve a decision.
  if (!major && hours > 18) return {source:"baseline", enriched:false};
  const key = `match-intelligence:${fixtureId}`;
  const cached = await getFeedSnapshot(env, key);
  const age = cached ? Date.now()-Date.parse(cached.refreshed_at) : Infinity;
  const ttl = hours <= 3 ? 2*3600000 : hours <= 18 ? 4*3600000 : 8*3600000;
  if (cached && age < ttl) return cached.payload || {source:"cache", enriched:false};
  const out = {source:"API-Football enrichment", enriched:true, fixtureId, generatedAt:new Date().toISOString()};
  let homeRecentFixtures = [];
  let awayRecentFixtures = [];
  // V21.1 recent-match + H2H context. Cached with the rest of this enrichment.
  try {
    const recent = await football(env, "/fixtures", {league: job.provider_league_id, season: job.season, team: job.home_team_id, last: 8});
    homeRecentFixtures = arr(recent.response);
    out.homeRecent = summarizeRecentV211(homeRecentFixtures, Number(job.home_team_id));
    if (out.homeRecent.matches < 5) {
      const broad = await football(env, "/fixtures", {team: job.home_team_id, last: 8});
      const broadSummary = summarizeRecentV211(arr(broad.response), Number(job.home_team_id));
      if (broadSummary.matches > out.homeRecent.matches) {
        out.homeRecent = broadSummary;
        out.homeRecentSource = "all-competitions";
      }
    }
  } catch(e) { out.homeRecentError = safeRefreshError(e); }
  try {
    const recent = await football(env, "/fixtures", {league: job.provider_league_id, season: job.season, team: job.away_team_id, last: 8});
    awayRecentFixtures = arr(recent.response);
    out.awayRecent = summarizeRecentV211(awayRecentFixtures, Number(job.away_team_id));
    if (out.awayRecent.matches < 5) {
      const broad = await football(env, "/fixtures", {team: job.away_team_id, last: 8});
      const broadSummary = summarizeRecentV211(arr(broad.response), Number(job.away_team_id));
      if (broadSummary.matches > out.awayRecent.matches) {
        out.awayRecent = broadSummary;
        out.awayRecentSource = "all-competitions";
      }
    }
  } catch(e) { out.awayRecentError = safeRefreshError(e); }
  if (major || hours <= 18) { try { const pair = String(job.home_team_id)+"-"+String(job.away_team_id); const h2h = await football(env, "/fixtures/headtohead", {h2h: pair, last: 5}); out.h2h = summarizeH2HV211(arr(h2h.response), Number(job.home_team_id), Number(job.away_team_id)); } catch(e) { out.h2hError = safeRefreshError(e); } }

  try {
    const calibration = await getFeedSnapshot(env, "shadow-calibration:v44");
    out.empiricalCalibration = calibration?.payload || {};
  } catch (_) { out.empiricalCalibration = {}; }

  // V40 shadow market profiles are explicitly gated and never drive the live selector.
  if (shadowV40Enabled(env)) {
    out.shadowV40Attempted = true;
    out.shadowV40AttemptedAt = new Date().toISOString();
    try {
      out.homeMarketProfile = await recentMarketProfileV40(env, Number(job.home_team_id), homeRecentFixtures, String(job.provider_league_id || ""));
    } catch (e) { out.homeMarketProfileError = safeRefreshError(e); }
    try {
      out.awayMarketProfile = await recentMarketProfileV40(env, Number(job.away_team_id), awayRecentFixtures, String(job.provider_league_id || ""));
    } catch (e) { out.awayMarketProfileError = safeRefreshError(e); }
  } else {
    out.shadowV40Disabled = true;
  }

  // One fixture-scoped injury call covers both teams. Lineups are most useful near kickoff.
  try {
    const injuries = await football(env, "/injuries", {fixture: fixtureId});
    const rows = arr(injuries.response);
    out.injuries = rows.map(x=>({teamId:x.team?.id,team:x.team?.name,player:x.player?.name,type:x.player?.type,reason:x.player?.reason})).slice(0,30);
    out.homeAbsences = rows.filter(x=>Number(x.team?.id)===Number(job.home_team_id)).length;
    out.awayAbsences = rows.filter(x=>Number(x.team?.id)===Number(job.away_team_id)).length;
  } catch(e) { out.injuriesError = safeRefreshError(e); }
  if (hours <= 3) {
    try {
      const lineups = await football(env, "/fixtures/lineups", {fixture: fixtureId});
      out.lineups = arr(lineups.response).map(x=>({teamId:x.team?.id,team:x.team?.name,formation:x.formation,
        coach:x.coach?.name,startingXI:arr(x.startXI).map(p=>p.player?.name).filter(Boolean).slice(0,11)}));
      out.lineupsConfirmed = out.lineups.length >= 2 && out.lineups.every(x=>x.startingXI.length >= 10);
    } catch(e) { out.lineupsError = safeRefreshError(e); }
  }
  await saveFeedSnapshot(env, key, out, ttl);
  return out;
}

function applyOptionalIntelligenceV21(home, away, intel, job) {
  if (!intel?.enriched) return;
  const h = num(intel.homeAbsences,0), a = num(intel.awayAbsences,0);
  // Counts are only a cautious proxy until player-importance weighting is added.
  home.absenceImpact = clamp(h*0.025,0,0.18);
  away.absenceImpact = clamp(a*0.025,0,0.18);
  const confirmed = Boolean(intel.lineupsConfirmed);
  home.lineupCertainty = confirmed ? 0.95 : 0.72;
  away.lineupCertainty = confirmed ? 0.95 : 0.72;
  home.availability = {reportedAbsences:h,lineupConfirmed:confirmed};
  away.availability = {reportedAbsences:a,lineupConfirmed:confirmed};
  const applyRecent = (team, recent) => {
    if (!recent || recent.matches < 3) return;
    const sparse = num(team.sampleSize,0) < 5;
    team.formPointsPerGame = sparse
      ? clamp(num(recent.recencyWeightedPPG,1.5),0,3)
      : clamp(num(team.formPointsPerGame,1.5)*0.55 + num(recent.recencyWeightedPPG,1.5)*0.45,0,3);
    if (sparse) {
      team.sampleSize = Math.max(num(team.sampleSize,0), num(recent.matches,0));
      team.goalsForAvg = num(recent.goalsForAvg, team.goalsForAvg);
      team.goalsAgainstAvg = num(recent.goalsAgainstAvg, team.goalsAgainstAvg);
      team.homeGoalsForAvg = team.goalsForAvg;
      team.homeGoalsAgainstAvg = team.goalsAgainstAvg;
      team.awayGoalsForAvg = team.goalsForAvg;
      team.awayGoalsAgainstAvg = team.goalsAgainstAvg;
      team.homePointsPerGame = team.formPointsPerGame;
      team.awayPointsPerGame = team.formPointsPerGame;
      team.winRate = recent.matches ? num(recent.wins,0)/recent.matches : team.winRate;
      team.drawRate = recent.matches ? num(recent.draws,0)/recent.matches : team.drawRate;
      team.lossRate = recent.matches ? num(recent.losses,0)/recent.matches : team.lossRate;
      team.cleanSheetRate = num(recent.cleanSheetRate, team.cleanSheetRate);
      team.failedToScoreRate = num(recent.failedToScoreRate, team.failedToScoreRate);
    }
  };
  applyRecent(home, intel.homeRecent);
  applyRecent(away, intel.awayRecent);
  home.recentMatchContext = intel.homeRecent || null;
  away.recentMatchContext = intel.awayRecent || null;
  home.marketProfile = intel.homeMarketProfile || null;
  away.marketProfile = intel.awayMarketProfile || null;
  intel.shadowMarketModel = shadowMarketProbabilitiesV40(home.marketProfile, away.marketProfile);
  const compReliability = competitionReliability(job.competition, job.provider_league_id);
  const empiricalCalibration = intel.empiricalCalibration || {};
  intel.shadowMarketRanking = rankShadowMarketsV41(
    intel.shadowMarketModel,
    home.marketProfile,
    away.marketProfile,
    compReliability,
    empiricalCalibration
  );
  intel.shadowRecommendations = qualifyShadowDataDrivenV42(
    intel.shadowMarketRanking,
    {
      competitionReliability: compReliability,
      lineupCertainty: (num(home.lineupCertainty,0.70) + num(away.lineupCertainty,0.70)) / 2
    }
  );
  if (intel.h2h?.matches >= 2) { const edge=clamp(num(intel.h2h.recencyWeightedHomeShare,0.5)-0.5,-0.25,0.25); home.formPointsPerGame=clamp(home.formPointsPerGame+edge*0.12,0,3); away.formPointsPerGame=clamp(away.formPointsPerGame-edge*0.12,0,3); }
}

async function cachedTeamStatsV56(env, job, side) {
  const teamId = side === "home" ? job.home_team_id : job.away_team_id;
  const cutoffDate = cutoff(job.kickoff_at);
  const featureKey = String(teamId) + ":" + String(job.provider_league_id) + ":" + String(job.season) + ":" + cutoffDate;
  try {
    const cached = await sb(
      env,
      "two45_team_feature_snapshots?feature_key=eq." + encodeURIComponent(featureKey) + "&select=raw_features,as_of&limit=1",
      {timeoutMs: 2000}
    );
    const row = arr(cached)[0];
    if (row?.raw_features && typeof row.raw_features === "object" && Object.keys(row.raw_features).length) {
      return row.raw_features;
    }
  } catch (_) {}
  return null;
}

async function teamStats(
  env,
  job,
  side,
  skipCache = false
) {
  const teamId =
    side === "home"
      ? job.home_team_id
      : job.away_team_id;

  const teamName =
    side === "home"
      ? job.home_team
      : job.away_team;

  const cutoffDate = cutoff(job.kickoff_at);
  const featureKey =
    `${teamId}:${job.provider_league_id}:${job.season}:${cutoffDate}`;

  if (!skipCache) {
    try {
      const cached = await sb(
        env,
        `two45_team_feature_snapshots?feature_key=eq.${encodeURIComponent(featureKey)}&select=raw_features,as_of&limit=1`,
        {timeoutMs: 2000}
      );
      const row = arr(cached)[0];
      if (
        row?.raw_features &&
        typeof row.raw_features === "object" &&
        Object.keys(row.raw_features).length
      ) {
        return row.raw_features;
      }
    } catch (_) {}
  }

  const data =
    await football(
      env,
      "/teams/statistics",
      {
        league:
          job.provider_league_id,

        season:
          job.season,

        team:
          teamId,

        date:
          cutoffDate
      }
    );

  const raw = data.response || {};

  try {
    const sampleSize = num(raw?.fixtures?.played?.total, 0);
    await sb(
      env,
      "two45_team_feature_snapshots?on_conflict=feature_key",
      {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        timeoutMs: 1500,
        body: JSON.stringify({
          feature_key: featureKey,
          provider_team_id: String(teamId),
          team_name: teamName || String(teamId),
          provider_league_id: String(job.provider_league_id || ""),
          competition: job.competition || null,
          season: num(job.season, null),
          as_of: new Date().toISOString(),
          sample_size: sampleSize,
          data_quality: clamp(sampleSize / 10, 0, 1),
          raw_features: raw,
          source_meta: {
            provider: "api-football",
            cutoff: cutoffDate,
            cachedBy: "analysis-engine-v2"
          }
        })
      }
    );
  } catch (_) {}

  return raw;
}

/* =========================================================
   ODDS MAPPING
   ========================================================= */

function thresholdSelection(raw) {
  const s =
    String(
      raw ?? ""
    ).trim();

  const n =
    s.toLowerCase();

  const map = {
    home:
      "HOME",

    "1":
      "HOME",

    draw:
      "DRAW",

    x:
      "DRAW",

    away:
      "AWAY",

    "2":
      "AWAY",

    yes:
      "YES",

    no:
      "NO",

    "1x":
      "HOME_OR_DRAW",

    "x2":
      "DRAW_OR_AWAY",

    "12":
      "HOME_OR_AWAY"
  };

  if (
    map[n]
  ) {
    return map[n];
  }

  const m =
    n.match(
      /\b(over|under)\s*([0-9]+(?:\.[0-9]+)?)/i
    );

  if (m) {
    return `${
      m[1].toUpperCase()
    }_${
      m[2].replace(
        ".",
        "_"
      )
    }`;
  }

  return s
    .toUpperCase()
    .replace(
      /[^A-Z0-9]+/g,
      "_"
    )
    .replace(
      /^_+|_+$/g,
      ""
    );
}

function providerMarketName(name) {
  const n =
    String(
      name ||
      ""
    ).toLowerCase();

  if (
    n.includes(
      "match winner"
    ) ||
    n === "1x2"
  ) {
    return "MATCH_RESULT";
  }

  if (
    n.includes(
      "both teams"
    )
  ) {
    return "BTTS";
  }

  if (
    n.includes(
      "double chance"
    )
  ) {
    return "DOUBLE_CHANCE";
  }

  // Handicap Result is a separate 3-way market. Its displayed line is not
  // interchangeable with Two45's binary Asian-handicap probabilities, so never
  // attach those prices to HANDICAP model selections.
  if (
    n.includes(
      "handicap result"
    ) &&
    !n.includes("corner") &&
    !n.includes("card")
  ) {
    return null;
  }

  if (
    n.includes(
      "asian handicap"
    )
  ) {
    if (
      n.includes(
        "card"
      )
    ) {
      return "CARDS_HANDICAP";
    }

    if (
      n.includes(
        "corner"
      )
    ) {
      return "CORNERS_HANDICAP";
    }

    return "HANDICAP";
  }

  if (n.includes("corner") && n.includes("handicap")) return "CORNERS_HANDICAP";
  if (n.includes("card") && n.includes("handicap")) return "CARDS_HANDICAP";

  if (
    n.includes(
      "home corners"
    )
  ) {
    return "HOME_CORNERS";
  }

  if (
    n.includes(
      "away corners"
    )
  ) {
    return "AWAY_CORNERS";
  }

  if (
    n.includes(
      "corner"
    )
  ) {
    return "TOTAL_CORNERS";
  }

  if (
    n.includes(
      "home team total cards"
    ) ||
    n.includes(
      "home cards"
    )
  ) {
    return "HOME_CARDS";
  }

  if (
    n.includes(
      "away team total cards"
    ) ||
    n.includes(
      "away cards"
    )
  ) {
    return "AWAY_CARDS";
  }

  if (
    n.includes(
      "card"
    )
  ) {
    return "TOTAL_CARDS";
  }

  if (
    n.includes(
      "home player shots on target"
    )
  ) {
    return "HOME_PLAYER_SHOTS_ON_TARGET";
  }

  if (
    n.includes(
      "away player shots on target"
    )
  ) {
    return "AWAY_PLAYER_SHOTS_ON_TARGET";
  }

  if (
    n.includes(
      "shotongoal"
    ) ||
    n.includes(
      "shots on target"
    ) ||
    n.includes(
      "shot on target"
    )
  ) {
    return "TOTAL_SHOTS_ON_TARGET";
  }

  if (
    n.includes(
      "home player shots off target"
    )
  ) {
    return "HOME_PLAYER_SHOTS_OFF_TARGET";
  }

  if (
    n.includes(
      "away player shots off target"
    )
  ) {
    return "AWAY_PLAYER_SHOTS_OFF_TARGET";
  }

  if (
    n.includes(
      "shotoffgoal"
    ) ||
    n.includes(
      "shots off target"
    ) ||
    n.includes(
      "shot off target"
    )
  ) {
    return "TOTAL_SHOTS_OFF_TARGET";
  }

  if (
    n.includes(
      "home player shots total"
    )
  ) {
    return "HOME_PLAYER_SHOTS";
  }

  if (
    n.includes(
      "away player shots total"
    )
  ) {
    return "AWAY_PLAYER_SHOTS";
  }

  if (
    n.includes(
      "total shots"
    )
  ) {
    return "TOTAL_SHOTS";
  }

  if (
    n.includes(
      "goals over/under"
    ) ||
    n.includes(
      "total goals"
    )
  ) {
    return "TOTAL_GOALS";
  }

  if (
    n.includes(
      "home team score a goal"
    )
  ) {
    return "HOME_TEAM_GOALS";
  }

  if (
    n.includes(
      "away team score a goal"
    )
  ) {
    return "AWAY_TEAM_GOALS";
  }

  return null;
}

function oddsMarketsFromSnapshot(
  payload,
  fixtureId
) {
  const rows =
    Array.isArray(
      payload?.response
    )
      ? payload.response
      : [];

  const row =
    rows.find(
      x =>
        String(
          x?.fixture?.id ??
          x?.fixture_id ??
          x?.id
        ) ===
        String(
          fixtureId
        )
    );

  if (!row) {
    return [];
  }

  const out = [];

  for (
    const book
    of row.bookmakers ||
      []
  ) {
    // Source-of-truth sportsbook policy: ingest Bet365 only.
    const bookNameV64 = String(book?.name || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (bookNameV64 !== "bet365") continue;

    for (
      const bet
      of book.bets ||
        []
    ) {
      const market =
        providerMarketName(
          bet.name
        );

      if (!market) {
        continue;
      }

      const outcomes =
        [];

      for (
        const v
        of bet.values ||
          []
      ) {
        const raw =
          String(
            v.value ??
            v.name ??
            ""
          );

        const selection =
          thresholdSelection(
            raw
          );

        const odds =
          num(
            v.odd ??
            v.odds,
            null
          );

        if (
          selection &&
          odds > 1
        ) {
          outcomes.push({
            selection,
            rawSelection:
              raw,
            odds
          });
        }
      }

      if (
        outcomes.length >=
        2
      ) {
        out.push({
          market,

          rawMarket:
            bet.name ||
            market,

          bookmaker:
            book.name ||
            null,

          outcomes
        });
      }
    }
  }

  return groupMarketLinesV19(out);
}

function consensusCandidates(
  marketOdds = []
) {
  const buckets =
    new Map();

  for (
    const group
    of marketOdds
  ) {
    const valid =
      (
        group.outcomes ||
        []
      ).filter(
        x =>
          num(
            x.odds
          ) > 1
      );

    const inv =
      valid.reduce(
        (
          s,
          x
        ) =>
          s +
          1 /
            num(
              x.odds
            ),
        0
      );

    if (
      valid.length < 2 ||
      inv <= 0
    ) {
      continue;
    }

    for (
      const price
      of valid
    ) {
      const noVig =
        (
          1 /
          num(
            price.odds
          )
        ) /
        inv * (group.market === "DOUBLE_CHANCE" ? 2 : 1);

      const key =
        `${group.market}|${group.groupKey || ""}|${price.selection}`;

      const b =
        buckets.get(
          key
        ) ||
        {
          market:
            group.market,

          selection:
            price.selection,

          rawMarket:
            group.rawMarket,

          probabilities:
            [],

          offers:
            []
        };

      b.probabilities.push(
        noVig
      );

      b.offers.push({
        bookmaker:
          group.bookmaker ||
          null,

        odds:
          num(
            price.odds
          ),

        noVig
      });

      buckets.set(
        key,
        b
      );
    }
  }

  const out = [];

  for (
    const b
    of buckets.values()
  ) {
    const consensus =
      b.probabilities.reduce(
        (
          a,
          v
        ) =>
          a + v,
        0
      ) /
      b.probabilities.length;

    const best =
      b.offers
        .sort(
          (
            a,
            b
          ) =>
            b.odds -
            a.odds
        )[0];

    const bestImplied =
      1 /
      best.odds;

    out.push({
      market:
        b.market,

      selection:
        b.selection,

      rawMarket:
        b.rawMarket,

      probability:
        consensus,

      fairOdds:
        consensus > 0
          ? 1 /
            consensus
          : null,

      sportsbookOdds:
        best.odds,

      bookmaker:
        best.bookmaker,

      noVigMarketProbability:
        consensus,

      valueEdge:
        consensus -
        bestImplied,

      bookmakerCount:
        b.probabilities.length,

      analysisSource:
        "cross-book-market-consensus"
    });
  }

  return out;
}

/* =========================================================
   FORECAST WRITE
   ========================================================= */

async function writeForecast(
  env,
  job,
  analysis,
  decision
) {
  const market =
    decision.decision ===
    "PICK"
      ? decision.market
      : "NO_BET";

  const selection =
    decision.decision ===
    "PICK"
      ? decision.selection
      : "NO_BET";

  const probability =
    decision.decision ===
    "PICK"
      ? decision.probability
      : 0;

  const body = {
    forecast_key:
      `${MODEL_VERSION}:${job.provider_match_id}:${market}:${selection}`,

    provider_match_id:
      String(
        job.provider_match_id
      ),

    fixture_id:
      num(
        job.fixture_id,
        null
      ),

    kickoff_at:
      job.kickoff_at,

    competition:
      job.competition,

    home_team:
      job.home_team,

    away_team:
      job.away_team,

    model_version:
      MODEL_VERSION,

    market,

    selection,

    probability,

    fair_odds:
      decision.fairOdds ??
      null,

    sportsbook:
      decision.bookmaker ??
      null,

    sportsbook_odds:
      decision.sportsbookOdds ??
      null,

    no_vig_market_probability:
      decision.noVigMarketProbability ??
      null,

    value_edge:
      decision.valueEdge ??
      null,

    data_quality:
      analysis.dataQuality,

    competition_reliability:
      analysis.competitionReliability,

    lineup_certainty:
      analysis.lineupCertainty,

    decision:
      decision.decision,

    confidence_tier:
      decision.confidenceTier ??
      null,

    reasons: [
      decision.reason ||
      "Independent Two45 model evaluation"
    ],

    feature_snapshot: {
      expectedGoals:
        analysis.expectedGoals,

      homeTeam:
        analysis.homeTeam,

      awayTeam:
        analysis.awayTeam,

      pickType:
        decision.pickType ||
        null,

      riskLabel:
        decision.riskLabel ||
        null,

      analysisSource:
        decision.analysisSource ||
        null,

      topMarkets:
        decision.topMarkets ||
        [],

      decisionRevision:
        DECISION_REVISION
    },

    probability_snapshot:
      analysis.probabilities,

    created_at:
      new Date().toISOString()
  };

  const {
    url,
    key
  } =
    supa(env);

  const r =
    await fetch(
      `${url}/rest/v1/two45_model_forecasts?on_conflict=forecast_key`,
      {
        method:
          "POST",

        headers: {
          apikey:
            key,

          Authorization:
            `Bearer ${key}`,

          "Content-Type":
            "application/json",

          // Forecast core fields are immutable after first insert.
          // Reanalysis belongs in two45_analysis_state; never mutate an existing forecast row.
          Prefer:
            "resolution=ignore-duplicates,return=representation"
        },

        body:
          JSON.stringify(
            body
          ),

        signal:
          AbortSignal.timeout(7000)
      }
    );

  const text =
    await r.text();

  if (!r.ok) {
    throw new Error(
      `Forecast write ${r.status}: ${text}`
    );
  }

  return text
    ? JSON.parse(text)
    : null;
}

function pctClient(v) {
  const n =
    num(
      v,
      0
    );

  return (
    Math.round(
      (
        n <= 1
          ? n * 100
          : n
      ) *
      10
    ) /
    10
  );
}

function strongestIndependent(
  analysis
) {
  const all =
    flatten(
      analysis?.probabilities ||
      {}
    ).sort(
      (
        a,
        b
      ) =>
        b.probability -
        a.probability
    );

  return (
    all[0] ||
    null
  );
}

function manualForecast(
  job,
  analysis,
  decision
) {
  const strongest =
    strongestIndependent(
      analysis
    );

  const picked =
    decision?.decision ===
    "PICK";

  // V1.8.1: a NO_BET decision must stay NO_BET in the UI.
  // Keep the raw model leader as context only; never promote the
  // highest-probability market (typically Under 4.5) into a visible pick.
  const chosen =
    picked
      ? decision
      : null;

  return {
    fixtureId:
      num(
        job.fixture_id,
        null
      ),

    providerMatchId:
      String(
        job.provider_match_id ||
        job.fixture_id ||
        ""
      ),

    home:
      job.home_team,

    away:
      job.away_team,

    league:
      job.competition,

    kickoff:
      job.kickoff_at,

    modelVersion:
      MODEL_VERSION,

    market:
      chosen?.market ||
      "NO_BET",

    selection:
      displaySelectionV20(
        chosen?.selection ||
        "NO_BET"
      ),

    probability:
      chosen
        ? pctClient(
            chosen.probability
          )
        : 0,

    fairOdds:
      chosen?.fairOdds ??
      null,

    sportsbookOdds:
      decision?.sportsbookOdds ??
      null,

    bookmaker:
      decision?.bookmaker ??
      null,

    valueEdgePct:
      decision?.valueEdge !=
      null
        ? Math.round(
            decision.valueEdge *
            1000
          ) /
          10
        : null,

    dataQuality:
      pctClient(
        analysis?.dataQuality
      ),

    decision:
      decision?.decision ||
      "NO_BET",

    confidenceTier:
      decision?.confidenceTier ??
      null,

    pickType:
      decision?.pickType ||
      (
        decision?.confidenceTier ===
        "RISKY"
          ? "RISKY_VALUE"
          : picked
            ? "STRONG_PICK"
            : "NO_BET"
      ),

    riskLabel:
      decision?.riskLabel ??
      null,

    analysisSource:
      decision?.analysisSource ??
      (
        picked
          ? "independent-model"
          : null
      ),

    alternatives:
      displayAlternativesV20(
        decision?.topMarkets
      ),

    modelConfidence:
      chosen?.probability >=
        0.82 &&
      analysis?.dataQuality >=
        0.80
        ? "VERY_STRONG"

        : chosen?.probability >=
            0.72
          ? "STRONG"

          : chosen?.probability >=
              0.62
            ? "LEAN"

            : "LOW",

    two45View:
      picked &&
      decision?.confidenceTier ===
        "RISKY"
        ? "RISKY_VALUE"

        : picked
          ? "VALUE_PICK"

          : chosen?.probability >=
              0.75 &&
            analysis?.dataQuality >=
              0.68
            ? "STRONG_MODEL_VIEW_NO_VALUE_PICK"

            : "NO_BET",

    marketValue:
      picked
        ? "VALUE"
        : "UNPRICED",

    reasons: [
      decision?.reason ||
      (
        picked
          ? "Independent probability and sportsbook value gates cleared"
          : "No market passed probability, value and data-quality gates"
      ),

      ...(
        strongest &&
        !picked
          ? [
              "No qualified pick. Raw model probabilities remain available in detailed analysis only."
            ]
          : []
      )
    ]
  };
}

async function authenticatedUser(
  request,
  env
) {
  const auth =
    request.headers.get(
      "Authorization"
    ) || "";

  if (
    !auth.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const {
    url,
    key
  } =
    supa(env);

  const r =
    await fetch(
      `${url}/auth/v1/user`,
      {
        headers: {
          apikey:
            key,

          Authorization:
            auth
        }
      }
    );

  if (!r.ok) {
    return null;
  }

  return await r
    .json()
    .catch(
      () => null
    );
}

async function existingForecast(
  env,
  fixtureId
) {
  const rows =
    await sb(
      env,
      `two45_model_forecasts?fixture_id=eq.${encodeURIComponent(
        fixtureId
      )}&model_version=eq.${encodeURIComponent(
        MODEL_VERSION
      )}&select=*&order=created_at.desc&limit=1`
    );

  return (
    Array.isArray(rows) &&
    rows.length
      ? rows[0]
      : null
  );
}

function cooldownState(row) {
  if (
    !row?.created_at
  ) {
    return {
      active: false,
      remainingMs: 0,
      nextRefreshAt: null
    };
  }

  const created =
    new Date(
      row.created_at
    ).getTime();

  if (
    !Number.isFinite(
      created
    )
  ) {
    return {
      active: false,
      remainingMs: 0,
      nextRefreshAt: null
    };
  }

  const remainingMs =
    Math.max(
      0,
      REANALYZE_COOLDOWN_MS -
      (
        Date.now() -
        created
      )
    );

  return {
    active:
      remainingMs > 0,

    remainingMs,

    nextRefreshAt:
      new Date(
        created +
        REANALYZE_COOLDOWN_MS
      ).toISOString()
  };
}

function displaySelectionV20(value) {
  return String(value || "")
    .replace(/_(\d+)_(\d+)(?=$|_)/g, "_$1.$2");
}

function displayAlternativesV20(items) {
  return Array.isArray(items)
    ? items.map(item => {
        const lane = item?.lane || "WATCH";
        const edge = item?.valueEdge != null
          ? Math.round(num(item.valueEdge,0) * 1000) / 10
          : null;
        const role =
          lane === "STRONG"
            ? "STRONG_OPTION"
            : lane === "RISKY_VALUE"
              ? "VALUE_OPTION"
              : "WATCH_OPTION";
        const reason =
          lane === "STRONG"
            ? "Cleared Two45 probability, data-quality and market-value gates."
            : lane === "RISKY_VALUE"
              ? "Higher-variance option with a positive model/market edge."
              : num(item?.bookmakerCount,0) >= 2
                ? "Supported across multiple sportsbook lines; kept as an analysis option."
                : "Available market signal; useful for analysis but not yet a final Two45 pick.";
        return {
          ...item,
          selection: displaySelectionV20(item?.selection),
          role,
          reason,
          valueEdgePct: edge
        };
      })
    : [];
}

function forecastRowToClient(row) {
  if (!row) {
    return null;
  }

  const snap =
    row.probability_snapshot ||
    {};

  let strongest =
    null;
  let snapshotOptions = [];

  try {
    const flat =
      flatten(
        snap
      ).sort(
        (
          a,
          b
        ) =>
          b.probability -
          a.probability
      );

    strongest =
      flat[0] ||
      null;

    const preferred = flat
      .filter(x => num(x.probability, 0) >= 0.50)
      .filter(x => !(x.market === "TOTAL_GOALS" && String(x.selection) === "UNDER_4_5"))
      .sort((a, b) => num(b.probability, 0) - num(a.probability, 0));

    const seen = new Set();
    for (const x of preferred) {
      if (seen.has(x.market)) continue;
      snapshotOptions.push({
        ...x,
        lane: "WATCH",
        sportsbookOdds: null,
        bookmaker: null,
        bookmakerCount: null,
        valueEdge: null,
        analysisSource: "saved-model-snapshot"
      });
      seen.add(x.market);
      if (snapshotOptions.length >= 6) break;
    }
  } catch (_) {}

  const storedPick =
    row.decision ===
      "PICK" &&
    row.selection &&
    row.selection !==
      "NO_BET";

  // V1.8.1: never turn a stored NO_BET into a synthetic pick by
  // displaying the mathematically safest model outcome.
  const market =
    storedPick
      ? row.market
      : "NO_BET";

  const selection =
    displaySelectionV20(
      storedPick
        ? row.selection
        : "NO_BET"
    );

  const probability =
    storedPick
      ? pctClient(
          row.probability
        )
      : 0;

  return {
    fixtureId:
      num(
        row.fixture_id,
        null
      ),

    providerMatchId:
      String(
        row.provider_match_id ||
        row.fixture_id ||
        ""
      ),

    home:
      row.home_team,

    away:
      row.away_team,

    league:
      row.competition,

    kickoff:
      row.kickoff_at,

    modelVersion:
      row.model_version,

    market,

    selection,

    probability,

    fairOdds:
      storedPick
        ? row.fair_odds
        : null,

    modelLeader:
      !storedPick && strongest
        ? {
            market: strongest.market,
            selection: displaySelectionV20(strongest.selection),
            probability: pctClient(strongest.probability),
            fairOdds: strongest.fairOdds ?? null
          }
        : null,

    sportsbookOdds:
      row.sportsbook_odds ??
      null,

    bookmaker:
      row.sportsbook ??
      null,

    valueEdgePct:
      row.value_edge !=
      null
        ? Math.round(
            num(
              row.value_edge
            ) *
            1000
          ) /
          10
        : null,

    dataQuality:
      pctClient(
        row.data_quality
      ),

    decision:
      row.decision ||
      "NO_BET",

    confidenceTier:
      row.confidence_tier ??
      null,

    pickType:
      row?.feature_snapshot?.pickType ||
      (
        row.confidence_tier ===
        "RISKY"
          ? "RISKY_VALUE"
          : storedPick
            ? "STRONG_PICK"
            : "NO_BET"
      ),

    riskLabel:
      row?.feature_snapshot?.riskLabel ??
      null,

    analysisSource:
      row?.feature_snapshot?.analysisSource ??
      null,

    alternatives:
      displayAlternativesV20(
        Array.isArray(row?.feature_snapshot?.topMarkets) &&
        row.feature_snapshot.topMarkets.length
          ? row.feature_snapshot.topMarkets
          : snapshotOptions
      ),

    modelConfidence:
      probability >=
        82 &&
      pctClient(
        row.data_quality
      ) >=
        80
        ? "VERY_STRONG"

        : probability >=
            72
          ? "STRONG"

          : probability >=
              62
            ? "LEAN"
            : "LOW",

    two45View:
      storedPick &&
      row.confidence_tier ===
        "RISKY"
        ? "RISKY_VALUE"

        : storedPick
          ? "VALUE_PICK"

          : probability >=
              75 &&
            pctClient(
              row.data_quality
            ) >=
              68
            ? "STRONG_MODEL_VIEW_NO_VALUE_PICK"

            : "NO_BET",

    marketValue:
      storedPick
        ? "VALUE"
        : "UNPRICED",

    reasons:
      Array.isArray(
        row.reasons
      )
        ? row.reasons
        : []
  };
}

async function jobForFixture(
  env,
  fixtureId
) {
  const rows =
    await sb(
      env,
      `two45_feature_jobs?fixture_id=eq.${encodeURIComponent(
        fixtureId
      )}&select=*&order=requested_at.desc&limit=1`
    );

  return (
    Array.isArray(rows) &&
    rows.length
      ? rows[0]
      : null
  );
}

async function claimNextFreshJobV55(env) {
  const rows = await sb(env, "rpc/two45_claim_next_fresh_job_v55", {
    method: "POST",
    timeoutMs: 2500,
    body: JSON.stringify({p_model_version: MODEL_VERSION})
  });
  return arr(rows)[0] || null;
}

async function deferClaimedJobV55(env, job, message) {
  return sb(env, "rpc/two45_defer_claimed_job_v55", {
    method: "POST",
    timeoutMs: 2000,
    body: JSON.stringify({
      p_job_id: job.id,
      p_fixture_id: Number(job.fixture_id),
      p_model_version: MODEL_VERSION,
      p_message: message
    })
  });
}

async function claimSpecificJob(env, job) {
  if (!dateAllowedV19(dateOfV19(job.kickoff_at))) return null;
  if (!['PENDING', 'READY', 'FAILED'].includes(job.status)) return null;

  // V50 reliability: claim inside Postgres as one atomic operation.
  // This removes the fragile timestamp-filter PATCH path and makes
  // overlapping cron isolates harmless: only one caller can own the row.
  const rows = await sb(env, "rpc/two45_claim_feature_job", {
    method: "POST",
    timeoutMs: 5000,
    body: JSON.stringify({
      p_job_id: job.id,
      p_expected_status: job.status,
      p_expected_attempts: num(job.attempts),
      p_expected_requested_at: job.requested_at
    })
  });

  const owned = arr(rows)[0] || null;
  if (owned) await beginCanonicalAnalysisV2(env, owned);
  return owned;
}

async function analyzeFixtureOnDemand(
  request,
  env
) {
  const user =
    await authenticatedUser(
      request,
      env
    );

  if (!user?.id) {
    return {
      httpStatus:
        401,

      body: {
        ok:
          false,

        code:
          "SIGN_IN_REQUIRED",

        message:
          "Sign in to request an on-demand analysis."
      }
    };
  }

  const body =
    await request
      .json()
      .catch(
        () => ({})
      );

  const fixtureId =
    Math.trunc(
      num(
        body.fixtureId,
        0
      )
    );

  const force =
    body.force ===
    true;

  if (!fixtureId) {
    return {
      httpStatus:
        400,

      body: {
        ok:
          false,

        code:
          "INVALID_FIXTURE",

        message:
          "A valid fixture ID is required."
      }
    };
  }


  const canonical = await currentCanonicalAnalysisV2(env, fixtureId).catch(() => null);
  if (canonical?.status === "COMPLETE" && !canonical.refreshing && !force) {
    const forecast = canonicalForecastV2(canonical);
    if (forecast) {
      const cd = cooldownState({created_at: canonical.completed_at});
      return {
        httpStatus: 200,
        body: {
          ok: true,
          status: "READY",
          source: "canonical-analysis-v2",
          forecast,
          canReanalyze: !cd.active,
          nextRefreshAt: cd.nextRefreshAt,
          cooldownSeconds: Math.ceil(cd.remainingMs / 1000)
        }
      };
    }
  }

  if (canonical?.status === "PROCESSING" || canonical?.refreshing) {
    return {
      httpStatus: 202,
      body: {
        ok: true,
        status: "QUEUED",
        fixtureId,
        message: "Analysis is already running."
      }
    };
  }

  let job =
    await jobForFixture(
      env,
      fixtureId
    );

  if (!job) {
    await syncFixtureJobsV19(env);
    job = await jobForFixture(env, fixtureId);
  }
  if (job && !dateAllowedV19(dateOfV19(job.kickoff_at))) {
    return {httpStatus: 202, body: {ok: true, status: "WAITING", fixtureId, waitingUntil: "20:00 America/New_York"}};
  }
  if (!job) {
    return {
      httpStatus:
        404,

      body: {
        ok:
          false,

        code:
          "NOT_QUEUED",

        message:
          "This fixture is not currently available to the Independent Model."
      }
    };
  }

  const started =
    job.started_at
      ? new Date(
          job.started_at
        ).getTime()
      : 0;

  const ageMs =
    started
      ? Date.now() -
        started
      : Infinity;

  const rateLimited =
    /rate.?limit|too many requests|HTTP 429|daily cap|budget reservation|quiet window/i.test(
      String(
        job.last_error ||
        ""
      )
    );

  if (
    job.status ===
      "IN_PROGRESS" &&
    ageMs <
      120000
  ) {
    return {
      httpStatus:
        202,

      body: {
        ok:
          true,

        status:
          "QUEUED",

        fixtureId,

        message:
          "Analysis is already running."
      }
    };
  }

  if (
    rateLimited &&
    ageMs <
      90000
  ) {
    return {
      httpStatus:
        202,

      body: {
        ok:
          true,

        status:
          "QUEUED",

        fixtureId,

        retryAfterSeconds:
          Math.max(
            5,
            Math.ceil(
              (
                90000 -
                ageMs
              ) /
              1000
            )
          ),

        message:
          "The provider's per-minute limit is cooling down. This match stays at the front of the queue."
      }
    };
  }

  if (
    ![
      "PENDING",
      "FAILED",
      "READY"
    ].includes(
      job.status
    )
  ) {
    return {
      httpStatus:
        202,

      body: {
        ok:
          true,

        status:
          "QUEUED",

        fixtureId,

        message:
          "This match is already being handled by the Independent Model."
      }
    };
  }

  if (providerQuietWindow()) {
    return {httpStatus:202, body:{ok:true,status:"QUEUED",fixtureId,message:"Analysis queued. Two45 provider requests resume at 5:00 AM Eastern."}};
  }

  const claimed =
    await claimSpecificJob(
      env,
      job
    );

  if (!claimed) {
    return {
      httpStatus:
        202,

      body: {
        ok:
          true,

        status:
          "QUEUED",

        fixtureId,

        message:
          "Another analysis process claimed this match first."
      }
    };
  }

  const result = await processOne(env, claimed);

  if (
    result.status ===
    "READY"
  ) {
    return {
      httpStatus:
        200,

      body: {
        ok:
          true,

        status:
          "READY",

        source:
          force
            ? "on-demand-refresh"
            : "on-demand",

        forecast:
          result.forecast || manualForecast(
            claimed,
            result.analysis,
            result.decision
          ),

        canReanalyze:
          false,

        nextRefreshAt:
          new Date(
            Date.now() +
            REANALYZE_COOLDOWN_MS
          ).toISOString(),

        cooldownSeconds:
          Math.ceil(
            REANALYZE_COOLDOWN_MS /
            1000
          )
      }
    };
  }

  const isRate =
    /rate.?limit|too many requests|HTTP 429|daily cap|budget reservation|quiet window/i.test(
      String(
        result.error ||
        ""
      )
    );

  return {
    httpStatus:
      isRate
        ? 202
        : 500,

    body: {
      ok:
        isRate,

      status:
        isRate
          ? "QUEUED"
          : "FAILED",

      fixtureId,

      message:
        isRate
          ? "Provider limit reached for this minute. Two45 kept the match queued for retry."
          : (
              result.error ||
              "The analysis could not be completed."
            )
    }
  };
}

function competitionReliability(name, leagueId = null) {
  const tier = competitionTierV21(name, leagueId);
  if (tier === 1) return 0.90;
  if (tier === 2) return 0.86;
  if (tier === 3) return 0.81;
  return 0.75;
}

async function processOne(
  env,
  job
) {
  try {
    // Never hold one fixture lease across two missing upstream team-stat calls.
    // Cache lookup is cheap; if both sides are absent, fetch one side and release.
    const canonicalBefore =
      await currentCanonicalAnalysisV2(env, job.fixture_id).catch(() => null);
    const baselineFirstPass =
      canonicalBefore?.status !== "COMPLETE";

    let [hs, as] = await Promise.all([
      cachedTeamStatsV56(env, job, "home"),
      cachedTeamStatsV56(env, job, "away")
    ]);

    const missingHome = !hs;
    const missingAway = !as;

    let fetchedBaselineSide = null;
    if (missingHome) {
      hs = await teamStats(env, job, "home", true);
      fetchedBaselineSide = "home";
    } else if (missingAway) {
      as = await teamStats(env, job, "away", true);
      fetchedBaselineSide = "away";
    }

    // V52 reliability invariant: at most one provider request per fixture per
    // cron cycle. Even when this fetch completes the two-team baseline, defer
    // final analysis/odds to the next cron rather than making a second provider
    // call in the same Worker event.
    if (fetchedBaselineSide) {
      const stillNeedsAway = missingHome && missingAway;
      const deferMessage = stillNeedsAway
        ? "Baseline home input cached; waiting for away input"
        : "Baseline inputs ready; continuing analysis next cycle";
      await deferClaimedJobV55(env, job, deferMessage).catch(() => null);
      return {
        fixtureId: job.fixture_id,
        status: "DEFERRED",
        baselineStaged: true,
        fetchedBaselineSide,
        waitingFor: stillNeedsAway ? "away-team-baseline" : "analysis-next-cycle",
        rateLimited: false
      };
    }

    if (!hs || !as) {
      throw new Error("Baseline team features unavailable after incremental fetch");
    }

    const hf = toFeatures(hs);
    const af = toFeatures(as);

    // Publish the first forecast from minimum reliable cached team-stat inputs.
    // Costly enrichment only runs after a genuine COMPLETE canonical baseline.
    const optionalIntel = baselineFirstPass
      ? {source:"baseline-first-pass", enriched:false, deferred:true}
      : await optionalIntelligenceV21(env, job);
    applyOptionalIntelligenceV21(hf, af, optionalIntel, job);

    const analysis =
      analyzeMatch({
        homeTeam:
          job.home_team,

        awayTeam:
          job.away_team,

        home:
          hf,

        away:
          af,

        context: {
          competitionReliability:
            competitionReliability(
              job.competition,
              job.provider_league_id
            )
        }
      });

    analysis.intelligence = {
      ...(analysis.intelligence || {}),
      availability: optionalIntel,
      shadowMarketModel: optionalIntel?.shadowMarketModel || null,
      shadowMarketRanking: optionalIntel?.shadowMarketRanking || null,
      shadowRecommendations: optionalIntel?.shadowRecommendations || []
    };
    await applyLiveStateV19(env, job, analysis);
    const odds = analysis.live && !analysis.liveUsable ? {response: []} : await oddsForJobV19(env, job);

    const marketOdds =
      oddsMarketsFromSnapshot(
        odds,
        job.fixture_id
      );

    const decision =
      selectIndependent(
        analysis,
        marketOdds,
        competitionTierV21(job.competition, job.provider_league_id)
      );

    const clientForecast = manualForecast(job, analysis, decision);

    await writeForecast(
      env,
      job,
      analysis,
      decision
    );

    await saveLatestAnalysisV19(env, job, analysis, decision);

    await completeCanonicalAnalysisV2(env, job, clientForecast, analysis, decision);

    await patchJob(
      env,
      job.id,
      {
        attempts: 0,
        status:
          "READY",

        completed_at:
          new Date()
            .toISOString(),

        last_error:
          null
      }
    );

    return {
      fixtureId:
        job.fixture_id,

      status:
        "READY",

      decision,

      analysis,

      forecast: clientForecast
    };

  } catch (e) {
    const msg =
      e?.message ||
      String(e);

    const rateLimited =
      /rate.?limit|too many requests|HTTP 429|daily cap|budget reservation|quiet window|pacing lock busy|another request is active/i.test(
        msg
      );

    await patchJob(
      env,
      job.id,
      {
        status:
          rateLimited
            ? "PENDING"

            : num(
                job.attempts,
                0
              ) >= 4
              ? "FAILED"
              : "PENDING",

        attempts:
          rateLimited ? 0 : num(job.attempts, 0),

        started_at:
          rateLimited ? null : job.started_at,

        last_error:
          msg
      }
    );

    return {
      fixtureId:
        job.fixture_id,

      status:
        rateLimited ? "DEFERRED" : "FAILED",

      error:
        msg,

      rateLimited
    };
  }
}

async function loadExistingQueueV39(env) {
  try {
    const rows = arr(await sb(env, "rpc/two45_next_feature_jobs_v2", {
      method: "POST",
      timeoutMs: 5000,
      body: JSON.stringify({
        p_model_version: MODEL_VERSION,
        p_limit: 30
      })
    }));

    const jobs = rows.map(r => ({
      ...(r.job || {}),
      canonicalComplete: Boolean(r.canonical_complete),
      canonicalStatus: r.canonical_status || "PENDING",
      canonicalRefreshing: Boolean(r.canonical_refreshing),
      shadowAttempted: Boolean(r.shadow_attempted)
    }));

    return {
      jobs,
      summary: {
        eligible: jobs.length,
        existing: jobs.length,
        inserted: 0,
        excluded: 0,
        source: "ranked-rpc-v2"
      }
    };
  } catch (e) {
    // Small bounded fallback only; never scan the full queue in a cron cycle.
    const jobs = arr(await sb(
      env,
      "two45_feature_jobs?status=in.(PENDING,READY,FAILED)&select=id,job_key,provider_match_id,fixture_id,kickoff_at,competition,provider_league_id,season,home_team_id,home_team,away_team_id,away_team,status,priority,attempts,requested_at,started_at,completed_at,last_error,source_snapshot_key,metadata&order=priority.asc,requested_at.asc&limit=30",
      {timeoutMs: 5000}
    ));
    const ids = jobs.map(j => Number(j.fixture_id)).filter(Boolean);
    const canonical = ids.length
      ? await rowsForIdsV19(env, "two45_analysis_state", "fixture_id", ids)
      : [];
    const byFixture = new Map(
      canonical
        .filter(r => r.model_version === MODEL_VERSION)
        .map(r => [Number(r.fixture_id), r])
    );
    return {
      jobs: jobs.map(j => {
        const row = byFixture.get(Number(j.fixture_id));
        return {
          ...j,
          canonicalComplete: row?.status === "COMPLETE",
          canonicalStatus: row?.status || "PENDING",
          canonicalRefreshing: Boolean(row?.refreshing),
          shadowAttempted: Boolean(row?.shadow_attempted)
        };
      }),
      summary: {
        eligible: jobs.length,
        existing: jobs.length,
        inserted: 0,
        excluded: 0,
        source: "bounded-fallback-v2"
      }
    };
  }
}

async function processJobs(env, limit = DEFAULT_MODEL_BATCH, prepared = null, skipRecovery = false) {
  if (providerQuietWindow()) {
    return {ok:true, skipped:true, reason:"Provider quiet window 00:00-05:00 America/New_York", claimed:0, processed:0, queue:null, results:[]};
  }

  // V55: scheduled fresh coverage uses a single Postgres claim operation.
  // This removes queue-load + rank + REST claim from the cron critical path.
  if (skipRecovery) {
    const freshResults = [];
    const freshDeadline = Date.now() + 12500;
    for (let step = 0; step < 3 && Date.now() < freshDeadline; step++) {
      const freshOwned = await timedV2(claimNextFreshJobV55(env), 3000, "atomic fresh claim").catch(() => null);
      if (!freshOwned) break;
      let result;
      try {
        result = await timedV2(processOne(env, freshOwned), 11000,
          "fresh fixture " + freshOwned.fixture_id + " analysis");
      } catch (e) {
        const msg = "V69 bounded fresh-cycle recovery: " + safeRefreshError(e);
        await deferClaimedJobV55(env, freshOwned, msg).catch(() => null);
        result = {fixtureId:freshOwned.fixture_id,status:"DEFERRED",autoRecovered:true,rateLimited:false,error:msg};
      }
      freshResults.push(result);
      if (result?.rateLimited || /bounded provider burst complete/i.test(String(result?.error || ""))) break;
    }
    if (freshResults.length) {
      const ready = freshResults.filter(x => x.status === "READY").length;
      return {
        ok:freshResults.every(x => x.status === "READY" || x.status === "DEFERRED"),
        claimed:freshResults.length, processed:freshResults.length, claimStarved:false,
        candidateCount:freshResults.length, freshTomorrowBacklog:0,
        freshBaselineBacklog:Math.max(0,freshResults.length-ready),
        adaptiveBatch:freshResults.length,
        queue:{eligible:freshResults.length,existing:freshResults.length,inserted:0,excluded:0,source:"atomic-fresh-v69"},
        results:freshResults
      };
    }
  }

  // V51: scheduledAnalysisV2 already runs the watchdog before entering this
  // function. Do not spend up to 12 seconds repeating stale recovery in the
  // same cron event; that was starving the actual analysis pass.
  if (!skipRecovery) {
    await timedV2(requeueStale(env), 4000, "stale job recovery").catch(() => null);
    await timedV2(recoverCanonicalAnalysisV2(env), 4000, "canonical recovery").catch(() => null);
  }
  const queue = prepared || await timedV2(loadExistingQueueV39(env), 4000, "queue load");
  const candidates = rankedJobsV19(queue.jobs);
  const freshTomorrowBacklog = candidates.filter(j => !j.canonicalComplete && dateOfV19(j.kickoff_at) === tomorrowEasternDate()).length;
  const adaptive = adaptiveBatchV30(candidates, limit);
  const freshBaselineBacklog = adaptive.freshBaselineBacklog;
  // Cruise-control soak mode: while fresh baselines remain, finish one fixture lease
  // cleanly per cron execution rather than risking a second claim late in the cycle.
  const cycleLimit = freshBaselineBacklog > 0 ? 1 : adaptive.limit;
  const pacing = (await getFeedSnapshot(env, 'api-football-pacing').catch(() => null))?.payload || {};
  const fastBaselineMode = freshBaselineBacklog > 0;
  if (Boolean(pacing.fastBaselineMode) !== fastBaselineMode) {
    pacing.fastBaselineMode = fastBaselineMode;
    await saveFeedSnapshot(env, 'api-football-pacing', pacing, 172800);
  }
  const cooldownWait = Math.max(0, num(pacing.blockedUntil) - Date.now());
  if (cooldownWait > 20000) {
    return {ok:true, skipped:true, cooldownActive:true, retryAt:num(pacing.blockedUntil), reason:'Provider cooldown', claimed:0, processed:0, freshTomorrowBacklog, freshBaselineBacklog, adaptiveBatch:cycleLimit, queue:queue.summary, results:[]};
  }
  const results = [];
  const deadline = Date.now() + (freshBaselineBacklog > 0 ? 15000 : 13000);
  let claimed = 0;
  for (const candidate of candidates) {
    if (claimed >= cycleLimit || Date.now() >= deadline) break;
    // READY jobs become pending only when due. Do not reset failed-job backoff.
    let job = candidate;
    if (job.status === 'READY') {
      const rows = await sb(env,
        `two45_feature_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.READY&completed_at=eq.${encodeURIComponent(job.completed_at)}&select=*`, {
          method: 'PATCH', body: JSON.stringify({status: 'PENDING', attempts: 0,
            requested_at: new Date().toISOString()})
        });
      if (!arr(rows).length) continue;
      job = {...rows[0], metadata: job.metadata, kickoff_at: job.kickoff_at};
    }
    const owned = await claimSpecificJob(env, job);
    if (!owned) continue;
    claimed++;
    let result;
    try {
      result = await timedV2(
        processOne(env, owned),
        10000,
        "fixture " + owned.fixture_id + " analysis"
      );
    } catch (e) {
      const msg = safeRefreshError(e);
      await patchJob(env, owned.id, {
        status: "PENDING",
        started_at: null,
        last_error: "Auto-requeued after bounded analysis timeout: " + msg
      }).catch(() => null);
      await sb(
        env,
        "two45_analysis_state?analysis_key=eq." + encodeURIComponent(analysisKeyV2(owned)),
        {
          method: "PATCH",
          timeoutMs: 6000,
          body: JSON.stringify({
            status: "PENDING",
            refreshing: false,
            started_at: null,
            updated_at: new Date().toISOString(),
            last_error: "Auto-requeued after bounded analysis timeout: " + msg,
            next_retry_at: new Date(Date.now() + 60000).toISOString()
          })
        }
      ).catch(() => null);
      result = {
        fixtureId: owned.fixture_id,
        status: "DEFERRED",
        rateLimited: false,
        autoRecovered: true,
        error: msg
      };
    }
    results.push(result);
    if (result.rateLimited) break; // Stop before consuming further budget/failed attempts.
  }
  const claimStarved = candidates.length > 0 && claimed === 0;
  return {
    ok: !claimStarved && results.every(x => x.status === 'READY' || x.status === 'DEFERRED'),
    claimed,
    processed: results.length,
    claimStarved,
    candidateCount: candidates.length,
    freshTomorrowBacklog,
    freshBaselineBacklog,
    adaptiveBatch:cycleLimit,
    queue: queue.summary,
    results
  };
}


function updateCalibrationAccumulatorV44(current, rows) {
  const out = current && typeof current === "object"
    ? JSON.parse(JSON.stringify(current))
    : {};
  out.buckets = out.buckets || {};
  out.settled = num(out.settled,0);
  out.wins = num(out.wins,0);
  out.losses = num(out.losses,0);
  for (const row of arr(rows)) {
    if (!["WIN","LOSS"].includes(row.result)) continue;
    const key = row.market + "|" + row.calibrationBucket;
    const b = out.buckets[key] || {settled:0,wins:0,losses:0};
    b.settled++; out.settled++;
    if (row.result === "WIN") { b.wins++; out.wins++; }
    else { b.losses++; out.losses++; }
    b.hitRate = b.settled ? b.wins / b.settled : null;
    out.buckets[key] = b;
  }
  out.hitRate = out.settled ? out.wins / out.settled : null;
  out.updatedAt = new Date().toISOString();
  return out;
}

async function settleShadowBacktestV44(env, limit = 1) {
  if (!shadowV40Enabled(env)) return {ok:true,disabled:true,processed:0,skipped:0};
  const cutoffIso = new Date(Date.now() - 90 * 60000).toISOString();
  const rows = await sb(
    env,
    "two45_analysis_state?status=eq.COMPLETE&kickoff_at=lt." +
      encodeURIComponent(cutoffIso) +
      "&select=fixture_id,kickoff_at,result&order=kickoff_at.desc&limit=80"
  ).catch(() => []);
  let processed = 0;
  let skipped = 0;

  for (const row of arr(rows)) {
    if (processed >= Math.max(1,num(limit,1))) break;
    const fixtureId = Number(row.fixture_id);
    const result = row.result || {};
    const recommendations = arr(result?.intelligence?.shadowRecommendations)
      .filter(x => x?.market && x?.selection);
    const context = result.shadowContext || {};
    if (!fixtureId || !recommendations.length || !context.homeTeamId || !context.awayTeamId) {
      skipped++;
      continue;
    }

    const existing = await getFeedSnapshot(env, "shadow-backtest:" + fixtureId).catch(() => null);
    if (existing?.payload?.settled) { skipped++; continue; }

    const date = dateOfV19(row.kickoff_at);
    const fixtureSnap = await getFeedSnapshot(env, fixtureKey(date)).catch(() => null);
    const fixtureRows = arr(
      fixtureSnap?.payload?.response ||
      fixtureSnap?.payload?.fixtures ||
      fixtureSnap?.payload
    );
    const fixture = fixtureRows.find(f => Number(f?.fixture?.id || f?.id) === fixtureId);
    const status = String(fixture?.fixture?.status?.short || fixture?.status?.short || "").toUpperCase();
    if (!FINISHED_STATUSES.has(status)) { skipped++; continue; }

    const allowed = await reserveShadowCallV46(env, 1);
    if (!allowed) break;
    const statResponse = await football(env, "/fixtures/statistics", {fixture: fixtureId});
    const stats = arr(statResponse?.response);
    if (!stats.length) { skipped++; continue; }

    const graded = buildShadowBacktestRowsV43(
      recommendations,
      stats,
      Number(context.homeTeamId),
      Number(context.awayTeamId)
    ).filter(x => x.result !== "UNGRADABLE");
    if (!graded.length) { skipped++; continue; }

    const payload = {
      settled:true,
      fixtureId,
      kickoffAt:row.kickoff_at,
      gradedAt:new Date().toISOString(),
      rows:graded
    };
    await saveFeedSnapshot(env, "shadow-backtest:" + fixtureId, payload, 90 * 86400);

    const currentCalibration = (await getFeedSnapshot(env, "shadow-calibration:v44").catch(() => null))?.payload || {};
    const nextCalibration = updateCalibrationAccumulatorV44(currentCalibration, graded);
    await saveFeedSnapshot(env, "shadow-calibration:v44", nextCalibration, 365 * 86400);
    processed++;
  }

  const calibration = (await getFeedSnapshot(env, "shadow-calibration:v44").catch(() => null))?.payload || {};
  return {
    ok:true,
    processed,
    skipped,
    calibrationSettled:num(calibration.settled,0),
    calibrationHitRate:calibration.hitRate ?? null
  };
}


function parseCalibrationBucketV45(bucket) {
  const m = String(bucket || "").match(/^([0-9.]+)-([0-9.]+)$/);
  if (!m) return null;
  const low = Number(m[1]);
  const high = Number(m[2]);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  return {low, high, midpoint:(low+high)/2};
}

function shadowAccuracyReportFromCalibrationV45(calibration = {}) {
  const buckets = calibration?.buckets || {};
  const marketMap = {};
  let brierWeighted = 0;
  let brierN = 0;

  for (const [key,row] of Object.entries(buckets)) {
    const split = key.lastIndexOf("|");
    if (split < 0) continue;
    const market = key.slice(0, split);
    const bucket = key.slice(split + 1);
    const settled = num(row?.settled,0);
    const wins = num(row?.wins,0);
    const losses = num(row?.losses,0);
    if (!settled) continue;

    const hitRate = wins / settled;
    const parsed = parseCalibrationBucketV45(bucket);
    const statedProbability = parsed?.midpoint ?? null;
    const calibrationError = statedProbability == null
      ? null
      : Math.abs(hitRate - statedProbability);

    marketMap[market] = marketMap[market] || {
      market,
      settled:0,
      wins:0,
      losses:0,
      weightedStatedProbability:0,
      calibrationErrorWeighted:0,
      calibrationErrorN:0,
      buckets:[]
    };
    const m = marketMap[market];
    m.settled += settled;
    m.wins += wins;
    m.losses += losses;
    if (statedProbability != null) {
      m.weightedStatedProbability += statedProbability * settled;
      m.calibrationErrorWeighted += calibrationError * settled;
      m.calibrationErrorN += settled;
      brierWeighted += Math.pow(hitRate - statedProbability,2) * settled;
      brierN += settled;
    }
    m.buckets.push({
      bucket,
      settled,
      wins,
      losses,
      hitRate,
      statedProbability,
      calibrationError
    });
  }

  const markets = Object.values(marketMap).map(m => ({
    market:m.market,
    settled:m.settled,
    wins:m.wins,
    losses:m.losses,
    hitRate:m.settled ? m.wins/m.settled : null,
    avgStatedProbability:m.calibrationErrorN
      ? m.weightedStatedProbability/m.calibrationErrorN
      : null,
    meanCalibrationError:m.calibrationErrorN
      ? m.calibrationErrorWeighted/m.calibrationErrorN
      : null,
    buckets:m.buckets.sort((a,b) => String(a.bucket).localeCompare(String(b.bucket)))
  })).sort((a,b) => b.settled - a.settled);

  return {
    model:"two45-market-shadow-v40",
    calibrationStatus:num(calibration?.settled,0) >= 20 ? "EMPIRICAL_ACTIVE" : "COLLECTING",
    settled:num(calibration?.settled,0),
    wins:num(calibration?.wins,0),
    losses:num(calibration?.losses,0),
    hitRate:calibration?.hitRate ?? (num(calibration?.settled,0) ? num(calibration?.wins,0)/num(calibration?.settled,0) : null),
    calibrationBrier:brierN ? brierWeighted/brierN : null,
    markets,
    updatedAt:calibration?.updatedAt || null
  };
}

async function shadowAccuracyReportV45(env) {
  const calibration = (await getFeedSnapshot(env, "shadow-calibration:v44").catch(() => null))?.payload || {};
  return shadowAccuracyReportFromCalibrationV45(calibration);
}

async function settle(env) {
  return await sb(
    env,
    "rpc/two45_settle_from_fixture_snapshot",
    {
      method:
        "POST",

      body:
        JSON.stringify({
          p_snapshot_key:
            `fixtures:${easternDate()}`
        })
    }
  );
}

async function modelStatus(env) {
  let forecasts =
    null;

  let pending =
    null;

  let ready =
    null;

  try {
    const rows =
      await allRowsV19(
        env,
        "two45_model_forecasts?select=id&order=id.asc"
      );

    forecasts =
      Array.isArray(
        rows
      )
        ? rows.length
        : null;
  } catch (_) {}

  try {
    const rows =
      await allRowsV19(
        env,
        "two45_feature_jobs?select=status&order=id.asc"
      );

    if (
      Array.isArray(
        rows
      )
    ) {
      pending =
        rows.filter(
          x =>
            x.status ===
            "PENDING"
        ).length;

      ready =
        rows.filter(
          x =>
            x.status ===
            "READY"
        ).length;
    }

  } catch (_) {}

  return {
    ok:
      true,

    modelVersion:
      MODEL_VERSION,

    coreUsesSportsbookOdds:
      true,

    forecastCount:
      forecasts,

    pendingFeatureJobs:
      pending,

    readyFeatureJobs:
      ready,

    pacingRevision: PACING_REVISION,
    providerPacing: {minIntervalMs: FAST_BASELINE_INTERVAL_MS, maxIntervalMs: 22000, targetDailyRequests: TARGET_DAILY_REQUESTS, practicalDailyCap: PRACTICAL_DAILY_CAP, hardCap: HARD_CAP, state: (await getFeedSnapshot(env, "api-football-pacing"))?.payload || null, currentIntervalMs: adaptiveProviderIntervalV30((await getFeedSnapshot(env, "api-football-pacing"))?.payload || {})},
    modelBatch: batchLimitV19(env.TWO45_MODEL_BATCH),
    shadowV40: {
      enabled: shadowV40Enabled(env),
      dailyCap: Math.max(50,num(env.TWO45_V40_DAILY_CAP,SHADOW_V40_DEFAULT_DAILY_CAP)),
      budget: await shadowBudgetV46(env)
    },
    pipeline: (await getFeedSnapshot(env, "cron-status").catch(() => null))?.payload || null,

    tomorrowPreloadStartsAt:
      "20:00 America/New_York",

    tomorrowPreloadActive:
      shouldPreloadTomorrow(),

    providerQuietWindowActive:
      providerQuietWindow(),

    providerQuietHours:
      "Disabled â provider operates 24/7",

    supportedAnalysisFamilies: [
      "match-result",
      "double-chance",
      "handicap",
      "goals",
      "btts",
      "corners",
      "corner-handicap",
      "cards",
      "shots",
      "shots-on-target",
      "shots-off-target",
      "player-shots"
    ]
  };
}

/* =========================================================
   SCHEDULED FEED REFRESH
   + 8 PM TOMORROW PRELOAD
   ========================================================= */

const arr =
  v =>
    Array.isArray(v)
      ? v
      : [];

const fixtureKey =
  date =>
    `fixtures:${date}`;

const oddsKey =
  date =>
    `odds:${date}`;

const modelBoardKey =
  date =>
    `model-board:${date}`;

function safeRefreshError(error) {
  return String(
    error?.message ||
    error ||
    "Unknown refresh error"
  ).slice(
    0,
    300
  );
}

async function rpcRefresh(
  env,
  name,
  body
) {
  return await sb(
    env,
    `rpc/${name}`,
    {
      method:
        "POST",

      body:
        JSON.stringify(
          body
        )
    }
  );
}

async function saveFeedSnapshot(
  env,
  key,
  payload,
  ttlSeconds
) {
  const date =
    key.includes(":")
      ? key
          .split(":")
          .pop()
      : null;

  const body = {
    snapshot_key:
      key,

    payload,

    provider_date:
      /^\d{4}-\d{2}-\d{2}$/.test(
        date ||
        ""
      )
        ? date
        : null,

    refreshed_at:
      new Date()
        .toISOString(),

    expires_at:
      new Date(
        Date.now() +
        ttlSeconds *
        1000
      ).toISOString(),

    request_count:
      0
  };

  await sb(
    env,
    `two45_feed_snapshots?on_conflict=snapshot_key`,
    {
      method:
        "POST",

      prefer:
        "resolution=merge-duplicates,return=minimal",

      body:
        JSON.stringify(
          body
        )
    }
  );
}

async function getFeedSnapshot(
  env,
  key
) {
  const rows =
    await sb(
      env,
      `two45_feed_snapshots?snapshot_key=eq.${encodeURIComponent(
        key
      )}&select=payload,refreshed_at,expires_at&limit=1`
    );

  return (
    arr(
      rows
    )[0] ||
    null
  );
}

async function feedDue(
  env,
  key,
  seconds
) {
  const row =
    await getFeedSnapshot(
      env,
      key
    );

  return (
    !row ||
    (
      Date.now() -
      Date.parse(
        row.refreshed_at
      )
    ) >=
      seconds *
      1000
  );
}

// Shared database lock serializes cron, on-demand and process requests across isolates.
// Fail closed if pacing storage is unavailable; never bypass the existing budget RPC.
async function providerFetchV18(env, path, params = {}) {
  if (providerQuietWindow()) {
    throw new Error("API-Football quiet window is active until 05:00 America/New_York");
  }
  // V1.9.2: the old DB pacing lock could remain leased after a successful
  // provider call and deadlock the next request in the same analysis.
  // Cron is already serialized at the pipeline level; daily usage is still
  // protected by the atomic reservation RPC below.
  const lockKey = 'api-football-pacing';
  const leaseDeadline = Date.now() + (providerBurstV69 ? 20000 : 12000);
  let pacing;
  try {
    pacing = (await getFeedSnapshot(env, lockKey))?.payload || {};
    const utcDate = new Date().toISOString().slice(0, 10);
    if (pacing.budgetDate === utcDate && num(pacing.used) >= PRACTICAL_DAILY_CAP) {
      throw new Error('Two45 practical daily cap of 6500 reached.');
    }
    const blockedWait = Math.max(0, num(pacing.blockedUntil) - Date.now());
    if (blockedWait > 0) {
      const error = new Error('API-Football rate limit pacing not ready; retry on next cron');
      error.retryAt = num(pacing.blockedUntil);
      throw error;
    }
    const wait = Math.max(0, num(pacing.nextAt) - Date.now());
    const burst = providerBurstV69;
    if (burst && burst.calls >= burst.maxCalls) {
      const error = new Error('Two45 bounded provider burst complete; continue next cron');
      error.retryAt = Date.now() + 60000;
      throw error;
    }
    if (wait > 0) {
      if (!burst) {
        const error = new Error('API-Football rate limit pacing not ready; retry on next cron');
        error.retryAt = num(pacing.nextAt);
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, Math.min(PROVIDER_BURST_GAP_MS_V69, wait)));
    }
    if (Date.now() >= leaseDeadline) throw new Error('API-Football rate limit pacing lease expired');
    if (burst) burst.calls += 1;
    const nextInterval = burst ? PROVIDER_BURST_GAP_MS_V69 : adaptiveProviderIntervalV30(pacing);
    pacing = {...pacing, nextAt: Date.now() + nextInterval};
    await saveFeedSnapshot(env, lockKey, pacing, 172800);
    const payload = await providerFetchReservedV18(env, path, params, pacing, leaseDeadline);
    await saveFeedSnapshot(env, lockKey, {...pacing,
      nextAt: Date.now() + (burst ? PROVIDER_BURST_GAP_MS_V69 : adaptiveProviderIntervalV30(pacing)),
      burstCallsThisCron: burst ? burst.calls : 0,
      burstMaxCalls: burst ? burst.maxCalls : 0
    }, 172800);
    return payload;
  } catch (error) {
    if (pacing && /Too many requests|HTTP 429|exceeded.*minute/i.test(safeRefreshError(error))) {
      const retryAt = Math.max(Date.now() + 65000, num(error.retryAt));
      await saveFeedSnapshot(env, lockKey, {...pacing, blockedUntil: retryAt, nextAt: retryAt}, 172800);
    }
    throw error;
  }
}

async function providerFetchReservedV18(
  env,
  path,
  params = {},
  pacing = {},
  leaseDeadline = 0
) {
  if (
    !footballKey(
      env
    )
  ) {
    throw new Error(
      "API_FOOTBALL_KEY is not configured."
    );
  }

  let state =
    null;

  try {
    const reservation =
      await rpcRefresh(
        env,
        "two45_reserve_internal_requests_v2",
        {
          p_units:
            1
        }
      );

    state =
      Array.isArray(
        reservation
      )
        ? reservation[0]
        : reservation;

  } catch (e) {
    throw new Error(
      `Provider budget reservation failed: ${safeRefreshError(
        e
      )}`
    );
  }

  if (
    !state?.allowed
  ) {
    throw new Error(
      `Two45 internal daily cap of ${HARD_CAP} reached.`
    );
  }

  // The atomic database counter includes other existing producers.
  pacing.budgetDate = state.date;
  pacing.used = num(state.used);
  if (pacing.used > PRACTICAL_DAILY_CAP) {
    await saveFeedSnapshot(env, 'api-football-pacing', pacing, 172800);
    throw new Error('Two45 practical daily cap of 6500 reached.');
  }
  pacing.nextAt = Date.now() + adaptiveProviderIntervalV30(pacing);
  await saveFeedSnapshot(env, 'api-football-pacing', pacing, 172800);
  if (Date.now() >= leaseDeadline) throw new Error('API-Football rate limit pacing lease expired');

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase gateway configuration missing.");
  }

  const gatewayUrl =
    `${String(env.SUPABASE_URL).replace(/\/$/, "")}/functions/v1/two45-football-gateway`;

  const response =
    await fetch(
      gatewayUrl,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,

          "Content-Type":
            "application/json",

          "x-apisports-key":
            footballKey(
              env
            ),

          Accept:
            "application/json"
        },

        body:
          JSON.stringify({
            endpoint:
              String(path).replace(/^\/+/, ""),

            params
          }),

        signal: AbortSignal.timeout(4500)
      }
    );

  const remaining =
    Number(response.headers.get("x-ratelimit-requests-remaining") ?? NaN);
  const minuteLimit = Number(response.headers.get("x-ratelimit-limit") ?? NaN);
  const minuteRemaining = Number(response.headers.get("x-ratelimit-remaining") ?? NaN);
  const dailyLimit = Number(response.headers.get("x-ratelimit-requests-limit") ?? NaN);
  Object.assign(pacing, {
    providerMinuteLimit: Number.isFinite(minuteLimit) ? minuteLimit : null,
    providerMinuteRemaining: Number.isFinite(minuteRemaining) ? minuteRemaining : null,
    providerDailyLimit: Number.isFinite(dailyLimit) ? dailyLimit : null,
    providerDailyRemaining: Number.isFinite(remaining) ? remaining : null,
    lastProviderStatus: response.status,
    lastProviderAt: new Date().toISOString()
  });
  await saveFeedSnapshot(env, 'api-football-pacing', pacing, 172800);
  const retryAfter = response.headers.get('retry-after');
  const retryAt = Number.isFinite(Number(retryAfter))
    ? Date.now() + Number(retryAfter) * 1000 : Date.parse(retryAfter || '');
  if (response.status === 429) {
    const error = new Error('API-Football returned HTTP 429.');
    error.retryAt = retryAt;
    throw error;
  }


  if (
    Number.isFinite(
      remaining
    ) &&
    remaining >=
      0
  ) {
    await Promise.race([
      rpcRefresh(env, "two45_set_provider_remaining", {p_remaining: remaining}),
      new Promise(resolve => setTimeout(() => resolve(null), 3000))
    ]).catch(() => null);
  }

  const payload =
    await response
      .json()
      .catch(() => { throw new Error("API-Football returned invalid JSON"); });

  if (
    !response.ok
  ) {
    throw new Error(
      `API-Football returned HTTP ${response.status}.`
    );
  }

  const errors =
    payload?.errors;

  if (
    errors &&
    (
      (
        Array.isArray(
          errors
        ) &&
        errors.length
      ) ||
      (
        !Array.isArray(
          errors
        ) &&
        Object.keys(
          errors
        ).length
      )
    )
  ) {
    throw new Error(
      `API-Football: ${
        JSON.stringify(
          errors
        ).slice(
          0,
          220
        )
      }`
    );
  }

  if (!Object.prototype.hasOwnProperty.call(payload, "response")) throw new Error("API-Football response missing");
  return payload;
}

function makeFixtureBoard(
  date,
  fixtures
) {
  const live = [];
  const upcoming = [];
  const finished = [];
  const other = [];

  for (
    const fixture
    of fixtures
  ) {
    const status =
      fixture
        ?.fixture
        ?.status
        ?.short;

    if (
      LIVE_STATUSES.has(
        status
      )
    ) {
      live.push(
        fixture
      );

    } else if (
      UPCOMING_STATUSES.has(
        status
      )
    ) {
      upcoming.push(
        fixture
      );

    } else if (
      FINISHED_STATUSES.has(
        status
      )
    ) {
      finished.push(
        fixture
      );

    } else {
      other.push(
        fixture
      );
    }
  }

  return {
    ok:
      true,

    service:
      "two45-live-worker",

    timezone:
      TIME_ZONE,

    date,

    updatedAt:
      new Date()
        .toISOString(),

    total:
      fixtures.length,

    counts: {
      total:
        fixtures.length,

      live:
        live.length,

      upcoming:
        upcoming.length,

      finished:
        finished.length,

      other:
        other.length
    },

    fixtures,

    live,

    upcoming,

    finished,

    other
  };
}

async function refreshFixturesV18(
  env,
  date
) {
  const payload =
    await providerFetchV18(
      env,
      "fixtures",
      {
        date,
        timezone:
          TIME_ZONE
      }
    );

  return makeFixtureBoard(
    date,
    arr(
      payload.response
    )
  );
}

async function refreshLiveV18(
  env,
  date
) {
  const payload =
    await providerFetchV18(
      env,
      "fixtures",
      {
        live:
          "all",

        timezone:
          TIME_ZONE
      }
    );

  const fixtures =
    arr(
      payload.response
    ).filter(
      x =>
        LIVE_STATUSES.has(
          x
            ?.fixture
            ?.status
            ?.short
        )
    );

  return makeFixtureBoard(
    date,
    fixtures
  );
}

function slimOddsRowV18(row) {
  return {
    fixture: {
      id:
        row
          ?.fixture
          ?.id
    },

    bookmakers:
      arr(
        row
          ?.bookmakers
      )
        .map(
          book => ({
            name:
              book?.name,

            bets:
              arr(
                book?.bets
              )
                .filter(
                  b =>
                    SCORING_MARKETS.has(
                      b?.name
                    ) ||
                    providerMarketName(
                      b?.name
                    )
                )
                .map(
                  b => ({
                    name:
                      b.name,

                    values:
                      arr(
                        b.values
                      )
                  })
                )
          })
        )
        .filter(
          book =>
            book.bets.length
        )
  };
}

function mergeOddsV18(
  existing,
  incoming
) {
  const map =
    new Map();

  for (
    const row
    of [
      ...existing,
      ...incoming
    ]
  ) {
    const id =
      row
        ?.fixture
        ?.id;

    if (
      id != null
    ) {
      map.set(
        String(id),
        row
      );
    }
  }

  return [
    ...map.values()
  ];
}

function bet365RowsV68(rows) {
  return arr(rows).filter(row =>
    arr(row?.bookmakers).some(book =>
      String(book?.name || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "") === "bet365"
    )
  );
}

async function repairDailyOddsFromFixturesV68(env, date) {
  const fixtureRow = await getFeedSnapshot(env, fixtureKey(date));
  const fixtures = fixtureRowsV58(fixtureRow)
    .filter(f => {
      const status = f?.fixture?.status?.short;
      return (UPCOMING_STATUSES.has(status) || LIVE_STATUSES.has(status)) &&
        competitionTierV21(f?.league?.name, f?.league?.id) <= 3 &&
        fixtureIdV19(f) > 0;
    })
    .sort((a,b) =>
      competitionTierV21(a?.league?.name, a?.league?.id) - competitionTierV21(b?.league?.name, b?.league?.id) ||
      Date.parse(a?.fixture?.date || 0) - Date.parse(b?.fixture?.date || 0)
    );

  const dailyRow = await getFeedSnapshot(env, oddsKey(date));
  const previous = dailyRow?.payload || {};
  let response = bet365RowsV68(previous.response);
  const covered = new Set(response.map(row => String(row?.fixture?.id)));

  for (const fixture of fixtures) {
    const fixtureId = fixtureIdV19(fixture);
    if (covered.has(String(fixtureId))) continue;

    const directKey = "fixture-odds:" + fixtureId;
    const cached = await getFeedSnapshot(env, directKey).catch(() => null);
    const fresh = cached && Date.now() - Date.parse(cached.refreshed_at) < 30 * 60000;

    if (fresh) {
      const cachedRows = bet365RowsV68(cached?.payload?.response);
      if (cachedRows.length) {
        response = mergeOddsV18(response, cachedRows);
        const payload = {
          ok:true, service:"two45-live-worker", type:"odds", date,
          updatedAt:new Date().toISOString(), total:response.length,
          paging:{current:1,total:1,complete:true},
          cacheSeconds:900, response, source:"fixture-repair-v68",
          repairInProgress:true, repairedFixtureId:fixtureId
        };
        await saveFeedSnapshot(env, oddsKey(date), payload, 900);
        return payload;
      }
      continue;
    }

    const direct = await providerFetchV18(env, "odds", {
      fixture:String(fixtureId),
      page:1
    });
    const directRows = bet365RowsV68(arr(direct?.response).map(slimOddsRowV18));
    await saveFeedSnapshot(env, directKey, {
      ok:true, service:"two45-live-worker", type:"fixture-odds",
      fixtureId, updatedAt:new Date().toISOString(), response:directRows
    }, 1800);

    if (directRows.length) response = mergeOddsV18(response, directRows);

    const payload = {
      ok:true, service:"two45-live-worker", type:"odds", date,
      updatedAt:new Date().toISOString(), total:response.length,
      paging:{current:1,total:1,complete:true},
      cacheSeconds:900, response, source:"fixture-repair-v68",
      repairInProgress:true, repairedFixtureId:fixtureId,
      repairedWithBet365:Boolean(directRows.length)
    };
    await saveFeedSnapshot(env, oddsKey(date), payload, 900);
    return payload;
  }

  const payload = {
    ok:true, service:"two45-live-worker", type:"odds", date,
    updatedAt:new Date().toISOString(), total:response.length,
    paging:{current:1,total:1,complete:true},
    cacheSeconds:900, response, source:"fixture-repair-v68",
    repairInProgress:false, repairExhaustedAt:new Date().toISOString()
  };
  await saveFeedSnapshot(env, oddsKey(date), payload, 900);
  return payload;
}

async function oddsRepairActiveV68(env) {
  const dates = weekendDeadlineRushV67()
    ? weekendLadderDatesV67()
    : [easternDate()];
  for (const date of dates) {
    const row = await getFeedSnapshot(env, oddsKey(date)).catch(() => null);
    if (!row || !arr(row?.payload?.response).length || row?.payload?.repairInProgress) return true;
  }
  return false;
}

async function refreshOddsPageV18(
  env,
  date
) {
  const previousRow =
    await getFeedSnapshot(
      env,
      oddsKey(
        date
      )
    );

  const previous =
    previousRow?.payload;

  const sameCycle =
    previous?.date ===
      date &&
    previous?.paging?.complete ===
      false;

  const previousPage =
    sameCycle
      ? Math.max(
          Number(
            previous
              ?.paging
              ?.current
          ) ||
          0,
          0
        )
      : 0;

  const previousTotal =
    sameCycle
      ? Math.min(
          Math.max(
            Number(
              previous
                ?.paging
                ?.total
            ) ||
            1,
            1
          ),
          MAX_ODDS_PAGES
        )
      : 1;

  const page =
    sameCycle &&
    previousPage <
      previousTotal
      ? previousPage +
        1
      : 1;

  const provider =
    await providerFetchV18(
      env,
      "odds",
      {
        date,
        timezone:
          TIME_ZONE,
        page
      }
    );

  const totalPages =
    Math.min(
      Math.max(
        Number(
          provider
            ?.paging
            ?.total
        ) ||
        1,
        1
      ),
      MAX_ODDS_PAGES
    );

  const newRows =
    arr(
      provider.response
    ).map(
      slimOddsRowV18
    );

  const response =
    page === 1
      ? newRows
      : mergeOddsV18(
          arr(
            previous?.response
          ),
          newRows
        );

  const payload = {
    ok:
      true,

    service:
      "two45-live-worker",

    type:
      "odds",

    updatedAt:
      new Date()
        .toISOString(),

    date,

    total:
      response.length,

    paging: {
      current:
        page,

      total:
        totalPages,

      complete:
        page >=
        totalPages
    },

    cacheSeconds:
      900,

    response
  };

  await saveFeedSnapshot(
    env,
    oddsKey(
      date
    ),
    payload,
    900
  );

  return payload;
}

async function refreshLiveOddsV18(env) {
  const payload =
    await providerFetchV18(
      env,
      "odds/live",
      {}
    );

  const response =
    arr(
      payload.response
    );

  return {
    ok:
      true,

    service:
      "two45-live-worker",

    type:
      "liveOdds",

    updatedAt:
      new Date()
        .toISOString(),

    total:
      response.length,

    paging:
      payload.paging ||
      null,

    response
  };
}

async function runBackgroundEvaluationV18(
  env,
  date,
  oddsPage
) {
  const pagesUrl =
    (
      env.TWO45_PAGES_URL ||
      "https://two45.pages.dev"
    ).replace(
      /\/$/,
      ""
    );

  const response =
    await fetch(
      `${pagesUrl}/api/dashboard?evaluate=1&date=${encodeURIComponent(
        date
      )}`,
      {
        headers: {
          Accept:
            "application/json",

          "x-two45-background-evaluation":
            "worker-v19"
        },

        signal: AbortSignal.timeout(20000)
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `Two45 Pages evaluator returned HTTP ${response.status}.`
    );
  }

  const board =
    await response.json();

  if (
    !Array.isArray(
      board?.games
    ) ||
    !Array.isArray(
      board?.picks
    )
  ) {
    throw new Error(
      "Two45 Pages evaluator returned an invalid board."
    );
  }

  if (
    board?.date &&
    board.date !==
      date
  ) {
    throw new Error(
      `Two45 Pages evaluator returned ${board.date} while ${date} was requested.`
    );
  }

  const evaluatedAt =
    new Date()
      .toISOString();

  await saveFeedSnapshot(
    env,
    `pages-evaluation:${date}`,
    {
      ...board,

      updatedAt:
        evaluatedAt,

      evaluation: {
        date,
        evaluatedAt,

        source:
          "worker-v19",

        oddsPage
      }
    },
    1800
  );

  return {
    ok:
      true,

    status:
      "updated",

    evaluatedAt,

    picks:
      board.picks.length,
    board
  };
}

async function oddsNeedsRefreshV18(
  env,
  date
) {
  const row =
    await getFeedSnapshot(
      env,
      oddsKey(
        date
      )
    );

  if (
    !row ||
    row.payload?.date !==
      date
  ) {
    return true;
  }

  if (
    row.payload?.paging?.complete ===
    false
  ) {
    return true;
  }

  return (
    Date.now() -
    Date.parse(
      row.refreshed_at
    )
  ) >=
    900000;
}

async function selectFeedJobV18(
  env,
  date,
  force = false
) {
  const tomorrow =
    datePlusDays(
      date,
      1
    );

  const preloadTomorrow =
    shouldPreloadTomorrow();

  // Refresh tomorrow first after 8 PM, including an empty discovery snapshot.
  // A successful empty response is retried at most every five minutes.
  if (preloadTomorrow) {
    const next = await getFeedSnapshot(env, fixtureKey(tomorrow));
    const empty = !arr(next?.payload?.fixtures).length;
    const age = next ? Date.now() - Date.parse(next.refreshed_at) : Infinity;
    if (!next || age >= (empty ? 300000 : 1800000)) {
      return {key: fixtureKey(tomorrow), ttl: 1800,
        run: () => refreshFixturesV18(env, tomorrow)};
    }
  }

  // Friday 8 PM -> Saturday 6 AM is the Weekend Ladder deadline lane.
  // Pull Saturday and Sunday fixtures/odds before spending maintenance on Friday.
  if (weekendDeadlineRushV67()) {
    for (const weekendDate of weekendLadderDatesV67()) {
      const wf = await getFeedSnapshot(env, fixtureKey(weekendDate));
      if (!wf || !fixtureRowsV58(wf).length) {
        return {key:fixtureKey(weekendDate), ttl:1800,
          run:() => refreshFixturesV18(env, weekendDate)};
      }
      const wo = await getFeedSnapshot(env, oddsKey(weekendDate));
      if (!wo) {
        return {key:oddsKey(weekendDate), ttl:1800, savesItself:true,
          run:() => refreshOddsPageV18(env, weekendDate)};
      }
      if (!arr(wo?.payload?.response).length || num(wo?.payload?.total,0) <= 0 || wo?.payload?.repairInProgress) {
        return {key:oddsKey(weekendDate), ttl:1800, savesItself:true,
          run:() => repairDailyOddsFromFixturesV68(env, weekendDate)};
      }
    }
  }

  const fixturesMissing =
    !(
      await getFeedSnapshot(
        env,
        fixtureKey(
          date
        )
      )
    );

  const oddsSnapshot =
    await getFeedSnapshot(
      env,
      oddsKey(
        date
      )
    );

  // An empty odds snapshot is not a healthy feed. Treat it as missing so
  // Bet365 coverage is repaired before lower-priority future discovery work.
  const oddsMissing =
    !oddsSnapshot ||
    !arr(oddsSnapshot?.payload?.response).length ||
    num(oddsSnapshot?.payload?.total, 0) <= 0;

  if (
    fixturesMissing
  ) {
    return {
      key:
        fixtureKey(
          date
        ),

      ttl:
        900,

      run:
        () =>
          refreshFixturesV18(
            env,
            date
          )
    };
  }

  if (oddsMissing || oddsSnapshot?.payload?.repairInProgress) {
    return {
      key: oddsKey(date),
      ttl: 900,
      savesItself: true,
      run: () => oddsSnapshot
        ? repairDailyOddsFromFixturesV68(env, date)
        : refreshOddsPageV18(env, date)
    };
  }

  // Keep a lightweight rolling four-day fixture pool at all times.
  // This lets Elite/Weekend tickets see the weekend early without paying
  // for deep analysis on every future match.
  for (const futureDate of fourDayFixtureDatesV20().slice(1)) {
    const missing = !(await getFeedSnapshot(env, fixtureKey(futureDate)));
    if (missing) {
      return {
        key: fixtureKey(futureDate),
        ttl: 21600,
        run: () => refreshFixturesV18(env, futureDate)
      };
    }
  }

  // Weekend Mode (Thu evening through Sat) deep-analyzes today + next 2 days.
  // Outside Weekend Mode, tomorrow still becomes a deep-analysis date at 8 PM ET.
  for (const deepDate of deepAnalysisDatesV20().slice(1)) {
    const missingOdds = !(await getFeedSnapshot(env, oddsKey(deepDate)));
    if (missingOdds) {
      return {
        key: oddsKey(deepDate),
        ttl: 1800,
        savesItself: true,
        run: () => refreshOddsPageV18(env, deepDate)
      };
    }
  }

  /*
   * Tomorrow is deliberately
   * ignored until 8 PM Eastern outside Weekend Mode.
   */

  if (
    preloadTomorrow
  ) {
    const tf =
      !(
        await getFeedSnapshot(
          env,
          fixtureKey(
            tomorrow
          )
        )
      );

    const to =
      !(
        await getFeedSnapshot(
          env,
          oddsKey(
            tomorrow
          )
        )
      );

    if (tf) {
      return {
        key:
          fixtureKey(
            tomorrow
          ),

        ttl:
          1800,

        run:
          () =>
            refreshFixturesV18(
              env,
              tomorrow
            )
      };
    }

    if (to) {
      return {
        key:
          oddsKey(
            tomorrow
          ),

        ttl:
          1800,

        savesItself:
          true,

        run:
          () =>
            refreshOddsPageV18(
              env,
              tomorrow
            )
      };
    }
  }

  const candidates = [
    {
      key:
        fixtureKey(
          date
        ),

      ttl:
        900,

      due:
        () =>
          feedDue(
            env,
            fixtureKey(
              date
            ),
            900
          ),

      run:
        () =>
          refreshFixturesV18(
            env,
            date
          )
    },

    {
      key:
        "live",

      ttl:
        300,

      due:
        () =>
          feedDue(
            env,
            "live",
            300
          ),

      run:
        () =>
          refreshLiveV18(
            env,
            date
          )
    },

    {
      key:
        oddsKey(
          date
        ),

      ttl:
        900,

      savesItself:
        true,

      due:
        () =>
          oddsNeedsRefreshV18(
            env,
            date
          ),

      run:
        () =>
          refreshOddsPageV18(
            env,
            date
          )
    },

    {
      key:
        "live-odds",

      ttl:
        300,

      due:
        () =>
          feedDue(
            env,
            "live-odds",
            300
          ),

      run:
        () =>
          refreshLiveOddsV18(
            env
          )
    }
  ];

  // Days 2-4 are fixture-discovery feeds only and refresh slowly.
  for (const futureDate of fourDayFixtureDatesV20().slice(1)) {
    if (futureDate === tomorrow && preloadTomorrow) continue;
    candidates.push({
      key: fixtureKey(futureDate),
      ttl: 21600,
      due: () => feedDue(env, fixtureKey(futureDate), 21600),
      run: () => refreshFixturesV18(env, futureDate)
    });
  }

  // Weekend deep dates receive odds refreshes too, feeding the 5+, 10+ and 50-odds engines.
  if (weekendModeV20()) {
    for (const deepDate of deepAnalysisDatesV20().slice(1)) {
      if (deepDate === tomorrow && preloadTomorrow) continue;
      candidates.push({
        key: oddsKey(deepDate),
        ttl: 1800,
        savesItself: true,
        due: () => oddsNeedsRefreshV18(env, deepDate),
        run: () => refreshOddsPageV18(env, deepDate)
      });
    }
  }

  if (
    preloadTomorrow
  ) {
    candidates.push(
      {
        key:
          fixtureKey(
            tomorrow
          ),

        ttl:
          1800,

        due:
          () =>
            feedDue(
              env,
              fixtureKey(
                tomorrow
              ),
              1800
            ),

        run:
          () =>
            refreshFixturesV18(
              env,
              tomorrow
            )
      },

      {
        key:
          oddsKey(
            tomorrow
          ),

        ttl:
          1800,

        savesItself:
          true,

        due:
          () =>
            oddsNeedsRefreshV18(
              env,
              tomorrow
            ),

        run:
          () =>
            refreshOddsPageV18(
              env,
              tomorrow
            )
      }
    );
  }

  if (force) {
    return candidates[0];
  }

  const bucket =
    Math.floor(
      new Date()
        .getUTCMinutes() /
      5
    ) %
    candidates.length;

  const first =
    candidates[
      bucket
    ];

  if (
    await first.due()
  ) {
    return first;
  }

  for (
    const c
    of candidates
  ) {
    if (
      await c.due()
    ) {
      return c;
    }
  }

  return null;
}

async function refreshOneFeed(
  env,
  force = false
) {
  if (providerQuietWindow()) {
    return {ok:true, skipped:true, reason:"Provider quiet window 00:00-05:00 America/New_York"};
  }
  const token =
    crypto.randomUUID();

  const acquired =
    await rpcRefresh(
      env,
      "two45_try_refresh_lock",
      {
        p_lock_key:
          "scheduled-feed-refresh",

        p_lock_token:
          token,

        p_ttl_seconds:
          240
      }
    );

  if (!acquired) {
    return {
      ok:
        true,

      skipped:
        true,

      reason:
        "Another refresh is already running."
    };
  }

  try {
    const date =
      easternDate();

    const job =
      await selectFeedJobV18(
        env,
        date,
        force
      );

    if (!job) {
      return {
        ok:
          true,

        skipped:
          true,

        reason:
          "All feeds are fresh.",

        date
      };
    }

    try {
      const payload =
        await job.run();

      if (
        !job.savesItself
      ) {
        await saveFeedSnapshot(
          env,
          job.key,
          payload,
          job.ttl
        );
      }

      return {
        ok:
          true,

        skipped:
          false,

        date,

        key:
          job.key,

        providerCalls:
          1,

        total:
          payload?.total ??
          null,

        paging:
          payload?.paging ??
          null
      };

    } catch (error) {
      return {
        ok:
          false,

        skipped:
          false,

        date,

        key:
          job.key,

        providerCalls:
          1,

        error:
          safeRefreshError(
            error
          )
      };
    }

  } finally {
    await rpcRefresh(
      env,
      "two45_release_refresh_lock",
      {
        p_lock_key:
          "scheduled-feed-refresh",

        p_lock_token:
          token
      }
    ).catch(
      () => false
    );
  }
}

async function runFeedRefresh(
  event,
  env
) {
  const startedAt =
    new Date()
      .toISOString();

  const result =
    await refreshOneFeed(
      env,
      false
    );

  await saveFeedSnapshot(
    env,
    "cron-status",
    {
      status:
        result?.ok
          ? (
              result.skipped
                ? "skipped"
                : "completed"
            )
          : "failed",

      cron:
        event?.cron ||
        "unknown",

      startedAt,

      completedAt:
        new Date()
          .toISOString(),

      result
    },
    600
  ).catch(
    () => null
  );

  return result;
}

/* =========================================================
   MAIN WORKER
   ========================================================= */

/* =========================================================
   V19 INTEGRATION â no new tables, SQL migrations or bindings.
   Keep the existing five-minute Cloudflare cron trigger.
   ========================================================= */
/*
 * Environment: same V18 keys; TWO45_MODEL_BATCH defaults to 4 (1..8).
 * All provider calls reserve budget through the existing atomic V2 RPC.
 * Existing forecast rows remain immutable for the Record/settlement ledger.
 * Current reanalysis is stored separately in two45_feed_snapshots.
 * Expanded markets retain V18's cross-book consensus method, not a newly
 * invented independent corners/cards/shots model. Unsupported settlements
 * remain pending in the existing settlement RPC; no guessed results.
 */

const MAJOR_LEAGUES_V19 = new Set([1, 2, 3, 4, 5, 9, 10, 11, 13, 15,
  39, 40, 45, 48, 61, 66, 78, 81, 88, 94, 135, 137, 140, 143,
  144, 179, 203, 253, 262, 71, 73]);

// V20: prioritize important competitions by name as well as provider ID.
const PRIORITY_COMPETITION_RE_V20 = /uefa nations league|nations league|world cup|world cup qualif|world cup qualifiers|european championship qualif|euro qualif|uefa|euro|copa america|africa cup of nations|afcon|caf|asian cup|afc|concacaf|champions league|europa league|conference league|copa libertadores|libertadores|copa sudamericana|sudamericana|premier league|la liga|serie a|bundesliga|ligue 1|eredivisie|primeira liga|brasileir|liga profesional|argentina|mls|scottish premiership|belgian pro league|swiss super league|austrian bundesliga|super lig|liga mx|saudi pro league/i;

function competitionTierV21(value, leagueId) {
  const n = String(value || "").toLowerCase();
  const id = Number(leagueId);
  if (MAJOR_LEAGUES_V19.has(id) || /champions league|premier league|la liga|serie a|bundesliga|ligue 1|world cup|uefa nations league|nations league|copa america|africa cup of nations|afcon/.test(n)) return 1;
  if (/world cup qualif|world cup qualifiers|euro qualif|european championship qualif|europa league|conference league|copa libertadores|libertadores|copa sudamericana|sudamericana|eredivisie|primeira liga|brasileir|liga profesional|argentina|mls|asian cup|afc|caf|concacaf/.test(n)) return 2;
  if (/scottish premiership|belgian pro league|swiss super league|austrian bundesliga|super lig|liga mx|saudi pro league|international|friendl/.test(n)) return 3;
  return 4;
}

function priorityCompetitionV20(value, leagueId) {
  return competitionTierV21(value, leagueId) <= 2 || PRIORITY_COMPETITION_RE_V20.test(String(value || ""));
}

function groupMarketLinesV19(groups) {
  const out = [];
  for (const group of groups) {
    const buckets = new Map();
    for (const outcome of group.outcomes) {
      let key = 'main';
      const raw = String(outcome.rawSelection || '');
      const total = raw.match(/\b(over|under)\s*(\d+(?:\.\d+)?)/i);
      const handicap = raw.match(/^(home|away|draw)\s*([+-]?\d+(?:\.\d+)?)/i);
      const value = {...outcome};
      if (total) {
        // Preserve player/subject identity so distinct players never get pooled.
        const subject = raw.slice(0, total.index).trim().toLowerCase();
        key = `${subject}|${Number(total[2])}`;
        if (subject) value.selection = `${thresholdSelection(subject)}_${outcome.selection}`;
      } else if (group.market.includes('HANDICAP') && handicap) {
        const side = handicap[1].toUpperCase();
        const line = Number(handicap[2]);
        // Asian opposing home/away lines form a pair at the home-side handicap.
        key = String(/handicap result/i.test(group.rawMarket) ? line : side === 'AWAY' ? -line : line);
        value.selection = `${side}_${line < 0 ? 'MINUS' : 'PLUS'}_${String(Math.abs(line)).replace('.', '_')}`;
      }
      if (!buckets.has(key)) buckets.set(key, []);
      const bucket = buckets.get(key);
      if (!bucket.some(x => x.selection === value.selection)) bucket.push(value);
    }
    for (const [groupKey, outcomes] of buckets) {
      if (outcomes.length < 2) continue;
      if (group.market === 'DOUBLE_CHANCE' && outcomes.length !== 3) continue;
      if (group.market === 'MATCH_RESULT' && outcomes.length !== 3) continue;
      if ([
        'TOTAL_GOALS','HOME_TEAM_GOALS','AWAY_TEAM_GOALS','TOTAL_CORNERS',
        'HOME_CORNERS','AWAY_CORNERS','TOTAL_CARDS','HOME_CARDS','AWAY_CARDS',
        'TOTAL_SHOTS','TOTAL_SHOTS_ON_TARGET','TOTAL_SHOTS_OFF_TARGET'
      ].includes(group.market)) {
        const normalized = outcomes.map(x => String(x.selection || '').toUpperCase());
        const hasOver = normalized.some(x => /(^|_)OVER_\d/.test(x));
        const hasUnder = normalized.some(x => /(^|_)UNDER_\d/.test(x));
        if (!hasOver || !hasUnder) continue;
      }
      out.push({...group, groupKey, outcomes});
    }
  }
  return out;
}

function batchLimitV19(value) {
  return Math.trunc(clamp(num(value, DEFAULT_MODEL_BATCH), 1, 9));
}

function adaptiveBatchV30(candidates, requested = DEFAULT_MODEL_BATCH) {
  const fresh = candidates.filter(j => !j.canonicalComplete).length;
  const feedMinute = new Date().getUTCMinutes() % 5 === 0;
  let desired = fresh >= 100 ? 9 : fresh >= 50 ? 8 : fresh >= 20 ? 6 : fresh > 0 ? 4 : 1;
  if (feedMinute && desired > 1) desired = Math.max(3, desired - 1);
  return {
    freshBaselineBacklog: fresh,
    limit: Math.min(batchLimitV19(requested || DEFAULT_MODEL_BATCH), desired)
  };
}
function dateOfV19(value) {
  const dt = new Date(value);
  if (!Number.isFinite(dt.getTime())) return null;
  const p = easternParts(dt);
  return `${p.year}-${p.month}-${p.day}`;
}

function dateAllowedV19(date) {
  return deepAnalysisDatesV20().includes(date);
}

function activeDatesV19() {
  return deepAnalysisDatesV20();
}

function fixtureIdV19(f) {
  return Number(f?.fixture?.id || f?.fixtureId || f?.fixture_id || 0);
}

function eligibleFixtureV19(f, date) {
  const status = f?.fixture?.status?.short;
  return dateAllowedV19(date) && dateOfV19(f?.fixture?.date) === date &&
    (UPCOMING_STATUSES.has(status) || LIVE_STATUSES.has(status)) &&
    fixtureIdV19(f) > 0 && Number(f?.league?.id) > 0 &&
    Number.isInteger(Number(f?.league?.season)) && Number(f?.league?.season) > 0 &&
    Number(f?.teams?.home?.id) > 0 && Number(f?.teams?.away?.id) > 0;
}

async function allRowsV19(env, query) {
  const rows = [];
  // Small pages also work when the project has a lower-than-default row cap.
  for (let offset = 0; ; offset += 100) {
    const page = arr(await sb(env, `${query}&limit=100&offset=${offset}`));
    rows.push(...page);
    if (page.length < 100) break;
  }
  return rows;
}

async function rowsForIdsV19(env, table, column, ids) {
  const result = [];
  for (let start = 0; start < ids.length; start += 80) {
    const values = ids.slice(start, start + 80).map(x => encodeURIComponent(String(x))).join(',');
    result.push(...await allRowsV19(env,
      `${table}?${column}=in.(${values})&select=*&order=${column}.asc`));
  }
  return result;
}

async function fixtureSnapshotV19(env, date) {
  const base = await getFeedSnapshot(env, fixtureKey(date));
  const fixtures = arr(base?.payload?.fixtures).length
    ? base.payload.fixtures : arr(base?.payload?.response);
  const map = new Map(fixtures.map(f => [fixtureIdV19(f), f]));
  if (date === easternDate()) {
    const live = await getFeedSnapshot(env, 'live');
    // Never let an older live snapshot resurrect a fixture already marked FT.
    if (Date.parse(live?.refreshed_at) > Date.parse(base?.refreshed_at || '1970-01-01')) {
      for (const f of arr(live?.payload?.fixtures)) {
        if (dateOfV19(f?.fixture?.date) === date) map.set(fixtureIdV19(f), f);
      }
    }
  }
  return {date, fixtures: [...map.values()], refreshedAt: base?.refreshed_at || null};
}

function jobFromFixtureV19(f, date, now) {
  const id = fixtureIdV19(f);
  const major = priorityCompetitionV20(f.league.name, f.league.id);
  return {
    job_key: String(id) + ":" + String(f.league.season), provider_match_id: String(id), fixture_id: id,
    kickoff_at: new Date(f.fixture.date).toISOString(), competition: f.league.name || 'Unknown competition',
    provider_league_id: String(f.league.id), season: Number(f.league.season),
    home_team_id: String(f.teams.home.id), away_team_id: String(f.teams.away.id),
    home_team: f.teams.home.name || String(f.teams.home.id),
    away_team: f.teams.away.name || String(f.teams.away.id),
    status: 'PENDING', priority: major ? 10 : 40, attempts: 0,
    requested_at: now, source_snapshot_key: fixtureKey(date),
    metadata: {country: f.league.country, round: f.league.round,
      fixture_status: f.fixture.status.short, fixture: f, queued_by: 'worker-v19'}
  };
}

async function syncFixtureJobsV19(env) {
  // V2: queue synchronization is intentionally lock-free and idempotent.
  // Unique job_key + compare-and-set claiming prevent duplicate processing,
  // while overlapping cron runs can no longer freeze the whole queue.
  const wanted = [];
  const summary = {eligible: 0, inserted: 0, existing: 0, excluded: 0, dates: []};
  const now = new Date().toISOString();

  for (const date of activeDatesV19()) {
    const snapshot = await fixtureSnapshotV19(env, date);
    summary.dates.push({date, fixtures: snapshot.fixtures.length});
    for (const fixture of snapshot.fixtures) {
      if (eligibleFixtureV19(fixture, date)) wanted.push(jobFromFixtureV19(fixture, date, now));
      else summary.excluded++;
    }
  }

  const distinct = [...new Map(wanted.map(j => [j.job_key, j])).values()];
  summary.eligible = distinct.length;

  const existing = await rowsForIdsV19(
    env,
    "two45_feature_jobs",
    "job_key",
    distinct.map(j => j.job_key)
  );
  const byKey = new Map(existing.map(j => [j.job_key, j]));
  summary.existing = existing.length;

  const missing = distinct.filter(j => !byKey.has(j.job_key));
  for (let i = 0; i < missing.length; i += 100) {
    const inserted = arr(await sb(env, "two45_feature_jobs?on_conflict=job_key", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=representation",
      body: JSON.stringify(missing.slice(i, i + 100))
    }));
    summary.inserted += inserted.length;
    for (const row of inserted) byKey.set(row.job_key, row);
  }

  const jobs = distinct.flatMap(current => {
    const stored = byKey.get(current.job_key);
    return stored
      ? [{
          ...stored,
          kickoff_at: current.kickoff_at,
          metadata: {...stored.metadata, ...current.metadata}
        }]
      : [];
  });

  await ensureAnalysisRowsV2(env, jobs);
  const canonicalRows = await canonicalAnalysisRowsV2(
    env,
    jobs.map(j => Number(j.fixture_id))
  );
  const canonicalByFixture = new Map(
    canonicalRows
      .filter(r => r.model_version === MODEL_VERSION)
      .map(r => [Number(r.fixture_id), r])
  );
  const annotatedJobs = jobs.map(j => {
    const row = canonicalByFixture.get(Number(j.fixture_id));
    return {
      ...j,
      canonicalComplete: row?.status === "COMPLETE",
      canonicalStatus: row?.status || "PENDING"
    };
  });
  return {jobs: annotatedJobs, summary};
}

function jobDueV19(job) {
  if (!dateAllowedV19(dateOfV19(job.kickoff_at))) return false;
  const status = job.metadata?.fixture_status;
  if (!(LIVE_STATUSES.has(status) || UPCOMING_STATUSES.has(status))) return false;
  const now = Date.now();
  if (job.status === 'READY') {
    const interval = LIVE_STATUSES.has(status)
      ? 10 * 60000
      : (job.canonicalComplete && !job.shadowAttempted ? 2 * 60000 : 60 * 60000);
    return now - Date.parse(job.completed_at || '1970-01-01') >= interval;
  }
  if (job.status === 'FAILED') {
    return !job.started_at || now - Date.parse(job.started_at) >= 2 * 60 * 60000;
  }
  if (job.status !== 'PENDING') return false;
  const attempts = num(job.attempts);
  const delay = attempts ? Math.min(120, 5 * 2 ** Math.min(attempts - 1, 5)) * 60000 : 0;
  return !job.started_at || now - Date.parse(job.started_at) >= delay;
}

function rankedJobsV19(jobs) {
  // V56: automatic queue processing must never claim Tier 4.
  // Manual Ask Two45 analysis remains available through claimSpecificJob.
  const candidates = jobs.filter(jobDueV19).filter(job =>
    competitionTierV21(job.competition, job.provider_league_id) <= 3
  );
  const rank = j => {
    const wait = Math.max(0, (Date.now() - Date.parse(j.requested_at)) / 60000);
    const tier = competitionTierV21(j.competition, j.provider_league_id);
    const isTomorrow = dateOfV19(j.kickoff_at) === tomorrowEasternDate();
    const hoursToKickoff = Math.max(0, (Date.parse(j.kickoff_at) - Date.now()) / 3600000);
    const tierBase = tier === 1 ? 4 : tier === 2 ? 12 : tier === 3 ? 26 : 42;
    const tomorrowPenalty = isTomorrow ? (shouldPreloadTomorrow() ? (tier <= 2 ? 4 : 10) : 30) : 0;
    const kickoffUrgency = hoursToKickoff <= 3 ? -12 : hoursToKickoff <= 8 ? -7 : hoursToKickoff <= 18 ? -3 : 0;
    return tierBase + tomorrowPenalty + kickoffUrgency - Math.min(80, wait / 3);
  };
  candidates.sort((a,b) => rank(a) - rank(b) || Date.parse(a.kickoff_at) - Date.parse(b.kickoff_at));
  const fresh = candidates.filter(j => !j.canonicalComplete);
  const live = candidates.filter(j => j.canonicalComplete && LIVE_STATUSES.has(j.metadata?.fixture_status));
  const repeat = candidates.filter(j => j.canonicalComplete && !LIVE_STATUSES.has(j.metadata?.fixture_status));
  const ordered = [];

  const analysisReady = fresh.filter(j =>
    String(j.last_error || "").includes("Baseline inputs ready")
  );
  const homeStaged = fresh.filter(j =>
    String(j.last_error || "").includes("Baseline home input cached")
  );
  const stagedIds = new Set(
    [...analysisReady, ...homeStaged].map(j => j.id)
  );
  const untouchedFresh = fresh.filter(j => !stagedIds.has(j.id));

  // V54: finish the fixture state machine before opening more work.
  // Fully staged baselines get first priority, then half-staged baselines,
  // then untouched fixtures. This converts steady activity into steady
  // completions instead of endlessly staging new matches.
  if (analysisReady.length || homeStaged.length) {
    return [...analysisReady, ...homeStaged, ...untouchedFresh, ...live, ...repeat];
  }

  // Hard Weekend Ladder deadline lane: Friday 8 PM -> Saturday 6 AM ET.
  // Fresh Saturday/Sunday coverage comes before all repeat/deep-enrichment work.
  if (weekendDeadlineRushV67()) {
    const weekendDates = new Set(weekendLadderDatesV67());
    const weekendFresh = untouchedFresh.filter(j => weekendDates.has(dateOfV19(j.kickoff_at)));
    const otherFresh = untouchedFresh.filter(j => !weekendDates.has(dateOfV19(j.kickoff_at)));
    return [...weekendFresh, ...otherFresh, ...live, ...repeat];
  }

  // Normal overnight rule: tomorrow first.
  if (shouldPreloadTomorrow()) {
    const tomorrow = tomorrowEasternDate();
    const tomorrowFresh = untouchedFresh.filter(j => dateOfV19(j.kickoff_at) === tomorrow);
    const otherFresh = untouchedFresh.filter(j => dateOfV19(j.kickoff_at) !== tomorrow);
    return [...tomorrowFresh, ...otherFresh, ...live, ...repeat];
  }
  // V2 coverage rule: while any fixture has never completed the current
  // model, clear fresh coverage before spending cycles on live/repeat refreshes.
  if (untouchedFresh.length) return [...untouchedFresh, ...live, ...repeat];

  const lanes = [live, repeat];
  while (live.length || repeat.length) {
    for (const lane of lanes) if (lane.length) ordered.push(lane.shift());
  }
  return ordered;
}

async function saveLatestAnalysisV19(env, job, analysis, decision) {
  const forecast = manualForecast(job, analysis, decision);
  forecast.generatedAt = analysis.generatedAt;
  forecast.createdAt = analysis.generatedAt;
  forecast.live = Boolean(analysis.live);
  forecast.probabilityBoard = flatten(analysis.probabilities).map(x => ({...x, probability: pctClient(x.probability)}));
  await saveFeedSnapshot(env, `model-analysis:${job.fixture_id}`, {
    date: dateOfV19(job.kickoff_at), generatedAt: analysis.generatedAt,
    forecast, analysis, decision
  }, 86400);
}

async function applyLiveStateV19(env, job, analysis) {
  const date = dateOfV19(job.kickoff_at);
  const snap = await fixtureSnapshotV19(env, date);
  const fixture = snap.fixtures.find(f => fixtureIdV19(f) === Number(job.fixture_id)) || job.metadata?.fixture;
  job.metadata = {...job.metadata, fixture, fixture_status: fixture?.fixture?.status?.short};
  if (!LIVE_STATUSES.has(job.metadata.fixture_status)) return;
  const elapsed = fixture?.fixture?.status?.elapsed;
  const home = fixture?.goals?.home;
  const away = fixture?.goals?.away;
  analysis.live = {elapsed, homeGoals: home, awayGoals: away, status: job.metadata.fixture_status};
  analysis.liveUsable = ['1H','HT','2H','LIVE'].includes(job.metadata.fixture_status) &&
    Number.isFinite(elapsed) && Number.isFinite(home) && Number.isFinite(away) &&
    elapsed >= 0 && elapsed <= 90 && home >= 0 && away >= 0;
  if (!analysis.liveUsable) return;
  const remaining = clamp((90 - elapsed) / 90, 0, 1);
  const hx = analysis.expectedGoals.home * remaining;
  const ax = analysis.expectedGoals.away * remaining;
  analysis.probabilities = probabilities(hx, ax, home, away);
  analysis.expectedGoals = {home: home + hx, away: away + ax};
  analysis.live.method = 'score-and-time-conditioned-poisson';
}

async function oddsForJobV19(env, job) {
  const live = LIVE_STATUSES.has(job.metadata?.fixture_status);
  const key = live ? 'live-odds' : oddsKey(dateOfV19(job.kickoff_at));
  const row = await getFeedSnapshot(env, key);

  if (live) {
    if (!row || Date.now() - Date.parse(row.refreshed_at) > 10 * 60000) return {response: []};
    if (!['1H','HT','2H','LIVE'].includes(job.metadata.fixture_status)) return {response: []};
    return {response: arr(row.payload?.response).filter(f =>
      !f.status?.blocked && !f.status?.stopped && !f.status?.finished
    ).map(f => {
      if (Array.isArray(f.bookmakers)) return f;
      const aliases = {'Match Winner': 'Match Winner', 'Fulltime Result': 'Match Winner',
        'Match Goals': 'Goals Over/Under', 'Goals Over/Under': 'Goals Over/Under',
        'Both Teams to Score': 'Both Teams Score', 'Both Teams Score': 'Both Teams Score',
        'Double Chance': 'Double Chance'};
      const bets = arr(f.odds).filter(b => aliases[b.name]).map(b => ({
        name: aliases[b.name], values: arr(b.values).filter(v => !v.suspended && v.main !== false).map(v => ({
          value: v.handicap != null && !/\d/.test(String(v.value))
            ? `${v.value} ${v.handicap}` : v.value,
          odd: v.odd
        }))
      }));
      return {...f, bookmakers: [{name: 'API-Football Live', bets}]};
    })};
  }

  const snapshotPayload = row?.payload || {response: []};
  if (oddsMarketsFromSnapshot(snapshotPayload, job.fixture_id).length) return snapshotPayload;

  const directKey = `fixture-odds:${job.fixture_id}`;
  const cached = await getFeedSnapshot(env, directKey).catch(() => null);
  if (cached && Date.now() - Date.parse(cached.refreshed_at) < 30 * 60000) {
    return cached.payload || snapshotPayload;
  }

  try {
    const direct = await providerFetchV18(env, 'odds', {
      fixture: String(job.fixture_id),
      page: 1
    });
    const payload = {
      ok: true,
      service: 'two45-live-worker',
      type: 'fixture-odds',
      fixtureId: Number(job.fixture_id),
      updatedAt: new Date().toISOString(),
      response: arr(direct?.response).map(slimOddsRowV18)
    };
    await saveFeedSnapshot(env, directKey, payload, 1800);
    return payload;
  } catch (_) {
    await saveFeedSnapshot(env, directKey, {response: []}, 600).catch(() => null);
    return snapshotPayload;
  }
}

async function refreshCarryoverV19(env) {
  if (providerQuietWindow()) return {ok:true, skipped:true, reason:"Provider quiet window"};

  // Settlement repair lane: refresh at most one recent past date per run.
  // Stored pre-match snapshots otherwise strand forecasts after the date rolls over.
  for (let daysBack = 1; daysBack <= 4; daysBack++) {
    const date = datePlusDays(easternDate(), -daysBack);
    const row = await getFeedSnapshot(env, fixtureKey(date));
    if (!row || Date.now() - Date.parse(row.refreshed_at) < 15 * 60000) continue;

    const fixtures = arr(row.payload?.fixtures);
    const needsFinals = fixtures.some(f =>
      LIVE_STATUSES.has(f?.fixture?.status?.short) ||
      UPCOMING_STATUSES.has(f?.fixture?.status?.short)
    );
    if (!needsFinals) continue;

    const payload = await refreshFixturesV18(env, date);
    await saveFeedSnapshot(env, fixtureKey(date), payload, 900);
    return {ok:true, key:fixtureKey(date), total:payload.total, settlementOnly:true, daysBack};
  }
  return null;
}


async function evaluateBoardV19(env, date, light = false) {
  if (!dateAllowedV19(date)) return {ok: true, skipped: true, date};

  const previous = await getFeedSnapshot(env, modelBoardKey(date));
  let external = {ok: true, board: previous?.payload || null};
  if (!light) {
    try {
      external = await runBackgroundEvaluationV18(env, date, null);
    } catch (error) {
      external = {
        ok: false,
        error: safeRefreshError(error),
        board: previous?.payload || null
      };
    }
  }

  const base = external.board || previous?.payload || {};
  const fixtureData = await fixtureSnapshotV19(env, date);
  const fixtures = fixtureData.fixtures;
  const ids = fixtures.map(fixtureIdV19);
  const canonicalRows = await canonicalAnalysisRowsV2(env, ids);

  // Use the same canonical presentation path for persisted and read-time boards.
  // This prevents the saved snapshot from reintroducing conservative Risky Value
  // selections or Tier 4 automatic picks when endpoint hydration falls back.
  const presented = presentCanonicalBoardV59({
    ...base,
    ok: true,
    date,
    service: "two45-live-worker",
    games: fixtures,
    fixtures
  }, fixtures, canonicalRows);

  const now = new Date().toISOString();
  const health = await analysisHealthV2(env, date).catch(() => null);
  const independentForecasts = arr(presented.independentForecasts);
  const eligiblePicks = arr(presented.picks);
  const strongPicks = arr(presented.strongPicks);
  const riskyPlays = arr(presented.riskyPlays);

  const board = {
    ...presented,
    updatedAt: now,
    analyzedCount: independentForecasts.length,
    analysisHealth: health,
    independentModel: {
      ...base.independentModel,
      version: MODEL_VERSION,
      updatedAt: now,
      forecastCount: independentForecasts.length,
      qualifiedValuePicks: eligiblePicks.length,
      strongPicks: strongPicks.length,
      riskyPlays: riskyPlays.length,
      strongModelViews: independentForecasts.filter(
        f => num(f.probability) >= 75 && num(f.dataQuality) >= 68
      ).length
    },
    evaluation: {
      source: "analysis-engine-v2",
      date,
      evaluatedAt: now,
      pagesEvaluationOk: external.ok,
      pagesEvaluationError: external.error || null,
      fixtureUpdatedAt: fixtureData.refreshedAt
    }
  };

  await saveFeedSnapshot(env, modelBoardKey(date), board, 1800);
  return {
    ok: true,
    date,
    analyzed: independentForecasts.length,
    picks: eligiblePicks.length,
    analysisHealth: health,
    pagesEvaluationOk: external.ok,
    pagesEvaluationError: external.error || null
  };
}


async function runCycleV19(event, env, force = false) {
  // V20.1: operate 24/7. Overnight cycles stay paced by the same
  // one-minute scheduler, feed locks, provider budget reservation and
  // rate-limit backoff instead of shutting the pipeline down.
  // The database refresh-lock RPC used by the legacy scheduler can remain
  // leased indefinitely in this project. The cron itself runs once per minute
  // and each cycle is bounded, so do not gate the analysis pipeline on it.
  const startedAt = new Date().toISOString();
  const result = {ok: true, version: WORKER_VERSION, pacingRevision: PACING_REVISION, feeds: [], boards: [], errors: []};
  try {
    // V22 Cruise Control: after 8 PM, model work gets first use of
    // the pacing window so Tomorrow cannot remain stuck at zero.
    const oddsRepairActive = await oddsRepairActiveV68(env).catch(() => false);
    // While shared Bet365 coverage is being rebuilt, dedicate alternating cron
    // minutes to odds repair so model baselines cannot monopolize provider calls.
    const modelFirst = !(oddsRepairActive && (new Date().getUTCMinutes() % 2 === 0));
    if (modelFirst) {
      try {
        result.model = await processJobs(env, batchLimitV19(env.TWO45_MODEL_BATCH));
        if (!result.model.ok) result.errors.push({stage: 'model', error: 'One or more jobs failed; see model results'});
      } catch (e) { result.errors.push({stage: 'model', error: safeRefreshError(e)}); }
    }

    const clearingFresh = modelFirst && num(result.model?.freshBaselineBacklog) > 0;
    const feedMinute = new Date().getUTCMinutes();
    const refreshFeedThisCycle = !clearingFresh || feedMinute % 5 === 0;
    const providerCooling = Boolean(result.model?.cooldownActive);
    if (providerCooling || !refreshFeedThisCycle) {
      result.feeds.push({ok:true, skipped:true, reason: providerCooling ? 'Provider cooldown: model retry has priority' : 'Fresh baseline backlog: feed refresh runs every 5 minutes'});
    } else {
      for (let i = 0; i < 1; i++) {
        try {
          const feed = await refreshOneFeed(env, force && i === 0);
          result.feeds.push(feed);
          if (!feed.ok) result.errors.push({stage: 'feed', error: feed.error});
          if (feed.skipped || !feed.ok) break;
        } catch (e) { result.errors.push({stage: 'feed', error: safeRefreshError(e)}); break; }
      }
      try {
        const carryover = await refreshCarryoverV19(env);
        if (carryover) result.feeds.push(carryover);
      } catch (e) { result.errors.push({stage: 'carryover', error: safeRefreshError(e)}); }
    }

    if (!modelFirst) {
      try {
        result.model = await processJobs(env, batchLimitV19(env.TWO45_MODEL_BATCH));
        if (!result.model.ok) result.errors.push({stage: 'model', error: 'One or more jobs failed; see model results'});
      } catch (e) { result.errors.push({stage: 'model', error: safeRefreshError(e)}); }
    }

    // Forecast inserts already refresh the model board through the Supabase trigger.
    // Skip the heavier full evaluator while clearing fresh baselines.
    if (clearingFresh) {
      try {
        result.boards.push(await evaluateBoardV19(env, easternDate(), true));
      } catch (e) {
        result.errors.push({stage: 'board-light', date: easternDate(), error: safeRefreshError(e)});
      }
    } else {
      for (const date of activeDatesV19().slice().sort((a, b) => Number(b === tomorrowEasternDate()) - Number(a === tomorrowEasternDate()))) {
        try { result.boards.push(await evaluateBoardV19(env, date)); }
        catch (e) { result.errors.push({stage: 'board', date, error: safeRefreshError(e)}); }
      }
    }
    // Settlement is independent of model success and still sweeps stored finished fixtures.
    try { result.settled = await settle(env); }
    catch (e) { result.errors.push({stage: 'settlement', error: safeRefreshError(e)}); }
    result.ok = result.errors.length === 0;
    await saveFeedSnapshot(env, 'cron-status', {
      status: result.ok ? 'completed' : 'partial-failure', cron: event?.cron || 'manual',
      startedAt, completedAt: new Date().toISOString(), result
    }, 1800);
    return result;
  } finally {
    // Intentionally empty: cycle execution is bounded by per-stage deadlines.
  }
}



async function timedV2(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label + " timed out after " + ms + "ms")), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runAnalysisWatchdogV2(env) {
  try {
    const rows = await sb(env, "rpc/two45_analysis_watchdog", {
      method: "POST",
      body: JSON.stringify({p_model_version: MODEL_VERSION, p_timeout_minutes: 1})
    });
    const row = arr(rows)[0] || {};
    return {
      recoveredAnalysis: num(row.recovered_analysis),
      recoveredJobs: num(row.recovered_jobs),
      pending: num(row.pending),
      processing: num(row.processing),
      complete: num(row.complete),
      failed: num(row.failed),
      lastCompletedAt: row.last_completed_at || null
    };
  } catch (e) {
    return {recoveredAnalysis:0,recoveredJobs:0,error:safeRefreshError(e)};
  }
}


async function ensureTomorrowPreloadV49(env) {
  if (!shouldPreloadTomorrow()) {
    return {ok:true, skipped:true, reason:"Tomorrow preload window has not started"};
  }

  const tomorrow = tomorrowEasternDate();
  const key = fixtureKey(tomorrow);
  const stageKey = "tomorrow-staged:" + tomorrow;

  const [snap, staged] = await Promise.all([
    getFeedSnapshot(env, key).catch(() => null),
    getFeedSnapshot(env, stageKey).catch(() => null)
  ]);

  // Once tomorrow has been staged successfully, never put another provider
  // fixture refresh in front of the analysis queue. Feed maintenance can
  // happen later; analysis must keep moving continuously.
  if (snap && staged?.payload?.staged) {
    const fixtureCount =
      arr(snap?.payload?.fixtures).length ||
      arr(snap?.payload?.response).length ||
      num(snap?.payload?.total,0);

    return {
      ok:true,
      date:tomorrow,
      refreshed:false,
      fixtureCount,
      staged:true,
      skippedRefresh:true,
      skippedSync:true,
      queue:staged?.payload?.queue || null
    };
  }

  // First-time preload only.
  let payload = snap?.payload || null;
  if (!payload) {
    payload = await timedV2(
      refreshFixturesV18(env, tomorrow),
      9000,
      "initial tomorrow fixture preload"
    );
    await saveFeedSnapshot(env, key, payload, 7200);
  }

  const fixtureCount =
    arr(payload?.fixtures).length ||
    arr(payload?.response).length ||
    num(payload?.total,0);

  const sync = await timedV2(
    syncFixtureJobsV19(env),
    9000,
    "initial tomorrow queue sync"
  );

  const stagePayload = {
    staged:true,
    date:tomorrow,
    fixtureCount,
    stagedAt:new Date().toISOString(),
    queue:sync?.summary || null
  };

  await saveFeedSnapshot(env, stageKey, stagePayload, 12 * 3600)
    .catch(() => null);

  return {
    ok:true,
    date:tomorrow,
    refreshed:!snap,
    fixtureCount,
    staged:true,
    queue:sync?.summary || null
  };
}

async function refreshTodayScoreStateV66(env) {
  const date = easternDate();
  const base = await getFeedSnapshot(env, fixtureKey(date)).catch(() => null);
  const fixtures = fixtureRowsV58(base);
  const now = Date.now();

  const activeWindow = fixtures.some(f => {
    const kickoff = Date.parse(f?.fixture?.date || 0);
    const status = f?.fixture?.status?.short;
    if (!Number.isFinite(kickoff)) return false;
    if (FINISHED_STATUSES.has(status)) return false;
    return now >= kickoff - 10 * 60000 && now <= kickoff + 3 * 60 * 60000;
  });

  if (!activeWindow) {
    return {ok:true, skipped:true, reason:"No Today fixture is in an active match window"};
  }

  const fresh = await refreshFixturesV18(env, date);
  await saveFeedSnapshot(env, fixtureKey(date), fresh, 900);

  // Settlement reads this exact fixtures:DATE snapshot, so completed matches
  // flow from Today into the Record without a second football-provider call.
  let settled = null;
  try {
    settled = await settle(env);
  } catch (e) {
    settled = {error:safeRefreshError(e)};
  }

  return {
    ok:true,
    type:"today-fixtures",
    total:fresh.total,
    updatedAt:fresh.updatedAt,
    settled
  };
}

/* =========================================================
   V70 IMMUTABLE 6 AM TICKETS
   ========================================================= */
function ticketNormV70(v,d=0){v=Number(v);return Number.isFinite(v)?(v>1?v/100:v):d}
function ticketPriceV70(x){const n=Number(x?.sportsbookOdds??x?.odds??x?.price);return Number.isFinite(n)&&n>=1.10?n:null}
function ticketPriceCoherentV70(x){const o=ticketPriceV70(x),p=ticketNormV70(x?.probability,0);if(!o)return false;const implied=1/o;if(o>=3&&p>=.70)return false;if(p>=.80&&o>=4)return false;if(p>0&&implied>0&&p/implied>3)return false;return true}
function ticketSafetyV70(x){const m=String(x?.market||"").toUpperCase();return m==="TOTAL_GOALS"?.05:m==="DOUBLE_CHANCE"?.045:(m==="HOME_TEAM_GOALS"||m==="AWAY_TEAM_GOALS")?.04:m==="BTTS"?.02:m==="MATCH_RESULT"?-.04:0}
function ticketUpcomingV70(board,x){const id=String(x?.fixtureId??x?.providerMatchId??"");const f=arr(board?.games||board?.fixtures).find(g=>String(fixtureIdV19(g))===id);return !!f&&f?.fixture?.status?.short==="NS"&&Date.parse(f?.fixture?.date||0)>Date.now()}
function ticketPoolBoardV70(board,day,alts=false){const rows=[];for(const p of arr(board?.strongPicks)){if(p?.decision!=="PICK"||!ticketUpcomingV70(board,p))continue;for(const c of (alts?[p,...arr(p.alternatives)]:[p])){const x={...p,...c},book=String(x.bookmaker||"").replace(/[^a-z0-9]/gi,"").toLowerCase();if(book!=="bet365"||!ticketPriceCoherentV70(x))continue;rows.push({...x,fixtureId:p.fixtureId,providerMatchId:p.providerMatchId,home:p.home,away:p.away,league:p.league,kickoff:p.kickoff,_ticketOdds:ticketPriceV70(x),_ticketDay:day,_ticketScore:ticketNormV70(x.probability,0)*.68+ticketNormV70(p.dataQuality,.7)*.18+ticketNormV70(p.competitionReliability,.75)*.09+ticketSafetyV70(x)})}}const seen=new Map();for(const x of rows){const id=String(x.fixtureId||x.providerMatchId||"");const prev=seen.get(id);if(id&&(!prev||x._ticketScore>prev._ticketScore))seen.set(id,x)}return[...seen.values()].sort((a,b)=>b._ticketScore-a._ticketScore)}
function ticketOptimizeV70(pool,target,low,high,minLegs,maxLegs){let best=null,fallback=null;function visit(start,legs,combined,sum){if(legs.length>=minLegs){const avg=sum/legs.length,dist=Math.abs(combined-target)/target,c={legs:legs.slice(),combined,score:avg-dist*.08-Math.max(0,legs.length-minLegs)*.008,target,targetLow:low,targetHigh:high};if(combined>=low&&combined<=high&&(!best||c.score>best.score))best=c;c.fallbackScore=avg-dist*.16-Math.max(0,legs.length-minLegs)*.01;if(!fallback||c.fallbackScore>fallback.fallbackScore)fallback=c}if(legs.length>=maxLegs||combined>high*1.75)return;for(let i=start;i<pool.length;i++){const next=combined*pool[i]._ticketOdds;if(next>Math.max(high*1.75,target*1.75))continue;legs.push(pool[i]);visit(i+1,legs,next,sum+pool[i]._ticketScore);legs.pop()}}visit(0,[],1,0);const chosen=best||fallback;if(chosen)chosen.targetMet=!!best;return chosen}
async function ticketBoardV70(env,date){const fs=await snapshot(env,fixtureKey(date)).catch(()=>null),games=fixtureRowsV58(fs);if(!games.length)return{ok:true,date,games:[],fixtures:[],strongPicks:[],riskyPlays:[]};const bs=await snapshot(env,modelBoardKey(date)).catch(()=>null),base=bs?.payload||{ok:true,date,games,fixtures:games};const rows=await canonicalAnalysisRowsV2(env,games.map(fixtureIdV19)).catch(()=>[]);return presentCanonicalBoardV59(base,games,rows)}
async function ticketBaselineV70(env,legs){const out={},ids=[...new Set(arr(legs).map(x=>Number(x.fixtureId||x.providerMatchId)).filter(Boolean))];await Promise.all(ids.map(async id=>{const s=await getFeedSnapshot(env,"match-intelligence:"+id).catch(()=>null),p=s?.payload||{};out[String(id)]={generatedAt:p.generatedAt||s?.refreshed_at||null,homeAbsences:num(p.homeAbsences,0),awayAbsences:num(p.awayAbsences,0),lineupsConfirmed:Boolean(p.lineupsConfirmed)}}));return out}
function lockTicketV70(t,at,b){if(!t)return null;return{...t,locked:true,lockedAt:at,legs:arr(t.legs).map(x=>({...x,locked:true,lockedAt:at,originalOdds:ticketPriceV70(x),originalProbability:num(x.probability,null),originalMarket:x.market||null,originalSelection:x.selection||null,lockIntel:b?.[String(x.fixtureId||x.providerMatchId)]||null}))}}
async function buildDailyLockV70(env,date){const board=await ticketBoardV70(env,date),pool=ticketPoolBoardV70(board,"Today",true).slice(0,30),t=ticketOptimizeV70(pool,3.125,3,3.25,2,6),at=new Date().toISOString(),b=await ticketBaselineV70(env,t?.legs||[]),payload={ok:true,type:"daily",date,status:"LOCKED",lockedAt:at,immutable:true,ticket:lockTicketV70(t,at,b),candidateCount:pool.length,rule:"Frozen after the 06:00 America/New_York publication lock."};await saveFeedSnapshot(env,"ticket-lock:daily:"+date,payload,259200);return payload}
function weekendAnchorV70(){const d=easternDate(),day=easternWeekday();if(day==="Fri")return datePlusDays(d,1);if(day==="Sat")return d;if(day==="Sun")return datePlusDays(d,-1);return null}
async function buildWeekendLockV70(env,satDate){const sunDate=datePlusDays(satDate,1),boards=await Promise.all([ticketBoardV70(env,satDate),ticketBoardV70(env,sunDate)]),pool=[...ticketPoolBoardV70(boards[0],"Sat",false),...ticketPoolBoardV70(boards[1],"Sun",false)].sort((a,b)=>b._ticketScore-a._ticketScore).slice(0,24),five=ticketOptimizeV70(pool,5,4.75,5.5,2,5),ten=ticketOptimizeV70(pool,10,9,11,3,7),fifty=ticketOptimizeV70(pool,50,45,55,4,9),at=new Date().toISOString(),b=await ticketBaselineV70(env,[...arr(five?.legs),...arr(ten?.legs),...arr(fifty?.legs)]),payload={ok:true,type:"weekend",saturday:satDate,sunday:sunDate,status:"LOCKED",lockedAt:at,immutable:true,tickets:{five:lockTicketV70(five,at,b),ten:lockTicketV70(ten,at,b),fifty:lockTicketV70(fifty,at,b)},candidateCount:pool.length,rule:"Saturday and Sunday legs freeze together at Saturday 06:00 America/New_York."};await saveFeedSnapshot(env,"ticket-lock:weekend:"+satDate,payload,432000);return payload}
async function ensureTicketLocksV70(env){const hour=easternHour(),date=easternDate();let d=await getFeedSnapshot(env,"ticket-lock:daily:"+date).catch(()=>null);if(!d&&hour>=6)d={payload:await buildDailyLockV70(env,date)};const sat=weekendAnchorV70(),day=easternWeekday();let w=sat?await getFeedSnapshot(env,"ticket-lock:weekend:"+sat).catch(()=>null):null;if(!w&&sat&&((day==="Sat"&&hour>=6)||day==="Sun"))w={payload:await buildWeekendLockV70(env,sat)};return{daily:d?.payload||null,weekend:w?.payload||null}}
async function alertsForLockV70(env,lock){const tickets=[];if(lock?.ticket)tickets.push(lock.ticket);if(lock?.tickets)tickets.push(...Object.values(lock.tickets).filter(Boolean));const seen=new Set(),alerts=[];for(const t of tickets)for(const leg of arr(t?.legs)){const id=String(leg.fixtureId||leg.providerMatchId||"");if(!id||seen.has(id))continue;seen.add(id);const s=await getFeedSnapshot(env,"match-intelligence:"+id).catch(()=>null),p=s?.payload||{},base=leg.lockIntel||{};if(!p.generatedAt||Date.parse(p.generatedAt)<=Date.parse(leg.lockedAt||0))continue;const hd=num(p.homeAbsences,0)-num(base.homeAbsences,0),ad=num(p.awayAbsences,0)-num(base.awayAbsences,0);if(hd||ad)alerts.push({fixtureId:id,home:leg.home,away:leg.away,severity:(hd>0||ad>0)?"HIGH_IMPACT":"WATCH",type:"AVAILABILITY_CHANGE",message:"Player availability changed after lock. The original selection remains unchanged.",updatedAt:p.generatedAt});if(p.lineupsConfirmed&&!base.lineupsConfirmed)alerts.push({fixtureId:id,home:leg.home,away:leg.away,severity:"INFO",type:"LINEUP_CONFIRMED",message:"Confirmed lineups are available. The locked ticket remains unchanged.",updatedAt:p.generatedAt})}return alerts}
async function ticketLocksResponseV70(env){const locks=await ensureTicketLocksV70(env),alerts=[...await alertsForLockV70(env,locks.daily),...await alertsForLockV70(env,locks.weekend)];return{ok:true,lockHour:"06:00 America/New_York",immutableAfterLock:true,daily:locks.daily||{status:"BUILDING",date:easternDate(),locksAt:"06:00 America/New_York"},weekend:locks.weekend||{status:"BUILDING",saturday:weekendAnchorV70(),locksAt:"Saturday 06:00 America/New_York"},alerts}}

async function scheduledAnalysisV2(event, env) {
  // V53: scheduled cron is intentionally lock-free. Fixture ownership is
  // already protected by the atomic Postgres claim RPC, so a global refresh
  // lock is unnecessary and was a single point of failure: if lock acquisition
  // failed, the entire minute was silently skipped.
  const startedAt = new Date().toISOString();
  providerBurstV69 = {id:startedAt,calls:0,maxCalls:PROVIDER_BURST_MAX_CALLS_V69};
  const result = {
    ok: true,
    version: WORKER_VERSION,
    pacingRevision: PACING_REVISION,
    engine: "analysis-engine-v2",
    cron: event?.cron || "* * * * *",
    startedAt,
    model: null,
    watchdog: null,
    maintenance: []
  };

  // Persist entry before any RPC/model work so cron invocation itself is
  // observable even if a later dependency fails.
  await saveFeedSnapshot(env, "cron-status", {
    status: "starting",
    cron: result.cron,
    startedAt,
    heartbeatAt: startedAt,
    result
  }, 1800).catch(() => null);

  result.watchdog = await runAnalysisWatchdogV2(env);

  try {
    result.ticketLocks = await ensureTicketLocksV70(env);
  } catch (e) {
    result.maintenance.push({ok:false,stage:"ticket-lock",error:safeRefreshError(e)});
  }

  await saveFeedSnapshot(env, "cron-status", {
    status: "running",
    cron: result.cron,
    startedAt,
    heartbeatAt: startedAt,
    result
  }, 1800).catch(() => null);

  // Hard 8 PM rule: tomorrow discovery and queueing are never blocked by today's backlog.
  if (shouldPreloadTomorrow()) {
    try {
      result.tomorrowPreload = await timedV2(
        ensureTomorrowPreloadV49(env),
        18000,
        "tomorrow preload"
      );
    } catch (e) {
      result.ok = false;
      result.tomorrowPreload = {ok:false,error:safeRefreshError(e)};
    }
  }

  // Automatic analysis runs 24/7. The 8 PM rule controls tomorrow/weekend
  // discovery priority, not whether the model is allowed to work at all.
  const minute = new Date().getUTCMinutes();
  const oddsRepairActive = await oddsRepairActiveV68(env).catch(() => false);
  const oddsRepairFirst = oddsRepairActive && minute % 2 === 0;

  // While shared Bet365 coverage is unhealthy, reserve alternating cron minutes
  // for fixture-level odds repair before model work so pricing cannot be starved.
  if (oddsRepairFirst) {
    try {
      result.maintenance.push(await timedV2(
        refreshOneFeed(env, false),
        22000,
        "priority odds repair"
      ));
    } catch (e) {
      result.maintenance.push({ok:false, stage:"priority-odds-repair", error:safeRefreshError(e)});
    }
  }

  try {
    result.model = await timedV2(
      processJobs(env, DEFAULT_MODEL_BATCH, null, true),
      14000,
      "analysis pass"
    );
  } catch (e) {
    result.ok = false;
    result.model = {
      ok: false,
      claimed: 0,
      processed: 0,
      error: safeRefreshError(e)
    };
  }

  // V51: persist the model-stage result immediately. If Cloudflare ends the
  // event during non-critical maintenance, the dashboard still sees the last
  // successful/failed model pass instead of a misleading permanent "running".
  const modelStageAt = new Date().toISOString();
  await saveFeedSnapshot(env, "cron-status", {
    status: result.model?.ok ? "model-complete" : "model-partial",
    cron: result.cron,
    startedAt,
    heartbeatAt: modelStageAt,
    modelCompletedAt: modelStageAt,
    result
  }, 1800).catch(() => null);

  const pendingBacklogNow =
    num(result.watchdog?.pending) > 0 ||
    num(result.model?.freshBaselineBacklog) > 0;

  // Board evaluation is not allowed to sit in front of queue drainage.
  // While fresh work remains, the frontend reads canonical rows directly and
  // the heavier board refresh waits until the backlog clears.
  if (!pendingBacklogNow) {
    try {
      const boardDates = shouldPreloadTomorrow()
        ? [tomorrowEasternDate(), easternDate()]
        : [easternDate()];
      for (const boardDate of boardDates) {
        result.maintenance.push(await timedV2(
          evaluateBoardV19(env, boardDate, true),
          4000,
          "light board refresh " + boardDate
        ));
      }
    } catch (e) {
      result.maintenance.push({
        ok:false,
        stage:"light-board-refresh",
        error:safeRefreshError(e)
      });
    }
  }

  const modelCompletedAt = new Date().toISOString();
  await saveFeedSnapshot(env, "cron-status", {
    status: result.ok ? "analysis-complete" : "analysis-partial",
    cron: result.cron,
    startedAt,
    completedAt: modelCompletedAt,
    heartbeatAt: modelCompletedAt,
    result
  }, 1800).catch(() => null);

  const pendingBacklog = pendingBacklogNow;

  // Today behaves like a live-score board. Every five minutes during active
  // match windows, refresh the full Today fixture state and immediately settle
  // any completed published picks from that same snapshot.
  let scoreStateRefreshed = false;
  if (minute % 5 === 0) {
    try {
      const scoreState = await timedV2(
        refreshTodayScoreStateV66(env),
        12000,
        "five-minute Today score refresh"
      );
      result.maintenance.push(scoreState);
      scoreStateRefreshed = Boolean(scoreState && !scoreState.skipped);
    } catch (e) {
      result.maintenance.push({ok:false, stage:"today-score-refresh", error:safeRefreshError(e)});
    }
  }

  // Feed maintenance must not be starved by the analysis queue. The previous
  // backlog gate left odds:DATE stuck at zero while hundreds of fixtures were
  // pending, forcing one-off fallback calls and starving Elite of Bet365 prices.
  const currentOddsSnapshot = await getFeedSnapshot(
    env,
    oddsKey(easternDate())
  ).catch(() => null);
  const currentOddsEmpty =
    !currentOddsSnapshot ||
    !arr(currentOddsSnapshot?.payload?.response).length ||
    num(currentOddsSnapshot?.payload?.total, 0) <= 0;

  // Repair unhealthy odds every minute, but on alternating minutes the repair
  // already ran before model work. Healthy feeds use the normal five-minute lane.
  const repairStillActive = await oddsRepairActiveV68(env).catch(() => currentOddsEmpty);
  if (!oddsRepairFirst && !scoreStateRefreshed && (repairStillActive || minute % 5 === 0)) {
    try {
      result.maintenance.push(await timedV2(
        refreshOneFeed(env, false),
        22000,
        "feed refresh"
      ));
    } catch (e) {
      result.maintenance.push({ok:false, stage:"feed", error:safeRefreshError(e)});
    }
  }

  // Settlement is independent of analysis backlog. A completed game must not
  // remain Pending simply because tomorrow's analysis queue is still draining.
  // Every 15 minutes, refresh at most one stale recent date and then grade all
  // finished forecasts available in stored fixture snapshots.
  if (minute % 15 === 0) {
    try {
      const carryover = await timedV2(
        refreshCarryoverV19(env),
        10000,
        "settlement carryover refresh"
      );
      if (carryover) result.maintenance.push(carryover);
    } catch (e) {
      result.maintenance.push({ok:false, stage:"settlement-carryover", error:safeRefreshError(e)});
    }
    try {
      result.settled = await timedV2(settle(env), 10000, "settlement");
    } catch (e) {
      result.maintenance.push({ok:false, stage:"settlement", error:safeRefreshError(e)});
    }
    if (!pendingBacklog) {
      try {
        result.shadowBacktest = await timedV2(
          settleShadowBacktestV44(env, 1),
          12000,
          "shadow backtest settlement"
        );
      } catch (e) {
        result.maintenance.push({ok:false, stage:"shadow-backtest", error:safeRefreshError(e)});
      }
    }
  }

  result.providerBurst = {calls:providerBurstV69?.calls || 0,maxCalls:PROVIDER_BURST_MAX_CALLS_V69};
  providerBurstV69 = null;
  return result;
}

export default {
  async fetch(
    request,
    env,
    ctx
  ) {
    const url =
      new URL(
        request.url
      );

    if (
      request.method ===
      "OPTIONS"
    ) {
      return new Response(
        null,
        {
          status:
            204,

          headers:
            corsHeaders()
        }
      );
    }

    try {
      if (
        url.pathname ===
        "/"
      ) {
        return json({
          ok:
            true,

          service:
            "two45-live-worker",

          version:
            WORKER_VERSION,

          modelVersion:
            MODEL_VERSION,

          modelLoaded:
            true
        });
      }

      if (
        url.pathname ===
        "/api/health/analysis"
      ) {
        const healthDate =
          url.searchParams.get("scope") === "tomorrow"
            ? tomorrowEasternDate()
            : easternDate();
        const health = await analysisHealthV2(env, healthDate);
        return json({
          ok: true,
          service: "two45-live-worker",
          engine: "analysis-engine-v2",
          pacingRevision: PACING_REVISION,
          ...health
        });
      }

      if (
        url.pathname ===
        "/api/health"
      ) {
        const s =
          supa(env);

        return json({
          ok:
            true,

          service:
            "two45-live-worker",

          version:
            WORKER_VERSION,

          modelVersion:
            MODEL_VERSION,

          modelLoaded:
            true,

          supabaseConfigured:
            Boolean(
              s.url &&
              s.key
            ),

          footballApiConfigured:
            Boolean(
              footballKey(
                env
              )
            ),

          date:
            easternDate(),

          tomorrowPreloadStartsAt:
            "20:00 America/New_York",

          tomorrowPreloadActive:
            shouldPreloadTomorrow(),

          modelBatch:
            Math.max(
              1,
              Math.min(
                num(
                  env.TWO45_MODEL_BATCH,
                  DEFAULT_MODEL_BATCH
                ),
                9
              )
            )
        });
      }

      if (
        url.pathname ===
          "/api/internal/refresh" &&
        request.method ===
          "POST"
      ) {
        const supplied =
          request.headers.get(
            "x-two45-internal-key"
          ) || "";

        if (
          !env.TWO45_INTERNAL_KEY ||
          supplied !==
            env.TWO45_INTERNAL_KEY
        ) {
          return json(
            {
              ok:
                false,

              error:
                "Protected Two45 refresh endpoint."
            },
            403
          );
        }

        return json(
          await runCycleV19({cron: "manual"}, env, true)
        );
      }

      if (
        url.pathname ===
        "/api/today"
      ) {
        return json(
          await todayBoard(
            env
          )
        );
      }

      if (
        url.pathname ===
          "/api/model-board" ||
        url.pathname ===
          "/api/dashboard"
      ) {
        return json(
          await todayBoard(
            env
          )
        );
      }

      if (
        url.pathname ===
          "/api/fixtures" ||
        url.pathname ===
          "/api/fixtures/today"
      ) {
        return json(
          await fixturesToday(
            env
          )
        );
      }

      if (
        url.pathname ===
        "/api/fixtures/tomorrow"
      ) {
        return json(
          await fixturesTomorrow(
            env
          )
        );
      }

      if (
        url.pathname ===
        "/api/odds/tomorrow"
      ) {
        return json(
          await oddsTomorrow(
            env
          )
        );
      }

      if (
        url.pathname ===
          "/api/model-board/tomorrow" ||
        url.pathname ===
          "/api/tomorrow"
      ) {
        return json(
          await tomorrowBoard(
            env
          )
        );
      }
      if (url.pathname === "/api/model-board/date") {
        const requestedDate = String(url.searchParams.get("date") || "");
        const allowedDates = new Set(weekendLadderDatesV67());
        if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || !allowedDates.has(requestedDate)) {
          return json({ok:false,error:"Date is not in the active Weekend Ladder pool."},400);
        }
        const snap = await snapshot(env, "model-board:" + requestedDate);
        const board = snap ? formatBoardSelectionsV20(snap.payload) : {
          ok:true,date:requestedDate,games:[],fixtures:[],picks:[],strongPicks:[],riskyPlays:[]
        };
        return json(await hydrateBoardFixturesV58(env, requestedDate, board, false));
      }


      if (
        url.pathname ===
        "/api/live"
      ) {
        return json(
          await liveBoard(
            env
          )
        );
      }

      if (
        url.pathname ===
        "/api/odds"
      ) {
        return json(
          await oddsToday(
            env
          )
        );
      }

      if (
        url.pathname ===
        "/api/live-odds"
      ) {
        return json(
          await liveOdds(
            env
          )
        );
      }

      if (
        url.pathname ===
        "/api/tickets"
      ) {
        return json(await ticketLocksResponseV70(env));
      }

      if (
        url.pathname ===
        "/api/model/status"
      ) {
        return json(
          await modelStatus(
            env
          )
        );
      }

      if (
        url.pathname ===
          "/api/internal/model-accuracy"
      ) {
        if (!internalRequestAuthorized(request, env)) {
          return json({ok:false,error:"Protected Two45 accuracy endpoint."},403);
        }
        return json({
          ok:true,
          ...(await shadowAccuracyReportV45(env))
        });
      }

      if (
        url.pathname ===
        "/api/record/summary"
      ) {
        return json(
          await recordSummaryV20(env)
        );
      }

      if (
        url.pathname ===
          "/api/record/history" ||
        url.pathname ===
          "/api/record"
      ) {
        const limit = Math.max(1, Math.min(num(url.searchParams.get("limit"), 250), 1000));
        return json(
          await recordHistoryV20(env, limit)
        );
      }

      if (
        url.pathname ===
          "/api/model/test" &&
        request.method ===
          "POST"
      ) {
        const testBody = await request.json();
        const testAnalysis = analyzeMatch(testBody);
        return json({
          ok: true,
          result: testAnalysis,
          decision: Array.isArray(testBody.marketOdds)
            ? selectIndependent(testAnalysis, testBody.marketOdds)
            : null
        });
      }

      if (
        url.pathname ===
          "/api/model/analyze" &&
        request.method ===
          "POST"
      ) {
        const result =
          await analyzeFixtureOnDemand(
            request,
            env
          );

        if (result.body?.status === "READY" && result.body?.forecast?.kickoff) {
          ctx.waitUntil(evaluateBoardV19(env, dateOfV19(result.body.forecast.kickoff)).catch(e => console.error("On-demand board refresh failed", safeRefreshError(e))));
        }
        return json(
          result.body,
          result.httpStatus
        );
      }

      if (
        url.pathname ===
          "/api/model/process" &&
        request.method ===
          "POST"
      ) {
        if (!internalRequestAuthorized(request, env)) {
          return json({ok:false,error:"Protected Two45 processing endpoint."},403);
        }
        const body =
          await request
            .json()
            .catch(
              () => ({})
            );

        return json(
          await processJobs(
            env,
            num(
              body.limit,
              1
            )
          )
        );
      }

      if (
        url.pathname ===
          "/api/model/settle" &&
        request.method ===
          "POST"
      ) {
        if (!internalRequestAuthorized(request, env)) {
          return json({ok:false,error:"Protected Two45 settlement endpoint."},403);
        }
        return json({
          ok:
            true,

          settled:
            await settle(
              env
            )
        });
      }

      return json(
        {
          ok:
            false,

          error:
            "Endpoint not found",

          path:
            url.pathname
        },
        404
      );

    } catch (e) {
      return json(
        {
          ok:
            false,

          service:
            "two45-live-worker",

          version:
            WORKER_VERSION,

          error:
            e?.message ||
            String(e)
        },
        500
      );
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(scheduledAnalysisV2(event, env));
  }
};
