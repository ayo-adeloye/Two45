# Elite 3 automation and launch gate

Monetization and public launch remain blocked until the scheduled product pipeline works reliably and pick quality has credible prospective evidence. A running Worker, a manually rebuilt ticket, or a favorable isolated result is insufficient. This change repairs operational defects; it does not validate the replacement forecasting model or promise profitable picks.

## Operational fixes

- At 8 p.m. Eastern, tomorrow's fixture and odds pages take priority over unrelated current-day odds pagination. Existing provider pacing and one-call repair limits remain in force.
- Quote repair reads independently generated STRONG market alternatives from canonical analysis, even when no candidate has yet passed public price verification. WATCH alternatives do not gain eligibility. Competition identity is checked against the fixture.
- Complete Tier 1/2 research with retained raw probabilities and at least 0.75 data quality can also request a fixture quote when no market has yet been selected. Requesting evidence does not turn a research row into a PICK or change publication thresholds. Canonical research read failures are surfaced to the scheduled repair instead of silently treated as an empty candidate universe.
- Repair checks each fixture's provider/observation timestamps. A fresh daily wrapper or old `repairedTargets` flag cannot conceal a stale fixture quote. Missing/stale prices still reject publication. Each attempt has a ten-minute retry backoff, and repair preserves unfinished odds-page metadata.
- Elite's own market eligibility is evaluated before choosing one primary per fixture. A higher general-purpose score on an Elite-ineligible market can no longer hide a genuinely eligible alternative. Probability, quality, price and confidence thresholds are unchanged.
- Qualified overnight combinations are mutable **DRAFT** tickets. Publication starts at 6 a.m. Eastern on the slate date, with fresh quote verification and a current candidate review. A late qualifying combination may publish afterward; an unqualified target remains BUILDING. The clock uses America/New_York, including DST. Drafts have `locked:false` and never enter the official ledger.
- Existing locked snapshots and publication receipts remain immutable. Daily coverage counts distinct fixtures; diagnostics distinguish rejected markets from multiple qualifying alternatives.
- Scheduled analysis now reserves time before claiming another fresh job and bounds recovery inside the cycle. Duplicate inline legacy-wrapper and new-core shadow writes were removed from `processOne`; retained wrapper history stays intact, while independent raw forecasts continue in their dedicated scheduled pass. Shadow persistence no longer delays completion of a legacy official analysis.

## Acceptance evidence

`node tests/elite-automation.cjs` covers the 8 p.m. handoff, pre-6 a.m. draft behavior, the exact 6 a.m. boundary, DST, valid alternative selection, two distinct fixtures, locked snapshot preservation, repair without a public headline, stale fixture quotes inside a fresh daily payload, stale completed-repair flags, provider retry backoff and unfinished pagination. Existing model, source/bundle, publication, Record, frontend and Ladder regressions remain required in deployment.

Production verification must show a scheduled 8 p.m. queue handoff, fresh exact-price evidence, advancing analysis/repair progress and no pre-6 a.m. Elite publication. A complete overnight-to-6 a.m. cycle cannot be certified before the boundary occurs. Repeated clean scheduled cycles and settled prospective quality/return results are still required before launch. The independent model's failed historical proper scores and unvalidated ROI remain explicit promotion blockers; legacy supplies official picks until a validated cutover.
