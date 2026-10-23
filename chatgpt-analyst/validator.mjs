export function validateDraft(input, fixtures, quotes, now = Date.now()) {
  const errors = [];
  if (!Array.isArray(input?.picks) || !input.picks.length) return {ok:false, errors:["No picks supplied"]};
  const fixtureById = new Map(fixtures.map(f => [String(f.fixtureId ?? f.fixture?.id), f]));
  const quoteKey = q => [q.fixtureId,q.marketId,q.selection,q.bookmaker].map(String).join("|");
  const quoteByKey = new Map(quotes.map(q => [quoteKey(q), q]));
  const eliteIds = new Set();
  const allFixtureIds = new Set();
  const allPickIds = new Set();
  let combined = 1;
  let eliteCount = 0;
  for (const [i,p] of input.picks.entries()) {
    const label = "Pick " + (i + 1);
    const f = fixtureById.get(String(p.fixtureId));
    if (String(p.pickType ?? p.decision ?? "").toUpperCase() === "NO_BET") errors.push(label+": NO_BET cannot be imported");
    if (p.category === "elite3" && String(p.bookmaker).toLowerCase() !== "bet365") errors.push(label+": Elite 3 requires exact Bet365 quote");
    if (allFixtureIds.has(String(p.fixtureId))) errors.push(label+": fixture already selected in this ticket");
    allFixtureIds.add(String(p.fixtureId));
    const pickIdentity = [p.fixtureId,p.marketId,p.selection,p.bookmaker].join("|");
    if (allPickIds.has(pickIdentity)) errors.push(label+": duplicate selection");
    allPickIds.add(pickIdentity);
    if (!f) {errors.push(label+": unknown fixture");continue;}
    const kickoff = Date.parse(f.kickoff ?? f.fixture?.date);
    if (!Number.isFinite(kickoff) || kickoff <= now) errors.push(label+": fixture started or kickoff invalid");
    if (!["elite3","strong","risky"].includes(p.category)) errors.push(label+": invalid category");
    const q = quoteByKey.get(quoteKey(p));
    if (!q) {errors.push(label+": exact market quote unavailable");continue;}
    if (!Number.isFinite(Number(q.odds)) || Number(q.odds)<=1) errors.push(label+": invalid available quote");
    if (!Number.isFinite(Number(p.odds)) || Number(p.odds)<=1) errors.push(label+": invalid quoted odds");
    // Quoted price is a snapshot, not a live guarantee. A changed price must not trigger repricing.
    // User-approved policy: an available exact quote is sufficient; provider timestamps are advisory.
    // Still reject invalid prices, missing exact markets, started fixtures and non-Bet365 Elite 3.
    if (p.category==="elite3") {
      eliteCount++;
      if (eliteIds.has(String(p.fixtureId))) errors.push(label+": repeated Elite 3 fixture");
      eliteIds.add(String(p.fixtureId));
      combined *= Number(p.odds);
    }
  }
  if ((eliteCount || input.ticketType === "elite3") && (eliteCount<2 || eliteCount>4 || combined<2.8 || combined>3.2)) errors.push("Elite 3 requires 2–4 distinct fixtures and combined odds 2.80–3.20");
  return {ok:errors.length===0, errors, eliteCount, eliteCombinedOdds:eliteCount?Number(combined.toFixed(3)):null, publishable:false};
}
