# Two45 Soccer — 30-day production readiness gate

Start: 2026-10-19. Scope: soccer only. No basketball or American-football execution, API subscriptions or model launches during this gate.

## Baseline (2026-10-19)
- `two45_analysis_state`: 1,733 COMPLETE; 1,936 PENDING, all pending kickoffs in the past; 26 future COMPLETE; 0 future PENDING at time queried. **Do not treat historical pending rows as a live backlog.**
- `two45_publications`: 80; latest `published_at` 2026-10-18 02:04:06 UTC. Explain low recent issuance before assuming anything is broken; qualified no-pick is valid.
- `two45_selection_shadow_v2`: 818; last generated 2026-10-19 00:08:22 UTC. Shadow results do not establish authoritative model deployment.
- API-Football Pro: 7,500 requests/day. Previous provider response showed 7,500 daily limit; observe peak usage, don't infer subscription upgrade required.
- Supabase paid; monitor actual egress and cache hit rates, not just stored row counts.

## Go/no-go gates
1. **Coverage:** Each day compare eligible Tier 1–2 upcoming fixtures from the canonical feed with scheduled, attempted, completed, skipped and error states. Target >=95% analysis completion ahead of kickoff for genuinely eligible fixtures, with exceptions accounted for; measure over the entire 30 days.
2. **Research:** Pre-match historical features are point-in-time and provenance-marked. Injuries/lineups explicitly UNKNOWN where feed lacks coverage; observed xG not mislabeled. Measure depth, staleness, missingness and discrepancies by competition.
3. **Selection:** Elite 3, High Conviction, Risky Value and Weekend Ladder apply original rules with verified exact fresh Bet365 prices. Never force publication. Track all stages and rejection causes; inspect no-ticket days separately from failures.
4. **Queue:** No silent stall, stuck REVIEWING, or infinite retries. Alerts and operator runbooks for aging jobs, failed feeds, missing prices and invalid terminal states.
5. **Record:** Every official published leg settled correctly with original immutable pre-match odds/reason, and correct void/partial/missing treatment. Run reconciliation checks daily.
6. **Model performance:** Report prospective Brier score/calibration bins, market-by-market and tier-by-tier samples, ROI only at archived published odds, with uncertainty. Winning rate alone never determines approval.
7. **Experience:** Validate Home, Today, Tomorrow, Analysis, Elite, Founder Picks, Ask Two45, Ladder and Record on mobile and desktop; loading, empty, expired, unavailable and error states.
8. **Cost:** Record API-Football daily/minute usage, Supabase egress, read volumes and Worker response payload sizes. Optimize without weakening published evidence integrity or multiplying historical API requests.

## Execution order
- Days 1–3: daily observability, source-to-queue reconciliation, qualified ticket failures, actual egress baseline.
- Days 4–10: fix confirmed pipeline defects, reduce oversized queries, preserve safeguards, regression tests.
- Days 11–20: prospective data completeness, odds quality and settlement audits; mobile QA.
- Days 21–30: uninterrupted monitoring and release/no-release decision based on actual evidence. Restart the evaluation window for material operational regressions.

## Release rule
Do not label paid-soccer launch 'ready' solely because CI or deployment passed. Require confirmed production operation and 30-day evidence of reliability, model integrity, transparent no-picks, and manageable operating costs. Existing records are baseline only; this document does not imply automated monitoring is already scheduled.
