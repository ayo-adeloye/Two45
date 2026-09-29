/**
 * Two45 Cloudflare Worker
 * Version 20 — Priority Coverage and Market Expansion
 * Independent Model V1.5 — Broad Analysis
 */

const WORKER_VERSION = 33;
const PACING_REVISION = "2026-09-29.19-real-options-no-u45-default";
const PROVIDER_INTERVAL_MS = 7000;
const PRACTICAL_DAILY_CAP = 6500;
const MODEL_VERSION = "two45-independent-v1.9";
const REANALYZE_COOLDOWN_MS = 10 * 60 * 1000;

const API_BASE = "https://v3.football.api-sports.io";
const TIME_ZONE = "America/New_York";
const HARD_CAP = 7000;
const MAX_ODDS_PAGES = 15;
const DEFAULT_MODEL_BATCH = 3;
const FUTURE_FIXTURE_DAYS = 4;
const TOMORROW_PRELOAD_HOUR_ET = 20;
const TARGET_DAILY_REQUESTS = 6000;
const FAST_BASELINE_INTERVAL_MS = 7000;

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
    const qualified =
      item.decision === "PICK" &&
      item.selection &&
      String(item.selection).toUpperCase() !== "NO_BET";

    return {
      ...item,
      market: qualified ? item.market : "NO_BET",
      selection: qualified ? displaySelectionV20(item.selection) : "NO_BET",
      probability: qualified ? item.probability : 0,
      fairOdds: qualified ? (item.fairOdds ?? null) : null,
      sportsbookOdds: qualified ? (item.sportsbookOdds ?? null) : null,
      bookmaker: qualified ? (item.bookmaker ?? null) : null,
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
  marketOdds = []
) {
  const modeled =
    flatten(
      analysis.probabilities
    );

  const strong = [];
  const risky = [];

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

      if (
        m.probability >=
          0.64 &&
        edge >=
          0.035 &&
        analysis.dataQuality >=
          0.68
      ) {
        strong.push(
          candidate
        );
      } else if (
        candidate.sportsbookOdds >=
          2.0 &&
        analysis.dataQuality >=
          0.54
      ) {
        const floor =
          candidate.sportsbookOdds >=
          3.5
            ? 0.26
            : candidate.sportsbookOdds >=
                2.75
              ? 0.30
              : 0.34;

        const edgeFloor =
          candidate.sportsbookOdds >=
          3.5
            ? 0.015
            : 0.02;

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
    MATCH_RESULT: -0.020
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
    return 0;
  };

  for (const m of modeled) {
    if (!["TOTAL_GOALS","DOUBLE_CHANCE","HANDICAP","HOME_TEAM_GOALS","AWAY_TEAM_GOALS","BTTS","MATCH_RESULT"].includes(m.market)) continue;
    const floor = m.market === "MATCH_RESULT" ? 0.76 :
      m.market === "HANDICAP" ? 0.70 :
      m.market === "BTTS" ? 0.73 :
      m.selection === "UNDER_4_5" ? 0.80 : 0.72;
    const qualityGate = analysis.competitionReliability >= 0.86 ? 0.66 : 0.70;
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

    // Model-only picks need stronger conviction than priced picks.
    if (m.probability >= floor + 0.03 || (analysis.competitionReliability >= 0.86 && m.probability >= floor + 0.01)) {
      for (let i = risky.length - 1; i >= 0; i--) {
        if (risky[i].market === m.market && risky[i].selection === m.selection) risky.splice(i, 1);
      }
      strong.push(candidate);
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
  const watch = [];

  for (const c of consensus) {
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

  const b =
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
  // V21.1 recent-match + H2H context. Cached with the rest of this enrichment.
  try {
    const recent = await football(env, "/fixtures", {league: job.provider_league_id, season: job.season, team: job.home_team_id, last: 8});
    out.homeRecent = summarizeRecentV211(arr(recent.response), Number(job.home_team_id));
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
    out.awayRecent = summarizeRecentV211(arr(recent.response), Number(job.away_team_id));
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
  if (intel.h2h?.matches >= 2) { const edge=clamp(num(intel.h2h.recencyWeightedHomeShare,0.5)-0.5,-0.25,0.25); home.formPointsPerGame=clamp(home.formPointsPerGame+edge*0.12,0,3); away.formPointsPerGame=clamp(away.formPointsPerGame-edge*0.12,0,3); }
}

async function teamStats(
  env,
  job,
  side
) {
  const teamId =
    side === "home"
      ? job.home_team_id
      : job.away_team_id;

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
          cutoff(
            job.kickoff_at
          )
      }
    );

  return (
    data.response ||
    {}
  );
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

  if (
    n.includes(
      "asian handicap"
    ) ||
    n.includes(
      "handicap result"
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
        []
    },

    probability_snapshot:
      analysis.probabilities
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

          Prefer:
            "resolution=ignore-duplicates,return=representation"
        },

        body:
          JSON.stringify(
            body
          )
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

async function claimSpecificJob(env, job) {
  if (!dateAllowedV19(dateOfV19(job.kickoff_at))) return null;
  if (!['PENDING', 'READY', 'FAILED'].includes(job.status)) return null;
  // requested_at and attempts prevent a stale reader from claiming a later incarnation.
  const filter = `id=eq.${encodeURIComponent(job.id)}&status=eq.${job.status}` +
    `&attempts=eq.${num(job.attempts)}&requested_at=eq.${encodeURIComponent(job.requested_at)}`;
  const now = new Date().toISOString();
  const rows = await sb(env, `two45_feature_jobs?${filter}&select=*`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'IN_PROGRESS', attempts: num(job.attempts) + 1,
      started_at: now, last_error: null,
      kickoff_at: job.kickoff_at,
      metadata: job.metadata || {}
    })
  });
  return arr(rows)[0] || null;
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

  const latest = await getFeedSnapshot(env, `model-analysis:${fixtureId}`);
  if (latest?.payload?.forecast && dateAllowedV19(latest.payload.date)) {
    const cd = cooldownState({created_at: latest.payload.generatedAt});
    if (!force || cd.active) return {httpStatus: 200, body: {ok: true, status: "READY", source: "latest-analysis", forecast: latest.payload.forecast, canReanalyze: !cd.active, nextRefreshAt: cd.nextRefreshAt, cooldownSeconds: Math.ceil(cd.remainingMs / 1000)}};
  }
  const stored =
    await existingForecast(
      env,
      fixtureId
    );

  if (
    stored &&
    !force
  ) {
    const cd =
      cooldownState(
        stored
      );

    return {
      httpStatus:
        200,

      body: {
        ok:
          true,

        status:
          "READY",

        source:
          "forecast-ledger",

        forecast:
          forecastRowToClient(
            stored
          ),

        canReanalyze:
          !cd.active,

        nextRefreshAt:
          cd.nextRefreshAt,

        cooldownSeconds:
          Math.ceil(
            cd.remainingMs /
            1000
          )
      }
    };
  }

  if (
    stored &&
    force
  ) {
    const cd =
      cooldownState(
        stored
      );

    if (
      cd.active
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
            "cooldown",

          forecast:
            forecastRowToClient(
              stored
            ),

          canReanalyze:
            false,

          nextRefreshAt:
            cd.nextRefreshAt,

          cooldownSeconds:
            Math.ceil(
              cd.remainingMs /
              1000
            ),

          message:
            "This fixture was analyzed recently. Refresh becomes available after the short cooldown."
        }
      };
    }
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
          manualForecast(
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
    const hs =
      await teamStats(
        env,
        job,
        "home"
      );

    const as =
      await teamStats(
        env,
        job,
        "away"
      );

    const hf =
      toFeatures(
        hs
      );

    const af =
      toFeatures(
        as
      );

    // V22 Cruise Control: publish the first forecast from the minimum
    // reliable team-stat inputs; layer costly enrichment on later refreshes.
    const priorAnalysis = await getFeedSnapshot(env, `model-analysis:${job.fixture_id}`).catch(() => null);
    const baselineFirstPass = !priorAnalysis;
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

    analysis.intelligence = {...(analysis.intelligence || {}), availability: optionalIntel};
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
        marketOdds
      );

    await writeForecast(
      env,
      job,
      analysis,
      decision
    );

    await saveLatestAnalysisV19(env, job, analysis, decision);

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

      analysis
    };

  } catch (e) {
    const msg =
      e?.message ||
      String(e);

    const rateLimited =
      /rate.?limit|too many requests|HTTP 429|daily cap|budget reservation|quiet window/i.test(
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

        last_error:
          msg
      }
    );

    return {
      fixtureId:
        job.fixture_id,

      status:
        "FAILED",

      error:
        msg,

      rateLimited
    };
  }
}

