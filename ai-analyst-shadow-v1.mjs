// Two45 AI Analyst V1 — isolated shadow-only evaluation. No publishing or wagering.
export const MODELS = Object.freeze({
  gemini: { id: "gemini-2.5-flash-lite", inputPerMillion: 0.10, outputPerMillion: 0.40 },
  openai: { id: "gpt-6-luna", inputPerMillion: 0.10, outputPerMillion: 0.50 }
});
export const MONTHLY_BUDGET_USD = 15;
export function estimateCost(provider, inputTokens, outputTokens) {
  const m = MODELS[provider];
  if (!m) throw new Error("Unsupported provider");
  return (inputTokens * m.inputPerMillion + outputTokens * m.outputPerMillion) / 1e6;
}
export function validateEvidence(fixture) {
  if (!fixture || !Number.isInteger(Number(fixture.fixtureId)) || !fixture.kickoff || !Array.isArray(fixture.markets))
    throw new Error("Fixture requires fixtureId, kickoff and markets");
  if (Date.parse(fixture.kickoff) <= Date.now()) throw new Error("Fixture already started");
  return fixture;
}
export function shortlist(fixtures, limit = 20) {
  return fixtures.filter(f => {
    try { validateEvidence(f); return true; } catch { return false; }
  }).map(f => ({
    ...f,
    // Preliminary math is for prioritization only; never interpret it as a verified edge.
    opportunities: f.markets.filter(m => Number.isFinite(m.modelProbability) &&
      m.modelProbability > 0 && m.modelProbability < 1 && Number.isFinite(m.odds) && m.odds > 1)
      .map(m => ({ ...m, indicativeEdge: m.modelProbability * m.odds - 1 }))
      .sort((a,b) => b.indicativeEdge - a.indicativeEdge)
  })).filter(f => f.opportunities.length)
    .sort((a,b) => b.opportunities[0].indicativeEdge - a.opportunities[0].indicativeEdge)
    .slice(0, limit);
}
export function verifyShadowDecision(fixture, answer, now = Date.now()) {
  const candidates = Array.isArray(answer?.candidates) ? answer.candidates : [];
  return candidates.map(c => {
    const quote = fixture.markets.find(m => m.market === c.market && m.selection === c.selection);
    const observed = Date.parse(quote?.observedAt || "");
    const providerUpdated = Date.parse(quote?.providerUpdatedAt || "");
    const fresh = Number.isFinite(observed) && Number.isFinite(providerUpdated) &&
      providerUpdated <= observed && observed <= now && now - observed <= 15 * 60000 &&
      now - providerUpdated <= 15 * 60000 && Date.parse(fixture.kickoff) > now;
    const verified = Boolean(fresh && quote?.bookmaker === "Bet365" &&
      Number.isFinite(quote.odds) && quote.odds > 1 &&
      Number.isFinite(c.probability) && c.probability > 0 && c.probability < 1);
    return { ...c, fixtureId: fixture.fixtureId, sportsbookOdds: verified ? quote.odds : null,
      estimatedEV: verified ? c.probability * quote.odds - 1 : null,
      priceVerified: verified, publicationEligible: false,
      reason: verified ? "SHADOW_ONLY" : "NO_FRESH_EXACT_BET365_PRICE" };
  });
}
export function validateAnalystOutput(x) {
  if (!x || !Array.isArray(x.candidates) || x.candidates.length > 8) throw new Error("Invalid analyst output");
  for (const c of x.candidates) {
    if (!["HIGH_CONVICTION","ELITE_3","RISKY_VALUE"].includes(c.lane) ||
      typeof c.market !== "string" || typeof c.selection !== "string" ||
      typeof c.reason !== "string" || !Number.isFinite(c.probability) ||
      c.probability <= 0 || c.probability >= 1) throw new Error("Invalid candidate");
  }
  return x;
}
export function promptForFixture(fixture) {
  return JSON.stringify({ instructions:
    "Act as an independent football analyst. Only use supplied evidence. No invented injuries, form, odds, or facts. Analyze multiple supplied markets. Return JSON object {candidates:[{lane,market,selection,probability,reason}]}. lane is HIGH_CONVICTION, ELITE_3 or RISKY_VALUE. Use probability 0..1. Abstain with [] when evidence is weak. Never claim verified prices or publication eligibility.",
    fixture: { fixtureId: fixture.fixtureId, kickoff: fixture.kickoff, teams: fixture.teams,
      form: fixture.form, injuries: fixture.injuries, statistics: fixture.statistics,
      markets: fixture.opportunities || fixture.markets }
  });
}
export async function runShadow({ fixtures, provider, invoke, ledger, now = new Date(), maxMatches = 20 }) {
  if (!MODELS[provider] || typeof invoke !== "function") throw new Error("Provider adapter required");
  const month = now.toISOString().slice(0,7);
  if (ledger.month !== month) throw new Error("Monthly ledger must be initialized for current month");
  const results = [];
  for (const fixture of shortlist(fixtures, maxMatches)) {
    const reserved = estimateCost(provider, 6000, 2000);
    if (ledger.spentUsd + ledger.reservedUsd + reserved > MONTHLY_BUDGET_USD) break;
    ledger.reservedUsd += reserved;
    try {
      const reply = await invoke({ model: MODELS[provider].id, prompt: promptForFixture(fixture),
        maxOutputTokens: 2000 });
      const billed = estimateCost(provider, reply.inputTokens, reply.outputTokens);
      ledger.spentUsd += billed;
      const answer = validateAnalystOutput(reply.data);
      results.push({ fixtureId: fixture.fixtureId, provider, model: MODELS[provider].id,
        candidates: verifyShadowDecision(fixture, answer), costUsd: billed, shadow: true });
    } catch (error) {
      results.push({ fixtureId: fixture.fixtureId, shadow: true, candidates: [],
        error: String(error?.message || error) });
    } finally { ledger.reservedUsd -= reserved; }
  }
  return { month, provider, results, spentUsd: ledger.spentUsd, shadow: true };
}
