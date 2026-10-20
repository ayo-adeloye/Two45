# Champions League candidate recognition incident — 2026-10-20

## Evidence
Production ticket-lock:daily:2026-10-20 was BUILDING, waiting ELITE_CANDIDATE_ODDS, diagnostic NO_EXACT_BET365_QUOTES, analyzed 49, exactVerified 0.
The stored odds:2026-10-20 snapshot held 143 rows, 143 had Bet365 bookmaker groups; at the time of audit, 9 had observed timestamps within 30 minutes and none had provider update timestamps within 30 minutes. The quote matcher requires both; timestamp eligibility was zero.

## Required fix (no relaxation without validation)
1. Split stale-reason reporting by observed age, provider age, market/selection mismatch, suspicious price, duplicate price conflict and cross-book failure.
2. For elite candidates with older provider updates, request fresh fixture-specific Bet365 odds; re-evaluate source timestamp and quote provenance. Do not publish on the basis of touching a cached response.
3. Distinguish NO_VERIFIABLE_PRICE from REJECTED_ON_QUALITY, and schedule a targeted second review only for the first group. No blanket reduction in prediction quality requirements.
4. Publish only verified quotes and preserve an explicit NO_BET state if candidate fails genuine quality or pricing checks.
5. Compare qualified candidate counts and quote freshness on staging, then safely deploy with rollback.

Read-only SQL: scripts/elite-quote-starvation-audit.sql.
