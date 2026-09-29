--e11023a433541e621181b27c4b6a6cdb38961fc5a4cc6fea93b21eaeef5a
Content-Disposition: form-data; name="worker.js"

/**
 * Two45 Cloudflare Worker
 * Version 20 — Priority Coverage and Market Expansion
 * Independent Model V1.5 — Broad Analysis
 */

const WORKER_VERSION = 20;
const PACING_REVISION = "2026-09-29.1";
const PROVIDER_INTERVAL_MS = 14000;
const PRACTICAL_DAILY_CAP = 6500;
const MODEL_VERSION = "two45-independent-v1.6";
const REANALYZE_COOLDOWN_MS = 10 * 60 * 1000;

const API_BASE = "https://v3.football.api-sports.io";
const TIME_ZONE = "America/New_York";
const HARD_CAP = 7000;
const MAX_ODDS_PAGES = 15;
const DEFAULT_MODEL_BATCH = 2;
const FUTURE_FIXTURE_DAYS = 4;
const TOMORROW_PRELOAD_HOUR_ET = 20;

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

function easternWeekday() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short"
  }).format(new Date());
}

function weekendModeV20() {
  const day = easternWeekday();
  const hour = easternHour();
  return day === "Fri" || day === "Sat" || (day === "Thu" && hour >= 18);
}

function fourDayFixtureDatesV20() {
  const today = easternDate();
  return Array.from({length: FUTURE_FIXTURE_DAYS}, (_, i) => datePlusDays(today, i));
}

function deepAnalysisDatesV20() {
  const today = easternDate();
  if (weekendModeV20()) {
    return [today, datePlusDays(today, 1), datePlusDays(today, 2)];
  }
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
  const { url, key } =
    supa(env);

  if (!url || !key) {
    throw new Error(
      "Supabase configuration missing"
    );
  }

  const r =
    await fetch(
      `${url}/rest/v1/${path}`,
      {
        ...options,

        headers: {
          apikey: key,
          Authorization:
            `Bearer ${key}`,

          "Content-Type":
            "application/json",

          Prefer:
            options.prefer ||
            "return=representation",

          ...(options.headers || {})
        }
      }
    );

  const text =
    await r.text();

  if (!r.ok) {
    throw new Error(
      `Supabase ${r.status}: ${text}`
    );
  }

  return text
    ? JSON.parse(text)
    : null;
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
  const formatItem = item => {
    if (!item || typeof item !== "object") return item;
    return {
      ...item,
      selection: displaySelectionV20(item.selection),
      alternatives: displayAlternativesV20(item.alternatives)
    };
  };
  return {
    ...payload,
    picks: Array.isArray(payload.picks) ? payload.picks.map(formatItem) : payload.picks,
    strongPicks: Array.isArray(payload.strongPicks) ? payload.strongPicks.map(formatItem) : payload.strongPicks,
    riskyPlays: Array.isArray(payload.riskyPlays) ? payload.riskyPlays.map(formatItem) : payload.riskyPlays,
    independentForecasts: Array.isArray(payload.independentForecasts) ? payload.independentForecasts.map(formatItem) : payload.independentForecasts
  };
}

async function todayBoard(env) {
  const d =
    easternDate();

  const s =
    await snapshot(
      env,
      `model-board:${d}`
    );

  return s
    ? formatBoardSelectionsV20(s.payload)
    : {
        ok: false,
        date: d,
        error:
          "Today's model board is unavailable"
      };
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

  return s
    ? formatBoardSelectionsV20(s.payload)
    : {
        ok: true,
        date: d,
        games: [],
        picks: []
      };
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
      UNDER_3_5: 0,
      UNDER_4_5: 0
    },

    BTTS: {
      YES: 0,
      NO: 0
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

    if (g > 1) {
      out.TOTAL_GOALS.OVER_1_5 += p;
    }

    if (g > 2) {
      out.TOTAL_GOALS.OVER_2_5 += p;
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
      false,

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
 --- TRUNCATED --- 125,907 chars