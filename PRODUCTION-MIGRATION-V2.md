# Production model migration — October 18, 2026

## Release decision: blocked, no promotion

The replacement is intended to use the independent v3.1 raw goal generator with the V2 selection system for Elite 3, High Conviction, Weekend Ladder and subsequent official Record entries. The old raw generator is not an acceptable input to that replacement. This release integrates the previously unmerged independent core from PR #9 into production evaluation, but does not claim the requested authoritative cutover has passed validation.

The frozen-configuration replay was reproduced from production evidence at `2026-10-18T01:23:23.216Z`: 8,468 full-time results and 3,138 feature revisions, with 1,963 legacy observations supplied for matching. There are 2,256 test fixtures and 266 paired events. Brier is **0.144492 new vs 0.137141 legacy**; log loss is **0.462725 vs 0.440625**. The Brier difference interval is **+0.005632 to +0.023476**, across only three paired fixture-day blocks. Thirteen data-qualified paired events cannot justify promotion. See `validation/historical-core-20261018.json` for hashes, market breakdowns, exclusions and the reproduction command. Configuration was loaded from the existing frozen runtime, not retuned on the test set. This period was previously examined and remains exploratory.

Historical exact quote timestamps and complete market outcomes are missing. Historical selection strategy ROI and accumulator ROI cannot be established. No fabricated ROI, forced picks or historical ticket backfill is used to satisfy this gate.

## Audit findings and corrections

- Production initially ran raw v1.9 plus the V2 wrapper in shadow; the new raw core had zero forecasts despite its database tables and seed artifact already existing. The independent core now records its own immutable predictions, training artifact/dataset hash, input identities, exact provider quote evidence, candidate rejections and the separate legacy comparison.
- At audit, 3,275 team snapshots contained zero populated structured xG values, and 1,284 had at least eight matches. The new model is a learned goals-based model, not an observed-xG model. Missing xG, lineup and injury coefficients never become fabricated evidence or default boosts. Scores, league/home scoring rates and opponent-adjusted team effects are learned independently of prices. Sparse team/league history, stale training/features and missing calibration abstain.
- Brazil league ID 71 named `Serie A` formerly inherited Italy's Tier 1. Ambiguous Serie A, Bundesliga and La Liga names now require their canonical Tier 1 IDs. Unknown IDs fail closed. Existing immutable tickets retain their original snapshot; they are not silently rewritten.
- The odds reducer dropped provider update times, while aggregate refresh times could make retained rows appear current. Fixture observation and provider update timestamps now survive reduction and merging. New-core selection and fresh official quote verification require both within 30 minutes. Missing, future, stale or conflicting exact Bet365 evidence rejects the selection. Fresh aggregate metadata cannot renew an old quote.
- Integer/quarter goal lines are rejected by the selector until push-aware selection support exists. Score-based half-goal markets remain internally coherent. One primary market per fixture and cross-rung fixture reservation tests pass.
- The publication ledger held 80 product memberships / 53 unique selections, all published before kickoff. The public Record had 28 wins, 19 losses and 6 unresolved entries; 2,117 settlement audit receipts existed. No published fixture overlapped the three known raw-result conflict cases. Evidence/model/publication tables have RLS; anonymous reads and service-role update/delete privileges are absent on the audited tables. Historical stat outcomes without evidence remain unresolved.
- The football gateway passes upstream JSON through; timestamp loss occurred in the Worker reducer. The frontend uses server-frozen ticket locks and the publication-only Record. A public notice and `/api/model-migration` explicitly identify the blocked migration and active legacy engine.
- Production QA found legacy analysis timeouts could prevent the new-core hook from executing. A separate scheduled pass now processes up to two retained upcoming fixtures, skips observations refreshed in the last 30 minutes, and performs no football-provider calls. Missing legacy comparisons or quotes do not stop raw inference and are not fabricated. Its result appears as `forecastCoreSweep` in the existing cron status.
- The public Record still obtains football scores from settled legacy research rows (Founder card settlement has its own source). Full cutover must decouple that score source from legacy forecast generation, reconcile non-conflicting regulation-time labels and retain historical settlement receipts. This is an explicit integration blocker in addition to the failed predictive/ROI validation; the current release does not claim the Record settlement dependency is removed.

## Prospective protocol

New independent observations carry `validationProtocol: independent-v2-migration-20261018`. Retain the latest snapshot at least one hour before kickoff, one primary per fixture, and grade only supported full-time score markets with non-conflicting labels. Train/refit only on results available before each decision; freeze the configuration and selection rules. Model artifacts remain append-only. A configuration/rule change needs a new prospective cohort.

Export with `scripts/export-forecast-core-v3.sql`, then run:

```text
node scripts/evaluate-shadow-v2.mjs shadow.json report.json independent-v2-migration-20261018
```

The evaluator reports flat one-unit selection ROI at retained Bet365 prices, separate legacy strategy ROI, paired raw/calibrated/legacy/complete-line market proper scores, market-specific counts and seeded fixture-day bootstrap intervals. These single-selection returns are not published accumulator ROI. Require at least 200 settled selections, 14 fixture days, 60 selections in every market proposed for publication, paired score improvement, positive ROI confidence, complete quote evidence, and independent frozen-holdout review. The evaluator cannot activate production. Do not infer success from a favorable subset or relax these rules after inspecting outcomes.

## Cutover and rollback

Validation currently fails. Legacy official publishing therefore remains active; this release does not disable it or route new-core shadow forecasts into the Record. No runtime toggle can bypass the gate. Full replacement remains blocked until a validated release replaces `buildDailyLockV70`, `buildWeekendLockV70`, `verifyPublicStrongPicksV83` and their alternate publishing entrances together, with ledger writes required before public output. Preserve per-fixture primaries, exact prices, rung reservations and all historical evidence. Founder picks remain human-authored and separately identified.

Rollback code with a new revert commit and the existing Worker/Pages deployment workflow. Preserve all additive Supabase evidence tables, artifacts, snapshots and publication/settlement receipts. Do not restore research forecasts as public Record entries. Current locked tickets remain intact through this deployment.