async function processJobs(env, limit = DEFAULT_MODEL_BATCH, prepared = null) {
  if (providerQuietWindow()) {
    return {ok:true, skipped:true, reason:"Provider quiet window 00:00-05:00 America/New_York", claimed:0, processed:0, queue:null, results:[]};
  }
  await requeueStale(env);
  const queue = prepared || await syncFixtureJobsV19(env);
  const candidates = rankedJobsV19(queue.jobs);
  const freshTomorrowBacklog = candidates.filter(j => !j.completed_at && dateOfV19(j.kickoff_at) === tomorrowEasternDate()).length;
  const adaptive = adaptiveBatchV30(candidates, limit);
  const freshBaselineBacklog = adaptive.freshBaselineBacklog;
  const cycleLimit = adaptive.limit;
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
  const deadline = Date.now() + (freshBaselineBacklog > 0 ? 28000 : 25000);
  let claimed = 0;
  for (const candidate of candidates) {
    if (claimed >= cycleLimit || Date.now() >= deadline) break;
    // READY jobs become pending only when due. Do not reset failed-job backoff.
    let job = candidate;
    if (job.status === 'READY') {
      const rows = await sb(env,
        `two45_feature_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.READY&completed_at=eq.${encodeURIComponent(job.completed_at)}&select=*`, {
          method: 'PATCH', body: JSON.stringify({status: 'PENDING', attempts: 0,
            requested_at: new Date().toISOString(), metadata: job.metadata})
        });
      if (!arr(rows).length) continue;
      job = {...rows[0], metadata: job.metadata, kickoff_at: job.kickoff_at};
    }
    const owned = await claimSpecificJob(env, job);
    if (!owned) continue;
    claimed++;
    const result = await processOne(env, owned);
    results.push(result);
    if (result.rateLimited) break; // Stop before consuming further budget/failed attempts.
  }
  return {ok: results.every(x => x.status === 'READY'), claimed,
    processed: results.length, freshTomorrowBacklog, freshBaselineBacklog, adaptiveBatch:cycleLimit, queue: queue.summary, results};
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
      false,

    forecastCount:
      forecasts,

    pendingFeatureJobs:
      pending,

    readyFeatureJobs:
      ready,

    pacingRevision: PACING_REVISION,
    providerPacing: {minIntervalMs: FAST_BASELINE_INTERVAL_MS, maxIntervalMs: 22000, targetDailyRequests: TARGET_DAILY_REQUESTS, practicalDailyCap: PRACTICAL_DAILY_CAP, hardCap: HARD_CAP, state: (await getFeedSnapshot(env, "api-football-pacing"))?.payload || null, currentIntervalMs: adaptiveProviderIntervalV30((await getFeedSnapshot(env, "api-football-pacing"))?.payload || {})},
    modelBatch: batchLimitV19(env.TWO45_MODEL_BATCH),
    pipeline: (await getFeedSnapshot(env, "cron-status").catch(() => null))?.payload || null,

    tomorrowPreloadStartsAt:
      "20:00 America/New_York",

    tomorrowPreloadActive:
      shouldPreloadTomorrow(),

    providerQuietWindowActive:
      providerQuietWindow(),

    providerQuietHours:
      "Disabled — provider operates 24/7",

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
  const token = crypto.randomUUID();
  const lockKey = 'api-football-pacing';
  const acquired = await rpcRefresh(env, 'two45_try_refresh_lock', {
    p_lock_key: lockKey, p_lock_token: token, p_ttl_seconds: 90
  });
  if (!acquired) throw new Error('API-Football rate limit pacing: another request is active');
  const leaseDeadline = Date.now() + 90000;
  let pacing;
  try {
    pacing = (await getFeedSnapshot(env, lockKey))?.payload || {};
    const utcDate = new Date().toISOString().slice(0, 10);
    if (pacing.budgetDate === utcDate && num(pacing.used) >= PRACTICAL_DAILY_CAP) {
      throw new Error('Two45 practical daily cap of 6500 reached.');
    }
    const blockedWait = Math.max(0, num(pacing.blockedUntil) - Date.now());
    if (blockedWait > 20000) throw new Error('API-Football rate limit cooldown is active');
    if (blockedWait) await new Promise(resolve => setTimeout(resolve, blockedWait));
    const wait = Math.max(0, num(pacing.nextAt) - Date.now());
    if (wait > 45000) throw new Error('API-Football rate limit cooldown is active');
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    if (Date.now() >= leaseDeadline) throw new Error('API-Football rate limit pacing lease expired');
    pacing = {...pacing, nextAt: Date.now() + adaptiveProviderIntervalV30(pacing)};
    await saveFeedSnapshot(env, lockKey, pacing, 172800);
    const payload = await providerFetchReservedV18(env, path, params, pacing, leaseDeadline);
    await saveFeedSnapshot(env, lockKey, {...pacing, nextAt: Date.now() + adaptiveProviderIntervalV30(pacing)}, 172800);
    return payload;
  } catch (error) {
    if (pacing && /Too many requests|HTTP 429|exceeded.*minute/i.test(safeRefreshError(error))) {
      const retryAt = Math.max(Date.now() + 65000, num(error.retryAt));
      await saveFeedSnapshot(env, lockKey, {...pacing, blockedUntil: retryAt, nextAt: retryAt}, 172800);
    }
    throw error;
  } finally {
    await rpcRefresh(env, 'two45_release_refresh_lock', {
      p_lock_key: lockKey, p_lock_token: token
    }).catch(() => null);
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

        signal: AbortSignal.timeout(20000)
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

  const fixturesMissing =
    !(
      await getFeedSnapshot(
        env,
        fixtureKey(
          date
        )
      )
    );

  const oddsMissing =
    !(
      await getFeedSnapshot(
        env,
        oddsKey(
          date
        )
      )
    );

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

  if (
    oddsMissing
  ) {
    return {
      key:
        oddsKey(
          date
        ),

      ttl:
        900,

      savesItself:
        true,

      run:
        () =>
          refreshOddsPageV18(
            env,
            date
          )
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
   V19 INTEGRATION — no new tables, SQL migrations or bindings.
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
      out.push({...group, groupKey, outcomes});
    }
  }
  return out;
}

function batchLimitV19(value) {
  return Math.trunc(clamp(num(value, DEFAULT_MODEL_BATCH), 1, 9));
}

function adaptiveBatchV30(candidates, requested = DEFAULT_MODEL_BATCH) {
  const fresh = candidates.filter(j => !j.completed_at).length;
  const feedMinute = new Date().getUTCMinutes() % 5 === 0;
  // V34: clear a fresh model-version backlog faster without starving feed refreshes.
  // Normal minute: up to 3 fresh matches. Every fifth minute: up to 2.
  const desired = fresh > 0 ? (feedMinute ? 2 : 3) : 1;
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
    job_key: `${MODEL_VERSION}:${id}:${f.league.season}`, provider_match_id: String(id), fixture_id: id,
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
  const token = crypto.randomUUID();
  const locked = await rpcRefresh(env, 'two45_try_refresh_lock', {
    p_lock_key: 'v19-fixture-queue', p_lock_token: token, p_ttl_seconds: 180
  });
  if (!locked) return {jobs: [], summary: {skipped: true, reason: 'Queue sync is already running'}};
  try {
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
    const existing = await rowsForIdsV19(env, 'two45_feature_jobs', 'job_key', distinct.map(j => j.job_key));
    const byKey = new Map(existing.map(j => [j.job_key, j]));
    summary.existing = existing.length;
    const missing = distinct.filter(j => !byKey.has(j.job_key));
    for (let i = 0; i < missing.length; i += 100) {
      // Ignore duplicates: a competing producer must not reset READY/IN_PROGRESS rows.
      const inserted = arr(await sb(env, 'two45_feature_jobs?on_conflict=job_key', {
        method: 'POST', prefer: 'resolution=ignore-duplicates,return=representation',
        body: JSON.stringify(missing.slice(i, i + 100))
      }));
      summary.inserted += inserted.length;
      for (const row of inserted) byKey.set(row.job_key, row);
    }
    const jobs = distinct.flatMap(current => {
      const stored = byKey.get(current.job_key);
      return stored ? [{...stored, kickoff_at: current.kickoff_at,
        metadata: {...stored.metadata, ...current.metadata}}] : [];
    });
    return {jobs, summary};
  } finally {
    await rpcRefresh(env, 'two45_release_refresh_lock', {
      p_lock_key: 'v19-fixture-queue', p_lock_token: token
    }).catch(() => null);
  }
}

function jobDueV19(job) {
  if (!dateAllowedV19(dateOfV19(job.kickoff_at))) return false;
  const status = job.metadata?.fixture_status;
  if (!(LIVE_STATUSES.has(status) || UPCOMING_STATUSES.has(status))) return false;
  const now = Date.now();
  if (job.status === 'READY') {
    const interval = LIVE_STATUSES.has(status) ? 10 * 60000 : 60 * 60000;
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
  const candidates = jobs.filter(jobDueV19);
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
  const fresh = candidates.filter(j => !j.completed_at);
  const live = candidates.filter(j => j.completed_at && LIVE_STATUSES.has(j.metadata?.fixture_status));
  const repeat = candidates.filter(j => j.completed_at && !LIVE_STATUSES.has(j.metadata?.fixture_status));
  const ordered = [];
  // V22 Cruise Control: after 8 PM, finish never-analyzed Tomorrow jobs
  // before spending provider calls on repeat/deep-enrichment refreshes.
  if (shouldPreloadTomorrow()) {
    const tomorrow = tomorrowEasternDate();
    const tomorrowFresh = fresh.filter(j => dateOfV19(j.kickoff_at) === tomorrow);
    const otherFresh = fresh.filter(j => dateOfV19(j.kickoff_at) !== tomorrow);
    return [...tomorrowFresh, ...otherFresh, ...live, ...repeat];
  }
  const lanes = Math.floor(Date.now() / 300000) % 2 ? [fresh, live, fresh, repeat] : [live, fresh, repeat, fresh];
  while (fresh.length || live.length || repeat.length) {
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
  if (!row || (live && Date.now() - Date.parse(row.refreshed_at) > 10 * 60000)) return {response: []};
  if (live && !['1H','HT','2H','LIVE'].includes(job.metadata.fixture_status)) return {response: []};
  if (!live) return row.payload || {response: []};
  // odds/live is a separate provider format. Only unblocked, active prices
  // with explicitly recognized full-match market names are used.
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

async function refreshCarryoverV19(env) {
  if (providerQuietWindow()) return {ok:true, skipped:true, reason:"Provider quiet window"};
  const yesterday = datePlusDays(easternDate(), -1);
  const row = await getFeedSnapshot(env, fixtureKey(yesterday));
  if (!row || Date.now() - Date.parse(row.refreshed_at) < 15 * 60000) return null;
  const recentUnfinished = arr(row.payload?.fixtures).some(f => {
    const age = Date.now() - Date.parse(f?.fixture?.date);
    return age >= 0 && age < 6 * 60 * 60000 &&
      (LIVE_STATUSES.has(f?.fixture?.status?.short) || UPCOMING_STATUSES.has(f?.fixture?.status?.short));
  });
  if (!recentUnfinished) return null;
  const payload = await refreshFixturesV18(env, yesterday);
  await saveFeedSnapshot(env, fixtureKey(yesterday), payload, 900);
  return {ok: true, key: fixtureKey(yesterday), total: payload.total, settlementOnly: true};
}

async function evaluateBoardV19(env, date) {
  if (!dateAllowedV19(date)) return {ok: true, skipped: true, date};
  let external;
  try { external = await runBackgroundEvaluationV18(env, date, null); }
  catch (error) { external = {ok: false, error: safeRefreshError(error)}; }
  const previous = await getFeedSnapshot(env, modelBoardKey(date));
  const base = external.board || previous?.payload || {};
  const fixtureData = await fixtureSnapshotV19(env, date);
  const fixtures = fixtureData.fixtures;
  const ids = fixtures.map(fixtureIdV19);
  const forecasts = new Map(arr(base.independentForecasts).map(f => [Number(f.fixtureId), f]));
  // Include ledger history for already analyzed games, then overlay latest mutable results.
  const ledger = await rowsForIdsV19(env, 'two45_model_forecasts', 'fixture_id', ids);
  ledger.sort((a,b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  for (const row of ledger) forecasts.set(Number(row.fixture_id), {
    ...forecastRowToClient(row), createdAt: row.created_at, generatedAt: row.created_at,
    settled: row.settled, outcome: row.outcome
  });
  const latest = await rowsForIdsV19(env, 'two45_feed_snapshots', 'snapshot_key', ids.map(id => `model-analysis:${id}`));
  for (const row of latest) {
    if (row.payload?.date === date && row.payload?.forecast) {
      const f = row.payload.forecast;
      forecasts.set(Number(f.fixtureId), f);
    }
  }
  const independentForecasts = ids.map(id => forecasts.get(id)).filter(Boolean);
  const byId = new Map(fixtures.map(f => [fixtureIdV19(f), f]));
  const picks = independentForecasts.filter(f => {
    const status = byId.get(Number(f.fixtureId))?.fixture?.status?.short;
    return f.decision === 'PICK' && (UPCOMING_STATUSES.has(status) ||
      (LIVE_STATUSES.has(status) && f.live === true && Date.now() - Date.parse(f.generatedAt) < 15 * 60000));
  }).map(f => ({...f, fixtureId: String(f.fixtureId),
    band: f.pickType === 'RISKY_VALUE' ? 'Risky Play' : 'Top Pick',
    score: num(f.probability), rankScore: num(f.probability) * 0.7 + num(f.valueEdgePct) * 0.3
  })).sort((a,b) => b.rankScore - a.rankScore);
  const now = new Date().toISOString();
  const strongPicks = picks.filter(f => f.pickType !== 'RISKY_VALUE');
  const riskyPlays = picks.filter(f => f.pickType === 'RISKY_VALUE');
  const board = {...base, ok: true, date, service: 'two45-live-worker',
    games: fixtures, fixtures, picks, strongPicks, riskyPlays, independentForecasts,
    updatedAt: now, analyzedCount: independentForecasts.length,
    independentModel: {...base.independentModel, version: MODEL_VERSION, updatedAt: now,
      forecastCount: independentForecasts.length, qualifiedValuePicks: picks.length,
      strongPicks: strongPicks.length, riskyPlays: riskyPlays.length,
      strongModelViews: independentForecasts.filter(f => num(f.probability) >= 75 && num(f.dataQuality) >= 68).length},
    evaluation: {source: 'worker-v20', date, evaluatedAt: now,
      pagesEvaluationOk: external.ok, pagesEvaluationError: external.error || null,
      fixtureUpdatedAt: fixtureData.refreshedAt}
  };
  await saveFeedSnapshot(env, modelBoardKey(date), board, 1800);
  return {ok: true, date, analyzed: independentForecasts.length, picks: picks.length,
    pagesEvaluationOk: external.ok, pagesEvaluationError: external.error || null};
}

async function runCycleV19(event, env, force = false) {
  // V20.1: operate 24/7. Overnight cycles stay paced by the same
  // one-minute scheduler, feed locks, provider budget reservation and
  // rate-limit backoff instead of shutting the pipeline down.
  const token = crypto.randomUUID();
  const acquired = await rpcRefresh(env, 'two45_try_refresh_lock', {
    p_lock_key: 'v19-pipeline', p_lock_token: token, p_ttl_seconds: 75
  });
  if (!acquired) return {ok: true, skipped: true, reason: 'Another V19 cycle is running'};
  const startedAt = new Date().toISOString();
  const result = {ok: true, version: WORKER_VERSION, pacingRevision: PACING_REVISION, feeds: [], boards: [], errors: []};
  try {
    // V22 Cruise Control: after 8 PM, model work gets first use of
    // the pacing window so Tomorrow cannot remain stuck at zero.
    const modelFirst = true;
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
      result.boards.push({ok:true, skipped:true, reason:'Dynamic forecast trigger keeps board current during baseline clearing'});
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
    await rpcRefresh(env, 'two45_release_refresh_lock', {
      p_lock_key: 'v19-pipeline', p_lock_token: token
    }).catch(() => null);
  }
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
    ctx.waitUntil(runCycleV19(event, env));
  }
};
